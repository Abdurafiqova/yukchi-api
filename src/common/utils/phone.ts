export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('998') ? digits.slice(3) : digits;

  if (local.length !== 9) return null;

  return `+998${local}`;
}
