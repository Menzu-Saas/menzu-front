// pt-BR messages for Supabase Auth error codes (https://supabase.com/docs/guides/auth/debugging/error-codes).

const GENERIC = "Algo deu errado. Tente novamente.";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Enviamos um link para a sua caixa de entrada.",
  user_already_exists: "Este e-mail já está cadastrado. Tente entrar.",
  email_exists: "Este e-mail já está cadastrado. Tente entrar.",
  weak_password: "Senha muito fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.",
  signup_disabled: "Novos cadastros estão desativados no momento.",
  email_address_invalid: "Informe um e-mail válido.",
  otp_expired: "O link expirou. Solicite um novo.",
  flow_state_expired: "O link expirou. Solicite um novo.",
  flow_state_not_found: "Link inválido ou já utilizado. Solicite um novo.",
  bad_code_verifier: "Abra o link no mesmo navegador em que você fez a solicitação.",
  session_not_found: "Sua sessão expirou. Entre novamente.",
  user_banned: "Esta conta está bloqueada.",
};

export function authErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return GENERIC;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  return GENERIC;
}
