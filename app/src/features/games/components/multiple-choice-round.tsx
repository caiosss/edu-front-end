import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Check, Lightbulb, Undo2, X } from "lucide-react-native";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import { ConfettiBurst } from "../../gamification/components/confetti-burst";
import { hapticImpact, hapticSuccess } from "../../gamification/utils/haptics";
import type { RespostaRodada, RodadaJogo } from "../types";
import { OPTION_LETTERS, buildRespostas, elapsedSeconds, type EscolhaPergunta } from "../utils";

type MultipleChoiceRoundProps = {
  rodada: RodadaJogo;
  onFinish: (respostas: RespostaRodada[], duracaoSeg: number) => void;
  onExit: () => void;
};

type Etapa = {
  perguntaId: string;
  /** A pergunta respondida de outro jeito volta uma vez no fim da rodada (SPEC-012 §5.3). */
  repeticao: boolean;
};

type OptionState = "neutra" | "certa" | "escolhida" | "apagada";

const ACERTO_COLORS = ["#63E6BE", "#20C997", "#FFFFFF", "#4DABF7", "#FFD43B"] as const;
const ACERTO_POWER = [140, 300] as const;

function OptionButton({
  texto,
  index,
  estado,
  disabled,
  onPress,
}: {
  texto: string;
  index: number;
  estado: OptionState;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (estado === "certa") {
      scale.value = withSequence(
        withTiming(1.05, { duration: 140 }),
        withSpring(1, { damping: 6, stiffness: 180 })
      );
    }
  }, [estado, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const letra = OPTION_LETTERS[index] ?? String(index + 1);

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).duration(260)} style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Opção ${letra}: ${texto}${estado === "certa" ? ", resposta certa" : ""}${
          estado === "escolhida" ? ", sua escolha" : ""
        }`}
        accessibilityState={{ disabled, selected: estado === "escolhida" }}
        onPressIn={() => {
          if (!disabled) {
            scale.value = withTiming(0.97, { duration: 90 });
          }
        }}
        onPressOut={() => {
          if (!disabled) {
            scale.value = withSpring(1, { damping: 10 });
          }
        }}
        style={[
          styles.option,
          estado === "certa" ? styles.optionCorrect : null,
          estado === "escolhida" ? styles.optionChosen : null,
          estado === "apagada" ? styles.optionFaded : null,
        ]}
      >
        <View
          style={[
            styles.letter,
            estado === "certa" ? styles.letterCorrect : null,
            estado === "escolhida" ? styles.letterChosen : null,
          ]}
        >
          {estado === "certa" ? (
            <Check size={16} color="#FFFFFF" />
          ) : (
            <Text style={[styles.letterText, estado === "escolhida" ? styles.letterTextChosen : null]}>
              {letra}
            </Text>
          )}
        </View>
        <Text style={styles.optionText}>{texto}</Text>
        {estado === "escolhida" ? <Text style={styles.chosenTag}>sua escolha</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Multipla escolha (SPEC-012 §5.2): uma pergunta por vez, tres opcoes. Corrige na hora com o
 * feedback pronto do backend; nada aqui fala em erro.
 */
export function MultipleChoiceRound({ rodada, onFinish, onExit }: MultipleChoiceRoundProps) {
  const { width } = useWindowDimensions();
  const perguntasPorId = useMemo(
    () => new Map(rodada.perguntas.map((pergunta) => [pergunta.id, pergunta])),
    [rodada.perguntas]
  );
  const startedAtRef = useRef(Date.now());

  const [etapas, setEtapas] = useState<Etapa[]>(() =>
    rodada.perguntas.map((pergunta) => ({ perguntaId: pergunta.id, repeticao: false }))
  );
  const [indice, setIndice] = useState(0);
  const [escolhas, setEscolhas] = useState<Record<string, EscolhaPergunta>>({});
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const etapa = etapas[indice];
  const pergunta = perguntasPorId.get(etapa.perguntaId) ?? rodada.perguntas[0];
  const respondeu = selecionada !== null;
  const acertou = respondeu && selecionada === pergunta.correta;
  const ehUltima = indice >= etapas.length - 1;
  const respondidas = indice + (respondeu ? 1 : 0);

  const responder = (opcao: number) => {
    if (respondeu) {
      return;
    }

    const correta = opcao === pergunta.correta;
    setSelecionada(opcao);
    setEscolhas((atuais) => {
      const anterior = atuais[pergunta.id] ?? {};
      const proxima: EscolhaPergunta = etapa.repeticao
        ? { ...anterior, final: opcao }
        : { primeira: opcao, final: correta ? opcao : undefined };

      return { ...atuais, [pergunta.id]: proxima };
    });

    if (!etapa.repeticao && !correta) {
      setEtapas((atuais) => [...atuais, { perguntaId: pergunta.id, repeticao: true }]);
    }

    if (correta) {
      hapticSuccess();
      setBurstKey(Date.now());
    } else {
      hapticImpact("light");
    }
  };

  const avancar = () => {
    if (!respondeu) {
      return;
    }

    if (ehUltima) {
      onFinish(buildRespostas(rodada.perguntas, escolhas), elapsedSeconds(startedAtRef.current));
      return;
    }

    setIndice((atual) => atual + 1);
    setSelecionada(null);
  };

  const estadoDaOpcao = (opcao: number): OptionState => {
    if (!respondeu) {
      return "neutra";
    }

    if (opcao === pergunta.correta) {
      return "certa";
    }

    return opcao === selecionada ? "escolhida" : "apagada";
  };

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
          <X size={26} color="#35506B" />
        </Pressable>
        <View style={styles.headerProgress}>
          <Text style={styles.progressLabel}>
            Pergunta {Math.min(indice + 1, etapas.length)} de {etapas.length}
          </Text>
          <AnimatedXpBar ratio={respondidas / etapas.length} height={8} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View key={`pergunta-${indice}`} entering={FadeInRight.duration(280)} style={styles.questionCard}>
          {etapa.repeticao ? (
            <View style={styles.reviewChip}>
              <Undo2 size={14} color="#5F3DC4" />
              <Text style={styles.reviewText}>Revendo para fixar</Text>
            </View>
          ) : null}
          <Text style={styles.medication}>{pergunta.medicamentoNome}</Text>
          <Text style={styles.enunciado}>{pergunta.enunciado}</Text>
        </Animated.View>

        <View key={`opcoes-${indice}`} style={styles.options}>
          {pergunta.opcoes.map((opcao, index) => (
            <OptionButton
              key={`${indice}-${index}`}
              texto={opcao}
              index={index}
              estado={estadoDaOpcao(index)}
              disabled={respondeu}
              onPress={() => responder(index)}
            />
          ))}
        </View>

        {respondeu ? (
          <Animated.View
            entering={FadeInDown.springify().damping(14)}
            accessibilityLiveRegion="polite"
            style={[styles.feedback, acertou ? styles.feedbackGood : styles.feedbackTip]}
          >
            {acertou ? (
              <Check size={20} color="#0B7A4B" />
            ) : (
              <Lightbulb size={20} color="#5F3DC4" />
            )}
            <Text style={[styles.feedbackText, acertou ? styles.feedbackTextGood : styles.feedbackTextTip]}>
              {acertou ? pergunta.feedbackAcerto : pergunta.feedbackCorrecao}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={avancar}
          disabled={!respondeu}
          accessibilityRole="button"
          accessibilityState={{ disabled: !respondeu }}
          style={({ pressed }) => [
            styles.nextButton,
            !respondeu ? styles.nextButtonDisabled : null,
            pressed && respondeu ? styles.nextButtonPressed : null,
          ]}
        >
          <Text style={styles.nextText}>{respondeu && ehUltima ? "Ver resultado" : "Continuar"}</Text>
        </Pressable>
      </View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiBurst
          burstKey={burstKey}
          origin={{ x: width / 2, y: 240 }}
          count={14}
          colors={ACERTO_COLORS}
          spread={360}
          power={ACERTO_POWER}
          gravity={420}
          duration={1100}
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
    width: 52,
    height: 52,
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
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  questionCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
    gap: 8,
  },
  reviewChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F3F0FF",
  },
  reviewText: {
    color: "#5F3DC4",
    fontSize: 16,
    fontWeight: "800",
  },
  medication: {
    color: "#1A5DB5",
    fontSize: 18,
    fontWeight: "800",
  },
  enunciado: {
    color: "#12314C",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 31,
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D3DFEA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  optionCorrect: {
    borderColor: "#20C997",
    backgroundColor: "#E6FCF5",
  },
  optionChosen: {
    borderColor: "#ADB5BD",
    backgroundColor: "#F1F3F5",
  },
  optionFaded: {
    opacity: 0.55,
  },
  letter: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  letterCorrect: {
    backgroundColor: "#12B886",
  },
  letterChosen: {
    backgroundColor: "#DEE2E6",
  },
  letterText: {
    color: "#1A5DB5",
    fontSize: 17,
    fontWeight: "900",
  },
  letterTextChosen: {
    color: "#495057",
  },
  optionText: {
    flex: 1,
    color: "#12314C",
    fontSize: 19,
    fontWeight: "700",
  },
  chosenTag: {
    color: "#495057",
    fontSize: 15,
    fontWeight: "700",
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
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
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
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7BE5",
  },
  nextButtonPressed: {
    backgroundColor: "#1A5DB5",
  },
  nextButtonDisabled: {
    backgroundColor: "#A9C6EC",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
});
