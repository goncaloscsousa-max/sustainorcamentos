/**
 * Estado partilhado por server actions usadas com `useActionState`.
 * Cada action devolve `{}` em caso de sucesso (antes do redirect) ou um
 * objeto com `error` e/ou `fieldErrors`.
 */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

export const EMPTY_STATE: ActionState = {};

/** Converte issues do Zod num mapa campo → mensagem. */
export function zodIssuesToFieldErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
