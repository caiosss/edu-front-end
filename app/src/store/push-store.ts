import { create } from "zustand";

type PushState = {
  /** Id do registro deste aparelho no notification-service; o logout usa para desregistrar. */
  dispositivoId: string | null;
  setDispositivoId: (id: string | null) => void;
};

export const usePushStore = create<PushState>((set) => ({
  dispositivoId: null,
  setDispositivoId: (dispositivoId) => set({ dispositivoId }),
}));
