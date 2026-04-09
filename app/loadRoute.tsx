import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, FlatList } from 'react-native';
import supabase from '../config/supabaseClient';
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToCartesian } from '../Hooks/cartesian';

function loadRoute() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const { id, loginLat, loginLon } = useLocalSearchParams();

  const fetchRoutes = async () => {
    const userId = id;

    if (!userId) {
      console.log("No user id passed in params");
      return;
    }

    const { data, error } = await supabase
      .from('routes')
      .select(`
        id,
        coordinates,
        name,
        created_at
      `)
      .eq('user_id', id);

    if (error) {
      console.log("Fetch route error: ", error.message, error);
      return;
    }

    if (data) {
      setRoutes(data);
      if (!data.length) return;
    }
  };

  useEffect(() => {
    fetchRoutes();
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

  const formatPointCount = (coords: { latitude: number; longitude: number }[] = []) => {
    if (!Array.isArray(coords)) return "0 points";
    return `${coords.length} point${coords.length === 1 ? "" : "s"}`;
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
        <Text style={styles.title}>Load route</Text>
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.itemContainer, styles.routeCard]}
            onPress={() => {
              const coords = item.coordinates;
              const tempCartesian: { x: number; y: number }[] = [];

              for (let i = 0; i < coords.length - 1; i++) {
                const p1 = coords[i];
                const p2 = coords[i + 1];

                const segment = routeToCartesian(
                  p1.latitude,
                  p1.longitude,
                  p2.latitude,
                  p2.longitude
                );

                tempCartesian.push(...segment);
              }

              router.replace({
                pathname: "/",
                params: {
                  id: String(id ?? ""),
                  fetchedCoord: JSON.stringify(item.coordinates),
                  name: item.name,
                  xyCoord: JSON.stringify(tempCartesian),
                  loginLat: String(loginLat ?? ""),
                  loginLon: String(loginLon ?? ""),
                },
              });
            }}
          >
            <View style={styles.routeCardTop}>
              <Text style={styles.routeName}>{item.name || "Unnamed route"}</Text>
              <Text style={styles.routeChevron}>›</Text>
            </View>

            <View style={styles.routeCardBottom}>
              <Text style={styles.routeMeta}>{formatDate(item.created_at)}</Text>
              <Text style={styles.routeMeta}>{formatDistance(item.coordinates)}</Text>
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
                loginLat: String(loginLat ?? ""),
                loginLon: String(loginLon ?? ""),
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

export default loadRoute;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f6f6f8",
    paddingTop: 20,
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

  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },

  itemContainer: {
    width: "92%",
    alignSelf: "center",
    marginVertical: 6,
  },

  routeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  routeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  routeName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111",
    flex: 1,
    marginRight: 12,
  },

  routeChevron: {
    fontSize: 28,
    color: "#555",
  },

  routeCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  routeMeta: {
    fontSize: 15,
    color: "#333",
  },

  footer: {
    padding: 16,
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