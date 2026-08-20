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
import { BrandMark, Button, Eyebrow, ScreenSubtitle, ScreenTitle } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import { isApiRequestError } from "../api/client";
import { colors, spacing } from "../theme";
import { brand } from "../config/brand";

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
        <View style={styles.brandBlock}>
          <BrandMark />
          <View style={styles.brandCopy}>
            <Eyebrow>{brand.fieldAppName}</Eyebrow>
            <ScreenTitle>{brand.productName}</ScreenTitle>
            <ScreenSubtitle>Work days, service calls and field visits in one place.</ScreenSubtitle>
          </View>
        </View>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="you@company.com"
              placeholderTextColor={colors.textSubtle}
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
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Company code (optional)</Text>
            <TextInput
              autoCapitalize="none"
              value={organizationSlug}
              onChangeText={setOrganizationSlug}
              style={styles.input}
              placeholder="company-code"
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <Button label="Sign in securely" onPress={() => void handleLogin()} loading={loading} />
        </View>
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
    gap: spacing.lg,
  },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  brandCopy: { flex: 1 },
  formCard: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
  },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 52,
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
