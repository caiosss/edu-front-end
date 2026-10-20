import { create } from "zustand";
import {
  apagarSessao,
  carregarSessao,
  guardarSessao,
} from "../services/session-storage";

type AuthSession = {
  token: string;
  id: string;
  tipoUsuario: string;
};

type AuthState = {
  token: string | null;
  id: string | null;
  tipoUsuario: string | null;
  /** A sessao guardada no aparelho ja foi lida. Antes disso o app nao decide entre login e inicio. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  setToken: (token: string | null) => void;
  clearToken: () => void;
};

const SEM_SESSAO = {
  token: null,
  id: null,
  tipoUsuario: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...SEM_SESSAO,
  hydrated: false,
  hydrate: async () => {
    const sessao = await carregarSessao();
    // Um login feito enquanto o armazenamento era lido vence a sessao antiga.
    if (sessao && !get().token) {
      set({ ...sessao });
    }
    set({ hydrated: true });
  },
  setSession: (session) => {
    set({
      token: session.token,
      id: session.id,
      tipoUsuario: session.tipoUsuario,
    });
    void guardarSessao(session);
  },
  setToken: (token) => {
    if (!token) {
      get().clearToken();
      return;
    }
    set({ token });
    const { id, tipoUsuario } = get();
    if (id && tipoUsuario) {
      void guardarSessao({ token, id, tipoUsuario });
    }
  },
  clearToken: () => {
    set(SEM_SESSAO);
    void apagarSessao();
  },
}));
