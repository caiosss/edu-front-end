import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import type { RegistrationFormValues } from "../types";
import { formatDateToBR, formatDateToISO, parseISOToDate } from "../utils/date";

type DatePickerModule = typeof import("@react-native-community/datetimepicker");

type DateTimePickerEvent = {
  type: "set" | "dismissed" | "neutralButtonPressed";
};

let NativeDateTimePicker: DatePickerModule["default"] | null = null;

try {
  NativeDateTimePicker = (
    require("@react-native-community/datetimepicker") as DatePickerModule
  ).default;
} catch {
  NativeDateTimePicker = null;
}

const maskIsoDateInput = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

type DateInputProps = {
  control: Control<RegistrationFormValues>;
  name: FieldPath<RegistrationFormValues>;
  label: string;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateInput({
  control,
  name,
  label,
  placeholder,
  minimumDate,
  maximumDate,
}: DateInputProps) {
  const [isPickerVisible, setPickerVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        if (!NativeDateTimePicker) {
          return (
            <View style={styles.wrapper}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={(text) => onChange(maskIsoDateInput(text))}
                placeholder="AAAA-MM-DD"
                keyboardType="number-pad"
                maxLength={10}
                style={[styles.manualInput, error ? styles.dateButtonError : undefined]}
                placeholderTextColor="#8E9AA7"
              />
              {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
            </View>
          );
        }

        const selectedDate = value ? parseISOToDate(value) : null;

        const pickerValue = selectedDate ?? new Date();

        const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
          if (Platform.OS === "android") {
            setPickerVisible(false);
          }

          if (event.type === "dismissed" || !date) {
            return;
          }

          onChange(formatDateToISO(date));
        };

        return (
          <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>

            <Pressable
              style={[styles.dateButton, error ? styles.dateButtonError : undefined]}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={value ? styles.dateValue : styles.datePlaceholder}>
                {value ? formatDateToBR(value) : placeholder}
              </Text>
            </Pressable>

            {isPickerVisible ? (
              <View style={styles.pickerContainer}>
                <NativeDateTimePicker
                  value={pickerValue}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={handleDateChange}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => setPickerVisible(false)}
                    style={styles.iosConfirmButton}
                  >
                    <Text style={styles.iosConfirmButtonText}>Concluir</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
          </View>
        );
      }}
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
  dateButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  dateButtonError: {
    borderColor: "#D64545",
  },
  datePlaceholder: {
    color: "#8E9AA7",
    fontSize: 16,
  },
  dateValue: {
    color: "#1B2F43",
    fontSize: 16,
    fontWeight: "500",
  },
  manualInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#1B2F43",
  },
  pickerContainer: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    overflow: "hidden",
  },
  iosConfirmButton: {
    borderTopWidth: 1,
    borderTopColor: "#E4EAF1",
    paddingVertical: 12,
    alignItems: "center",
  },
  iosConfirmButtonText: {
    color: "#2C7BE5",
    fontWeight: "700",
  },
  fallbackHint: {
    color: "#6C7D8E",
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    color: "#D64545",
    fontSize: 12,
    fontWeight: "500",
  },
});
