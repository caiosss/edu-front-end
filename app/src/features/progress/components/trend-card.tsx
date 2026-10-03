import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Flame } from "lucide-react-native";
import type {
  DiaAdesao,
  PeriodoResumo,
  ResumoPeriodo,
  Streak,
} from "../../gamification/types";
import {
  formatDayMonth,
  weekdayInitial,
  weekdayName,
} from "../../gamification/utils/format";
import { pluralize } from "../labels";

type TrendCardProps = {
  periodo: ResumoPeriodo | null;
  streak: Streak;
  tipo: PeriodoResumo;
  onChangeTipo: (tipo: PeriodoResumo) => void;
  onRetry: () => void;
};

/** Quanto da barra do dia fica preenchida. Estado, e nao cor, e o que o backend informa. */
const fillRatioOf = (dia: DiaAdesao): number => {
  if (dia.estado === "COMPLETO") {
    return 1;
  }

  if (dia.estado === "PARCIAL") {
    return dia.previstas > 0
      ? Math.max(0.2, Math.min(dia.registradas / dia.previstas, 0.85))
      : 0.5;
  }

  return 0;
};

const accessibleDayLabel = (dia: DiaAdesao): string => {
  const quando = `${weekdayName(dia.dia)}, ${formatDayMonth(dia.dia)}`;

  if (dia.previstas === 0) {
    return `${quando}, nenhuma dose prevista`;
  }

  const registro = `${dia.registradas} de ${dia.previstas} doses registradas`;
  return dia.estado === "SEM_REGISTRO" ? `${quando}, ${registro}, sem registro` : `${quando}, ${registro}`;
};

function DayBar({ dia, index, compact }: { dia: DiaAdesao; index: number; compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(reduceMotion ? fillRatioOf(dia) : 0);

  useEffect(() => {
    const target = fillRatioOf(dia);
    fill.value = reduceMotion
      ? target
      : withDelay(index * 45, withTiming(target, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [dia, fill, index, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fill.value * 100}%` as `${number}%`,
  }));

  const semRegistro = dia.estado === "SEM_REGISTRO";

  return (
    <View
      accessible
      accessibilityLabel={accessibleDayLabel(dia)}
      style={styles.dayColumn}
    >
      <View
        style={[
          styles.dayTrack,
          compact ? styles.dayTrackCompact : null,
          semRegistro ? styles.dayTrackEmpty : null,
        ]}
      >
        <Animated.View
          style={[
            styles.dayFill,
            dia.estado === "PARCIAL" ? styles.dayFillPartial : null,
            fillStyle,
          ]}
        />
      </View>
      {!compact ? <Text style={styles.dayInitial}>{weekdayInitial(dia.dia)}</Text> : null}
    </View>
  );
}

function LegendItem({ estado, label }: { estado: DiaAdesao["estado"]; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          estado === "COMPLETO" ? styles.legendComplete : null,
          estado === "PARCIAL" ? styles.legendPartial : null,
          estado === "SEM_REGISTRO" ? styles.dayTrackEmpty : null,
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/**
 * Bloco de tendencia (SPEC-007 §5.1 e §5.2): dia sem registro e neutro, nunca vermelho nem
 * alerta, e a sequencia aparece sem comentario sobre quebra.
 */
export function TrendCard({ periodo, streak, tipo, onChangeTipo, onRetry }: TrendCardProps) {
  const compact = tipo === "MES";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{tipo === "SEMANA" ? "Sua semana" : "Seu mês"}</Text>
        <View style={styles.segmented} accessibilityRole="tablist">
          {(["SEMANA", "MES"] as const).map((opcao) => {
            const selected = opcao === tipo;

            return (
              <Pressable
                key={opcao}
                onPress={() => onChangeTipo(opcao)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.segment, selected ? styles.segmentSelected : null]}
              >
                <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>
                  {opcao === "SEMANA" ? "Semana" : "Mês"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!periodo ? (
        <View style={styles.neutralBlock}>
          <Text style={styles.supportingText}>
            Não foi possível mostrar a tendência agora.
          </Text>
          <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : periodo.dosesPrevistas === 0 ? (
        <Text style={styles.supportingText}>
          Sua tendência aparece aqui depois dos primeiros dias com doses previstas.
        </Text>
      ) : (
        <>
          <Text style={styles.summary}>
            Você registrou {periodo.dosesRegistradas} de {periodo.dosesPrevistas} doses
            {periodo.taxa !== null ? ` (${Math.round(periodo.taxa * 100)}%)` : ""}
          </Text>

          <View style={[styles.bars, compact ? styles.barsCompact : null]}>
            {periodo.dias.map((dia, index) => (
              <DayBar key={dia.dia} dia={dia} index={index} compact={compact} />
            ))}
          </View>

          {compact && periodo.de && periodo.ate ? (
            <Text style={styles.rangeText}>
              {formatDayMonth(periodo.de)} a {formatDayMonth(periodo.ate)}
            </Text>
          ) : null}

          <View style={styles.legend}>
            <LegendItem estado="COMPLETO" label="completo" />
            <LegendItem estado="PARCIAL" label="parcial" />
            <LegendItem estado="SEM_REGISTRO" label="sem registro" />
          </View>
        </>
      )}

      <View
        accessible
        accessibilityLabel={`Sequência atual: ${pluralize(streak.atual, "dia", "dias")}. Seu recorde: ${pluralize(streak.recorde, "dia", "dias")}.`}
        style={styles.streakRow}
      >
        <Flame size={18} color="#E8590C" />
        <Text style={styles.streakText}>
          Sequência atual: {pluralize(streak.atual, "dia", "dias")} · Seu recorde:{" "}
          {streak.recorde}
        </Text>
      </View>
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
    gap: 8,
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#12314C",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: "#EAF1F8",
    padding: 3,
  },
  segment: {
    minHeight: 36,
    minWidth: 64,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    color: "#35506B",
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextSelected: {
    color: "#12314C",
  },
  summary: {
    color: "#12314C",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  barsCompact: {
    gap: 2,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  dayTrack: {
    width: "100%",
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#7FB0E8",
    backgroundColor: "#F4F8FC",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  dayTrackCompact: {
    height: 48,
    borderRadius: 3,
    borderWidth: 1,
  },
  dayTrackEmpty: {
    borderColor: "#B8C6D4",
    borderStyle: "dashed",
    backgroundColor: "#F1F4F7",
  },
  dayFill: {
    width: "100%",
    backgroundColor: "#1A6FD6",
  },
  dayFillPartial: {
    backgroundColor: "#8DBEF3",
  },
  dayInitial: {
    color: "#35506B",
    fontSize: 13,
    fontWeight: "700",
  },
  rangeText: {
    color: "#4F6982",
    fontSize: 12,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#7FB0E8",
  },
  legendComplete: {
    backgroundColor: "#1A6FD6",
    borderColor: "#1A6FD6",
  },
  legendPartial: {
    backgroundColor: "#8DBEF3",
  },
  legendText: {
    color: "#35506B",
    fontSize: 12,
    fontWeight: "600",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  streakText: {
    flex: 1,
    color: "#7A3E00",
    fontSize: 14,
    fontWeight: "700",
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
