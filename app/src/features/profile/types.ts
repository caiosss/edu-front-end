export type PatientProfileResponse = {
  id: string;
  dataTransplante: string;
  moedas: number;
  nivel: number;
  nomeCompleto: string;
  tipoTransplante: string;
  xpAtual: number;
  nomeCuidadores: string[];
};

export type CaregiverProfileResponse = {
  id: string;
  nomeCompleto: string;
  relacao: string;
  telefone: string;
  nomePacientes: string[];
};
