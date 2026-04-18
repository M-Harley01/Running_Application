import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from '@react-native-async-storage/async-storage'
import { userToCartesian } from '../Hooks/cartesian'
import { dToLine } from '../Hooks/distanceToLine'
import { calculateSplits, calculateElevation } from '../Hooks/calculateSplits'

export const LOCATION_TASK_NAME = "background-location-task";
type TrackedPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
  accuracy?: number; 
};

let trackedUser: TrackedPoint[] = [];
let lastStatus: string | null = null;

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

  console.log("[BG-LOC] Batch size:", locations.length);

  const now = Date.now();
  if (now - lastLoggedAt < LOG_EVERY_MS) return;
  lastLoggedAt = now;

  const { latitude, longitude, accuracy, altitude } = locations[0].coords;

  let userLocationCartesian: { x: number; y: number } = {x:0, y:0};

  userLocationCartesian = userToCartesian(latitude, longitude);

   const userPoint: TrackedPoint = {
    latitude: latitude, 
    longitude: longitude, 
    timestamp: now, 
    altitude: altitude?? 0
  };
  trackedUser.push(userPoint);

  try {
    await AsyncStorage.setItem("user_points_array", JSON.stringify(trackedUser));
  }catch(e){
    console.log("Failed to store user_points_array during run: ", e);
  }
  
  const getCartesian = async () => {
    try{
      const OFF_ROUTE_THRESHOLD = 0.03;
      const value = await AsyncStorage.getItem("active_route_cartesian");
      if(value !== null){
        const routeXY: {x: number; y: number}[] = JSON.parse(value);

        if (!Array.isArray(routeXY) || routeXY.length < 2) {
          await AsyncStorage.setItem("off_route_status", "false");
          return;
        }

        const distance = dToLine(userLocationCartesian, routeXY);
        console.log("distance to closest line: ", distance);

        if (distance > OFF_ROUTE_THRESHOLD) {
          if (lastStatus !== "true") {
            await AsyncStorage.setItem("off_route_status", "true");
            lastStatus = "true";
          }
        } else {
          if (lastStatus !== "false") {
            await AsyncStorage.setItem("off_route_status", "false");
            lastStatus = "false";
          }
        }
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
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );

  if (alreadyStarted) {
    console.log("[BG-LOC] Already started, stopping old tracking first");
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  trackedUser = [];
  lastLoggedAt = 0;
  lastStatus = null;

  await AsyncStorage.removeItem("user_points_array");
  await AsyncStorage.setItem("off_route_status", "false");

  const getStart = async () => {
    try {
      const value = await AsyncStorage.getItem("start_run_location");
      if (value !== null) {
        const userStart: TrackedPoint = JSON.parse(value);
        trackedUser.push(userStart);

        await AsyncStorage.setItem(
          "user_points_array",
          JSON.stringify(trackedUser)
        );

        console.log(
          "here is the start in the background: ",
          trackedUser[0].latitude,
          trackedUser[0].longitude,
          trackedUser[0].timestamp
        );
      }
    } catch (e) {
      console.log("Failed to load start_run_location: ", e);
    }
  };

  await getStart();

  const ok = await ensureBackgroundLocationPermissions();
  if (!ok) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Highest,
    timeInterval: 10_000,
    distanceInterval: 0,
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

  console.log("[BG-LOC] Stopped");
}

export async function finaliseRun(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );

  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  try {
    await AsyncStorage.setItem(
      "user_points_array",
      JSON.stringify(trackedUser)
    );

    const splits = calculateSplits(trackedUser);
    const elevation = calculateElevation(trackedUser);

    await AsyncStorage.setItem("run_splits", JSON.stringify(splits));
    await AsyncStorage.setItem("run_elevation", JSON.stringify(elevation));

    console.log("[BG-LOC] Run finalised");
    console.log("[BG-LOC] Splits:", splits);
    console.log("[BG-LOC] Elevation:", elevation);
  } catch (e) {
    console.log("Failed to finalise run:", e);
  }
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