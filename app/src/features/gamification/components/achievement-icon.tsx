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
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

/**
 * `Conquistas.icone` e texto livre cadastrado pelo portal. Casa por trecho do nome (em ingles
 * ou portugues, ex. "trophy", "fa-trophy", "trofeu_ouro"); emoji e renderizado como texto.
 */
const ICON_ALIASES: ReadonlyArray<readonly [readonly string[], LucideIcon]> = [
  [["trophy", "trofeu", "taca"], Trophy],
  [["medal", "medalha"], Medal],
  [["crown", "coroa", "rei"], Crown],
  [["award", "premio", "ribbon"], Award],
  [["flame", "fire", "fogo", "chama", "streak", "sequencia"], Flame],
  [["heart", "coracao", "saude", "cuidado"], Heart],
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
  [["calendar", "calendario", "dia", "semana"], CalendarCheck],
  [["check", "badge", "selo"], BadgeCheck],
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

export const resolveAchievementIcon = (icone: string): LucideIcon => {
  const normalized = normalizeIconName(icone);
  const match = ICON_ALIASES.find(([aliases]) =>
    aliases.some((alias) => normalized.includes(alias))
  );

  return match ? match[1] : Trophy;
};

type AchievementIconProps = {
  icone: string;
  size?: number;
  color?: string;
};

export function AchievementIcon({ icone, size = 24, color = "#FFFFFF" }: AchievementIconProps) {
  const trimmedIcon = icone.trim();

  if (isEmoji(trimmedIcon)) {
    return (
      <Text style={{ fontSize: size * 0.95, lineHeight: size * 1.2, textAlign: "center" }}>
        {trimmedIcon}
      </Text>
    );
  }

  const Icon = resolveAchievementIcon(trimmedIcon);

  return <Icon size={size} color={color} />;
}
