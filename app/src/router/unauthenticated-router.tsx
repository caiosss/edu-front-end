import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import ActivateInviteScreen from "../screens/activate-invite-screen";
import LoginScreen from "../screens/login-screen";
import RegisterScreen from "../screens/register-screen";

type UnauthenticatedRoute = "login" | "register" | "activate-invite";

/**
 * Token do link de convite do cuidador, `educare://convite?token=...` (`convite.link-base` no
 * auth-service, SPEC-014 §5.2).
 */
const parseInviteToken = (url: string | null): string | null => {
  if (!url) {
    return null;
  }

  const { hostname, path, queryParams } = Linking.parse(url);
  const isInviteLink = hostname === "convite" || path === "convite";
  const token = queryParams?.token;

  return isInviteLink && typeof token === "string" && token.trim().length > 0
    ? token.trim()
    : null;
};

/**
 * Link ja tratado. `useURL` devolve de novo o link que abriu o app quando este roteador volta a
 * montar (depois de sair da conta), e o convite ja usado nao deve reabrir a ativacao.
 */
let handledInviteUrl: string | null = null;

export function UnauthenticatedRouter() {
  const [currentRoute, setCurrentRoute] = useState<UnauthenticatedRoute>("login");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const url = Linking.useURL();

  useEffect(() => {
    const token = url !== handledInviteUrl ? parseInviteToken(url) : null;

    if (token) {
      handledInviteUrl = url;
      setInviteToken(token);
      setCurrentRoute("activate-invite");
    }
  }, [url]);

  if (currentRoute === "activate-invite") {
    return (
      <ActivateInviteScreen
        initialToken={inviteToken}
        onNavigateToLogin={() => {
          setInviteToken(null);
          setCurrentRoute("login");
        }}
      />
    );
  }

  if (currentRoute === "register") {
    return <RegisterScreen onNavigateToLogin={() => setCurrentRoute("login")} />;
  }

  return (
    <LoginScreen
      onNavigateToRegister={() => setCurrentRoute("register")}
      onNavigateToActivateInvite={() => setCurrentRoute("activate-invite")}
    />
  );
}
