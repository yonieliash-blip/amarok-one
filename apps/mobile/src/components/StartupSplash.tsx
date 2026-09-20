import { useEffect, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { brand } from "../config/brand";
import { colors } from "../theme";

/** Brief branded transition shown after the native launch screen. */
export function StartupSplash() {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(32));
  const [scale] = useState(() => new Animated.Value(0.94));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <View style={styles.page}>
      <StatusBar style="dark" backgroundColor={colors.primary} />
      <Animated.View style={[styles.logoFrame, { opacity, transform: [{ translateY }, { scale }] }]}>
        <Image source={brand.wordmark} resizeMode="contain" style={styles.logo} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  logoFrame: { width: "78%", maxWidth: 360, backgroundColor: "#000000" },
  logo: { width: "100%", height: 104 },
});
