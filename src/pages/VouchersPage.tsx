import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Plane, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { generateVoucherPdf, VoucherPdfData } from '@/lib/generateVoucherPdf';
import { generateAirlineVoucherPdf, AirlineVoucherData, AirlineVoucherPassenger, AdditionalAirService } from '@/lib/generateAirlineVoucherPdf';

interface SaleRow {
  id: string;
  client_name: string;
  sale_date: string;
  total_sale: number;
  status: string;
  short_id: string;
  sale_workflow_status: string;
  destination_name: string;
  trip_start_date: string;
  trip_end_date: string;
  trip_nights: number;
  passengers_count: number;
  notes: string;
  seller_id: string;
  show_individual_values: boolean;
  payment_method: string;
  installments: number;
  empresa_id: string;
}

export default function VouchersPage() {
  const { activeCompany } = useCompany();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, [activeCompany?.id]);

  const fetchSales = async () => {
    setLoading(true);
    let query = supabase
      .from('sales')
      .select('*')
      .eq('status', 'active')
      .order('sale_date', { ascending: false });
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setSales(data as SaleRow[]);
    setLoading(false);
  };

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.client_name?.toLowerCase().includes(q) ||
      s.short_id?.toLowerCase().includes(q)
    );
  });

  const { sortedData: sortedSales, sortState, requestSort } = useTableSort(filtered, {
    short_id: (s) => s.short_id,
    client_name: (s) => s.client_name,
    sale_date: (s) => s.sale_date,
    total_sale: (s) => Number(s.total_sale) || 0,
    sale_workflow_status: (s) => s.sale_workflow_status,
  });

  const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  const statusLabel = (s: string) => {
    switch (s) {
      case 'em_andamento': return 'Em Andamento';
      case 'concluida': return 'Concluída';
      case 'cancelada': return 'Cancelada';
      default: return s || 'Ativa';
    }
  };

  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (s) {
      case 'concluida': return 'default';
      case 'cancelada': return 'destructive';
      case 'em_andamento': return 'secondary';
      default: return 'outline';
    }
  };

  const loadAgency = async () => {
    const agQuery = activeCompany?.id
      ? supabase.from('agency_settings').select('*').eq('empresa_id', activeCompany.id).limit(1)
      : supabase.from('agency_settings').select('*').limit(1);
    const { data } = await agQuery;
    return data?.[0] as any || { name: 'Agência de Viagens', whatsapp: '', email: '', website: '', logo_url: '' };
  };

  const loadLogoBase64 = async (url: string): Promise<string | undefined> => {
    if (!url) return undefined;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return undefined; }
  };

  const loadImageBase64 = async (url: string): Promise<string | undefined> => {
    if (!url) return undefined;
    // Try direct fetch first; on CORS failure, fall back to proxy-image edge function
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('fetch failed');
      const blob = await resp.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      try {
        const proxyUrl = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
        const resp = await fetch(proxyUrl);
        const blob = await resp.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { return undefined; }
    }
  };

  const loadVortexWhiteLogo = async (): Promise<string | undefined> => {
    try {
      const resp = await fetch('/images/vortex-white-logo.png');
      const blob = await resp.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return undefined; }
  };

  const loadSaleItems = async (saleId: string) => {
    const { data } = await supabase.from('sale_items').select('*').eq('sale_id', saleId).order('sort_order');
    return (data || []) as any[];
  };

  const loadPassengers = async (saleId: string) => {
    const { data } = await (supabase.from('sale_passengers' as any).select('*').eq('sale_id', saleId).order('sort_order') as any);
    return (data || []) as any[];
  };

  const loadRecvs = async (saleId: string) => {
    const { data } = await (supabase.from('accounts_receivable' as any).select('*').eq('sale_id', saleId).order('installment_number') as any);
    return (data || []) as any[];
  };

  const loadSellers = async () => {
    const { data } = await (supabase.from('sellers' as any).select('id, full_name') as any);
    return (data || []) as any[];
  };

  const loadServiceCatalog = async () => {
    const { data } = await (supabase.from('service_catalog' as any).select('id, name') as any);
    return (data || []) as any[];
  };

  const loadReservations = async (saleId: string) => {
    const { data } = await supabase.from('reservations').select('*, suppliers(name)').eq('sale_id', saleId);
    return (data || []).map((r: any) => ({
      description: r.description || '',
      confirmationCode: r.confirmation_code || '',
      supplier: r.suppliers?.name || '',
      checkIn: r.check_in || '',
      checkOut: r.check_out || '',
      status: r.status || '',
    }));
  };

  const handleServicesVoucher = async (sale: SaleRow) => {
    setGeneratingId(sale.id);
    try {
      const [agency, items, passengers, receivables, sellers, serviceCatalog, reservations, vortexLogo, logoBase64] = await Promise.all([
        loadAgency(),
        loadSaleItems(sale.id),
        loadPassengers(sale.id),
        loadRecvs(sale.id),
        loadSellers(),
        loadServiceCatalog(),
        loadReservations(sale.id),
        loadVortexWhiteLogo(),
        loadAgency().then(a => loadLogoBase64(a.logo_url)),
      ]);

      const hotels: any[] = [];
      const flightLegs: any[] = [];
      const flightGroups: any[][] = [];

      for (const item of items) {
        if (item.metadata?.type === 'hotel') {
          const h = item.metadata.hotel;
          if (h) {
            let nights = 0;
            if (h.checkInDate && h.checkOutDate) {
              const ci = new Date(h.checkInDate + 'T12:00:00');
              const co = new Date(h.checkOutDate + 'T12:00:00');
              if (!isNaN(ci.getTime()) && !isNaN(co.getTime()) && co > ci) {
                nights = Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
              }
            }
            const firstImg = Array.isArray(h.images) && h.images.length > 0 ? h.images[0] : undefined;
            const imageBase64 = firstImg ? await loadImageBase64(firstImg) : undefined;
            // derive adults/children from passengers (birth_date < 18 = child)
            const today = new Date();
            let adults = 0, children = 0;
            const childrenAges: number[] = [];
            for (const p of passengers) {
              if (!p.birth_date) { adults++; continue; }
              const bd = new Date(p.birth_date + 'T12:00:00');
              if (isNaN(bd.getTime())) { adults++; continue; }
              let age = today.getFullYear() - bd.getFullYear();
              const md = today.getMonth() - bd.getMonth();
              if (md < 0 || (md === 0 && today.getDate() < bd.getDate())) age--;
              if (age < 18) { children++; childrenAges.push(age); } else { adults++; }
            }
            hotels.push({
              name: h.hotelName || item.description || 'Hotel',
              description: h.observations || '',
              detailedDescription: item.metadata?.detailedDescription || '',
              checkIn: h.checkInDate,
              checkOut: h.checkOutDate,
              nights,
              room: h.roomType || '',
              meal: Array.isArray(h.amenities) && h.amenities.length > 0 ? h.amenities[0] : '',
              reservationNumber: item.reservation_number || '',
              address: h.address || [h.address, h.city, h.country].filter(Boolean).join(', '),
              phone: h.phone || '',
              checkInTime: h.checkInTime || '',
              checkOutTime: h.checkOutTime || '',
              adults: h.guestCount && !adults ? h.guestCount : adults || (h.guestCount || 0),
              children,
              childrenAges,
              imageBase64,
              images: h.images || [],
            });
          } else {
            // Hotel item without structured metadata.hotel — still include it
            const catName = item.service_catalog_id ? serviceCatalog.find((s: any) => s.id === item.service_catalog_id)?.name || '' : '';
            hotels.push({
              name: catName || item.description || 'Hotel',
              description: '',
              detailedDescription: item.metadata?.detailedDescription || '',
              checkIn: '', checkOut: '', nights: 0, room: '', meal: '',
              reservationNumber: item.reservation_number || '',
            });
          }
        }
        if (item.metadata?.type === 'aereo' && item.metadata.flightLegs?.length) {
          flightGroups.push([...item.metadata.flightLegs]);
          flightLegs.push(...item.metadata.flightLegs);
        }
      }

      // Validation: require at least one image on every hotel before generating
      const hotelsWithoutImage = hotels.filter((h: any) => !h.imageBase64 && !(h.images && h.images.length > 0));
      if (hotels.length > 0 && hotelsWithoutImage.length > 0) {
        const names = hotelsWithoutImage.map((h: any) => h.name).filter(Boolean).join(', ');
        toast.error(
          `Selecione ao menos uma imagem para gerar o voucher${names ? `: ${names}` : '.'}. Edite o serviço de hotel e marque as fotos desejadas.`,
          { duration: 6000 }
        );
        setGeneratingId(null);
        return;
      }

      const sellerName = sellers.find((s: any) => s.id === sale.seller_id)?.full_name;

      const voucherData: VoucherPdfData = {
        agency: { name: agency.name, whatsapp: agency.whatsapp || '', email: agency.email || '', website: agency.website || '', logoBase64 },
        vortexWhiteLogoBase64: vortexLogo,
        client: { name: sale.client_name },
        seller: sellerName,
        destination: sale.destination_name || '',
        departureDate: sale.trip_start_date || '',
        returnDate: sale.trip_end_date || '',
        nights: sale.trip_nights || undefined,
        passengersCount: passengers.length || sale.passengers_count || 1,
        passengers: passengers.map((p: any, i: number) => ({
          name: `${p.first_name} ${p.last_name}`.trim() || `Passageiro ${i + 1}`,
          document: p.document_number || undefined,
          documentType: p.document_type || undefined,
          birthDate: p.birth_date || undefined,
          isMain: p.is_main,
        })),
        flightLegs, flightGroups, hotels,
        services: items.map((item: any, idx: number) => {
          const catName = item.service_catalog_id ? serviceCatalog.find((s: any) => s.id === item.service_catalog_id)?.name || '' : '';
          return {
            name: catName || item.description || `Serviço ${idx + 1}`,
            description: item.metadata?.detailedDescription || item.description,
            value: item.total_value,
            type: item.metadata?.type || '',
            reservationNumber: item.reservation_number || '',
          };
        }),
        allItems: [], showIndividualValues: false,
        totalTrip: sale.total_sale,
        reservations,
        payment: {
          method: sale.payment_method || '',
          installments: sale.installments || 1,
          receivables: receivables.map((r: any) => ({ number: r.installment_number, amount: r.amount, dueDate: r.due_date })),
        },
        notes: sale.notes || undefined,
        saleDate: sale.sale_date,
        shortId: items.find((i: any) => i.purchase_number)?.purchase_number || sale.short_id,
      };

      const doc = generateVoucherPdf(voucherData);
      doc.save(`voucher-servicos-${sale.client_name.replace(/\s+/g, '-').toLowerCase()}-${sale.sale_date}.pdf`);
      toast.success('Voucher de serviços gerado!');
    } catch (err) {
      console.error('Error generating services voucher:', err);
      toast.error('Erro ao gerar voucher de serviços');
    }
    setGeneratingId(null);
  };

  const handleAirlineVoucher = async (sale: SaleRow) => {
    setGeneratingId(sale.id);
    try {
      const [agency, items, passengers, vortexLogo] = await Promise.all([
        loadAgency(),
        loadSaleItems(sale.id),
        loadPassengers(sale.id),
        loadVortexWhiteLogo(),
      ]);

      const airlineItems = items.filter((i: any) => i.metadata?.type === 'aereo' && i.metadata?.flightLegs?.length);
      const additionalAirItems = items.filter((i: any) => i.metadata?.type === 'adicional' && i.metadata?.isAirService);

      if (airlineItems.length === 0 && additionalAirItems.length === 0) {
        toast.error('Nenhum serviço aéreo encontrado nesta venda');
        setGeneratingId(null);
        return;
      }

      // Build additional air services as structured objects
      const additionalServices: AdditionalAirService[] = additionalAirItems.map((ai: any) => ({
        title: ai.description || ai.catalog_item_name || 'Serviço Adicional',
        description: ai.metadata?.detailedDescription ? ai.metadata.detailedDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() : undefined,
        reservationNumber: ai.reservation_number || undefined,
      }));

      if (airlineItems.length === 0) {
        // Only additional air items, no flight legs — generate a simple voucher with notes
        const airVoucherData: AirlineVoucherData = {
          agencyLogoBase64: vortexLogo,
          airlineName: '',
          shortId: sale.short_id || undefined,
          localizador: '',
          passengers: passengers.map((p: any, i: number) => ({
            name: `${p.first_name} ${p.last_name}`.trim() || `Passageiro ${i + 1}`,
            eticketNumber: p.eticket_number || undefined,
            seat: p.seat || undefined,
            baggage: { personalItem: 1, carryOn: 1, checkedBag: 1 },
          })),
          flightLegs: [],
          additionalServices,
          agencyName: agency.name, agencyWhatsapp: agency.whatsapp || '',
          agencyEmail: agency.email || '', agencyWebsite: agency.website || '',
        };
        const airDoc = generateAirlineVoucherPdf(airVoucherData);
        airDoc.save(`voucher-aereo-${sale.client_name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      } else {
        for (const airItem of airlineItems) {
          const meta = airItem.metadata!;
          const legs = meta.flightLegs || [];

          let airlineName = '';
          if (meta.airlineId) {
            const { data: airlineData } = await (supabase.from('airlines' as any).select('name').eq('id', meta.airlineId).maybeSingle() as any);
            if (airlineData) airlineName = airlineData.name || '';
          }

          const legAirlineIds = [...new Set(legs.map((l: any) => l.airlineId).filter(Boolean))];
          const airlineCache: Record<string, { name: string; logoBase64?: string }> = {};
          for (const aid of legAirlineIds) {
            const aidStr = String(aid);
            const { data: aData } = await (supabase.from('airlines' as any).select('name, logo_url').eq('id', aidStr).maybeSingle() as any);
            if (aData) {
              const legLogo = await loadLogoBase64(aData.logo_url);
              airlineCache[aidStr] = { name: aData.name || '', logoBase64: legLogo };
            }
          }

          const airPax: AirlineVoucherPassenger[] = passengers.map((p: any, i: number) => ({
            name: `${p.first_name} ${p.last_name}`.trim() || `Passageiro ${i + 1}`,
            eticketNumber: p.eticket_number || undefined,
            seat: p.seat || undefined,
            baggage: meta.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 },
          }));

          const baseNotes = meta.detailedDescription ? meta.detailedDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() : '';

          const airVoucherData: AirlineVoucherData = {
            agencyLogoBase64: vortexLogo,
            airlineName,
            shortId: airItem.purchase_number || sale.short_id || undefined,
            localizador: airItem.reservation_number || '',
            passengers: airPax,
            flightLegs: legs.map((l: any) => ({
              origin: l.origin || '', destination: l.destination || '',
              originFull: l.originFull || '', destinationFull: l.destinationFull || '',
              departureDate: l.departureDate || '', departureTime: l.departureTime || '',
              arrivalDate: l.arrivalDate || '', arrivalTime: l.arrivalTime || '',
              flightCode: l.flightCode || '', connectionDuration: l.connectionDuration || '',
              direction: l.direction || 'ida',
              airlineLogoBase64: l.airlineId && airlineCache[l.airlineId] ? airlineCache[l.airlineId].logoBase64 : undefined,
              airlineName: l.airlineId && airlineCache[l.airlineId] ? airlineCache[l.airlineId].name : undefined,
            })),
            notes: baseNotes || undefined,
            additionalServices,
            agencyName: agency.name, agencyWhatsapp: agency.whatsapp || '',
            agencyEmail: agency.email || '', agencyWebsite: agency.website || '',
          };

          const airDoc = generateAirlineVoucherPdf(airVoucherData);
          airDoc.save(`voucher-aereo-${airlineName ? airlineName.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${sale.client_name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        }
      }
      toast.success('Voucher(s) aéreo(s) gerado(s)!');
    } catch (err) {
      console.error('Error generating airline voucher:', err);
      toast.error('Erro ao gerar voucher aéreo');
    }
    setGeneratingId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vouchers</h1>
            <p className="text-sm text-muted-foreground">Gere vouchers diretamente das vendas emitidas</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline" className="ml-auto">
                {filtered.length} venda{filtered.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead sortKey="short_id" sortState={sortState} onSort={requestSort} className="w-[60px]">Ref</SortableTableHead>
                    <SortableTableHead sortKey="client_name" sortState={sortState} onSort={requestSort}>Cliente</SortableTableHead>
                    <SortableTableHead sortKey="sale_date" sortState={sortState} onSort={requestSort} className="w-[110px]">Data</SortableTableHead>
                    <SortableTableHead sortKey="total_sale" sortState={sortState} onSort={requestSort} className="w-[120px] text-right">Total</SortableTableHead>
                    <SortableTableHead sortKey="sale_workflow_status" sortState={sortState} onSort={requestSort} className="w-[120px]">Status</SortableTableHead>
                    <TableHead className="w-[200px] text-center">Vouchers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                    </TableRow>
                  ) : sortedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search ? 'Nenhuma venda encontrada' : 'Nenhuma venda emitida'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{sale.short_id || '-'}</TableCell>
                        <TableCell className="font-medium">{sale.client_name}</TableCell>
                        <TableCell className="text-sm">
                          {sale.sale_date ? format(new Date(sale.sale_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmt(sale.total_sale)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(sale.sale_workflow_status)}>
                            {statusLabel(sale.sale_workflow_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleServicesVoucher(sale)}
                              disabled={generatingId === sale.id}
                              title="Voucher de Serviços"
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Serviços
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAirlineVoucher(sale)}
                              disabled={generatingId === sale.id}
                              title="Voucher Aéreo"
                            >
                              <Plane className="h-3.5 w-3.5 mr-1" />
                              Aéreo
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
