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
import { WorkReportScreen } from "../screens/WorkReportScreen";
import {
  ManagerCustomersScreen,
  ManagerEquipmentScreen,
  ManagerHomeScreen,
  ManagerLocationsScreen,
  ManagerNewServiceCallScreen,
  ManagerServiceCallScreen,
  ManagerServiceCallsScreen,
} from "../screens/ManagerScreens";
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
          headerStyle: { backgroundColor: "transparent" },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: typography.bold, fontSize: 18 },
          headerTitleAlign: "center",
          headerRight: () => <BrandWordmark style={styles.headerWordmark} />,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        {status === "authenticated" ? (
          isManager ? (
            <>
              <Stack.Screen name="ManagerHome" component={ManagerHomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ManagerServiceCalls" component={ManagerServiceCallsScreen} options={{ title: "קריאות שירות" }} />
              <Stack.Screen name="ManagerNewServiceCall" component={ManagerNewServiceCallScreen} options={{ title: "פתיחת קריאה" }} />
              <Stack.Screen name="ManagerServiceCall" component={ManagerServiceCallScreen} options={({ route }) => ({ title: route.params.title })} />
              <Stack.Screen name="ManagerCustomers" component={ManagerCustomersScreen} options={{ title: "לקוחות" }} />
              <Stack.Screen name="ManagerEquipment" component={ManagerEquipmentScreen} options={{ title: "ציוד" }} />
              <Stack.Screen name="ManagerLocations" component={ManagerLocationsScreen} options={{ title: "מיקומי טכנאים" }} />
              <Stack.Screen name="WorkReport" component={WorkReportScreen} options={{ title: "דוח עבודה" }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: "יום עבודה" }} />
              <Stack.Screen name="CurrentTask" component={CurrentTaskScreen} options={{ title: "משימה נוכחית" }} />
              <Stack.Screen name="Visit" component={VisitScreen} options={{ title: "ביקור" }} />
              <Stack.Screen name="WorkReport" component={WorkReportScreen} options={{ title: "דוח עבודה" }} />
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
  headerWordmark: {
    width: 108,
    height: 32,
    backgroundColor: "transparent",
  },
});
