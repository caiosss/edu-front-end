import type { DiaSemana, DoseDeHoje, HorarioDose } from "../types";

/**
 * Doses do dia de um item da prescricao, a partir dos `horarios` que o medico escreveu (cada um
 * com a sua dose) e dos `diasSemana` em que o remedio e tomado. A dose "vigente" e a ultima cujo
 * horario ja chegou; se ela ja foi registrada vem de `dosesDeHoje`, dose a dose.
 */
export type DoseTime = {
  hours: number;
  minutes: number;
};

/** Um horario do dia e quanto tomar nele. */
export type ScheduledDose = DoseTime & {
  dosagem: string;
};

/**
 * - `off-day`: hoje nao e dia deste remedio (ex.: so segunda, quarta e sexta).
 * - `upcoming`: nenhuma dose do dia chegou ainda; nao da para registrar.
 * - `due`: a dose vigente chegou ha menos de `ON_TIME_TOLERANCE_MINUTES`.
 * - `late`: a dose vigente passou da tolerancia e nao foi registrada.
 * - `done`: a dose vigente ja foi registrada.
 */
export type DoseStatus = "off-day" | "upcoming" | "due" | "late" | "done";

export type MedicationDoseInfo = {
  status: DoseStatus;
  /** A dose vigente, ou a primeira do dia quando nenhuma chegou. Nulo fora do dia do remedio. */
  dose: ScheduledDose | null;
  /** A proxima dose depois de agora, no mesmo dia. */
  nextDose: ScheduledDose | null;
};

/** O que o calculo precisa do item; `MedicationMissionResponse` serve direto. */
export type MedicationScheduleSource = {
  id: string;
  horarios: HorarioDose[];
  diasSemana: DiaSemana[];
  dosesDeHoje: DoseDeHoje[] | null;
  concluida: boolean;
};

/** Tempo depois do horario em que a dose ainda conta como "na hora", antes de virar atrasada. */
export const ON_TIME_TOLERANCE_MINUTES = 30;

const MINUTES_PER_DAY = 24 * 60;

const toMinutes = ({ hours, minutes }: DoseTime) => hours * 60 + minutes;

/** Brasilia nao tem horario de verao desde 2019: UTC-3 fixo, usado se o Intl nao tiver fusos. */
const BRASILIA_UTC_OFFSET_MINUTES = -3 * 60;

/** Na ordem de `Date.getDay()`: domingo e o 0. */
const DIAS_POR_GETDAY: DiaSemana[] = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
];

const WEEKDAY_EN: Record<string, DiaSemana> = {
  Sun: "DOMINGO",
  Mon: "SEGUNDA",
  Tue: "TERCA",
  Wed: "QUARTA",
  Thu: "QUINTA",
  Fri: "SEXTA",
  Sat: "SABADO",
};

/** "na segunda", "no sabado": como se fala o dia da proxima dose. */
const NOME_DO_DIA: Record<DiaSemana, string> = {
  SEGUNDA: "na segunda",
  TERCA: "na terça",
  QUARTA: "na quarta",
  QUINTA: "na quinta",
  SEXTA: "na sexta",
  SABADO: "no sábado",
  DOMINGO: "no domingo",
};

const SIGLA_DO_DIA: Record<DiaSemana, string> = {
  SEGUNDA: "seg",
  TERCA: "ter",
  QUARTA: "qua",
  QUINTA: "qui",
  SEXTA: "sex",
  SABADO: "sáb",
  DOMINGO: "dom",
};

/**
 * Minutos desde a meia-noite em Brasilia. O backend decide qual e a dose vigente pelo horario
 * de Brasilia (Fuso.java), entao o app usa o mesmo relogio, mesmo com o aparelho em outro fuso.
 */
const brasiliaMinutesOfDay = (date: Date): number => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hours = Number(parts.find((part) => part.type === "hour")?.value);
    const minutes = Number(parts.find((part) => part.type === "minute")?.value);

    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return (hours % 24) * 60 + minutes;
    }
  } catch {
    // Sem suporte a fusos no Intl: cai no calculo por deslocamento fixo.
  }

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + BRASILIA_UTC_OFFSET_MINUTES + MINUTES_PER_DAY) % MINUTES_PER_DAY;
};

