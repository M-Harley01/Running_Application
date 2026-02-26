import React, {useState, useEffect, useRef} from 'react';
import { View, StyleSheet, Text, Button, Pressable } from 'react-native'

function Stopwatch(){

    const [isRunning, setIsRunning ] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef(0);

    useEffect(() => {

        if(isRunning){
            intervalIdRef.current = setInterval(() => {
                setElapsedTime(Date.now() - startTimeRef.current);
            }, 10);
        }

        return () => {
            if (intervalIdRef.current !== null) {
            clearInterval(intervalIdRef.current);
        } 
        }

    }, [isRunning]);

    function start(){
        setIsRunning(true);
        startTimeRef.current = Date.now() - elapsedTime;
    }

    function stop(){
        setIsRunning(false);
    }

    function reset(){
        setElapsedTime(0);
        setIsRunning(false);
    }

    function formatTime(){

        let hours = Math.floor(elapsedTime / (1000 * 60 * 60));
        let minutes = Math.floor(elapsedTime / (1000* 60) % 60);
        let seconds = Math.floor(elapsedTime / (1000) % 60);
        let milliseconds = Math.floor((elapsedTime % 1000) / 10);

        const hh = String(hours).padStart(2, "0");
        const mm = String(minutes).padStart(2, "0");
        const ss = String(seconds).padStart(2, "0");
        const ms = String(milliseconds).padStart(2, "0");

        return `${hh}:${mm}:${ss}:${ms}`
    }
    
    return(    
        <View style={styles.stopwatch}>
            <View style={styles.display}>
                <Text>{formatTime()}</Text>
            </View>
            <View style={styles.controls}>
                <Pressable style={styles.startButton} onPress={start}><Text>Start</Text></Pressable>
                <Pressable style={styles.stopButton} onPress={stop}><Text>Stop</Text></Pressable>
                <Pressable style={styles.resetButton} onPress={reset}><Text>Reset</Text></Pressable>

            </View>
        </View>
    )
}
export default Stopwatch

const styles = StyleSheet.create({
  stopwatch:{

  },
  display:{

  },
  controls:{

  },
  startButton:{

  },
  stopButton:{

  },
  resetButton:{

  }
})