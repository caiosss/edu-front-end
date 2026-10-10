/**
 * Doses do dia de um item da prescricao, a partir de `horarioPrimeiraDose` e `frequenciaHoras`.
 * A dose "vigente" e a ultima cujo horario ja chegou; `concluida` em `/missoes/minhas` se
 * refere a ela ("a dose prevista agora ja foi registrada").
 */
export type DoseTime = {
  hours: number;
  minutes: number;
};

/**
 * - `upcoming`: nenhuma dose do dia chegou ainda; nao da para registrar.
 * - `due`: a dose vigente chegou ha menos de `ON_TIME_TOLERANCE_MINUTES`.
 * - `late`: a dose vigente passou da tolerancia e nao foi registrada.
 * - `done`: a dose vigente ja foi registrada.
 */
export type DoseStatus = "upcoming" | "due" | "late" | "done";

export type MedicationDoseInfo = {
  status: DoseStatus;
  /** A dose vigente, ou a primeira do dia quando nenhuma chegou. Nulo se o horario e invalido. */
  doseTime: DoseTime | null;
  /** A proxima dose depois de agora, no mesmo dia. */
  nextDoseTime: DoseTime | null;
};

/** Tempo depois do horario em que a dose ainda conta como "na hora", antes de virar atrasada. */
export const ON_TIME_TOLERANCE_MINUTES = 30;

const MINUTES_PER_DAY = 24 * 60;

const toMinutes = ({ hours, minutes }: DoseTime) => hours * 60 + minutes;

/** Brasilia nao tem horario de verao desde 2019: UTC-3 fixo, usado se o Intl nao tiver fusos. */
const BRASILIA_UTC_OFFSET_MINUTES = -3 * 60;

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

/** "de 8 em 8 horas"; vazio quando e dose unica no dia. */
export const formatDoseFrequency = (frequencyHours: number): string =>
  frequencyHours > 0 && frequencyHours < 24 ? `de ${frequencyHours} em ${frequencyHours} horas` : "";

/**
 * Horarios do dia, da primeira dose ate meia-noite. Doses que cairiam depois da meia-noite
 * pertencem ao dia seguinte e nao entram aqui.
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

export const getMedicationDoseInfo = (
  firstDoseValue: string,
  frequencyHours: number,
  isCurrentDoseRegistered: boolean,
  now: Date = new Date()
): MedicationDoseInfo => {
  const firstDose = parseDoseTime(firstDoseValue);

  if (!firstDose) {
    return {
      status: isCurrentDoseRegistered ? "done" : "due",
      doseTime: null,
      nextDoseTime: null,
    };
  }

  const nowMinutes = brasiliaMinutesOfDay(now);
  const doseTimes = getDailyDoseTimes(firstDose, frequencyHours);
  const arrivedDoses = doseTimes.filter((time) => toMinutes(time) <= nowMinutes);
  const currentDose = arrivedDoses[arrivedDoses.length - 1] ?? null;
  const nextDose = doseTimes.find((time) => toMinutes(time) > nowMinutes) ?? null;

  if (!currentDose) {
    return { status: "upcoming", doseTime: nextDose, nextDoseTime: nextDose };
  }

  if (isCurrentDoseRegistered) {
    return { status: "done", doseTime: currentDose, nextDoseTime: nextDose };
  }

  const isLate = nowMinutes - toMinutes(currentDose) > ON_TIME_TOLERANCE_MINUTES;

  return {
    status: isLate ? "late" : "due",
    doseTime: currentDose,
    nextDoseTime: nextDose,
  };
};

/** Identifica a dose vigente; muda quando um novo horario chega e pede para recarregar a lista. */
export const doseSlotKey = (itemId: string, info: MedicationDoseInfo): string =>
  `${itemId}@${info.status === "upcoming" || !info.doseTime ? "-" : toMinutes(info.doseTime)}`;

export type MedicationScheduleInfo = MedicationDoseInfo & {
  /** Horario da dose vigente ("8h"), ou o texto original quando nao da para ler o horario. */
  scheduledTimeLabel: string;
  slotKey: string;
  disabledLabel?: string;
  noticeMessage?: string;
  noticeTone?: "danger" | "info";
};

/** A situacao da dose ja com os textos do checklist da tela Inicio. */
export const getMedicationScheduleInfo = (
  itemId: string,
  firstDoseValue: string,
  frequencyHours: number,
  isCurrentDoseRegistered: boolean,
  now: Date = new Date()
): MedicationScheduleInfo => {
  const info = getMedicationDoseInfo(firstDoseValue, frequencyHours, isCurrentDoseRegistered, now);
  const scheduledTimeLabel = info.doseTime ? formatDoseTime(info.doseTime) : firstDoseValue.trim();
  const base = { ...info, scheduledTimeLabel, slotKey: doseSlotKey(itemId, info) };
  // "a partir da 1h", mas "a partir das 8h".
  const article = info.doseTime?.hours === 1 ? "da" : "das";

  if (info.status === "upcoming") {
    return {
      ...base,
      disabledLabel: "Aguarde",
      noticeMessage: `Disponível a partir ${article} ${scheduledTimeLabel}.`,
      noticeTone: "info",
    };
  }

  if (info.status === "late") {
    return {
      ...base,
      noticeMessage: `O horário ${article} ${scheduledTimeLabel} já passou.`,
      noticeTone: "danger",
    };
  }

  return base;
};
