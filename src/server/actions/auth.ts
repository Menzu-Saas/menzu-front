"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authErrorMessage } from "@/lib/auth-errors";
import { parseMenzuError } from "@/lib/order-errors";
import { authDefaultPath, homeForRole, RESTAURANT_ACCESS_PATH } from "@/lib/role-home";
import { isCustomerCheckout, passwordResetHref } from "@/lib/customer-checkout";
import { saveBuyerCpf } from "@/server/payments/cpf-vault";
import { safeNextPath } from "@/lib/safe-next";
import {
  fieldErrors,
  cpfSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type FieldErrors,
} from "@/lib/schemas/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authAppUrl } from "@/server/app-url";
import { CURRENT_RESTAURANT_COOKIE, hasRecoverySession, writeCurrentRestaurantCookie } from "@/server/auth";
import { restaurantAccessDestination } from "@/server/restaurant-access";
import { RECOVERY_COOKIE } from "@/server/recovery";

export type AuthActionResult =
  | { ok: false; error?: string; fieldErrors?: FieldErrors }
  | { ok: true; status: "check_email" | "email_sent"; email: string };

/**
 * Auth actions take FormData, never a plain object: `next dev` logs Server Function arguments and
 * FormData serialises as `{}` there, so credentials never reach the terminal. The forms also post
 * with method="post", so a submit before hydration never puts them in the URL.
 */
function field(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

const invalid = (errors: FieldErrors): AuthActionResult => ({ ok: false, fieldErrors: errors });
const failure = (error: string): AuthActionResult => ({ ok: false, error });

function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInAction(form: FormData): Promise<AuthActionResult> {
  const input = { email: field(form, "email"), password: field(form, "password"), next: field(form, "next") };
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return failure(authErrorMessage(error));

  const destination = safeNextPath(input.next) ?? authDefaultPath();
  redirect(destination === RESTAURANT_ACCESS_PATH ? await restaurantAccessDestination() : destination);
}

export async function signUpAction(form: FormData): Promise<AuthActionResult> {
  const input = {
    name: field(form, "name"),
    email: field(form, "email"),
    password: field(form, "password"),
    next: field(form, "next"),
  };
  const parsed = signupSchema.safeParse(input);
  const requested = safeNextPath(input.next);
  // Só quem se cadastra a partir do checkout do comprador informa CPF; donos de restaurante não.
  const needsCpf = isCustomerCheckout(requested);
  const cpf = needsCpf ? cpfSchema.safeParse(field(form, "cpf") ?? "") : null;
  if (!parsed.success || (cpf && !cpf.success)) {
    return invalid({
      ...(parsed.success ? {} : fieldErrors(parsed.error)),
      ...(cpf && !cpf.success ? { cpf: cpf.error.issues[0]?.message ?? "Informe um CPF válido." } : {}),
    });
  }
  const next = requested ?? authDefaultPath();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: callbackUrl(await authAppUrl(), next),
    },
  });
  if (error) {
    if (error.code === "weak_password") return invalid({ password: authErrorMessage(error) });
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return invalid({ email: authErrorMessage(error) });
    }
    return failure(authErrorMessage(error));
  }

  // Guarda o CPF cifrado para o checkout não pedir de novo. Um e-mail já existente volta como usuário
  // "ofuscado" (sem identities): nesse caso não gravamos nada. Falha aqui não derruba o cadastro:
  // o checkout pede o CPF uma vez, se faltar.
  if (cpf?.success && data.user?.identities?.length) {
    try {
      await saveBuyerCpf(data.user.id, cpf.data);
    } catch (e) {
      console.error("[auth] não foi possível salvar o CPF do comprador", e instanceof Error ? e.message : "erro");
    }
  }

  // E-mail confirmation disabled: we already have a session.
  if (data.session) redirect(next);
  // Confirmation enabled (also returned, obfuscated, for an existing e-mail — do not leak which).
  return { ok: true, status: "check_email", email: parsed.data.email };
}

export async function requestPasswordResetAction(form: FormData): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: field(form, "email") });
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(await authAppUrl(), passwordResetHref(field(form, "next"))),
  });
  // Only surface throttling; anything else answers the same way so accounts cannot be enumerated.
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return failure(authErrorMessage(error));
  }
  return { ok: true, status: "email_sent", email: parsed.data.email };
}

export async function resetPasswordAction(form: FormData): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({ password: field(form, "password"), confirm: field(form, "confirm") });
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Only a recovery session may set a new password without the current one (see server/recovery.ts).
  if (!user || !(await hasRecoverySession())) {
    return failure("Seu link expirou. Solicite um novo e-mail de recuperação.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password" || error.code === "weak_password") {
      return invalid({ password: authErrorMessage(error) });
    }
    return failure(authErrorMessage(error));
  }
  (await cookies()).delete(RECOVERY_COOKIE);
  redirect(safeNextPath(field(form, "next")) ?? authDefaultPath());
}

/** Form action. An optional `next` field is carried to /entrar (e.g. back to an invite). */
export async function signOutAction(formData?: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  (await cookies()).delete(CURRENT_RESTAURANT_COOKIE);
  const next = safeNextPath(formData?.get("next"));
  redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
}

export async function acceptInviteAction(token: string): Promise<{ ok: false; error: string }> {
  if (typeof token !== "string" || !/^[a-f0-9]{16,128}$/i.test(token)) {
    return { ok: false, error: "Convite inválido ou expirado." };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/convite/${token}`)}`);

  const { data: rid, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !rid) return { ok: false, error: parseMenzuError(error).message };

  await writeCurrentRestaurantCookie(rid);
  const { data: member } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", rid)
    .eq("user_id", user.id)
    .maybeSingle();
  redirect(member ? homeForRole(member.role) : "/painel");
}
