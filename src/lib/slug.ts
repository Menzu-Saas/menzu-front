/** URL slug from a display name: lowercase ASCII, accents stripped, non-alphanumerics → "-", max 50 chars. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

/** Endereços possíveis para um nome, em ordem de preferência: "x", "x-2", "x-3"… Vazio se o nome for curto. */
export function slugCandidates(name: string, count = 20): string[] {
  const base = slugify(name);
  if (base.length < 3) return [];
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return base;
    const suffix = `-${index + 1}`;
    return base.slice(0, 50 - suffix.length).replace(/-+$/g, "") + suffix;
  });
}
