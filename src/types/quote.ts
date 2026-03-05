export type ServiceType = 'aereo' | 'hotel' | 'carro' | 'seguro' | 'experiencia' | 'adicional';

export interface FlightLeg {
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  connectionDuration?: string;
  direction?: 'ida' | 'volta';
}

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
  imagesBase64?: string[];
  flightLegs?: FlightLeg[];
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
  tripType: 'Lazer' | 'Negócios' | 'Lua de mel' | 'Família' | 'Experiência Premium';
  nights?: number;
}

export interface PaymentData {
  pixValue: number;
  installmentsNoInterest: number;
  installmentsWithInterest: number;
  installmentValueNoInterest: number;
  installmentValueWithInterest: number;
  showIndividualValues?: boolean;
}

export interface QuoteData {
  id?: string;
  client: ClientData;
  trip: TripData;
  services: ServiceItem[];
  payment?: PaymentData;
  createdAt?: string;
  updatedAt?: string;
  destinationImageUrl?: string;
}

export interface AgencySettings {
  name: string;
  logoBase64?: string;
  whatsapp: string;
  email: string;
  website: string;
}

export const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; icon: string; pdfLabel: string }> = {
  aereo: { label: 'Passagens Aéreas', icon: '✈️', pdfLabel: 'Passagens Aereas' },
  hotel: { label: 'Hospedagem', icon: '🏨', pdfLabel: 'Hospedagem' },
  carro: { label: 'Aluguel de Carro', icon: '🚗', pdfLabel: 'Aluguel de Carro' },
  seguro: { label: 'Seguro Viagem', icon: '🛡️', pdfLabel: 'Seguro Viagem' },
  experiencia: { label: 'Experiências / Passeios', icon: '🎟️', pdfLabel: 'Experiencias / Passeios' },
  adicional: { label: 'Serviços Adicionais', icon: '📋', pdfLabel: 'Servicos Adicionais' },
};
