import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  LinearTransition,
  ZoomIn,
} from "react-native-reanimated";
import { Check, Lightbulb, Pill, Undo2, X } from "lucide-react-native";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import { ConfettiBurst } from "../../gamification/components/confetti-burst";
import { hapticImpact, hapticSelection, hapticSuccess } from "../../gamification/utils/haptics";
import { CATEGORIA_INFO, TURNO_INFO, type Turno } from "../labels";
import type { CartaLivre, PerguntaJogo, RespostaRodada, RodadaJogo } from "../types";
import {
  buildRespostas,
  doseNoHorarioCerto,
  elapsedSeconds,
  turnoDoRotulo,
} from "../utils";

type MyDayRoundProps = {
  rodada: RodadaJogo;
  onFinish: (respostas: RespostaRodada[], duracaoSeg: number) => void;
  onExit: () => void;
};

/**
 * Uma carta de dose. `certaFinal` guarda se a colocacao final valeu, para o app desenhar o
 * lembrete sem mudar o que vai no `escolhidaFinal` — o backend recebe a escolha de verdade.
 */
type Colocacao = {
  primeira?: number;
  final?: number;
  certaPrimeira?: boolean;
  certaFinal?: boolean;
};

type CartaSelecionada =
  | { tipo: "dose"; perguntaId: string }
  | { tipo: "missao"; indice: number };

type Feedback = {
  tipo: "acerto" | "correcao" | "dica";
  texto: string;
};

const TURNOS: readonly Turno[] = ["madrugada", "manha", "tarde", "noite"];
const ACERTO_COLORS = ["#63E6BE", "#20C997", "#FFFFFF", "#4DABF7", "#FFD43B"] as const;
const ACERTO_POWER = [130, 280] as const;

/**
 * Meu dia (SPEC-013 §5.4): linha do tempo de 24 h. Cada carta de dose vai no horario em que o
 * paciente toma o remedio; as missoes do plano entram em qualquer ponto do dia e nunca estao no
 * horario errado. Cartas do mesmo remedio sao intercambiaveis, como na correcao do backend.
 *
 * A carta e colocada em dois toques (carta, depois horario) em vez de arrasto: funciona com
 * leitor de tela e mantem o alvo de toque de 44 pontos.
 */
