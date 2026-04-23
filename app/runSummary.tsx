import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearTrackedUser } from "../Hooks/backgroundLocation";
import { haversine } from "../Hooks/haversine";
import supabase from "../config/supabaseClient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiCall } from "../Hooks/route";

type TrackedPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
};

type LatLng = {
  latitude: number;
  longitude: number;
};

type Split = {
  splitNumber: number;
  distanceKm: number;
  durationMs: number;
  elevationGainM: number;
  elevationLossM: number;
  netElevationChangeM: number;
  elevationAtSplitM: number;
};

type ElevationSummary = {
  gain: number;
  loss: number;
  net: number;
};

function samplePoints<T>(points: T[], step: number): T[] {
  return points.filter((_, index) => index % step === 0);
}

async function buildRefinedRoute(points: LatLng[]): Promise<LatLng[]> {
  if (!Array.isArray(points) || points.length < 2) return [];

  const fullRoute: LatLng[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    try {
      const coords = await apiCall(a, b);

      const converted = coords.map(([lon, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lon,
      }));

      if (i > 0) {
        converted.shift();
      }

      fullRoute.push(...converted);
    } catch (e) {
      console.log(`[RUN SUMMARY] Failed to fetch OSRM segment ${i} -> ${i + 1}:`, e);
    }
  }

  return fullRoute;
}

