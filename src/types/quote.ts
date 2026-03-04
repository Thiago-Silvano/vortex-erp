export type ServiceType = 'aereo' | 'hotel' | 'carro' | 'seguro' | 'experiencia' | 'adicional';

export interface ServiceItem {
  id: string;
  type: ServiceType;
  title: string;
  description: string;
  supplier: string;
  startDate: string;
  endDate: string;
  location: string;
  value: number;
  quantity: number;
  imageBase64?: string;
}

export interface ClientData {
  name: string;
  passengers: number;
  phone: string;
  email: string;
  notes: string;
}

export interface TripData {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  tripType: 'Lazer' | 'Negócios' | 'Lua de mel' | 'Família';
}

export interface QuoteData {
  client: ClientData;
  trip: TripData;
  services: ServiceItem[];
}

export interface AgencySettings {
  name: string;
  logoBase64?: string;
  whatsapp: string;
  email: string;
  website: string;
}

export const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; icon: string }> = {
  aereo: { label: 'Passagens Aéreas', icon: '✈️' },
  hotel: { label: 'Hospedagem', icon: '🏨' },
  carro: { label: 'Aluguel de Carro', icon: '🚗' },
  seguro: { label: 'Seguro Viagem', icon: '🛡' },
  experiencia: { label: 'Experiências / Passeios', icon: '🎟' },
  adicional: { label: 'Serviços Adicionais', icon: '📋' },
};
