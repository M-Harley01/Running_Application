import { StyleSheet, Text, View, Button } from 'react-native'
import React from 'react'
import { useEffect, useState } from "react"
import { Link, useRouter } from 'expo-router'
import { useLocation } from '../Hooks/location'
import { 
  startBackgroundTracking, 
  stopBackgroundTracking 
} from '../Hooks/backgroundLocation'

import supabase from "../config/supabaseClient"

export default function Home() {
  
  const router = useRouter();

  // ✅ Call hooks unconditionally at the top
  const { location, errorMsg } = useLocation();

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

  // ✅ Now it’s safe to early-return because all hooks already ran
  if (!checkedAuth) return null;

  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  console.log("location is: ", latitude, longitude);

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Index page</Text>

      {errorMsg ? <Text>{errorMsg}</Text> : null}      

      <Button 
        title="Plan a route" 
        onPress={() => router.push({
          pathname: "/map", 
          params: { lat: latitude, lon: longitude }
        })}
      />

      <View style={{ height: 20 }} />

      <Button
        title="Start Run (Background Tracking)"
        onPress={() => startBackgroundTracking()}
      />

      <View style={{ height: 10 }} />

      <Button
        title="Stop Run"
        onPress={() => stopBackgroundTracking()}
      />
        
    </View>
  )
}

const styles = StyleSheet.create({
  container:{
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
  },
  card:{
    backgroundColor: '#eee',
    padding: 20,
    borderRadius: 5
  }
})