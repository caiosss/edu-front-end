import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { colors, radius, spacing, touch, type ColorToken } from "../../theme";
import { AppText } from "./app-text";

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: ColorToken;
  iconBackground?: ColorToken;
  /** Conteudo a direita (selo, horario, botao). Sem ele, linhas tocaveis mostram uma seta. */
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Linha de lista com no minimo 64dp de altura, toda a area tocavel quando houver `onPress`. */
export function ListRow({
  title,
  subtitle,
  icon: Icon,
  iconColor = "primary",
  iconBackground = "primarySoft",
  right,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconBadge, { backgroundColor: colors[iconBackground] }]}>
          <Icon size={touch.icon} color={colors[iconColor]} />
        </View>
      ) : null}
      <View style={styles.textBlock}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={touch.icon} color={colors.textSecondary} /> : null)}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(", ")}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
});
