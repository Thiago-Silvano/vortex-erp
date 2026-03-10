import { AgencySettings } from '@/types/quote';

const AGENCY_KEY = 'agency-settings';

export function getAgencySettings(): AgencySettings {
  const stored = localStorage.getItem(AGENCY_KEY);
  if (stored) return JSON.parse(stored);
  return { name: 'Minha Agência de Viagens', whatsapp: '', email: '', website: '' };
}

export function saveAgencySettings(settings: AgencySettings) {
  localStorage.setItem(AGENCY_KEY, JSON.stringify(settings));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
