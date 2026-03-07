import { supabase } from '@/integrations/supabase/client';
import { QuoteData, ServiceItem, FlightLeg, AgencySettings, PaymentData } from '@/types/quote';

// ---- Agency Settings ----

export async function getAgencySettingsFromDB(): Promise<AgencySettings> {
  const { data } = await supabase.from('agency_settings').select('*').limit(1).single();
  if (data) {
    return {
      name: data.name,
      logoBase64: data.logo_url || undefined,
      whatsapp: data.whatsapp || '',
      email: data.email || '',
      website: data.website || '',
    };
  }
  return { name: 'Minha Agência de Viagens', whatsapp: '', email: '', website: '' };
}

export async function saveAgencySettingsToDB(settings: AgencySettings) {
  const { data: existing } = await supabase.from('agency_settings').select('id').limit(1).single();
  
  const payload = {
    name: settings.name,
    logo_url: settings.logoBase64 || null,
    whatsapp: settings.whatsapp,
    email: settings.email,
    website: settings.website,
  };

  if (existing) {
    await supabase.from('agency_settings').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('agency_settings').insert(payload);
  }
}

// ---- Image Upload ----

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
  
  const { error } = await supabase.storage.from('quote-images').upload(fileName, file);
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  
  const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ---- Quotes CRUD ----

export interface FullQuote {
  id: string;
  shortId: string;
  client: QuoteData['client'];
  trip: QuoteData['trip'];
  services: ServiceItem[];
  payment?: PaymentData;
  destinationImageUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
}

function parsePayment(q: any): PaymentData | undefined {
  const p: PaymentData = {
    pixValue: Number(q.payment_pix_value) || 0,
    installmentsNoInterest: Number(q.payment_installments_no_interest) || 0,
    installmentsWithInterest: Number(q.payment_installments_with_interest) || 0,
    installmentValueNoInterest: Number(q.payment_installment_value_no_interest) || 0,
    installmentValueWithInterest: Number(q.payment_installment_value_with_interest) || 0,
    showIndividualValues: q.show_individual_values || false,
    showPerPassenger: q.show_per_passenger || false,
    rav: Number(q.payment_rav) || 0,
  };
  if (p.pixValue || p.installmentsNoInterest || p.installmentsWithInterest || p.showIndividualValues || p.showPerPassenger || p.rav) return p;
  return undefined;
}

async function fetchServicesForQuote(quoteId: string): Promise<ServiceItem[]> {
  const { data: servicesData } = await supabase
    .from('services')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order');

  if (!servicesData || servicesData.length === 0) return [];

  const serviceIds = servicesData.map(s => s.id);
  
  const [{ data: flightLegsData }, { data: imagesData }] = await Promise.all([
    supabase.from('flight_legs').select('*').in('service_id', serviceIds).order('sort_order'),
    supabase.from('service_images').select('*').in('service_id', serviceIds).order('sort_order'),
  ]);

  return servicesData.map((s) => {
    const rawBaggage = (s as any).baggage;
    const baggage = rawBaggage ? (typeof rawBaggage === 'string' ? JSON.parse(rawBaggage) : rawBaggage) : undefined;
    return {
      id: s.id,
      type: s.type as ServiceItem['type'],
      title: s.title,
      description: s.description || '',
      supplier: s.supplier || '',
      startDate: s.start_date || '',
      endDate: s.end_date || '',
      location: s.location || '',
      value: Number(s.value),
      quantity: s.quantity,
      imageBase64: s.image_url || undefined,
      imagesBase64: imagesData?.filter(img => img.service_id === s.id).map(img => img.image_url),
      flightLegs: flightLegsData
        ?.filter(fl => fl.service_id === s.id)
        .map(fl => ({
          origin: fl.origin,
          destination: fl.destination,
          departureDate: fl.departure_date || '',
          departureTime: fl.departure_time || '',
          arrivalDate: fl.arrival_date || '',
          arrivalTime: fl.arrival_time || '',
          connectionDuration: (fl as any).connection_duration || '',
          direction: ((fl as any).direction || 'ida') as 'ida' | 'volta',
        })) || [],
      baggage,
    };
  });
}

