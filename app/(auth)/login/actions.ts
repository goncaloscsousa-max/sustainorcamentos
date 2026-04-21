"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Introduz a palavra-passe"),
});

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "password";
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Credenciais inválidas." };
      }
      return { error: "Erro de autenticação. Tenta novamente." };
    }
    throw error;
  }
}
