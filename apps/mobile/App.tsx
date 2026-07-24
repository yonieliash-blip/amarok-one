import type { JSX } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { createHealthStatus } from "@amarok-one/utils";

const health = createHealthStatus("mobile");

export default function App(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AMAROK ONE Mobile</Text>
      <Text style={styles.subtitle}>Field service management on the go</Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{health.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.meta}>Service: {health.service}</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d4ed8",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#dbeafe",
    marginBottom: 24,
    textAlign: "center",
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  statusText: {
    color: "#166534",
    fontWeight: "600",
    fontSize: 12,
  },
  meta: {
    color: "#bfdbfe",
    fontSize: 14,
  },
});
