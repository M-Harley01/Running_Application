import { StyleSheet, Text, View, Dimensions, Button, ScrollView } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LineChart } from "react-native-chart-kit";
import supabase from '../config/supabaseClient'

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundGradientFrom: "transparent",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "transparent",
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(100, 180, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  propsForBackgroundLines: {
    stroke: "#dbe7f3",
    strokeDasharray: "5,5",
  },
  propsForLabels: {
    fill: "#8ec5eb",
  },
};

function About() {
  const router = useRouter();
  const { runId, id  } = useLocalSearchParams();
  const [paceChartData, setPaceChartData] = useState<any>(null);
  const [elevationChartData, setElevationChartData] = useState<any>(null);

  console.log("passed in run is: ", runId);

  const fetchSplits = async () => {
    if (!runId) {
      console.log("no run id passed in the params");
      return;
    }

    const { data, error } = await supabase
      .from('run_splits')
      .select(`
        split_number,
        avg_pace_per_km,
        elevation_at_split_m
      `)
      .eq('run_id', runId)
      .order('split_number', { ascending: true });

    if (error) {
      console.log("error with fetching splits", error.message, error);
      return;
    }

    if (data) {
      console.log("here is the data ", data);

      const labels = data.map((item) => `${item.split_number} km`);
      const paceValues = data.map((item) => item.avg_pace_per_km);
      const elevationValues = data.map((item => item.elevation_at_split_m ?? 0));

      const paceData = {
        labels,
        datasets: [
          {
            data: paceValues,
            color: (opacity = 1) => `rgba(135, 206, 235, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ["Pace"]
      };

      const elevationData = {
        labels,
        datasets: [
          {
          data: elevationValues,
          color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
          strokeWidth: 2,
          }
        ],
        legend: ["Elevation"]
      };

      setPaceChartData(paceData);
      setElevationChartData(elevationData)
    }
  };

  useEffect(() => {
    fetchSplits();
  }, [runId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.container}>
      <Text style={styles.title}>line chart</Text>

      {paceChartData && (
        <View style={styles.card}>
          <LineChart
            data={paceChartData}
            width={screenWidth - 32}
            height={180}
            verticalLabelRotation={30}
            chartConfig={chartConfig}
            bezier
            xLabelsOffset={-8}
            style={styles.chart}
          />
        </View>
      )}

      {elevationChartData && (
        <View style={styles.card}>
          <LineChart
            data={elevationChartData}
            width={screenWidth - 32}
            height={180}
            verticalLabelRotation={30}
            chartConfig={chartConfig}
            bezier
             xLabelsOffset={-8}
            style={styles.chart}
          />
        </View>
      )}

      <Button
        title="Back Home"
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
    </ScrollView>
  );
}

export default About;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    backgroundColor: '#d9d9d9',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
  },
  card: {
  backgroundColor: '#f7f7f9',
  borderRadius: 20,
  marginHorizontal: 16,
  marginTop: 20,
  marginBottom: 20,
  paddingVertical: 10,
},
  chart: {
    borderRadius: 20,
  }
});