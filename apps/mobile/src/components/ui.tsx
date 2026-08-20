import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextProps,
  Image,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { colors, radius, spacing } from "../theme";
import { brand } from "../config/brand";

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.primaryOn : colors.text} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" ? styles.labelPrimary : styles.labelSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ScreenTitle(props: TextProps) {
  return <Text {...props} style={[styles.title, props.style]} />;
}

export function ScreenSubtitle(props: TextProps) {
  return <Text {...props} style={[styles.subtitle, props.style]} />;
}

export function Eyebrow(props: TextProps) {
  return <Text {...props} style={[styles.eyebrow, props.style]} />;
}

export function BrandMark({ style }: { style?: StyleProp<ImageStyle> }) {
  return <Image source={brand.logo} style={[styles.brandMark, style]} resizeMode="contain" />;
}

export function Card({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return <View style={[styles.card, accent && styles.cardAccent]}>{children}</View>;
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "success" && styles.pillSuccess,
        tone === "warning" && styles.pillWarning,
        tone === "danger" && styles.pillDanger,
      ]}
    >
      <View
        style={[
          styles.pillDot,
          tone === "success" && styles.pillDotSuccess,
          tone === "warning" && styles.pillDotWarning,
          tone === "danger" && styles.pillDotDanger,
        ]}
      />
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.error,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  labelPrimary: {
    color: colors.primaryOn,
  },
  labelSecondary: {
    color: colors.text,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardAccent: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  brandMark: {
    width: 82,
    height: 82,
    borderRadius: radius.lg,
  },
  pill: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSuccess: { backgroundColor: colors.successSoft, borderColor: colors.success },
  pillWarning: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  pillDanger: { backgroundColor: colors.errorSoft, borderColor: colors.error },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textSubtle },
  pillDotSuccess: { backgroundColor: colors.success },
  pillDotWarning: { backgroundColor: colors.warning },
  pillDotDanger: { backgroundColor: colors.error },
  pillLabel: { color: colors.text, fontSize: 12, fontWeight: "700" },
});
