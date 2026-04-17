import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .email("Informe um e-mail valido."),
  senha: z.string().trim().min(1, "Informe a senha."),
});

export type LoginSchema = z.infer<typeof loginSchema>;
