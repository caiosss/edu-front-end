import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  ZoomIn,
} from "react-native-reanimated";
import { Check, Lightbulb, Luggage, X } from "lucide-react-native";
import { AnimatedXpBar } from "../../gamification/components/animated-xp-bar";
import { ConfettiBurst } from "../../gamification/components/confetti-burst";
import { hapticImpact, hapticSelection, hapticSuccess } from "../../gamification/utils/haptics";
import { CATEGORIA_INFO, CODIGO_REMEDIO, objetoIcon } from "../labels";
import type { ItemPrateleira, PerguntaJogo, RespostaRodada, RodadaJogo } from "../types";
import {
  MALA_FORA_DA_MALA,
  MALA_NA_MALA,
  buildRespostas,
  elapsedSeconds,
  type EscolhaPergunta,
} from "../utils";

type PackBagRoundProps = {
  rodada: RodadaJogo;
  onFinish: (respostas: RespostaRodada[], duracaoSeg: number) => void;
  onExit: () => void;
};

/** Arrumando -> fechou uma vez (tentativa primeira) -> completa e fecha de novo (final). */
type Fase = "arrumando" | "lembretes";

const MALA_GRADIENT = ["#FFD9A8", "#FFB357"] as const;
const FECHOU_COLORS = ["#FFD43B", "#FFE8A3", "#FFFFFF", "#63E6BE", "#4DABF7"] as const;
const FECHOU_POWER = [140, 300] as const;

/** Chave estavel de um item da prateleira: o mesmo codigo pode voltar com rotulo diferente. */
const chaveDoItem = (item: ItemPrateleira, indice: number) =>
  `${item.codigo}-${item.medicamentoNome ?? item.rotulo}-${indice}`;

/**
 * Um item obrigatorio esta atendido? Remedio pela sua caixa; categoria por qualquer objeto dela
 * (SPEC-013 §5.3). Na pergunta de categoria o `medicamentoNome` guarda o rotulo da categoria, por
 * isso a comparacao de remedio exige o codigo `REMEDIO`.
 */
const atendida = (escolhidos: readonly ItemPrateleira[], pergunta: PerguntaJogo): boolean =>
  escolhidos.some((item) =>
    pergunta.categoria
      ? item.categoria === pergunta.categoria && item.codigo !== CODIGO_REMEDIO
      : item.codigo === CODIGO_REMEDIO && item.medicamentoNome === pergunta.medicamentoNome
  );

/**
 * Arrume a mala (SPEC-013 §5.3): checklist de viagem, sem distrator. Cada remedio ativo e cada
 * categoria do plano precisa entrar; objeto a mais nao conta nem pesa. A categoria conta como
 * "na mala" quando qualquer objeto dela entrou.
 *
 * Ao fechar a mala pela primeira vez o app guarda a tentativa primeira, mostra o lembrete de
 * cada item que falta e deixa o paciente completar; a segunda vez e a tentativa final.
 */
