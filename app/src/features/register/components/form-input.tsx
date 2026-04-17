import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  type TextInputProps,
  View,
} from "react-native";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import type { RegistrationFormValues } from "../types";

type FormInputProps = {
  control: Control<RegistrationFormValues>;
  name: FieldPath<RegistrationFormValues>;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  isPassword?: boolean;
  maxLength?: number;
};

export function FormInput({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  autoCapitalize = "sentences",
  autoCorrect = false,
  isPassword = false,
  maxLength,
}: FormInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <View style={[styles.inputContainer, error ? styles.inputError : undefined]}>
            <TextInput
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={placeholder}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              secureTextEntry={isPassword ? !isPasswordVisible : false}
              style={styles.input}
              placeholderTextColor="#8E9AA7"
              maxLength={maxLength}
            />
            {isPassword ? (
              <Pressable
                onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
                style={styles.passwordAction}
              >
                <Text style={styles.passwordActionText}>
                  {isPasswordVisible ? "Ocultar" : "Mostrar"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#12314C",
  },
  inputContainer: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1B2F43",
    paddingVertical: 10,
  },
  inputError: {
    borderColor: "#D64545",
  },
  errorText: {
    color: "#D64545",
    fontSize: 12,
    fontWeight: "500",
  },
  passwordAction: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  passwordActionText: {
    color: "#2C7BE5",
    fontWeight: "600",
    fontSize: 13,
  },
});
