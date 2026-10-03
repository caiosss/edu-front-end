import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInRight, ZoomIn } from "react-native-reanimated";
import { Check, Lightbulb, Undo2, X } from "lucide-react-native";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import { ConfettiBurst } from "../../gamification/components/confetti-burst";
import { hapticImpact, hapticSelection, hapticSuccess } from "../../gamification/utils/haptics";
import type { PerguntaJogo, RespostaRodada, RodadaJogo } from "../types";
import { buildRespostas, elapsedSeconds, type EscolhaPergunta } from "../utils";

type AssociationRoundProps = {
  rodada: RodadaJogo;
  onFinish: (respostas: RespostaRodada[], duracaoSeg: number) => void;
  onExit: () => void;
};

type StatusPar = "pendente" | "revisar" | "ligado" | "corrigido";

type Feedback = {
  tipo: "acerto" | "correcao" | "dica";
  texto: string;
};

/** Cor de cada ligacao, repetida no medicamento e na resposta para ligar os dois com o olhar. */
const PAIR_COLORS = ["#1A6FD6", "#0CA678", "#E8590C", "#7048E8", "#C2255C", "#1098AD"];
const LIGADO_COLORS = ["#63E6BE", "#20C997", "#FFFFFF", "#4DABF7", "#FFD43B"] as const;
const LIGADO_POWER = [120, 260] as const;

const statusDe = (pergunta: PerguntaJogo, escolha: EscolhaPergunta | undefined): StatusPar => {
  if (escolha?.final !== undefined) {
    return escolha.final === pergunta.correta ? "ligado" : "corrigido";
  }

  return escolha?.primeira !== undefined ? "revisar" : "pendente";
};

/**
 * Associacao (SPEC-012 §5.2): medicamentos de um lado, respostas do outro, tudo visivel. Cada
 * par e uma pergunta cujas `opcoes` sao as respostas de todos os pares. O par ligado de outro
 * jeito recebe a correcao e volta uma vez depois dos demais.
 */
