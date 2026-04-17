import { create } from "zustand";
import {
  registrationDefaultValues,
  type RegistrationFormValues,
} from "../types";

type RegistrationStore = {
  draft: RegistrationFormValues;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  updateDraft: (partialValues: Partial<RegistrationFormValues>) => void;
  resetRegistration: () => void;
};

export const useRegistrationStore = create<RegistrationStore>((set) => ({
  draft: registrationDefaultValues,
  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),
  updateDraft: (partialValues) =>
    set((state) => ({ draft: { ...state.draft, ...partialValues } })),
  resetRegistration: () =>
    set({
      draft: registrationDefaultValues,
      currentStep: 0,
    }),
}));