export default function RunSummary() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [points, setPoints] = useState<TrackedPoint[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [elevation, setElevation] = useState<ElevationSummary | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [savingRun, setSavingRun] = useState(false);

  useEffect(() => {
    const loadRunData = async () => {
      try {
        const storedPoints = await AsyncStorage.getItem("user_points_array");
        const storedSplits = await AsyncStorage.getItem("run_splits");
        const storedElevation = await AsyncStorage.getItem("run_elevation");

        const parsedPoints: TrackedPoint[] = storedPoints ? JSON.parse(storedPoints) : [];
        const parsedSplits: Split[] = storedSplits ? JSON.parse(storedSplits) : [];
        const parsedElevation: ElevationSummary | null = storedElevation
          ? JSON.parse(storedElevation)
          : null;

        setPoints(parsedPoints);
        setSplits(parsedSplits);
        setElevation(parsedElevation);

        let distance = 0;

        for (let i = 1; i < parsedPoints.length; i++) {
          const prev = parsedPoints[i - 1];
          const curr = parsedPoints[i];

          const segment = haversine(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );

          distance += segment;
        }

        setTotalDistance(distance);

        console.log("[RUN SUMMARY] Total distance (km):", distance);
        console.log("[RUN SUMMARY] user_points_array:", parsedPoints);
        console.log("[RUN SUMMARY] run_splits:", parsedSplits);
        console.log("[RUN SUMMARY] run_elevation:", parsedElevation);
      } catch (e) {
        console.log("[RUN SUMMARY] Failed to load run data:", e);
      }
    };

    loadRunData();
  }, []);

  const handleConfirmRun = async () => {
    if (savingRun) return;

    try {
      setSavingRun(true);

      console.log("[RUN SUMMARY] Confirm Run pressed");
      console.log("[RUN SUMMARY] Final points:", points);
      console.log("[RUN SUMMARY] Final splits:", splits);
      console.log("[RUN SUMMARY] Final elevation:", elevation);

      if (!id) {
        console.log("[RUN SUMMARY] No user id found");
        Alert.alert("Error", "No user ID found.");
        return;
      }

      if (points.length < 2) {
        console.log("[RUN SUMMARY] Not enough points to save run");
        Alert.alert("Error", "Not enough run data to save.");
        return;
      }

      const startedAt = new Date(points[0].timestamp).toISOString();
      const endedAt = new Date(points[points.length - 1].timestamp).toISOString();

      const durationMs = points[points.length - 1].timestamp - points[0].timestamp;
      const durationMinutes = durationMs / 1000 / 60;

      const avgPaceKm = totalDistance > 0 ? durationMinutes / totalDistance : null;

      const cleanedPoints: LatLng[] = points.filter(
        (p) =>
          p &&
          typeof p.latitude === "number" &&
          typeof p.longitude === "number"
      );

      let displayPolyline: LatLng[] = cleanedPoints;

      if (cleanedPoints.length >= 2) {
        const sampledPoints = samplePoints(cleanedPoints, 5);
        const refinedPolyline = await buildRefinedRoute(sampledPoints);

        if (refinedPolyline.length > 1) {
          displayPolyline = refinedPolyline;
        }
      }

      console.log("[RUN SUMMARY] Display polyline points:", displayPolyline.length);

      const { data: run, error: runError } = await supabase
        .from("runs")
        .insert({
          user_id: id,
          coordinates: points,
          display_polyline: displayPolyline,
          started_at: startedAt,
          ended_at: endedAt,
          avg_pace_km: avgPaceKm,
          calories_kcal: null,
        })
        .select()
        .single();

      if (runError) {
        console.log("[RUN SUMMARY] Error inserting run:", runError);
        Alert.alert("Error", "Failed to save run. Please try again.");
        return;
      }

      console.log("[RUN SUMMARY] Run added to supabase:", run);

      if (splits.length > 0) {
        let cumulativeTimeSeconds = 0;

        const splitRows = splits.map((s) => {
          const splitTimeSeconds = s.durationMs / 1000;
          cumulativeTimeSeconds += splitTimeSeconds;

          const avgPacePerKm =
            s.distanceKm > 0
              ? (splitTimeSeconds / 60) / s.distanceKm
              : null;

          return {
            run_id: run.id,
            split_number: s.splitNumber,
            split_distance_m: Math.round(s.distanceKm * 1000),
            split_time_seconds: splitTimeSeconds,
            cumulative_time_seconds: cumulativeTimeSeconds,
            avg_pace_per_km: avgPacePerKm,
            elevation_gain_m: Math.round(s.elevationGainM),
            elevation_loss_m: Math.round(s.elevationLossM),
            net_elevation_change_m: Math.round(s.netElevationChangeM),
            elevation_at_split_m: s.elevationAtSplitM,
          };
        });

        console.log("[RUN SUMMARY] Split rows being inserted:", splitRows);

        const { error: splitsError } = await supabase
          .from("run_splits")
          .insert(splitRows);

        if (splitsError) {
          console.log("[RUN SUMMARY] Error inserting splits:", splitsError);
          Alert.alert("Error", "Run was saved, but splits failed to save.");
          return;
        }

        console.log("[RUN SUMMARY] Splits added to supabase:", splitRows);
      }

      await AsyncStorage.multiRemove([
        "user_points_array",
        "run_splits",
        "run_elevation",
        "start_run_location",
        "active_route_cartesian",
        "off_route_status",
      ]);

      clearTrackedUser();

      console.log("[RUN SUMMARY] Cleared stored run data");

      Alert.alert("Run saved", "Your run was saved successfully.", [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "/",
              params: {
                id: String(id ?? ""),
              },
            }),
        },
      ]);
    } catch (e) {
      console.log("[RUN SUMMARY] Failed during confirm:", e);
      Alert.alert("Error", "Something went wrong while saving the run.");
    } finally {
      setSavingRun(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Run Summary</Text>

      <View style={styles.card}>
        <Text style={styles.text}>Tracked points: {points.length}</Text>
        <Text style={styles.text}>Number of splits: {splits.length}</Text>
        <Text style={styles.text}>Total distance: {totalDistance.toFixed(3)} km</Text>
        <Text style={styles.text}>
          Elevation gain: {elevation ? elevation.gain.toFixed(2) : "N/A"}
        </Text>
        <Text style={styles.text}>
          Elevation loss: {elevation ? elevation.loss.toFixed(2) : "N/A"}
        </Text>
        <Text style={styles.text}>
          Net elevation: {elevation ? elevation.net.toFixed(2) : "N/A"}
        </Text>
      </View>

      <Pressable
        style={[styles.confirmButton, savingRun && styles.confirmButtonDisabled]}
        onPress={handleConfirmRun}
        disabled={savingRun}
      >
        <Text style={styles.confirmButtonText}>
          {savingRun ? "Saving..." : "Confirm Run"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  confirmButton: {
    backgroundColor: "#a9c4f5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
});