import React, { useEffect, useState, useRef } from "react"
import { StyleSheet, Text, View } from 'react-native'

type StopwatchProps = {
  isRunning: boolean;
  resetTrigger?: number; // optional for resetting
};

export function Stopwatch({ isRunning, resetTrigger }: StopwatchProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Handle start/stop
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - elapsedTime;

      intervalIdRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRunning]);

  // Optional reset trigger
  useEffect(() => {
    setElapsedTime(0);
  }, [resetTrigger]);

  function formatTime() {
    let hours = Math.floor(elapsedTime / (1000 * 60 * 60));
    let minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
    let seconds = Math.floor((elapsedTime / 1000) % 60);
    let milliseconds = Math.floor((elapsedTime % 1000) / 10);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
  }

  return (
    <View style={styles.stopwatch}>
      <Text>{formatTime()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({

  stopwatch: {
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
},

});