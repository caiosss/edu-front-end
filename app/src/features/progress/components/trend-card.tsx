import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Flame } from "lucide-react-native";
import { ProgressRing } from "../../gamification/components/progress-ring";
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
  /** Primeiro nome do paciente quando quem olha e o cuidador. Nulo = o proprio paciente. */
  pacienteNome?: string | null;
};

const COMPLETO = ["#4DABF7", "#1A6FD6"] as const;
const PARCIAL = "#A9CFF7";
const TRILHA = "#EDF2F8";
const SEM_REGISTRO = "#E3E9F0";
const BAR_HEIGHT = 112;
const GRID_GAP = 6;
const MAX_CELL = 46;
const CABECALHO_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

/** "2026-10-14" -> { dia: 14, mes: 9, semana: 2 } sem passar por fuso. */
const partesDe = (valor: string) => {
  const [ano, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  return { dia, mes: mes - 1, semana: new Date(ano, mes - 1, dia).getDay() };
};

function WeekBar({ dia, index, isToday }: { dia: DiaAdesao; index: number; isToday: boolean }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(reduceMotion ? fillRatioOf(dia) : 0);

  useEffect(() => {
    const target = fillRatioOf(dia);
    fill.value = reduceMotion
      ? target
      : withDelay(index * 55, withTiming(target, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [dia, fill, index, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fill.value * 100}%` as `${number}%`,
  }));

  return (
    <View accessible accessibilityLabel={accessibleDayLabel(dia)} style={styles.weekColumn}>
      <Text style={styles.weekCount}>
        {dia.previstas > 0 ? `${dia.registradas}/${dia.previstas}` : "–"}
      </Text>
      <View style={styles.weekTrack}>
        <Animated.View style={[styles.weekFill, fillStyle]}>
          {dia.estado === "PARCIAL" ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: PARCIAL }]} />
          ) : (
            <LinearGradient colors={COMPLETO} style={StyleSheet.absoluteFill} />
          )}
        </Animated.View>
        {dia.estado === "COMPLETO" ? (
          <View style={styles.weekCheck}>
            <Check size={12} color="#1A6FD6" strokeWidth={3.5} />
          </View>
        ) : null}
      </View>
      <View style={[styles.weekLabel, isToday ? styles.weekLabelToday : null]}>
        <Text style={[styles.weekInitial, isToday ? styles.weekInitialToday : null]}>
          {weekdayInitial(dia.dia)}
        </Text>
      </View>
    </View>
  );
}

function MonthGrid({ dias, hoje }: { dias: DiaAdesao[]; hoje: string | null }) {
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? Math.min(MAX_CELL, Math.floor((width - GRID_GAP * 6) / 7)) : 0;
  const deslocamento = dias.length > 0 ? partesDe(dias[0].dia).semana : 0;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={styles.monthWrapper}>
      {cell > 0 ? (
        <View style={{ width: cell * 7 + GRID_GAP * 6, alignSelf: "center", gap: GRID_GAP }}>
          <View style={styles.monthRow}>
            {CABECALHO_SEMANA.map((letra, index) => (
              <Text key={index} style={[styles.monthHeader, { width: cell }]}>
                {letra}
              </Text>
            ))}
          </View>
          <View style={[styles.monthCells, { gap: GRID_GAP }]}>
            {Array.from({ length: deslocamento }, (_, index) => (
              <View key={`vazio-${index}`} style={{ width: cell, height: cell }} />
            ))}
            {dias.map((dia, index) => {
              const { dia: numero, mes } = partesDe(dia.dia);
              const semDose = dia.previstas === 0;
              const isToday = dia.dia === hoje;
              const completo = dia.estado === "COMPLETO" && !semDose;

              return (
                <Animated.View
                  key={dia.dia}
                  entering={FadeIn.delay(index * 14).duration(220)}
                  accessible
                  accessibilityLabel={accessibleDayLabel(dia)}
                  style={[
                    styles.monthCell,
                    { width: cell, height: cell, borderRadius: Math.round(cell * 0.3) },
                    semDose ? styles.monthCellNone : null,
                    !semDose && dia.estado === "SEM_REGISTRO" ? styles.monthCellEmpty : null,
                    !semDose && dia.estado === "PARCIAL" ? styles.monthCellPartial : null,
                    isToday ? styles.monthCellToday : null,
                  ]}
                >
                  {completo ? (
                    <LinearGradient
                      colors={COMPLETO}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: Math.round(cell * 0.3) }]}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.monthNumber,
                      cell < 36 ? styles.monthNumberSmall : null,
                      completo ? styles.monthNumberOnFill : null,
                      semDose ? styles.monthNumberNone : null,
                    ]}
                  >
                    {numero}
                  </Text>
                  {numero === 1 ? (
                    <Text style={[styles.monthTag, completo ? styles.monthNumberOnFill : null]}>
                      {MESES[mes]}
                    </Text>
                  ) : null}
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ estado, label }: { estado: DiaAdesao["estado"]; label: string }) {
  return (
    <View style={styles.legendItem}>
      {estado === "COMPLETO" ? (
        <LinearGradient colors={COMPLETO} style={styles.legendSwatch} />
      ) : (
        <View
          style={[
            styles.legendSwatch,
            { backgroundColor: estado === "PARCIAL" ? PARCIAL : SEM_REGISTRO },
          ]}
        />
      )}
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/**
 * Bloco de tendencia (SPEC-007 §5.1 e §5.2): dia sem registro e neutro, nunca vermelho nem
 * alerta, e a sequencia aparece sem comentario sobre quebra.
 *
 * Semana em barras; mes em calendario — 30 barras finas lado a lado nao cabem num celular.
 */
export function TrendCard({
  periodo,
  streak,
  tipo,
  onChangeTipo,
  onRetry,
  pacienteNome = null,
}: TrendCardProps) {
  const sujeito = pacienteNome ?? "Você";
  const taxa =
    periodo && periodo.dosesPrevistas > 0
      ? periodo.taxa ?? periodo.dosesRegistradas / periodo.dosesPrevistas
      : 0;
  const titulo = pacienteNome
    ? `${tipo === "SEMANA" ? "Semana" : "Mês"} de ${pacienteNome}`
    : tipo === "SEMANA"
      ? "Sua semana"
      : "Seu mês";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{titulo}</Text>
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
          {pacienteNome
            ? `A tendência de ${pacienteNome} aparece aqui depois dos primeiros dias com doses previstas.`
            : "Sua tendência aparece aqui depois dos primeiros dias com doses previstas."}
        </Text>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <ProgressRing size={68} strokeWidth={8} ratio={taxa} colors={COMPLETO} trackColor={TRILHA}>
              <Text style={styles.ringValue}>{Math.round(taxa * 100)}%</Text>
            </ProgressRing>
            <View style={styles.summaryText}>
              <Text style={styles.summary}>
                {sujeito} registrou {periodo.dosesRegistradas} de {periodo.dosesPrevistas} doses
              </Text>
              <Text style={styles.rangeText}>
                {tipo === "SEMANA" ? "Últimos 7 dias" : "Últimos 30 dias"}
                {periodo.de && periodo.ate
                  ? ` · ${formatDayMonth(periodo.de)} a ${formatDayMonth(periodo.ate)}`
                  : ""}
              </Text>
            </View>
          </View>

          {tipo === "SEMANA" ? (
            <View style={styles.weekRow}>
              {periodo.dias.map((dia, index) => (
                <WeekBar key={dia.dia} dia={dia} index={index} isToday={dia.dia === periodo.ate} />
              ))}
            </View>
          ) : (
            <MonthGrid dias={periodo.dias} hoje={periodo.ate} />
          )}

          <View style={styles.legend}>
            <LegendItem estado="COMPLETO" label="Todas as doses" />
            <LegendItem estado="PARCIAL" label="Parte das doses" />
            <LegendItem estado="SEM_REGISTRO" label="Sem registro" />
          </View>
        </>
      )}

      <View
        accessible
        accessibilityLabel={`Sequência atual: ${pluralize(streak.atual, "dia", "dias")}. Recorde: ${pluralize(streak.recorde, "dia", "dias")}.`}
        style={styles.streakRow}
      >
        <View style={styles.streakIcon}>
          <Flame size={18} color="#E8590C" />
        </View>
        <View style={styles.streakTextBlock}>
          <Text style={styles.streakValue}>{pluralize(streak.atual, "dia", "dias")} seguidos</Text>
          <Text style={styles.streakHint}>
            {pacienteNome ? "Recorde de " + pacienteNome : "Seu recorde"}:{" "}
            {pluralize(streak.recorde, "dia", "dias")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 16,
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ringValue: {
    color: "#12314C",
    fontSize: 16,
    fontWeight: "800",
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  summary: {
    color: "#12314C",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  rangeText: {
    color: "#4F6982",
    fontSize: 12,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  weekColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekCount: {
    color: "#4F6982",
    fontSize: 11,
    fontWeight: "700",
  },
  weekTrack: {
    width: "100%",
    maxWidth: 40,
    height: BAR_HEIGHT,
    borderRadius: 14,
    backgroundColor: TRILHA,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  weekFill: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  weekCheck: {
    position: "absolute",
    top: 6,
    alignSelf: "center",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabelToday: {
    backgroundColor: "#12314C",
  },
  weekInitial: {
    color: "#35506B",
    fontSize: 13,
    fontWeight: "700",
  },
  weekInitialToday: {
    color: "#FFFFFF",
  },
  monthWrapper: {
    width: "100%",
  },
  monthRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  monthHeader: {
    color: "#4F6982",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  monthCells: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthCell: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  monthCellNone: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E3E9F0",
  },
  monthCellEmpty: {
    backgroundColor: SEM_REGISTRO,
  },
  monthCellPartial: {
    backgroundColor: PARCIAL,
  },
  monthCellToday: {
    borderWidth: 2,
    borderColor: "#12314C",
  },
  monthNumber: {
    color: "#23405C",
    fontSize: 14,
    fontWeight: "700",
  },
  monthNumberSmall: {
    fontSize: 12,
  },
  monthNumberOnFill: {
    color: "#FFFFFF",
  },
  monthNumberNone: {
    color: "#8EA1B5",
    fontWeight: "600",
  },
  monthTag: {
    color: "#23405C",
    fontSize: 8,
    fontWeight: "700",
    marginTop: -2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
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
    borderRadius: 5,
    overflow: "hidden",
  },
  legendText: {
    color: "#35506B",
    fontSize: 12,
    fontWeight: "600",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  streakIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE8CC",
  },
  streakTextBlock: {
    flex: 1,
    gap: 2,
  },
  streakValue: {
    color: "#7A3E00",
    fontSize: 15,
    fontWeight: "800",
  },
  streakHint: {
    color: "#7A3E00",
    fontSize: 12,
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
