import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

export const LOCATION_TASK_NAME = "background-location-task";

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

  const { latitude, longitude, accuracy } = locations[0].coords;
  console.log(
    `[BG-LOC] ${new Date(now).toISOString()} lat=${latitude} lon=${longitude} acc=${accuracy}`
  );

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
  const ok = await ensureBackgroundLocationPermissions();
  if (!ok) return;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
  if (alreadyStarted) {
    console.log("[BG-LOC] Already started");
    return;
  }

  // Reset throttle on start so first point logs immediately
  lastLoggedAt = 0;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {

    accuracy: Location.Accuracy.Highest,
    timeInterval: 10_000, // aim for ~60s on Android
    distanceInterval: 0,  // set >0 if you want only when user moves

    // Optional but commonly used for fitness-style tracking:
    // pausesUpdatesAutomatically: false, // iOS only
    // showsBackgroundLocationIndicator: true, // iOS only

    // Android: keeping this enabled typically results in a single persistent
    // "tracking active" notification while tracking is running.
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

// Convenience helper if you want to show "Start/Stop" based on current state.
export async function isBackgroundTrackingRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}