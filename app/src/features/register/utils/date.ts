const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const getLocalDateParts = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return { year, month, day };
};

export const formatDateToISO = (date: Date): string => {
  const { year, month, day } = getLocalDateParts(date);
  return `${year}-${month}-${day}`;
};

export const parseISOToDate = (value: string): Date | null => {
  if (!isoDatePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(year, month - 1, day);

  const isSameDate =
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day;

  return isSameDate ? parsedDate : null;
};

export const formatDateToBR = (value: string): string => {
  const parsedDate = parseISOToDate(value);

  if (!parsedDate) {
    return "";
  }

  return parsedDate.toLocaleDateString("pt-BR");
};

export const isDateInFuture = (value: string): boolean => {
  const parsedDate = parseISOToDate(value);

  if (!parsedDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsedDate > today;
};

export const isBeforeDate = (firstDate: string, secondDate: string): boolean => {
  const first = parseISOToDate(firstDate);
  const second = parseISOToDate(secondDate);

  if (!first || !second) {
    return false;
  }

  return first < second;
};
