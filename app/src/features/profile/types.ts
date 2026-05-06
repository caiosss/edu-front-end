export type PatientProfileResponse = {
  dataTransplante: string;
  moedas: number;
  nivel: number;
  nomeCompleto: string;
  tipoTransplante: string;
  xpAtual: number;
  nomeCuidadores: string[];
};

export type CaregiverProfileResponse = {
  nomeCompleto: string;
  relacao: string;
  telefone: string;
  nomePacientes: string[];
};
