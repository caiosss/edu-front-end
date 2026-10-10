import axios from "axios";
import type {
  Conquista,
  DiaAdesao,
  EstadoDia,
  ExtratoLinha,
  ExtratoPagina,
  GamificationProfile,
  Nivel,
  PeriodoResumo,
  ResumoHoje,
  ResumoPeriodo,
  ResumoProgresso,
  Streak,
} from "../features/gamification/types";
import { api, extractApiErrorMessage } from "./api";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

const asObject = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const asNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const asCount = (value: unknown): number => Math.max(0, asNumber(value) ?? 0);

const normalizeNivel = (data: Record<string, unknown>, atualKey: string): Nivel => {
  const atual = asNumber(data[atualKey]);
  const xpNoNivel = asNumber(data.xpNoNivel);
  const xpParaProximo = asNumber(data.xpParaProximo);

  if (atual === null || xpNoNivel === null || xpParaProximo === null) {
    throw new Error("Resposta de gamificação inválida: nível ausente.");
  }

  return {
    atual: Math.max(1, atual),
    xpNoNivel: Math.max(0, xpNoNivel),
    xpParaProximo: Math.max(0, xpParaProximo),
  };
};

const normalizeStreak = (data: unknown): Streak => {
  const streak = asObject(data);

  return {
    atual: asCount(streak?.atual),
    recorde: asCount(streak?.recorde),
  };
};

export const normalizeConquista = (data: unknown): Conquista | null => {
  const conquista = asObject(data);
  const codigo = asNonEmptyString(conquista?.codigo);
  const titulo = asNonEmptyString(conquista?.titulo);

  if (!conquista || !codigo || !titulo) {
    return null;
  }

  const progresso = asObject(conquista.progresso);
  const alvo = asNumber(progresso?.alvo);

  return {
    codigo,
    titulo,
    descricao: asString(conquista.descricao) ?? "",
    icone: asNonEmptyString(conquista.icone),
    desbloqueadaEm: asNonEmptyString(conquista.desbloqueadaEm),
    progresso:
      progresso && alvo !== null && alvo > 0
        ? {
            atual: asCount(progresso.atual),
            alvo,
            unidade: asString(progresso.unidade) ?? "",
          }
        : null,
  };
};

const normalizeExtratoLinha = (data: unknown): ExtratoLinha | null => {
  const linha = asObject(data);
  const quando = asNonEmptyString(linha?.quando);

  if (!linha || !quando) {
    return null;
  }

  return {
    quando,
    motivo: asString(linha.motivo) ?? "",
    xp: asNumber(linha.xp) ?? 0,
    moedas: asNumber(linha.moedas) ?? 0,
    regraCodigo: asString(linha.regraCodigo) ?? "",
    regraVersao: asNumber(linha.regraVersao) ?? 1,
    origemTipo: asString(linha.origemTipo) ?? "",
  };
};

const ESTADOS_DIA: readonly EstadoDia[] = ["COMPLETO", "PARCIAL", "SEM_REGISTRO"];

const normalizeDia = (data: unknown): DiaAdesao | null => {
  const dia = asObject(data);
  const dataDoDia = asNonEmptyString(dia?.dia);

  if (!dia || !dataDoDia) {
    return null;
  }

  const registradas = asCount(dia.registradas);
  const estado = asString(dia.estado);

  return {
    dia: dataDoDia,
    previstas: asCount(dia.previstas),
    registradas,
    estado: ESTADOS_DIA.includes(estado as EstadoDia)
      ? (estado as EstadoDia)
      : registradas > 0
        ? "PARCIAL"
        : "SEM_REGISTRO",
  };
};

const normalizeHoje = (data: unknown): ResumoHoje | null => {
  const hoje = asObject(data);

  if (!hoje) {
    return null;
  }

  return {
    dosesPrevistas: asCount(hoje.dosesPrevistas),
    dosesRegistradas: asCount(hoje.dosesRegistradas),
    proximoHorario: asNonEmptyString(hoje.proximoHorario),
    missoesPrevistas: asCount(hoje.missoesPrevistas),
    missoesConcluidas: asCount(hoje.missoesConcluidas),
  };
};

const normalizePeriodo = (data: unknown): ResumoPeriodo | null => {
  const periodo = asObject(data);

  if (!periodo) {
    return null;
  }

  return {
    de: asString(periodo.de) ?? "",
    ate: asString(periodo.ate) ?? "",
    dosesPrevistas: asCount(periodo.dosesPrevistas),
    dosesRegistradas: asCount(periodo.dosesRegistradas),
    taxa: asNumber(periodo.taxa),
    dias: Array.isArray(periodo.dias)
      ? periodo.dias.map(normalizeDia).filter((dia): dia is DiaAdesao => dia !== null)
      : [],
  };
};

