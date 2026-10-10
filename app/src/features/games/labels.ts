import {
  Apple,
  BedDouble,
  CalendarClock,
  Dumbbell,
  Footprints,
  GlassWater,
  Link2,
  ListChecks,
  Luggage,
  Milk,
  Moon,
  MoonStar,
  Package,
  Pill,
  Salad,
  Shirt,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  UtensilsCrossed,
  Volleyball,
  type LucideIcon,
} from "lucide-react-native";
import type { GradientColors } from "../gamification/theme";
import type { CategoriaMissao, Jogo } from "./types";

type GameInfo = {
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  cores: GradientColors;
};

/** Textos do app para os quatro jogos. Enunciados e feedbacks vem prontos do backend. */
export const GAME_INFO: Record<Jogo, GameInfo> = {
  MULTIPLA_ESCOLHA: {
    titulo: "Perguntas rápidas",
    descricao: "Uma pergunta por vez sobre a frequência e os horários dos seus medicamentos.",
    icon: ListChecks,
    cores: ["#4DABF7", "#1A6FD6"],
  },
  ASSOCIACAO: {
    titulo: "Ligue os pares",
    descricao: "Ligue cada medicamento ao intervalo entre as doses ou aos seus horários.",
    icon: Link2,
    cores: ["#9775FA", "#5F3DC4"],
  },
  MEU_DIA: {
    titulo: "Meu dia",
    descricao: "Monte o seu dia na linha do tempo: cada remédio no horário certo e suas missões.",
    icon: CalendarClock,
    cores: ["#4DD0A7", "#0C8C6A"],
  },
  ARRUME_A_MALA: {
    titulo: "Arrume a mala",
    descricao: "Você vai viajar. Leve a caixa de cada remédio e algo para cada missão do plano.",
    icon: Luggage,
    cores: ["#FFB357", "#E8720C"],
  },
};

type CategoriaInfo = {
  /** Rotulo em maiusculo inicial, para titulo de secao e rotulo acessivel. */
  titulo: string;
  icon: LucideIcon;
  cor: string;
  fundo: string;
};

/**
 * Como o app escreve e ilustra cada categoria de missao. O backend manda o rotulo em minusculas
 * dentro das frases; aqui so vale para etiquetas da interface.
 */
export const CATEGORIA_INFO: Record<CategoriaMissao, CategoriaInfo> = {
  ATIVIDADE_FISICA: {
    titulo: "Atividade física",
    icon: Dumbbell,
    cor: "#B9530C",
    fundo: "#FFF1E0",
  },
  HIDRATACAO: {
    titulo: "Hidratação",
    icon: GlassWater,
    cor: "#0B6E8F",
    fundo: "#E3F6FC",
  },
  ALIMENTACAO: {
    titulo: "Alimentação",
    icon: UtensilsCrossed,
    cor: "#1F7A41",
    fundo: "#E7F8EE",
  },
  DESCANSO: {
    titulo: "Descanso",
    icon: MoonStar,
    cor: "#4527A0",
    fundo: "#F0ECFF",
  },
  OUTRO: {
    titulo: "Outros cuidados",
    icon: Sparkles,
    cor: "#35506B",
    fundo: "#EEF2F6",
  },
};

/**
 * Ilustracao de cada objeto da mala pelo `codigo`. O catalogo do backend cresce sem mudanca de
 * codigo aqui: objeto desconhecido cai no icone da categoria e mostra o `rotulo` que veio
 * (SPEC-013 §7).
 */
const OBJETO_ICONS: Record<string, LucideIcon> = {
  TRAVESSEIRO: BedDouble,
  REDE: BedDouble,
  LENCOL: Shirt,
  COBERTOR: BedDouble,
  MASCARA_DE_DORMIR: MoonStar,
  TENIS: Footprints,
  BOLA_DE_FUTEBOL: Volleyball,
  ROUPA_DE_GINASTICA: Shirt,
  CORDA_DE_PULAR: Dumbbell,
  ELASTICO_DE_EXERCICIO: Dumbbell,
  GARRAFA_DE_AGUA: GlassWater,
  SQUEEZE: Milk,
  GARRAFINHA_TERMICA: GlassWater,
  MARMITINHA: Salad,
  FRUTAS: Apple,
  LANCHEIRA: Package,
};

/** Codigo reservado da caixa de remedio na prateleira (`ItemPrateleira.CODIGO_REMEDIO`). */
export const CODIGO_REMEDIO = "REMEDIO";

export const objetoIcon = (codigo: string, categoria: CategoriaMissao | null): LucideIcon => {
  if (codigo === CODIGO_REMEDIO) {
    return Pill;
  }

  return OBJETO_ICONS[codigo] ?? (categoria ? CATEGORIA_INFO[categoria].icon : Package);
};

export type Turno = "madrugada" | "manha" | "tarde" | "noite";

/** Os quatro turnos da linha do tempo do Meu dia, para o paciente se achar no dia. */
export const TURNO_INFO: Record<Turno, { titulo: string; icon: LucideIcon; cor: string }> = {
  madrugada: { titulo: "Madrugada", icon: Moon, cor: "#4527A0" },
  manha: { titulo: "Manhã", icon: Sunrise, cor: "#B9530C" },
  tarde: { titulo: "Tarde", icon: Sun, cor: "#A8690B" },
  noite: { titulo: "Noite", icon: Sunset, cor: "#1F4B7A" },
};