export function PackBagRound({ rodada, onFinish, onExit }: PackBagRoundProps) {
  const { width } = useWindowDimensions();
  const startedAtRef = useRef(Date.now());
  const perguntas = rodada.perguntas;
  const prateleira = rodada.prateleira;

  const [naMala, setNaMala] = useState<Record<string, boolean>>({});
  const [fase, setFase] = useState<Fase>("arrumando");
  const [primeiras, setPrimeiras] = useState<Record<string, number>>({});
  const [burstKey, setBurstKey] = useState(0);

  const itens = useMemo(
    () => prateleira.map((item, indice) => ({ item, chave: chaveDoItem(item, indice) })),
    [prateleira]
  );
  const escolhidos = itens.filter(({ chave }) => naMala[chave]);
  const faltando = perguntas.filter((pergunta) => !atendida(escolhidos.map(({ item }) => item), pergunta));
  const prontas = perguntas.length - faltando.length;

  const alternar = (chave: string) => {
    const proximos = { ...naMala, [chave]: naMala[chave] !== true };
    const proximosItens = itens.filter((cell) => proximos[cell.chave]).map(({ item }) => item);
    const completou =
      faltando.length > 0 && perguntas.every((pergunta) => atendida(proximosItens, pergunta));

    setNaMala(proximos);

    if (completou) {
      hapticSuccess();
      setBurstKey(Date.now());
      return;
    }

    hapticSelection();
  };

  const fechar = () => {
    const estado: Record<string, number> = {};

    perguntas.forEach((pergunta) => {
      estado[pergunta.id] = faltando.includes(pergunta) ? MALA_FORA_DA_MALA : MALA_NA_MALA;
    });

    if (fase === "arrumando") {
      setPrimeiras(estado);

      if (faltando.length > 0) {
        // Falta item: o lembrete entra, a mala continua aberta e a segunda rodada e a final.
        hapticImpact("light");
        setFase("lembretes");
        return;
      }
    }

    const escolhas: Record<string, EscolhaPergunta> = {};

    perguntas.forEach((pergunta) => {
      escolhas[pergunta.id] = {
        primeira: (fase === "arrumando" ? estado : primeiras)[pergunta.id],
        final: estado[pergunta.id],
      };
    });

    hapticSuccess();
    onFinish(buildRespostas(perguntas, escolhas), elapsedSeconds(startedAtRef.current));
  };

  const enunciado = perguntas[0]?.enunciado ?? "";

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
            {prontas} de {perguntas.length} itens do seu cuidado
          </Text>
          <AnimatedXpBar ratio={prontas / Math.max(1, perguntas.length)} height={8} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeIn.duration(260)} style={styles.instruction}>
          {enunciado}
        </Animated.Text>

        <Animated.View entering={FadeInUp.duration(300).springify().damping(16)}>
          <LinearGradient
            colors={MALA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bag}
          >
            <View style={styles.bagHeader}>
              <Luggage size={22} color="#8A4B06" />
              <Text style={styles.bagTitle}>Sua mala</Text>
              <Text style={styles.bagCount}>
                {escolhidos.length === 1 ? "1 item" : `${escolhidos.length} itens`}
              </Text>
            </View>

            {escolhidos.length === 0 ? (
              <Text style={styles.bagEmpty}>
                A mala está vazia. Toque nos itens da prateleira para colocar.
              </Text>
            ) : (
              <View style={styles.bagItems}>
                {escolhidos.map(({ item, chave }) => {
                  const Icon = objetoIcon(item.codigo, item.categoria);

                  return (
                    <Animated.View
                      key={chave}
                      entering={ZoomIn.springify().damping(11)}
                      layout={LinearTransition.springify().damping(16)}
                    >
                      <Pressable
                        onPress={() => alternar(chave)}
                        accessibilityRole="button"
                        accessibilityLabel={`Tirar ${item.rotulo} da mala`}
                        style={styles.bagChip}
                      >
                        <Icon size={15} color="#8A4B06" />
                        <Text style={styles.bagChipText} numberOfLines={1}>
                          {item.rotulo}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {fase === "lembretes" ? (
          <Animated.View
            entering={FadeInDown.springify().damping(14)}
            accessibilityLiveRegion="polite"
            style={styles.reminders}
          >
            {faltando.length > 0 ? (
              <>
                <View style={styles.reminderHeader}>
                  <Lightbulb size={18} color="#5F3DC4" />
                  <Text style={styles.reminderTitle}>Ainda cabe mais no seu cuidado</Text>
                </View>
                {faltando.map((pergunta) => (
                  <Text key={pergunta.id} style={styles.reminderText}>
                    {pergunta.feedbackCorrecao}
                  </Text>
                ))}
              </>
            ) : (
              <View style={styles.reminderHeader}>
                <Check size={18} color="#0B7A4B" />
                <Text style={[styles.reminderTitle, styles.reminderTitleGood]}>
                  Tudo o que o seu cuidado pede está na mala.
                </Text>
              </View>
            )}
          </Animated.View>
        ) : null}

        <Text style={styles.shelfTitle}>Prateleira</Text>
        <View style={styles.shelf}>
          {itens.map(({ item, chave }, index) => {
            const escolhido = naMala[chave] === true;
            const Icon = objetoIcon(item.codigo, item.categoria);
            const remedio = item.codigo === CODIGO_REMEDIO;
            const info = item.categoria ? CATEGORIA_INFO[item.categoria] : null;
            const cor = remedio ? "#1A5DB5" : (info?.cor ?? "#35506B");

            return (
              <Animated.View
                key={chave}
                entering={FadeInDown.delay(60 + index * 40).duration(240)}
                style={styles.shelfCell}
              >
                <Pressable
                  onPress={() => alternar(chave)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: escolhido }}
                  accessibilityLabel={`${item.rotulo}${remedio ? ", caixa de remédio" : info ? `, ${info.titulo}` : ""}`}
                  style={({ pressed }) => [
                    styles.shelfItem,
                    remedio ? styles.shelfItemMed : null,
                    escolhido ? styles.shelfItemChosen : null,
                    pressed ? styles.shelfItemPressed : null,
                  ]}
                >
                  <View
                    style={[
                      styles.shelfIcon,
                      { backgroundColor: remedio ? "#E8F2FF" : (info?.fundo ?? "#EEF2F6") },
                    ]}
                  >
                    <Icon size={22} color={cor} />
                  </View>
                  <Text style={styles.shelfLabel} numberOfLines={2}>
                    {item.rotulo}
                  </Text>
                  {escolhido ? (
                    <Animated.View entering={ZoomIn.springify().damping(9)} style={styles.shelfCheck}>
                      <Check size={13} color="#FFFFFF" />
                    </Animated.View>
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={fechar}
          disabled={escolhidos.length === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: escolhidos.length === 0 }}
          style={({ pressed }) => [
            styles.finishButton,
            escolhidos.length === 0 ? styles.finishDisabled : null,
            pressed && escolhidos.length > 0 ? styles.finishPressed : null,
          ]}
        >
          <Luggage size={20} color="#FFFFFF" />
          <Text style={styles.finishText}>
            {fase === "lembretes" && faltando.length === 0 ? "Pronto, vamos viajar!" : "Fechar a mala"}
          </Text>
        </Pressable>
      </View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiBurst
          burstKey={burstKey}
          origin={{ x: width / 2, y: 240 }}
          count={14}
          colors={FECHOU_COLORS}
          spread={360}
          power={FECHOU_POWER}
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
    paddingBottom: 20,
    gap: 14,
  },
  instruction: {
    color: "#12314C",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 27,
  },
  bag: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    minHeight: 120,
    shadowColor: "#8A4B06",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  bagHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bagTitle: {
    flex: 1,
    color: "#7A4100",
    fontSize: 18,
    fontWeight: "800",
  },
  bagCount: {
    color: "#8A4B06",
    fontSize: 16,
    fontWeight: "800",
  },
  bagEmpty: {
    color: "#8A4B06",
    fontSize: 17,
    lineHeight: 24,
  },
  bagItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bagChip: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFF6E8",
  },
  bagChipText: {
    color: "#7A4100",
    fontSize: 16,
    fontWeight: "800",
    maxWidth: 150,
  },
  reminders: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
    backgroundColor: "#F3F0FF",
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderTitle: {
    flex: 1,
    color: "#4527A0",
    fontSize: 18,
    fontWeight: "800",
  },
  reminderTitleGood: {
    color: "#0B5E3B",
  },
  reminderText: {
    color: "#3B2A77",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
  },
  shelfTitle: {
    color: "#4F6982",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  shelf: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  shelfCell: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
  },
  shelfItem: {
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E3EAF2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: "#FDFEFF",
  },
  shelfItemMed: {
    borderColor: "#CFE1F8",
  },
  shelfItemChosen: {
    borderColor: "#E8720C",
    backgroundColor: "#FFF6E8",
  },
  shelfItemPressed: {
    backgroundColor: "#EEF4FA",
  },
  shelfIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shelfLabel: {
    color: "#23405C",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
  },
  shelfCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8720C",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  finishButton: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8720C",
  },
  finishPressed: {
    backgroundColor: "#C85F08",
  },
  finishDisabled: {
    backgroundColor: "#F3C89E",
  },
  finishText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
});
