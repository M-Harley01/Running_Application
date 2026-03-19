import { StyleSheet, Text, View, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Link, useLocalSearchParams } from 'expo-router'
import { LineChart } from "react-native-chart-kit";
import supabase from '../config/supabaseClient'

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundGradientFrom: "#1E2923",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#08130D",
  backgroundGradientToOpacity: 0.5,
  color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false
};

function About() {
  const { runId } = useLocalSearchParams();
  const [chartData, setChartData] = useState<any>(null);

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
        avg_pace_per_km
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

      const paceData = {
        labels,
        datasets: [
          {
            data: paceValues,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ["Pace"]
      };

      setChartData(paceData);
    }
  };

  useEffect(() => {
    fetchSplits();
  }, [runId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>line chart</Text>

      {chartData && (
        <LineChart
          data={chartData}
          width={screenWidth}
          height={256}
          verticalLabelRotation={30}
          chartConfig={chartConfig}
          bezier
        />
      )}

      <Link href={"/"}>Back Home</Link>
    </View>
  );
}

export default About;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
  },
  card: {
    backgroundColor: '#eee',
    padding: 20,
    borderRadius: 5,
    boxShadow: '4px 4px rgba(0,0,0,0.1)'
  }
});