function mapQuoteRow(q: any, services: ServiceItem[]): FullQuote {
  return {
    id: q.id,
    shortId: q.short_id,
    client: {
      name: q.client_name,
      passengers: q.client_passengers,
      phone: q.client_phone || '',
      email: q.client_email || '',
      notes: q.client_notes || '',
    },
    trip: {
      origin: q.trip_origin || '',
      destination: q.trip_destination || '',
      departureDate: q.trip_departure_date || '',
      returnDate: q.trip_return_date || '',
      tripType: q.trip_type as QuoteData['trip']['tripType'],
      nights: q.trip_nights || undefined,
    },
    services,
    payment: parsePayment(q),
    destinationImageUrl: q.destination_image_url || undefined,
    status: q.status,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    viewCount: q.view_count || 0,
  };
}

export async function getQuoteByShortId(shortId: string): Promise<FullQuote | null> {
  const { data: q } = await supabase
    .from('quotes')
    .select('*')
    .eq('short_id', shortId)
    .single();

  if (!q) return null;
  const services = await fetchServicesForQuote(q.id);
  return mapQuoteRow(q, services);
}

export async function getQuoteById(id: string): Promise<FullQuote | null> {
  const { data: q } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (!q) return null;
  const services = await fetchServicesForQuote(q.id);
  return mapQuoteRow(q, services);
}

export async function getAllQuotes(): Promise<FullQuote[]> {
  const { data: quotesData } = await supabase
    .from('quotes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!quotesData) return [];

  const results: FullQuote[] = [];
  for (const q of quotesData) {
    const services = await fetchServicesForQuote(q.id);
    results.push(mapQuoteRow(q, services));
  }
  return results;
}

async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email || null;
}

async function buildAuditSummary(
  quoteData: QuoteData,
  existingId?: string
): Promise<string> {
  if (!existingId) return 'Orçamento criado';

  const existing = await getQuoteById(existingId);
  if (!existing) return 'Orçamento atualizado';

  const changes: string[] = [];
  if (existing.client.name !== quoteData.client.name) changes.push(`Cliente: ${existing.client.name} → ${quoteData.client.name}`);
  if (existing.trip.destination !== quoteData.trip.destination) changes.push(`Destino: ${existing.trip.destination} → ${quoteData.trip.destination}`);
  if (existing.trip.origin !== quoteData.trip.origin) changes.push(`Origem: ${existing.trip.origin} → ${quoteData.trip.origin}`);
  if (existing.trip.departureDate !== quoteData.trip.departureDate) changes.push('Data ida alterada');
  if (existing.trip.returnDate !== quoteData.trip.returnDate) changes.push('Data volta alterada');
  
  const oldTotal = existing.services.reduce((s, sv) => s + sv.value * sv.quantity, 0);
  const newTotal = quoteData.services.reduce((s, sv) => s + sv.value * sv.quantity, 0);
  if (oldTotal !== newTotal) changes.push(`Total: R$ ${oldTotal.toFixed(2)} → R$ ${newTotal.toFixed(2)}`);
  
  if (existing.services.length !== quoteData.services.length) changes.push(`Serviços: ${existing.services.length} → ${quoteData.services.length}`);
  if (existing.payment?.pixValue !== quoteData.payment?.pixValue) changes.push('Valor Pix alterado');

  return changes.length > 0 ? changes.join('; ') : 'Atualização sem mudanças significativas';
}

export async function addAuditLog(quoteId: string, action: string, summary: string, userEmail: string) {
  await supabase.from('quote_audit_log').insert({
    quote_id: quoteId,
    action,
    summary,
    user_email: userEmail,
  } as any);
}

