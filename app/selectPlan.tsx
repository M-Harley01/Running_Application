import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Plan = {
  id: string;
  name: string;
  level: string;
  description: string;
  runsPerWeek: number;
  weeklyDistance: number;
};

const plans: Plan[] = [
  {
    id: "beginner5k",
    name: "Beginner 5K",
    level: "Beginner",
    description: "A light plan for new runners building consistency.",
    runsPerWeek: 3,
    weeklyDistance: 6,
  },
  {
    id: "improver10k",
    name: "10K Improver",
    level: "Intermediate",
    description: "For runners wanting to improve endurance and weekly volume.",
    runsPerWeek: 3,
    weeklyDistance: 12,
  },
  {
    id: "halfbase",
    name: "Half Marathon Base",
    level: "Advanced",
    description: "A stronger endurance-focused plan for longer distances.",
    runsPerWeek: 4,
    weeklyDistance: 20,
  },
];

export default function SelectPlanScreen() {
  const router = useRouter();
  const { id, loginLat, loginLon, fetchedCoord, xyCoord } = useLocalSearchParams();

  const handleSelectPlan = (plan: Plan) => {
    router.push({
      pathname: "/viewPlan",
      params: {
        id: String(id),
        planId: plan.id,
        name: plan.name,
        level: plan.level,
        description: plan.description,
        runsPerWeek: String(plan.runsPerWeek),
        weeklyDistance: String(plan.weeklyDistance),
        ...(loginLat ? { loginLat: String(loginLat) } : {}),
        ...(loginLon ? { loginLon: String(loginLon) } : {}),
        ...(fetchedCoord ? { fetchedCoord: String(fetchedCoord) } : {}),
        ...(xyCoord ? { xyCoord: String(xyCoord) } : {}),
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Select Plan</Text>
        </View>

        <Text style={styles.subheading}>Choose a training plan</Text>

        {plans.map((plan) => (
          <Pressable
            key={plan.id}
            style={styles.card}
            onPress={() => handleSelectPlan(plan)}
          >
            <View style={styles.cardLeft}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={42}
                color="#2f3348"
                style={styles.icon}
              />

              <View style={styles.textContainer}>
                <Text style={styles.planName}>{plan.name}</Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{plan.level}</Text>
                </View>

                <Text style={styles.planInfo}>
                  {plan.runsPerWeek} runs/week • {plan.weeklyDistance} km
                </Text>

                <Text style={styles.description}>{plan.description}</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={30} color="#5d6480" />
          </Pressable>
        ))}
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
  subheading: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2a2d3a",
    marginTop: 24,
    marginBottom: 18,
    marginHorizontal: 22,
  },
  card: {
    backgroundColor: "#f7f7f8",
    borderRadius: 22,
    marginHorizontal: 22,
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 12,
  },
  icon: {
    marginRight: 14,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: "600",
    color: "#232634",
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#95b2ef",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 18,
    marginBottom: 10,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
  planInfo: {
    fontSize: 16,
    color: "#3a3d4a",
    fontWeight: "500",
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 21,
  },
});