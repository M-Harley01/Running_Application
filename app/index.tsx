import { AppleMaps, GoogleMaps } from "expo-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, Text, View, Platform, Pressable } from 'react-native'
import React, { useEffect, useRef ,useState } from "react"
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Location from "expo-location";
import { useLocation } from '../Hooks/location'
import { 
  startBackgroundTracking, 
  stopBackgroundTracking,
  finaliseRun 
} from '../Hooks/backgroundLocation'
import supabase from "../config/supabaseClient"
import { Stopwatch } from './stopwatch'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DropdownComponent from './dropDownTest'
import { haversine } from '../Hooks/haversine'
import { useTrackedRunMapFollow } from '../Hooks/useTrackedRunMapFollow';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { loginLat, loginLon, id, fetchedCoord, xyCoord } = useLocalSearchParams();
  const [loadedRoute, setLoadedRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loadedCartesian, setLoadedCartesian] = useState<{ x: number; y: number }[]>([]);
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [offRoute, setOffRoute] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const googleMapRef = useRef<any>(null);
  const appleMapRef = useRef<any>(null);

  const [cameraPosition, setCameraPosition] = useState({
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    zoom: 15,
  });

  useEffect(() => {
    if (!isRunning) {
      setOffRoute(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await AsyncStorage.getItem("off_route_status");
        setOffRoute(status === "true");
      } catch (e) {
        console.log("Failed to read off_route_status:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    console.log("User id is:", id);
  }, [id]);

  useEffect(() => {
    if (!fetchedCoord) return;

    try {
      const parsed = JSON.parse(String(fetchedCoord));

      const cleaned = Array.isArray(parsed)
        ? parsed.filter(
            (p) =>
              p &&
              typeof p.latitude === "number" &&
              typeof p.longitude === "number"
          )
        : [];

      setLoadedRoute(cleaned);
    } catch (e) {
      console.log("Failed to parse fetchedCoords: ", e);
    }
  }, [fetchedCoord]);

  useEffect(() => {
    if (!xyCoord) return;

    try {
      const parsed = JSON.parse(String(xyCoord));

      const cleaned = Array.isArray(parsed)
        ? parsed.filter(
            (p) =>
              p &&
              typeof p.x === "number" &&
              typeof p.y === "number"
          )
        : [];

      setLoadedCartesian(cleaned);

      const storeCartesian = async (routeXY: { x: number; y: number }[]) => {
        try {
          await AsyncStorage.setItem("active_route_cartesian", JSON.stringify(routeXY));
        } catch (e) {
          console.log("Failed to store active_route_cartesian: ", e);
        }
      };

      storeCartesian(cleaned);
    } catch (e) {
      console.log("Failed to parse xyCoord:", e);
    }
  }, [xyCoord]);

  useEffect(() => {
    if (!location?.coords) return;
    if (Platform.OS === "ios" && isRunning) return;

    setCameraPosition({
      coordinates: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      zoom: 15,
    });
  }, [location, isRunning]);

  useTrackedRunMapFollow({
  isRunning,
  googleMapRef,
  appleMapRef,
  intervalMs: 2000,
  zoom: 15,
});

  const routePolyline = [
    {
      id: "route",
      width: 6,
      color: "#e20000",
      geodesic: true,
      coordinates: loadedRoute,
    },
  ];

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.log("[AUTH] getSession error:", error.message);
        router.replace("/login");
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      if (mounted) setCheckedAuth(true);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const updateLiveDistance = async () => {
    try {
      const storedPoints = await AsyncStorage.getItem("user_points_array");
      console.log("storedPoints raw:", storedPoints);

      if (!storedPoints) {
        setDistanceKm(0);
        return;
      }

      const parsed = JSON.parse(storedPoints);

      const cleaned = Array.isArray(parsed)
        ? parsed.filter(
            (p) =>
              p &&
              typeof p.latitude === "number" &&
              typeof p.longitude === "number"
          )
        : [];

      if (cleaned.length < 2) {
        setDistanceKm(0);
        return;
      }

      let total = 0;

      for (let i = 1; i < cleaned.length; i++) {
        total += haversine(
          cleaned[i - 1].latitude,
          cleaned[i - 1].longitude,
          cleaned[i].latitude,
          cleaned[i].longitude
        );
      }

      setDistanceKm(total);
      console.log("distance source:", storedPoints);
    } catch (e) {
      console.log("Failed to update live distance:", e);
    }
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      updateLiveDistance();
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning]);

  if (!checkedAuth) return null;

  const distanceDisplay =
  distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(2)} km`;

  if (!location) {
    return (
      <View style={styles.container}>
        <Text>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top + 8 }]}>
        <Text style={styles.title}> Index page</Text>
        <View style={styles.headerDropdown}>
          <DropdownComponent
            id={id}
            loginLat={loginLat}
            loginLon={loginLon}
            fetchedCoord={fetchedCoord}
            xyCoord={xyCoord}
          />
        </View>
      </View>

      <View style={styles.topCard}>
        <View style={styles.stopwatch}>
          <Stopwatch isRunning={isRunning} resetTrigger={resetKey} />
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>{distanceDisplay}</Text>
          <Text style={styles.distanceLabel}>Distance</Text>
        </View>
      </View>

      {isRunning && loadedCartesian.length >= 2 && offRoute && (
        <View style={styles.offRouteOverlay}>
          <Text style={styles.offRouteText}>You are off route</Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        {Platform.OS === "ios" && (
          <AppleMaps.View
            ref={appleMapRef}
            style={styles.map}
            cameraPosition={cameraPosition}
            polylines={routePolyline}
            properties={{
              isMyLocationEnabled: true,
              pointsOfInterest: {
                including: [],
              },
            }}
          />
        )}

        {Platform.OS === "android" && (
          <GoogleMaps.View
            ref={googleMapRef}
            style={styles.map}
            cameraPosition={cameraPosition}
            polylines={routePolyline}
            properties={{
              isMyLocationEnabled: true,
              mapStyleOptions: {
                json: JSON.stringify([
                  {
                    featureType: "poi",
                    stylers: [{ visibility: "off" }],
                  },
                  {
                    featureType: "transit",
                    stylers: [{ visibility: "off" }],
                  },
                ]),
              },
            }}
          />
        )}
      </View>

      {isPaused && (
        <View style={styles.endRunOverlay}>
          <Pressable
            style={styles.endRunButton}
            onPress={async () => {
              console.log("Run ended");

              await finaliseRun();

              setResetKey((prev) => prev + 1);
              setIsPaused(false);
              setIsRunning(false);

              router.push({
                pathname: "/runSummary",
                params: { id },
              });
            }}
          >
            <Text style={styles.endRunButtonText}>End run</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          style={styles.controlButton}
          onPress={async () => {
            if (isRunning) return;

            setIsPaused(false);
            try {
              const foregroundLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });

              setIsRunning(true);
              setDistanceKm(0);

              const date = new Date(foregroundLocation.timestamp);
              console.log(
                "Starting foreground location:",
                foregroundLocation.coords.latitude,
                foregroundLocation.coords.longitude,
                date
              );

              const storeStartLocation = async () => {
                try {
                  await AsyncStorage.setItem(
                    "start_run_location",
                    JSON.stringify({
                      latitude: foregroundLocation.coords.latitude,
                      longitude: foregroundLocation.coords.longitude,
                      altitude: foregroundLocation.coords.altitude ?? null,
                      timestamp: foregroundLocation.timestamp,
                    })
                  );
                } catch (error) {
                  console.log("Failed to store start_run_location:", error);
                }
              };

              await storeStartLocation();

              if (loadedCartesian && loadedCartesian.length >= 2) {
                await AsyncStorage.setItem(
                  "active_route_cartesian",
                  JSON.stringify(loadedCartesian)
                );
              } else {
                await AsyncStorage.removeItem("active_route_cartesian");
              }

              console.log("[START] loadedCartesian length:", loadedCartesian.length);
              console.log("[START] loadedCartesian first point:", loadedCartesian[0]);

              const routeCheck = await AsyncStorage.getItem("active_route_cartesian");
              console.log("[START] active_route_cartesian after save:", routeCheck);

              await AsyncStorage.setItem("off_route_status", "false");
              await startBackgroundTracking();
            } catch (e) {
              console.log("Failed to start run:", e);
            }
          }}
        >
          <Text style={styles.controlButtonText}>Start run</Text>
        </Pressable>

        <Pressable
          style={styles.controlButton}
          onPress={() => {
            if (!isRunning) return;

            stopBackgroundTracking();
            setIsRunning(false);
            setIsPaused(true);
          }}
        >
          <Text style={styles.controlButtonText}>Stop run</Text>
        </Pressable>

        {loadedRoute.length > 0 && !isRunning && !isPaused && (
          <Pressable
            style={styles.controlButton}
            onPress={async () => {
              setLoadedRoute([]);
              setLoadedCartesian([]);
              await AsyncStorage.removeItem("active_route_cartesian");
              console.log("Loaded route cleared");
            }}
          >
            <Text style={styles.controlButtonText}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: 24,
  },

  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "500",
    flexShrink: 1,
  },

  card: {
    backgroundColor: "#eee",
    padding: 20,
    borderRadius: 5,
  },

  map: {
    width: "100%",
    height: "100%",
  },

  stopwatch: {
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
},

  controls: {
    width: "92%",
    alignSelf: "center",
    backgroundColor: "#a9c4f5",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },

 endRunOverlay: {
  position: "absolute",
  bottom: 120,
  alignSelf: "center",
  zIndex: 20,
  elevation: 20,
},

  offRouteOverlay: {
    position: "absolute",
    top: 210,
    alignSelf: "center",
    zIndex: 20,
    elevation: 20,
    backgroundColor: "#e20000",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  offRouteText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },

  mapContainer: {
    width: "92%",
    height: 340,
    marginTop: 12,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d9d9d9",
    backgroundColor: "#ddd",
  },

 topCard: {
  width: "92%",
  height: 175,
  backgroundColor: "#ffffff",
  marginTop: 16,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "#e5e5e5",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden"
},

  controlButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  controlButtonText: {
    fontSize: 18,
    color: "#111",
    fontWeight: "500",
  },

  header: {
    width: "92%",
    backgroundColor: "#a9c4f5",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerDropdown: {
    maxWidth: 180,
  },

  endRunButton: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  endRunButtonText: {
    fontSize: 18,
    color: "#111",
    fontWeight: "500",
  },

  distanceLabel: {
  fontSize: 14,
  color: "#666",
  marginTop: 2,
},
distanceText: {
  fontSize: 22,
  fontWeight: "600",
  color: "#111",
  marginTop: 0,
},
  metricDivider: {
  width: "90%",
  height: 1,
  backgroundColor: "#222",
  marginTop: 8,
  marginBottom: 8,
},

distanceContainer: {
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: 4,
},
});