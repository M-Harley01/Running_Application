import { AppleMaps, GoogleMaps } from "expo-maps";
import { Platform, View, StyleSheet, TextInput, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiCall } from "../Hooks/route";
import { useRef, useState } from "react";
import supabase from '../config/supabaseClient';
import { useLocation } from "../Hooks/location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haversine } from "../Hooks/haversine"

type LatLng = { latitude: number; longitude: number };

export default function Map() {
  const router = useRouter();
  const chosenRoute = useRef<LatLng[]>([]);
  const { location } = useLocation();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const currentLon = location?.coords.longitude ?? -2.8583756;
  const currentLat = location?.coords.latitude ?? 56.4697445;

  const cameraPosition = {
    coordinates: { latitude: currentLat, longitude: currentLon },
    zoom: 15,
  };

  const [routeName, onChangeText] = useState('');
  const [startSelected, setStartSelected] = useState(false);
  const [startCoord, setStartCoord] = useState(false);
  const [addPoint, setAddPoint] = useState(false);

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);

  const myPolyline = [
    {
      id: "route-1",
      width: 6,
      color: "#e20000",
      geodesic: true,
      coordinates: routeCoords,
    },
  ];

  const calculateRouteDistance = (coords: LatLng[]) => {
  if (coords.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < coords.length; i++) {
      total += haversine(
        coords[i - 1].latitude,
        coords[i - 1].longitude,
        coords[i].latitude,
        coords[i].longitude
      );
    }

    return total;
  };

  const routeDistanceKm = calculateRouteDistance(routeCoords);

  const getInstruction = () => {
    if (startSelected) return "Tap on the map to select a start point";
    if (addPoint) return "Tap on the map to add a route point";
    return "Select an option below to begin creating your route";
  };

  const onFetchRoute = async (latLon: LatLng) => {
    if (!chosenRoute.current[0]) return;

    const startOfSegment = chosenRoute.current[chosenRoute.current.length - 2];
    const fetchedCoords = await apiCall(startOfSegment, latLon);

    const converted = fetchedCoords.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));

    setRouteCoords((prev) => {
      if (prev.length === 0) return converted;
      return [...prev, ...converted.slice(1)];
    });
  };

  const rebuildRouteFromChosenPoints = async (points: LatLng[]) => {
    if (points.length < 2) {
      setRouteCoords([]);
      return;
    }

    const rebuiltCoords: LatLng[] = [];

    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];

      const fetchedCoords = await apiCall(start, end);

      const converted = fetchedCoords.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      }));

      if (i === 1) rebuiltCoords.push(...converted);
      else rebuiltCoords.push(...converted.slice(1));
    }

    setRouteCoords(rebuiltCoords);
  };

  const removeLastPoint = async () => {
    if (chosenRoute.current.length === 0) return;

    chosenRoute.current = chosenRoute.current.slice(0, -1);

    if (chosenRoute.current.length <= 1) {
      setRouteCoords([]);
      if (chosenRoute.current.length === 0) {
        setStartCoord(false);
        setStartSelected(false);
        setAddPoint(false);
      }
      return;
    }

    await rebuildRouteFromChosenPoints(chosenRoute.current);
  };

  const createRoute = async () => {
    if (!id || routeCoords.length < 2) return;

    await supabase.from("routes").insert({
      user_id: id,
      coordinates: routeCoords,
      name: routeName,
    });
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Routes</Text>
      </View>

      <View style={styles.textContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter route name"
          value={routeName}
          onChangeText={onChangeText}
        />
      </View>

      <View style={styles.distanceContainer}>
        <Text style={styles.distanceText}>
          Route distance: {routeDistanceKm.toFixed(2)} km
        </Text>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>{getInstruction()}</Text>
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS === "ios" ? (
          <AppleMaps.View
            style={styles.map}
            cameraPosition={cameraPosition}
            polylines={myPolyline}
            onMapClick={(e) => handleMapClick(e)}
            properties={{
              isMyLocationEnabled: true,
              pointsOfInterest: {
                including: [],
              },
            }}
          />
        ) : (
          <GoogleMaps.View
            style={styles.map}
            cameraPosition={cameraPosition}
            polylines={myPolyline}
            onMapClick={(e) => handleMapClick(e)}
            properties={{
              isMyLocationEnabled: true,
              mapStyleOptions: {
                json: JSON.stringify([
                  {
                    featureType: "poi",
                    stylers: [{ visibility: "off" }],
                  },
                  {
                    featureType: "transit",
                    stylers: [{ visibility: "off" }],
                  },
                ]),
              },
            }}
          />
        )}
      </View>

      <View style={[styles.controls, { marginBottom: insets.bottom + 12 }]}>

        {!startCoord && (
          <View style={styles.controlSlot}>
            <Pressable style={styles.controlButton} onPress={() => setStartSelected(true)}>
              <Text style={styles.controlButtonText}>Select start</Text>
            </Pressable>
          </View>
        )}

        {startCoord && (
          <View style={styles.controlSlot}>
            <Pressable style={styles.controlButton} onPress={() => setAddPoint(true)}>
              <Text style={styles.controlButtonText}>Add point</Text>
            </Pressable>
          </View>
        )}

        {startCoord && (
          <View style={styles.controlSlot}>
            <Pressable style={styles.controlButton} onPress={removeLastPoint}>
              <Text style={styles.controlButtonText}>Remove point</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.controlSlot}>
          <Pressable
            style={styles.controlButton}
            onPress={() =>
              router.replace({
                pathname: "/",
                params: { id: String(id ?? "") },
              })
            }
          >
            <Text style={styles.controlButtonText}>Cancel</Text>
          </Pressable>
        </View>

        {routeCoords.length > 1 && routeName.trim() !== "" && (
          <View style={styles.controlSlot}>
            <Pressable style={styles.controlButton} onPress={createRoute}>
              <Text style={styles.controlButtonText}>Create route</Text>
            </Pressable>
          </View>
        )}

      </View>

    </View>
  );

  function handleMapClick(e: any) {
    const lat = e.coordinates.latitude;
    const lon = e.coordinates.longitude;
    if (!lat || !lon) return;

    if (startSelected) {
      chosenRoute.current.push({ latitude: lat, longitude: lon });
      setStartCoord(true);
      setStartSelected(false);
      return;
    }

    if (addPoint) {
      const point = { latitude: lat, longitude: lon };
      chosenRoute.current.push(point);
      setAddPoint(false);
      onFetchRoute(point);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f6f6f8",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
  },

  header: {
    width: "92%",
    marginTop: 10,
    backgroundColor: "#a9c4f5",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },

  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "500",
  },

  textContainer: {
    width: "92%",
    marginTop: 16,
  },

  input: {
    height: 56,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9d9d9",
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 18,
  },

  mapContainer: {
    width: "92%",
    height: 340,
    marginTop: 12,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d9d9d9",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  controls: {
    width: "92%",
    marginTop: 12,
    backgroundColor: "#a9c4f5",
    borderRadius: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    rowGap: 12,
  },

  controlSlot: {
    width: "48%",
  },

  controlButton: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },

  controlButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111",
  },
  distanceContainer: {
  width: "92%",
  marginTop: 10,
  paddingHorizontal: 4,
},

distanceText: {
  fontSize: 16,
  fontWeight: "500",
  color: "#333",
},
instructionContainer: {
  width: "92%",
  marginTop: 10,
  backgroundColor: "#fff",
  borderRadius: 14,
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: "#e0e0e0",
},

instructionText: {
  fontSize: 14,
  color: "#333",
  textAlign: "center",
},
});