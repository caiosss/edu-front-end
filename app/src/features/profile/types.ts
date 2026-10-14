import type { EscopoCuidador, StatusVinculo } from "../caregivers/types";

/** `PacienteResponseDTO`, sem os campos de progresso: eles vem de `/gamification/perfil`. */
export type PatientProfileResponse = {
  id: string;
  dataTransplante: string;
  nomeCompleto: string;
  tipoTransplante: string;
  nomeCuidadores: string[];
};

/**
 * `CuidadorPerfilDTO` (SPEC-014 §5.7). E daqui que o app do cuidador tira o `pacienteId` sobre
 * o qual agir: ele nao vai no token, onde `pacienteId` significa "sou este paciente".
 */
export type CaregiverProfileResponse = {
  id: string;
  nomeCompleto: string;
  email: string | null;
  relacao: string | null;
  telefone: string | null;
  pacienteId: string | null;
  pacienteNome: string | null;
  status: StatusVinculo | null;
  escopos: EscopoCuidador[];
};
