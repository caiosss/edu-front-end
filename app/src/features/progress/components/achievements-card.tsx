import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AchievementIcon } from "../../gamification/components/achievement-icon";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import { goldGradient } from "../../gamification/theme";
import type { Conquista } from "../../gamification/types";
import { formatDateBr } from "../../gamification/utils/format";
import { achievementProgressRatio, formatAchievementProgress } from "../labels";

type AchievementsCardProps = {
  recentes: Conquista[];
  todas: Conquista[];
  onSeeAll: () => void;
};

/** Bloco de conquistas (SPEC-007 §5.1): as obtidas e as que estao em andamento. */
export function AchievementsCard({ recentes, todas, onSeeAll }: AchievementsCardProps) {
  const emAndamento = useMemo(
    () =>
      todas
        .filter((conquista) => conquista.desbloqueadaEm === null && conquista.progresso)
        .sort(
          (a, b) => achievementProgressRatio(b.progresso) - achievementProgressRatio(a.progresso)
        )
        .slice(0, 2),
    [todas]
  );

  const obtidas = recentes.slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Conquistas</Text>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel="Ver todas as conquistas"
          hitSlop={8}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>Ver todas</Text>
          <ChevronRight size={16} color="#1A5DB5" />
        </Pressable>
      </View>

      {obtidas.length === 0 && emAndamento.length === 0 ? (
        <Text style={styles.supportingText}>
          Suas conquistas aparecem aqui conforme você registra seus cuidados.
        </Text>
      ) : null}

      {obtidas.map((conquista, index) => {
        const quando = formatDateBr(conquista.desbloqueadaEm);

        return (
          <Animated.View
            key={conquista.codigo}
            entering={FadeInDown.delay(index * 70).duration(260)}
            accessible
            accessibilityLabel={`${conquista.titulo}, conquistada${quando ? ` em ${quando}` : ""}.`}
            style={styles.row}
          >
            <LinearGradient colors={goldGradient} style={styles.iconUnlocked}>
              <AchievementIcon
                codigo={conquista.codigo}
                icone={conquista.icone}
                size={18}
                color="#FFFFFF"
              />
            </LinearGradient>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{conquista.titulo}</Text>
              <Text style={styles.rowHint}>{quando ? `Conquistada em ${quando}` : "Conquistada"}</Text>
            </View>
          </Animated.View>
        );
      })}

      {emAndamento.map((conquista, index) => (
        <Animated.View
          key={conquista.codigo}
          entering={FadeInDown.delay((obtidas.length + index) * 70).duration(260)}
          accessible
          accessibilityLabel={`${conquista.titulo}, em andamento: ${
            conquista.progresso ? formatAchievementProgress(conquista.progresso) : ""
          }.`}
          style={styles.row}
        >
          <View style={styles.iconProgress}>
            <AchievementIcon
              codigo={conquista.codigo}
              icone={conquista.icone}
              size={18}
              color="#2C7BE5"
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{conquista.titulo}</Text>
            {conquista.progresso ? (
              <>
                <Text style={styles.rowHint}>{formatAchievementProgress(conquista.progresso)}</Text>
                <AnimatedXpBar
                  ratio={achievementProgressRatio(conquista.progresso)}
                  height={6}
                  delay={200 + index * 80}
                />
              </>
            ) : null}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#12314C",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
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
    color: "#1A5DB5",
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconUnlocked: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconProgress: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: "#12314C",
    fontSize: 15,
    fontWeight: "700",
  },
  rowHint: {
    color: "#35506B",
    fontSize: 13,
  },
  supportingText: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
});
