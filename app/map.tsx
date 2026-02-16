import { AppleMaps, GoogleMaps } from "expo-maps";
import { Platform, View, StyleSheet, Button } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiCall } from "../Hooks/route";
import { useRef, useState } from "react";

type LatLng = { latitude: number; longitude: number };

export default function Map() {
  const chosenRoute = useRef<LatLng[]>([]);

  const { lat, lon } = useLocalSearchParams();

  const [startSelected, setStartSelected] = useState(false); 
  const [startCoord, setStartCoord] = useState(false);       
  const [addPoint, setAddPoint] = useState(false);
  
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const cameraPosition = {
    coordinates: { latitude: 56.4697445, longitude: -2.8583756 },
    zoom: 15,
  };

  const myPolyline = [
    {
      id: "route-1",
      width: 6,
      color: "#e20000",
      geodesic: true,
      coordinates: routeCoords,
    },
  ];

  const onFetchRoute = async (latLon: LatLng) => {
    if (!chosenRoute.current[0]) {
      console.log("No start point selected");
      return;
    }

    const startOfSegment = chosenRoute.current[chosenRoute.current.length - 2];
    const fetchedCoords = await apiCall(startOfSegment, latLon);

    const converted = fetchedCoords.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));

    console.log("The test route given back is:", converted);
    setRouteCoords((prev) => {
    if (prev.length === 0) return converted;

    const segmentToAdd = converted.slice(1);
    return [...prev, ...segmentToAdd];
});
  };

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" && <AppleMaps.View style={styles.map} />}

      {Platform.OS === "android" && (
        <GoogleMaps.View
          style={styles.map}
          cameraPosition={cameraPosition}
          polylines={[
  {
    coordinates: [
      { latitude: 56.4697402, longitude: -2.858486 },
      { latitude: 56.4697642, longitude: -2.8583836 },
      { latitude: 56.4697697, longitude: -2.8584458 },
      { latitude: 56.4697512, longitude: -2.8584444 },
      { latitude: 56.4696157, longitude: -2.8583664 },
      { latitude: 56.4696826, longitude: -2.8583107 },
      { latitude: 56.4697898, longitude: -2.8574722 },
      { latitude: 56.4697785, longitude: -2.856957 },
      { latitude: 56.4700066, longitude: -2.8566019 }
    ]
  }
]}
          onMapClick={(e) => {
            const lat = e.coordinates.latitude;
            const lon = e.coordinates.longitude;

            if (lat === undefined || lon === undefined) {
              console.log("Click event missing coordinates");
              return;
            }

            if (startSelected) {
              console.log("Start added:", lat, lon);

              chosenRoute.current.push({ latitude: lat, longitude: lon });
              setStartCoord(true);      
              setStartSelected(false); 
              return; 
            }

            if (addPoint) {
              console.log("Point added:", lat, lon);
              const point = { latitude: lat, longitude: lon };
              chosenRoute.current.push(point);
              setAddPoint(false); 
              onFetchRoute(point)
              return; 
            }

            console.log("Click ignored (no mode active).");
          }}
        />
      )}

      <View style={styles.buttonContainer}>
        {!startCoord && (
          <Button
            title="Select start point"
            onPress={() => setStartSelected(true)}
          />
        )}

        {startCoord && (
          <Button
            title="Add point"
            onPress={() => setAddPoint(true)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "50%",
    width: "100%",
    marginVertical: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
  },
});