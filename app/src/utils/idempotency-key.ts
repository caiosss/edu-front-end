const hex = (value: number): string => value.toString(16).padStart(2, "0");

/**
 * UUID v4 para o header `Idempotency-Key` (SPEC-001 §5.3). Nao precisa ser criptografico:
 * serve para o backend reconhecer o reenvio da mesma acao.
 */
export const createIdempotencyKey = (): string => {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const value = bytes.map(hex).join("");

  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
    16,
    20
  )}-${value.slice(20)}`;
};
