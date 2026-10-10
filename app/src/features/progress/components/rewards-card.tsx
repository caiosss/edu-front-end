import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import { goldGradient } from "../../gamification/theme";
import type { ExtratoLinha, Nivel } from "../../gamification/types";
import { nivelRatio } from "../../gamification/utils/level";
import { RewardRow } from "./reward-row";

type RewardsCardProps = {
  nivel: Nivel;
  xpTotal: number;
  recompensas: ExtratoLinha[];
  onOpenReward: (linha: ExtratoLinha) => void;
  onSeeStatement: () => void;
};

/**
 * Bloco ludico (SPEC-007 §5.1): por ultimo na leitura, menor e com cor propria, para nao
 * disputar atencao com o progresso clinico.
 */
export function RewardsCard({
  nivel,
  xpTotal,
  recompensas,
  onOpenReward,
  onSeeStatement,
}: RewardsCardProps) {
  const xpDoNivel = nivel.xpNoNivel + nivel.xpParaProximo;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color="#6741D9" />
          <Text style={styles.eyebrow}>Suas recompensas</Text>
        </View>
        <Pressable
          onPress={onSeeStatement}
          accessibilityRole="button"
          accessibilityLabel="Ver extrato completo de recompensas"
          hitSlop={8}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>Ver extrato</Text>
          <ChevronRight size={16} color="#5F3DC4" />
        </Pressable>
      </View>

      <View
        accessible
        accessibilityLabel={`Nível ${nivel.atual}. ${nivel.xpNoNivel} de ${xpDoNivel} XP para o nível ${nivel.atual + 1}. ${xpTotal} XP no total.`}
        style={styles.levelBlock}
      >
        <Text style={styles.levelText}>
          Nível {nivel.atual} · {nivel.xpNoNivel} / {xpDoNivel} XP para o nível {nivel.atual + 1}
        </Text>
        <AnimatedXpBar
          ratio={nivelRatio(nivel)}
          levelKey={nivel.atual}
          colors={goldGradient}
          trackColor="#EFE9FF"
          height={10}
          delay={200}
        />
        <Text style={styles.totalText}>{xpTotal} XP no total</Text>
      </View>

      {recompensas.length === 0 ? (
        <Text style={styles.supportingText}>
          Suas recompensas aparecem aqui depois dos primeiros registros.
        </Text>
      ) : (
        <View style={styles.list}>
          {recompensas.map((linha, index) => (
            <RewardRow key={`${linha.quando}-${linha.regraCodigo}-${index}`} linha={linha} onPress={onOpenReward} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FDFEFF",
    borderWidth: 1,
    borderColor: "#E5DBFF",
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eyebrow: {
    color: "#5F3DC4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  seeAll: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 12,
  },
  seeAllText: {
    color: "#5F3DC4",
    fontSize: 14,
    fontWeight: "700",
  },
  levelBlock: {
    gap: 6,
  },
  levelText: {
    color: "#35506B",
    fontSize: 14,
    fontWeight: "700",
  },
  totalText: {
    color: "#4F6982",
    fontSize: 12,
  },
  list: {
    gap: 8,
  },
  supportingText: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
});
