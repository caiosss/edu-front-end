import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ShieldCheck, UserPlus } from "lucide-react-native";
import {
  AppText,
  BigButton,
  Card,
  ScreenHeader,
  StatusBanner,
  type StatusTone,
} from "../components/ui";
import { CaregiverCard } from "../features/caregivers/components/caregiver-card";
import { ConsentTermModal } from "../features/caregivers/components/consent-term-modal";
import { nextScopes } from "../features/caregivers/scopes";
import type {
  CaregiverLink,
  ConsentTerm,
  EscopoCuidador,
} from "../features/caregivers/types";
import { useCaregivers } from "../hooks/use-caregivers";
import {
  removeCaregiver,
  resendCaregiverInvite,
  updateCaregiverScopes,
} from "../services/caregiver-service";
import { fetchConsentTerm, grantConsent, revokeConsent } from "../services/consent-service";
import { colors, spacing } from "../theme";
import { toFriendlyMessage } from "../utils/friendly-error";

/** Limite do auth-service: convidados e ativos ocupam vaga (SPEC-014 §3). */
const MAX_CAREGIVERS = 3;

type CaregiversScreenProps = {
  onNavigateBack: () => void;
  onNavigateToInvite: () => void;
};

type Feedback = { tone: StatusTone; message: string } | null;

/** Escopos esperando o termo `DELEGACAO_CUIDADOR` ser aceito para serem salvos. */
type PendingDelegation = { vinculoId: string; escopos: EscopoCuidador[] } | null;

/**
 * O paciente gerencia os proprios cuidadores (SPEC-014 §5.2 e §5.3): ve quem foi convidado,
 * escolhe item a item o que cada um pode ver e fazer, reenvia o convite e remove.
 */
