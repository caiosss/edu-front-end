import { Pressable, StyleSheet, Text, View } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { USER_TYPES, type RegistrationFormValues } from "../types";

type UserTypeSelectProps = {
  control: Control<RegistrationFormValues>;
};

export function UserTypeSelect({ control }: UserTypeSelectProps) {
  return (
    <Controller
      control={control}
      name="tipoUsuario"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>Tipo de usuario</Text>
          <View style={styles.optionsContainer}>
            {USER_TYPES.map((typeOption) => {
              const isSelected = value === typeOption;
              return (
                <Pressable
                  key={typeOption}
                  onPress={() => onChange(typeOption)}
                  style={[
                    styles.option,
                    isSelected ? styles.optionSelected : undefined,
                    error ? styles.optionError : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected ? styles.optionTextSelected : undefined,
                    ]}
                  >
                    {typeOption}
                  </Text>
                </Pressable>
              );
            })}
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
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  option: {
    minWidth: 95,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2C7BE5",
  },
  optionError: {
    borderColor: "#D64545",
  },
  optionText: {
    color: "#35506B",
    fontWeight: "600",
    fontSize: 13,
  },
  optionTextSelected: {
    color: "#1A4F8B",
  },
  errorText: {
    color: "#D64545",
    fontSize: 12,
    fontWeight: "500",
  },
});
