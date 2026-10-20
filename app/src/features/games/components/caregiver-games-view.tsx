import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, Puzzle } from "lucide-react-native";
import { formatDateBr } from "../../gamification/utils/format";
import { useCaregiverPatient, usePatientGameHistory } from "../../../hooks/use-caregiver-patient";
import { GAME_INFO } from "../labels";
import type { Jogo, RodadaResumo } from "../types";

function RoundRow({ rodada, index }: { rodada: RodadaResumo; index: number }) {
  const info = GAME_INFO[rodada.jogo];
  const Icon = info.icon;
  const ratio = rodada.total > 0 ? Math.min(rodada.acertos / rodada.total, 1) : 0;
  const quando = formatDateBr(rodada.concluidaEm);

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 40).duration(240)}
      accessible
      accessibilityLabel={`${info.titulo}: ${rodada.acertos} de ${rodada.total} acertos${quando ? `, em ${quando}` : ""}`}
      style={styles.row}
    >
      <LinearGradient colors={info.cores} style={styles.rowIcon}>
        <Icon size={20} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{info.titulo}</Text>
          <Text style={styles.rowScore}>
            {rodada.acertos}/{rodada.total}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: info.cores[1] }]} />
        </View>
        {quando ? <Text style={styles.rowDate}>{quando}</Text> : null}
      </View>
    </Animated.View>
  );
}

/**
 * Jogos para o cuidador (SPEC-014 §4): so acompanha. As rodadas sao do paciente — o quiz mede o
 * que ele aprendeu — e o cuidador ve o que foi jogado, com o escopo VER_PROGRESSO.
 */
export function CaregiverGamesView() {
  const cuidador = useCaregiverPatient();
  const nome = cuidador.pacienteNome ?? "o paciente";
  const jogos = usePatientGameHistory(cuidador.pacienteId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const porJogo = useMemo(() => {
    const contagem = new Map<Jogo, number>();
    jogos.historico.forEach((rodada) => contagem.set(rodada.jogo, (contagem.get(rodada.jogo) ?? 0) + 1));
    return contagem;
  }, [jogos.historico]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([cuidador.refresh(), jogos.refresh()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [cuidador, jogos]);

  if (cuidador.isLoading && !cuidador.pacienteId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2C7BE5" />
      </View>
    );
  }

  if (!cuidador.pacienteId) {
    return (
      <View style={styles.centered}>
        <View style={styles.infoCard}>
          <Puzzle size={28} color="#2C7BE5" />
          <Text style={styles.infoTitle}>Jogos do paciente</Text>
          <Text style={styles.supportingText}>
            {cuidador.mensagemSemAcesso ||
              cuidador.errorMessage ||
              "Os jogos do paciente aparecem aqui."}
          </Text>
          <Pressable onPress={() => void cuidador.refresh()} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>Conferir de novo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor="#2C7BE5"
          colors={["#2C7BE5"]}
        />
      }
    >
      <Animated.View entering={FadeInDown.duration(240)} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Eye size={24} color="#1155AA" />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Jogos de {nome}</Text>
          <Text style={styles.supportingText}>
            Acompanhe os treinos sobre os remédios e a rotina. As rodadas são de {nome}: você só
            acompanha.
          </Text>
        </View>
      </Animated.View>

      <View style={styles.summaryRow}>
        {(Object.keys(GAME_INFO) as Jogo[]).map((jogo) => {
          const info = GAME_INFO[jogo];
          const Icon = info.icon;
          return (
            <View key={jogo} style={styles.summaryChip} accessible accessibilityLabel={`${info.titulo}: ${porJogo.get(jogo) ?? 0} rodadas recentes`}>
              <LinearGradient colors={info.cores} style={styles.summaryIcon}>
                <Icon size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.summaryCount}>{porJogo.get(jogo) ?? 0}</Text>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                {info.titulo}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Últimas rodadas</Text>
        {jogos.isLoading && jogos.historico.length === 0 ? (
          <ActivityIndicator color="#2C7BE5" />
        ) : jogos.errorMessage ? (
          <Text style={styles.supportingText}>{jogos.errorMessage}</Text>
        ) : jogos.historico.length === 0 ? (
          <Text style={styles.supportingText}>
            {nome.charAt(0).toUpperCase() + nome.slice(1)} ainda não jogou. As rodadas aparecem aqui
            assim que forem concluídas.
          </Text>
        ) : (
          jogos.historico.map((rodada, index) => (
            <RoundRow key={rodada.rodadaId} rodada={rodada} index={index} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  infoCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FDFEFF",
  },
  infoTitle: {
    color: "#12314C",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  supportingText: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
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
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FDFEFF",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6EFFA",
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: "#12314C",
    fontSize: 20,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: "#FDFEFF",
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCount: {
    color: "#12314C",
    fontSize: 18,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "#4F6982",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    gap: 10,
  },
  cardTitle: {
    color: "#12314C",
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F4F8FC",
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    color: "#23405C",
    fontSize: 15,
    fontWeight: "700",
  },
  rowScore: {
    color: "#12314C",
    fontSize: 15,
    fontWeight: "800",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E3E9F0",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  rowDate: {
    color: "#4F6982",
    fontSize: 12,
    fontWeight: "600",
  },
});
