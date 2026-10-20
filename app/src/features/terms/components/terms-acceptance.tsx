import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, radius, spacing } from "../../../theme";

type TermsAcceptanceProps = {
  checked: boolean;
  onToggle: () => void;
  onOpenTerms: () => void;
  disabled?: boolean;
};

/**
 * "Li e aceito os Termos de Uso e a Politica de Privacidade", desmarcado por padrao: aceite
 * precisa ser um gesto da pessoa (LGPD art. 8), nunca uma caixa ja marcada.
 */
export function TermsAcceptance({ checked, onToggle, onOpenTerms, disabled }: TermsAcceptanceProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel="Li e aceito os Termos de Uso e a Política de Privacidade"
        hitSlop={8}
        style={[styles.box, checked ? styles.boxChecked : null]}
      >
        {checked ? <Check size={18} color={colors.onPrimary} strokeWidth={3} /> : null}
      </Pressable>
      <Text style={styles.text} onPress={disabled ? undefined : onToggle}>
        Li e aceito os{" "}
        <Text style={styles.link} onPress={onOpenTerms} accessibilityRole="link">
          Termos de Uso e a Política de Privacidade
        </Text>
        , incluindo o uso dos meus dados de saúde para o funcionamento do aplicativo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  box: {
    width: 28,
    height: 28,
    marginTop: 2,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
