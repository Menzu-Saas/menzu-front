"use client";

import { notify } from "@/components/ui";

export const ACTION_FAILED = "Não foi possível falar com o servidor. Verifique a conexão e tente novamente.";

const isNextControlFlow = (e: unknown) =>
  typeof e === "object" && e !== null && typeof (e as { digest?: unknown }).digest === "string" &&
  /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test((e as { digest: string }).digest);

/**
 * Wraps the async body of a transition: a rejected server action (offline, 5xx) shows a toast
 * instead of reaching the error boundary, which would replace the page and lose unsaved edits.
 */
export function safely(run: () => Promise<void>, onError?: () => void): () => Promise<void> {
  return async () => {
    try {
      await run();
    } catch (e) {
      if (isNextControlFlow(e)) throw e;
      notify.error(ACTION_FAILED);
      onError?.();
    }
  };
}
