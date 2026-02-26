import React, {useState, useEffect, useRef} from 'react';
import { View, StyleSheet, Text, Button, Pressable } from 'react-native'
import  supabase  from '../config/supabaseClient'
import { useLocalSearchParams } from "expo-router";

function loadRoute(){

  const { id } = useLocalSearchParams();

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

    for(var i = 0; i < data.length; i++){

        const returnedData = data[i].name;
        console.log("heres what the data looks like big dog: ", returnedData);

    }
  }
    
  return(
    <View>
        
        <Text>Hello</Text>
        <View>
            <Button title="Load the routes" onPress={fetchRoutes}></Button>
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
});