export async function getAuditLog(quoteId: string) {
  const { data } = await supabase
    .from('quote_audit_log' as any)
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function saveQuoteToDB(
  quoteData: QuoteData & { destinationImageUrl?: string },
  existingId?: string
): Promise<FullQuote> {
  const userEmail = await getCurrentUserEmail();
  
  // Build audit summary BEFORE modifying data
  let auditSummary: string | null = null;
  if (userEmail) {
    auditSummary = existingId
      ? await buildAuditSummary(quoteData, existingId)
      : 'Orçamento criado';
  }

  const quotePayload: any = {
    client_name: quoteData.client.name,
    client_phone: quoteData.client.phone,
    client_email: quoteData.client.email,
    client_passengers: quoteData.client.passengers,
    client_notes: quoteData.client.notes,
    trip_origin: quoteData.trip.origin,
    trip_destination: quoteData.trip.destination,
    trip_departure_date: quoteData.trip.departureDate || null,
    trip_return_date: quoteData.trip.returnDate || null,
    trip_type: quoteData.trip.tripType as any,
    trip_nights: quoteData.trip.nights || 0,
    destination_image_url: quoteData.destinationImageUrl || null,
    status: 'active',
    payment_pix_value: quoteData.payment?.pixValue || 0,
    payment_installments_no_interest: quoteData.payment?.installmentsNoInterest || 0,
    payment_installments_with_interest: quoteData.payment?.installmentsWithInterest || 0,
    payment_installment_value_no_interest: quoteData.payment?.installmentValueNoInterest || 0,
    payment_installment_value_with_interest: quoteData.payment?.installmentValueWithInterest || 0,
    show_individual_values: quoteData.payment?.showIndividualValues || false,
    show_per_passenger: quoteData.payment?.showPerPassenger || false,
  };

  let quoteId: string;
  let shortId: string;

  if (existingId) {
    const { data } = await supabase
      .from('quotes')
      .update(quotePayload)
      .eq('id', existingId)
      .select('id, short_id')
      .single();
    quoteId = data!.id;
    shortId = data!.short_id;

    // Delete old services (cascade deletes flight_legs and service_images)
    await supabase.from('services').delete().eq('quote_id', quoteId);
  } else {
    const { data } = await supabase
      .from('quotes')
      .insert(quotePayload)
      .select('id, short_id')
      .single();
    quoteId = data!.id;
    shortId = data!.short_id;
  }

  // Audit log
  if (userEmail && auditSummary) {
    await addAuditLog(quoteId, existingId ? 'atualizado' : 'criado', auditSummary, userEmail);
  }

  // Insert services
  for (let i = 0; i < quoteData.services.length; i++) {
    const s = quoteData.services[i];
    const { data: serviceData } = await supabase
      .from('services')
      .insert({
        quote_id: quoteId,
        type: s.type as any,
        title: s.title,
        description: s.description,
        supplier: s.supplier,
        start_date: s.startDate || null,
        end_date: s.endDate || null,
        location: s.location,
        value: s.value,
        quantity: s.quantity,
        image_url: s.imageBase64 || null,
        sort_order: i,
        baggage: s.baggage ? s.baggage as any : null,
      } as any)
      .select('id')
      .single();

    if (!serviceData) continue;

    // Insert flight legs
    if (s.flightLegs && s.flightLegs.length > 0) {
      await supabase.from('flight_legs').insert(
        s.flightLegs.map((fl, idx) => ({
          service_id: serviceData.id,
          origin: fl.origin,
          destination: fl.destination,
          departure_date: fl.departureDate || null,
          departure_time: fl.departureTime || '',
          arrival_date: fl.arrivalDate || null,
          arrival_time: fl.arrivalTime || '',
          connection_duration: fl.connectionDuration || '',
          direction: fl.direction || 'ida',
          sort_order: idx,
        }))
      );
    }

    // Insert extra images
    if (s.imagesBase64 && s.imagesBase64.length > 0) {
      await supabase.from('service_images').insert(
        s.imagesBase64.map((url, idx) => ({
          service_id: serviceData.id,
          image_url: url,
          sort_order: idx,
        }))
      );
    }
  }

  return (await getQuoteById(quoteId))!;
}

export async function incrementViewCount(shortId: string) {
  const { data } = await supabase
    .from('quotes')
    .select('id, view_count')
    .eq('short_id', shortId)
    .single();
  if (data) {
    await supabase
      .from('quotes')
      .update({ view_count: (data.view_count || 0) + 1 } as any)
      .eq('id', data.id);
  }
}

export async function deleteQuoteFromDB(id: string) {
  const userEmail = await getCurrentUserEmail();
  if (userEmail) {
    await addAuditLog(id, 'excluído', 'Orçamento excluído', userEmail);
  }
  await supabase.from('quotes').delete().eq('id', id);
}

export async function duplicateQuote(id: string): Promise<FullQuote | null> {
  const original = await getQuoteById(id);
  if (!original) return null;

  const quoteData: QuoteData & { destinationImageUrl?: string } = {
    client: { ...original.client, name: `${original.client.name} (cópia)` },
    trip: original.trip,
    services: original.services,
    payment: original.payment,
    destinationImageUrl: original.destinationImageUrl,
  };

  return saveQuoteToDB(quoteData);
}
