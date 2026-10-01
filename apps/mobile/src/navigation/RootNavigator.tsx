import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { colors, typography } from "../theme";
import { BrandWordmark } from "../components/ui";
import type { RootStackParamList } from "./types";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { CurrentTaskScreen } from "../screens/CurrentTaskScreen";
import { VisitScreen } from "../screens/VisitScreen";
import {
  ManagerCustomersScreen,
  ManagerEquipmentScreen,
  ManagerHomeScreen,
  ManagerInventoryScreen,
  ManagerNewServiceCallScreen,
  ManagerPartsScreen,
  ManagerServiceCallScreen,
  ManagerServiceCallsScreen,
  ManagerTechniciansScreen,
} from "../screens/ManagerScreens";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
  const { status, isManager } = useAuth();

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
          header: ({ options, back, navigation }) => (
            <View style={styles.internalHeader}>
              <View style={styles.internalHeaderTop}>
                {back ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="חזרה"
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                  >
                    <Text style={styles.backButtonText}>‹</Text>
                  </Pressable>
                ) : null}
                <BrandWordmark style={styles.headerWordmark} />
              </View>
              <Text style={styles.internalHeaderTitle}>{options.title}</Text>
            </View>
          ),
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        {status === "authenticated" ? (
          isManager ? (
            <>
              <Stack.Screen
                name="ManagerHome"
                component={ManagerHomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ManagerServiceCalls"
                component={ManagerServiceCallsScreen}
                options={{ title: "קריאות שירות" }}
              />
              <Stack.Screen
                name="ManagerNewServiceCall"
                component={ManagerNewServiceCallScreen}
                options={{ title: "פתח קריאת שירות" }}
              />
              <Stack.Screen
                name="ManagerServiceCall"
                component={ManagerServiceCallScreen}
                options={({ route }) => ({ title: route.params.title })}
              />
              <Stack.Screen
                name="ManagerCustomers"
                component={ManagerCustomersScreen}
                options={{ title: "לקוחות" }}
              />
              <Stack.Screen
                name="ManagerEquipment"
                component={ManagerEquipmentScreen}
                options={{ title: "ציוד" }}
              />
              <Stack.Screen
                name="ManagerParts"
                component={ManagerPartsScreen}
                options={{ title: "חלפים" }}
              />
              <Stack.Screen
                name="ManagerInventory"
                component={ManagerInventoryScreen}
                options={({ route }) => ({
                  title: route.params.kind === "service_van" ? "חלפים בניידות" : "מחסן חלפים",
                })}
              />
              <Stack.Screen
                name="ManagerTechnicians"
                component={ManagerTechniciansScreen}
                options={{ title: "עובדים וניידות" }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: "יום עבודה" }} />
              <Stack.Screen
                name="CurrentTask"
                component={CurrentTaskScreen}
                options={{ title: "משימה נוכחית" }}
              />
              <Stack.Screen name="Visit" component={VisitScreen} options={{ title: "ביקור" }} />
            </>
          )
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
    backgroundColor: "transparent",
  },
  internalHeader: {
    height: 188,
    paddingTop: 72,
    paddingHorizontal: 18,
    justifyContent: "center",
    gap: 6,
  },
  internalHeaderTop: {
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWordmark: {
    width: 240,
    height: 58,
  },
  internalHeaderTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 23,
    textAlign: "center",
    writingDirection: "rtl",
  },
  backButton: {
    position: "absolute",
    left: 0,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 10, 12, 0.82)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 40,
    fontFamily: typography.regular,
    lineHeight: 42,
  },
});
