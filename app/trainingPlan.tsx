import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getStartOfWeek } from "../Hooks/date";
import supabase from "../config/supabaseClient";
import { haversine } from "../Hooks/haversine";

type CurrentPlan = {
  planId: string | null;
  name: string;
  level: string;
  description: string;
  runsPerWeek: number;
  weeklyDistance: number;
} | null;

type CoordinatePoint = {
  latitude: number;
  longitude: number;
};

function calculateRunDistance(points: CoordinatePoint[] = []) {
  if (!Array.isArray(points) || points.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    total += haversine(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }

  return total;
}

export default function TrainingPlanScreen() {
  const router = useRouter();
  const { id, loginLat, loginLon, fetchedCoord, xyCoord } = useLocalSearchParams();
  console.log("user id in training plans: ", id);

  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>(null);

  const [weeklyProgress, setWeeklyProgress] = useState({
    runsCompleted: 0,
    runsTarget: 0,
    distanceCompleted: 0,
    distanceTarget: 0,
  });

  const handleViewPlan = () => {
  if (!currentPlan || !id) return;

  router.push({
    pathname: "/viewPlan",
    params: {
      id: String(id),
      planId: currentPlan.planId ?? "",
      name: currentPlan.name,
      level: currentPlan.level,
      description: currentPlan.description,
      runsPerWeek: String(currentPlan.runsPerWeek),
      weeklyDistance: String(currentPlan.weeklyDistance),
      ...(loginLat ? { loginLat: String(loginLat) } : {}),
      ...(loginLon ? { loginLon: String(loginLon) } : {}),
      ...(fetchedCoord ? { fetchedCoord: String(fetchedCoord) } : {}),
      ...(xyCoord ? { xyCoord: String(xyCoord) } : {}),
    },
  });
};

  const handleChangePlan = () => {
    if(!id) return;
  router.push({
    pathname: "/selectPlan",
    params: { 
        id: String(id),
        ...(loginLat ? { loginLat: String(loginLat) } : {}),
        ...(loginLon ? { loginLon: String(loginLon) } : {}),
        ...(fetchedCoord ? { fetchedCoord: String(fetchedCoord) } : {}),
        ...(xyCoord ? { xyCoord: String(xyCoord) } : {}), 
    },
  });
};

const handleBackToHome = () => {
  if (!id) return;

  router.push({
    pathname: "/",
    params: {
      id: String(id),
      ...(loginLat ? { loginLat: String(loginLat) } : {}),
      ...(loginLon ? { loginLon: String(loginLon) } : {}),
      ...(fetchedCoord ? { fetchedCoord: String(fetchedCoord) } : {}),
      ...(xyCoord ? { xyCoord: String(xyCoord) } : {}),
    },
  });
};

  useEffect(() => {
  const fetchCurrentPlan = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("user_training_plans")
      .select("*")
      .eq("user_id", String(id))
      .maybeSingle();

    if (error) {
      console.log("Error fetching current training plan:", error);
      return;
    }

    if (data) {
  setCurrentPlan({
    planId: data.plan_id ?? null,
    name: data.name,
    level: data.level,
    description: data.description ?? "A simple weekly running plan.",
    runsPerWeek: data.runs_per_week ?? 0,
    weeklyDistance: data.weekly_distance ?? 0,
  });

      setWeeklyProgress((prev) => ({
        ...prev,
        runsTarget: data.runs_per_week ?? 0,
        distanceTarget: data.weekly_distance ?? 0,
      }));
    } else {
      setCurrentPlan(null);

      setWeeklyProgress((prev) => ({
        ...prev,
        runsTarget: 0,
        distanceTarget: 0,
      }));
    }
  };

  fetchCurrentPlan();
}, [id]);

  useEffect(() => {
    const fetchWeeklyRuns = async () => {
      const startOfWeek = getStartOfWeek(new Date());

      console.log("Start of week:", startOfWeek.toISOString());

      let query = supabase
        .from("runs")
        .select("coordinates, created_at, user_id")
        .gte("created_at", startOfWeek.toISOString());

      if (id) {
        query = query.eq("user_id", String(id));
      }

      const { data, error } = await query;

      if (error) {
        console.log("Error fetching weekly runs:", error);
        return;
      }

      const runsCompleted = data?.length ?? 0;

      console.log("runs completed, ", runsCompleted)

      const distanceCompleted =
        data?.reduce((sum, run) => {
            return sum + calculateRunDistance(run.coordinates || []);
        }, 0) ?? 0;

      console.log("distance covered, ", distanceCompleted);

      setWeeklyProgress((prev) => ({
        ...prev,
        runsCompleted,
        distanceCompleted: Number(distanceCompleted.toFixed(1)),
        }));
    };

    fetchWeeklyRuns();
  }, [id]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Training Plan</Text>
        </View>

        <Text style={styles.sectionTitle}>Current Plan</Text>
        <Pressable
          style={styles.card}
          onPress={currentPlan ? handleViewPlan : handleChangePlan}
        >
          <View style={styles.planTopRow}>
            <View style={styles.planLeft}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={52}
                color="#2f3348"
                style={styles.planIcon}
              />

              <View style={styles.planTextContainer}>
                <Text style={styles.planName}>
                  {currentPlan ? currentPlan.name : "No training plan selected"}
                </Text>

                {currentPlan ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{currentPlan.level}</Text>
                  </View>
                ) : (
                  <Text style={styles.noPlanText}>
                    Choose a plan to start tracking progress
                  </Text>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={34} color="#5d6480" />
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.card}>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="checkmark-outline"
              size={34}
              color="#4c5673"
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
                Runs: {weeklyProgress.runsCompleted} / {weeklyProgress.runsTarget}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={34}
              color="#4c5673"
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
                 Distance: {weeklyProgress.distanceCompleted} / {weeklyProgress.distanceTarget} km
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>

        {currentPlan && (
          <Pressable style={styles.actionCard} onPress={handleViewPlan}>
            <Text style={styles.actionText}>View plan</Text>
            <Ionicons name="chevron-forward" size={34} color="#5d6480" />
          </Pressable>
        )}

        <Pressable style={styles.primaryButton} onPress={handleChangePlan}>
          <Text style={styles.primaryButtonText}>
            {currentPlan ? "Change plan" : "Choose plan"}
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleBackToHome}>
        <Text style={styles.secondaryButtonText}>Back to home</Text>
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#e9e9ee",
  },
  container: {
    flex: 1,
    backgroundColor: "#e9e9ee",
    paddingBottom: 40,
  },
  header: {
    backgroundColor: "#9cb6ee",
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#ffffff",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2a2d3a",
    marginTop: 28,
    marginBottom: 14,
    marginHorizontal: 22,
  },
  card: {
    backgroundColor: "#f7f7f8",
    borderRadius: 22,
    marginHorizontal: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  planIcon: {
    marginRight: 16,
  },
  planTextContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#232634",
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#95b2ef",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  noPlanText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#dddddf",
    marginBottom: 14,
    marginHorizontal: -20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 22,
    color: "#232634",
    fontWeight: "500",
  },
  actionCard: {
    backgroundColor: "#f7f7f8",
    borderRadius: 22,
    marginHorizontal: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  actionText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#232634",
  },
  primaryButton: {
    backgroundColor: "#95b2ef",
    marginHorizontal: 22,
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  secondaryButton: {
  backgroundColor: "#f7f7f8",
  marginHorizontal: 22,
  borderRadius: 22,
  paddingVertical: 20,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 14,
},

secondaryButtonText: {
  color: "#232634",
  fontSize: 20,
  fontWeight: "600",
},
});