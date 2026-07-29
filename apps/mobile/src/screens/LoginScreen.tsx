import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, ScreenSubtitle, ScreenTitle } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { isApiRequestError } from "../api/client";
import { colors, spacing } from "../theme";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password, organizationSlug.trim() || undefined);
    } catch (err) {
      setError(
        isApiRequestError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign in failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenTitle>AMAROK ONE</ScreenTitle>
        <ScreenSubtitle>Technician field app — sign in to manage today's visits.</ScreenSubtitle>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Organization slug (optional)</Text>
          <TextInput
            autoCapitalize="none"
            value={organizationSlug}
            onChangeText={setOrganizationSlug}
            style={styles.input}
            placeholder="acme-forklifts"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Button label="Sign in" onPress={() => void handleLogin()} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  error: {
    color: colors.error,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: spacing.md,
    borderRadius: 12,
  },
});
