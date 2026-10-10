import { create } from "zustand";

type AuthSession = {
  token: string;
  id: string;
  tipoUsuario: string;
};

type AuthState = {
  token: string | null;
  id: string | null;
  tipoUsuario: string | null;
  setSession: (session: AuthSession) => void;
  setToken: (token: string | null) => void;
  clearToken: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  id: null,
  tipoUsuario: null,
  setSession: (session) =>
    set({
      token: session.token,
      id: session.id,
      tipoUsuario: session.tipoUsuario,
    }),
  setToken: (token) =>
    set((state) =>
      token
        ? { ...state, token }
        : {
            token: null,
            id: null,
            tipoUsuario: null,
          }
    ),
  clearToken: () =>
    set({
      token: null,
      id: null,
      tipoUsuario: null,
    }),
}));
