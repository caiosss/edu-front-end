import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { colors, MAX_FONT_SCALE, radius, spacing, touch, typography } from "../../theme";
import { AppText } from "./app-text";

type TextFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: string;
  placeholder?: string;
  /** Texto de apoio abaixo do rotulo, para explicar o que vai no campo. */
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  isPassword?: boolean;
  editable?: boolean;
};

/** Campo de formulario do tema, ligado ao react-hook-form. Erro sempre em texto, nao so na cor. */
export function TextField<TValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  hint,
  keyboardType,
  autoCapitalize = "sentences",
  autoComplete,
  isPassword = false,
  editable = true,
}: TextFieldProps<TValues>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <AppText variant="bodyStrong">{label}</AppText>
          {hint ? (
            <AppText variant="small" color="textSecondary">
              {hint}
            </AppText>
          ) : null}
          <View
            style={[
              styles.inputContainer,
              error ? styles.inputError : null,
              !editable ? styles.inputDisabled : null,
            ]}
          >
            <TextInput
              value={typeof value === "string" ? value : ""}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoComplete={autoComplete}
              autoCorrect={false}
              editable={editable}
              secureTextEntry={isPassword && !isPasswordVisible}
              accessibilityLabel={label}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.input}
            />
            {isPassword ? (
              <Pressable
                onPress={() => setIsPasswordVisible((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                hitSlop={8}
                style={styles.passwordAction}
              >
                <AppText variant="smallStrong" color="primary">
                  {isPasswordVisible ? "Ocultar" : "Mostrar"}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {error?.message ? (
            <AppText variant="small" color="danger" accessibilityLiveRegion="polite">
              {error.message}
            </AppText>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  inputContainer: {
    minHeight: touch.button,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    backgroundColor: colors.disabled,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  passwordAction: {
    minHeight: touch.min - 12,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
});
