import { StyleSheet, View } from "react-native";
import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  Info,
  type LucideIcon,
} from "lucide-react-native";
import { colors, radius, spacing, touch, type ColorToken } from "../../theme";
import { AppText } from "./app-text";
import { BigButton } from "./big-button";

export type StatusTone = "info" | "success" | "warning" | "danger";

const TONES: Record<
  StatusTone,
  { icon: LucideIcon; foreground: ColorToken; background: ColorToken }
> = {
  info: { icon: Info, foreground: "primary", background: "primarySoft" },
  success: { icon: CircleCheck, foreground: "success", background: "successSoft" },
  warning: { icon: AlertTriangle, foreground: "warning", background: "warningSoft" },
  danger: { icon: CircleAlert, foreground: "danger", background: "dangerSoft" },
};

type StatusBannerProps = {
  tone?: StatusTone;
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

/** Aviso com icone, texto e acao opcional. O leitor de tela anuncia quando ele aparece. */
export function StatusBanner({ tone = "info", title, message, action }: StatusBannerProps) {
  const { icon: Icon, foreground, background } = TONES[tone];

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors[background], borderColor: colors[foreground] },
      ]}
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "polite"}
    >
      <View style={styles.row}>
        <Icon size={touch.icon} color={colors[foreground]} />
        <View style={styles.textBlock}>
          {title ? (
            <AppText variant="bodyStrong" color={foreground}>
              {title}
            </AppText>
          ) : null}
          <AppText variant="body" color={title ? "text" : foreground}>
            {message}
          </AppText>
        </View>
      </View>
      {action ? (
        <BigButton label={action.label} onPress={action.onPress} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
});
