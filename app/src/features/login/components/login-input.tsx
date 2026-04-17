import { useState, type Ref } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
  View,
} from "react-native";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import type { LoginFormValues } from "../types";

type LoginInputProps = {
  control: Control<LoginFormValues>;
  name: FieldPath<LoginFormValues>;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  isPassword?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  blurOnSubmit?: TextInputProps["blurOnSubmit"];
  inputRef?: Ref<TextInput>;
};

export function LoginInput({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  autoCapitalize = "sentences",
  autoCorrect = false,
  isPassword = false,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit = false,
  inputRef,
}: LoginInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <View
            style={[
              styles.inputContainer,
              isFocused ? styles.inputFocused : undefined,
              error ? styles.inputError : undefined,
            ]}
          >
            <TextInput
              ref={inputRef}
              value={value}
              onBlur={() => {
                setIsFocused(false);
                onBlur();
              }}
              onFocus={() => setIsFocused(true)}
              onChangeText={onChange}
              placeholder={placeholder}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              secureTextEntry={isPassword ? !isPasswordVisible : false}
              style={styles.input}
              placeholderTextColor="#8E9AA7"
              returnKeyType={returnKeyType}
              onSubmitEditing={onSubmitEditing}
              blurOnSubmit={blurOnSubmit}
            />
            {isPassword ? (
              <Pressable
                onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
                style={styles.passwordAction}
                android_ripple={{ color: "rgba(44, 123, 229, 0.16)", borderless: false }}
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
  inputFocused: {
    borderColor: "#2C7BE5",
    shadowColor: "#2C7BE5",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: "hidden",
  },
  passwordActionText: {
    color: "#2C7BE5",
    fontWeight: "600",
    fontSize: 13,
  },
});
