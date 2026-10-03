import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Brain, History, Info, RefreshCw } from "lucide-react-native";
import { AssociationRound } from "../features/games/components/association-round";
import { GameCard } from "../features/games/components/game-card";
import { MultipleChoiceRound } from "../features/games/components/multiple-choice-round";
import { MyDayRound } from "../features/games/components/my-day-round";
import { PackBagRound } from "../features/games/components/pack-bag-round";
import { RoundResult } from "../features/games/components/round-result";
import { GAME_INFO } from "../features/games/labels";
import type {
  Jogo,
  RespostaRodada,
  ResultadoRodada,
  RodadaJogo,
} from "../features/games/types";
import { formatDateBr } from "../features/gamification/utils/format";
import { syncGamificationAfterReward, useGamification } from "../hooks/use-gamification";
import { useGamesLobby } from "../hooks/use-games";
import {
  GameNetworkError,
  startGameRound,
  submitRoundResult,
} from "../services/games-service";
import { createIdempotencyKey } from "../utils/idempotency-key";

type Envio = {
  rodada: RodadaJogo;
  respostas: RespostaRodada[];
  duracaoSeg: number;
  /** Mesma chave em toda nova tentativa: o backend devolve a resposta original (SPEC-012 §5.3). */
  chave: string;
};

type RoundProps = {
  rodada: RodadaJogo;
  onFinish: (respostas: RespostaRodada[], duracaoSeg: number) => void;
  onExit: () => void;
};

/** A tela nao sabe jogar: cada jogo tem o seu componente de rodada. */
const RODADA_POR_JOGO: Record<Jogo, ComponentType<RoundProps>> = {
  MULTIPLA_ESCOLHA: MultipleChoiceRound,
  ASSOCIACAO: AssociationRound,
  MEU_DIA: MyDayRound,
  ARRUME_A_MALA: PackBagRound,
};

type Fase =
  | { tipo: "lobby" }
  | { tipo: "jogando"; rodada: RodadaJogo }
  | { tipo: "enviando"; envio: Envio }
  | { tipo: "falhaEnvio"; envio: Envio; mensagem: string; podeReenviar: boolean }
  | { tipo: "resultado"; rodada: RodadaJogo; resultado: ResultadoRodada };

