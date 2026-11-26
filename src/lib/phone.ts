export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Formats 10/11 digit BR numbers: (11) 98765-4321 / (11) 3456-7890. */
export function formatPhone(digits: string): string {
  const d = onlyDigits(digits);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/** 10-11 digits with DDD between 11 and 99. */
export function isValidBrPhone(digits: string): boolean {
  const d = onlyDigits(digits);
  if (d.length < 10 || d.length > 11) return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  return ddd >= 11 && ddd <= 99;
}

/** Digits with the Brazil country code (55) prepended unless it is already there. */
export function brE164Digits(phoneDigits: string): string {
  const d = onlyDigits(phoneDigits);
  return d.length >= 12 && d.length <= 13 && d.startsWith("55") ? d : `55${d}`;
}

export function whatsappLink(phoneDigits: string, text: string): string {
  return `https://wa.me/${brE164Digits(phoneDigits)}?text=${encodeURIComponent(text)}`;
}

/** `tel:` URI in E.164 (`tel:+5511987654321`). */
export function telLink(phoneDigits: string): string {
  return `tel:+${brE164Digits(phoneDigits)}`;
}

export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
