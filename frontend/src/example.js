import React from 'react';
import { Text, View } from 'react-native';

function HelloWorldApp (){
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}>
      <div id='mainDiv' name='mainName'>Hello, Rand!</div>
    </View>
  )
}
export default HelloWorldApp;

// import React, { useState, useEffect } from "react";
// import { AccessibilityInfo, View, Text, StyleSheet } from "react-native";

// const App = () => {
//   const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
//   const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

//   useEffect(() => {
//     const reduceMotionChangedSubscription = AccessibilityInfo.addEventListener(
//       "reduceMotionChanged",
//       reduceMotionEnabled => {
//         setReduceMotionEnabled(reduceMotionEnabled);
//       }
//     );
//     const screenReaderChangedSubscription = AccessibilityInfo.addEventListener(
//       "screenReaderChanged",
//       screenReaderEnabled => {
//         setScreenReaderEnabled(screenReaderEnabled);
//       }
//     );

//     AccessibilityInfo.isReduceMotionEnabled().then(
//       reduceMotionEnabled => {
//         setReduceMotionEnabled(reduceMotionEnabled);
//       }
//     );
//     AccessibilityInfo.isScreenReaderEnabled().then(
//       screenReaderEnabled => {
//         setScreenReaderEnabled(screenReaderEnabled);
//       }
//     );

//     return () => {
//       reduceMotionChangedSubscription.remove();
//       screenReaderChangedSubscription.remove();
//     };
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.status}>
//         The reduce motion is {reduceMotionEnabled ? "enabled" : "disabled"}.
//       </Text>
//       <Text style={styles.status}>
//         The screen reader is {screenReaderEnabled ? "enabled" : "disabled"}.
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center"
//   },
//   status: {
//     margin: 30
//   }
// });

// export default App;