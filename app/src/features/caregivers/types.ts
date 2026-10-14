/** `EscopoCuidador` (SPEC-003 §5.5 e SPEC-014 §5.3): o que o paciente libera, cuidador a cuidador. */
export type EscopoCuidador =
  | "VER_ADESAO"
  | "VER_PROGRESSO"
  | "VER_MEDICACAO"
  | "RECEBER_ALERTA_DOSE"
  | "METAS_COOPERATIVAS"
  | "AGIR_PELO_PACIENTE"
  | "RECEBER_LEMBRETE_DOSE";

export const ESCOPOS_CUIDADOR: EscopoCuidador[] = [
  "VER_ADESAO",
  "VER_PROGRESSO",
  "VER_MEDICACAO",
  "RECEBER_ALERTA_DOSE",
  "METAS_COOPERATIVAS",
  "AGIR_PELO_PACIENTE",
  "RECEBER_LEMBRETE_DOSE",
];

/**
 * `StatusVinculo`. Desde a SPEC-014 o ciclo e CONVIDADO -> ATIVO -> REMOVIDO; PENDENTE e
 * RECUSADO sao do fluxo antigo e so aparecem em linhas antigas.
 */
export type StatusVinculo = "PENDENTE" | "ATIVO" | "RECUSADO" | "CONVIDADO" | "REMOVIDO";

/** `VinculoResponseDTO`: um cuidador do paciente, como o paciente o ve. */
export type CaregiverLink = {
  id: string;
  cuidadorId: string;
  nomeCompleto: string;
  email: string | null;
  telefone: string | null;
  relacao: string | null;
  status: StatusVinculo;
  escopos: EscopoCuidador[];
  dataVinculo: string | null;
};

/** `ConviteRequestDTO`. Sem senha: quem define a senha e o cuidador, pelo link do e-mail. */
export type CaregiverInvitePayload = {
  nomeCompleto: string;
  email: string;
  telefone: string;
  relacao: string;
};

/** `ConviteResponseDTO`. `FALHOU` nao desfaz o convite: o paciente reenvia. */
export type CaregiverInviteResult = {
  vinculo: CaregiverLink;
  envio: "ENVIADO" | "FALHOU";
};

/** `TermoResponseDTO`: o texto que precisa ser mostrado antes de pedir a concessao. */
export type ConsentTerm = {
  id: string;
  tipo: string;
  versao: number;
  titulo: string;
  corpo: string;
};

/** `ConsentimentoResponseDTO` */
export type PatientConsent = {
  id: string;
  tipo: string;
  versao: number | null;
  titulo: string;
  vigente: boolean;
};

export type CaregiverInviteFormValues = CaregiverInvitePayload;

export const caregiverInviteDefaultValues: CaregiverInviteFormValues = {
  nomeCompleto: "",
  email: "",
  telefone: "",
  relacao: "",
};

export type ActivateInviteFormValues = {
  token: string;
  senha: string;
  confirmarSenha: string;
};
