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

export default function Home() {
  
    const { id } = useLocalSearchParams();
    console.log("here is the passed in users ID now that you are on index: ", id)

  const router = useRouter();

  // Call hooks unconditionally at the top
  const { location, errorMsg } = useLocation();

  const cameraPosition = {
    coordinates: { latitude: 56.4697445, longitude: -2.8583756 },
    zoom: 15,
  };

  const [checkedAuth, setCheckedAuth] = useState(false);

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

  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  console.log("location is: ", latitude, longitude);

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Index page</Text>

      <View style={styles.stopwatch}>
        <Stopwatch></Stopwatch>
      </View>

      {Platform.OS === "android" && (
              <GoogleMaps.View
                style={styles.map}
                cameraPosition={cameraPosition}
                //polylines={[]}
                //onMapClick={}
              />
      )}

      {errorMsg ? <Text>{errorMsg}</Text> : null}      

      <View style={styles.controls}>
      <Button 
        title="Plan a route" 
        onPress={() => router.push({
          pathname: "/map", 
          params: { lat: latitude, lon: longitude, id: id }
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
          params: {id: id}
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