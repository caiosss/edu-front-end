import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { colors, spacing, touch } from "../../theme";
import { AppText } from "./app-text";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Mostra "Voltar" escrito, nao so a seta: icone sozinho e pouco claro para idosos. */
  onBack?: () => void;
  backLabel?: string;
};

export function ScreenHeader({ title, subtitle, onBack, backLabel = "Voltar" }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backPressed : null]}
        >
          <ChevronLeft size={touch.icon + 4} color={colors.primary} />
          <AppText variant="bodyStrong" color="primary">
            {backLabel}
          </AppText>
        </Pressable>
      ) : null}
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" color="textSecondary">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingRight: spacing.md,
    marginLeft: -spacing.sm,
    borderRadius: 12,
  },
  backPressed: {
    backgroundColor: colors.primarySoft,
  },
});
