import type { EscopoCuidador, StatusVinculo } from "./types";

type ScopeLabel = {
  title: string;
  description: string;
};

/**
 * Permissoes que o paciente ve na tela, na ordem em que aparecem. METAS_COOPERATIVAS fica de
 * fora: a SPEC-010 foi adiada (SPEC-014 §4). Se o vinculo ja tiver o escopo, ele e mantido.
 */
export const VISIBLE_SCOPES: EscopoCuidador[] = [
  "VER_MEDICACAO",
  "VER_ADESAO",
  "VER_PROGRESSO",
  "RECEBER_LEMBRETE_DOSE",
  "RECEBER_ALERTA_DOSE",
  "AGIR_PELO_PACIENTE",
];

export const SCOPE_LABELS: Record<EscopoCuidador, ScopeLabel> = {
  VER_MEDICACAO: {
    title: "Ver meus remédios",
    description: "Vê os remédios, as doses e os horários do meu tratamento.",
  },
  VER_ADESAO: {
    title: "Ver as doses que tomei",
    description: "Vê quais doses e atividades do dia já foram registradas.",
  },
  VER_PROGRESSO: {
    title: "Ver meu progresso",
    description: "Vê meu nível, minha sequência e minhas conquistas.",
  },
  RECEBER_LEMBRETE_DOSE: {
    title: "Receber o lembrete da dose",
    description: "Recebe um aviso no horário de cada dose, junto comigo.",
  },
  RECEBER_ALERTA_DOSE: {
    title: "Receber alerta de dose esquecida",
    description: "É avisado quando uma dose não for registrada depois dos lembretes.",
  },
  METAS_COOPERATIVAS: {
    title: "Metas em conjunto",
    description: "Acompanha metas feitas em conjunto comigo.",
  },
  AGIR_PELO_PACIENTE: {
    title: "Registrar por mim",
    description:
      "Marca as doses que tomei e as atividades do meu plano. Precisa também ver meus remédios e as doses que tomei.",
  },
};

/** Escopos que `AGIR_PELO_PACIENTE` exige no mesmo conjunto (SPEC-014 §5.3). */
export const SCOPES_REQUIRED_TO_ACT: EscopoCuidador[] = ["VER_MEDICACAO", "VER_ADESAO"];

export const STATUS_LABELS: Record<StatusVinculo, string> = {
  CONVIDADO: "Convite enviado",
  ATIVO: "Ativo",
  REMOVIDO: "Removido",
  PENDENTE: "Pendente",
  RECUSADO: "Recusado",
};