export function AssociationRound({ rodada, onFinish, onExit }: AssociationRoundProps) {
  const { width } = useWindowDimensions();
  const startedAtRef = useRef(Date.now());
  const perguntas = rodada.perguntas;
  const respostas = perguntas[0]?.opcoes ?? [];

  const [escolhas, setEscolhas] = useState<Record<string, EscolhaPergunta>>({});
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const corPorPergunta = useMemo(
    () =>
      new Map(perguntas.map((pergunta, index) => [pergunta.id, PAIR_COLORS[index % PAIR_COLORS.length]])),
    [perguntas]
  );

  const primeiraPassadaCompleta = perguntas.every(
    (pergunta) => escolhas[pergunta.id]?.primeira !== undefined
  );
  const terminou = perguntas.every((pergunta) => escolhas[pergunta.id]?.final !== undefined);
  const concluidos = perguntas.filter((pergunta) => escolhas[pergunta.id]?.final !== undefined).length;

  const selecionavel = (pergunta: PerguntaJogo) => {
    const status = statusDe(pergunta, escolhas[pergunta.id]);
    return status === "pendente" || (status === "revisar" && primeiraPassadaCompleta);
  };

  /** Resposta ja ligada (ou revelada na correcao) a algum medicamento. */
  const donoDaResposta = (opcao: number): PerguntaJogo | undefined =>
    perguntas.find((pergunta) => {
      const status = statusDe(pergunta, escolhas[pergunta.id]);
      return (status === "ligado" || status === "corrigido") && pergunta.correta === opcao;
    });

  const selecionarMedicamento = (pergunta: PerguntaJogo) => {
    if (!selecionavel(pergunta)) {
      return;
    }

    hapticSelection();
    setSelecionadoId((atual) => (atual === pergunta.id ? null : pergunta.id));
    setFeedback(null);
  };

  const escolherResposta = (opcao: number) => {
    const pergunta = perguntas.find((item) => item.id === selecionadoId);

    if (!pergunta) {
      setFeedback({ tipo: "dica", texto: "Primeiro toque em um medicamento." });
      return;
    }

    const status = statusDe(pergunta, escolhas[pergunta.id]);
    const correta = opcao === pergunta.correta;

    setEscolhas((atuais) => ({
      ...atuais,
      [pergunta.id]:
        status === "revisar"
          ? { ...atuais[pergunta.id], final: opcao }
          : { primeira: opcao, final: correta ? opcao : undefined },
    }));
    setSelecionadoId(null);
    setFeedback({
      tipo: correta ? "acerto" : "correcao",
      texto: correta ? pergunta.feedbackAcerto : pergunta.feedbackCorrecao,
    });

    if (correta) {
      hapticSuccess();
      setBurstKey(Date.now());
    } else {
      hapticImpact("light");
    }
  };

  const concluir = () => {
    if (terminou) {
      onFinish(buildRespostas(perguntas, escolhas), elapsedSeconds(startedAtRef.current));
    }
  };

  const instrucao = !primeiraPassadaCompleta
    ? perguntas[0]?.enunciado
    : terminou
      ? "Todos os pares foram vistos."
      : "Agora, reveja os pares que ficaram para fixar.";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Sair da rodada"
          hitSlop={10}
          style={styles.exitButton}
        >
          <X size={22} color="#35506B" />
        </Pressable>
        <View style={styles.headerProgress}>
          <Text style={styles.progressLabel}>
            {concluidos} de {perguntas.length} pares
          </Text>
          <AnimatedXpBar ratio={concluidos / Math.max(1, perguntas.length)} height={8} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.Text key={instrucao} entering={FadeIn.duration(260)} style={styles.instruction}>
          {instrucao}
        </Animated.Text>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Medicamento</Text>
            {perguntas.map((pergunta, index) => {
              const status = statusDe(pergunta, escolhas[pergunta.id]);
              const cor = corPorPergunta.get(pergunta.id) ?? PAIR_COLORS[0];
              const selecionado = selecionadoId === pergunta.id;
              const podeTocar = selecionavel(pergunta);
              const final = escolhas[pergunta.id]?.final;

              return (
                <Animated.View key={pergunta.id} entering={FadeInLeft.delay(index * 80).duration(280)}>
                  <Pressable
                    onPress={() => selecionarMedicamento(pergunta)}
                    disabled={!podeTocar}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selecionado, disabled: !podeTocar }}
                    accessibilityLabel={`${pergunta.medicamentoNome}${
                      status === "ligado" || status === "corrigido"
                        ? `, ligado a ${pergunta.opcoes[pergunta.correta]}`
                        : status === "revisar"
                          ? ", para rever"
                          : ""
                    }`}
                    style={[
                      styles.medItem,
                      selecionado ? { borderColor: cor, backgroundColor: "#F0F7FF" } : null,
                      status === "ligado" || status === "corrigido"
                        ? { borderColor: cor, backgroundColor: "#FFFFFF" }
                        : null,
                      status === "revisar" && !primeiraPassadaCompleta ? styles.itemWaiting : null,
                    ]}
                  >
                    <Text style={styles.medName}>{pergunta.medicamentoNome}</Text>
                    {status === "ligado" ? (
                      <Animated.View entering={ZoomIn.springify().damping(9)} style={[styles.statusRow]}>
                        <Check size={14} color={cor} />
                        <Text style={[styles.statusText, { color: cor }]} numberOfLines={2}>
                          {final !== undefined ? pergunta.opcoes[final] : ""}
                        </Text>
                      </Animated.View>
                    ) : status === "corrigido" ? (
                      <View style={styles.statusRow}>
                        <Lightbulb size={14} color="#5F3DC4" />
                        <Text style={[styles.statusText, { color: "#5F3DC4" }]} numberOfLines={2}>
                          {pergunta.opcoes[pergunta.correta]}
                        </Text>
                      </View>
                    ) : status === "revisar" ? (
                      <View style={styles.statusRow}>
                        <Undo2 size={14} color="#5F3DC4" />
                        <Text style={[styles.statusText, { color: "#5F3DC4" }]}>rever</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.column}>
            <Text style={styles.columnTitle}>Resposta</Text>
            {respostas.map((resposta, opcao) => {
              const dono = donoDaResposta(opcao);
              const cor = dono ? corPorPergunta.get(dono.id) : undefined;
              const disabled = Boolean(dono) || terminou;

              return (
                <Animated.View key={`${resposta}-${opcao}`} entering={FadeInRight.delay(opcao * 80).duration(280)}>
                  <Pressable
                    onPress={() => escolherResposta(opcao)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    accessibilityLabel={`${resposta}${dono ? `, ligado a ${dono.medicamentoNome}` : ""}`}
                    style={({ pressed }) => [
                      styles.answerItem,
                      selecionadoId && !disabled ? styles.answerReady : null,
                      pressed && !disabled ? styles.answerPressed : null,
                      dono && cor ? { borderColor: cor, backgroundColor: "#FFFFFF", opacity: 0.85 } : null,
                    ]}
                  >
                    <Text style={styles.answerText}>{resposta}</Text>
                    {dono && cor ? (
                      <View style={[styles.pairDot, { backgroundColor: cor }]} />
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {feedback ? (
          <Animated.View
            key={feedback.texto}
            entering={FadeInDown.springify().damping(14)}
            accessibilityLiveRegion="polite"
            style={[
              styles.feedback,
              feedback.tipo === "acerto" ? styles.feedbackGood : styles.feedbackTip,
            ]}
          >
            {feedback.tipo === "acerto" ? (
              <Check size={20} color="#0B7A4B" />
            ) : (
              <Lightbulb size={20} color="#5F3DC4" />
            )}
            <Text
              style={[
                styles.feedbackText,
                feedback.tipo === "acerto" ? styles.feedbackTextGood : styles.feedbackTextTip,
              ]}
            >
              {feedback.texto}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={concluir}
          disabled={!terminou}
          accessibilityRole="button"
          accessibilityState={{ disabled: !terminou }}
          style={({ pressed }) => [
            styles.nextButton,
            !terminou ? styles.nextButtonDisabled : null,
            pressed && terminou ? styles.nextButtonPressed : null,
          ]}
        >
          <Text style={styles.nextText}>{terminou ? "Ver resultado" : "Ligue todos os pares"}</Text>
        </Pressable>
      </View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiBurst
          burstKey={burstKey}
          origin={{ x: width / 2, y: 200 }}
          count={22}
          colors={LIGADO_COLORS}
          spread={360}
          power={LIGADO_POWER}
          gravity={420}
          duration={1000}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEF5",
  },
  headerProgress: {
    flex: 1,
    gap: 6,
  },
  progressLabel: {
    color: "#35506B",
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  instruction: {
    color: "#12314C",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 26,
    paddingHorizontal: 4,
  },
  columns: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  columnTitle: {
    color: "#4F6982",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  medItem: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D3DFEA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FDFEFF",
    justifyContent: "center",
    gap: 4,
  },
  itemWaiting: {
    opacity: 0.6,
  },
  medName: {
    color: "#12314C",
    fontSize: 16,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  answerItem: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D3DFEA",
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F7FAFD",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  answerReady: {
    borderColor: "#74A9EC",
    backgroundColor: "#FFFFFF",
  },
  answerPressed: {
    backgroundColor: "#E8F2FF",
  },
  answerText: {
    flex: 1,
    color: "#23405C",
    fontSize: 15,
    fontWeight: "700",
  },
  pairDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  feedback: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    padding: 14,
  },
  feedbackGood: {
    backgroundColor: "#E6FCF5",
  },
  feedbackTip: {
    backgroundColor: "#F3F0FF",
  },
  feedbackText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  feedbackTextGood: {
    color: "#0B5E3B",
  },
  feedbackTextTip: {
    color: "#4527A0",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  nextButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7048E8",
  },
  nextButtonPressed: {
    backgroundColor: "#5F3DC4",
  },
  nextButtonDisabled: {
    backgroundColor: "#C5B8F0",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
