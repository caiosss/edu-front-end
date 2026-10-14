import { z } from "zod";

const requiredFieldMessage = "Preencha este campo.";

/** O auth-service exige nome e e-mail; telefone e relacao sao opcionais (texto livre). */
export const caregiverInviteSchema = z.object({
  nomeCompleto: z.string().trim().min(1, requiredFieldMessage),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z
    .string()
    .trim()
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length === 0 || (digits.length >= 10 && digits.length <= 11);
    }, "Informe um telefone válido, com DDD."),
  relacao: z.string().trim(),
});

/** Mesma regra do `ConviteService.ativar`: senha com pelo menos 8 caracteres. */
export const activateInviteSchema = z
  .object({
    token: z.string().trim().min(1, "Cole aqui o link do convite que chegou no seu e-mail."),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmarSenha: z.string(),
  })
  .refine((values) => values.senha === values.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "As senhas não são iguais.",
  });

/**
 * O e-mail traz o link `educare://convite?token=...` (`convite.link-base` no auth-service).
 * Aceita o link inteiro, colado de qualquer jeito, ou so o token.
 */
export const extractInviteToken = (input: string): string => {
  const trimmedInput = input.trim();
  const tokenMatch = trimmedInput.match(/[?&]token=([^&\s#]+)/);
  const token = tokenMatch ? tokenMatch[1] : trimmedInput;

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
};
