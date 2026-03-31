import React, { useState, useEffect, useMemo, useRef } from 'react';
import ImagePositionEditor, { ImagePositionConfig } from '@/components/ImagePositionEditor';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Upload, FileText, ExternalLink, FileUp, ChevronsUpDown, Download, Link2, ImagePlus, X, Edit, Paperclip, GripVertical, ArrowUp, ArrowDown, Sparkles, Loader2, ShieldCheck, FileEdit, Move, Search, Send, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateVoucherPdf, VoucherPdfData } from '@/lib/generateVoucherPdf';
import { generatePremiumQuotePdf, PremiumPdfData } from '@/lib/generatePremiumQuotePdf';
import { generateAirlineVoucherPdf, AirlineVoucherData, AirlineVoucherPassenger } from '@/lib/generateAirlineVoucherPdf';
import PdfImportModal from '@/components/PdfImportModal';
import QuickClientModal from '@/components/QuickClientModal';
import ServiceEditModal, { ServiceMetadata } from '@/components/ServiceEditModal';
import ImageSearchModal, { StockImage } from '@/components/ImageSearchModal';
import ContractSection from '@/components/ContractSection';
import SaleTimeline from '@/components/SaleTimeline';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { maskPhone, maskCpf, maskEmail, maskCurrency, parseCurrency } from '@/lib/masks';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

interface SaleItem {
  id?: string;
  description: string;
  cost_price: number;
  rav: number;
  markup_percent: number;
  total_value: number;
  service_catalog_id?: string;
  cost_center_id?: string;
  metadata?: ServiceMetadata;
  reservation_number?: string;
  purchase_number?: string;
  quote_option_id?: string;
  quote_option_ids?: string[];
}

interface QuoteOption {
  id?: string;
  name: string;
  order_index: number;
}

interface ServiceCatalogOption {
  id: string;
  name: string;
  cost_center_id: string | null;
}

interface Passenger {
  id?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  document_type: 'cpf' | 'passaporte';
  document_number: string;
  document_expiry: string;
  email: string;
  phone: string;
  is_main: boolean;
  eticket_number: string;
}

interface SupplierOption { id: string; name: string; }
interface SellerOption { id: string; full_name: string; commission_type?: string; commission_percentage?: number; commission_base?: string; }
interface ClientOption { id: string; full_name: string; cpf?: string; email?: string; phone?: string; birth_date?: string; passport_number?: string; passport_expiry_date?: string; }
interface Receivable { installment_number: number; due_date: string; amount: number; cost_center_id?: string; payment_method?: string; }
interface CostCenter { id: string; name: string; }
interface CardRateEntry { installments: number; rate: number; }

interface SupplierPaymentControl {
  supplier_id: string;
  payment_method: 'pix' | 'faturado' | 'credito';
  payment_date: string;
  installments: number;
  installment_dates: { date: string; amount: number }[];
  amount: number;
  cost_center_id?: string;
  description: string;
}

interface ProposalPaymentOption {
  method: string;
  label: string;
  installments: number;
  discountPercent: number;
  enabled: boolean;
}
interface InternalFile { id?: string; file_name: string; file_url: string; }

