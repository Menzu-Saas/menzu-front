import "server-only";

import { headers } from "next/headers";
import { AppUrlNotConfiguredError, resolveAppOrigin } from "@/lib/app-origin";

/**
 * Public origin for links shared outside the app (auth e-mails, invite links, QR codes).
 * APP_URL is required in production (throws, logged); dev falls back to the request host.
 */
export async function appUrl(): Promise<string> {
  const h = await headers();
  try {
    return resolveAppOrigin({
      configured: process.env.APP_URL,
      nodeEnv: process.env.NODE_ENV,
      header: (name) => h.get(name),
    });
  } catch (error) {
    if (error instanceof AppUrlNotConfiguredError) console.error(`[menzu] ${error.message}`);
    throw error;
  }
}

export async function authAppUrl(): Promise<string> {
  return appUrl();
}

/** Customer storefront origin for menus, QR codes and links from restaurant pages. */
export async function customerAppUrl(): Promise<string> {
  return appUrl();
}
