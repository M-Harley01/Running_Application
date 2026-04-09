import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Button, Pressable, FlatList } from 'react-native';
import supabase from '../config/supabaseClient';
import { useLocalSearchParams, useRouter } from "expo-router";

function listRuns() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [runs, setRuns] = useState<any[]>([]);

  const fetchRuns = async () => {
    const userId = id;
    console.log("user id in runs is: ", userId);

    if (!userId) {
      console.log("No user id passed in params");
      return;
    }

    const { data, error } = await supabase
      .from('runs')
      .select(`
        id,
        started_at,
        ended_at,
        avg_pace_km,
        coordinates
      `)
      .eq('user_id', id);

    if (error) {
      console.log("Fetch run error: ", error.message, error);
      return;
    }

    if (data) {
      setRuns(data);
      console.log("here is the data: ", data);
      if (!data.length) return;
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "long" });

    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
        ? "rd"
        : "th";

    return `${day}${suffix} ${month}`;
  };

  const formatDuration = (startedAt: string, endedAt: string) => {
    if (!startedAt || !endedAt) return "--:--:--";

    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatPace = (pace: number) => {
    if (pace == null) return "-- / km";

    const totalSeconds = Math.round(pace * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")} / km`;
  };

  const haversine = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (
    coords: { latitude: number; longitude: number }[] = []
  ) => {
    if (!Array.isArray(coords) || coords.length < 2) return "0.00 km";

    let total = 0;

    for (let i = 1; i < coords.length; i++) {
      total += haversine(
        coords[i - 1].latitude,
        coords[i - 1].longitude,
        coords[i].latitude,
        coords[i].longitude
      );
    }

    return total < 10 ? `${total.toFixed(2)} km` : `${total.toFixed(1)} km`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <FlatList
        data={runs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.itemContainer, styles.runCard]}
            onPress={() => {
              router.replace({
                pathname: "/about",
                params: {
                  runId: String(item.id),
                  id: String(id ?? ""),
                },
              });
            }}
          >
            <View style={styles.runCardTop}>
              <Text style={styles.runDate}>{formatDate(item.started_at)}</Text>
              <Text style={styles.runChevron}>›</Text>
            </View>

            <View style={styles.runCardBottom}>
              <Text style={styles.runMetric}>{formatDistance(item.coordinates)}</Text>
              <Text style={styles.runMetric}>
                {formatDuration(item.started_at, item.ended_at)}
              </Text>
              <Text style={styles.runMetric}>{formatPace(item.avg_pace_km)}</Text>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <Pressable
          style={styles.footerButton}
          onPress={() => {
            router.replace({
              pathname: "/",
              params: {
                id: String(id ?? ""),
              },
            });
          }}
        >
          <Text style={styles.footerButtonText}>Cancel</Text>
        </Pressable>
      </View>

    </View>
  );
}

export default listRuns;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f6f6f8",
    paddingTop: 20,
  },

  itemContainer: {
    width: "92%",
    alignSelf: "center",
    marginVertical: 6,
  },

  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },

  footer: {
    padding: 16,
  },

  header: {
    width: "92%",
    alignSelf: "center",
    marginTop: 18,
    backgroundColor: "#a9c4f5",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },

  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "500",
  },

  runCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  runCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  runDate: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111",
  },

  runChevron: {
    fontSize: 28,
    color: "#555",
  },

  runCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  runMetric: {
    fontSize: 15,
    color: "#333",
  },
  footerButton: {
  backgroundColor: "#ffffff",
  borderRadius: 18,
  minHeight: 52,
  justifyContent: "center",
  alignItems: "center",
},

footerButtonText: {
  fontSize: 18,
  fontWeight: "500",
  color: "#111",
},
});