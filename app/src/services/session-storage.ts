import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { decodeTokenPayload } from "../utils/jwt";

/**
 * Guarda a sessao no aparelho para o login nao ser pedido a cada abertura do app.
 *
 * Vai no `expo-secure-store` (Keystore no Android, Keychain no iOS), nunca em armazenamento
 * comum: o token da acesso a dados de saude. Falha de leitura ou escrita so faz o app pedir o
 * login de novo; nunca derruba a tela.
 *
 * No navegador (versao web instalada na Tela de Inicio do iPhone) nao existe secure-store: a
 * sessao vai no `localStorage` da origem do app, que so o proprio app le. E menos protegido que o
 * Keychain, mas e o que a web oferece; sem isso o paciente faria login a cada abertura.
 */
export type SessaoGuardada = {
  token: string;
  id: string;
  tipoUsuario: string;
};

const CHAVE = "educare.sessao";

/** Mesma interface do secure-store; na web, o `localStorage` (que pode estar bloqueado). */
const armazenamento = Platform.OS === "web"
  ? {
      getItemAsync: async (chave: string) => window.localStorage.getItem(chave),
      setItemAsync: async (chave: string, valor: string) => window.localStorage.setItem(chave, valor),
      deleteItemAsync: async (chave: string) => window.localStorage.removeItem(chave),
    }
  : SecureStore;

/** Folga para nao entrar com um token que vence nos proximos segundos. */
const MARGEM_EXPIRACAO_MS = 60_000;

/** O token ainda vale? Sem `exp` legivel, trata como vencido. */
export const tokenValido = (token: string | null, agora = Date.now()): boolean => {
  const exp = decodeTokenPayload(token)?.exp;
  return typeof exp === "number" && exp * 1000 - MARGEM_EXPIRACAO_MS > agora;
};

export async function carregarSessao(): Promise<SessaoGuardada | null> {
  try {
    const bruto = await armazenamento.getItemAsync(CHAVE);
    if (!bruto) {
      return null;
    }
    const sessao = JSON.parse(bruto) as Partial<SessaoGuardada>;
    if (
      typeof sessao.token !== "string" ||
      typeof sessao.id !== "string" ||
      typeof sessao.tipoUsuario !== "string"
    ) {
      await apagarSessao();
      return null;
    }
    if (!tokenValido(sessao.token)) {
      await apagarSessao();
      return null;
    }
    return { token: sessao.token, id: sessao.id, tipoUsuario: sessao.tipoUsuario };
  } catch (erro) {
    console.warn("Nao foi possivel ler a sessao guardada", erro);
    return null;
  }
}

export async function guardarSessao(sessao: SessaoGuardada): Promise<void> {
  try {
    await armazenamento.setItemAsync(CHAVE, JSON.stringify(sessao));
  } catch (erro) {
    console.warn("Nao foi possivel guardar a sessao", erro);
  }
}

export async function apagarSessao(): Promise<void> {
  try {
    await armazenamento.deleteItemAsync(CHAVE);
  } catch (erro) {
    console.warn("Nao foi possivel apagar a sessao guardada", erro);
  }
}
