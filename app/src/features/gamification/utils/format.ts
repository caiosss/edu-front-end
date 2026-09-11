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
