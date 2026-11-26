import { supabaseCookieOptions } from "@/lib/supabase/session-scope";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: supabaseCookieOptions() },
  );
}
