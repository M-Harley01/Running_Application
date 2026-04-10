import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import supabase from "../config/supabaseClient"

export default function ViewPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const name = typeof params.name === "string" ? params.name : "Training Plan";
  const level = typeof params.level === "string" ? params.level : "Beginner";
  const runsPerWeek =
    typeof params.runsPerWeek === "string" ? params.runsPerWeek : "3";
  const weeklyDistance =
    typeof params.weeklyDistance === "string" ? params.weeklyDistance : "6";
  const description =
    typeof params.description === "string"
      ? params.description
      : "A simple weekly running plan.";

  const handleSelectPlan = async () => {
    const userId = typeof params.id === "string" ? params.id : null;

    if(!userId){
        console.log("No user id found for selected training plan");
        return;
    }

    const { error } = await supabase
        .from("user_training_plans")
        .upsert(
            [
                {
                    user_id: userId,
                    plan_id: typeof params.planId === "string" ? params.planId : null,
                    name,
                    level,
                    description,
                    runs_per_week: Number(runsPerWeek),
                    weekly_distance: Number(weeklyDistance),
                    updated_at: new Date().toISOString(),
                },
            ],
            { onConflict: "user_id" }
        );

        if (error){
            console.log("Error saving selected training plan: ", error);
            return;
        }

        router.replace({
            pathname: "/trainingPlan",
            params: {
            id: userId,
            ...(typeof params.loginLat === "string" ? { loginLat: params.loginLat } : {}),
            ...(typeof params.loginLon === "string" ? { loginLon: params.loginLon } : {}),
            ...(typeof params.fetchedCoord === "string" ? { fetchedCoord: params.fetchedCoord } : {}),
            ...(typeof params.xyCoord === "string" ? { xyCoord: params.xyCoord } : {}),
            },
        });
};

  const handleBackToPlans = () => {
  const userId = typeof params.id === "string" ? params.id : null;

  router.replace({
    pathname: "/selectPlan",
    params: {
      ...(userId ? { id: userId } : {}),
      ...(typeof params.loginLat === "string" ? { loginLat: params.loginLat } : {}),
      ...(typeof params.loginLon === "string" ? { loginLon: params.loginLon } : {}),
      ...(typeof params.fetchedCoord === "string" ? { fetchedCoord: params.fetchedCoord } : {}),
      ...(typeof params.xyCoord === "string" ? { xyCoord: params.xyCoord } : {}),
    },
  });
};

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>View Plan</Text>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.topRow}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={54}
              color="#2f3348"
              style={styles.icon}
            />

            <View style={styles.titleBlock}>
              <Text style={styles.planName}>{name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{level}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description}>{description}</Text>
        </View>

        <Text style={styles.sectionTitle}>Plan Summary</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Runs per week</Text>
            <Text style={styles.value}>{runsPerWeek}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Weekly distance</Text>
            <Text style={styles.value}>{weeklyDistance} km</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Typical week</Text>
            <Text style={styles.value}>Steady running</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Typical Week</Text>
        <View style={styles.infoCard}>
          <Text style={styles.weekText}>• Complete {runsPerWeek} runs</Text>
          <Text style={styles.weekText}>
            • Aim for {weeklyDistance} km in total
          </Text>
          <Text style={styles.weekText}>• Run at a comfortable pace</Text>
          <Text style={styles.weekText}>• Take rest days between runs</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSelectPlan}>
          <Text style={styles.primaryButtonText}>Select this plan</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleBackToPlans}>
          <Text style={styles.secondaryButtonText}>Back to plans</Text>
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
  mainCard: {
    backgroundColor: "#f7f7f8",
    borderRadius: 22,
    marginHorizontal: 22,
    marginTop: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  icon: {
    marginRight: 16,
  },
  titleBlock: {
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
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: "#5b6270",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2a2d3a",
    marginTop: 28,
    marginBottom: 14,
    marginHorizontal: 22,
  },
  infoCard: {
    backgroundColor: "#f7f7f8",
    borderRadius: 22,
    marginHorizontal: 22,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 18,
    color: "#232634",
    fontWeight: "500",
  },
  value: {
    fontSize: 18,
    color: "#232634",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#dddddf",
    marginVertical: 10,
  },
  weekText: {
    fontSize: 18,
    color: "#232634",
    marginBottom: 12,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: "#95b2ef",
    marginHorizontal: 22,
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
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