import { AppleMaps, GoogleMaps } from "expo-maps";
import { StyleSheet, Text, View, Button, Platform } from 'react-native'
import React, { useEffect, useState } from "react"
import { Link, useRouter, useLocalSearchParams } from 'expo-router'
import { useLocation } from '../Hooks/location'
import { 
  startBackgroundTracking, 
  stopBackgroundTracking 
} from '../Hooks/backgroundLocation'
import supabase from "../config/supabaseClient"
import Stopwatch from './stopwatch'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Home() {
  
  const { location, errorMsg } = useLocation();
  const { loginLat, loginLon, id, fetchedCoord, name, xyCoord } = useLocalSearchParams();
  const [loadedRoute, setLoadedRoute] = useState<{latitude: number; longitude: number}[]>([]);
  const [loadedCartesian, setLoadedCartesian ] = useState<{x: number; y: number}[]>([]);
  const router = useRouter();   
  const [checkedAuth, setCheckedAuth] = useState(false);

  console.log("Cartesian route is: ", id);
  
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

    const storeData = async (routeXY: {x: number; y: number}[]) =>{
        try{ 
          await AsyncStorage.setItem("active_route_cartesian", JSON.stringify(routeXY)); 
        }catch(e){
          console.log("Failed to store active_route_cartesian: ", e)
        }
    }

    storeData(cleaned);

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

      <View style={styles.stopwatch}>
        <Stopwatch></Stopwatch>
        <Button 
        title="View runs" 
        onPress={() => router.push({
          pathname: "/listRuns", 
          params: { id: id }
        })}
      />
      </View>

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

      <View style={styles.controls}>
      <Button 
        title="Plan a route" 
        onPress={() => router.push({
          pathname: "/map", 
          params: { id: id }
        })}
      />

      <Button
        title="Start Run (Background Tracking)"
        onPress={() => startBackgroundTracking()}
      />

      <Button
        title="Stop Run"
        onPress={() => stopBackgroundTracking()}
      />

       <Button
        title="Load Route"
        onPress={() => router.push({
          pathname: "/loadRoute",
          params: {id: id, loginLat: loginLat, loginLon: loginLon}
        })}
      />
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

  display: {},
  startButton: {},
  stopButton: {},
  resetButton: {},
});