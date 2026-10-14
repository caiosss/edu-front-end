import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Mail, Trash2, UserRound } from "lucide-react-native";
import { AppText, BigButton, Card } from "../../../components/ui";
import { colors, radius, spacing, touch } from "../../../theme";
import { SCOPE_LABELS, STATUS_LABELS, VISIBLE_SCOPES } from "../labels";
import type { CaregiverLink, EscopoCuidador } from "../types";

type CaregiverCardProps = {
  caregiver: CaregiverLink;
  isBusy: boolean;
  onToggleScope: (caregiver: CaregiverLink, escopo: EscopoCuidador, enabled: boolean) => void;
  onResendInvite: (caregiver: CaregiverLink) => void;
  onRemove: (caregiver: CaregiverLink) => void;
};

type ScopeToggleRowProps = {
  escopo: EscopoCuidador;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
};

/** Linha inteira tocavel: o interruptor sozinho e pequeno demais para quem tem tremor. */
function ScopeToggleRow({ escopo, value, disabled, onValueChange }: ScopeToggleRowProps) {
  const { title, description } = SCOPE_LABELS[escopo];

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      style={({ pressed }) => [styles.scopeRow, pressed ? styles.scopeRowPressed : null]}
    >
      <View style={styles.scopeText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color="textSecondary">
          {description}
        </AppText>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={value ? colors.primary : colors.surface}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

export function CaregiverCard({
  caregiver,
  isBusy,
  onToggleScope,
  onResendInvite,
  onRemove,
}: CaregiverCardProps) {
  const isInvited = caregiver.status === "CONVIDADO";
  const details = [caregiver.relacao, caregiver.email, caregiver.telefone].filter(Boolean);

  return (
    <Card tone={isInvited ? "warning" : "default"}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <UserRound size={touch.icon} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="heading">{caregiver.nomeCompleto}</AppText>
          {details.map((detail) => (
            <AppText key={detail} variant="small" color="textSecondary">
              {detail}
            </AppText>
          ))}
        </View>
      </View>

      <View style={[styles.statusChip, isInvited ? styles.statusChipInvited : null]}>
        <AppText variant="smallStrong" color={isInvited ? "warning" : "success"}>
          {STATUS_LABELS[caregiver.status]}
        </AppText>
      </View>

      {isInvited ? (
        <AppText variant="small" color="textSecondary">
          Ainda não criou a senha. O link do e-mail vale por 72 horas.
        </AppText>
      ) : null}

      <AppText variant="bodyStrong">O que essa pessoa pode fazer</AppText>
      <View style={styles.scopeList}>
        {VISIBLE_SCOPES.map((escopo) => (
          <ScopeToggleRow
            key={escopo}
            escopo={escopo}
            value={caregiver.escopos.includes(escopo)}
            disabled={isBusy}
            onValueChange={(enabled) => onToggleScope(caregiver, escopo, enabled)}
          />
        ))}
      </View>

      {isInvited ? (
        <BigButton
          label="Reenviar convite"
          icon={Mail}
          variant="secondary"
          disabled={isBusy}
          onPress={() => onResendInvite(caregiver)}
        />
      ) : null}
      <BigButton
        label="Remover cuidador"
        icon={Trash2}
        variant="danger"
        disabled={isBusy}
        onPress={() => onRemove(caregiver)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.successSoft,
  },
  statusChipInvited: {
    backgroundColor: colors.warningSoft,
  },
  scopeList: {
    gap: spacing.xs,
  },
  scopeRow: {
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  scopeRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  scopeText: {
    flex: 1,
    gap: 2,
  },
});
