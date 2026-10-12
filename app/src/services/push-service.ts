import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

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
 * So Android por enquanto: no iPhone o token e do APNs, que exige a conta paga da Apple, e o
 * backend envia apenas pelo FCM.
 */
export async function registrarAparelho(): Promise<string | null> {
  if (Platform.OS !== "android") {
    return null;
  }

  const { data: token } = await Notifications.getDevicePushTokenAsync();
  const resposta = await api.post<{ id: string }>("/notificacoes/dispositivos", {
    token,
    plataforma: "ANDROID",
  });

  return resposta.data?.id ?? null;
}

/** Para de enviar para este aparelho. Prazo curto: sair da conta nao pode travar sem internet. */
export async function desregistrarAparelho(dispositivoId: string) {
  await api.delete(`/notificacoes/dispositivos/${dispositivoId}`, { timeout: 4000 });
}

/** Avisa o backend que o paciente abriu a notificacao (entra no historico e nas metricas). */
export async function marcarNotificacaoAberta(notificacaoId: string) {
  await api.post(`/notificacoes/${notificacaoId}/aberta`);
}
