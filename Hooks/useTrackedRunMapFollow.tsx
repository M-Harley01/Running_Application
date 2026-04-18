import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UseTrackedRunMapFollowProps = {
  isRunning: boolean;
  googleMapRef: React.RefObject<any>;
  appleMapRef: React.RefObject<any>;
  intervalMs?: number;
  zoom?: number;
};

export function useTrackedRunMapFollow({
  isRunning,
  googleMapRef,
  appleMapRef,
  intervalMs = 2000,
  zoom = 15,
}: UseTrackedRunMapFollowProps) {
  useEffect(() => {
    if (!isRunning) return;

    const updateMapFromLastTrackedPoint = async () => {
      try {
        const storedPoints = await AsyncStorage.getItem("user_points_array");
        if (!storedPoints) return;

        const parsed = JSON.parse(storedPoints);

        const cleaned = Array.isArray(parsed)
          ? parsed.filter(
              (p) =>
                p &&
                typeof p.latitude === "number" &&
                typeof p.longitude === "number"
            )
          : [];

        if (cleaned.length === 0) return;

        const lastPoint = cleaned[cleaned.length - 1];

        googleMapRef.current?.setCameraPosition?.({
          coordinates: {
            latitude: lastPoint.latitude,
            longitude: lastPoint.longitude,
          },
          zoom,
        });

        appleMapRef.current?.setCameraPosition?.({
          coordinates: {
            latitude: lastPoint.latitude,
            longitude: lastPoint.longitude,
          },
          zoom,
        });
      } catch (e) {
        console.log("Failed to update map from last tracked point:", e);
      }
    };

    updateMapFromLastTrackedPoint();

    const interval = setInterval(() => {
      updateMapFromLastTrackedPoint();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isRunning, googleMapRef, appleMapRef, intervalMs, zoom]);
}