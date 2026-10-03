import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ExtratoLinha } from "../../gamification/types";
import { capitalize, formatDateTimeBr } from "../../gamification/utils/format";

type RewardRowProps = {
  linha: ExtratoLinha;
  onPress: (linha: ExtratoLinha) => void;
};

/** Uma linha do extrato. Tocar abre "por que recebi isto" (SPEC-007 §5.3); area minima de 44pt. */
export function RewardRow({ linha, onPress }: RewardRowProps) {
  const quando = formatDateTimeBr(linha.quando);
  const motivo = linha.motivo ? capitalize(linha.motivo) : "Recompensa registrada";

  return (
    <Pressable
      onPress={() => onPress(linha)}
      accessibilityRole="button"
      accessibilityLabel={`Mais ${linha.xp} XP, ${motivo}${quando ? `, ${quando}` : ""}. Toque para ver a explicação.`}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>+{linha.xp}</Text>
        <Text style={styles.xpUnit}>XP</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.motivo}>{motivo}</Text>
        {quando ? <Text style={styles.quando}>{quando}</Text> : null}
      </View>
      <ChevronRight size={18} color="#4F6982" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8F6FF",
  },
  rowPressed: {
    backgroundColor: "#EEE9FF",
  },
  xpBadge: {
    minWidth: 52,
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 4,
    backgroundColor: "#FFF3BF",
  },
  xpText: {
    color: "#7A4100",
    fontSize: 16,
    fontWeight: "900",
  },
  xpUnit: {
    color: "#7A4100",
    fontSize: 10,
    fontWeight: "800",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  motivo: {
    color: "#23405C",
    fontSize: 14,
    fontWeight: "600",
  },
  quando: {
    color: "#4F6982",
    fontSize: 12,
  },
});
