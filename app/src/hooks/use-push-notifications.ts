import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { ConsentTerm } from "../features/caregivers/types";
import { fetchConsentTerm, grantConsent, hasActiveConsent } from "../services/consent-service";
import {
  configurarNotificacoes,
  marcarNotificacaoAberta,
  registrarAparelho,
} from "../services/push-service";
import {
  ouvirToqueWeb,
  pedirPermissaoWeb,
  permissaoWeb,
  registrarServiceWorker,
  webPushDisponivel,
} from "../services/web-push";
import { useAuthStore } from "../store/auth-store";
import { usePushStore } from "../store/push-store";
import { toFriendlyMessage } from "../utils/friendly-error";

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
 *
 * Para o paciente, a permissao do aparelho nao basta: o notification-service so envia com o
 * termo NOTIFICACAO vigente (SPEC-005 §5.4) e, sem ele, suprime todo lembrete em silencio.
 * Com a permissao dada e o termo ausente, o app mostra o texto do termo (`termoPendente`).
 * O cuidador nao tem termo proprio: vale o consentimento do paciente que ele acompanha.
 */
export function usePushNotifications({ onAbrirNotificacao }: Opcoes) {
  const [convitePendente, setConvitePendente] = useState(false);
  const [termoPendente, setTermoPendente] = useState(false);
  const [termo, setTermo] = useState<ConsentTerm | null>(null);
  const [carregandoTermo, setCarregandoTermo] = useState(false);
  const [salvandoTermo, setSalvandoTermo] = useState(false);
  const [erroTermo, setErroTermo] = useState("");
  const ehPaciente = useAuthStore((s) => s.tipoUsuario) === "PACIENTE";
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

  /** Abre o termo se o paciente ainda nao autorizou. Sem resposta do backend, nao insiste. */
  const conferirTermo = useCallback(async () => {
    // iPhone nativo nao tem push (exigiria a conta paga da Apple); a versao web tem.
    if (!ehPaciente || Platform.OS === "ios") {
      return;
    }
    try {
      if (await hasActiveConsent("NOTIFICACAO")) {
        return;
      }
    } catch (erro) {
      console.warn("Nao foi possivel conferir o consentimento de notificacao", erro);
      return;
    }

    setErroTermo("");
    setTermoPendente(true);
    setCarregandoTermo(true);
    try {
      setTermo(await fetchConsentTerm("NOTIFICACAO"));
    } catch (erro) {
      setErroTermo(toFriendlyMessage(erro, "Não foi possível carregar a autorização."));
    } finally {
      setCarregandoTermo(false);
    }
  }, [ehPaciente]);

  useEffect(() => {
    // Versao web (iPhone pela Tela de Inicio): Web Push pelo service worker. O que o efeito
    // nativo usa do expo-notifications (ultima resposta, ouvintes de token e de toque) nao existe
    // no navegador. Numa aba comum do Safari nao ha push: o aviso de instalar cobre esse caso.
    if (Platform.OS === "web") {
      if (!webPushDisponivel()) {
        return;
      }
      let ativo = true;
      const pararDeOuvir = ouvirToqueWeb((notificacaoId) => {
        if (notificacaoId) {
          marcarNotificacaoAberta(notificacaoId).catch(() => undefined);
        }
        onAbrirRef.current();
      });

      (async () => {
        try {
          await registrarServiceWorker();
        } catch (erro) {
          console.warn("Nao foi possivel registrar o service worker", erro);
          return;
        }
        if (!ativo) return;
        const permissao = permissaoWeb();
        if (permissao === "granted") {
          await registrar();
          if (ativo) await conferirTermo();
        } else if (permissao === "default") {
          setConvitePendente(true);
        }
      })();

      return () => {
        ativo = false;
        pararDeOuvir();
      };
    }

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
        if (ativo) await conferirTermo();
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
  }, [registrar, conferirTermo]);

  const aceitarConvite = useCallback(async () => {
    setConvitePendente(false);
    // Na web o pedido sai aqui, ainda dentro do toque no "Sim": o iPhone so pergunta assim.
    const permitido =
      Platform.OS === "web"
        ? (await pedirPermissaoWeb()) === "granted"
        : (await Notifications.requestPermissionsAsync()).granted;
    if (permitido) {
      await registrar();
      await conferirTermo();
    }
  }, [registrar, conferirTermo]);

  const recusarConvite = useCallback(() => setConvitePendente(false), []);

  const aceitarTermo = useCallback(async () => {
    setSalvandoTermo(true);
    setErroTermo("");
    try {
      // O backend reprojeta as doses do paciente ao receber a concessao.
      await grantConsent("NOTIFICACAO");
      setTermoPendente(false);
    } catch (erro) {
      setErroTermo(toFriendlyMessage(erro, "Não foi possível salvar a autorização."));
    } finally {
      setSalvandoTermo(false);
    }
  }, []);

  // Recusar nao revoga nada: o termo volta no proximo login.
  const recusarTermo = useCallback(() => setTermoPendente(false), []);

  return {
    convitePendente,
    aceitarConvite,
    recusarConvite,
    termoPendente,
    termo,
    carregandoTermo,
    salvandoTermo,
    erroTermo,
    aceitarTermo,
    recusarTermo,
  };
}
