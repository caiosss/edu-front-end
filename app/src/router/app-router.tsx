import { useAuth } from "../hooks/useAuth";
import { AuthenticatedRouter } from "./authenticated-router";
import { UnauthenticatedRouter } from "./unauthenticated-router";

export function AppRouter() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <AuthenticatedRouter />;
  }

  return <UnauthenticatedRouter />;
}

