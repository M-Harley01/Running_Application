import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { clearTrackedUser } from "../Hooks/backgroundLocation";

type TrackedPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
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

export default function RunSummary() {
  const router = useRouter();

  const [points, setPoints] = useState<TrackedPoint[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [elevation, setElevation] = useState<ElevationSummary | null>(null);

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
    try {
      console.log("[RUN SUMMARY] Confirm Run pressed");

      console.log("[RUN SUMMARY] Final points:", points);
      console.log("[RUN SUMMARY] Final splits:", splits);
      console.log("[RUN SUMMARY] Final elevation:", elevation);

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

      router.replace("/");
    } catch (e) {
      console.log("[RUN SUMMARY] Failed during confirm:", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Run Summary</Text>

      <View style={styles.card}>
        <Text style={styles.text}>Tracked points: {points.length}</Text>
        <Text style={styles.text}>Number of splits: {splits.length}</Text>
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

      <Button title="Confirm Run" onPress={handleConfirmRun} />
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
});