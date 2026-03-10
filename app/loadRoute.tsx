import React, {useState, useEffect, useRef} from 'react';
import { View, StyleSheet, Text, Button, Pressable, FlatList } from 'react-native'
import  supabase  from '../config/supabaseClient'
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToCartesian } from '../Hooks/cartesian'

function loadRoute(){
  
  const router = useRouter()

  const initialCartesian: { y: number, x: number }[] = [];

  const [routes, setRoutes] = useState<any[]>([]);
  const { id, loginLat, loginLon } = useLocalSearchParams();

  const fetchRoutes = async () => {
    const userId = id;

    if(!userId){
      console.log("No user id passed in params");
      return;
    }

    const { data, error } = await supabase
        .from('routes')
        .select(`
            id,
            coordinates,
            name
            `)
        .eq('user_id', id)

    if(error){
        console.log("Fetch route error: ", error.message, error);
        return;
    }

     if(data){
      setRoutes(data)
      if (!data.length) return;
    }
  };

  useEffect(()=>{
    fetchRoutes();
  },[id]);
    
  return(
    <View style={styles.container}>
    <View>
    <FlatList
    data={routes}
    keyExtractor={(item) => String(item.id)}
    renderItem={({item}) => (
    <Button
    title={item.name}
    onPress={() => {

      const coords = item.coordinates;
      const tempCartesian: { x: number; y: number }[] = [];

      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];

        const segment = routeToCartesian(
          p1.latitude,
          p1.longitude,
          p2.latitude,
          p2.longitude
        );

        tempCartesian.push(...segment);
      }

      router.push({
      pathname: "/",
      params: {
      fetchedCoord: JSON.stringify(item.coordinates),
      name: item.name,
      xyCoord: JSON.stringify(tempCartesian),
      loginLat: String(loginLat ?? ""),
      loginLon: String(loginLon ?? ""),
      },
      });
    }}
    />
    )}>
    </FlatList>
    </View>
    </View>
  )
}
export default loadRoute

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
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
  },
});