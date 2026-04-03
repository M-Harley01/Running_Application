import { AppleMaps, GoogleMaps } from "expo-maps";
import { StyleSheet, Text, View, Button, Platform } from 'react-native'
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
      <Text style={styles.title}> Index page</Text>
      <DropdownComponent id={id} loginLat={loginLat} loginLon={loginLon} />

      <View style={styles.stopwatch}>
       <Stopwatch isRunning={isRunning} resetTrigger={resetKey} />
      </View>

      {isRunning && loadedCartesian.length >= 2 && offRoute && (
  <View style={styles.offRouteOverlay}>
    <Text style={styles.offRouteText}>You are off route</Text>
  </View>
)}

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

      {isPaused && (
        <View style={styles.endRunOverlay}>
          <Button
          title="End run"
            onPress={async () => {
            console.log("Run ended");

            await finaliseRun(); 

            setResetKey(prev => prev + 1);
            setIsPaused(false);
            setIsRunning(false);

            // Navigate to summary screen (you’ll build this next)
            router.push({
              pathname: "/runSummary",
              params: { id },
            });
          }}
          />
        </View>
  )}

      <View style={styles.controls}>
    
      <Button
        title="Start Run (Background Tracking)"
        onPress={async () => {
          setIsPaused(false);
          try {
            const foregroundLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });

            setIsRunning(true);

            const date = new Date(foregroundLocation.timestamp);
            setStartRunLocation(foregroundLocation);
            console.log("Starting foreground location:", foregroundLocation.coords.latitude, foregroundLocation.coords.longitude, date);

            const storeStartLocation = async () => {
              try {
                await AsyncStorage.setItem(
                  "start_run_location",
                  JSON.stringify({
                    latitude: foregroundLocation.coords.latitude,
                    longitude: foregroundLocation.coords.longitude,
                    altitude: foregroundLocation.coords.altitude ?? null,
                    timestamp: foregroundLocation.timestamp
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

          // reset off-route status
          await AsyncStorage.setItem("off_route_status", "false");

          await startBackgroundTracking();
          } catch (e) {
            console.log("Failed to start run:", e);
          }
        }}
      />

      <Button
        title="Stop Run"
        onPress={() => {
          if(!isRunning) return;
          
          stopBackgroundTracking();
          setIsRunning(false);
          setIsPaused(true);
        }}
      />

      {loadedRoute.length > 0 && !isRunning && !isPaused &&(
        <Button
          title="Clear Loaded Route"
          onPress={async () => {
            setLoadedRoute([]);
            setLoadedCartesian([]);

            await AsyncStorage.removeItem("active_route_cartesian");

            console.log("Loaded route cleared");
          }}
        />
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
    paddingBottom: 170,
  },

  title: {
    width: "100%",
    backgroundColor: "#a9c4f5",
    color: "#ffffff",
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 18,
    fontSize: 22,
    fontWeight: "500",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },

  card: {
    backgroundColor: "#eee",
    padding: 20,
    borderRadius: 5,
  },

  map: {
    flex: 1,
    width: "100%",
  },

  stopwatch: {
    width: "100%",
    height: 150,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    overflow: "hidden",
  },

  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    height: 170,
    backgroundColor: "#a9c4f5",
    borderTopWidth: 1,
    borderTopColor: "#111",

    justifyContent: "space-evenly",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,

    zIndex: 10,
    elevation: 10,
  },
  endRunOverlay: {
  position: "absolute",
  top: 20,
  alignSelf: "center",
  zIndex: 20,
  elevation: 20,
  backgroundColor: "#ffffff",
  borderRadius: 8,
  padding: 6,
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
  display: {},
  startButton: {},
  stopButton: {},
  resetButton: {},
});