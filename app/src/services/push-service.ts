import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";
import { inscreverNoWebPush } from "./web-push";

/**
 * Notificacoes push (SPEC-005). O backend (notification-service) agenda e envia pelo Firebase;
 * o app so precisa registrar o aparelho, criar os canais e tratar o toque.
 *
 * Os ids dos canais sao os mesmos que o backend usa ao enviar (FcmPushSender.entregaPara):
 * lembrete de dose vai em "lembretes", com prioridade alta.
 */
export const CANAIS = {
  lembretes: "lembretes",
  atividades: "atividades",
  avisos: "avisos",
} as const;

let configurado = false;

/** Comportamento em primeiro plano e canais do Android. Idempotente. */
export async function configurarNotificacoes() {
  if (!configurado) {
    // Com o app aberto o aviso tambem aparece: um lembrete de dose nao pode sumir so porque a
    // pessoa estava olhando outra tela do EduCare.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    configurado = true;
  }

  if (Platform.OS !== "android") {
    return;
  }

  // No Android 13+ o pedido de permissao so aparece depois que existe ao menos um canal.
  await Notifications.setNotificationChannelAsync(CANAIS.lembretes, {
    name: "Lembretes de remédio",
    description: "Aviso no horário de cada dose.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#1155AA",
  });
  await Notifications.setNotificationChannelAsync(CANAIS.atividades, {
    name: "Atividades e conquistas",
    description: "Missões do dia, resumo da semana e conquistas.",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(CANAIS.avisos, {
    name: "Avisos do EduCare",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Registra este aparelho para o usuario logado e devolve o id do registro (usado no logout).
 *
 * Android: token do FCM. Versao web (PWA no iPhone): a inscricao de Web Push, com o endpoint no
 * lugar do token e as chaves para o backend cifrar. App nativo no iPhone fica de fora: o token
 * seria do APNs, que exige a conta paga da Apple.
 */
export async function registrarAparelho(): Promise<string | null> {
  if (Platform.OS !== "android" && Platform.OS !== "web") {
    return null;
  }

  // No primeiro login chegam juntos o registro inicial, o "permitir" do convite e o aviso de
  // token novo do FCM. Sem esta trava saiam 5 POSTs no mesmo instante e o backend rejeitava 4
  // (indice unico do token). Quem chega com um registro em andamento espera o mesmo resultado.
  if (registroEmAndamento) {
    return registroEmAndamento;
  }

  registroEmAndamento = (async () => {
    const corpo = await corpoDoRegistro();
    if (!corpo) {
      return null;
    }
    const { token } = corpo;
    // Mesmo token ja registrado nesta sessao: nada a mandar.
    if (ultimoRegistro && ultimoRegistro.token === token) {
      return ultimoRegistro.id;
    }
    const resposta = await api.post<{ id: string }>("/notificacoes/dispositivos", corpo);
    const id = resposta.data?.id ?? null;
    ultimoRegistro = id ? { token, id } : null;
    return id;
  })();

  try {
    return await registroEmAndamento;
  } finally {
    registroEmAndamento = null;
  }
}

/** O que vai para `POST /notificacoes/dispositivos`; nulo quando nao ha o que registrar. */
async function corpoDoRegistro() {
  if (Platform.OS === "web") {
    const inscricao = await inscreverNoWebPush();
    return inscricao
      ? {
          token: inscricao.endpoint,
          plataforma: "WEB",
          p256dh: inscricao.p256dh,
          auth: inscricao.auth,
        }
      : null;
  }
  const { data: token } = await Notifications.getDevicePushTokenAsync();
  return { token: token as string, plataforma: "ANDROID" };
}

let registroEmAndamento: Promise<string | null> | null = null;
let ultimoRegistro: { token: string; id: string } | null = null;

/** Para de enviar para este aparelho. Prazo curto: sair da conta nao pode travar sem internet. */
export async function desregistrarAparelho(dispositivoId: string) {
  // O proximo login registra de novo, mesmo que o token seja o mesmo.
  ultimoRegistro = null;
  await api.delete(`/notificacoes/dispositivos/${dispositivoId}`, { timeout: 4000 });
}

/** Avisa o backend que o paciente abriu a notificacao (entra no historico e nas metricas). */
export async function marcarNotificacaoAberta(notificacaoId: string) {
  await api.post(`/notificacoes/${notificacaoId}/aberta`);
}
