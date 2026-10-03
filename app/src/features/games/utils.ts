import type { Turno } from "./labels";
import type { PerguntaJogo, RespostaRodada } from "./types";

/** Escolhas de uma pergunta: a primeira tentativa e a final (repeticao, se houve). */
export type EscolhaPergunta = {
  primeira?: number;
  final?: number;
};

/**
 * Corpo do resultado (SPEC-012 §5.3). Toda pergunta precisa das duas escolhas; quem acertou de
 * primeira manda a mesma nas duas. O backend recorrige pelo gabarito gravado.
 */
export const buildRespostas = (
  perguntas: PerguntaJogo[],
  escolhas: Record<string, EscolhaPergunta>
): RespostaRodada[] =>
  perguntas.map((pergunta) => {
    const escolha = escolhas[pergunta.id] ?? {};
    const primeira = escolha.primeira ?? 0;

    return {
      perguntaId: pergunta.id,
      escolhidaPrimeira: primeira,
      escolhidaFinal: escolha.final ?? primeira,
    };
  });

export const elapsedSeconds = (startedAt: number): number =>
  Math.max(1, Math.round((Date.now() - startedAt) / 1000));

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Opcoes de `ITEM_MALA` (SPEC-013 §5.3): `correta` e sempre 0, "Na mala". */
export const MALA_NA_MALA = 0;
export const MALA_FORA_DA_MALA = 1;

/**
 * Horario da linha do tempo em minutos desde a meia-noite. As opcoes do Meu dia vem em ordem
 * cronologica no formato do backend (`FormatoHorario.hora`): "8h" ou "7h30".
 */
export const minutosDoRotulo = (rotulo: string): number => {
  const [hora, minuto] = rotulo.split("h");

  return Number(hora) * 60 + (minuto ? Number(minuto) : 0);
};

/** Turno de um horario da linha do tempo, para agrupar as 24 horas em blocos legiveis. */
export const turnoDoRotulo = (rotulo: string): Turno => {
  const hora = Math.floor(minutosDoRotulo(rotulo) / 60);

  if (hora < 6) {
    return "madrugada";
  }

  if (hora < 12) {
    return "manha";
  }

  return hora < 18 ? "tarde" : "noite";
};

/**
 * Cartas iguais sao intercambiaveis (SPEC-013 §5.4): a dose colocada vale se o horario esta no
 * gabarito do remedio e nenhuma outra carta do mesmo remedio ja o ocupou. E a mesma conta que o
 * backend faz ao comparar escolhas ordenadas com gabaritos ordenados, vista carta por carta.
 *
 * @param pergunta a carta que acabou de ser colocada
 * @param opcao    indice do horario escolhido
 * @param ocupados indices ja aceitos para o mesmo remedio nesta passada
 */
export const doseNoHorarioCerto = (
  pergunta: PerguntaJogo,
  perguntas: PerguntaJogo[],
  opcao: number,
  ocupados: number[]
): boolean => {
  const gabarito = perguntas
    .filter((outra) => outra.medicamentoNome === pergunta.medicamentoNome)
    .map((outra) => outra.correta);
  const restantes = [...gabarito];

  ocupados.forEach((indice) => {
    const posicao = restantes.indexOf(indice);

    if (posicao >= 0) {
      restantes.splice(posicao, 1);
    }
  });

  return restantes.includes(opcao);
};
