import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";
import type { RootStackParamList } from "./types";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { CurrentTaskScreen } from "../screens/CurrentTaskScreen";
import { VisitScreen } from "../screens/VisitScreen";
import { ActivityIndicator, StyleSheet, View } from "react-native";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.bgPanel,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {status === "authenticated" ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Field day" }} />
            <Stack.Screen
              name="CurrentTask"
              component={CurrentTaskScreen}
              options={{ title: "Current task" }}
            />
            <Stack.Screen name="Visit" component={VisitScreen} options={{ title: "Visit" }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
