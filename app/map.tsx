import { AppleMaps, GoogleMaps } from "expo-maps";
import { Platform, View, StyleSheet, Button, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { apiCall } from "../Hooks/route";
import { useRef, useState } from "react";
import  supabase  from '../config/supabaseClient'

type LatLng = { latitude: number; longitude: number };

export default function Map() {
  const chosenRoute = useRef<LatLng[]>([]);

  const { lat, lon, id } = useLocalSearchParams();
  console.log("lat lon from index: ", lat, lon, ". UserId from index: ", id);

  const [routeName, onChangeText] = useState(' ');
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

    setRouteCoords((prev) => {
    if (prev.length === 0) return converted;

    const segmentToAdd = converted.slice(1);
    return [...prev, ...segmentToAdd];
    });
  };

  const createRoute = async () => {
    const userId = id;

    if(!userId){
      console.log("No user id passed in params");
      return;
    }

    if (routeCoords.length < 2){
      console.log("need at least 2 points to create a route");
      return;
    }

    const { data, error } = await supabase
      .from("routes")
      .insert({
        user_id: userId,
        coordinates: routeCoords,
        name: routeName
      })
      .select()
      .single()

      if(error){
        console.log("Insert route error: ", error.message, error);
        return;
      }

      console.log("Route created", data);
  }

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" && <AppleMaps.View style={styles.map} />}

      {Platform.OS === "android" && (
        <GoogleMaps.View
          style={styles.map}
          cameraPosition={cameraPosition}
          polylines={myPolyline}
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
        

      </View>

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

        {routeCoords.length > 1 && routeName !== ' ' && (
          <Button title="Create route" onPress={createRoute}/>
        )}

      <View style={styles.textContainer}>
        <TextInput style={styles.input} onChangeText={onChangeText} value={routeName}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    marginVertical: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "50%",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
  },
  textContainer: {
    position: "absolute",
    marginTop: 600
  },
  input:{
    height: 40,
    margin: 12,
    borderWidth: 2,
    padding: 10
  }
});