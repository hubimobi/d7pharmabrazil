/**
 * Validates a Brazilian CPF number using the official digit-check algorithm.
 * Rejects sequences like 111.111.111-11 and verifies both check digits.
 */
export function isValidCPF(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;

  // Reject sequences where all digits are the same (e.g. 111.111.111-11)
  if (/^(\d)\1+$/.test(digits)) return false;

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let remainder = 11 - (sum % 11);
  if (remainder >= 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  remainder = 11 - (sum % 11);
  if (remainder >= 10) remainder = 0;
  return remainder === Number(digits[10]);
}