const toGamificationError = (error: unknown, action: string): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (!status) {
      return new FriendlyError(ERROR_MESSAGES.network);
    }

    if (status === 401 || status === 403) {
      return new FriendlyError(ERROR_MESSAGES.session);
    }

    if (status >= 500) {
      return new FriendlyError(ERROR_MESSAGES.server);
    }

    return new FriendlyError(
      extractApiErrorMessage(error.response?.data) ??
        `Não foi possível ${action} agora. Tente de novo.`
    );
  }

  return error instanceof Error ? error : new Error(`Falha ao ${action}.`);
};

/** `GET /gamification/perfil`: o paciente sai do token. */
export const fetchGamificationProfile = async (): Promise<GamificationProfile> => {
  try {
    const response = await api.get("/gamification/perfil");
    const perfil = asObject(response.data);
    const xpTotal = asNumber(perfil?.xpTotal);

    if (!perfil || xpTotal === null) {
      throw new Error("Resposta de perfil de progresso inválida.");
    }

    return {
      xpTotal: Math.max(0, xpTotal),
      nivel: normalizeNivel(perfil, "nivel"),
      moedas: asCount(perfil.moedas),
      streak: normalizeStreak(perfil.streak),
    };
  } catch (error) {
    throw toGamificationError(error, "carregar seu progresso");
  }
};

/** `GET /gamification/conquistas`: catalogo ativo, com desbloqueio e progresso parcial. */
export const fetchGamificationAchievements = async (): Promise<Conquista[]> => {
  try {
    const response = await api.get("/gamification/conquistas");

    if (!Array.isArray(response.data)) {
      throw new Error("Resposta de conquistas inválida.");
    }

    return response.data
      .map(normalizeConquista)
      .filter((conquista): conquista is Conquista => conquista !== null);
  } catch (error) {
    throw toGamificationError(error, "carregar suas conquistas");
  }
};

/** `GET /gamification/resumo?periodo=SEMANA|MES`: a tela de Progresso numa chamada. */
export const fetchProgressSummary = async (
  periodo: PeriodoResumo
): Promise<ResumoProgresso> => {
  try {
    const response = await api.get("/gamification/resumo", { params: { periodo } });
    const resumo = asObject(response.data);
    const nivel = asObject(resumo?.nivel);

    if (!resumo || !nivel) {
      throw new Error("Resposta de resumo de progresso inválida.");
    }

    return {
      hoje: normalizeHoje(resumo.hoje),
      periodo: normalizePeriodo(resumo.periodo),
      streak: normalizeStreak(resumo.streak),
      nivel: normalizeNivel(nivel, "atual"),
      xpTotal: asCount(nivel.xpTotal),
      conquistasRecentes: Array.isArray(resumo.conquistasRecentes)
        ? resumo.conquistasRecentes
            .map(normalizeConquista)
            .filter((conquista): conquista is Conquista => conquista !== null)
        : [],
      recompensasRecentes: Array.isArray(resumo.recompensasRecentes)
        ? resumo.recompensasRecentes
            .map(normalizeExtratoLinha)
            .filter((linha): linha is ExtratoLinha => linha !== null)
        : [],
    };
  } catch (error) {
    throw toGamificationError(error, "carregar o resumo do seu progresso");
  }
};

/**
 * `GET /gamification/extrato?page=`: `Page<ExtratoLinha>` do Spring. Aceita o formato direto
 * (`last`, `number`) e o de DTO (`page.number`, `page.totalPages`).
 */
export const fetchRewardStatement = async (page: number): Promise<ExtratoPagina> => {
  try {
    const response = await api.get("/gamification/extrato", { params: { page } });
    const pagina = asObject(response.data);

    if (!pagina || !Array.isArray(pagina.content)) {
      throw new Error("Resposta de extrato inválida.");
    }

    const linhas = pagina.content
      .map(normalizeExtratoLinha)
      .filter((linha): linha is ExtratoLinha => linha !== null);
    const meta = asObject(pagina.page);
    const numero = asNumber(meta?.number) ?? asNumber(pagina.number) ?? page;
    const totalPaginas = asNumber(meta?.totalPages) ?? asNumber(pagina.totalPages);
    const last = typeof pagina.last === "boolean" ? pagina.last : null;

    return {
      linhas,
      pagina: numero,
      ultimaPagina:
        last ?? (totalPaginas !== null ? numero + 1 >= totalPaginas : linhas.length === 0),
    };
  } catch (error) {
    throw toGamificationError(error, "carregar o extrato");
  }
};
