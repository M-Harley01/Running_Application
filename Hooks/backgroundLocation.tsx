import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from '@react-native-async-storage/async-storage'
import { userToCartesian } from '../Hooks/cartesian'
import { dToLine } from '../Hooks/distanceToLine'
import React, { useState } from "react"
import { haversine } from '../Hooks/haversine'

export const LOCATION_TASK_NAME = "background-location-task";
type TrackedPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
  accuracy?: number; 
};

let trackedUser: TrackedPoint[] = [];

// Throttle logging/storage so you effectively get "one point per minute"
const LOG_EVERY_MS = 10_000;
let lastLoggedAt = 0;

type BackgroundLocationTaskData = {
  locations: Location.LocationObject[];
};

// Define the task ONCE at module scope
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log("[BG-LOC] Task error:", error.message ?? error);
    return;
  }

  const locations = (data as BackgroundLocationTaskData | undefined)?.locations;
  if (!locations || locations.length === 0) return;

  const now = Date.now();
  if (now - lastLoggedAt < LOG_EVERY_MS) return;
  lastLoggedAt = now;

  const { latitude, longitude, accuracy, altitude } = locations[0].coords;

  let userLocationCartesian: { x: number; y: number } = {x:0, y:0};

  userLocationCartesian = userToCartesian(latitude, longitude);

   const userPoint: TrackedPoint = {latitude: latitude, longitude: longitude, timestamp: now, altitude: altitude?? 0};
    trackedUser.push(userPoint);
  
  const getCartesian = async () => {
    try{
      const value = await AsyncStorage.getItem("active_route_cartesian");
      if(value !== null){
        const routeXY: {x: number; y: number}[] = JSON.parse(value);
        const distance = dToLine(userLocationCartesian, routeXY);
        console.log("distance to closest line: ", distance);
      }
    }catch(e){
      console.log("Failed to load active_route_cartesian: ", e);
    }
  }
  getCartesian();
 

  console.log(
    `[BG-LOC] ${new Date(now).toISOString()} lat=${latitude} lon=${longitude} acc=${accuracy}`
  );

  for(let i =0; i < trackedUser.length; i++){
    console.log("User point number ", i, ": " ,trackedUser[i].latitude, trackedUser[i].longitude, trackedUser[i].timestamp);
  }

});

export async function ensureBackgroundLocationPermissions(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    console.log("[BG-LOC] Foreground permission not granted");
    return false;
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") {
    console.log("[BG-LOC] Background permission not granted");
    return false;
  }

  return true;
}

//Starts background location updates (keeps working when screen is locked / app in background).
export async function startBackgroundTracking(): Promise<void> {

  const getStart = async () => {
    try{
      const value = await AsyncStorage.getItem("start_run_location");
      if(value !== null){
        const userStart: TrackedPoint = JSON.parse(value);
        trackedUser.push(userStart);
        console.log("here is the start in the background: ", 
          trackedUser[0].latitude, 
          trackedUser[0].longitude, 
          trackedUser[0].timestamp
        );
      }
    }catch(e){
      console.log("Failed to load active_route_cartesian: ", e);
    }
  }
  await getStart();

  const ok = await ensureBackgroundLocationPermissions();
  if (!ok) return;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
  if (alreadyStarted) {
    console.log("[BG-LOC] Already started");
    return;
  }

  lastLoggedAt = 0;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 10_000, // aim for ~60s on Android
    distanceInterval: 0,  // set >0 if you want only when user moves
    foregroundService: {
      notificationTitle: "Run tracking active",
      notificationBody: "Your location is being recorded in the background.",
    },
  });

  console.log("[BG-LOC V1.1] Started");
}

//Stops background location updates
export async function stopBackgroundTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
  if (!started) {
    console.log("[BG-LOC] Not running");
    return;
  }

  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

   try {
    await AsyncStorage.setItem(
      "user_points_array",
      JSON.stringify(trackedUser)
    );
  } catch (e) {
    console.log("Failed to store user_points_array:", e);
  }

  console.log("[BG-LOC] Stopped");
}

// Convenience helper if you want to show "Start/Stop" based on current state.
export async function isBackgroundTrackingRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export function clearTrackedUser(): void {
  trackedUser = [];
  lastLoggedAt = 0;
  console.log("[BG-LOC] Cleared tracked user array");
}