/** O dia da semana em Brasilia, pelo mesmo motivo de `brasiliaMinutesOfDay`. */
export const brasiliaWeekday = (date: Date): DiaSemana => {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
    }).format(date);

    if (WEEKDAY_EN[weekday]) {
      return WEEKDAY_EN[weekday];
    }
  } catch {
    // Sem suporte a fusos no Intl: cai no calculo por deslocamento fixo.
  }

  const shifted = new Date(date.getTime() + BRASILIA_UTC_OFFSET_MINUTES * 60 * 1000);
  return DIAS_POR_GETDAY[shifted.getUTCDay()];
};

const fromMinutes = (totalMinutes: number): DoseTime => ({
  hours: Math.floor(totalMinutes / 60),
  minutes: totalMinutes % 60,
});

export const parseDoseTime = (value: string): DoseTime | null => {
  const parsedTime = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?/);

  if (!parsedTime) {
    return null;
  }

  const hours = Number.parseInt(parsedTime[1], 10);
  const minutes = Number.parseInt(parsedTime[2], 10);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
};

/** "8h", "8h30", "20h": o jeito como se fala o horario no dia a dia. */
export const formatDoseTime = ({ hours, minutes }: DoseTime): string =>
  minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, "0")}`;

/** "às 8h", mas "à 1h". */
export const formatAtTime = (time: DoseTime): string =>
  `${time.hours === 1 ? "à" : "às"} ${formatDoseTime(time)}`;

/** "seg, qua e sex"; vazio quando e todos os dias. */
export const formatWeekdays = (dias: DiaSemana[]): string => {
  if (dias.length === 0 || dias.length === 7) {
    return "";
  }

  const siglas = DIAS_POR_GETDAY.slice(1)
    .concat("DOMINGO")
    .filter((dia) => dias.includes(dia))
    .map((dia) => SIGLA_DO_DIA[dia]);

  return siglas.length === 1
    ? `só ${siglas[0]}`
    : `${siglas.slice(0, -1).join(", ")} e ${siglas[siglas.length - 1]}`;
};

/**
 * Horarios de uma prescricao antiga ("a cada N horas a partir da primeira dose"), da primeira
 * dose ate meia-noite. Doses que cairiam depois da meia-noite pertencem ao dia seguinte.
 */
export const getDailyDoseTimes = (firstDose: DoseTime, frequencyHours: number): DoseTime[] => {
  if (frequencyHours <= 0 || frequencyHours >= 24) {
    return [firstDose];
  }

  const times: DoseTime[] = [];

  for (
    let totalMinutes = toMinutes(firstDose);
    totalMinutes < MINUTES_PER_DAY;
    totalMinutes += frequencyHours * 60
  ) {
    times.push(fromMinutes(totalMinutes));
  }

  return times;
};

/** Os horarios do item que o app sabe ler, em ordem. */
export const getScheduledDoses = (horarios: HorarioDose[]): ScheduledDose[] =>
  horarios
    .flatMap((horario) => {
      const time = parseDoseTime(horario.horario);
      return time ? [{ ...time, dosagem: horario.dosagem }] : [];
    })
    .sort((a, b) => toMinutes(a) - toMinutes(b));

export const takesOn = (dias: DiaSemana[], dia: DiaSemana): boolean =>
  dias.length === 0 || dias.includes(dia);

/** O proximo dia da semana do remedio depois de hoje ("amanha", "na quarta"). */
const nextDayLabel = (dias: DiaSemana[], today: DiaSemana): string | null => {
  const todayIndex = DIAS_POR_GETDAY.indexOf(today);

  for (let offset = 1; offset <= 7; offset += 1) {
    const dia = DIAS_POR_GETDAY[(todayIndex + offset) % 7];

    if (takesOn(dias, dia)) {
      return offset === 1 ? "amanhã" : NOME_DO_DIA[dia];
    }
  }

  return null;
};

/** A dose vigente ja foi registrada? Dose a dose quando o backend manda; senao, `concluida`. */
const isRegistered = (source: MedicationScheduleSource, dose: DoseTime): boolean => {
  if (!source.dosesDeHoje) {
    return source.concluida;
  }

  return source.dosesDeHoje.some((registro) => {
    const time = parseDoseTime(registro.horario);
    return registro.registrada && time !== null && toMinutes(time) === toMinutes(dose);
  });
};

export const getMedicationDoseInfo = (
  source: MedicationScheduleSource,
  now: Date = new Date()
): MedicationDoseInfo => {
  if (!takesOn(source.diasSemana, brasiliaWeekday(now))) {
    return { status: "off-day", dose: null, nextDose: null };
  }

  const doses = getScheduledDoses(source.horarios);

  if (doses.length === 0) {
    return { status: source.concluida ? "done" : "due", dose: null, nextDose: null };
  }

  const nowMinutes = brasiliaMinutesOfDay(now);
  const arrivedDoses = doses.filter((dose) => toMinutes(dose) <= nowMinutes);
  const currentDose = arrivedDoses[arrivedDoses.length - 1] ?? null;
  const nextDose = doses.find((dose) => toMinutes(dose) > nowMinutes) ?? null;

  if (!currentDose) {
    return { status: "upcoming", dose: nextDose, nextDose };
  }

  if (isRegistered(source, currentDose)) {
    return { status: "done", dose: currentDose, nextDose };
  }

  const isLate = nowMinutes - toMinutes(currentDose) > ON_TIME_TOLERANCE_MINUTES;

  return { status: isLate ? "late" : "due", dose: currentDose, nextDose };
};

/** Identifica a dose vigente; muda quando um novo horario chega e pede para recarregar a lista. */
export const doseSlotKey = (itemId: string, info: MedicationDoseInfo): string =>
  `${itemId}@${info.status === "upcoming" || !info.dose ? "-" : toMinutes(info.dose)}`;

export type MedicationScheduleInfo = MedicationDoseInfo & {
  /** Horario da dose vigente ("8h"). Vazio fora do dia do remedio. */
  scheduledTimeLabel: string;
  /** Quanto tomar na dose vigente: pode mudar de um horario para outro. */
  doseLabel: string;
  /** "seg, qua e sex"; vazio quando e todos os dias. */
  weekdaysLabel: string;
  /** Fora do dia: quando e a proxima dose ("amanhã às 8h", "na quarta às 8h"). */
  offDayLabel?: string;
  slotKey: string;
  disabledLabel?: string;
  noticeMessage?: string;
  noticeTone?: "danger" | "info";
};

/** A situacao da dose ja com os textos do checklist da tela Inicio. */
export const getMedicationScheduleInfo = (
  source: MedicationScheduleSource,
  now: Date = new Date()
): MedicationScheduleInfo => {
  const info = getMedicationDoseInfo(source, now);
  const base = {
    ...info,
    scheduledTimeLabel: info.dose ? formatDoseTime(info.dose) : "",
    doseLabel: info.dose?.dosagem.trim() ?? "",
    weekdaysLabel: formatWeekdays(source.diasSemana),
    slotKey: doseSlotKey(source.id, info),
  };

  if (info.status === "off-day") {
    const firstDose = getScheduledDoses(source.horarios)[0];
    const day = nextDayLabel(source.diasSemana, brasiliaWeekday(now));

    return {
      ...base,
      offDayLabel: day && firstDose ? `${day} ${formatAtTime(firstDose)}` : day ?? undefined,
    };
  }

  if (info.status === "upcoming" && info.dose) {
    return {
      ...base,
      disabledLabel: "Aguarde",
      noticeMessage: `Disponível a partir ${info.dose.hours === 1 ? "da" : "das"} ${base.scheduledTimeLabel}.`,
      noticeTone: "info",
    };
  }

  if (info.status === "late" && info.dose) {
    return {
      ...base,
      noticeMessage: `O horário ${info.dose.hours === 1 ? "da" : "das"} ${base.scheduledTimeLabel} já passou.`,
      noticeTone: "danger",
    };
  }

  return base;
};