export default function NewSalePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const quoteData = (location.state as any)?.quoteData;
  const initialEditSaleId = (location.state as any)?.editSaleId;
  const [editSaleId, setEditSaleId] = useState<string | undefined>(initialEditSaleId);

  const [quoteId, setQuoteId] = useState(quoteData?.id || '');
  const [clientName, setClientName] = useState(quoteData?.clientName || '');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [passengersCount, setPassengersCount] = useState(1);
  const [tripNights, setTripNights] = useState(0);
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [nightsManuallySet, setNightsManuallySet] = useState(false);
  const [destinationName, setDestinationName] = useState('');
  const [quoteTitle, setQuoteTitle] = useState('');

  const [allSuppliers, setAllSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [addingSupplierId, setAddingSupplierId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogOption[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([{ name: 'Opção 1', order_index: 0 }]);

  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [installmentsMap, setInstallmentsMap] = useState<Record<string, number>>({});
  const getInstallments = (method: string) => installmentsMap[method] || 1;
  const setMethodInstallments = (method: string, count: number) => setInstallmentsMap(prev => ({ ...prev, [method]: count }));
  const [cardPaymentType, setCardPaymentType] = useState('');
  const [feeRate, setFeeRate] = useState(0);
  const [machineFee, setMachineFee] = useState(0);
  const [machineFeeSupplierId, setMachineFeeSupplierId] = useState<string>('');
  const [boletoInterestRate, setBoletoInterestRate] = useState(0);
  const [saleInterest, setSaleInterest] = useState(0);
  const [operatorTaxes, setOperatorTaxes] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [allSellers, setAllSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState<string>(quoteData?.sellerId || '');

  const [ecRates, setEcRates] = useState<CardRateEntry[]>([]);
  const [linkRates, setLinkRates] = useState<CardRateEntry[]>([]);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [destinationImageUrl, setDestinationImageUrl] = useState('');
  const [destinationImageConfig, setDestinationImageConfig] = useState<ImagePositionConfig | null>(null);
  const [imagePositionEditorOpen, setImagePositionEditorOpen] = useState(false);
  const [itemImages, setItemImages] = useState<Record<number, string[]>>({});
  const [uploadingItemImages, setUploadingItemImages] = useState<Record<number, boolean>>({});
  const [uploadingDestImage, setUploadingDestImage] = useState(false);
  const [aiImageSearch, setAiImageSearch] = useState(false);
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [aiImageDialog, setAiImageDialog] = useState(false);
  const [stockImageSearchOpen, setStockImageSearchOpen] = useState(false);
  const [unsplashApiKey, setUnsplashApiKey] = useState('');
  const [pexelsApiKey, setPexelsApiKey] = useState('');
  const [hasStockKeys, setHasStockKeys] = useState(false);
  const [internalFiles, setInternalFiles] = useState<InternalFile[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentControl[]>([]);
  const supplierPaymentsLoadedRef = useRef(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [searchingItemImages, setSearchingItemImages] = useState<Record<number, boolean>>({});
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [proposalPaymentOptions, setProposalPaymentOptions] = useState<ProposalPaymentOption[]>([
    { method: 'pix', label: 'PIX / À Vista', installments: 1, discountPercent: 0, enabled: false },
    { method: 'credito_3x', label: 'Cartão 3x', installments: 3, discountPercent: 0, enabled: false },
    { method: 'credito_6x', label: 'Cartão 6x', installments: 6, discountPercent: 0, enabled: false },
    { method: 'credito_10x', label: 'Cartão 10x', installments: 10, discountPercent: 0, enabled: false },
    { method: 'credito_12x', label: 'Cartão 12x', installments: 12, discountPercent: 0, enabled: false },
    { method: 'boleto', label: 'Boleto Bancário', installments: 1, discountPercent: 0, enabled: false },
  ]);

  // Service edit modal
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [showIndividualValues, setShowIndividualValues] = useState(true);
  const [showPerPassenger, setShowPerPassenger] = useState(false);
  const [showOnlyTotal, setShowOnlyTotal] = useState(false);
  const [saleStatus, setSaleStatus] = useState<'draft' | 'active' | 'new'>('new');
  const [saleWorkflowStatus, setSaleWorkflowStatus] = useState('em_aberto');
  const [askAddClientAsPassenger, setAskAddClientAsPassenger] = useState<ClientOption | null>(null);
  const [passengerSearchOpen, setPassengerSearchOpen] = useState<number | null>(null);
  const [passengerSearchTerm, setPassengerSearchTerm] = useState('');
  const [contractInfo, setContractInfo] = useState<{ status?: string; sentAt?: string | null; viewedAt?: string | null; signedAt?: string | null }>({});
  const [clientChoices, setClientChoices] = useState<any[]>([]);
  const [showChoicesModal, setShowChoicesModal] = useState(false);

  const isQuoteMode = saleStatus !== 'active';

  // Load contract info for timeline
  useEffect(() => {
    if (!editSaleId) return;
    supabase.from('contracts').select('status, sent_at, viewed_at, signed_at')
      .eq('sale_id', editSaleId).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setContractInfo({ status: data[0].status, sentAt: data[0].sent_at, viewedAt: data[0].viewed_at, signedAt: data[0].signed_at });
        }
      });
  }, [editSaleId]);

  // Load client proposal choices
  useEffect(() => {
    if (!editSaleId) return;
    (supabase.from('client_proposal_choices' as any) as any)
      .select('*')
      .eq('sale_id', editSaleId)
      .order('submitted_at', { ascending: false })
      .then(({ data }: any) => {
        if (data) setClientChoices(data);
      });
  }, [editSaleId]);

  useEffect(() => {
    if (initialEditSaleId) loadSale(initialEditSaleId);
  }, [initialEditSaleId]);

  const loadSale = async (id: string) => {
    const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single();
    if (!sale) return;
    setSaleStatus(sale.status === 'active' ? 'active' : 'draft');
    setSaleWorkflowStatus((sale as any).sale_workflow_status || 'em_aberto');
    setQuoteId(sale.quote_id || '');
    setClientName(sale.client_name);
    setSaleDate(sale.sale_date);
    const savedMethods = (sale.payment_method || 'pix').split(',').map((m: string) => m.trim()).filter(Boolean);
    setPaymentMethods(savedMethods.length > 0 ? savedMethods : []);
    const savedInstallments = sale.installments || 1;
    // Set installments for all saved methods
    const instMap: Record<string, number> = {};
    savedMethods.forEach((m: string) => { instMap[m] = savedInstallments; });
    setInstallmentsMap(instMap);
    setCardPaymentType((sale as any).card_payment_type || '');
    setFeeRate(Number(sale.card_fee_rate) || 0);
    setMachineFee(Number((sale as any).machine_fee) || 0);
    setMachineFeeSupplierId((sale as any).machine_fee_supplier_id || '');
    setCommissionRate(Number(sale.commission_rate) || 0);
    setSaleInterest(Number((sale as any).sale_interest) || 0);
    setOperatorTaxes(Number((sale as any).operator_taxes) || 0);
    setSellerId((sale as any).seller_id || '');
    setNotes(sale.notes || '');
    setPassengersCount(Number((sale as any).passengers_count) || 1);
    setTripNights(Number((sale as any).trip_nights) || 0);
    if (Number((sale as any).trip_nights) > 0) setNightsManuallySet(true);
    setTripStartDate((sale as any).trip_start_date || '');
    setTripEndDate((sale as any).trip_end_date || '');
    setDestinationName((sale as any).destination_name || '');
    setQuoteTitle((sale as any).quote_title || '');
    setInvoiceUrl((sale as any).invoice_url || '');
    setDestinationImageUrl((sale as any).destination_image_url || '');
    setDestinationImageConfig((sale as any).destination_image_config || null);
    // Load proposal payment options
    if ((sale as any).proposal_payment_options && Array.isArray((sale as any).proposal_payment_options)) {
      // Migrate old format (installmentValue/totalValue) to new format (discountPercent)
      setProposalPaymentOptions((sale as any).proposal_payment_options.map((o: any) => ({
        method: o.method,
        label: o.label,
        installments: o.installments || 1,
        discountPercent: o.discountPercent ?? 0,
        enabled: o.enabled !== false,
      })));
    }
    if ((sale as any).show_individual_values !== undefined) {
      setShowIndividualValues((sale as any).show_individual_values);
    }
    if ((sale as any).show_per_passenger !== undefined) {
      setShowPerPassenger((sale as any).show_per_passenger);
    }
    if ((sale as any).show_only_total !== undefined) {
      setShowOnlyTotal((sale as any).show_only_total);
    }
    if ((sale as any).invoice_url) {
      const parts = (sale as any).invoice_url.split('/');
      setInvoiceFileName(decodeURIComponent(parts[parts.length - 1]) || 'nota-fiscal.pdf');
    }

    const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', id).order('sort_order');
    const imgMap: Record<number, string[]> = {};
    if (saleItems) {
      setItems(saleItems.map(i => ({
        id: i.id, description: i.description, cost_price: Number(i.cost_price), rav: Number(i.rav),
        markup_percent: Number((i as any).markup_percent) || 0,
        total_value: Number(i.total_value), service_catalog_id: i.service_catalog_id || undefined,
        cost_center_id: i.cost_center_id || undefined,
        metadata: (i as any).metadata || {},
        reservation_number: (i as any).reservation_number || '',
        purchase_number: (i as any).purchase_number || '',
        quote_option_id: (i as any).quote_option_id || undefined,
        quote_option_ids: (i as any).quote_option_id ? [(i as any).quote_option_id] : undefined,
      })));
      
      for (let idx = 0; idx < saleItems.length; idx++) {
        const { data: imgs } = await (supabase.from('sale_item_images' as any) as any).select('*').eq('sale_item_id', saleItems[idx].id).order('sort_order');
        if (imgs && imgs.length > 0) {
          imgMap[idx] = imgs.map((img: any) => img.image_url);
        }
      }
      setItemImages(imgMap);
    }

    const { data: saleSups } = await supabase.from('sale_suppliers').select('supplier_id').eq('sale_id', id);
    const supplierIds = saleSups ? saleSups.map(s => s.supplier_id) : [];
    setSelectedSupplierIds(supplierIds);

    // Load accounts_payable to reconstruct supplier payment controls
    const { data: payables } = await supabase.from('accounts_payable').select('*').eq('sale_id', id).order('installment_number');
    if (payables && payables.length > 0) {
      // Group payables by supplier_id (null supplier_id = machine fee / commission, skip)
      const bySupplier: Record<string, typeof payables> = {};
      for (const p of payables) {
        if (!p.supplier_id) continue;
        if (!bySupplier[p.supplier_id]) bySupplier[p.supplier_id] = [];
        bySupplier[p.supplier_id].push(p);
      }
      const loadedPayments: SupplierPaymentControl[] = [];
      for (const sid of supplierIds) {
        const records = bySupplier[sid];
        if (records && records.length > 0) {
          const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);
          const totalInstallments = records[0].total_installments || 1;
          const desc = records[0].description || 'Pagamento de operadoras';
          // Detect payment method from description
          let method: 'pix' | 'faturado' | 'credito' = 'pix';
          if (desc.includes('Crédito')) method = 'credito';
          else if (desc.includes('Faturado')) method = 'faturado';
          loadedPayments.push({
            supplier_id: sid,
            payment_method: method,
            payment_date: records[0].due_date || format(new Date(), 'yyyy-MM-dd'),
            installments: totalInstallments,
            installment_dates: records.map(r => ({ date: r.due_date || '', amount: Number(r.amount || 0) })),
            amount: totalAmount,
            cost_center_id: records[0].cost_center_id || undefined,
            description: desc.replace(/ - .*$/, ''),
          });
        } else {
          // Supplier with no payable records yet
          const costPerSupplier = supplierIds.length > 0 ? totalCost / supplierIds.length : 0;
          loadedPayments.push({
            supplier_id: sid,
            payment_method: 'pix',
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            installments: 1,
            installment_dates: [{ date: format(new Date(), 'yyyy-MM-dd'), amount: costPerSupplier }],
            amount: costPerSupplier,
            description: 'Pagamento de operadoras',
          });
        }
      }
      setSupplierPayments(loadedPayments);
      supplierPaymentsLoadedRef.current = true;
    }

    const { data: recs } = await supabase.from('receivables').select('*').eq('sale_id', id).order('installment_number');
    if (recs) setReceivables(recs.map(r => ({ installment_number: r.installment_number, due_date: r.due_date || '', amount: Number(r.amount), cost_center_id: r.cost_center_id || undefined, payment_method: r.payment_method || undefined })));

    const { data: pax } = await supabase.from('sale_passengers' as any).select('*').eq('sale_id', id).order('sort_order');
    if (pax) setPassengers((pax as any[]).map(p => ({
      id: p.id, first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date || '',
      document_type: p.document_type || 'cpf', document_number: p.document_number || '',
      document_expiry: p.document_expiry || '', email: p.email || '', phone: p.phone || '', is_main: p.is_main || false,
      eticket_number: p.eticket_number || '',
    })));

    // Load internal files
    const { data: files } = await (supabase.from('sale_internal_files' as any) as any).select('*').eq('sale_id', id).order('created_at');
    if (files) setInternalFiles(files.map((f: any) => ({ id: f.id, file_name: f.file_name, file_url: f.file_url })));

    // Load quote options
    const { data: options } = await (supabase.from('sale_quote_options' as any) as any).select('*').eq('sale_id', id).order('order_index');
    if (options && options.length > 0) {
      setQuoteOptions(options.map((o: any) => ({ id: o.id, name: o.name, order_index: o.order_index })));
      // Update items with their quote_option_id
      if (saleItems) {
        // Merge items that share the same base data but different quote_option_ids
        const mergedMap = new Map<string, { item: any; optionIds: string[] }>();
        saleItems.forEach((si: any) => {
          // Create a fingerprint excluding quote_option_id and id
          const fp = `${si.description}|${si.cost_price}|${si.total_value}|${si.rav}|${si.service_catalog_id || ''}|${JSON.stringify(si.metadata || {})}`;
          if (mergedMap.has(fp)) {
            const entry = mergedMap.get(fp)!;
            if (si.quote_option_id && !entry.optionIds.includes(si.quote_option_id)) entry.optionIds.push(si.quote_option_id);
          } else {
            mergedMap.set(fp, {
              item: si,
              optionIds: si.quote_option_id ? [si.quote_option_id] : [],
            });
          }
        });
        
        const mergedItems: SaleItem[] = [];
        const mergedImageMap: Record<number, string[]> = {};
        let mergedIdx = 0;
        for (const [, { item: si, optionIds }] of mergedMap) {
          mergedItems.push({
            id: si.id, description: si.description, cost_price: Number(si.cost_price), rav: Number(si.rav),
            markup_percent: Number(si.markup_percent) || 0,
            total_value: Number(si.total_value), service_catalog_id: si.service_catalog_id || undefined,
            cost_center_id: si.cost_center_id || undefined,
            metadata: si.metadata || {},
            reservation_number: si.reservation_number || '',
            purchase_number: (si as any).purchase_number || '',
            quote_option_id: optionIds[0] || undefined,
            quote_option_ids: optionIds.length > 0 ? optionIds : undefined,
          });
          // Get images for the first occurrence
          const origIdx = saleItems.findIndex((s: any) => s.id === si.id);
          if (origIdx >= 0 && imgMap[origIdx]) {
            mergedImageMap[mergedIdx] = imgMap[origIdx];
          }
          mergedIdx++;
        }
        setItems(mergedItems);
        setItemImages(mergedImageMap);
      }
    }
  };

  const fetchClients = () => {
    let q = supabase.from('clients').select('id, full_name, cpf, email, phone, birth_date, passport_number, passport_expiry_date').order('full_name');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    q.then(({ data }) => { if (data) setAllClients(data as any); });
  };

  useEffect(() => {
    fetchClients();
    supabase.from('suppliers').select('id, name').order('name').then(({ data }) => { if (data) setAllSuppliers(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').or(`empresa_id.eq.${activeCompany?.id},empresa_id.is.null`).order('name').then(({ data }) => { if (data) setCostCenters(data); });
    (supabase.from('services_catalog') as any).select('id, name, cost_center_id').eq('status', 'active').order('name').then(({ data }: any) => { if (data) setServiceCatalog(data); });
    (() => {
      let query = supabase.from('card_rates').select('*').order('installments');
      if (activeCompany) query = query.eq('empresa_id', activeCompany.id) as any;
      (query as any).then(({ data }: any) => {
        if (data && data.length > 0) {
          setEcRates(data.filter((r: any) => r.payment_type === 'ec').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) })));
          setLinkRates(data.filter((r: any) => r.payment_type === 'link').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) })));
        }
      });
    })();
    if (activeCompany) {
      (supabase.from('sellers') as any).select('id, full_name, commission_type, commission_percentage, commission_base').eq('empresa_id', activeCompany.id).eq('status', 'active').order('full_name').then(({ data }: any) => { if (data) setAllSellers(data); });
      // Load stock image API keys
      supabase.from('agency_settings').select('*').eq('empresa_id', activeCompany.id).limit(1).single().then(({ data }) => {
        if (data) {
          const d = data as any;
          if (d.unsplash_api_key) { setUnsplashApiKey(d.unsplash_api_key); setHasStockKeys(true); }
          if (d.pexels_api_key) { setPexelsApiKey(d.pexels_api_key); setHasStockKeys(true); }
          if (d.google_maps_api_key) { setGoogleApiKey(d.google_maps_api_key); }
        }
      });
    }
  }, [activeCompany]);

  useEffect(() => {
    if (quoteData?.services && items.length === 0 && !editSaleId) {
      const mapped = quoteData.services.map((s: any) => ({
        description: s.title || s.description || '',
        cost_price: (s.value || 0) * (s.quantity || 1),
        rav: 0,
        total_value: (s.value || 0) * (s.quantity || 1),
      }));
      if (quoteData.rav && quoteData.rav > 0) {
        mapped.push({ description: 'RAV (Markup)', cost_price: 0, rav: quoteData.rav, total_value: quoteData.rav });
      }
      setItems(mapped);
    }
  }, [quoteData]);

  useEffect(() => {
    if (nightsManuallySet) return;
    if (tripStartDate && tripEndDate) {
      const start = new Date(tripStartDate);
      const end = new Date(tripEndDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) setTripNights(diffDays);
    }
  }, [tripStartDate, tripEndDate, nightsManuallySet]);

  const paymentMethod = paymentMethods.join(',');
  const hasCredito = paymentMethods.includes('credito');
  const hasBoleto = paymentMethods.includes('boleto');
  const hasDebito = paymentMethods.includes('debito');
  const hasOperadora = paymentMethods.includes('operadora');
  const hasPix = paymentMethods.includes('pix');
  const hasDinheiro = paymentMethods.includes('dinheiro');
  const hasTransferencia = paymentMethods.includes('transferencia');
  const hasMachineFeeMethod = hasCredito || hasDebito || hasBoleto;
  // Methods that show a generic installment selector (no interest, no machine fee)
  const hasGenericInstallmentMethod = (hasPix || hasDinheiro || hasDebito) && !hasCredito && !hasBoleto && !hasOperadora;

  useEffect(() => {
    if (!hasCredito || !cardPaymentType) return;
    const rates = cardPaymentType === 'ec' ? ecRates : linkRates;
    const creditInst = getInstallments('credito');
    const found = rates.find(r => r.installments === creditInst);
    if (found) setFeeRate(found.rate);
  }, [cardPaymentType, installmentsMap, ecRates, linkRates, hasCredito]);

  const totalSale = useMemo(() => items.reduce((s, i) => s + i.total_value, 0), [items]);
  const totalSaleWithInterest = totalSale + saleInterest + operatorTaxes;
  const totalCost = useMemo(() => items.reduce((s, i) => s + i.cost_price, 0), [items]);
  const grossProfit = totalSale + saleInterest - totalCost;
  const commissionValue = grossProfit * (commissionRate / 100);
  const cardFeeValue = machineFee;
  const cardFeePercent = totalSaleWithInterest > 0 ? (machineFee / totalSaleWithInterest) * 100 : 0;
  const netProfit = grossProfit - commissionValue - machineFee;

  // No longer need auto-recalculate since we store only discount % now

  useEffect(() => {
    const baseDate = new Date(saleDate || new Date());

    // For "operadora" payment, receivables are only for the gross commission
    const isOperadoraOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
    const baseAmount = isOperadoraOnly ? grossProfit : totalSaleWithInterest;

    // Use functional update to read previous receivables without adding to deps
    setReceivables(prev => {
      const recs: Receivable[] = [];
      let recIndex = 1;

      // Calculate amount per method: preserve existing amounts, assign remainder to newest
      const methodAmounts: Record<string, number> = {};
      if (paymentMethods.length > 0) {
        const existingAmountsByMethod: Record<string, number> = {};
        const labelToKey: Record<string, string> = { 'Pix': 'pix', 'Dinheiro': 'dinheiro', 'Boleto': 'boleto', 'Cartão de Crédito': 'credito', 'Cartão de Débito': 'debito', 'Transferência': 'transferencia', 'Pgto Operadora/Consolidadora': 'operadora', 'Pgto Operadora': 'operadora' };
        prev.forEach(r => {
          const key = labelToKey[r.payment_method || ''] || r.payment_method || '';
          if (key && paymentMethods.includes(key)) {
            existingAmountsByMethod[key] = (existingAmountsByMethod[key] || 0) + r.amount;
          }
        });

        let usedAmount = 0;
        const methodsWithExisting = paymentMethods.filter(m => existingAmountsByMethod[m] && existingAmountsByMethod[m] > 0);
        const methodsWithout = paymentMethods.filter(m => !existingAmountsByMethod[m] || existingAmountsByMethod[m] <= 0);

        methodsWithExisting.forEach(m => {
          methodAmounts[m] = existingAmountsByMethod[m];
          usedAmount += existingAmountsByMethod[m];
        });

        const remainder = Math.max(0, baseAmount - usedAmount);
        if (methodsWithout.length > 0) {
          const perNew = remainder / methodsWithout.length;
          methodsWithout.forEach(m => { methodAmounts[m] = Math.round(perNew * 100) / 100; });
        }
      }

      for (const method of paymentMethods) {
        const methodAmount = methodAmounts[method] || 0;
        if (method === 'operadora') {
          const numInst = getInstallments('operadora');
          const perInstallment = methodAmount / (numInst > 0 ? numInst : 1);
          for (let i = 1; i <= (numInst > 0 ? numInst : 1); i++) {
            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: 'Pgto Operadora/Consolidadora' });
          }
        } else if (method === 'boleto') {
          const boletoInst = getInstallments('boleto');
          if (boletoInst > 1 && boletoInterestRate > 0) {
            const monthlyRate = boletoInterestRate / 100;
            const pmt = methodAmount * (monthlyRate * Math.pow(1 + monthlyRate, boletoInst)) / (Math.pow(1 + monthlyRate, boletoInst) - 1);
            for (let i = 1; i <= boletoInst; i++) {
              const dueDate = new Date(baseDate);
              dueDate.setMonth(dueDate.getMonth() + i);
              recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(pmt * 100) / 100, payment_method: 'Boleto' });
            }
          } else {
            const numInst = boletoInst > 0 ? boletoInst : 1;
            const perInstallment = methodAmount / numInst;
            for (let i = 1; i <= numInst; i++) {
              const dueDate = new Date(baseDate);
              if (numInst > 1) dueDate.setMonth(dueDate.getMonth() + i);
              recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: 'Boleto' });
            }
          }
        } else if (method === 'credito') {
          const numInst = getInstallments('credito');
          const perInstallment = methodAmount / (numInst > 0 ? numInst : 1);
          for (let i = 1; i <= (numInst > 0 ? numInst : 1); i++) {
            const dueDate = new Date(baseDate);
            dueDate.setDate(dueDate.getDate() + i * 30);
            recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: 'Cartão de Crédito' });
          }
        } else {
          const labelMap: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de Débito', transferencia: 'Transferência' };
          const numInst = getInstallments(method);
          const effInst = numInst > 0 ? numInst : 1;
          const perInstallment = methodAmount / effInst;
          for (let i = 1; i <= effInst; i++) {
            const dueDate = new Date(baseDate);
            if (effInst > 1) {
              dueDate.setMonth(dueDate.getMonth() + i);
            }
            recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: labelMap[method] || method });
          }
        }
      }

      if (recs.length === 0) {
        recs.push({ installment_number: 1, due_date: '', amount: baseAmount });
      }

      // Preserve user-edited cost_center_id
      return recs.map((r, idx) => {
        const oldRec = prev[idx];
        if (oldRec && oldRec.cost_center_id) {
          return { ...r, cost_center_id: oldRec.cost_center_id };
        }
        return r;
      });
    });
  }, [installmentsMap, paymentMethods, totalSaleWithInterest, grossProfit, boletoInterestRate, saleDate, hasCredito, hasBoleto, hasOperadora]);

  // Sync supplier payments when suppliers or totalCost change
  useEffect(() => {
    // Skip the first sync if we just loaded data from the database
    if (supplierPaymentsLoadedRef.current) {
      supplierPaymentsLoadedRef.current = false;
      return;
    }
    setSupplierPayments(prev => {
      const today = format(new Date(), 'yyyy-MM-dd');
      // When mixed with operadora, auto-set supplier amount to (non-operadora amount - gross commission)
      const isOperadoraOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
      const isMixedWithOp = paymentMethods.includes('operadora') && paymentMethods.length > 1;
      let effectiveCost = totalCost;
      if (isOperadoraOnly) {
        effectiveCost = 0;
      } else if (isMixedWithOp) {
        const operadoraPortionOfSale = totalSaleWithInterest / paymentMethods.length;
        effectiveCost = Math.max(0, Math.round((totalCost - operadoraPortionOfSale) * 100) / 100);
      }
      const costPerSupplier = selectedSupplierIds.length > 0 ? effectiveCost / selectedSupplierIds.length : 0;
      return selectedSupplierIds.map(sid => {
        const existing = prev.find(sp => sp.supplier_id === sid);
        if (existing) {
          return existing;
        }
        return {
          supplier_id: sid,
          payment_method: 'pix' as const,
          payment_date: today,
          installments: 1,
          installment_dates: [{ date: today, amount: costPerSupplier }],
          amount: costPerSupplier,
          cost_center_id: (() => { try { return localStorage.getItem(`supplier_cc_${sid}`) || undefined; } catch { return undefined; } })(),
          description: 'Pagamento de operadoras',
        };
      });
    });
  }, [selectedSupplierIds, totalCost, paymentMethods, totalSaleWithInterest]);

  // Auto-set commission rate from seller config
  useEffect(() => {
    if (sellerId && sellerId !== 'none') {
      const seller = allSellers.find(s => s.id === sellerId);
      if (seller && seller.commission_type !== 'none') {
        setCommissionRate(seller.commission_percentage || 0);
      } else {
        setCommissionRate(0);
      }
    } else {
      setCommissionRate(0);
    }
  }, [sellerId, allSellers]);

  const updateSupplierPayment = (sid: string, field: string, value: any) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSupplierPayments(prev => prev.map(sp => {
      if (sp.supplier_id !== sid) return sp;
      const updated = { ...sp, [field]: value };
      if (field === 'payment_method') {
        if (value === 'pix') {
          updated.payment_date = today;
          updated.installments = 1;
          updated.installment_dates = [{ date: today, amount: sp.amount }];
        } else if (value === 'faturado') {
          updated.payment_date = today;
          updated.installments = 1;
          updated.installment_dates = [{ date: today, amount: sp.amount }];
        } else if (value === 'credito') {
          updated.installments = 3;
          const dates = [];
          const base = new Date();
          for (let i = 1; i <= 3; i++) {
            const d = new Date(base);
            d.setMonth(d.getMonth() + i);
            dates.push({ date: d.toISOString().split('T')[0], amount: sp.amount / 3 });
          }
          updated.installment_dates = dates;
        }
      }
      if (field === 'installments' && sp.payment_method === 'credito') {
        const inst = value as number;
        const dates = [];
        const base = new Date();
        for (let i = 1; i <= inst; i++) {
          const d = new Date(base);
          d.setMonth(d.getMonth() + i);
          dates.push({ date: d.toISOString().split('T')[0], amount: sp.amount / inst });
        }
        updated.installment_dates = dates;
      }
      return updated;
    }));
  };

  const updateSupplierInstallmentDate = (sid: string, idx: number, newDate: string) => {
    setSupplierPayments(prev => prev.map(sp => {
      if (sp.supplier_id !== sid) return sp;
      const dates = [...sp.installment_dates];
      dates[idx] = { ...dates[idx], date: newDate };
      return { ...sp, installment_dates: dates };
    }));
  };

  // Auto-select Safra Pay supplier for machine fee
  useEffect(() => {
    if (hasMachineFeeMethod && !machineFeeSupplierId && allSuppliers.length > 0) {
      const safra = allSuppliers.find(s => s.name.toLowerCase().includes('safra pay') || s.name.toLowerCase().includes('safrapay'));
      if (safra) setMachineFeeSupplierId(safra.id);
    }
  }, [hasMachineFeeMethod, allSuppliers, machineFeeSupplierId]);

  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'markup_percent') {
        // Acréscimo% altera a RAV: RAV = Custo * (Acréscimo% / 100)
        updated.rav = updated.cost_price * ((updated.markup_percent || 0) / 100);
        updated.total_value = updated.cost_price + updated.rav;
      } else if (field === 'rav') {
        // RAV manual: recalcula Acréscimo% = (RAV / Custo) * 100
        updated.markup_percent = updated.cost_price > 0 ? (updated.rav / updated.cost_price) * 100 : 0;
        updated.total_value = updated.cost_price + updated.rav;
      } else if (field === 'cost_price') {
        // Custo alterado: recalcula RAV com base no Acréscimo% existente
        updated.rav = updated.cost_price * ((updated.markup_percent || 0) / 100);
        updated.total_value = updated.cost_price + updated.rav;
      }
      return updated;
    }));
  };

  const moveItem = (idx: number, direction: 'up' | 'down') => {
    setItems(prev => {
      const newItems = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newItems.length) return prev;
      [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]];
      // Also swap images
      setItemImages(prevImgs => {
        const newImgs = { ...prevImgs };
        const temp = newImgs[idx];
        newImgs[idx] = newImgs[targetIdx];
        newImgs[targetIdx] = temp;
        return newImgs;
      });
      return newItems;
    });
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setItemImages(prev => {
      const newImgs: Record<number, string[]> = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k === idx) return;
        const newKey = k > idx ? k - 1 : k;
        newImgs[newKey] = prev[k];
      });
      return newImgs;
    });
  };

  const addSupplier = () => {
    if (!addingSupplierId || selectedSupplierIds.includes(addingSupplierId)) return;
    setSelectedSupplierIds(prev => [...prev, addingSupplierId]);
    setAddingSupplierId('');
  };

  const addPassenger = () => {
    setPassengers(prev => [...prev, {
      first_name: '', last_name: '', birth_date: '', document_type: 'cpf',
      document_number: '', document_expiry: '', email: '', phone: '', is_main: prev.length === 0,
      eticket_number: '',
    }]);
  };

  const addClientAsPassenger = (client: ClientOption) => {
    const nameParts = client.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const hasPassport = !!client.passport_number;
    setPassengers(prev => {
      const alreadyExists = prev.some(p => 
        `${p.first_name} ${p.last_name}`.trim().toLowerCase() === client.full_name.trim().toLowerCase()
      );
      if (alreadyExists) return prev;
      return [...prev, {
        first_name: firstName,
        last_name: lastName,
        birth_date: client.birth_date || '',
        document_type: hasPassport ? 'passaporte' as const : 'cpf' as const,
        document_number: hasPassport ? (client.passport_number || '') : (client.cpf || ''),
        document_expiry: hasPassport ? (client.passport_expiry_date || '') : '',
        email: client.email || '',
        phone: client.phone || '',
        is_main: prev.length === 0,
        eticket_number: '',
      }];
    });
  };

  const fillPassengerFromClient = (idx: number, client: ClientOption) => {
    const nameParts = client.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const hasPassport = !!client.passport_number;
    setPassengers(prev => prev.map((p, i) => i === idx ? {
      ...p,
      first_name: firstName,
      last_name: lastName,
      birth_date: client.birth_date || '',
      document_type: hasPassport ? 'passaporte' as const : 'cpf' as const,
      document_number: hasPassport ? (client.passport_number || '') : (client.cpf || ''),
      document_expiry: hasPassport ? (client.passport_expiry_date || '') : '',
      email: client.email || '',
      phone: client.phone || '',
    } : p));
  };

  const updatePassenger = (idx: number, field: keyof Passenger, value: any) => {
    setPassengers(prev => prev.map((p, i) => {
      if (i !== idx) return field === 'is_main' && value === true ? { ...p, is_main: false } : p;
      return { ...p, [field]: value };
    }));
  };

  const removePassenger = (idx: number) => {
    setPassengers(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(p => p.is_main)) updated[0].is_main = true;
      return updated;
    });
  };

  const handleCancel = async () => {
    if (quoteId && !editSaleId) {
      await supabase.from('quotes').update({ status: 'draft' }).eq('id', quoteId);
    }
    navigate('/sales');
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são aceitos'); return; }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) { toast.error('Arquivo muito grande. Máximo permitido: 10MB'); return; }
    setUploadingInvoice(true);
    const ext = file.name.split('.').pop();
    const fileName = `invoices/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('quote-images').upload(fileName, file);
    if (error) { toast.error('Erro ao enviar nota fiscal'); setUploadingInvoice(false); return; }
    const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
    setInvoiceUrl(data.publicUrl);
    setInvoiceFileName(file.name);
    setUploadingInvoice(false);
    toast.success('Nota fiscal enviada!');
    e.target.value = '';
  };

  const handleDestinationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDestImage(true);
    const ext = file.name.split('.').pop();
    const fileName = `destinations/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('quote-images').upload(fileName, file);
    if (error) { toast.error('Erro ao enviar imagem'); setUploadingDestImage(false); return; }
    const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
    setDestinationImageUrl(data.publicUrl);
    setUploadingDestImage(false);
    toast.success('Imagem do destino enviada!');
    e.target.value = '';
  };

  const handleAiImageSearch = async () => {
    if (!destinationName.trim()) {
      toast.error('Preencha o nome do destino primeiro');
      return;
    }
    setAiImageSearch(true);
    setAiImages([]);
    try {
      const { data, error } = await supabase.functions.invoke('search-destination-images', {
        body: { destination: destinationName.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setAiImageSearch(false);
        return;
      }
      if (data?.images?.length > 0) {
        setAiImages(data.images);
        setAiImageDialog(true);
      } else {
        toast.error('Nenhuma imagem encontrada');
      }
    } catch (err: any) {
      console.error('AI image search error:', err);
      toast.error('Erro ao buscar imagens com I.A.');
    }
    setAiImageSearch(false);
  };

  const handleSelectAiImage = async (base64Url: string) => {
    try {
      const res = await fetch(base64Url);
      const blob = await res.blob();
      const fileName = `destinations/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage.from('quote-images').upload(fileName, blob, { contentType: 'image/png' });
      if (error) { toast.error('Erro ao salvar imagem'); return; }
      const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
      setDestinationImageUrl(data.publicUrl);
      setAiImageDialog(false);
      setAiImages([]);
      toast.success('Imagem selecionada!');
    } catch {
      toast.error('Erro ao processar imagem');
    }
  };

  const handleStockImageSelect = async (img: StockImage) => {
    try {
      const res = await fetch(img.url_full);
      const blob = await res.blob();
      const ext = img.url_full.includes('.png') ? 'png' : 'jpg';
      const fileName = `destinations/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('quote-images').upload(fileName, blob, { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}` });
      if (error) { toast.error('Erro ao salvar imagem'); return; }
      const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
      setDestinationImageUrl(data.publicUrl);
      setStockImageSearchOpen(false);

      // Save to destination_images cache
      await supabase.from('destination_images' as any).insert({
        titulo: img.description,
        autor: img.photographer,
        fonte: img.source,
        url_original: img.url_full,
        url_local: data.publicUrl,
        largura: img.width,
        altura: img.height,
        empresa_id: activeCompany?.id || null,
      } as any);

      toast.success(`Imagem de ${img.photographer} (${img.source}) selecionada!`);
    } catch {
      toast.error('Erro ao processar imagem');
    }
  };

  const handleItemImageUpload = async (itemIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingItemImages(prev => ({ ...prev, [itemIdx]: true }));
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const fileName = `sale-items/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('quote-images').upload(fileName, file);
      if (error) continue;
      const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
      newUrls.push(data.publicUrl);
    }
    if (newUrls.length > 0) {
      setItemImages(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), ...newUrls] }));
      toast.success(`${newUrls.length} imagem(ns) adicionada(s)!`);
    }
    setUploadingItemImages(prev => ({ ...prev, [itemIdx]: false }));
    e.target.value = '';
  };

  const removeItemImage = (itemIdx: number, imgIdx: number) => {
    setItemImages(prev => {
      const updated = [...(prev[itemIdx] || [])];
      updated.splice(imgIdx, 1);
      return { ...prev, [itemIdx]: updated };
    });
  };

  const moveItemImage = (itemIdx: number, imgIdx: number, direction: 'left' | 'right') => {
    setItemImages(prev => {
      const images = [...(prev[itemIdx] || [])];
      const targetIdx = direction === 'left' ? imgIdx - 1 : imgIdx + 1;
      if (targetIdx < 0 || targetIdx >= images.length) return prev;
      [images[imgIdx], images[targetIdx]] = [images[targetIdx], images[imgIdx]];
      return { ...prev, [itemIdx]: images };
    });
  };

  const handleSearchServiceImages = async (itemIdx: number) => {
    const item = items[itemIdx];
    const searchQuery = item.metadata?.hotel?.hotelName || item.description || '';
    if (!searchQuery.trim()) { toast.error('Preencha a descrição do serviço primeiro'); return; }
    if (!googleApiKey) { toast.error('Configure a Google Maps API Key em Configurações → Integrações'); return; }
    setSearchingItemImages(prev => ({ ...prev, [itemIdx]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'search_photos', query: searchQuery.trim(), apiKey: googleApiKey },
      });
      if (error) throw error;
      if (data?.success && data.photos?.length > 0) {
        setItemImages(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), ...data.photos] }));
        toast.success(`${data.photos.length} imagem(ns) encontrada(s)!`);
      } else {
        toast.error('Nenhuma imagem encontrada para este serviço');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao buscar imagens');
    } finally {
      setSearchingItemImages(prev => ({ ...prev, [itemIdx]: false }));
    }
  };

  const handleInternalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingFile(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const fileName = `internal-files/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('quote-images').upload(fileName, file);
      if (error) { toast.error(`Erro ao enviar ${file.name}`); continue; }
      const { data } = supabase.storage.from('quote-images').getPublicUrl(fileName);
      setInternalFiles(prev => [...prev, { file_name: file.name, file_url: data.publicUrl }]);
    }
    setUploadingFile(false);
    toast.success('Arquivo(s) adicionado(s)!');
    e.target.value = '';
  };

  const removeInternalFile = (idx: number) => {
    setInternalFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const buildSalePayload = async (status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    return {
      payload: {
        quote_id: quoteId || null,
        client_name: clientName,
        sale_date: saleDate,
        payment_method: paymentMethod,
        installments: hasCredito ? getInstallments('credito') : (Math.max(...Object.values(installmentsMap), 1)),
        card_charge_type: '',
        card_payment_type: hasCredito ? cardPaymentType : '',
        card_fee_rate: hasCredito ? feeRate : 0,
        total_sale: totalSaleWithInterest,
        total_supplier_cost: totalCost,
        gross_profit: grossProfit,
        commission_rate: commissionRate,
        commission_value: commissionValue,
        card_fee_value: cardFeeValue,
        net_profit: netProfit,
        notes,
        proposal_payment_options: proposalPaymentOptions.filter(o => o.enabled),
        show_individual_values: showIndividualValues,
        show_per_passenger: showPerPassenger,
        show_only_total: showOnlyTotal,
        status,
        created_by: userEmail,
        updated_by: userEmail,
        empresa_id: activeCompany?.id || null,
        seller_id: sellerId && sellerId !== 'none' ? sellerId : null,
        invoice_url: invoiceUrl || null,
        destination_image_url: destinationImageUrl || null,
        destination_image_config: destinationImageConfig || null,
        sale_interest: saleInterest,
        machine_fee: machineFee,
        machine_fee_supplier_id: machineFeeSupplierId || null,
        operator_taxes: operatorTaxes,
        passengers_count: passengersCount,
        trip_nights: tripNights,
        trip_start_date: tripStartDate || null,
        trip_end_date: tripEndDate || null,
        destination_name: destinationName || '',
        quote_title: quoteTitle || '',
        sale_workflow_status: saleWorkflowStatus,
      } as any,
      userEmail,
    };
  };

  const saveSaleCore = async (salePayload: any, userEmail: string) => {
    let saleId = editSaleId;

    if (editSaleId) {
      const { error } = await supabase.from('sales').update({ ...salePayload, updated_by: userEmail } as any).eq('id', editSaleId);
      if (error) { console.error('Erro ao atualizar venda:', error); toast.error('Erro ao atualizar venda: ' + error.message); return null; }
      const { data: oldItems } = await supabase.from('sale_items').select('id').eq('sale_id', editSaleId);
      if (oldItems) {
        for (const oi of oldItems) {
          await (supabase.from('sale_item_images' as any) as any).delete().eq('sale_item_id', oi.id);
        }
      }
      await supabase.from('sale_items').delete().eq('sale_id', editSaleId);
      await supabase.from('sale_suppliers').delete().eq('sale_id', editSaleId);
      await (supabase.from('sale_passengers' as any) as any).delete().eq('sale_id', editSaleId);
      // Clean old internal files
      await (supabase.from('sale_internal_files' as any) as any).delete().eq('sale_id', editSaleId);
      // Clean old quote options
      await (supabase.from('sale_quote_options' as any) as any).delete().eq('sale_id', editSaleId);
    } else {
      const { data, error } = await supabase.from('sales').insert(salePayload as any).select('id').single();
      if (error || !data) { toast.error('Erro ao criar venda'); return null; }
      saleId = data.id;
    }

    // Save quote options first to get IDs for items
    const optionIdMap: Record<number, string> = {};
    if (quoteOptions.length > 0) {
      const { data: insertedOptions } = await (supabase.from('sale_quote_options' as any) as any).insert(
        quoteOptions.map((opt, idx) => ({
          sale_id: saleId, name: opt.name, order_index: idx,
        }))
      ).select('id, order_index');
      if (insertedOptions) {
        insertedOptions.forEach((o: any) => { optionIdMap[o.order_index] = o.id; });
      }
    }

    if (items.length > 0) {
      // Expand items with multiple quote_option_ids into separate rows
      const expandedItems: { item: SaleItem; idx: number; optionId: string | null }[] = [];
      items.forEach((item, idx) => {
        const rawIds = item.quote_option_ids && item.quote_option_ids.length > 0
          ? item.quote_option_ids
          : item.quote_option_id ? [item.quote_option_id] : [null as any];
        // Deduplicate option IDs to prevent duplicate rows for the same option
        const optionIds = [...new Set(rawIds)];
        for (const optId of optionIds) {
          expandedItems.push({ item, idx, optionId: optId });
        }
      });

      const { data: insertedItems } = await supabase.from('sale_items').insert(expandedItems.map((entry, sortIdx) => {
        const { item, optionId } = entry;
        let resolvedOptionId: string | null = null;
        if (optionId) {
          const optIdx = quoteOptions.findIndex(o => o.id === optionId || String(o.order_index) === optionId);
          if (optIdx >= 0 && optionIdMap[optIdx]) resolvedOptionId = optionIdMap[optIdx];
          else if (optionIdMap[0]) resolvedOptionId = optionIdMap[0];
        } else if (optionIdMap[0]) {
          resolvedOptionId = optionIdMap[0];
        }
        return {
          sale_id: saleId, description: item.description, cost_price: item.cost_price, rav: item.rav,
          markup_percent: item.markup_percent || 0, total_value: item.total_value, sort_order: sortIdx,
          service_catalog_id: item.service_catalog_id || null, cost_center_id: item.cost_center_id || null,
          metadata: item.metadata || {}, reservation_number: item.reservation_number || '', purchase_number: item.purchase_number || '',
          quote_option_id: resolvedOptionId,
        };
      }) as any).select('id');

      if (insertedItems) {
        // Save images for ALL expanded rows (including duplicates across options)
        for (let eIdx = 0; eIdx < insertedItems.length; eIdx++) {
          const origIdx = expandedItems[eIdx].idx;
          const images = itemImages[origIdx];
          if (images && images.length > 0) {
            await (supabase.from('sale_item_images' as any) as any).insert(
              images.map((url: string, sortIdx: number) => ({
                sale_item_id: insertedItems[eIdx].id, image_url: url, sort_order: sortIdx,
              }))
            );
          }
        }
      }
    }

    if (selectedSupplierIds.length > 0) {
      await supabase.from('sale_suppliers').insert(selectedSupplierIds.map(sid => ({ sale_id: saleId, supplier_id: sid })));
    }

    if (passengers.length > 0) {
      await (supabase.from('sale_passengers' as any) as any).insert(passengers.map((p, idx) => ({
        sale_id: saleId, first_name: p.first_name, last_name: p.last_name,
        birth_date: p.birth_date || null, document_type: p.document_type,
        document_number: p.document_number, document_expiry: p.document_expiry || null,
        email: p.email, phone: p.phone, is_main: p.is_main, sort_order: idx,
        eticket_number: p.eticket_number || '',
      })));
    }

    // Save internal files
    if (internalFiles.length > 0) {
      await (supabase.from('sale_internal_files' as any) as any).insert(
        internalFiles.map(f => ({ sale_id: saleId, file_name: f.file_name, file_url: f.file_url }))
      );
    }

    return saleId;
  };

  const generateReceivablesForSale = async (saleId: string) => {
    if (receivables.length > 0) {
      const enabledOptions = proposalPaymentOptions.filter(o => o.enabled);
      const { error } = await supabase.from('receivables').insert(receivables.map(r => ({
        sale_id: saleId, installment_number: r.installment_number, due_date: r.due_date || null, amount: r.amount,
        client_name: clientName, description: `Venda - ${clientName}`, status: 'pending', origin_type: 'sale',
        payment_method: r.payment_method || paymentMethod || 'pix',
        empresa_id: activeCompany?.id || null,
        cost_center_id: r.cost_center_id || null,
      } as any)));
      if (error) console.error('Erro ao gerar recebíveis:', error);
    } else if (totalSaleWithInterest > 0) {
      const { error } = await supabase.from('receivables').insert({
        sale_id: saleId, installment_number: 1, due_date: saleDate || null, amount: totalSaleWithInterest,
        client_name: clientName, description: `Venda - ${clientName}`, status: 'pending', origin_type: 'sale',
        payment_method: paymentMethod || 'pix',
        empresa_id: activeCompany?.id || null,
      } as any);
      if (error) console.error('Erro ao gerar recebível fallback:', error);
    }
  };

  const generatePayablesForSale = async (saleId: string) => {
    // When "operadora" is the only payment method, skip supplier payables entirely
    // (client pays the supplier directly; we only receive the commission)
    const isOperadoraOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
    // When mixed (operadora + other methods), calculate the amount the agency actually needs to forward:
    // non-operadora amount - gross commission = totalCost - operadora portion
    const isMixedWithOperadora = hasOperadora && paymentMethods.length > 1;

    if (!isOperadoraOnly) {
      // Calculate the operadora portion of the total sale for mixed payments
      let mixedPayableAdjustmentRatio = 1;
      if (isMixedWithOperadora) {
        // The operadora portion covers part of the cost directly, so the agency only pays the rest
        // Formula: payable = total_cost - operadora_amount = non_operadora_amount - gross_profit
        const operadoraPortionOfSale = totalSaleWithInterest / paymentMethods.length; // equal split
        const adjustedPayableTotal = totalCost - operadoraPortionOfSale;
        mixedPayableAdjustmentRatio = totalCost > 0 ? Math.max(0, adjustedPayableTotal / totalCost) : 1;
      }

      if (supplierPayments.length > 0) {
        const payables: any[] = [];
        for (const sp of supplierPayments) {
          if (sp.amount <= 0) continue;
            const adjustedAmount = isMixedWithOperadora ? Math.round(sp.amount * mixedPayableAdjustmentRatio * 100) / 100 : sp.amount;
            if (adjustedAmount <= 0) continue;
            const desc = sp.description || 'Pagamento de operadoras';
            if (sp.payment_method === 'pix') {
              payables.push({
                sale_id: saleId, supplier_id: sp.supplier_id, amount: adjustedAmount,
                due_date: sp.payment_date, description: `${desc} - ${clientName} (Pix)`,
                status: 'open', origin_type: 'sale', empresa_id: activeCompany?.id || null,
                installment_number: 1, total_installments: 1, cost_center_id: sp.cost_center_id || null,
              });
            } else if (sp.payment_method === 'faturado') {
              payables.push({
                sale_id: saleId, supplier_id: sp.supplier_id, amount: adjustedAmount,
                due_date: sp.installment_dates[0]?.date || sp.payment_date,
                description: `${desc} - ${clientName} (Faturado)`,
                status: 'open', origin_type: 'sale', empresa_id: activeCompany?.id || null,
                installment_number: 1, total_installments: 1, cost_center_id: sp.cost_center_id || null,
              });
            } else if (sp.payment_method === 'credito') {
              const perInstallment = adjustedAmount / sp.installments;
              sp.installment_dates.forEach((inst, idx) => {
                payables.push({
                  sale_id: saleId, supplier_id: sp.supplier_id, amount: Math.round(perInstallment * 100) / 100,
                  due_date: inst.date, description: `${desc} - ${clientName} (Crédito ${idx + 1}/${sp.installments})`,
                  status: 'open', origin_type: 'sale', empresa_id: activeCompany?.id || null,
                  installment_number: idx + 1, total_installments: sp.installments, cost_center_id: sp.cost_center_id || null,
                });
              });
            }
        }
        if (payables.length > 0) {
          const { error } = await supabase.from('accounts_payable').insert(payables);
          if (error) console.error('Erro ao gerar contas a pagar:', error);
        }
      } else if (totalCost > 0 && selectedSupplierIds.length > 0) {
        const adjustedCost = isMixedWithOperadora ? totalCost * mixedPayableAdjustmentRatio : totalCost;
        const costPerSupplier = adjustedCost / selectedSupplierIds.length;
        const { error } = await supabase.from('accounts_payable').insert(selectedSupplierIds.map(sid => ({
          sale_id: saleId, supplier_id: sid, amount: Math.round(costPerSupplier * 100) / 100,
          due_date: saleDate, description: `Venda - ${clientName}`, status: 'open', origin_type: 'sale',
          empresa_id: activeCompany?.id || null,
        })));
        if (error) console.error('Erro ao gerar contas a pagar fallback:', error);
      }
    }

    // Machine fee as accounts payable
    if (machineFee > 0) {
      await supabase.from('accounts_payable').insert({
        sale_id: saleId, amount: machineFee,
        supplier_id: machineFeeSupplierId || null,
        due_date: saleDate, description: `Taxa de máquina - ${clientName}`,
        status: 'open', origin_type: 'sale', empresa_id: activeCompany?.id || null,
        installment_number: 1, total_installments: 1,
      } as any);
    }
  };

  const handleSaveDraft = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    setSavingDraft(true);
    try {
      const { payload, userEmail } = await buildSalePayload('draft');
      if (editSaleId) {
        // Clean up any existing financial records (in case it was previously converted)
        await supabase.from('receivables').delete().eq('sale_id', editSaleId);
        await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      }
      const saleId = await saveSaleCore(payload, userEmail);
      if (!saleId) { setSavingDraft(false); return; }
      if (!editSaleId) setEditSaleId(saleId);
      // Drafts (cotações) do NOT generate financial records
      toast.success('Rascunho salvo!');
    } catch (err) {
      toast.error('Erro ao salvar rascunho');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSilentSaveDraft = async () => {
    if (!clientName.trim()) return;
    setSavingDraft(true);
    try {
      const { payload, userEmail } = await buildSalePayload('draft');
      if (editSaleId) {
        await supabase.from('receivables').delete().eq('sale_id', editSaleId);
        await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      }
      const saleId = await saveSaleCore(payload, userEmail);
      if (saleId) {
        if (!editSaleId) setEditSaleId(saleId);
        // Drafts (cotações) do NOT generate financial records
        toast.success('Rascunho salvo automaticamente.');
      }
    } catch { /* silent */ }
    finally { setSavingDraft(false); }
  };

  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteSale = async () => {
    if (!editSaleId) return;
    try {
      // Delete related records first
      await supabase.from('receivables').delete().eq('sale_id', editSaleId);
      await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      await supabase.from('seller_commissions').delete().eq('sale_id', editSaleId);
      await supabase.from('reservations').delete().eq('sale_id', editSaleId);
      await supabase.from('sale_items').delete().eq('sale_id', editSaleId);
      await supabase.from('sale_suppliers').delete().eq('sale_id', editSaleId);
      await (supabase.from('sale_passengers' as any) as any).delete().eq('sale_id', editSaleId);
      await (supabase.from('sale_internal_files' as any) as any).delete().eq('sale_id', editSaleId);
      await (supabase.from('sale_quote_options' as any) as any).delete().eq('sale_id', editSaleId);
      await supabase.from('sales').delete().eq('id', editSaleId);
      toast.success(saleStatus === 'active' ? 'Venda excluída com sucesso!' : 'Cotação excluída com sucesso!');
      navigate('/sales');
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  const handleSave = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    // If editing an active sale, ask for confirmation first
    if (saleStatus === 'active' && !showEditConfirm) {
      setShowEditConfirm(true);
      return;
    }
    setShowEditConfirm(false);
    await doSave();
  };

  const doSave = async () => {
    setSavingSale(true);
    try {
    const { payload, userEmail } = await buildSalePayload('active');
    // Auto-set workflow status to "emitido" when generating a sale
    payload.sale_workflow_status = 'emitido';

    if (editSaleId) {
      await supabase.from('receivables').delete().eq('sale_id', editSaleId);
      await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      await supabase.from('seller_commissions').delete().eq('sale_id', editSaleId);
      await supabase.from('reservations').delete().eq('sale_id', editSaleId);
    }

    const saleId = await saveSaleCore(payload, userEmail);
    if (!saleId) return;

    // Generate receivables and payables using shared functions
    await generateReceivablesForSale(saleId);
    await generatePayablesForSale(saleId);

    if (quoteId) {
      await supabase.from('quotes').update({ status: 'concluido' }).eq('id', quoteId);
    }

    // Create individual reservations for each sale item that has a reservation_number
    const itemsWithReservation = items.filter(i => i.reservation_number && i.reservation_number.trim() !== '');
    if (itemsWithReservation.length > 0) {
      await supabase.from('reservations').insert(itemsWithReservation.map(item => ({
        sale_id: saleId,
        description: `${item.description} - ${clientName}`,
        confirmation_code: item.reservation_number || '',
        status: 'pending',
        check_in: tripStartDate || null,
        check_out: tripEndDate || null,
        empresa_id: activeCompany?.id || null,
        service_type: item.metadata?.type || null,
      })));
    } else if (selectedSupplierIds.length > 0) {
      // Fallback: create reservations per supplier if no items have reservation numbers
      await supabase.from('reservations').insert(selectedSupplierIds.map(sid => {
        const sup = allSuppliers.find(s => s.id === sid);
        return {
          sale_id: saleId, supplier_id: sid,
          description: `${sup?.name || 'Fornecedor'} - ${clientName}`,
          status: 'pending', check_in: tripStartDate || null, check_out: tripEndDate || null,
          empresa_id: activeCompany?.id || null,
        };
      }));
    }

    if (passengers.length > 0) {
      const mainPassenger = passengers.find(p => p.is_main) || passengers[0];
      const eventTitle = `${mainPassenger.first_name} ${mainPassenger.last_name}`.trim() || clientName;
      const eventDate = tripStartDate || saleDate;

      // Remove existing calendar event for this sale to avoid duplicates
      if (activeCompany?.id) {
        await supabase.from('calendar_events').delete()
          .eq('empresa_id', activeCompany.id)
          .eq('title', eventTitle)
          .eq('event_type', 'embarque');
      }

      await supabase.from('calendar_events').insert({
        title: eventTitle, event_date: eventDate, passengers: passengers.length,
        empresa_id: activeCompany?.id || null, event_type: 'embarque',
      });
    }

    if (sellerId && sellerId !== 'none') {
      const { data: sellerData } = await (supabase.from('sellers') as any).select('*').eq('id', sellerId).single();
      if (sellerData && sellerData.commission_type !== 'none') {
        let commValue = 0;
        const pct = Number(sellerData.commission_percentage) || 0;
        if (sellerData.commission_type === 'sales_percentage') {
          const base = sellerData.commission_base === 'net_received' ? totalSaleWithInterest - cardFeeValue
            : sellerData.commission_base === 'sale_profit' ? grossProfit : totalSaleWithInterest;
          commValue = base * (pct / 100);
        } else if (sellerData.commission_type === 'profit_percentage') {
          commValue = grossProfit * (pct / 100);
        } else if (sellerData.commission_type === 'company_profit_percentage') {
          commValue = commissionValue * (pct / 100);
        } else {
          commValue = grossProfit * (pct / 100);
        }
        await (supabase.from('seller_commissions') as any).insert({
          empresa_id: activeCompany?.id || null, seller_id: sellerId, sale_id: saleId,
          client_name: clientName, sale_date: saleDate, sale_value: totalSaleWithInterest,
          cost_value: totalCost, profit_value: grossProfit, commission_percentage: pct,
          commission_value: commValue, commission_type: sellerData.commission_type, status: 'pending',
        }).select('id').single();

        if (commValue > 0) {
          await supabase.from('accounts_payable').insert({
            sale_id: saleId, amount: commValue, due_date: saleDate,
            description: `Comissão - ${sellerData.full_name} - ${clientName}`,
            status: 'open', origin_type: 'commission', empresa_id: activeCompany?.id || null,
          } as any);
        }
      }
    }

    toast.success(editSaleId && saleStatus === 'active' ? 'Venda atualizada! Financeiro regenerado.' : 'Venda criada com sucesso! Complete agora os dados da reserva, pagamento e operação.');
    if (!editSaleId) setEditSaleId(saleId);
    setSaleStatus('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error('Erro ao salvar venda');
    } finally {
      setSavingSale(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const prepareVoucherCommonData = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório para gerar o voucher'); return; }
    let agency = { name: 'Agência de Viagens', whatsapp: '', email: '', website: '', logo_url: '' };
    const agQuery = activeCompany?.id
      ? supabase.from('agency_settings').select('*').eq('empresa_id', activeCompany.id).limit(1)
      : supabase.from('agency_settings').select('*').limit(1);
    const { data: agData } = await agQuery;
    if (agData && agData.length > 0) agency = agData[0] as any;

    let flightLegs: any[] = [];
    let flightGroups: any[][] = [];
    // Collect flight legs from item metadata - grouped per service
    for (const item of items) {
      if (item.metadata?.type === 'aereo' && item.metadata.flightLegs?.length) {
        flightGroups.push([...item.metadata.flightLegs]);
        flightLegs.push(...item.metadata.flightLegs);
      }
    }

    // Also from quote if linked
    if (quoteId) {
      const { data: qServices } = await supabase.from('services').select('*').eq('quote_id', quoteId).order('sort_order');
      if (qServices) {
        for (const svc of qServices) {
          if (svc.type === 'aereo') {
            const { data: legs } = await supabase.from('flight_legs').select('*').eq('service_id', svc.id).order('sort_order');
            if (legs) flightLegs.push(...legs.map((l: any) => ({
              origin: l.origin, destination: l.destination, departureDate: l.departure_date,
              departureTime: l.departure_time, arrivalDate: l.arrival_date, arrivalTime: l.arrival_time,
              connectionDuration: l.connection_duration, direction: l.direction as 'ida' | 'volta', flightCode: '',
            })));
          }
        }
      }
    }

    let logoBase64: string | undefined;
    if (agency.logo_url) {
      try {
        const resp = await fetch(agency.logo_url);
        const blob = await resp.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* skip */ }
    }

    const sellerName = allSellers.find(s => s.id === sellerId)?.full_name;

    // Collect hotels from metadata
    const hotels: any[] = [];
    for (const item of items) {
      if (item.metadata?.type === 'hotel' && item.metadata.hotel) {
        const h = item.metadata.hotel;
        // Calculate nights from checkIn/checkOut dates
        let hotelNights = 0;
        if (h.checkInDate && h.checkOutDate) {
          const ci = new Date(h.checkInDate + 'T12:00:00');
          const co = new Date(h.checkOutDate + 'T12:00:00');
          if (!isNaN(ci.getTime()) && !isNaN(co.getTime()) && co > ci) {
            hotelNights = Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        hotels.push({
          name: h.hotelName,
          description: h.observations || '',
          detailedDescription: item.metadata?.detailedDescription || '',
          checkIn: h.checkInDate,
          checkOut: h.checkOutDate,
          nights: hotelNights,
          room: h.roomType || '',
          meal: '',
          stars: h.stars,
          amenities: h.amenities,
          reservationNumber: item.reservation_number || '',
        });
      }
    }

    // Load reservations
    let reservations: any[] = [];
    if (editSaleId) {
      const { data: resData } = await supabase.from('reservations').select('*, suppliers(name)').eq('sale_id', editSaleId);
      if (resData) {
        reservations = resData.map((r: any) => ({
          description: r.description || '',
          confirmationCode: r.confirmation_code || '',
          supplier: r.suppliers?.name || '',
          checkIn: r.check_in || '',
          checkOut: r.check_out || '',
          status: r.status || '',
        }));
      }
    }

    // Get sale short_id
    let shortId = '';
    if (editSaleId) {
      const { data: saleData } = await (supabase.from('sales').select('short_id').eq('id', editSaleId).single() as any);
      if (saleData) shortId = saleData.short_id;
    }

    const voucherData: VoucherPdfData = {
      agency: { name: agency.name, whatsapp: agency.whatsapp || '', email: agency.email || '', website: agency.website || '', logoBase64 },
      client: { name: clientName },
      seller: sellerName,
      destination: destinationName || '',
      origin: '',
      departureDate: tripStartDate || '',
      returnDate: tripEndDate || '',
      nights: tripNights || undefined,
      passengersCount: passengers.length || passengersCount || 1,
      passengers: passengers.map((p, i) => ({
        name: `${p.first_name} ${p.last_name}`.trim() || `Passageiro ${i + 1}`,
        document: p.document_number || undefined,
        documentType: p.document_type || undefined,
        birthDate: p.birth_date || undefined,
        isMain: p.is_main,
        eticketNumber: p.eticket_number || undefined,
      })),
      flightLegs,
      flightGroups,
      hotels,
      services: items.map((item, idx) => {
        const catalogName = item.service_catalog_id ? serviceCatalog.find(s => s.id === item.service_catalog_id)?.name || '' : '';
        return {
          name: catalogName || item.description || `Serviço ${idx + 1}`,
          description: item.metadata?.detailedDescription || item.description,
          value: item.total_value,
          type: item.metadata?.type || '',
          reservationNumber: item.reservation_number || '',
        };
      }),
      allItems: showIndividualValues ? items.map((item, idx) => {
        const catalogName = item.service_catalog_id ? serviceCatalog.find(s => s.id === item.service_catalog_id)?.name || '' : '';
        return { name: catalogName || item.description || `Serviço ${idx + 1}`, value: item.total_value, description: item.description || '' };
      }) : [],
      showIndividualValues,
      totalTrip: totalSaleWithInterest,
      reservations,
      payment: {
        method: paymentMethod,
        installments: Math.max(...Object.values(installmentsMap), 1),
        receivables: receivables.map(r => ({ number: r.installment_number, amount: r.amount, dueDate: r.due_date || undefined })),
      },
      notes: notes || undefined,
      saleDate,
      shortId,
    };

    return { voucherData, logoBase64, shortId };
  };

  const handleExportServicesVoucher = async () => {
    const result = await prepareVoucherCommonData();
    if (!result) return;
    const { voucherData } = result;

    // Load Vortex white logo (same as airline voucher)
    let vortexWhiteLogoBase64: string | undefined;
    try {
      const vortexResp = await fetch('/images/vortex-white-logo.png');
      const vortexBlob = await vortexResp.blob();
      vortexWhiteLogoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(vortexBlob);
      });
    } catch { /* fallback to agency logo */ }

    voucherData.vortexWhiteLogoBase64 = vortexWhiteLogoBase64;

    const doc = generateVoucherPdf(voucherData);
    doc.save(`voucher-servicos-${clientName.replace(/\s+/g, '-').toLowerCase()}-${saleDate}.pdf`);
    toast.success('Voucher de servicos gerado com sucesso!');
  };

  const handleExportAirlineVoucher = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório para gerar o voucher'); return; }

    const airlineItems = items.filter(i => i.metadata?.type === 'aereo' && i.metadata?.flightLegs?.length);
    if (airlineItems.length === 0) {
      toast.error('Nenhum serviço aéreo encontrado nesta venda');
      return;
    }

    const result = await prepareVoucherCommonData();
    if (!result) return;
    const { logoBase64, shortId } = result;

    // Load agency for footer
    let agency = { name: 'Agência de Viagens', whatsapp: '', email: '', website: '', logo_url: '' };
    const agQuery = activeCompany?.id
      ? supabase.from('agency_settings').select('*').eq('empresa_id', activeCompany.id).limit(1)
      : supabase.from('agency_settings').select('*').limit(1);
    const { data: agData } = await agQuery;
    if (agData && agData.length > 0) agency = agData[0] as any;

    for (const airItem of airlineItems) {
      const meta = airItem.metadata!;
      const legs = meta.flightLegs || [];

      let airlineName = '';
      if (meta.airlineId && activeCompany?.id) {
        const { data: airlineData } = await (supabase.from('airlines' as any).select('name').eq('id', meta.airlineId).maybeSingle() as any);
        if (airlineData) airlineName = airlineData.name || '';
      }

      const legAirlineIds = [...new Set(legs.map((l: any) => l.airlineId).filter(Boolean))];
      const airlineCache: Record<string, { name: string; logoBase64?: string }> = {};
      for (const aid of legAirlineIds) {
        const { data: aData } = await (supabase.from('airlines' as any).select('name, logo_url').eq('id', aid).maybeSingle() as any);
        if (aData) {
          let legLogoBase64: string | undefined;
          if (aData.logo_url) {
            try {
              const resp = await fetch(aData.logo_url);
              const blob = await resp.blob();
              legLogoBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            } catch { /* skip */ }
          }
          airlineCache[aid] = { name: aData.name || '', logoBase64: legLogoBase64 };
        }
      }

      const airPax: AirlineVoucherPassenger[] = passengers.map((p, i) => ({
        name: `${p.first_name} ${p.last_name}`.trim() || `Passageiro ${i + 1}`,
        eticketNumber: p.eticket_number || undefined,
        baggage: meta.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 },
      }));

      let vortexWhiteLogoBase64: string | undefined;
      try {
        const vortexResp = await fetch('/images/vortex-white-logo.png');
        const vortexBlob = await vortexResp.blob();
        vortexWhiteLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(vortexBlob);
        });
      } catch { /* fallback to agency logo */ }

      const airVoucherData: AirlineVoucherData = {
        agencyLogoBase64: vortexWhiteLogoBase64 || logoBase64,
        airlineName,
        shortId: airItem.purchase_number || shortId || undefined,
        localizador: airItem.reservation_number || '',
        passengers: airPax,
        flightLegs: legs.map((l: any) => ({
          origin: l.origin || '',
          destination: l.destination || '',
          originFull: l.originFull || '',
          destinationFull: l.destinationFull || '',
          departureDate: l.departureDate || '',
          departureTime: l.departureTime || '',
          arrivalDate: l.arrivalDate || '',
          arrivalTime: l.arrivalTime || '',
          flightCode: l.flightCode || '',
          connectionDuration: l.connectionDuration || '',
          direction: l.direction || 'ida',
          airlineLogoBase64: l.airlineId && airlineCache[l.airlineId] ? airlineCache[l.airlineId].logoBase64 : undefined,
          airlineName: l.airlineId && airlineCache[l.airlineId] ? airlineCache[l.airlineId].name : undefined,
        })),
        notes: meta.detailedDescription ? meta.detailedDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : undefined,
        agencyName: agency.name,
        agencyWhatsapp: agency.whatsapp || '',
        agencyEmail: agency.email || '',
        agencyWebsite: agency.website || '',
      };

      const airDoc = generateAirlineVoucherPdf(airVoucherData);
      const airFileName = `voucher-aereo-${airlineName ? airlineName.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      airDoc.save(airFileName);
    }
    toast.success('Voucher(s) aereo(s) gerado(s)!');
  };

  const handleExportDraftPdf = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório para gerar o PDF'); return; }
    let agency = { name: 'Agência de Viagens', whatsapp: '', email: '', website: '', logo_url: '' };
    const agQuery = activeCompany?.id
      ? supabase.from('agency_settings').select('*').eq('empresa_id', activeCompany.id).limit(1)
      : supabase.from('agency_settings').select('*').limit(1);
    const { data: agData } = await agQuery;
    if (agData && agData.length > 0) agency = agData[0] as any;

    let flightLegs: any[] = [];
    let flightGroups: any[][] = [];
    for (const item of items) {
      if (item.metadata?.type === 'aereo' && item.metadata.flightLegs?.length) {
        flightGroups.push([...item.metadata.flightLegs]);
        flightLegs.push(...item.metadata.flightLegs);
      }
    }
    if (quoteId) {
      const { data: qServices } = await supabase.from('services').select('*').eq('quote_id', quoteId).order('sort_order');
      if (qServices) {
        for (const svc of qServices) {
          if (svc.type === 'aereo') {
            const { data: legs } = await supabase.from('flight_legs').select('*').eq('service_id', svc.id).order('sort_order');
            if (legs) flightLegs.push(...legs.map((l: any) => ({
              origin: l.origin, destination: l.destination, departureDate: l.departure_date,
              departureTime: l.departure_time, arrivalDate: l.arrival_date, arrivalTime: l.arrival_time,
              connectionDuration: l.connection_duration, direction: l.direction as 'ida' | 'volta', flightCode: '',
            })));
          }
        }
      }
    }

    let logoBase64: string | undefined;
    if (agency.logo_url) {
      try {
        const resp = await fetch(agency.logo_url);
        const blob = await resp.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* skip */ }
    }

    let destinationImageBase64: string | undefined;
    if (destinationImageUrl) {
      try {
        const resp = await fetch(destinationImageUrl);
        const blob = await resp.blob();
        destinationImageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* skip */ }
    }

    const sellerName = allSellers.find(s => s.id === sellerId)?.full_name;

    const hotels: any[] = [];
    for (const item of items) {
      if (item.metadata?.type === 'hotel' && item.metadata.hotel) {
        const h = item.metadata.hotel;
        hotels.push({
          name: h.hotelName, description: h.description, checkIn: h.checkInDate,
          checkOut: h.checkOutDate, nights: tripNights || 0,
        });
      }
    }

    const pdfData: PremiumPdfData = {
      agency: { name: agency.name, whatsapp: agency.whatsapp || '', email: agency.email || '', website: agency.website || '', logoBase64 },
      client: { name: quoteTitle || clientName },
      seller: sellerName,
      destination: destinationName || items.find(i => i.metadata?.type === 'hotel')?.metadata?.hotel?.hotelName || '',
      origin: '',
      departureDate: tripStartDate || undefined,
      returnDate: tripEndDate || undefined,
      nights: tripNights || undefined,
      passengersCount: passengers.length || passengersCount || 1,
      passengers: passengers.map((p, i) => ({
        name: `${p.first_name} ${p.last_name}`.trim() || `Passageiro ${i + 1}`,
        document: p.document_number || undefined,
        birthDate: p.birth_date || undefined,
        isMain: p.is_main,
      })),
      flightLegs,
      flightGroups,
      hotels,
      services: items.map((item, idx) => {
        const catalogName = item.service_catalog_id ? serviceCatalog.find(s => s.id === item.service_catalog_id)?.name || '' : '';
        return {
          name: catalogName || item.description || `Serviço ${idx + 1}`,
          description: item.metadata?.detailedDescription || item.description,
          value: item.total_value,
        };
      }),
      allItems: showIndividualValues ? items.map((item, idx) => {
        const catalogName = item.service_catalog_id ? serviceCatalog.find(s => s.id === item.service_catalog_id)?.name || '' : '';
        return { name: catalogName || item.description || `Serviço ${idx + 1}`, value: item.total_value, description: item.description || '' };
      }) : [],
      showIndividualValues,
      totalProducts: totalCost,
      totalTaxes: 0,
      totalTrip: totalSaleWithInterest,
      proposalPaymentOptions: proposalPaymentOptions.filter(o => o.enabled),
      payment: {
        method: paymentMethod,
        installments: Math.max(...Object.values(installmentsMap), 1),
        receivables: receivables.map(r => ({ number: r.installment_number, amount: r.amount, dueDate: r.due_date || undefined })),
      },
      notes: notes || undefined,
      destinationImageBase64,
      quoteOptions: quoteOptions.length > 1 ? quoteOptions.map((opt) => {
        const optId = opt.id || '';
        const optItems = items.filter(i => (i.quote_option_id || quoteOptions[0]?.id) === optId);
        const optHotels: any[] = [];
        const optFlightLegs: any[] = [];
        const optFlightGroups: any[][] = [];
        const optServices: any[] = [];

        for (const item of optItems) {
          if (item.metadata?.type === 'hotel' && item.metadata.hotel) {
            const h = item.metadata.hotel;
            optHotels.push({ name: h.hotelName, description: h.description, checkIn: h.checkInDate, checkOut: h.checkOutDate, nights: tripNights || 0 });
          }
          if (item.metadata?.flightLegs?.length > 0) {
            optFlightGroups.push(item.metadata.flightLegs);
            optFlightLegs.push(...item.metadata.flightLegs);
          }
          const catalogName = item.service_catalog_id ? serviceCatalog.find(s => s.id === item.service_catalog_id)?.name || '' : '';
          if (item.metadata?.type !== 'hotel' && item.metadata?.type !== 'aereo') {
            optServices.push({ name: catalogName || item.description || 'Serviço', description: item.metadata?.detailedDescription || item.description, value: item.total_value });
          }
        }

        const optTotalProducts = optItems.reduce((s, i) => s + i.total_value, 0);
        return {
          name: opt.name,
          items: optItems.map((item, idx) => {
            const cn = item.service_catalog_id ? serviceCatalog.find(s => s.id === item.service_catalog_id)?.name || '' : '';
            return { name: cn || item.description || `Serviço ${idx + 1}`, value: item.total_value, description: item.description || '' };
          }),
          hotels: optHotels,
          flightLegs: optFlightLegs,
          flightGroups: optFlightGroups,
          services: optServices,
          totalProducts: optTotalProducts,
          totalTrip: optTotalProducts + saleInterest + operatorTaxes,
        };
      }) : undefined,
    };

    const doc = generatePremiumQuotePdf(pdfData);
    doc.save(`rascunho-${clientName.replace(/\s+/g, '-').toLowerCase()}-${saleDate}.pdf`);
    toast.success('PDF do rascunho gerado com sucesso!');
  };

  const handleGenerateLink = async () => {
    if (!editSaleId) { toast.error('Salve a venda primeiro antes de gerar o link da proposta.'); return; }
    const { data, error } = await (supabase.from('sales').select('short_id' as any).eq('id', editSaleId).single() as any);
    if (error || !data?.short_id) { toast.error('Erro ao buscar código da proposta.'); return; }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/proposta/${data.short_id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link da proposta copiado!');
    } catch {
      window.prompt('Copie o link da proposta:', link);
    }
  };

  const handleGenerateClientBuildsLink = async () => {
    if (!editSaleId) { toast.error('Salve a venda primeiro antes de gerar o link.'); return; }
    const { data, error } = await (supabase.from('sales').select('short_id' as any).eq('id', editSaleId).single() as any);
    if (error || !data?.short_id) { toast.error('Erro ao buscar código da proposta.'); return; }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/montar-proposta/${data.short_id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link "Cliente monta proposta" copiado!');
    } catch {
      window.prompt('Copie o link:', link);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        if (saleStatus === 'active') handleExportServicesVoucher();
        else handleExportDraftPdf();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleGenerateLink();
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (isQuoteMode) handleSaveDraft();
        else handleSave();
      } else if (e.key === 'F11' && isQuoteMode) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const getServiceTypeLabel = (metadata?: ServiceMetadata) => {
    if (!metadata?.type) return null;
    const labels: Record<string, string> = { aereo: '✈️', hotel: '🏨', carro: '🚗', seguro: '🛡️', experiencia: '🎟️', adicional: '📋' };
    return labels[metadata.type] || null;
  };

  return (
    <AppLayout>
      {(savingDraft || savingSale) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-lg px-8 py-6 flex flex-col items-center gap-3">
            <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-foreground">
              {savingSale ? 'Salvando venda...' : 'Salvando cotação...'}
            </span>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Compact Progress Bar */}
        {editSaleId && (() => {
          const needsContract = saleWorkflowStatus !== 'sem_contrato';
          const steps = [
            { key: 'created', label: 'Cotação', done: true },
            { key: 'sale', label: 'Venda', done: saleStatus === 'active' },
            ...(needsContract ? [{ key: 'contract', label: 'Contrato', done: !!contractInfo.signedAt }] : []),
            { key: 'payment', label: 'Pagamento', done: saleWorkflowStatus === 'aguardando_pagamento' || saleWorkflowStatus === 'processo_concluido' },
            { key: 'done', label: 'Concluído', done: saleWorkflowStatus === 'processo_concluido' },
          ];
          const completed = steps.filter(s => s.done).length;
          const pct = Math.round((completed / steps.length) * 100);
          const currentStep = steps.find(s => !s.done) || steps[steps.length - 1];
          const statusLabels: Record<string, string> = {
            em_aberto: 'Em aberto', contatando: 'Contatando', reservado: 'Reservado',
            emitido: 'Emitido', aguardando_assinatura: 'Aguard. Assinatura',
            aguardando_pagamento: 'Aguard. Pagamento', processo_concluido: 'Concluído',
            sem_contrato: 'Sem Contrato', perdido: 'Perdido',
          };
          return (
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{pct}%</span>
              <Badge variant="outline" className="text-xs shrink-0">{statusLabels[saleWorkflowStatus] || saleWorkflowStatus}</Badge>
            </div>
          );
        })()}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {saleStatus === 'active' ? 'Editar Venda' : editSaleId ? 'Editar Cotação' : 'Nova Cotação'}
          </h1>
          <Button variant="outline" onClick={() => setPdfImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />📄 Importar Orçamento (PDF)
          </Button>
        </div>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full justify-start border-b mb-4">
            <TabsTrigger value="dados">📋 Dados</TabsTrigger>
            <TabsTrigger value="servicos">🛒 Serviços</TabsTrigger>
            <TabsTrigger value="passageiros">👤 Passageiros</TabsTrigger>
            <TabsTrigger value="financeiro">💰 Financeiro</TabsTrigger>
            <TabsTrigger value="documentos">📄 Documentos</TabsTrigger>
          </TabsList>

          {/* TAB: Dados */}
          <TabsContent value="dados" className="space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isQuoteMode ? 'Informações da Cotação' : 'Informações da Venda'}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quoteId && (
                <div>
                  <Label>Código da Cotação</Label>
                  <Input value={quoteId} disabled className="bg-muted" />
                </div>
              )}
              <div className={quoteId ? '' : 'md:col-span-2'}>
                <Label>Nome do Cliente *</Label>
                <div className="flex gap-2">
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={clientPopoverOpen} className="flex-1 justify-between font-normal">
                        {clientName || 'Selecione ou digite o cliente...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                          <CommandGroup>
                            {allClients.map(c => (
                              <CommandItem key={c.id} value={c.full_name} onSelect={() => { 
                                setClientName(c.full_name); 
                                setClientPopoverOpen(false); 
                                setAskAddClientAsPassenger(c);
                              }}>
                                {c.full_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button type="button" size="icon" variant="outline" onClick={() => setQuickClientOpen(true)} title="Cadastrar novo cliente">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Nº Passageiros</Label>
                <Input type="number" min="1" value={passengersCount} onChange={e => setPassengersCount(parseInt(e.target.value) || 1)} />
              </div>
              {!isQuoteMode && (
                <div>
                  <Label>Status da Venda</Label>
                  <Select value={saleWorkflowStatus} onValueChange={setSaleWorkflowStatus}>
                    <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_aberto">Em aberto</SelectItem>
                      <SelectItem value="contatando">Contatando</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="emitido">Emitido</SelectItem>
                      <SelectItem value="aguardando_assinatura">Aguardando Assinatura</SelectItem>
                      <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                      <SelectItem value="processo_concluido">Processo Concluído</SelectItem>
                      <SelectItem value="sem_contrato">Sem Contrato</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Data da Venda</Label>
                <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
              </div>
              <div>
                <Label>Vendedor Responsável</Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {allSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início da Viagem</Label>
                <Input type="date" value={tripStartDate} onChange={e => { setTripStartDate(e.target.value); if (!tripEndDate || e.target.value > tripEndDate) setTripEndDate(e.target.value); }} />
              </div>
              <div>
                <Label>Final da Viagem</Label>
                <Input type="date" value={tripEndDate} min={tripStartDate || undefined} onChange={e => setTripEndDate(e.target.value)} />
              </div>
              <div>
                <Label>Nº de Noites</Label>
                <Input type="number" min="0" value={tripNights} onChange={e => { setTripNights(parseInt(e.target.value) || 0); setNightsManuallySet(true); }} />
                <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente pelas datas (editável)</p>
              </div>
              <div className="md:col-span-2">
                <Label>Nome do Destino</Label>
                <Input value={destinationName} onChange={e => setDestinationName(e.target.value)} placeholder="Ex: Orlando, Paris, Cancún..." />
                <p className="text-xs text-muted-foreground mt-1">Exibido nas propostas e orçamentos</p>
             </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <Label>Titulo da Cotacao</Label>
                <Input value={quoteTitle} onChange={e => setQuoteTitle(e.target.value)} placeholder="Ex: Viagem Las Vegas - Família Silva" />
                <p className="text-xs text-muted-foreground mt-1">Substitui o nome do cliente na proposta e PDF</p>
              </div>
              <div>
              <Label>Imagem do Destino (para proposta)</Label>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {destinationImageUrl ? (
                  <>
                    <div className="relative">
                      <img src={destinationImageUrl} alt="Destino" className="h-20 w-32 object-cover rounded border" />
                      <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => { setDestinationImageUrl(''); setDestinationImageConfig(null); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setImagePositionEditorOpen(true)} className="gap-1">
                      <Move className="h-3.5 w-3.5" /> Ajustar Posição
                    </Button>
                  </>
                ) : uploadingDestImage ? (
                  <div className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg text-sm text-muted-foreground">
                    <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Carregando...
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/50">
                    <ImagePlus className="h-4 w-4" />
                    Adicionar imagem
                    <input type="file" accept="image/*" className="hidden" onChange={handleDestinationImageUpload} />
                  </label>
                )}
                {hasStockKeys && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStockImageSearchOpen(true)}
                    disabled={!destinationName.trim()}
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Buscar Imagens
                  </Button>
                )}
              </div>
              </div>
            </div>

            {/* Image Position Editor */}
            <ImagePositionEditor
              open={imagePositionEditorOpen}
              onOpenChange={setImagePositionEditorOpen}
              imageUrl={destinationImageUrl}
              initialConfig={destinationImageConfig}
              onSave={(config) => setDestinationImageConfig(config)}
            />

            {/* AI Image Selection Dialog */}
            <Dialog open={aiImageDialog} onOpenChange={setAiImageDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Escolha uma imagem de {destinationName}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {aiImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                      onClick={() => handleSelectAiImage(img)}
                    >
                      <img src={img} alt={`${destinationName} ${idx + 1}`} className="w-full h-36 object-cover" />
                      <div className="p-2 text-center">
                        <Button size="sm" variant="ghost" className="w-full text-xs">Selecionar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Stock Image Search Modal */}
            <ImageSearchModal
              open={stockImageSearchOpen}
              onClose={() => setStockImageSearchOpen(false)}
              onSelect={handleStockImageSelect}
              initialQuery={destinationName}
              unsplashKey={unsplashApiKey}
              pexelsKey={pexelsApiKey}
            />
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB: Passageiros */}
          <TabsContent value="passageiros" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{isQuoteMode ? 'Passageiros' : 'Passageiros da Reserva'}</CardTitle>
            <Button size="sm" variant="outline" onClick={addPassenger}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {passengers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum passageiro adicionado</p>}
            {passengers.map((pax, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={pax.is_main} onCheckedChange={(checked) => updatePassenger(idx, 'is_main', !!checked)} />
                    <Label className="text-sm font-medium">Passageiro principal</Label>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removePassenger(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Label className="text-xs">Nome</Label>
                    <Input 
                      value={pax.first_name} 
                      onChange={e => { 
                        updatePassenger(idx, 'first_name', e.target.value); 
                        setPassengerSearchTerm(e.target.value);
                        setPassengerSearchOpen(e.target.value.length >= 2 ? idx : null);
                      }} 
                      onFocus={() => { if (pax.first_name.length >= 2) { setPassengerSearchTerm(pax.first_name); setPassengerSearchOpen(idx); } }}
                      onBlur={() => setTimeout(() => setPassengerSearchOpen(null), 200)}
                      placeholder="Nome" 
                      autoComplete="off"
                    />
                    {passengerSearchOpen === idx && passengerSearchTerm.length >= 2 && (() => {
                      const filtered = allClients.filter(c => c.full_name.toLowerCase().includes(passengerSearchTerm.toLowerCase())).slice(0, 5);
                      if (filtered.length === 0) return null;
                      return (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                          {filtered.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={(e) => { e.preventDefault(); fillPassengerFromClient(idx, c); setPassengerSearchOpen(null); }}
                            >
                              {c.full_name}
                              {c.cpf && <span className="text-xs text-muted-foreground ml-2">({c.cpf})</span>}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div><Label className="text-xs">Sobrenome</Label><Input value={pax.last_name} onChange={e => updatePassenger(idx, 'last_name', e.target.value)} placeholder="Sobrenome" /></div>
                  <div><Label className="text-xs">Data de Nascimento</Label><Input type="date" value={pax.birth_date} onChange={e => updatePassenger(idx, 'birth_date', e.target.value)} /></div>
                  <div>
                    <Label className="text-xs">Tipo de Documento</Label>
                    <Select value={pax.document_type} onValueChange={v => updatePassenger(idx, 'document_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="passaporte">Passaporte</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nº do Documento</Label>
                    <Input value={pax.document_number} onChange={e => { const val = pax.document_type === 'cpf' ? maskCpf(e.target.value) : e.target.value; updatePassenger(idx, 'document_number', val); }} placeholder={pax.document_type === 'cpf' ? '000.000.000-00' : 'Nº passaporte'} />
                  </div>
                  <div><Label className="text-xs">Vencimento Doc.</Label><Input type="date" value={pax.document_expiry} onChange={e => updatePassenger(idx, 'document_expiry', e.target.value)} /></div>
                  <div><Label className="text-xs">E-mail</Label><Input value={pax.email} onChange={e => updatePassenger(idx, 'email', maskEmail(e.target.value))} placeholder="email@exemplo.com" type="email" /></div>
                  <div><Label className="text-xs">Telefone</Label><Input value={pax.phone} onChange={e => updatePassenger(idx, 'phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
                  <div><Label className="text-xs">Nº Bilhete Eletrônico</Label><Input value={pax.eticket_number} onChange={e => updatePassenger(idx, 'eticket_number', e.target.value)} placeholder="Ex: 957-1234567890" /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB: Serviços */}
          <TabsContent value="servicos" className="space-y-4">

        {/* Opções da Cotação */}
        {isQuoteMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">📋 Opções da Cotação</CardTitle>
            <Button size="sm" variant="outline" onClick={() => {
              setQuoteOptions(prev => [...prev, { name: `Opção ${prev.length + 1}`, order_index: prev.length }]);
            }}>
              <Plus className="h-4 w-4 mr-1" />Adicionar Opção
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Cada opção representa um cenário diferente de viagem. Os serviços serão vinculados a uma opção.</p>
            <div className="flex flex-wrap gap-2">
              {quoteOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/30">
                  <Input
                    value={opt.name}
                    onChange={e => setQuoteOptions(prev => prev.map((o, i) => i === idx ? { ...o, name: e.target.value } : o))}
                    className="h-7 text-sm w-40 border-0 bg-transparent p-0 focus-visible:ring-0"
                  />
                  {quoteOptions.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => {
                    const removedId = opt.id || String(idx);
                      const remainingOptions = quoteOptions.filter((_, i) => i !== idx);
                      const fallbackId = remainingOptions[0]?.id || String(remainingOptions[0]?.order_index ?? 0);
                      setQuoteOptions(remainingOptions.map((o, i) => ({ ...o, order_index: i })));
                      setItems(prev => prev.map(item => {
                        const ids = item.quote_option_ids || (item.quote_option_id ? [item.quote_option_id] : []);
                        const filtered = ids.filter(id => id !== removedId);
                        if (filtered.length === 0) {
                          return { ...item, quote_option_id: fallbackId, quote_option_ids: [fallbackId] };
                        }
                        return { ...item, quote_option_id: filtered[0], quote_option_ids: filtered };
                      }));
                    }}>
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Serviços da Venda */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{isQuoteMode ? 'Serviços da Cotação' : 'Serviços da Venda'}</CardTitle>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
              const defaultOptIds = quoteOptions.length > 0 ? [quoteOptions[0]?.id || String(quoteOptions[0]?.order_index ?? 0)] : [];
              setItems(prev => [...prev, { description: '', cost_price: 0, rav: 0, markup_percent: 0, total_value: 0, metadata: {}, quote_option_id: defaultOptIds[0], quote_option_ids: defaultOptIds }]);
              setTimeout(() => setEditingItemIdx(items.length), 50);
            }}>
              <Plus className="h-4 w-4 mr-1" />Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 sm:p-0">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    {isQuoteMode && quoteOptions.length > 1 && <TableHead className="min-w-[130px]">Opção</TableHead>}
                    <TableHead className="min-w-[120px]">Serviço</TableHead>
                    <TableHead className="min-w-[100px]">Descrição</TableHead>
                    <TableHead className="w-24 text-right">Custo</TableHead>
                    <TableHead className="w-20 text-right">RAV</TableHead>
                    <TableHead className="w-20 text-right">Acrésc.%</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <TableRow className={(() => {
                        const type = item.metadata?.type;
                        if (type === 'aereo') return 'bg-blue-50 dark:bg-blue-950/20';
                        if (type === 'hotel') return 'bg-orange-50 dark:bg-orange-950/20';
                        if (type === 'carro') return 'bg-green-50 dark:bg-green-950/20';
                        if (type === 'seguro') return 'bg-purple-50 dark:bg-purple-950/20';
                        if (type === 'experiencia') return 'bg-pink-50 dark:bg-pink-950/20';
                        if (type === 'adicional') return 'bg-yellow-50 dark:bg-yellow-950/20';
                        return '';
                      })()}>
                        <TableCell className="px-1">
                          <div className="flex flex-col items-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} onClick={() => moveItem(idx, 'up')}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === items.length - 1} onClick={() => moveItem(idx, 'down')}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        {isQuoteMode && quoteOptions.length > 1 && (
                          <TableCell className="px-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-start truncate max-w-[130px]">
                                  <ChevronsUpDown className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">
                                  {(() => {
                                    const ids = item.quote_option_ids || (item.quote_option_id ? [item.quote_option_id] : []);
                                    if (ids.length === 0) return 'Selecionar...';
                                    if (ids.length === quoteOptions.length) return 'Todas';
                                    return ids.map(id => {
                                      const opt = quoteOptions.find(o => (o.id || String(o.order_index)) === id);
                                      return opt ? opt.name.replace(/^Opção \d+ - /, '') : '?';
                                    }).join(', ');
                                  })()}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-2">
                                {quoteOptions.map((opt, oi) => {
                                  const optId = opt.id || String(oi);
                                  const ids = item.quote_option_ids || (item.quote_option_id ? [item.quote_option_id] : []);
                                  const checked = ids.includes(optId);
                                  return (
                                    <label key={oi} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">
                                      <Checkbox checked={checked} onCheckedChange={(v) => {
                                        setItems(prev => prev.map((it, i) => {
                                          if (i !== idx) return it;
                                          const currentIds = it.quote_option_ids || (it.quote_option_id ? [it.quote_option_id] : []);
                                          const newIds = v ? [...currentIds, optId] : currentIds.filter(id => id !== optId);
                                          return { ...it, quote_option_ids: newIds, quote_option_id: newIds[0] || undefined };
                                        }));
                                      }} />
                                      <span className="text-xs truncate">{opt.name}</span>
                                    </label>
                                  );
                                })}
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        )}
                        <TableCell className="px-1">
                          <Select value={item.service_catalog_id || 'manual'} onValueChange={(v) => { const svc = serviceCatalog.find(s => s.id === v); if (svc) { updateItem(idx, 'service_catalog_id', svc.id); if (!item.description || item.description.trim() === '') updateItem(idx, 'description', svc.name); if (svc.cost_center_id) updateItem(idx, 'cost_center_id', svc.cost_center_id); } }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Selecione um serviço</SelectItem>
                              {serviceCatalog.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-1">
                          <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-7 max-w-[140px]" onClick={() => setEditingItemIdx(idx)}>
                            <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate text-xs">{getServiceTypeLabel(item.metadata)}{item.description || 'Editar...'}</span>
                          </Button>
                        </TableCell>
                        <TableCell className="px-1">
                          <Input
                            value={maskCurrency(item.cost_price)}
                            onChange={e => updateItem(idx, 'cost_price', parseCurrency(e.target.value))}
                            className="text-right h-7 text-xs"
                            placeholder="R$ 0,00"
                          />
                        </TableCell>
                        <TableCell className="px-1">
                          <Input
                            value={maskCurrency(item.rav)}
                            onChange={e => updateItem(idx, 'rav', parseCurrency(e.target.value))}
                            className="text-right h-7 text-xs w-20"
                          />
                        </TableCell>
                        <TableCell className="px-1">
                          <Input
                            type="number"
                            step="0.5"
                            value={item.markup_percent ? item.markup_percent : ''}
                            onChange={e => updateItem(idx, 'markup_percent', parseFloat(e.target.value) || 0)}
                            className="text-right h-7 text-xs w-20"
                          />
                        </TableCell>
                        <TableCell className="px-1">
                          <Input
                            value={maskCurrency(item.total_value)}
                            disabled
                            className="bg-muted text-right h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="px-0">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Second row: reservation + images */}
                      <TableRow className="border-b-2">
                        <TableCell colSpan={isQuoteMode && quoteOptions.length > 1 ? 8 : 7} className="py-1.5 px-2">
                          <div className="flex items-center gap-2">
                            {!isQuoteMode && (
                              <>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Reserva:</Label>
                                  <Input
                                    value={item.reservation_number || ''}
                                    onChange={e => updateItem(idx, 'reservation_number' as keyof SaleItem, e.target.value)}
                                    placeholder="ABC123"
                                    className="h-6 text-xs w-28"
                                  />
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Nº Compra:</Label>
                                  <Input
                                    value={item.purchase_number || ''}
                                    onChange={e => updateItem(idx, 'purchase_number' as keyof SaleItem, e.target.value)}
                                    placeholder="123456"
                                    className="h-6 text-xs w-28"
                                  />
                                </div>
                              </>
                            )}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {uploadingItemImages[idx] ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed rounded px-1.5 py-0.5"><span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" /></span>
                              ) : (
                                <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded px-1.5 py-0.5">
                                  <ImagePlus className="h-3 w-3" /><span className="hidden lg:inline">Imagens</span><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleItemImageUpload(idx, e)} />
                                </label>
                              )}
                              {searchingItemImages[idx] ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed rounded px-1.5 py-0.5"><Loader2 className="h-3 w-3 animate-spin" /></span>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-6 text-xs px-1.5 gap-0.5" onClick={() => handleSearchServiceImages(idx)}>
                                  <Search className="h-3 w-3" /><span className="hidden lg:inline">Buscar</span>
                                </Button>
                              )}
                            </div>
                            {/* Scrollable images container */}
                            {(itemImages[idx] || []).length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 py-0.5">
                                {(itemImages[idx] || []).map((url, imgIdx) => (
                                  <div key={imgIdx} className="relative group flex flex-col items-center flex-shrink-0">
                                    {imgIdx === 0 && (itemImages[idx] || []).length > 1 && (
                                      <span className="text-[8px] font-semibold text-primary leading-none">CAPA</span>
                                    )}
                                    <div className="relative">
                                      <img src={url} alt="" className={`h-9 w-12 object-cover rounded border ${imgIdx === 0 ? 'ring-1 ring-primary' : ''}`} />
                                      <button type="button" onClick={() => removeItemImage(idx, imgIdx)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-3.5 w-3.5 flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    </div>
                                    {(itemImages[idx] || []).length > 1 && (
                                      <div className="flex gap-0.5">
                                        <button type="button" disabled={imgIdx === 0} onClick={() => moveItemImage(idx, imgIdx, 'left')} className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30">◀</button>
                                        <button type="button" disabled={imgIdx === (itemImages[idx] || []).length - 1} onClick={() => moveItemImage(idx, imgIdx, 'right')} className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30">▶</button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0} onClick={() => moveItem(idx, 'up')}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === items.length - 1} onClick={() => moveItem(idx, 'down')}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select value={item.service_catalog_id || 'manual'} onValueChange={(v) => { const svc = serviceCatalog.find(s => s.id === v); if (svc) { updateItem(idx, 'service_catalog_id', svc.id); if (!item.description || item.description.trim() === '') updateItem(idx, 'description', svc.name); if (svc.cost_center_id) updateItem(idx, 'cost_center_id', svc.cost_center_id); } }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Serviço..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Selecione</SelectItem>
                        {serviceCatalog.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="ml-1 shrink-0" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal" onClick={() => setEditingItemIdx(idx)}>
                    <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{getServiceTypeLabel(item.metadata)}{item.description || 'Editar detalhes...'}</span>
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Custo</Label>
                      <Input value={maskCurrency(item.cost_price)} onChange={e => updateItem(idx, 'cost_price', parseCurrency(e.target.value))} className="h-8 text-sm text-right" />
                    </div>
                    <div>
                      <Label className="text-xs">RAV</Label>
                      <Input value={maskCurrency(item.rav)} onChange={e => updateItem(idx, 'rav', parseCurrency(e.target.value))} className="h-8 text-sm text-right" />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <Input value={maskCurrency(item.total_value)} disabled className="bg-muted h-8 text-sm text-right" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {uploadingItemImages[idx] ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed rounded px-2 py-1"><span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />...</span>
                    ) : (
                      <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded px-2 py-1">
                        <ImagePlus className="h-3 w-3" />Imagens<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleItemImageUpload(idx, e)} />
                      </label>
                    )}
                    {searchingItemImages[idx] ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed rounded px-2 py-1"><Loader2 className="h-3 w-3 animate-spin" />Buscando...</span>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1" onClick={() => handleSearchServiceImages(idx)}>
                        <Search className="h-3 w-3" />Buscar Imagens
                      </Button>
                    )}
                    {(itemImages[idx] || []).map((url, imgIdx) => (
                      <div key={imgIdx} className="relative group flex flex-col items-center">
                        {imgIdx === 0 && (itemImages[idx] || []).length > 1 && (
                          <span className="text-[9px] font-semibold text-primary mb-0.5">CAPA</span>
                        )}
                        <div className="relative">
                          <img src={url} alt="" className={`h-8 w-12 object-cover rounded border ${imgIdx === 0 ? 'ring-2 ring-primary' : ''}`} />
                          <button type="button" onClick={() => removeItemImage(idx, imgIdx)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px]">×</button>
                        </div>
                        {(itemImages[idx] || []).length > 1 && (
                          <div className="flex gap-0.5 mt-0.5">
                            <button type="button" disabled={imgIdx === 0} onClick={() => moveItemImage(idx, imgIdx, 'left')} className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30">◀</button>
                            <button type="button" disabled={imgIdx === (itemImages[idx] || []).length - 1} onClick={() => moveItemImage(idx, imgIdx, 'right')} className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30">▶</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          {/* TAB: Financeiro */}
          <TabsContent value="financeiro" className="space-y-4">

        {/* Recebimento - only in sale mode */}
        {!isQuoteMode && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recebimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>Adicionar forma de recebimento</Label>
                <Select value="" onValueChange={v => {
                  if (v && !paymentMethods.includes(v)) {
                    setInstallmentsMap(prev => ({ ...prev, [v]: 1 }));
                    setPaymentMethods(prev => [...prev, v]);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 'pix', label: 'Pix' },
                      { value: 'dinheiro', label: 'Dinheiro' },
                      { value: 'boleto', label: 'Boleto' },
                      { value: 'credito', label: 'Cartão de Crédito' },
                      { value: 'debito', label: 'Cartão de Débito' },
                      { value: 'transferencia', label: 'Transferência' },
                      { value: 'operadora', label: 'Pgto Operadora/Consolidadora' },
                    ].filter(opt => !paymentMethods.includes(opt.value)).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map(m => {
                    const labels: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', boleto: 'Boleto', credito: 'Cartão de Crédito', debito: 'Cartão de Débito', transferencia: 'Transferência', operadora: 'Pgto Operadora' };
                    return (
                      <Badge key={m} variant="secondary" className="gap-1 pr-1">
                        {labels[m] || m}
                        <button type="button" onClick={() => setPaymentMethods(prev => prev.filter(x => x !== m))} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Per-method installment selectors for generic methods (pix, dinheiro, debito, transferencia) */}
            {paymentMethods.filter(m => !['credito', 'boleto', 'operadora'].includes(m)).length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">Parcelamento por forma de pagamento</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {paymentMethods.filter(m => !['credito', 'boleto', 'operadora'].includes(m)).map(m => {
                    const labels: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de Débito', transferencia: 'Transferência' };
                    return (
                      <div key={m}>
                        <Label>{labels[m] || m} — Parcelas</Label>
                        <Select value={String(getInstallments(m))} onValueChange={v => setMethodInstallments(m, parseInt(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasCredito && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Cartão de Crédito</Label>
                    <Select value={cardPaymentType} onValueChange={setCardPaymentType}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent><SelectItem value="ec">EC (Máquina)</SelectItem><SelectItem value="link">Link de Pagamento</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Parcelamento</Label>
                    <Select value={String(getInstallments('credito'))} onValueChange={v => setMethodInstallments('credito', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 18 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {hasBoleto && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Select value={String(getInstallments('boleto'))} onValueChange={v => setMethodInstallments('boleto', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Juros (% ao mês)</Label>
                    <Input type="number" step="0.01" value={boletoInterestRate} onChange={e => setBoletoInterestRate(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Valor da Venda</Label>
                    <Input value={fmt(totalSaleWithInterest)} disabled className="bg-muted" />
                  </div>
                </div>
                {getInstallments('boleto') > 1 && boletoInterestRate > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p>Valor total com juros: <strong>{fmt(receivables.reduce((s, r) => s + r.amount, 0))}</strong></p>
                    <p>Valor de cada parcela: <strong>{fmt(receivables[0]?.amount || 0)}</strong></p>
                  </div>
                )}
              </div>
            )}

            {hasOperadora && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Select value={String(getInstallments('operadora'))} onValueChange={v => setMethodInstallments('operadora', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><p className="text-sm text-muted-foreground">Comissão Bruta</p><p className="text-sm font-bold text-primary">{fmt(grossProfit)}</p></div>
                  {getInstallments('operadora') > 1 && <div><p className="text-sm text-muted-foreground">Valor por parcela</p><p className="text-sm font-bold">{fmt(grossProfit / getInstallments('operadora'))}</p></div>}
                </div>
              </div>
            )}

            {hasMachineFeeMethod && (
              <div className="space-y-3 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label>Taxa de Máquina (R$)</Label>
                    <Input value={machineFee ? `R$ ${machineFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} onChange={e => { const digits = e.target.value.replace(/[^\d]/g, ''); setMachineFee(parseInt(digits || '0', 10) / 100); }} placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <Label>Fornecedor da Taxa</Label>
                    <Select value={machineFeeSupplierId || 'none'} onValueChange={v => setMachineFeeSupplierId(v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {allSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {machineFee > 0 && (
                    <>
                      <div><p className="text-sm text-muted-foreground">Lucro antes da taxa</p><p className="text-sm font-medium">{fmt(grossProfit)}</p></div>
                      <div><p className="text-sm text-muted-foreground">Lucro após taxa</p><p className="text-sm font-bold text-destructive">{fmt(grossProfit - machineFee)}</p></div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Receivables inline with tabs per payment method */}
            <div className="border-t pt-4">
              {(() => {
                const isOperadoraOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
                const totalReceivables = receivables.reduce((s, r) => s + r.amount, 0);
                const expectedReceivables = isOperadoraOnly ? grossProfit : totalSaleWithInterest;
                const diff = expectedReceivables - totalReceivables;

                // Group receivables by payment_method
                const methodLabels: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', boleto: 'Boleto', credito: 'Cartão de Crédito', debito: 'Cartão de Débito', transferencia: 'Transferência', operadora: 'Pgto Operadora' };
                const uniqueMethods = Array.from(new Set(receivables.map(r => r.payment_method || 'outros')));
                const hasMultipleMethods = uniqueMethods.length > 1;

                const renderTable = (items: { rec: Receivable; globalIdx: number }[]) => (
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-24">Parcela</TableHead><TableHead>Data de Recebimento</TableHead><TableHead className="w-40">Valor</TableHead><TableHead className="w-48">Centro de Custo</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {items.map(({ rec: r, globalIdx: idx }, localIdx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{localIdx + 1}ª</TableCell>
                          <TableCell><Input type="date" value={r.due_date} onChange={e => setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, due_date: e.target.value } : rec))} /></TableCell>
                          <TableCell><Input type="number" className="w-32" value={r.amount} onChange={e => setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, amount: Number(e.target.value) } : rec))} /></TableCell>
                          <TableCell>
                            <Select value={r.cost_center_id || 'none'} onValueChange={v => {
                              const newVal = v === 'none' ? undefined : v;
                              if (localIdx === 0) {
                                // First installment sets all in this group
                                const groupIndices = items.map(it => it.globalIdx);
                                setReceivables(prev => prev.map((rec, i) => groupIndices.includes(i) ? { ...rec, cost_center_id: newVal } : rec));
                              } else {
                                setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, cost_center_id: newVal } : rec));
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );

                return (
                  <>
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="text-muted-foreground">{isOperadoraOnly ? 'Comissão Bruta' : 'Total da Venda'}: <strong className="text-foreground">{fmt(expectedReceivables)}</strong></span>
                      <span className="text-muted-foreground">Lançado: <strong className="text-foreground">{fmt(totalReceivables)}</strong></span>
                      {Math.abs(diff) > 0.01 ? (
                        <span className={diff > 0 ? "text-amber-600 font-semibold" : "text-destructive font-semibold"}>
                          {diff > 0 ? `Falta lançar: ${fmt(diff)}` : `Excedente: ${fmt(Math.abs(diff))}`}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">✓ Valores conferem</span>
                      )}
                    </div>
                    {hasMultipleMethods ? (
                      <Tabs defaultValue={uniqueMethods[0]} className="w-full">
                        <TabsList className="w-full justify-start">
                          {uniqueMethods.map(m => {
                            const methodItems = receivables.filter(r => (r.payment_method || 'outros') === m);
                            const methodTotal = methodItems.reduce((s, r) => s + r.amount, 0);
                            return (
                              <TabsTrigger key={m} value={m}>
                                {Object.values(methodLabels).find(l => l === m) || m} ({methodItems.length}x) - {fmt(methodTotal)}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                        {uniqueMethods.map(m => {
                          const items = receivables.map((rec, idx) => ({ rec, globalIdx: idx })).filter(({ rec }) => (rec.payment_method || 'outros') === m);
                          return (
                            <TabsContent key={m} value={m}>
                              {renderTable(items)}
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    ) : (
                      renderTable(receivables.map((rec, idx) => ({ rec, globalIdx: idx })))
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Proposal Payment Options - only in draft/quote mode */}
        {isQuoteMode && (
        <Card>
          <CardHeader><CardTitle className="text-base">💳 Opções de Pagamento para Proposta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Checkbox
                id="showIndividualValues"
                checked={showIndividualValues}
                onCheckedChange={(checked) => setShowIndividualValues(!!checked)}
              />
              <Label htmlFor="showIndividualValues" className="text-sm cursor-pointer">
                Mostrar valores individuais de serviços e ocultar o valor total na proposta (PDF e interativa)
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Checkbox
                id="showPerPassenger"
                checked={showPerPassenger}
                onCheckedChange={(checked) => setShowPerPassenger(!!checked)}
              />
              <Label htmlFor="showPerPassenger" className="text-sm cursor-pointer">
                Mostrar o valor da parcela por pessoa? (divide o total e as parcelas pelo nº de passageiros)
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Checkbox
                id="showOnlyTotal"
                checked={showOnlyTotal}
                onCheckedChange={(checked) => setShowOnlyTotal(!!checked)}
              />
              <Label htmlFor="showOnlyTotal" className="text-sm cursor-pointer">
                Mostrar somente o valor total? (oculta todas as opções de pagamento na proposta)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">Selecione quais formas de pagamento deseja ofertar ao cliente na proposta (PDF e interativa).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proposalPaymentOptions.map((opt, idx) => (
                <div key={opt.method} className={`border rounded-lg p-4 transition-colors ${opt.enabled ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={opt.enabled}
                      onCheckedChange={(checked) => {
                        setProposalPaymentOptions(prev => prev.map((o, i) => i === idx ? { ...o, enabled: !!checked } : o));
                      }}
                    />
                    <div className="flex-1">
                      <Label className="font-medium">{opt.label}</Label>
                      {opt.enabled && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Parcelas</Label>
                            <Input
                              type="number"
                              min="1"
                              max="24"
                              value={opt.installments}
                              onChange={e => {
                                const inst = parseInt(e.target.value) || 1;
                                setProposalPaymentOptions(prev => prev.map((o, i) => i === idx ? {
                                  ...o,
                                  installments: inst,
                                } : o));
                              }}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Desconto / Acréscimo (%)</Label>
                            <Input
                              type="number"
                              step="0.5"
                              value={opt.discountPercent || 0}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setProposalPaymentOptions(prev => prev.map((o, i) => i === idx ? {
                                  ...o,
                                  discountPercent: val,
                                } : o));
                              }}
                              placeholder="Ex: 5 = 5% desconto, -3 = 3% acréscimo"
                              className="h-8"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">Positivo = desconto · Negativo = acréscimo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProposalPaymentOptions(prev => [...prev, {
                method: `custom_${Date.now()}`,
                label: 'Personalizado',
                installments: 1,
                discountPercent: 0,
                enabled: true,
              }])}
            >
              <Plus className="h-4 w-4 mr-1" />Adicionar opção
            </Button>
          </CardContent>
        </Card>
        )}

        {/* Receivables card removed - now inline inside Recebimento */}

        {/* Controle de Pagamentos - only in sale mode */}
        {!isQuoteMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💰 Controle de Pagamentos</CardTitle>
              {(() => {
                const isOperadoraOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
                const isMixedOp = hasOperadora && paymentMethods.length > 1;
                const operadoraPortion = isMixedOp ? totalSaleWithInterest / paymentMethods.length : 0;
                const expectedCost = isOperadoraOnly ? 0 : (isMixedOp ? Math.max(0, Math.round((totalCost - operadoraPortion) * 100) / 100) : totalCost);
                const totalPayments = supplierPayments.reduce((s, sp) => s + sp.amount, 0);
                const diff = expectedCost - totalPayments;
                return (
                  <div className="flex items-center gap-4 text-sm mt-1">
                    <span className="text-muted-foreground">{isMixedOp ? 'Custo Ajustado' : 'Custo Total'}: <strong className="text-foreground">{fmt(expectedCost)}</strong></span>
                    <span className="text-muted-foreground">Lançado: <strong className="text-foreground">{fmt(totalPayments)}</strong></span>
                    {Math.abs(diff) > 0.01 ? (
                      <span className={diff > 0 ? "text-amber-600 font-semibold" : "text-destructive font-semibold"}>
                        {diff > 0 ? `Falta lançar: ${fmt(diff)}` : `Excedente: ${fmt(Math.abs(diff))}`}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">✓ Valores conferem</span>
                    )}
                  </div>
                );
              })()}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supplier selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Fornecedores</Label>
                <div className="flex gap-2">
                  <Select value={addingSupplierId} onValueChange={setAddingSupplierId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar fornecedor..." /></SelectTrigger>
                    <SelectContent>
                      {allSuppliers.filter(s => !selectedSupplierIds.includes(s.id)).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addSupplier} variant="outline"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                </div>
                {selectedSupplierIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSupplierIds.map(sid => {
                      const sup = allSuppliers.find(s => s.id === sid);
                      return (
                        <div key={sid} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                          <span>{sup?.name || sid}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setSelectedSupplierIds(prev => prev.filter(s => s !== sid))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seller commission info */}
              {sellerId && sellerId !== 'none' && (() => {
                const seller = allSellers.find(s => s.id === sellerId);
                if (!seller || seller.commission_type === 'none') return null;
                const pct = seller.commission_percentage || 0;
                const sellerCommValue = (() => {
                  if (seller.commission_type === 'sales_percentage') {
                    const base = seller.commission_base === 'net_received' ? totalSaleWithInterest - cardFeeValue
                      : seller.commission_base === 'sale_profit' ? grossProfit : totalSaleWithInterest;
                    return base * (pct / 100);
                  } else if (seller.commission_type === 'profit_percentage') {
                    return grossProfit * (pct / 100);
                  } else if (seller.commission_type === 'company_profit_percentage') {
                    return commissionValue * (pct / 100);
                  }
                  return grossProfit * (pct / 100);
                })();
                return (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Comissão - {seller.full_name}</p>
                      <Badge variant="outline" className="text-xs">{pct}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Valor estimado: <span className="font-semibold text-foreground">{fmt(sellerCommValue)}</span></p>
                    <p className="text-xs text-muted-foreground">Será gerado automaticamente no Contas a Pagar ao salvar a venda</p>
                  </div>
                );
              })()}

              {/* Supplier payments */}
              {selectedSupplierIds.length > 0 && supplierPayments.map(sp => {
                const sup = allSuppliers.find(s => s.id === sp.supplier_id);
                const isOpOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
                return (
                  <div key={sp.supplier_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-sm">{sup?.name || 'Fornecedor'}</p>
                      {!isOpOnly && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Valor:</Label>
                          <Input
                            className="w-36 h-8 text-sm font-semibold"
                            value={sp.amount ? `R$ ${sp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                            onChange={e => {
                              const digits = e.target.value.replace(/[^\d]/g, '');
                              const newAmount = parseInt(digits || '0', 10) / 100;
                              setSupplierPayments(prev => prev.map(s => {
                                if (s.supplier_id !== sp.supplier_id) return s;
                                const updatedDates = s.payment_method === 'credito'
                                  ? s.installment_dates.map(d => ({ ...d, amount: newAmount / (s.installments || 1) }))
                                  : [{ date: s.installment_dates[0]?.date || s.payment_date, amount: newAmount }];
                                return { ...s, amount: newAmount, installment_dates: updatedDates };
                              }));
                            }}
                            placeholder="R$ 0,00"
                          />
                        </div>
                      )}
                      {isOpOnly && (
                        <span className="text-xs text-muted-foreground italic">Pagamento direto ao fornecedor</span>
                      )}
                    </div>
                    {!isOpOnly && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-4">
                            <Label className="text-xs">Descrição</Label>
                            <Input value={sp.description} onChange={e => setSupplierPayments(prev => prev.map(s => s.supplier_id === sp.supplier_id ? { ...s, description: e.target.value } : s))} placeholder="Pagamento de operadoras" />
                          </div>
                          <div>
                            <Label className="text-xs">Forma de Pagamento</Label>
                            <Select value={sp.payment_method} onValueChange={v => updateSupplierPayment(sp.supplier_id, 'payment_method', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">Pix</SelectItem>
                                <SelectItem value="faturado">Faturado</SelectItem>
                                <SelectItem value="credito">Cartão de Crédito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Centro de Custo</Label>
                            <Select value={sp.cost_center_id || 'none'} onValueChange={v => {
                              const val = v === 'none' ? undefined : v;
                              setSupplierPayments(prev => prev.map(s => s.supplier_id === sp.supplier_id ? { ...s, cost_center_id: val } : s));
                              if (val) { try { localStorage.setItem(`supplier_cc_${sp.supplier_id}`, val); } catch {} }
                            }}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          {sp.payment_method === 'pix' && (
                            <div>
                              <Label className="text-xs">Data do Pagamento</Label>
                              <Input
                                type="date"
                                value={sp.payment_date}
                                onChange={e => {
                                  const newDate = e.target.value;
                                  setSupplierPayments(prev => prev.map(s =>
                                    s.supplier_id === sp.supplier_id
                                      ? { ...s, payment_date: newDate, installment_dates: [{ date: newDate, amount: s.amount }] }
                                      : s
                                  ));
                                }}
                              />
                            </div>
                          )}

                          {sp.payment_method === 'faturado' && (
                            <div>
                              <Label className="text-xs">Data de Vencimento</Label>
                              <Input
                                type="date"
                                value={sp.installment_dates[0]?.date || sp.payment_date}
                                onChange={e => {
                                  updateSupplierPayment(sp.supplier_id, 'payment_date', e.target.value);
                                  setSupplierPayments(prev => prev.map(s =>
                                    s.supplier_id === sp.supplier_id
                                      ? { ...s, installment_dates: [{ date: e.target.value, amount: s.amount }] }
                                      : s
                                  ));
                                }}
                              />
                            </div>
                          )}

                          {sp.payment_method === 'credito' && (
                            <div>
                              <Label className="text-xs">Nº de Parcelas</Label>
                              <Select value={String(sp.installments)} onValueChange={v => updateSupplierPayment(sp.supplier_id, 'installments', parseInt(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {sp.payment_method === 'credito' && sp.installment_dates.length > 0 && (
                          <div className="border-t pt-3">
                            <Label className="text-xs text-muted-foreground mb-2 block">Parcelas</Label>
                            <div className="space-y-2">
                              {sp.installment_dates.map((inst, idx) => (
                                <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                                  <p className="text-sm font-medium">{idx + 1}ª parcela</p>
                                  <Input
                                    type="date"
                                    value={inst.date}
                                    onChange={e => updateSupplierInstallmentDate(sp.supplier_id, idx, e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                  <p className="text-sm text-right">{fmt(inst.amount)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {selectedSupplierIds.length === 0 && (!sellerId || sellerId === 'none' || allSellers.find(s => s.id === sellerId)?.commission_type === 'none') && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum fornecedor ou comissão configurada</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader><CardTitle className="text-base">{isQuoteMode ? 'Resumo da Cotação' : 'Resumo Financeiro'}</CardTitle></CardHeader>
          <CardContent>
            {isQuoteMode && quoteOptions.length > 1 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Totais por Opção:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {quoteOptions.map((opt, oi) => {
                    const optionId = opt.id || String(oi);
                    const optItems = items.filter(it => (it.quote_option_id || String(quoteOptions[0]?.order_index ?? 0)) === optionId);
                    const optTotal = optItems.reduce((s, i) => s + i.total_value, 0) + saleInterest + operatorTaxes;
                    return (
                      <div key={oi} className="border rounded-lg p-3 bg-background">
                        <p className="text-xs font-semibold text-muted-foreground">{opt.name}</p>
                        <p className="text-lg font-bold text-primary">{fmt(optTotal)}</p>
                        <p className="text-xs text-muted-foreground">{optItems.length} serviço(s)</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{isQuoteMode ? 'Total Geral (todos)' : 'Total da Venda'}</p>
                <p className="text-xl font-bold">{fmt(totalSaleWithInterest)}</p>
                {(saleInterest > 0 || operatorTaxes > 0) && <p className="text-xs text-muted-foreground">(Serviços: {fmt(totalSale)}{operatorTaxes > 0 ? ` + Taxas: ${fmt(operatorTaxes)}` : ''}{saleInterest > 0 ? ` + Juros: ${fmt(saleInterest)}` : ''})</p>}
              </div>
              <div><p className="text-sm text-muted-foreground">Total Custo Fornecedor</p><p className="text-xl font-bold">{fmt(totalCost)}</p></div>
              <div><p className="text-sm text-muted-foreground">Lucro Bruto</p><p className="text-xl font-bold text-primary">{fmt(grossProfit)}</p></div>
              {!isQuoteMode && (
                <>
                  {machineFee > 0 && (
                    <div><p className="text-sm text-muted-foreground">Taxa Cartão ({cardFeePercent.toFixed(2)}%)</p><p className="text-lg font-semibold text-destructive">{fmt(machineFee)}</p></div>
                  )}
                  {commissionValue > 0 && (
                    <div><p className="text-sm text-muted-foreground">Comissão ({commissionRate}%)</p><p className="text-lg font-semibold">{fmt(commissionValue)}</p></div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Líquido Final</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netProfit)}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          {/* TAB: Documentos */}
          <TabsContent value="documentos" className="space-y-4">

        {/* Invoice Upload - only in sale mode */}
        {!isQuoteMode && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Nota Fiscal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {editSaleId && (
              <Button
                className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => navigate('/nfse/emit', { state: { saleId: editSaleId } })}
              >
                <Send className="h-4 w-4" /> Emitir NFS-e
              </Button>
            )}
            <div>
              <Label className="text-sm">Enviar PDF da Nota Fiscal</Label>
              <Input type="file" accept="application/pdf" onChange={handleInvoiceUpload} disabled={uploadingInvoice} />
              {uploadingInvoice && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
            </div>
            {invoiceUrl && (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline hover:text-primary/80 truncate flex items-center gap-1">
                  {invoiceFileName || 'nota-fiscal.pdf'}<ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 ml-auto" onClick={() => { setInvoiceUrl(''); setInvoiceFileName(''); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Contracts Section */}
        {!isQuoteMode && editSaleId && (
          <ContractSection
            saleId={editSaleId}
            empresaId={activeCompany?.id || ''}
            clientName={clientName}
            clientEmail={passengers.find(p => p.is_main)?.email || passengers[0]?.email || ''}
            clientPhone={passengers.find(p => p.is_main)?.phone || passengers[0]?.phone || ''}
            clientCpf={(() => {
              const mainP = passengers.find(p => p.is_main) || passengers[0];
              if (!mainP) return '';
              if (mainP.document_type === 'cpf') return mainP.document_number || '';
              const cpfPassenger = passengers.find(p => p.document_type === 'cpf');
              return cpfPassenger?.document_number || '';
            })()}
            destination={destinationName}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            totalValue={totalSale}
            paymentMethod={paymentMethods.join(', ')}
            sellerName={allSellers.find(s => s.id === sellerId)?.full_name}
            passengersCount={passengersCount}
            saleWorkflowStatus={saleWorkflowStatus}
            onWorkflowStatusChange={(newStatus) => setSaleWorkflowStatus(newStatus)}
          />
        )}

        {/* Notes + Internal Files - below contracts */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isQuoteMode ? 'Observações da Cotação' : 'Observação da Venda'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações internas sobre a venda..." rows={4} className="min-h-[80px]" />
            <div className="border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-2 mb-2"><Paperclip className="h-4 w-4" />Arquivos Internos</Label>
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/50 w-fit">
                <Upload className="h-4 w-4" />
                {uploadingFile ? 'Enviando...' : 'Adicionar arquivos'}
                <input type="file" multiple className="hidden" onChange={handleInternalFileUpload} disabled={uploadingFile} />
              </label>
              {internalFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {internalFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline hover:text-primary/80 truncate flex items-center gap-1">
                        {f.file_name}<ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 ml-auto" onClick={() => removeInternalFile(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>



        {/* Client Proposal Choices */}
        {clientChoices.length > 0 && (
          <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Escolhas do Cliente ({clientChoices.length} envio{clientChoices.length > 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientChoices.map((choice: any, cIdx: number) => {
                const selectedItemIds = choice.selected_item_ids as string[];
                const chosenItems = items.filter(item => selectedItemIds.includes(item.id || ''));
                return (
                  <div key={cIdx} className="rounded-lg border border-emerald-200 bg-white dark:bg-background p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        Enviado em {new Date(choice.submitted_at).toLocaleString('pt-BR')}
                      </span>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {fmt(choice.total_value)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {chosenItems.length > 0 ? chosenItems.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-600">✓</span>
                          <span className="text-foreground">{(item.metadata as any)?.hotel?.hotelName || (item.metadata as any)?.hotelName || item.description}</span>
                          <span className="text-muted-foreground ml-auto tabular-nums">{fmt(item.total_value)}</span>
                        </div>
                      )) : (
                        <p className="text-xs text-muted-foreground">IDs selecionados: {selectedItemIds.join(', ')}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-2 pb-8">
           <Button variant="destructive" onClick={handleCancel} className="w-full sm:w-auto">Cancelar</Button>
          {editSaleId && (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto"><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
          )}
          {saleStatus === 'active' ? (
            <>
              <Button variant="outline" onClick={handleExportServicesVoucher} className="w-full sm:w-auto"><Download className="h-4 w-4 mr-1" /> Voucher Servicos</Button>
              <Button variant="outline" onClick={handleExportAirlineVoucher} className="w-full sm:w-auto"><Plane className="h-4 w-4 mr-1" /> Voucher Aereo</Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleExportDraftPdf} className="w-full sm:w-auto"><Download className="h-4 w-4 mr-1" /> Gerar PDF Cotação (F8)</Button>
          )}
          {editSaleId && (
            <Button variant="outline" onClick={handleGenerateLink} className="w-full sm:w-auto"><Link2 className="h-4 w-4 mr-1" /> Gerar Link Proposta (F9)</Button>
          )}
          {editSaleId && isQuoteMode && (
            <Button variant="outline" onClick={handleGenerateClientBuildsLink} className="w-full sm:w-auto"><Sparkles className="h-4 w-4 mr-1" /> Cliente Monta Proposta</Button>
          )}
          {isQuoteMode && (
            <Button variant="secondary" onClick={handleSaveDraft} disabled={savingDraft} className="w-full sm:w-auto">
              {savingDraft ? (<><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" /> Salvando...</>) : 'Salvar Cotação (F10)'}
            </Button>
          )}
          <Button onClick={handleSave} className={`w-full sm:w-auto ${isQuoteMode ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
            {saleStatus === 'active' ? 'Salvar Venda (F10)' : (
              <><ShieldCheck className="h-4 w-4 mr-1" /> Converter em Venda (F11)</>
            )}
          </Button>
        </div>

        {/* Edit Confirmation Dialog */}
        <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Editar Venda</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja alterar os dados desta venda? Os lançamentos financeiros (contas a receber, contas a pagar e comissões) serão regenerados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={doSave}>Confirmar Edição</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {saleStatus === 'active' ? 'Venda' : 'Cotação'}</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir? Todos os dados relacionados (serviços, financeiro, passageiros, reservas) serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSale} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!askAddClientAsPassenger} onOpenChange={(open) => { if (!open) setAskAddClientAsPassenger(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar como passageiro?</AlertDialogTitle>
              <AlertDialogDescription>
                O cliente <strong>{askAddClientAsPassenger?.full_name}</strong> está cadastrado. Deseja adicioná-lo como passageiro da reserva com os dados já preenchidos?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (askAddClientAsPassenger) addClientAsPassenger(askAddClientAsPassenger); setAskAddClientAsPassenger(null); }}>Sim, adicionar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PdfImportModal
          open={pdfImportOpen}
          onClose={() => setPdfImportOpen(false)}
          serviceCatalog={serviceCatalog}
          marginMode="none"
          marginPercent={20}
          onImport={({ items: importedItems, tripInfo, quoteOptions: importedQuoteOptions, paymentTerms, generalNotes }) => {
            const importBatchId = Date.now();
            const mappedOptions = importedQuoteOptions.map((option, index) => ({
              id: `imported-option-${importBatchId}-${index}`,
              name: option.title,
              order_index: index,
            }));
            const optionIdMap = new Map(mappedOptions.map((option, index) => [String(index), option.id]));

            if (mappedOptions.length > 1) {
              setQuoteOptions(prev => {
                const shouldReplaceDefault = items.length === 0 && prev.length === 1 && !prev[0]?.id;
                if (shouldReplaceDefault) return mappedOptions;
                return [...prev, ...mappedOptions.map((option, index) => ({ ...option, order_index: prev.length + index }))];
              });
            }

            setItems(prev => [...prev, ...importedItems.map(item => ({
              description: item.description,
              cost_price: item.cost_price,
              rav: item.rav,
              markup_percent: 0,
              total_value: item.total_value,
              service_catalog_id: item.service_catalog_id,
              cost_center_id: item.cost_center_id,
              metadata: item.metadata || {},
              quote_option_id: mappedOptions.length > 1 ? optionIdMap.get(item.quote_option_id || '0') : item.quote_option_id,
            }))]);

            if (!clientName.trim() && tripInfo.client_name && tripInfo.client_name.toLowerCase() !== 'não informado') setClientName(tripInfo.client_name);
            if (tripInfo.destination) setDestinationName(tripInfo.destination);
            if (tripInfo.departure_date) setTripStartDate(tripInfo.departure_date);
            if (tripInfo.return_date) setTripEndDate(tripInfo.return_date);
            if (tripInfo.passengers) setPassengersCount(Number(tripInfo.passengers) || 1);
            setNightsManuallySet(false);

            if (paymentTerms.length > 0) {
              setProposalPaymentOptions(prev => [
                ...prev.filter(option => !option.method.startsWith('pdf_import_')),
                ...paymentTerms.map((term, index) => ({
                  method: `pdf_import_${index}`,
                  label: term.notes ? `${term.label} — ${term.notes}` : term.label,
                  installments: Math.max(1, Number(term.installments) || 1),
                  discountPercent: 0,
                  enabled: true,
                })),
              ]);
            }

            if (generalNotes) {
              setNotes(prev => prev ? `${prev}\n\n${generalNotes}` : generalNotes);
            }

            toast.success(`${importedItems.length} serviço(s) importados do PDF!`);
          }}
        />

        <QuickClientModal
          open={quickClientOpen}
          onClose={() => setQuickClientOpen(false)}
          initialName={clientName}
          onClientCreated={(client) => { setClientName(client.full_name); fetchClients(); }}
        />

        {editingItemIdx !== null && (
          <ServiceEditModal
            open={editingItemIdx !== null}
            onClose={() => setEditingItemIdx(null)}
            description={items[editingItemIdx]?.description || ''}
            metadata={items[editingItemIdx]?.metadata || {}}
            onSave={(desc, meta) => {
              setItems(prev => {
                const editedItem = prev[editingItemIdx];
                const updated = prev.map((item, i) => {
                  if (i === editingItemIdx) {
                    return { ...item, description: desc, metadata: meta };
                  }
                  return item;
                });
                if (editedItem?.service_catalog_id) {
                  return updated.filter((item, i) => {
                    if (i === editingItemIdx) return true;
                    if (item.service_catalog_id === editedItem.service_catalog_id && (!item.metadata?.type && meta.type)) {
                      return false;
                    }
                    return true;
                  });
                }
                return updated;
              });
              // Auto-save after service detail save (preserve status for active sales)
              if (saleStatus !== 'active') {
                setTimeout(() => handleSilentSaveDraft(), 300);
              }
            }}
            onHotelImagesFound={(images) => {
              setItemImages(prev => ({
                ...prev,
                [editingItemIdx]: [...(prev[editingItemIdx] || []), ...images],
              }));
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
