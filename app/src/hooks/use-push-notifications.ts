import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  configurarNotificacoes,
  marcarNotificacaoAberta,
  registrarAparelho,
} from "../services/push-service";
import { usePushStore } from "../store/push-store";

type Opcoes = {
  /** Chamado quando a pessoa toca numa notificacao (com o app aberto ou fechado). */
  onAbrirNotificacao: () => void;
};

/**
 * Liga as notificacoes push depois do login.
 *
 * Nao pede a permissao do sistema de cara: primeiro mostra um convite explicando para que
 * serve (`convitePendente`). O pedido seco do Android, sem contexto, costuma ser negado, e
 * depois de negado o app nao pode pedir de novo.
 */
export function usePushNotifications({ onAbrirNotificacao }: Opcoes) {
  const [convitePendente, setConvitePendente] = useState(false);
  const setDispositivoId = usePushStore((s) => s.setDispositivoId);
  const onAbrirRef = useRef(onAbrirNotificacao);
  onAbrirRef.current = onAbrirNotificacao;

  const registrar = useCallback(async () => {
    try {
      setDispositivoId(await registrarAparelho());
    } catch (erro) {
      // Sem registro o paciente so deixa de receber push; o app segue normal e tenta de novo
      // no proximo login.
      console.warn("Nao foi possivel registrar o aparelho para notificacoes", erro);
    }
  }, [setDispositivoId]);

  useEffect(() => {
    let ativo = true;

    const tratarToque = (resposta: Notifications.NotificationResponse) => {
      const dados = resposta.notification.request.content.data as Record<string, unknown> | undefined;
      const notificacaoId = dados?.notificacaoId;
      if (typeof notificacaoId === "string") {
        marcarNotificacaoAberta(notificacaoId).catch(() => undefined);
      }
      onAbrirRef.current();
      Notifications.clearLastNotificationResponse();
    };

    (async () => {
      await configurarNotificacoes();
      const permissao = await Notifications.getPermissionsAsync();
      if (!ativo) return;

      if (permissao.granted) {
        await registrar();
      } else if (permissao.canAskAgain && Platform.OS === "android") {
        setConvitePendente(true);
      }

      // App aberto pelo toque numa notificacao, antes do login: trata agora.
      const ultima = Notifications.getLastNotificationResponse();
      if (ultima && ativo) tratarToque(ultima);
    })();

    // O FCM troca o token de vez em quando; o registro precisa acompanhar.
    const assinaturaToken = Notifications.addPushTokenListener(() => {
      registrar();
    });
    const assinaturaToque = Notifications.addNotificationResponseReceivedListener(tratarToque);

    return () => {
      ativo = false;
      assinaturaToken.remove();
      assinaturaToque.remove();
    };
  }, [registrar]);

  const aceitarConvite = useCallback(async () => {
    setConvitePendente(false);
    const resposta = await Notifications.requestPermissionsAsync();
    if (resposta.granted) {
      await registrar();
    }
  }, [registrar]);

  const recusarConvite = useCallback(() => setConvitePendente(false), []);

  return { convitePendente, aceitarConvite, recusarConvite };
}
