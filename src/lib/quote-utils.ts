/**
 * Calculate quote validity date (tomorrow at 23:59)
 */
export function getQuoteValidityDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);
  return tomorrow;
}

/**
 * Format quote validity info
 */
export function formatQuoteValidity(): string {
  const validUntil = getQuoteValidityDate();
  const day = String(validUntil.getDate()).padStart(2, '0');
  const month = String(validUntil.getMonth() + 1).padStart(2, '0');
  const year = validUntil.getFullYear();
  return `${day}/${month}/${year}`;
}
