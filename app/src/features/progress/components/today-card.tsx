import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Clock, Target } from "lucide-react-native";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import type { ResumoHoje } from "../../gamification/types";
import { formatClockTime } from "../../gamification/utils/format";
import { pluralize } from "../labels";

type TodayCardProps = {
  hoje: ResumoHoje | null;
  onRetry: () => void;
};

const MAX_DOTS = 12;

/**
 * Bloco "Hoje" (SPEC-007 §5.1): o concreto e clinico, e o maior numero da tela. Conta o que
 * foi registrado, nunca o que faltou.
 */
export function TodayCard({ hoje, onRetry }: TodayCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Hoje</Text>

      {!hoje ? (
        <View style={styles.neutralBlock}>
          <Text style={styles.supportingText}>
            Não foi possível mostrar os registros de hoje agora.
          </Text>
          <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : hoje.dosesPrevistas === 0 && hoje.missoesPrevistas === 0 ? (
        <Text style={styles.supportingText}>
          Quando sua equipe de saúde cadastrar seus medicamentos, as doses de hoje aparecem
          aqui.
        </Text>
      ) : (
        <Animated.View entering={FadeIn.duration(260)} style={styles.content}>
          {hoje.dosesPrevistas > 0 ? (
            <View
              accessible
              accessibilityLabel={`Hoje: ${hoje.dosesRegistradas} de ${hoje.dosesPrevistas} doses registradas.`}
              style={styles.dosesBlock}
            >
              <Text style={styles.bigNumber}>
                {hoje.dosesRegistradas} de {hoje.dosesPrevistas}
              </Text>
              <Text style={styles.bigLabel}>doses registradas</Text>

              {hoje.dosesPrevistas <= MAX_DOTS ? (
                <View style={styles.dots}>
                  {Array.from({ length: hoje.dosesPrevistas }, (_, index) => (
                    <Animated.View
                      key={index}
                      entering={ZoomIn.delay(120 + index * 60).springify().damping(12)}
                      style={[
                        styles.dot,
                        index < hoje.dosesRegistradas ? styles.dotFilled : styles.dotEmpty,
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <AnimatedXpBar
                  ratio={hoje.dosesRegistradas / hoje.dosesPrevistas}
                  height={12}
                  delay={120}
                />
              )}
            </View>
          ) : null}

          {hoje.proximoHorario ? (
            <View style={styles.metaRow}>
              <Clock size={16} color="#35506B" />
              <Text style={styles.metaText}>
                Próxima: {formatClockTime(hoje.proximoHorario) ?? hoje.proximoHorario}
              </Text>
            </View>
          ) : null}

          {hoje.missoesPrevistas > 0 ? (
            <View style={styles.metaRow}>
              <Target size={16} color="#35506B" />
              <Text style={styles.metaText}>
                {hoje.missoesConcluidas} de {pluralize(hoje.missoesPrevistas, "missão concluída", "missões concluídas")}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#FDFEFF",
    borderWidth: 1,
    borderColor: "#D3DFEA",
    gap: 10,
  },
  eyebrow: {
    color: "#12314C",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  content: {
    gap: 12,
  },
  dosesBlock: {
    gap: 6,
  },
  bigNumber: {
    color: "#12314C",
    fontSize: 36,
    fontWeight: "900",
  },
  bigLabel: {
    color: "#35506B",
    fontSize: 16,
    fontWeight: "600",
    marginTop: -4,
  },
  dots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  dotFilled: {
    backgroundColor: "#1A6FD6",
    borderColor: "#1A6FD6",
  },
  dotEmpty: {
    backgroundColor: "transparent",
    borderColor: "#9AAFC3",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    color: "#23405C",
    fontSize: 15,
    fontWeight: "600",
  },
  neutralBlock: {
    gap: 10,
  },
  supportingText: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  retryText: {
    color: "#1A5DB5",
    fontSize: 14,
    fontWeight: "700",
  },
});
