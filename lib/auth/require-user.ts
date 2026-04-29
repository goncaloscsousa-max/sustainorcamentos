import { auth } from "@/auth";

export type AuthedUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
};

/**
 * Garante que há um utilizador autenticado para uma Server Action.
 * Lança Error pt-PT visível ao utilizador. As páginas já são protegidas
 * pela middleware, mas as actions têm de validar de novo (defesa em
 * profundidade — uma action é um endpoint POST internet-facing).
 */
export async function requireUser(): Promise<AuthedUser> {
  const session = await auth();
  const user = session?.user;
  if (!user || !user.id) {
    throw new Error("Sessão expirada — recarrega a página e volta a iniciar sessão.");
  }
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? null,
    role: (user as { role?: string }).role ?? null,
  };
}

/**
 * Variante para route handlers / pontos onde queremos devolver um Response
 * em vez de lançar. Devolve o utilizador OU um Response 401 que o caller
 * deve passar para o cliente.
 */
export async function requireUserOrUnauthorized(): Promise<
  { ok: true; user: AuthedUser } | { ok: false; status: 401 }
> {
  const session = await auth();
  const user = session?.user;
  if (!user || !user.id) return { ok: false, status: 401 };
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? "",
      name: user.name ?? null,
      role: (user as { role?: string }).role ?? null,
    },
  };
}
