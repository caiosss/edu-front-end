/** `LocalTime` serializado ("08:05:12.123") -> "08:05". */
export const formatClockTime = (value: string | null): string | null => {
  const match = value?.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
};

/** `LocalDate` serializado ("2026-09-10") -> "10/09/2026", sem passar por fuso. */
export const formatIsoDate = (value: string | null): string | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
};

export const capitalize = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const BRASILIA = "America/Sao_Paulo";

const parseInstant = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// O dominio raciocina em Brasilia (Fuso.java nos servicos); o instante chega com fuso.
const formatWith = (date: Date, options: Intl.DateTimeFormatOptions): string => {
  try {
    return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: BRASILIA }).format(date);
  } catch {
    return new Intl.DateTimeFormat("pt-BR", options).format(date);
  }
};

/** Instante com fuso (`OffsetDateTime`) -> "14/09/2026", no dia de Brasilia. */
export const formatDateBr = (value: string | null): string | null => {
  const date = parseInstant(value);
  return date ? formatWith(date, { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
};

/** Instante com fuso -> "14/09/2026 às 08:03", no horario de Brasilia. */
export const formatDateTimeBr = (value: string | null): string | null => {
  const date = parseInstant(value);

  if (!date) {
    return null;
  }

  const dia = formatWith(date, { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = formatWith(date, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dia} às ${hora}`;
};

const DIAS_DA_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** `LocalDate` ("2026-09-14") -> indice do dia da semana, sem passar por fuso. */
const weekdayOf = (value: string): number | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay()
    : null;
};

export const weekdayInitial = (value: string): string => {
  const weekday = weekdayOf(value);
  return weekday === null ? "" : DIAS_DA_SEMANA[weekday].charAt(0).toUpperCase();
};

export const weekdayName = (value: string): string => {
  const weekday = weekdayOf(value);
  return weekday === null ? value : DIAS_DA_SEMANA[weekday];
};

/** `LocalDate` -> "14/09". */
export const formatDayMonth = (value: string): string => {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[1]}` : value;
};

/** Hora local do aparelho -> "08:03". */
export const formatClock = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
