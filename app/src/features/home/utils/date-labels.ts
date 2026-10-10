const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "Sexta-feira, 3 de outubro". Montado a mao para nao depender do Intl de cada aparelho. */
export const formatLongDate = (date: Date): string =>
  `${DIAS_DA_SEMANA[date.getDay()]}, ${date.getDate()} de ${MESES[date.getMonth()]}`;

export const greetingFor = (date: Date): string => {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "Bom dia";
  }

  if (hour >= 12 && hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
};

/** "Maria da Silva" -> "Maria". */
export const firstName = (fullName: string | null | undefined): string | null => {
  const name = fullName?.trim().split(/\s+/)[0];
  return name ? name : null;
};