/** Jogos de educacao terapeutica (SPEC-012): treino da propria prescricao, sempre facil. */
export default function GamesScreen() {
  const { isPatient } = useGamification();
  const lobby = useGamesLobby(isPatient);
  const [fase, setFase] = useState<Fase>({ tipo: "lobby" });
  const [abrindo, setAbrindo] = useState<Jogo | null>(null);
  const [avisoLobby, setAvisoLobby] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const faseRef = useRef(fase);

  faseRef.current = fase;

  const abrirRodada = useCallback(async (jogo: Jogo) => {
    setAbrindo(jogo);
    setAvisoLobby("");

    try {
      const rodada = await startGameRound(jogo);
      setFase({ tipo: "jogando", rodada });
    } catch (error) {
      setFase({ tipo: "lobby" });
      setAvisoLobby(error instanceof Error ? error.message : "Não foi possível abrir a rodada.");
      void lobby.refresh();
    } finally {
      setAbrindo(null);
    }
  }, [lobby]);

  const enviar = useCallback(async (envio: Envio) => {
    setFase({ tipo: "enviando", envio });

    try {
      const resultado = await submitRoundResult(
        envio.rodada.rodadaId,
        { duracaoSeg: envio.duracaoSeg, respostas: envio.respostas },
        envio.chave
      );
      setFase({ tipo: "resultado", rodada: envio.rodada, resultado });
      // O XP da rodada chega pelo gamification-service ao consumir game.round-completed.
      syncGamificationAfterReward();
      void lobby.refresh();
    } catch (error) {
      setFase({
        tipo: "falhaEnvio",
        envio,
        mensagem: error instanceof Error ? error.message : "Não foi possível registrar a rodada.",
        podeReenviar: error instanceof GameNetworkError,
      });
    }
  }, [lobby]);

  const concluirRodada = useCallback(
    (rodada: RodadaJogo, respostas: RespostaRodada[], duracaoSeg: number) => {
      void enviar({ rodada, respostas, duracaoSeg, chave: createIdempotencyKey() });
    },
    [enviar]
  );

  const confirmarSaida = useCallback(() => {
    Alert.alert(
      "Sair da rodada?",
      "As respostas desta rodada não serão registradas.",
      [
        { text: "Continuar treinando", style: "cancel" },
        { text: "Sair", onPress: () => setFase({ tipo: "lobby" }) },
      ],
      { cancelable: true }
    );
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const atual = faseRef.current;

      if (atual.tipo === "jogando") {
        confirmarSaida();
        return true;
      }

      if (atual.tipo === "resultado" || atual.tipo === "falhaEnvio") {
        setFase({ tipo: "lobby" });
        return true;
      }

      return atual.tipo === "enviando";
    });

    return () => {
      subscription.remove();
    };
  }, [confirmarSaida]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await lobby.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [lobby]);

  if (!isPatient) {
    return (
      <View style={styles.centered}>
        <View style={styles.infoCard}>
          <Brain size={28} color="#2C7BE5" />
          <Text style={styles.infoTitle}>Disponível para pacientes</Text>
          <Text style={styles.supportingText}>
            Os jogos usam a prescrição e o plano de cuidado de cada paciente para treinar
            horários, intervalos e a rotina do dia.
          </Text>
        </View>
      </View>
    );
  }

  if (fase.tipo === "jogando") {
    const Round = RODADA_POR_JOGO[fase.rodada.jogo];

    return (
      <Round
        key={fase.rodada.rodadaId}
        rodada={fase.rodada}
        onExit={confirmarSaida}
        onFinish={(respostas, duracaoSeg) => concluirRodada(fase.rodada, respostas, duracaoSeg)}
      />
    );
  }

  if (fase.tipo === "enviando") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.centered}>
        <ActivityIndicator size="large" color="#2C7BE5" />
        <Text style={styles.sendingText}>Registrando sua rodada...</Text>
      </Animated.View>
    );
  }

  if (fase.tipo === "falhaEnvio") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.centered}>
        <View style={styles.infoCard}>
          <Info size={26} color="#35506B" />
          <Text style={styles.infoTitle}>{fase.mensagem}</Text>
          {fase.podeReenviar ? (
            <Pressable
              onPress={() => void enviar(fase.envio)}
              accessibilityRole="button"
              style={styles.primaryButton}
            >
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Enviar de novo</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void abrirRodada(fase.envio.rodada.jogo)}
              accessibilityRole="button"
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>Abrir nova rodada</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setFase({ tipo: "lobby" })}
            accessibilityRole="button"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Voltar aos jogos</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  if (fase.tipo === "resultado") {
    return (
      <RoundResult
        jogo={fase.rodada.jogo}
        resultado={fase.resultado}
        onPlayAgain={() => void abrirRodada(fase.rodada.jogo)}
        onBack={() => setFase({ tipo: "lobby" })}
      />
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
          <Brain size={26} color="#FFFFFF" />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.title}>Treine sua rotina</Text>
          <Text style={styles.supportingText}>
            Rodadas curtas com os seus medicamentos e as suas missões. A resposta certa aparece na
            hora, e errar aqui não custa nada.
          </Text>
        </View>
      </Animated.View>

      {avisoLobby ? (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.notice} accessibilityLiveRegion="polite">
          <Info size={16} color="#35506B" />
          <Text style={styles.noticeText}>{avisoLobby}</Text>
        </Animated.View>
      ) : null}

      {lobby.isLoading && lobby.jogos.length === 0 ? (
        <ActivityIndicator color="#2C7BE5" style={styles.loading} />
      ) : null}

      {!lobby.isLoading && lobby.errorMessage && lobby.jogos.length === 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.supportingText}>{lobby.errorMessage}</Text>
          <Pressable onPress={() => void lobby.refresh()} accessibilityRole="button" style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}

      {lobby.jogos.map((situacao, index) => (
        <GameCard
          key={situacao.jogo}
          situacao={situacao}
          index={index}
          isStarting={abrindo === situacao.jogo}
          disabled={abrindo !== null}
          onStart={() => void abrirRodada(situacao.jogo)}
        />
      ))}

      {lobby.historico.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(260).duration(260)} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <History size={16} color="#35506B" />
            <Text style={styles.historyTitle}>Suas últimas rodadas</Text>
          </View>
          {lobby.historico.map((rodada) => (
            <View
              key={rodada.rodadaId}
              style={styles.historyRow}
              accessible
              accessibilityLabel={`${GAME_INFO[rodada.jogo].titulo}: ${rodada.acertos} de ${rodada.total}${
                rodada.concluidaEm ? `, em ${formatDateBr(rodada.concluidaEm)}` : ""
              }`}
            >
              <Text style={styles.historyGame}>{GAME_INFO[rodada.jogo].titulo}</Text>
              <Text style={styles.historyScore}>
                {rodada.acertos} de {rodada.total}
              </Text>
              <Text style={styles.historyDate}>{formatDateBr(rodada.concluidaEm) ?? ""}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
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
    gap: 12,
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
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7BE5",
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: "#12314C",
    fontSize: 20,
    fontWeight: "800",
  },
  supportingText: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#EEF2F6",
  },
  noticeText: {
    flex: 1,
    color: "#23405C",
    fontSize: 14,
    lineHeight: 20,
  },
  loading: {
    marginVertical: 24,
  },
  infoCard: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#FDFEFF",
    gap: 12,
  },
  infoTitle: {
    color: "#12314C",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  sendingText: {
    color: "#35506B",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2C7BE5",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  secondaryText: {
    color: "#1A5DB5",
    fontSize: 15,
    fontWeight: "800",
  },
  historyCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    gap: 10,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyTitle: {
    color: "#12314C",
    fontSize: 15,
    fontWeight: "800",
  },
  historyRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F4F8FC",
  },
  historyGame: {
    flex: 1,
    color: "#23405C",
    fontSize: 14,
    fontWeight: "700",
  },
  historyScore: {
    color: "#12314C",
    fontSize: 14,
    fontWeight: "800",
  },
  historyDate: {
    color: "#4F6982",
    fontSize: 12,
  },
});