export default function CaregiversScreen({
  onNavigateBack,
  onNavigateToInvite,
}: CaregiversScreenProps) {
  const {
    caregivers,
    hasDelegationConsent,
    isLoading,
    errorMessage,
    refreshCaregivers,
    replaceCaregiver,
    setHasDelegationConsent,
  } = useCaregivers();

  const [busyCaregiverId, setBusyCaregiverId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [pendingDelegation, setPendingDelegation] = useState<PendingDelegation>(null);
  const [delegationTerm, setDelegationTerm] = useState<ConsentTerm | null>(null);
  const [isTermLoading, setIsTermLoading] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [termErrorMessage, setTermErrorMessage] = useState("");

  const saveScopes = async (vinculoId: string, escopos: EscopoCuidador[]) => {
    setBusyCaregiverId(vinculoId);
    setFeedback(null);

    try {
      replaceCaregiver(await updateCaregiverScopes(vinculoId, escopos));
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: toFriendlyMessage(error, "Não foi possível salvar as permissões agora."),
      });
      // 422 de regra de escopo: o estado do servidor pode ter mudado (termo revogado).
      void refreshCaregivers();
    } finally {
      setBusyCaregiverId(null);
    }
  };

  const openDelegationTerm = async (vinculoId: string, escopos: EscopoCuidador[]) => {
    setPendingDelegation({ vinculoId, escopos });
    setTermErrorMessage("");

    if (delegationTerm) {
      return;
    }

    setIsTermLoading(true);

    try {
      setDelegationTerm(await fetchConsentTerm("DELEGACAO_CUIDADOR"));
    } catch (error) {
      setTermErrorMessage(toFriendlyMessage(error, "Não foi possível carregar a autorização."));
    } finally {
      setIsTermLoading(false);
    }
  };

  const handleToggleScope = (
    caregiver: CaregiverLink,
    escopo: EscopoCuidador,
    enabled: boolean
  ) => {
    const escopos = nextScopes(caregiver.escopos, escopo, enabled);

    // Registrar pelo paciente exige o termo vigente: sem ele o backend responde 422.
    if (escopo === "AGIR_PELO_PACIENTE" && enabled && !hasDelegationConsent) {
      void openDelegationTerm(caregiver.id, escopos);
      return;
    }

    void saveScopes(caregiver.id, escopos);
  };

  const acceptDelegationTerm = async () => {
    if (!pendingDelegation) {
      return;
    }

    setIsGranting(true);
    setTermErrorMessage("");

    try {
      await grantConsent("DELEGACAO_CUIDADOR");
      setHasDelegationConsent(true);
      const { vinculoId, escopos } = pendingDelegation;
      setPendingDelegation(null);
      await saveScopes(vinculoId, escopos);
    } catch (error) {
      setTermErrorMessage(toFriendlyMessage(error, "Não foi possível salvar a autorização."));
    } finally {
      setIsGranting(false);
    }
  };

  const resendInvite = async (caregiver: CaregiverLink) => {
    setBusyCaregiverId(caregiver.id);
    setFeedback(null);

    try {
      const result = await resendCaregiverInvite(caregiver.id);
      replaceCaregiver(result.vinculo);
      setFeedback(
        result.envio === "ENVIADO"
          ? {
              tone: "success",
              message: `Novo convite enviado para ${caregiver.nomeCompleto}. O link anterior não vale mais.`,
            }
          : {
              tone: "warning",
              message: "Não conseguimos enviar o e-mail agora. Tente reenviar daqui a pouco.",
            }
      );
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: toFriendlyMessage(error, "Não foi possível reenviar o convite agora."),
      });
    } finally {
      setBusyCaregiverId(null);
    }
  };

  const confirmRemove = (caregiver: CaregiverLink) => {
    Alert.alert(
      `Remover ${caregiver.nomeCompleto}?`,
      "Essa pessoa não vai mais conseguir entrar no aplicativo. O que ela já registrou fica guardado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => void remove(caregiver),
        },
      ]
    );
  };

  const remove = async (caregiver: CaregiverLink) => {
    setBusyCaregiverId(caregiver.id);
    setFeedback(null);

    try {
      await removeCaregiver(caregiver.id);
      setFeedback({ tone: "success", message: `${caregiver.nomeCompleto} foi removido.` });
      await refreshCaregivers();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: toFriendlyMessage(error, "Não foi possível remover o cuidador agora."),
      });
    } finally {
      setBusyCaregiverId(null);
    }
  };

  const confirmRevokeDelegation = () => {
    Alert.alert(
      "Retirar a autorização?",
      "Nenhum cuidador vai mais registrar doses ou atividades por você. O que eles podem ver continua igual.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Retirar",
          style: "destructive",
          onPress: () => void revokeDelegation(),
        },
      ]
    );
  };

  const revokeDelegation = async () => {
    setIsRevoking(true);
    setFeedback(null);

    try {
      await revokeConsent("DELEGACAO_CUIDADOR");
      setFeedback({
        tone: "success",
        message: "Pronto. Nenhum cuidador registra mais por você.",
      });
      // O backend tira AGIR_PELO_PACIENTE de todos os vinculos na mesma transacao.
      await refreshCaregivers();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: toFriendlyMessage(error, "Não foi possível retirar a autorização agora."),
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const canInvite = caregivers.length < MAX_CAREGIVERS;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader
        title="Meus cuidadores"
        subtitle="Escolha quem acompanha você e o que cada pessoa pode ver e fazer."
        onBack={onNavigateBack}
      />

      {feedback ? <StatusBanner tone={feedback.tone} message={feedback.message} /> : null}

      {isLoading && caregivers.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText color="textSecondary">Carregando seus cuidadores...</AppText>
        </View>
      ) : null}

      {errorMessage && caregivers.length === 0 ? (
        <StatusBanner
          tone="danger"
          message={errorMessage}
          action={{ label: "Tentar de novo", onPress: () => void refreshCaregivers() }}
        />
      ) : null}

      {!isLoading && !errorMessage && caregivers.length === 0 ? (
        <Card>
          <AppText variant="heading">Nenhum cuidador ainda</AppText>
          <AppText color="textSecondary">
            Convide alguém de confiança para acompanhar seu tratamento: um familiar, um
            enfermeiro ou quem cuida de você.
          </AppText>
        </Card>
      ) : null}

      {caregivers.map((caregiver, index) => (
        <Animated.View key={caregiver.id} entering={FadeInDown.delay(index * 60).duration(220)}>
          <CaregiverCard
            caregiver={caregiver}
            isBusy={busyCaregiverId !== null || isRevoking}
            onToggleScope={handleToggleScope}
            onResendInvite={(item) => void resendInvite(item)}
            onRemove={confirmRemove}
          />
        </Animated.View>
      ))}

      {hasDelegationConsent ? (
        <Card tone="primary">
          <View style={styles.delegationHeader}>
            <ShieldCheck size={24} color={colors.primary} />
            <AppText variant="heading" style={styles.delegationTitle}>
              Registro pelo cuidador
            </AppText>
          </View>
          <AppText color="textSecondary">
            Você autorizou cuidadores a registrar doses e atividades por você. Se um cuidador
            marcar uma dose que você não tomou, corrija no mesmo dia na tela Início.
          </AppText>
          <BigButton
            label={isRevoking ? "Retirando..." : "Retirar autorização"}
            variant="secondary"
            loading={isRevoking}
            disabled={isRevoking || busyCaregiverId !== null}
            onPress={confirmRevokeDelegation}
          />
        </Card>
      ) : null}

      {canInvite ? (
        <BigButton label="Convidar cuidador" icon={UserPlus} onPress={onNavigateToInvite} />
      ) : (
        <StatusBanner
          tone="info"
          message={`Você já tem ${MAX_CAREGIVERS} cuidadores. Para convidar outra pessoa, remova um deles.`}
        />
      )}

      <ConsentTermModal
        visible={pendingDelegation !== null}
        term={delegationTerm}
        isLoading={isTermLoading}
        isSubmitting={isGranting}
        errorMessage={termErrorMessage}
        onAccept={() => void acceptDelegationTerm()}
        onDecline={() => setPendingDelegation(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  loading: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  delegationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  delegationTitle: {
    flex: 1,
  },
});
