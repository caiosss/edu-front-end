/** `PlanoMissaoItemResponseDTO` */
export type PlanoMissaoItemResponse = {
  id: string;
  missaoId: string;
  nomeMissao: string;
  descricaoMissao: string;
  categoria: string;
  concluida: boolean;
};

/** `PlanoMissaoResponseDTO` */
export type PlanoMissaoResponse = {
  id: string;
  nome: string;
  observacao: string;
  dataInicio: string;
  ativa: boolean;
  concluido: boolean;
  itens: PlanoMissaoItemResponse[];
};

/** `DiaSemana` do mission-service, com segunda primeiro. */
export type DiaSemana =
  | "SEGUNDA"
  | "TERCA"
  | "QUARTA"
  | "QUINTA"
  | "SEXTA"
  | "SABADO"
  | "DOMINGO";

/** Um horario do dia ("06:00") e a dose dele: o mesmo remedio pode ter doses diferentes. */
export type HorarioDose = {
  horario: string;
  dosagem: string;
};

/** Uma dose de hoje e se ela ja foi registrada (`DoseDeHojeDTO`). */
export type DoseDeHoje = HorarioDose & {
  registrada: boolean;
};

/**
 * `PrescricaoItemResponseDTO`. A posologia e `horarios` + `diasSemana`; `dosagem` e so o resumo
 * para listagens, e `frequenciaHoras` so existe em prescricao antiga.
 */
export type PrescricaoItemResponse = {
  id: string;
  medicamentoId: string;
  nomeMedicamento: string;
  tipoMedicamento: string;
  dosagem: string;
  frequenciaHoras: number | null;
  horarioPrimeiraDose: string;
  horarios: HorarioDose[];
  diasSemana: DiaSemana[];
  dosesDeHoje: DoseDeHoje[];
  concluido: boolean;
};

/** `PrescricaoResponseDTO` */
export type PrescricaoResponse = {
  id: string;
  pacienteId: string;
  nomePaciente: string;
  dataCriacao: string;
  ativo: boolean;
  concluido: boolean;
  itens: PrescricaoItemResponse[];
};

/**
 * Item de plano de missoes achatado para a Home. `id` e o id do **item do plano**
 * (`planoMissaoItemId`), unico por paciente.
 */
export type GeneralMissionResponse = {
  id: string;
  missaoId: string;
  planoId: string;
  planoNome: string;
  nome: string;
  descricao: string;
  categoria: string;
  observacao: string;
  dataInicio: string;
  ativa: boolean;
  concluida: boolean;
};

/**
 * Item de prescricao achatado para a Home. `id` e o id do **item da prescricao**
 * (`prescricaoItemId`). `concluida` significa "a dose prevista agora ja foi registrada".
 *
 * `horarios` nunca vem vazio: para backend antigo, sai derivado de `horarioPrimeiraDose` e
 * `frequenciaHoras`. `diasSemana` vazio = todos os dias. `dosesDeHoje` nulo = o backend nao
 * mandou, e vale `concluida`.
 */
export type MedicationMissionResponse = {
  id: string;
  prescricaoId: string;
  pacienteId: string;
  nomePaciente: string;
  nomeMedicamento: string;
  tipoMedicamento: string;
  dosagem: string;
  horarios: HorarioDose[];
  diasSemana: DiaSemana[];
  dosesDeHoje: DoseDeHoje[] | null;
  ativo: boolean;
  concluida: boolean;
};

export type MyMissionsResponse = {
  missoesGerais: GeneralMissionResponse[];
  missoesMedicamento: MedicationMissionResponse[];
};

/**
 * Corpo de `POST /missoes/concluir`. Sem `pacienteId`, o service usa o paciente da sessao; o
 * cuidador informa o paciente sobre o qual age (SPEC-014 §5.4).
 */
export type CompleteMissionPayload = {
  pacienteId?: string;
  planoMissaoItemId?: string;
  prescricaoItemId?: string;
};

/** `AutorRegistro`: quem fez o registro. Vem do token, nunca do corpo. */
export type AutorRegistro = "PACIENTE" | "CUIDADOR" | "MEDICO" | "ADMIN";

/** `DoseRegistradaDTO`: uma dose registrada hoje, de onde o paciente contesta (SPEC-014 §5.5). */
export type DoseRegistrada = {
  id: string;
  prescricaoItemId: string;
  horarioPrevisto: string | null;
  horarioRegistrado: string | null;
  registradoPor: AutorRegistro;
  contestada: boolean;
};
