import { AppleMaps, GoogleMaps } from "expo-maps";
import { StyleSheet, Text, View, Button, Platform, Pressable } from 'react-native'
import React, { useEffect, useState } from "react"
import { Link, useRouter, useLocalSearchParams } from 'expo-router'
import * as Location from "expo-location";
import { useLocation } from '../Hooks/location'
import { 
  startBackgroundTracking, 
  stopBackgroundTracking,
  clearTrackedUser,
  finaliseRun 
} from '../Hooks/backgroundLocation'
import supabase from "../config/supabaseClient"
import { Stopwatch } from './stopwatch'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DropdownComponent from './dropDownTest'

export default function Home() {
  
  const { location } = useLocation();
  const { loginLat, loginLon, id, fetchedCoord, xyCoord } = useLocalSearchParams();
  const [loadedRoute, setLoadedRoute] = useState<{latitude: number; longitude: number}[]>([]);
  const [loadedCartesian, setLoadedCartesian ] = useState<{x: number; y: number}[]>([]);
  const router = useRouter();   
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [startRunLocation, setStartRunLocation] = useState<Location.LocationObject | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [offRoute, setOffRoute] = useState(false);

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
    if(!fetchedCoord) return
    
    try{
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
    }
    catch (e){
      console.log("Failed to parse fetchedCoords: ", e)
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

    const storeCartesian = async (routeXY: {x: number; y: number}[]) =>{
        try{ 
          await AsyncStorage.setItem("active_route_cartesian", JSON.stringify(routeXY)); 
        }catch(e){
          console.log("Failed to store active_route_cartesian: ", e)
        }
    }

    storeCartesian(cleaned);

  } catch (e) {
    console.log("Failed to parse xyCoord:", e);
  }
}, [xyCoord]);
  
  const currentLat = location?.coords.latitude ?? 56.4697445;
  const currentLon = location?.coords.longitude ?? -2.8583756;

  const cameraPosition = {
    coordinates: { latitude: currentLat, longitude: currentLon },
    zoom: 15,
  };
  
  const routePolyline = [
    {
      id: "route",
      width: 6,
      color: "#e20000",
      geodesic: true,
      coordinates: loadedRoute
    }
  ]

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

  // Now it’s safe to early-return because all hooks already ran
  if (!checkedAuth) return null;

  return (
    <View style={styles.container}>

      <View style={styles.header}>
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
  </View>

      {isRunning && loadedCartesian.length >= 2 && offRoute && (
  <View style={styles.offRouteOverlay}>
    <Text style={styles.offRouteText}>You are off route</Text>
  </View>
)}

      <View style={styles.mapContainer}>
      {Platform.OS === "ios" && (
        <AppleMaps.View
          style={styles.map}
          cameraPosition={cameraPosition}
          polylines={routePolyline}
        />
      )}

      {Platform.OS === "android" && (
              <GoogleMaps.View
                style={styles.map}
                cameraPosition={cameraPosition}
                polylines={routePolyline}
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

        setResetKey(prev => prev + 1);
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
    setIsPaused(false);
    try {
      const foregroundLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setIsRunning(true);

      const date = new Date(foregroundLocation.timestamp);
      setStartRunLocation(foregroundLocation);
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
    <Text style={styles.controlButtonText}>Clear route</Text>
  </Pressable>
)}
      </View>
        
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: 110,
  },

  title: {
  color: "#ffffff",
  fontSize: 22,
  fontWeight: "500",
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
    justifyContent: "flex-start",
    paddingTop: 16,
  },

  controls: {
  position: "absolute",
  bottom: 20,
  width: "92%",
  alignSelf: "center",
  backgroundColor: "#a9c4f5",
  borderRadius: 24,
  flexDirection: "row",
  justifyContent: "space-evenly",
  alignItems: "center",
  paddingVertical: 16,
  paddingHorizontal: 16,

  // shadow (iOS)
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },

  // shadow (Android)
  elevation: 10,
},
  endRunOverlay: {
  position: "absolute",
  top: 20,
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
  height: 380,
  marginTop: 12,
  borderRadius: 24,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#d9d9d9",
  backgroundColor: "#ddd",
},
topCard: {
  width: "92%",
  height: 140,
  backgroundColor: "#ffffff",
  marginTop: 16,
  paddingHorizontal: 16,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "#e5e5e5",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
},
controlButton: {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  minWidth: 110,
  paddingVertical: 12,
  paddingHorizontal: 18,
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
  marginTop: 18,
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
  display: {},
  startButton: {},
  stopButton: {},
  resetButton: {},
});