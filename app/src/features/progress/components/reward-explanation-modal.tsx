import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, CalendarDays, HeartHandshake, Star } from "lucide-react-native";
import { goldGradient } from "../../gamification/theme";
import type { ExtratoLinha } from "../../gamification/types";
import { capitalize, formatDateTimeBr } from "../../gamification/utils/format";
import { describeRewardOrigin } from "../labels";

type RewardExplanationModalProps = {
  linha: ExtratoLinha | null;
  onClose: () => void;
};

function ExplanationSection({
  icon,
  title,
  value,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(260)} style={styles.section}>
      <View style={styles.sectionIcon}>{icon}</View>
      <View style={styles.sectionText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionValue}>{value}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * "Por que recebi isto" (SPEC-007 §5.3): o comportamento reconhecido, a regra com a versao e o
 * momento. So o que o extrato informa — nada e inventado para parecer mais completo.
 */
export function RewardExplanationModal({ linha, onClose }: RewardExplanationModalProps) {
  const quando = linha ? formatDateTimeBr(linha.quando) : null;

  return (
    <Modal
      visible={Boolean(linha)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar explicação"
        />

        {linha ? (
          <Animated.View entering={ZoomIn.springify().damping(15)} style={styles.card}>
            <LinearGradient
              colors={goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.xpBadge}
            >
              <Star size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.xpText}>+{linha.xp} XP</Text>
            </LinearGradient>

            <Text style={styles.motivo}>
              {linha.motivo ? capitalize(linha.motivo) : "Recompensa registrada"}
            </Text>

            {linha.moedas > 0 ? (
              <Text style={styles.moedas}>
                +{linha.moedas} {linha.moedas === 1 ? "moeda" : "moedas"}
              </Text>
            ) : null}

            <View style={styles.sections}>
              <ExplanationSection
                icon={<HeartHandshake size={18} color="#1A5DB5" />}
                title="Comportamento reconhecido"
                value={describeRewardOrigin(linha.origemTipo)}
                delay={120}
              />
              <ExplanationSection
                icon={<BookOpen size={18} color="#1A5DB5" />}
                title="Regra aplicada"
                value={`${linha.regraCodigo || "Regra do catálogo"} (versão ${linha.regraVersao})`}
                delay={200}
              />
              {quando ? (
                <ExplanationSection
                  icon={<CalendarDays size={18} color="#1A5DB5" />}
                  title="Quando"
                  value={quando}
                  delay={280}
                />
              ) : null}
            </View>

            <Pressable onPress={onClose} accessibilityRole="button" style={styles.button}>
              <Text style={styles.buttonText}>Entendi</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(10, 24, 44, 0.6)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 10,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  xpText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  motivo: {
    color: "#12314C",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  moedas: {
    color: "#5F3DC4",
    fontSize: 14,
    fontWeight: "700",
  },
  sections: {
    alignSelf: "stretch",
    gap: 10,
    marginTop: 6,
  },
  section: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F4F8FC",
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  sectionText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: "#4F6982",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionValue: {
    color: "#12314C",
    fontSize: 15,
    fontWeight: "600",
  },
  button: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 14,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7BE5",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