export function MyDayRound({ rodada, onFinish, onExit }: MyDayRoundProps) {
  const { width } = useWindowDimensions();
  const startedAtRef = useRef(Date.now());
  const perguntas = rodada.perguntas;
  const missoes = rodada.cartasLivres;
  const linha = perguntas[0]?.opcoes ?? [];

  const [colocacoes, setColocacoes] = useState<Record<string, Colocacao>>({});
  const [missoesNoDia, setMissoesNoDia] = useState<Record<number, number>>({});
  const [selecionada, setSelecionada] = useState<CartaSelecionada | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const primeiraPassadaCompleta = perguntas.every(
    (pergunta) => colocacoes[pergunta.id]?.primeira !== undefined
  );
  const dosesPostas = perguntas.filter((pergunta) => colocacoes[pergunta.id]?.final !== undefined);
  const missoesPostas = missoes.filter((_, indice) => missoesNoDia[indice] !== undefined);
  const totalCartas = perguntas.length + missoes.length;
  const postas = dosesPostas.length + missoesPostas.length;
  const terminou = postas === totalCartas;

  const porHorario = useMemo(() => {
    const mapa = new Map<number, { doses: PerguntaJogo[]; missoes: CartaLivre[] }>();
    const faixa = (indice: number) => {
      const atual = mapa.get(indice) ?? { doses: [], missoes: [] };
      mapa.set(indice, atual);
      return atual;
    };

    perguntas.forEach((pergunta) => {
      const colocacao = colocacoes[pergunta.id];

      if (colocacao?.final === undefined) {
        return;
      }

      // A carta certa fica onde o paciente colocou; a corrigida aparece no horario do gabarito,
      // mas o que vai para o backend continua a escolha de verdade.
      faixa(colocacao.certaFinal ? colocacao.final : pergunta.correta).doses.push(pergunta);
    });
    missoes.forEach((missao, indice) => {
      const horario = missoesNoDia[indice];

      if (horario !== undefined) {
        faixa(horario).missoes.push(missao);
      }
    });

    return mapa;
  }, [colocacoes, missoesNoDia, missoes, perguntas]);

  const selecionavel = (pergunta: PerguntaJogo) => {
    const colocacao = colocacoes[pergunta.id];

    if (colocacao?.final !== undefined) {
      return false;
    }

    return colocacao?.primeira === undefined || primeiraPassadaCompleta;
  };

  const selecionarDose = (pergunta: PerguntaJogo) => {
    if (!selecionavel(pergunta)) {
      return;
    }

    hapticSelection();
    setFeedback(null);
    setSelecionada((atual) =>
      atual?.tipo === "dose" && atual.perguntaId === pergunta.id
        ? null
        : { tipo: "dose", perguntaId: pergunta.id }
    );
  };

  const selecionarMissao = (indice: number) => {
    hapticSelection();
    setFeedback(null);
    setSelecionada((atual) =>
      atual?.tipo === "missao" && atual.indice === indice ? null : { tipo: "missao", indice }
    );
  };

  const colocarDose = (pergunta: PerguntaJogo, opcao: number) => {
    const colocacao = colocacoes[pergunta.id] ?? {};
    const revisao = colocacao.primeira !== undefined;
    const ocupados = perguntas
      .filter((outra) => outra.id !== pergunta.id)
      .map((outra) => {
        const outraColocacao = colocacoes[outra.id];

        return revisao
          ? outraColocacao?.certaFinal
            ? outraColocacao.final
            : undefined
          : outraColocacao?.certaPrimeira
            ? outraColocacao.primeira
            : undefined;
      })
      .filter((indice): indice is number => indice !== undefined);
    const certa = doseNoHorarioCerto(pergunta, perguntas, opcao, ocupados);

    setColocacoes((atuais) => ({
      ...atuais,
      [pergunta.id]: revisao
        ? { ...colocacao, final: opcao, certaFinal: certa }
        : {
            primeira: opcao,
            certaPrimeira: certa,
            final: certa ? opcao : undefined,
            certaFinal: certa ? true : undefined,
          },
    }));
    setSelecionada(null);
    setFeedback({
      tipo: certa ? "acerto" : "correcao",
      texto: certa ? pergunta.feedbackAcerto : pergunta.feedbackCorrecao,
    });

    if (certa) {
      hapticSuccess();
      setBurstKey(Date.now());
    } else {
      hapticImpact("light");
    }
  };

  const colocarNoHorario = (opcao: number) => {
    if (!selecionada) {
      setFeedback({ tipo: "dica", texto: "Primeiro toque em uma carta." });
      return;
    }

    if (selecionada.tipo === "missao") {
      hapticSelection();
      setMissoesNoDia((atuais) => ({ ...atuais, [selecionada.indice]: opcao }));
      setSelecionada(null);
      setFeedback({
        tipo: "acerto",
        texto: `${missoes[selecionada.indice]?.nome ?? "Missão"} às ${linha[opcao]}. Missão entra no horário que combina com o seu dia.`,
      });
      return;
    }

    const pergunta = perguntas.find((item) => item.id === selecionada.perguntaId);

    if (pergunta) {
      colocarDose(pergunta, opcao);
    }
  };

  const concluir = () => {
    if (terminou) {
      onFinish(buildRespostas(perguntas, colocacoes), elapsedSeconds(startedAtRef.current));
    }
  };

  const instrucao = !primeiraPassadaCompleta
    ? perguntas[0]?.enunciado
    : terminou
      ? "Seu dia está montado."
      : "Agora, reveja as cartas que ficaram para fixar o horário.";

  const naBandeja = perguntas.filter((pergunta) => colocacoes[pergunta.id]?.final === undefined);
  const missoesNaBandeja = missoes
    .map((missao, indice) => ({ missao, indice }))
    .filter(({ indice }) => missoesNoDia[indice] === undefined);

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
            {postas} de {totalCartas} cartas no dia
          </Text>
          <AnimatedXpBar ratio={postas / Math.max(1, totalCartas)} height={8} />
        </View>
      </View>

      <Animated.Text key={instrucao} entering={FadeIn.duration(260)} style={styles.instruction}>
        {instrucao}
      </Animated.Text>

      {naBandeja.length > 0 || missoesNaBandeja.length > 0 ? (
        <View style={styles.trayWrapper}>
          <Text style={styles.trayTitle}>Suas cartas</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tray}
          >
            {naBandeja.map((pergunta, index) => {
              const colocacao = colocacoes[pergunta.id];
              const rever = colocacao?.primeira !== undefined;
              const pode = selecionavel(pergunta);
              const ativa = selecionada?.tipo === "dose" && selecionada.perguntaId === pergunta.id;

              return (
                <Animated.View
                  key={pergunta.id}
                  entering={FadeInRight.delay(index * 60).duration(240)}
                  layout={LinearTransition.springify().damping(16)}
                >
                  <Pressable
                    onPress={() => selecionarDose(pergunta)}
                    disabled={!pode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa, disabled: !pode }}
                    accessibilityLabel={`Carta de ${pergunta.medicamentoNome}${
                      rever ? ", para rever" : ""
                    }`}
                    style={[
                      styles.card,
                      ativa ? styles.cardActive : null,
                      rever ? styles.cardReview : null,
                      !pode ? styles.cardWaiting : null,
                    ]}
                  >
                    <View style={styles.cardIcon}>
                      {rever ? (
                        <Undo2 size={18} color="#5F3DC4" />
                      ) : (
                        <Pill size={18} color="#1A5DB5" />
                      )}
                    </View>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {pergunta.medicamentoNome}
                    </Text>
                    <Text style={styles.cardKind}>{rever ? "rever" : "dose"}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}

            {missoesNaBandeja.map(({ missao, indice }) => {
              const info = CATEGORIA_INFO[missao.categoria ?? "OUTRO"];
              const Icon = info.icon;
              const ativa = selecionada?.tipo === "missao" && selecionada.indice === indice;

              return (
                <Animated.View
                  key={`missao-${indice}`}
                  entering={FadeInRight.delay(indice * 60).duration(240)}
                  layout={LinearTransition.springify().damping(16)}
                >
                  <Pressable
                    onPress={() => selecionarMissao(indice)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                    accessibilityLabel={`Carta de missão: ${missao.nome}`}
                    style={[
                      styles.card,
                      { backgroundColor: info.fundo },
                      ativa ? styles.cardActive : null,
                    ]}
                  >
                    <View style={styles.cardIcon}>
                      <Icon size={18} color={info.cor} />
                    </View>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {missao.nome}
                    </Text>
                    <Text style={[styles.cardKind, { color: info.cor }]}>missão</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {TURNOS.map((turno) => {
          const horarios = linha
            .map((rotulo, opcao) => ({ rotulo, opcao }))
            .filter(({ rotulo }) => turnoDoRotulo(rotulo) === turno);

          if (horarios.length === 0) {
            return null;
          }

          const info = TURNO_INFO[turno];
          const TurnoIcon = info.icon;

          return (
            <View key={turno} style={styles.turno}>
              <View style={styles.turnoHeader}>
                <TurnoIcon size={16} color={info.cor} />
                <Text style={[styles.turnoTitle, { color: info.cor }]}>{info.titulo}</Text>
              </View>

              {horarios.map(({ rotulo, opcao }) => {
                const faixa = porHorario.get(opcao);
                const vazia = !faixa || (faixa.doses.length === 0 && faixa.missoes.length === 0);
                const pronta = selecionada !== null;

                return (
                  <Pressable
                    key={`${rotulo}-${opcao}`}
                    onPress={() => colocarNoHorario(opcao)}
                    disabled={terminou}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: terminou }}
                    accessibilityLabel={`${rotulo}${
                      vazia
                        ? ", vazio"
                        : `, ${[
                            ...(faixa?.doses.map((dose) => dose.medicamentoNome) ?? []),
                            ...(faixa?.missoes.map((missao) => missao.nome) ?? []),
                          ].join(", ")}`
                    }`}
                    style={({ pressed }) => [
                      styles.slot,
                      pronta && !terminou ? styles.slotReady : null,
                      pressed && pronta ? styles.slotPressed : null,
                      !vazia ? styles.slotFilled : null,
                    ]}
                  >
                    <Text style={styles.slotHour}>{rotulo}</Text>
                    <View style={styles.slotBody}>
                      {faixa?.doses.map((dose) => {
                        const certa = colocacoes[dose.id]?.certaFinal === true;

                        return (
                          <Animated.View
                            key={dose.id}
                            entering={ZoomIn.springify().damping(10)}
                            style={[styles.chip, certa ? styles.chipOk : styles.chipTip]}
                          >
                            {certa ? (
                              <Check size={13} color="#0B5E3B" />
                            ) : (
                              <Lightbulb size={13} color="#4527A0" />
                            )}
                            <Text
                              style={[
                                styles.chipText,
                                certa ? styles.chipTextOk : styles.chipTextTip,
                              ]}
                              numberOfLines={1}
                            >
                              {dose.medicamentoNome}
                            </Text>
                          </Animated.View>
                        );
                      })}
                      {faixa?.missoes.map((missao, indice) => {
                        const info2 = CATEGORIA_INFO[missao.categoria ?? "OUTRO"];

                        return (
                          <Animated.View
                            key={`${missao.nome}-${indice}`}
                            entering={ZoomIn.springify().damping(10)}
                            style={[styles.chip, { backgroundColor: info2.fundo }]}
                          >
                            <Text
                              style={[styles.chipText, { color: info2.cor }]}
                              numberOfLines={1}
                            >
                              {missao.nome}
                            </Text>
                          </Animated.View>
                        );
                      })}
                      {vazia ? (
                        <Text style={styles.slotEmpty}>
                          {pronta ? "Toque para colocar aqui" : ""}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

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

      <View style={styles.footer}>
        <Pressable
          onPress={concluir}
          disabled={!terminou}
          accessibilityRole="button"
          accessibilityState={{ disabled: !terminou }}
          style={({ pressed }) => [
            styles.finishButton,
            !terminou ? styles.finishDisabled : null,
            pressed && terminou ? styles.finishPressed : null,
          ]}
        >
          <Text style={styles.finishText}>
            {terminou ? "Ver resultado" : "Coloque todas as cartas no dia"}
          </Text>
        </Pressable>
      </View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiBurst
          burstKey={burstKey}
          origin={{ x: width / 2, y: 220 }}
          count={20}
          colors={ACERTO_COLORS}
          spread={360}
          power={ACERTO_POWER}
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
  instruction: {
    color: "#12314C",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  trayWrapper: {
    gap: 6,
    paddingBottom: 8,
  },
  trayTitle: {
    color: "#4F6982",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 20,
  },
  tray: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 2,
  },
  card: {
    width: 116,
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D3DFEA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  cardActive: {
    borderColor: "#2C7BE5",
    backgroundColor: "#F0F7FF",
  },
  cardReview: {
    borderColor: "#B197FC",
  },
  cardWaiting: {
    opacity: 0.55,
  },
  cardIcon: {
    height: 22,
    justifyContent: "center",
  },
  cardName: {
    color: "#12314C",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  cardKind: {
    color: "#4F6982",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
  },
  turno: {
    gap: 6,
  },
  turnoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  turnoTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  slot: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3EAF2",
    borderStyle: "dashed",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F8FBFE",
  },
  slotReady: {
    borderColor: "#74A9EC",
    backgroundColor: "#FFFFFF",
  },
  slotPressed: {
    backgroundColor: "#E8F2FF",
  },
  slotFilled: {
    borderStyle: "solid",
    borderColor: "#CFDCEA",
    backgroundColor: "#FFFFFF",
  },
  slotHour: {
    width: 52,
    color: "#23405C",
    fontSize: 14,
    fontWeight: "800",
  },
  slotBody: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  slotEmpty: {
    color: "#7F93A8",
    fontSize: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
    backgroundColor: "#EEF2F6",
  },
  chipOk: {
    backgroundColor: "#E6FCF5",
  },
  chipTip: {
    backgroundColor: "#F3F0FF",
  },
  chipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextOk: {
    color: "#0B5E3B",
  },
  chipTextTip: {
    color: "#4527A0",
  },
  feedback: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    marginHorizontal: 16,
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
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  feedbackTextGood: {
    color: "#0B5E3B",
  },
  feedbackTextTip: {
    color: "#4527A0",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  finishButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0C8C6A",
  },
  finishPressed: {
    backgroundColor: "#0A7558",
  },
  finishDisabled: {
    backgroundColor: "#A9D9CB",
  },
  finishText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
