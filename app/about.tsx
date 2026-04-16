import { StyleSheet, Text, View, Dimensions, Pressable, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LineChart } from "react-native-chart-kit";
import { Polyline, Svg } from 'react-native-svg';
import supabase from '../config/supabaseClient';
import { haversine } from '../Hooks/haversine';

const screenWidth = Dimensions.get("window").width;

type LatLng = {
  latitude: number;
  longitude: number;
};

type SplitRow = {
  split_number: number;
  avg_pace_per_km: number;
  elevation_at_split_m: number | null;
};

type RunData = {
  coordinates: any;
  started_at: string | null;
  ended_at: string | null;
  avg_pace_km: number | null;
};

function latLngsToSvgPoints(
  coords: LatLng[],
  width: number,
  height: number,
  padding = 12
): string {
  if (!coords.length) return "";

  const lats = coords.map((p) => p.latitude);
  const lons = coords.map((p) => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;

  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;

  return coords
    .map((p) => {
      const x = padding + ((p.longitude - minLon) / lonRange) * drawableWidth;
      const y =
        padding + (1 - (p.latitude - minLat) / latRange) * drawableHeight;

      return `${x},${y}`;
    })
    .join(" ");
}

const chartConfig = {
  backgroundGradientFrom: "transparent",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "transparent",
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(100, 180, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 1,
  propsForBackgroundLines: {
    stroke: "#dbe7f3",
    strokeDasharray: "5,5",
  },
  propsForLabels: {
    fill: "#7a8798",
  },
};

function formatTwoDp(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(2);
}

function formatDuration(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return "--";

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return "--";
  }

  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function calculateDistanceKm(coords: LatLng[]) {
  if (!Array.isArray(coords) || coords.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];

    total += haversine(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }

  return total;
}

function About() {
  const router = useRouter();
  const { runId, id } = useLocalSearchParams();

  const [paceChartData, setPaceChartData] = useState<any>(null);
  const [elevationChartData, setElevationChartData] = useState<any>(null);
  const [runPolylinePoints, setRunPolylinePoints] = useState<string>("");
  const [splits, setSplits] = useState<SplitRow[]>([]);

  const [summaryDistance, setSummaryDistance] = useState("--");
  const [summaryDuration, setSummaryDuration] = useState("--");
  const [summaryPace, setSummaryPace] = useState("--");

  console.log("passed in run is: ", runId);

  const fetchSplits = async () => {
    if (!runId) {
      console.log("no run id passed in the params");
      return;
    }

    const { data, error } = await supabase
      .from('run_splits')
      .select(`
        split_number,
        avg_pace_per_km,
        elevation_at_split_m
      `)
      .eq('run_id', runId)
      .order('split_number', { ascending: true });

    if (error) {
      console.log("error with fetching splits", error.message, error);
      return;
    }

    if (data && data.length > 0) {
      console.log("here is the data ", data);

      const typedData = data as SplitRow[];
      setSplits(typedData);

      const labels = typedData.map((item) => `${item.split_number} km`);
      const paceValues = typedData.map((item) =>
        Number(item.avg_pace_per_km.toFixed(2))
      );
      const elevationValues = typedData.map((item) =>
        Number((item.elevation_at_split_m ?? 0).toFixed(2))
      );

      const paceData = {
        labels,
        datasets: [
          {
            data: paceValues,
            color: (opacity = 1) => `rgba(135, 206, 235, ${opacity})`,
            strokeWidth: 2,
          }
        ],
        legend: ["Pace"]
      };

      const elevationData = {
        labels,
        datasets: [
          {
            data: elevationValues,
            color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
            strokeWidth: 2,
          }
        ],
        legend: ["Elevation"]
      };

      setPaceChartData(paceData);
      setElevationChartData(elevationData);
    } else {
      setSplits([]);
      setPaceChartData(null);
      setElevationChartData(null);
    }
  };

  const fetchRunData = async () => {
    if (!runId) {
      console.log("no run id passed in the params");
      return null;
    }

    const { data, error } = await supabase
      .from("runs")
      .select("coordinates, started_at, ended_at, avg_pace_km")
      .eq("id", runId)
      .single();

    if (error) {
      console.log("error fetching run data", error.message, error);
      return null;
    }

    return data as RunData;
  };

  const fetchRunCoordinates = async () => {
    if (!runId) {
      console.log("no run id passed in the params");
      return null;
    }

    const { data, error } = await supabase
      .from("runs")
      .select("coordinates")
      .eq("id", runId)
      .single();

    if (error) {
      console.log("error fetching run coordinates", error.message, error);
      return null;
    }

    return data;
  };

  const loadRunPolyline = async () => {
    const runData = await fetchRunCoordinates();

    if (!runData) {
      console.log("No run data found");
      return;
    }

    const sourceCoords = runData.coordinates;

    if (!Array.isArray(sourceCoords) || sourceCoords.length < 2) {
      console.log("Not enough run coordinates");
      return;
    }

    const cleaned: LatLng[] = sourceCoords.filter(
      (p: any) =>
        p &&
        typeof p.latitude === "number" &&
        typeof p.longitude === "number"
    );

    if (cleaned.length < 2) {
      console.log("Not enough valid coordinates after cleaning");
      return;
    }

    const svgPoints = latLngsToSvgPoints(cleaned, screenWidth - 56, 180);
    setRunPolylinePoints(svgPoints);
  };

  const loadRunSummary = async () => {
    const runData = await fetchRunData();

    if (!runData) {
      console.log("No run data found");
      return;
    }

    const coordinateSource = Array.isArray(runData.coordinates)
      ? runData.coordinates
      : [];

    const cleanedCoords: LatLng[] = coordinateSource.filter(
      (p: any) =>
        p &&
        typeof p.latitude === "number" &&
        typeof p.longitude === "number"
    );

    const totalDistanceKm = calculateDistanceKm(cleanedCoords);

    setSummaryDistance(
      cleanedCoords.length >= 2 ? `${formatTwoDp(totalDistanceKm)} km` : "--"
    );

    setSummaryDuration(formatDuration(runData.started_at, runData.ended_at));

    setSummaryPace(
      runData.avg_pace_km !== null && runData.avg_pace_km !== undefined
        ? `${formatTwoDp(runData.avg_pace_km)}/km`
        : "--"
    );
  };

  useEffect(() => {
    if (!runId) return;

    const init = async () => {
      await fetchSplits();
      await loadRunSummary();
      await loadRunPolyline();
    };

    init();
  }, [runId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{summaryDistance}</Text>
          <Text style={styles.summaryLabel}>Distance</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{summaryDuration}</Text>
          <Text style={styles.summaryLabel}>Duration</Text>
        </View>

        <View style={[styles.summaryBox, styles.summaryBoxLast]}>
          <Text style={styles.summaryValue}>{summaryPace}</Text>
          <Text style={styles.summaryLabel}>Pace</Text>
        </View>
      </View>

      {paceChartData && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pace</Text>
          <LineChart
            data={paceChartData}
            width={screenWidth - 56}
            height={180}
            verticalLabelRotation={0}
            chartConfig={chartConfig}
            bezier
            xLabelsOffset={-8}
            style={styles.chart}
            withInnerLines
            withOuterLines={false}
            fromZero={false}
          />
        </View>
      )}

      {elevationChartData && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Elevation</Text>
          <LineChart
            data={elevationChartData}
            width={screenWidth - 56}
            height={180}
            verticalLabelRotation={0}
            chartConfig={chartConfig}
            bezier
            xLabelsOffset={-8}
            style={styles.chart}
            withInnerLines
            withOuterLines={false}
            fromZero
          />
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Route</Text>
        <View style={styles.routeBox}>
          <Svg height="180" width={screenWidth - 56}>
            <Polyline
              points={runPolylinePoints}
              fill="none"
              stroke="#e67e22"
              strokeWidth="3"
            />
          </Svg>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Splits</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>KM</Text>
          <Text style={styles.tableHeaderText}>PACE</Text>
          <Text style={styles.tableHeaderText}>ELEV</Text>
        </View>

        {splits.length > 0 ? (
          splits.map((split) => (
            <View key={split.split_number} style={styles.tableRow}>
              <Text style={styles.tableCell}>{split.split_number} km</Text>
              <Text style={styles.tableCell}>
                {formatTwoDp(split.avg_pace_per_km)}/km
              </Text>
              <Text style={styles.tableCell}>
                {formatTwoDp(split.elevation_at_split_m ?? 0)} m
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No split data available</Text>
        )}
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => {
          router.replace({
            pathname: "/",
            params: {
              id: String(id ?? ""),
            },
          });
        }}
      >
        <Text style={styles.backButtonText}>Back Home</Text>
      </Pressable>
    </ScrollView>
  );
}

export default About;

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    backgroundColor: '#d9d9d9',
  },
  header: {
    backgroundColor: "#a9c4f5",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 14,
    backgroundColor: "#f7f7f9",
    borderRadius: 18,
    overflow: "hidden",
  },
  summaryBox: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#d9d9d9",
  },
  summaryBoxLast: {
    borderRightWidth: 0,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232634",
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#f7f7f9",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#555",
    marginBottom: 8,
  },
  chart: {
    borderRadius: 16,
  },
  routeBox: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontWeight: "700",
    color: "#888",
    fontSize: 14,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCell: {
    flex: 1,
    fontSize: 15,
    color: "#232634",
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
  },
  backButton: {
    backgroundColor: "#a9c4f5",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});