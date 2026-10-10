/** `PacienteResponseDTO`, sem os campos de progresso: eles vem de `/gamification/perfil`. */
export type PatientProfileResponse = {
  id: string;
  dataTransplante: string;
  nomeCompleto: string;
  tipoTransplante: string;
  nomeCuidadores: string[];
};

export type CaregiverProfileResponse = {
  id: string;
  nomeCompleto: string;
  relacao: string;
  telefone: string;
  nomePacientes: string[];
};
