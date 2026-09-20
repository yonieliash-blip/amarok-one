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
import { BrandWordmark, Button } from "../components/ui";
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
            : "ההתחברות נכשלה",
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
          <BrandWordmark style={styles.wordmark} />
        </View>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>דוא״ל</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="yourname@company.com"
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>סיסמה</Text>
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
            <Text style={styles.label}>קוד חברה (לא חובה)</Text>
            <TextInput
              autoCapitalize="none"
              value={organizationSlug}
              onChangeText={setOrganizationSlug}
              style={styles.input}
              placeholder="קוד-חברה"
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <Button label="כניסה מאובטחת" onPress={() => void handleLogin()} loading={loading} />
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
  brandBlock: { alignItems: "center", marginBottom: spacing.xl },
  wordmark: { width: "76%", height: 122 },
  formCard: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
  },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontFamily: "Alef-Bold", fontSize: 16, textAlign: "right", writingDirection: "rtl" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: "Alef",
    fontSize: 16,
    textAlign: "right",
  },
  error: {
    color: colors.error,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: spacing.md,
    borderRadius: 12,
  },
});
