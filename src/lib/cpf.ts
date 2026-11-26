/** Mantém só os dígitos, no máximo 11. */
export function cpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** Valida tamanho, sequências repetidas e os dois dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

/** 12345678901 → 123.456.789-01, de forma progressiva enquanto a pessoa digita. */
export function formatCpf(value: string): string {
  const d = cpfDigits(value);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** Exibição segura: ***.***.***-XX só com o final. */
export function maskedCpf(last3: string): string {
  return `•••.•••.••${last3.slice(0, 1)}-${last3.slice(1)}`;
}
