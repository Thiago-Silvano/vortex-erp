/**
 * Calculate quote validity date (today at 23:59)
 */
export function getQuoteValidityDate(): Date {
  const today = new Date();
  today.setHours(23, 59, 0, 0);
  return today;
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
