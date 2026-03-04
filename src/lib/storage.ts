import { AgencySettings, QuoteData } from '@/types/quote';

const AGENCY_KEY = 'agency-settings';
const QUOTES_KEY = 'saved-quotes';

export function getAgencySettings(): AgencySettings {
  const stored = localStorage.getItem(AGENCY_KEY);
  if (stored) return JSON.parse(stored);
  return { name: 'Minha Agência de Viagens', whatsapp: '', email: '', website: '' };
}

export function saveAgencySettings(settings: AgencySettings) {
  localStorage.setItem(AGENCY_KEY, JSON.stringify(settings));
}

// --- Saved Quotes (without images to avoid quota) ---

function stripImages(quote: QuoteData): QuoteData {
  return {
    ...quote,
    services: quote.services.map(s => ({
      ...s,
      imageBase64: undefined,
      imagesBase64: undefined,
    })),
  };
}

export function getSavedQuotes(): QuoteData[] {
  try {
    const stored = localStorage.getItem(QUOTES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function saveQuote(quote: QuoteData): QuoteData {
  const quotes = getSavedQuotes();
  const now = new Date().toISOString();
  if (!quote.id) {
    quote.id = crypto.randomUUID();
    quote.createdAt = now;
  }
  quote.updatedAt = now;

  const stripped = stripImages(quote);
  const idx = quotes.findIndex(q => q.id === quote.id);
  if (idx >= 0) {
    quotes[idx] = stripped;
  } else {
    quotes.unshift(stripped);
  }

  try {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
  } catch {
    // If quota exceeded, try removing oldest
    if (quotes.length > 1) {
      quotes.pop();
      localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
    }
  }
  return quote;
}

export function deleteQuote(id: string) {
  const quotes = getSavedQuotes().filter(q => q.id !== id);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
