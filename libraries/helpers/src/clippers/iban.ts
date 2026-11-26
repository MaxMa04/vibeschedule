/** "de89 3704 0044 0532 0130 00" to "DE89370400440532013000" */
export const normalizeIban = (value: string) =>
  value.replace(/[\s-]/g, '').toUpperCase();

/** country code, check digits and the mod-97 checksum of ISO 13616 */
export const isValidIban = (value: string) => {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return false;
  }
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55)
  );
  let rest = 0;
  for (const digit of digits) {
    rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
};

/** DE89 3704 0044 0532 0130 00 */
export const formatIban = (value: string) =>
  normalizeIban(value)
    .replace(/(.{4})/g, '$1 ')
    .trim();
