/** Só dígitos. */
export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Máscara profissional BR: (11) 99999-9999
 * Aceita digitação com ou sem DDI 55.
 */
export function formatWhatsAppMask(value: string) {
  let digits = digitsOnly(value);
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Valor persistido/enviado à API (DDI 55 + DDD + número, quando completo). */
export function whatsappForApi(value: string) {
  let digits = digitsOnly(value);
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(0, 13);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.slice(0, 13);
}

export function whatsappIsValidOptional(value: string) {
  if (!value.trim()) return true;
  const digits = digitsOnly(value);
  const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return local.length === 10 || local.length === 11;
}
