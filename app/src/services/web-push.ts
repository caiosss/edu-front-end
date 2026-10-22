import { Platform } from "react-native";
import { isStandalone } from "../features/pwa/standalone";
import { api } from "./api";

/**
 * Web Push da versao web do app (PWA na Tela de Inicio do iPhone). O service worker
 * (`public/sw.js`) recebe o push e mostra a notificacao; aqui o app pede a permissao, inscreve o
 * navegador no servico de push e entrega a inscricao ao backend, que cifra e envia (RFC 8291).
 *
 * No iPhone so funciona com o app aberto pelo icone da Tela de Inicio, iOS 16.4 ou mais novo, e
 * o pedido de permissao tem que vir de um toque — por isso ele e a primeira coisa no handler do
 * botao "Sim, quero os lembretes", antes de qualquer `await`.
 */
export type InscricaoWeb = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export const webPushDisponivel = (): boolean =>
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  isStandalone();

export const permissaoWeb = (): NotificationPermission => Notification.permission;

/** Chama o pedido do sistema. Tem que rodar dentro do toque do usuario (exigencia do iOS). */
export const pedirPermissaoWeb = (): Promise<NotificationPermission> => Notification.requestPermission();

let registroSw: Promise<ServiceWorkerRegistration> | null = null;

/** Registra o service worker uma vez por sessao; ele precisa estar ativo para a inscricao. */
export function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!registroSw) {
    registroSw = navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .catch((erro) => {
        registroSw = null;
        throw erro;
      });
  }
  return registroSw;
}

/** A chave VAPID vem em base64url; o PushManager quer os bytes. */
const bytesDaChave = (base64url: string): Uint8Array<ArrayBuffer> => {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
};

/**
 * A inscricao deste navegador, criando se ainda nao existe. Nulo quando o backend esta sem
 * chave VAPID (o Web Push esta desligado no servidor).
 */
export async function inscreverNoWebPush(): Promise<InscricaoWeb | null> {
  const registro = await registrarServiceWorker();
  let inscricao = await registro.pushManager.getSubscription();

  if (!inscricao) {
    const { data } = await api.get<{ chavePublica: string }>("/notificacoes/web-push/chave");
    if (!data?.chavePublica) {
      return null;
    }
    inscricao = await registro.pushManager.subscribe({
      // O iOS exige: todo push mostra uma notificacao, nada de push silencioso.
      userVisibleOnly: true,
      applicationServerKey: bytesDaChave(data.chavePublica),
    });
  }

  const json = inscricao.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/**
 * Toque numa notificacao. Com o app aberto, o service worker avisa por mensagem; com ele
 * fechado, abre o app com `?notificacao=<id>` na URL.
 */
export function ouvirToqueWeb(aoTocar: (notificacaoId: string | null) => void): () => void {
  const params = new URLSearchParams(window.location.search);
  const daUrl = params.get("notificacao");
  if (daUrl) {
    params.delete("notificacao");
    const resto = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : ""));
    aoTocar(daUrl);
  }

  const aoReceber = (evento: MessageEvent) => {
    const dados = evento.data as { tipo?: string; notificacaoId?: string } | undefined;
    if (dados?.tipo === "notificacao-aberta") {
      aoTocar(dados.notificacaoId ?? null);
    }
  };
  navigator.serviceWorker.addEventListener("message", aoReceber);
  return () => navigator.serviceWorker.removeEventListener("message", aoReceber);
}
