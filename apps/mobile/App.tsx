import { useCallback, useEffect, useState, type JSX } from "react";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { ImageBackground } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import "./src/location/background-shift-location";
import AlefRegular from "./assets/fonts/Alef-Regular.ttf";
import AlefBold from "./assets/fonts/Alef-Bold.ttf";
import { StartupSplash } from "./src/components/StartupSplash";
import { backgroundPool } from "./src/theme/backgroundPool";

export default function App(): JSX.Element {
  const [fontsLoaded] = useFonts({
    Alef: AlefRegular,
    "Alef-Bold": AlefBold,
  });
  const [showIntro, setShowIntro] = useState(true);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2100);
    return () => clearTimeout(timer);
  }, []);

  const selectNextBackground = useCallback(() => {
    setBackgroundIndex((current) => {
      if (backgroundPool.length < 2) return current;
      const random = Math.floor(Math.random() * (backgroundPool.length - 1));
      return random >= current ? random + 1 : random;
    });
  }, []);

  if (!fontsLoaded) return <></>;
  if (showIntro) return <StartupSplash />;

  return (
    <SafeAreaProvider>
      <ImageBackground source={backgroundPool[backgroundIndex]} style={{ flex: 1 }} resizeMode="cover">
        <AuthProvider>
          <RootNavigator onScreenChange={selectNextBackground} />
          <StatusBar style="light" />
        </AuthProvider>
      </ImageBackground>
    </SafeAreaProvider>
  );
}
