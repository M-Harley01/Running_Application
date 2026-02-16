import { StyleSheet, Text, View, Button } from 'react-native'
import React from 'react'
import { Link, useRouter } from 'expo-router'
import { useLocation } from '../Hooks/location'
import { 
  startBackgroundTracking, 
  stopBackgroundTracking 
} from '../Hooks/backgroundLocation'

export default function Home() {
  
  const router = useRouter();
  const { location, errorMsg } = useLocation();
  let latitude = location?.coords.latitude;
  let longitude = location?.coords.longitude;

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