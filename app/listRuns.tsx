import React, {useState, useEffect, useRef} from 'react';
import { View, StyleSheet, Text, Button, Pressable, FlatList } from 'react-native'
import  supabase  from '../config/supabaseClient'
import { useLocalSearchParams, useRouter } from "expo-router";

function listRuns(){
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [runs, setRuns] = useState<any[]>([]);
    

    const fetchRuns = async () => {
        const userId = id;
        console.log("user id in runs is: ", userId)

        if(!userId){
            console.log("No user id passed in params");
            return;
        }

        const {data, error} = await supabase
            .from('runs')
            .select(`
                id,
                avg_pace_km,
                calories_kcal
            `)
            .eq('user_id', id)

        if(error){
            console.log("Fetch run error: ", error.message, error);
            return;
        }

        if(data){
            setRuns(data);
            console.log("here is the data: ", data);
            if (!data.length) return;
        }
    };

    useEffect(()=>{
        fetchRuns();
    },[id]);

     return(
        <View style={styles.container}>
        <View>
        <FlatList
        data={runs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({item}) => (
        <Button
        title={item.id}
        onPress={() => {
          router.replace({
          pathname: "/about",
          params: {
            runId: String(item.id),
            id: String(id ?? ""),
          },
          });
        }}
        />
        )}>
        </FlatList>
        </View>
        <Button
          title="Cancel"
          onPress={() => {
            router.replace({
              pathname: "/",
              params: {
                id: String(id ?? ""),
              },
            });
          }}
        />
        </View>
      )

}
export default listRuns

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