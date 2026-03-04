import { AgencySettings, QuoteData } from '@/types/quote';

const AGENCY_KEY = 'agency-settings';
const QUOTE_KEY = 'current-quote';

export function getAgencySettings(): AgencySettings {
  const stored = localStorage.getItem(AGENCY_KEY);
  if (stored) return JSON.parse(stored);
  return { name: 'Minha Agência de Viagens', whatsapp: '', email: '', website: '' };
}

export function saveAgencySettings(settings: AgencySettings) {
  localStorage.setItem(AGENCY_KEY, JSON.stringify(settings));
}

export function getQuoteData(): QuoteData | null {
  const stored = localStorage.getItem(QUOTE_KEY);
  if (stored) return JSON.parse(stored);
  return null;
}

export function saveQuoteData(data: QuoteData) {
  localStorage.setItem(QUOTE_KEY, JSON.stringify(data));
}

export function clearQuoteData() {
  localStorage.removeItem(QUOTE_KEY);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
