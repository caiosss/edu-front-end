import { Text } from "react-native";
import {
  Apple,
  Award,
  BadgeCheck,
  CalendarCheck,
  Crown,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  Gem,
  GraduationCap,
  Heart,
  Medal,
  Moon,
  Pill,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

/** Catalogo semeado pelo gamification-service (AchievementsSeeder), que nao define `icone`. */
const ICONES_POR_CODIGO: Record<string, LucideIcon> = {
  PRIMEIRO_REGISTRO: BadgeCheck,
  SETE_DIAS_SEGUIDOS: Flame,
  CINQUENTA_NO_HORARIO: Timer,
  MES_CONSISTENTE: CalendarCheck,
  CONHECE_SUA_PRESCRICAO: GraduationCap,
  PRIMEIROS_MIL: Trophy,
};

/**
 * `icone` e texto livre cadastrado no catalogo. Casa por trecho do nome (em ingles ou
 * portugues, ex. "trophy", "fa-trophy", "trofeu_ouro"); emoji e renderizado como texto.
 */
const ICON_ALIASES: ReadonlyArray<readonly [readonly string[], LucideIcon]> = [
  [["trophy", "trofeu", "taca", "mil"], Trophy],
  [["medal", "medalha"], Medal],
  [["crown", "coroa"], Crown],
  [["award", "premio", "ribbon"], Award],
  [["flame", "fire", "fogo", "chama", "streak", "sequencia", "seguidos"], Flame],
  [["heart", "coracao", "cuidado"], Heart],
  [["pill", "remedio", "medicamento", "comprimido", "dose"], Pill],
  [["droplet", "water", "agua", "hidrat"], Droplet],
  [["sparkle", "brilho"], Sparkles],
  [["zap", "bolt", "raio", "energia"], Zap],
  [["target", "alvo", "meta", "objetivo"], Target],
  [["rocket", "foguete"], Rocket],
  [["sun", "sol", "manha"], Sun],
  [["moon", "lua", "sono", "descanso", "noite"], Moon],
  [["footprint", "passo", "caminhada", "walk"], Footprints],
  [["apple", "maca", "aliment", "food", "nutri"], Apple],
  [["dumbbell", "exercicio", "atividade", "fitness", "treino"], Dumbbell],
  [["shield", "escudo", "protecao"], Shield],
  [["gem", "diamond", "diamante", "joia"], Gem],
  [["timer", "horario", "relogio", "clock"], Timer],
  [["prescricao", "conhece", "aprend", "educa", "jogo"], GraduationCap],
  [["calendar", "calendario", "mes", "semana", "consistente"], CalendarCheck],
  [["check", "badge", "selo", "registro"], BadgeCheck],
  [["star", "estrela"], Star],
];

const normalizeIconName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[áàâãä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôõö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ç/g, "c");

const isEmoji = (value: string) =>
  value.length > 0 && value.length <= 8 && !/[a-zA-Z0-9À-ÿ]/.test(value);

const resolveByAlias = (value: string): LucideIcon | null => {
  const normalized = normalizeIconName(value);
  const match = ICON_ALIASES.find(([aliases]) =>
    aliases.some((alias) => normalized.includes(alias))
  );

  return match ? match[1] : null;
};

export const resolveAchievementIcon = (codigo: string | undefined, icone: string | null) =>
  (codigo ? ICONES_POR_CODIGO[codigo] : undefined) ??
  (icone ? resolveByAlias(icone) : null) ??
  (codigo ? resolveByAlias(codigo) : null) ??
  Trophy;

type AchievementIconProps = {
  codigo?: string;
  icone: string | null;
  size?: number;
  color?: string;
};

export function AchievementIcon({
  codigo,
  icone,
  size = 24,
  color = "#FFFFFF",
}: AchievementIconProps) {
  const trimmedIcon = icone?.trim() ?? "";

  if (isEmoji(trimmedIcon)) {
    return (
      <Text style={{ fontSize: size * 0.95, lineHeight: size * 1.2, textAlign: "center" }}>
        {trimmedIcon}
      </Text>
    );
  }

  const Icon = resolveAchievementIcon(codigo, trimmedIcon || null);

  return <Icon size={size} color={color} />;
}
