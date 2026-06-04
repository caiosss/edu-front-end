export type MedicationScheduleTone = "danger" | "info";

export type MedicationScheduleInfo = {
  disabledLabel?: string;
  isBlocked: boolean;
  isOverdue: boolean;
  noticeMessage?: string;
  noticeTone?: MedicationScheduleTone;
  scheduledTimeLabel: string;
  status: "available" | "blocked" | "overdue" | "unknown";
};

type ParsedMedicationTime = {
  hours: number;
  minutes: number;
};

const parseMedicationTime = (value: string): ParsedMedicationTime | null => {
  const parsedTime = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!parsedTime) {
    return null;
  }

  const hours = Number.parseInt(parsedTime[1], 10);
  const minutes = Number.parseInt(parsedTime[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
};

export const formatMedicationTimeLabel = (value: string): string => {
  const parsedTime = parseMedicationTime(value);

  if (!parsedTime) {
    return value.trim();
  }

  return `${parsedTime.hours.toString().padStart(2, "0")}:${parsedTime.minutes
    .toString()
    .padStart(2, "0")}`;
};

export const getMedicationScheduleInfo = (
  firstDoseTime: string,
  currentDate: Date = new Date()
): MedicationScheduleInfo => {
  const scheduledTime = parseMedicationTime(firstDoseTime);
  const scheduledTimeLabel = formatMedicationTimeLabel(firstDoseTime);

  if (!scheduledTime) {
    return {
      isBlocked: false,
      isOverdue: false,
      scheduledTimeLabel,
      status: "unknown",
    };
  }

  const scheduledMinutes = scheduledTime.hours * 60 + scheduledTime.minutes;
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

  if (currentMinutes < scheduledMinutes) {
    return {
      disabledLabel: "Aguardar",
      isBlocked: true,
      isOverdue: false,
      noticeMessage: `Disponivel a partir de ${scheduledTimeLabel}.`,
      noticeTone: "info",
      scheduledTimeLabel,
      status: "blocked",
    };
  }

  if (currentMinutes > scheduledMinutes) {
    return {
      isBlocked: false,
      isOverdue: true,
      noticeMessage: `Tome seu medicamento das ${scheduledTimeLabel}!`,
      noticeTone: "danger",
      scheduledTimeLabel,
      status: "overdue",
    };
  }

  return {
    isBlocked: false,
    isOverdue: false,
    scheduledTimeLabel,
    status: "available",
  };
};
