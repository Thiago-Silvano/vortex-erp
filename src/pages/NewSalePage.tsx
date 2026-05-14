import React, { useState, useEffect, useMemo, useRef } from 'react';
import ImagePositionEditor, { ImagePositionConfig } from '@/components/ImagePositionEditor';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import NfseModulo from '@/components/fiscal/NfseModulo';
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
import { TableLoadingRow } from '@/components/TableLoadingRow';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Upload, FileText, ExternalLink, FileUp, ChevronsUpDown, Download, Link2, ImagePlus, X, Edit, Paperclip, GripVertical, ArrowUp, ArrowDown, Sparkles, Loader2, ShieldCheck, FileEdit, Move, Search, Send, Plane, UserPen, Copy, FileCheck, Clock, ChevronDown, ChevronUp, BedDouble, Car, Ship, MapPin, Briefcase, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateVoucherPdf, VoucherPdfData } from '@/lib/generateVoucherPdf';
import { generateEditorialPdf, generateEditorialPdfAsync, PremiumPdfData } from '@/lib/generateEditorialPdf';
import { generateAirlineVoucherPdf, AirlineVoucherData, AirlineVoucherPassenger, AdditionalAirService } from '@/lib/generateAirlineVoucherPdf';
import PdfImportModal from '@/components/PdfImportModal';
import QuickClientModal from '@/components/QuickClientModal';
import ServiceEditModal, { ServiceMetadata } from '@/components/ServiceEditModal';
import { useRobotImport } from '@/hooks/useRobotImport';
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
  display_mode?: 'individual' | 'total';
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
  seat: string;
  baggage_personal_item: number;
  baggage_carry_on: number;
  baggage_checked: number;
}

interface SupplierOption { id: string; name: string; }
interface SellerOption { id: string; full_name: string; commission_type?: string; commission_percentage?: number; commission_base?: string; }
interface FinancialCost {
  description: string;
  value: number;
  cost_center_id?: string;
  seller_id?: string;
  commission_percent?: number;
}
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
  fixedValue?: number;
  showPerPerson?: boolean;
  highlighted?: boolean;
  /** ID da opção da cotação a que esta forma de pagamento se aplica.
   *  null/undefined = aplica-se a todas as opções (modo "Geral"). */
  quote_option_id?: string | null;
}
interface InternalFile { id?: string; file_name: string; file_url: string; }

export default function NewSalePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const quoteData = (location.state as any)?.quoteData;
  const initialEditSaleId = (location.state as any)?.editSaleId;
  const prefillClientId = (location.state as any)?.prefillClientId;
  const prefillClientName = (location.state as any)?.prefillClientName;
  const [editSaleId, setEditSaleId] = useState<string | undefined>(initialEditSaleId);
  const [loading, setLoading] = useState(true);

  const [quoteId, setQuoteId] = useState(quoteData?.id || '');
  const [clientName, setClientName] = useState(quoteData?.clientName || prefillClientName || '');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(prefillClientId || null);
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
  const [allAirlines, setAllAirlines] = useState<{ id: string; name: string }[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [addingSupplierId, setAddingSupplierId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogOption[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([{ name: 'Opção 1', order_index: 0, display_mode: 'total' }]);
  const [activeOptionId, setActiveOptionId] = useState<string>('');

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
  const [commissionSurcharge, setCommissionSurcharge] = useState(0);
  const [commissionSurchargeMethod, setCommissionSurchargeMethod] = useState<string>('pix');
  const [commissionSurchargeDate, setCommissionSurchargeDate] = useState<string>('');
  const [commissionRate, setCommissionRate] = useState(0);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [defaultCostCenterId, setDefaultCostCenterId] = useState<string>('');
  // Auto-default cost center for client sales. All sales should be tied to this center.
  useEffect(() => {
    if (!defaultCostCenterId && costCenters.length > 0) {
      const vc = costCenters.find(c => c.name?.toLowerCase() === 'venda ao cliente');
      if (vc) setDefaultCostCenterId(vc.id);
    }
  }, [costCenters, defaultCostCenterId]);
  // Auto-fill commission surcharge date with sale date (à vista)
  useEffect(() => {
    if (commissionSurcharge > 0 && !commissionSurchargeDate && saleDate) {
      setCommissionSurchargeDate(saleDate);
    }
  }, [commissionSurcharge, commissionSurchargeDate, saleDate]);
  const [allSellers, setAllSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState<string>(quoteData?.sellerId || '');
  const [financialCosts, setFinancialCosts] = useState<FinancialCost[]>([]);

  const [ecRates, setEcRates] = useState<CardRateEntry[]>([]);
  const [linkRates, setLinkRates] = useState<CardRateEntry[]>([]);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [commissionInvoiceStatus, setCommissionInvoiceStatus] = useState<string | null>(null);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [forceImportOptionId, setForceImportOptionId] = useState<string | null>(null);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [passengerClientResults, setPassengerClientResults] = useState<ClientOption[]>([]);
  const [passengerSearchLoading, setPassengerSearchLoading] = useState(false);
  const [destinationImageUrl, setDestinationImageUrl] = useState('');
  const [destinationImageConfig, setDestinationImageConfig] = useState<ImagePositionConfig | null>(null);
  const [imagePositionEditorOpen, setImagePositionEditorOpen] = useState(false);
  const [itemImages, setItemImages] = useState<Record<number, string[]>>({});
  const [uploadingItemImages, setUploadingItemImages] = useState<Record<number, boolean>>({});
  // URLs de imagens enviadas/incluídas durante esta venda (precisam ser salvas na biblioteca)
  const [newImageUrls, setNewImageUrls] = useState<Record<number, Set<string>>>({});
  // Estado da busca na biblioteca de imagens por item
  const [librarySearch, setLibrarySearch] = useState<Record<number, string>>({});
  const [libraryResults, setLibraryResults] = useState<Record<number, any[]>>({});
  const [libraryLoading, setLibraryLoading] = useState<Record<number, boolean>>({});
  // Biblioteca para imagem do destino
  const [destLibraryOpen, setDestLibraryOpen] = useState(false);
  const [destLibrarySearch, setDestLibrarySearch] = useState('');
  const [destLibraryResults, setDestLibraryResults] = useState<any[]>([]);
  const [destLibraryLoading, setDestLibraryLoading] = useState(false);
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
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [searchingItemImages, setSearchingItemImages] = useState<Record<number, boolean>>({});
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const itemImagePointerRef = useRef<{ itemIdx: number; imgIdx: number; startX: number; startY: number } | null>(null);
  const suppressItemImageClickRef = useRef(false);
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
  const [showIndividualValues, setShowIndividualValues] = useState(false);
  const [showPerPassenger, setShowPerPassenger] = useState(false);
  const [showOnlyTotal, setShowOnlyTotal] = useState(false);
  const [paymentOptionTab, setPaymentOptionTab] = useState<string>('__geral__');
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
    // Resolve client ID from name
    if (sale.client_name) {
      const { data: foundClient } = await supabase.from('clients').select('id').eq('full_name', sale.client_name).eq('empresa_id', activeCompany?.id).limit(1).single();
      if (foundClient) setSelectedClientId(foundClient.id);
    }
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
    setCommissionSurcharge(Number((sale as any).commission_surcharge) || 0);
    setCommissionSurchargeMethod((sale as any).commission_surcharge_method || 'pix');
    setCommissionSurchargeDate((sale as any).commission_surcharge_date || '');
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
    setCommissionInvoiceStatus((sale as any).commission_invoice_status || null);
    setDestinationImageUrl((sale as any).destination_image_url || '');
    setDestinationImageConfig((sale as any).destination_image_config || null);
    setDefaultCostCenterId((sale as any).default_cost_center_id || '');
    if (Array.isArray((sale as any).financial_costs)) {
      setFinancialCosts(((sale as any).financial_costs as any[]).map((f: any) => ({
        description: f.description || '',
        value: Number(f.value) || 0,
        cost_center_id: f.cost_center_id || undefined,
        seller_id: f.seller_id || undefined,
        commission_percent: f.commission_percent != null ? Number(f.commission_percent) : undefined,
      })));
    }
    // Load proposal payment options
    if ((sale as any).proposal_payment_options && Array.isArray((sale as any).proposal_payment_options)) {
      setProposalPaymentOptions((sale as any).proposal_payment_options.map((o: any) => ({
        method: o.method,
        label: o.label,
        installments: o.installments || 1,
        discountPercent: o.discountPercent ?? 0,
        enabled: o.enabled !== false,
        fixedValue: o.fixedValue || undefined,
        showPerPerson: o.showPerPerson || false,
        highlighted: o.highlighted || false,
        quote_option_id: o.quote_option_id ?? null,
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
      eticket_number: p.eticket_number || '', seat: p.seat || '',
      baggage_personal_item: p.baggage_personal_item ?? 0,
      baggage_carry_on: p.baggage_carry_on ?? 0,
      baggage_checked: p.baggage_checked ?? 0,
    })));

    // Load internal files
    const { data: files } = await (supabase.from('sale_internal_files' as any) as any).select('*').eq('sale_id', id).order('created_at');
    if (files) setInternalFiles(files.map((f: any) => ({ id: f.id, file_name: f.file_name, file_url: f.file_url })));

    // Load quote options
    const { data: options } = await (supabase.from('sale_quote_options' as any) as any).select('*').eq('sale_id', id).order('order_index');
    if (options && options.length > 0) {
      setQuoteOptions(options.map((o: any) => ({ id: o.id, name: o.name, order_index: o.order_index, display_mode: (o.display_mode === 'individual' ? 'individual' : 'total') })));
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

  const normalizeClientSearch = (value: string = '') =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const clientMatchesPassengerSearch = (client: ClientOption, term: string) => {
    const terms = normalizeClientSearch(term).split(/\s+/).filter(Boolean);
    const searchable = normalizeClientSearch(`${client.full_name || ''} ${client.cpf || ''}`);
    return terms.length > 0 && terms.every(t => searchable.includes(t));
  };

  const searchPassengerClients = async (term: string) => {
    if (!activeCompany?.id || term.trim().length < 2) {
      setPassengerClientResults([]);
      return;
    }

    const normalizedTerms = normalizeClientSearch(term).split(/\s+/).filter(Boolean);
    const digits = term.replace(/\D/g, '');

    setPassengerSearchLoading(true);
    let query = supabase
      .from('clients')
      .select('id, full_name, cpf, email, phone, birth_date, passport_number, passport_expiry_date')
      .eq('empresa_id', activeCompany.id)
      .order('full_name')
      .limit(50);

    if (digits.length >= 2) {
      query = query.or(`full_name.ilike.%${term.trim()}%,cpf.ilike.%${digits}%`);
    } else {
      normalizedTerms.forEach(searchTerm => {
        query = query.ilike('full_name', `%${searchTerm}%`);
      });
    }

    const { data, error } = await query;

    if (!error && data) {
      setPassengerClientResults((data as ClientOption[]).filter(c => clientMatchesPassengerSearch(c, term)).slice(0, 15));
    } else {
      setPassengerClientResults([]);
    }
    setPassengerSearchLoading(false);
  };

  useEffect(() => {
    fetchClients();
    supabase.from('suppliers').select('id, name').order('name').then(({ data }) => { if (data) setAllSuppliers(data); });
    (supabase.from('airlines' as any).select('id, name') as any).order('name').then(({ data }: any) => { if (data) setAllAirlines(data); });
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
    if (passengerSearchOpen === null || passengerSearchTerm.trim().length < 2) {
      setPassengerClientResults([]);
      setPassengerSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      searchPassengerClients(passengerSearchTerm);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [passengerSearchTerm, passengerSearchOpen, activeCompany?.id]);

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

  // Consume payload coming from "Roteiro Premium → Enviar para Cotação"
  useEffect(() => {
    if (editSaleId) return;
    const params = new URLSearchParams(location.search);
    if (params.get('origem') !== 'roteiro') return;
    const raw = localStorage.getItem('roteiro_para_cotacao');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      const dados = payload?.dadosCotacao || {};
      if (dados.clienteNomeSugerido) setClientName(dados.clienteNomeSugerido);
      if (dados.tituloCotacao) setQuoteTitle(dados.tituloCotacao);
      if (dados.nomeDestino) setDestinationName(dados.nomeDestino);
      if (dados.inicioViagem) setTripStartDate(dados.inicioViagem);
      if (dados.finalViagem) setTripEndDate(dados.finalViagem);
      if (typeof dados.numNoites === 'number' && dados.numNoites > 0) {
        setTripNights(dados.numNoites);
        setNightsManuallySet(true);
      }
      if (typeof dados.numPassageiros === 'number' && dados.numPassageiros > 0) {
        setPassengersCount(dados.numPassageiros);
      }
      const servicos: any[] = Array.isArray(payload?.servicos) ? payload.servicos : [];
      if (servicos.length > 0) {
        const mapped: SaleItem[] = servicos.map((s: any) => ({
          description: s.descricaoResumida || s.descricaoDetalhada || 'Item do roteiro',
          cost_price: Number(s.custo) || 0,
          rav: Number(s.rav) || 0,
          markup_percent: 0,
          total_value: Number(s.total) || (Number(s.custo) || 0) + (Number(s.rav) || 0),
        }));
        setItems(prev => (prev.length === 0 ? mapped : [...prev, ...mapped]));
      }
      // Limpa o payload para não reaproveitar em próximas navegações
      localStorage.removeItem('roteiro_para_cotacao');
      // Remove o query param para não reprocessar em re-render
      navigate('/sales/new', { replace: true });
      toast.success(`${servicos.length} item(ns) importados do roteiro`);
    } catch (err) {
      console.error('Falha ao importar payload do roteiro:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const totalSaleWithInterest = totalSale + saleInterest + operatorTaxes + commissionSurcharge;
  const totalCost = useMemo(() => items.reduce((s, i) => s + i.cost_price, 0), [items]);
  const grossProfit = totalSale + saleInterest + commissionSurcharge - totalCost;
  const commissionValue = grossProfit * (commissionRate / 100);
  const cardFeeValue = machineFee;
  const cardFeePercent = totalSaleWithInterest > 0 ? (machineFee / totalSaleWithInterest) * 100 : 0;
  const financialCostsTotal = useMemo(
    () => financialCosts.reduce((s, f) => s + (Number(f.value) || 0), 0),
    [financialCosts]
  );
  const financialCostsCommissionTotal = useMemo(
    () => financialCosts.reduce((s, f) => {
      const pct = Number(f.commission_percent) || 0;
      const val = Number(f.value) || 0;
      return s + (val * pct / 100);
    }, 0),
    [financialCosts]
  );
  const netProfit = grossProfit - commissionValue - machineFee - financialCostsTotal - financialCostsCommissionTotal;

  // No longer need auto-recalculate since we store only discount % now

  useEffect(() => {
    const baseDate = new Date(saleDate || new Date());

    // Receivables ALWAYS represent only the agency's RAV/commission (gross profit),
    // regardless of payment method. The supplier cost is tracked separately in
    // "Controle de Pagamentos". Subtract the commission surcharge so it becomes
    // its own dedicated installment below.
    const baseAmount = Math.max(0, grossProfit - commissionSurcharge);

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
            recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: 'Pgto Operadora/Consolidadora', cost_center_id: defaultCostCenterId || undefined });
          }
        } else if (method === 'boleto') {
          const boletoInst = getInstallments('boleto');
          if (boletoInst > 1 && boletoInterestRate > 0) {
            const monthlyRate = boletoInterestRate / 100;
            const pmt = methodAmount * (monthlyRate * Math.pow(1 + monthlyRate, boletoInst)) / (Math.pow(1 + monthlyRate, boletoInst) - 1);
            for (let i = 1; i <= boletoInst; i++) {
              const dueDate = new Date(baseDate);
              dueDate.setMonth(dueDate.getMonth() + i);
              recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(pmt * 100) / 100, payment_method: 'Boleto', cost_center_id: defaultCostCenterId || undefined });
            }
          } else {
            const numInst = boletoInst > 0 ? boletoInst : 1;
            const perInstallment = methodAmount / numInst;
            for (let i = 1; i <= numInst; i++) {
              const dueDate = new Date(baseDate);
              if (numInst > 1) dueDate.setMonth(dueDate.getMonth() + i);
              recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: 'Boleto', cost_center_id: defaultCostCenterId || undefined });
            }
          }
        } else if (method === 'credito') {
          const numInst = getInstallments('credito');
          const perInstallment = methodAmount / (numInst > 0 ? numInst : 1);
          for (let i = 1; i <= (numInst > 0 ? numInst : 1); i++) {
            const dueDate = new Date(baseDate);
            dueDate.setDate(dueDate.getDate() + i * 30);
            recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: 'Cartão de Crédito', cost_center_id: defaultCostCenterId || undefined });
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
            recs.push({ installment_number: recIndex++, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100, payment_method: labelMap[method] || method, cost_center_id: defaultCostCenterId || undefined });
          }
        }
      }

      if (recs.length === 0) {
        recs.push({ installment_number: 1, due_date: saleDate || new Date().toISOString().split('T')[0], amount: baseAmount, cost_center_id: defaultCostCenterId || undefined });
      }

      // Append a dedicated receivable for the Acréscimo de Comissão (charged separately to the client)
      if (commissionSurcharge > 0) {
        const labelMap: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', boleto: 'Boleto', credito: 'Cartão de Crédito', debito: 'Cartão de Débito', transferencia: 'Transferência' };
        recs.push({
          installment_number: recIndex++,
          due_date: commissionSurchargeDate || saleDate || '',
          amount: Math.round(commissionSurcharge * 100) / 100,
          payment_method: labelMap[commissionSurchargeMethod] || 'Pix',
          cost_center_id: defaultCostCenterId || undefined,
        });
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
  }, [installmentsMap, paymentMethods, totalSaleWithInterest, grossProfit, boletoInterestRate, saleDate, hasCredito, hasBoleto, hasOperadora, defaultCostCenterId, commissionSurcharge, commissionSurchargeMethod, commissionSurchargeDate]);

  // Sync supplier payments when suppliers or totalCost change
  useEffect(() => {
    // Skip the first sync if we just loaded data from the database
    if (supplierPaymentsLoadedRef.current) {
      supplierPaymentsLoadedRef.current = false;
      return;
    }
    setSupplierPayments(prev => {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Controle de Pagamentos always reflects the FULL supplier cost of the sale,
      // regardless of payment method. Recebimento covers only the RAV/commission.
      const effectiveCost = totalCost;
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
  }, [selectedSupplierIds, totalCost, paymentMethods, totalSaleWithInterest, grossProfit, receivables]);

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
    if (paymentMethods.length > 0 && !machineFeeSupplierId && allSuppliers.length > 0) {
      const safra = allSuppliers.find(s => s.name.toLowerCase().includes('safra pay') || s.name.toLowerCase().includes('safrapay'));
      if (safra) setMachineFeeSupplierId(safra.id);
    }
  }, [paymentMethods, allSuppliers, machineFeeSupplierId]);

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

  // Importação de serviços vindos do Robô de Cotação (/cotacao/buscar-servicos)
  useRobotImport((mapped) => {
    const defaultOptIds = quoteOptions.length > 0
      ? [quoteOptions[0]?.id || String(quoteOptions[0]?.order_index ?? 0)]
      : [];
    setItems(prev => [
      ...prev,
      ...mapped.map(m => ({
        description: m.description,
        cost_price: m.cost_price,
        rav: m.rav,
        markup_percent: m.markup_percent,
        total_value: m.total_value,
        metadata: m.metadata,
        quote_option_id: defaultOptIds[0],
        quote_option_ids: defaultOptIds,
      })),
    ]);
  });

  const duplicateItem = (idx: number) => {
    const original = items[idx];
    const cloned: SaleItem = {
      description: original.description,
      cost_price: original.cost_price,
      rav: original.rav,
      markup_percent: original.markup_percent,
      total_value: original.total_value,
      service_catalog_id: original.service_catalog_id,
      cost_center_id: original.cost_center_id,
      metadata: original.metadata ? JSON.parse(JSON.stringify(original.metadata)) : {},
      reservation_number: original.reservation_number,
      purchase_number: original.purchase_number,
      quote_option_id: original.quote_option_id,
      quote_option_ids: original.quote_option_ids ? [...original.quote_option_ids] : undefined,
    };
    const newIdx = idx + 1;
    setItems(prev => [...prev.slice(0, newIdx), cloned, ...prev.slice(newIdx)]);
    // duplicate images too
    setItemImages(prev => {
      const newImgs: Record<number, string[]> = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k < newIdx) {
          newImgs[k] = prev[k];
        } else {
          newImgs[k + 1] = prev[k];
        }
      });
      if (prev[idx]) {
        newImgs[newIdx] = [...prev[idx]];
      }
      return newImgs;
    });
    toast.success('Item duplicado!');
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
      eticket_number: '', seat: '',
      baggage_personal_item: 1, baggage_carry_on: 1, baggage_checked: 1,
    }]);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('input[data-passenger-name]');
      const last = inputs[inputs.length - 1];
      last?.focus();
    }, 50);
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
        eticket_number: '', seat: '',
        baggage_personal_item: 1, baggage_carry_on: 1, baggage_checked: 1,
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

  const savePassengerAsClient = async (pax: Passenger) => {
    const fullName = `${pax.first_name} ${pax.last_name}`.trim().toUpperCase();
    if (!fullName) { toast.error('Informe nome e sobrenome do passageiro'); return; }
    if (!activeCompany?.id) { toast.error('Selecione uma empresa ativa'); return; }
    try {
      const cpfDigits = pax.document_type === 'cpf' ? (pax.document_number || '').replace(/\D/g, '') : '';
      const passportNum = pax.document_type === 'passaporte' ? (pax.document_number || '').trim() : '';

      // Duplicate check: same full name AND (same CPF OR same Passport)
      const { data: candidates } = await supabase.from('clients')
        .select('id, full_name, cpf, passport_number')
        .eq('empresa_id', activeCompany.id)
        .ilike('full_name', fullName);

      const existing = (candidates || []).find((c: any) => {
        const sameCpf = !!cpfDigits && (c.cpf || '').replace(/\D/g, '') === cpfDigits;
        const samePassport = !!passportNum && (c.passport_number || '').trim().toUpperCase() === passportNum.toUpperCase();
        return sameCpf || samePassport;
      });

      if (existing) {
        toast.info(`Cliente já cadastrado: ${existing.full_name}`);
        return;
      }
      const payload: any = {
        empresa_id: activeCompany.id,
        full_name: fullName,
        birth_date: pax.birth_date || null,
        cpf: cpfDigits || '',
        passport_number: passportNum || null,
        passport_expiry_date: pax.document_type === 'passaporte' ? (pax.document_expiry || null) : null,
        email: pax.email || null,
        phone: pax.phone || null,
      };
      const { error } = await supabase.from('clients').insert(payload);
      if (error) throw error;
      toast.success(`Cliente "${fullName}" cadastrado!`);
      const { data: refreshed } = await supabase.from('clients')
        .select('id, full_name, cpf, email, phone, birth_date, passport_number, passport_expiry_date')
        .eq('empresa_id', activeCompany.id).order('full_name');
      if (refreshed) setAllClients(refreshed as any);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar cliente');
    }
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
      setNewImageUrls(prev => {
        const set = new Set(prev[itemIdx] || []);
        newUrls.forEach(u => set.add(u));
        return { ...prev, [itemIdx]: set };
      });
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

  const reorderItemImage = (itemIdx: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setItemImages(prev => {
      const images = [...(prev[itemIdx] || [])];
      if (fromIdx < 0 || fromIdx >= images.length) return prev;
      const [moved] = images.splice(fromIdx, 1);
      const insertAt = Math.max(0, Math.min(images.length, toIdx));
      images.splice(insertAt, 0, moved);
      return { ...prev, [itemIdx]: images };
    });
  };

  const handleItemImagePointerDown = (itemIdx: number, imgIdx: number, e: React.PointerEvent<HTMLElement>) => {
    suppressItemImageClickRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    itemImagePointerRef.current = { itemIdx, imgIdx, startX: e.clientX, startY: e.clientY };
  };

  const handleItemImagePointerUp = (itemIdx: number, imgIdx: number, e: React.PointerEvent<HTMLElement>, url: string) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
    const pointer = itemImagePointerRef.current;
    itemImagePointerRef.current = null;
    if (!pointer || pointer.itemIdx !== itemIdx || pointer.imgIdx !== imgIdx) return;

    const deltaX = e.clientX - pointer.startX;
    const deltaY = e.clientY - pointer.startY;
    if (Math.abs(deltaX) > 24 && Math.abs(deltaX) > Math.abs(deltaY)) {
      suppressItemImageClickRef.current = true;
      moveItemImage(itemIdx, imgIdx, deltaX > 0 ? 'right' : 'left');
      return;
    }

    setPreviewImageUrl(url);
  };

  const handleItemImageClick = (url: string) => {
    if (suppressItemImageClickRef.current) {
      suppressItemImageClickRef.current = false;
      return;
    }
    setPreviewImageUrl(url);
  };

  const loadVoucherImageBase64 = async (url?: string): Promise<string | undefined> => {
    if (!url) return undefined;
    const absoluteUrl = new URL(url, window.location.origin).href;

    const normalizeToJpeg = (src: string): Promise<string | undefined> => new Promise(resolve => {
      const img = new Image();
      if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx || !canvas.width || !canvas.height) return resolve(undefined);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) {
          console.warn('[Voucher] Falha ao normalizar imagem:', e);
          resolve(src.startsWith('data:image/jpeg') || src.startsWith('data:image/png') ? src : undefined);
        }
      };
      img.onerror = () => resolve(src.startsWith('data:image/jpeg') || src.startsWith('data:image/png') ? src : undefined);
      img.src = src;
    });

    if (url.startsWith('data:')) return normalizeToJpeg(url);

    try {
      const { data, error } = await supabase.functions.invoke('proxy-image', { body: { url: absoluteUrl } });
      if (error) throw error;
      if (!data?.dataUrl) throw new Error('proxy returned no dataUrl');
      return (await normalizeToJpeg(data.dataUrl as string)) || data.dataUrl as string;
    } catch (err) {
      console.warn('[Voucher] proxy-image falhou, tentando fetch direto:', err);
      try {
        const resp = await fetch(absoluteUrl, { mode: 'cors' });
        if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        return (await normalizeToJpeg(dataUrl)) || dataUrl;
      } catch (fallbackErr) {
        console.warn('[Voucher] Falha ao carregar imagem da hospedagem:', fallbackErr);
        return undefined;
      }
    }
  };

  const handleSearchServiceImages = async (itemIdx: number) => {
    const item = items[itemIdx];
    const type = item.metadata?.type;
    setSearchingItemImages(prev => ({ ...prev, [itemIdx]: true }));
    try {
      // Aéreo: carregar imagem de capa da Cia Aérea principal
      if (type === 'aereo') {
        const airlineId = item.metadata?.airlineId || item.metadata?.flightLegs?.[0]?.airlineId;
        if (!airlineId) { toast.error('Selecione a Cia Aérea principal do voo primeiro'); return; }
        const { data: airline } = await (supabase.from('airlines' as any).select('cover_image_url, name').eq('id', airlineId).maybeSingle() as any);
        if (airline?.cover_image_url) {
          setItemImages(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), airline.cover_image_url] }));
          setNewImageUrls(prev => { const s = new Set(prev[itemIdx] || []); s.add(airline.cover_image_url); return { ...prev, [itemIdx]: s }; });
          toast.success(`Capa da ${airline.name} carregada!`);
        } else {
          toast.error('Esta Cia Aérea não possui imagem de capa cadastrada');
        }
        return;
      }
      // Hospedagem: buscar 10 imagens da gerência no TripAdvisor
      if (type === 'hotel') {
        const searchQuery = item.metadata?.hotel?.hotelName || item.description || '';
        if (!searchQuery.trim()) { toast.error('Preencha o nome do hotel primeiro'); return; }
        const { data, error } = await supabase.functions.invoke('search-tripadvisor-images', {
          body: { query: searchQuery.trim(), limit: 10 },
        });
        if (error) throw error;
        const imgs = (data?.images || []).map((i: any) => i.url_full || i.url_preview).filter(Boolean);
        if (imgs.length > 0) {
          setItemImages(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), ...imgs] }));
          setNewImageUrls(prev => { const s = new Set(prev[itemIdx] || []); imgs.forEach((u: string) => s.add(u)); return { ...prev, [itemIdx]: s }; });
          toast.success(`${imgs.length} imagem(ns) do TripAdvisor encontrada(s)!`);
        } else {
          toast.error('Nenhuma imagem encontrada no TripAdvisor');
        }
        return;
      }
      // Demais serviços: Google Places
      const searchQuery = item.description || '';
      if (!searchQuery.trim()) { toast.error('Preencha a descrição do serviço primeiro'); return; }
      if (!googleApiKey) { toast.error('Configure a Google Maps API Key em Configurações → Integrações'); return; }
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'search_photos', query: searchQuery.trim(), apiKey: googleApiKey },
      });
      if (error) throw error;
      if (data?.success && data.photos?.length > 0) {
        setItemImages(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), ...data.photos] }));
        setNewImageUrls(prev => { const s = new Set(prev[itemIdx] || []); data.photos.forEach((u: string) => s.add(u)); return { ...prev, [itemIdx]: s }; });
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

  const inferProductType = (item: any): 'cidade' | 'hospedagem' | 'servico' => {
    const t = item?.metadata?.type;
    if (t === 'hotel') return 'hospedagem';
    return 'servico';
  };

  const searchImageLibrary = async (itemIdx: number) => {
    const q = (librarySearch[itemIdx] || '').trim();
    if (!q) { toast.error('Digite o nome do produto'); return; }
    if (!activeCompany?.id) return;
    setLibraryLoading(prev => ({ ...prev, [itemIdx]: true }));
    try {
      const { data } = await (supabase.from('product_images' as any)
        .select('*')
        .eq('empresa_id', activeCompany.id)
        .or(`product_name.ilike.%${q}%,keywords.ilike.%${q}%`)
        .limit(50) as any);
      const imgs = (data || []) as any[];
      setLibraryResults(prev => ({ ...prev, [itemIdx]: imgs }));
      if (imgs.length === 0) toast.info('Nenhuma imagem encontrada na biblioteca');
    } finally {
      setLibraryLoading(prev => ({ ...prev, [itemIdx]: false }));
    }
  };

  const addLibraryImage = (itemIdx: number, url: string) => {
    setItemImages(prev => {
      const cur = prev[itemIdx] || [];
      if (cur.includes(url)) return prev;
      return { ...prev, [itemIdx]: [...cur, url] };
    });
    // imagens da biblioteca NÃO entram em newImageUrls (já existem)
    toast.success('Imagem adicionada');
  };

  const searchDestinationLibrary = async () => {
    if (!activeCompany?.id) return;
    const q = (destLibrarySearch || destinationName || '').trim();
    setDestLibraryLoading(true);
    try {
      let query: any = (supabase.from('product_images' as any) as any)
        .select('*').eq('empresa_id', activeCompany.id).eq('product_type', 'cidade');
      if (q) query = query.or(`product_name.ilike.%${q}%,keywords.ilike.%${q}%`);
      const { data } = await query.limit(60);
      setDestLibraryResults((data || []) as any[]);
    } finally { setDestLibraryLoading(false); }
  };

  const persistNewImagesToLibrary = async () => {
    if (!activeCompany?.id) return;
    const tasks: any[] = [];
    items.forEach((item, idx) => {
      const newSet = newImageUrls[idx];
      if (!newSet || newSet.size === 0) return;
      const productType = inferProductType(item);
      const productName = (item.metadata?.hotel?.hotelName || item.description || '').trim();
      if (!productName) return;
      newSet.forEach(url => {
        tasks.push({
          empresa_id: activeCompany.id,
          product_type: productType,
          product_name: productName,
          image_url: url,
        });
      });
    });
    if (tasks.length === 0) return;
    // upsert respeitando UNIQUE (empresa_id, product_type, product_name, image_url)
    await (supabase.from('product_images' as any)
      .upsert(tasks, { onConflict: 'empresa_id,product_type,product_name,image_url', ignoreDuplicates: true }) as any);
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
        commission_invoice_status: commissionInvoiceStatus,
        destination_image_url: destinationImageUrl || null,
        destination_image_config: destinationImageConfig || null,
        sale_interest: saleInterest,
        machine_fee: machineFee,
        machine_fee_supplier_id: machineFeeSupplierId || null,
        operator_taxes: operatorTaxes,
        commission_surcharge: commissionSurcharge,
        commission_surcharge_method: commissionSurchargeMethod,
        commission_surcharge_date: commissionSurchargeDate || null,
        passengers_count: passengersCount,
        trip_nights: tripNights,
        trip_start_date: tripStartDate || null,
        trip_end_date: tripEndDate || null,
        destination_name: destinationName || '',
        quote_title: quoteTitle || '',
        sale_workflow_status: saleWorkflowStatus,
        default_cost_center_id: defaultCostCenterId || null,
        financial_costs: financialCosts,
      } as any,
      userEmail,
    };
  };

  const saveSaleCore = async (salePayload: any, userEmail: string) => {
    let saleId = editSaleId;

    // Validate: every enabled custom payment option must have a non-empty label
    const invalidLabel = proposalPaymentOptions.find(o => o.enabled && (o.method.startsWith('custom_') || o.method.startsWith('pdf_import_')) && !(o.label || '').trim());
    if (invalidLabel) {
      toast.error('Preencha o título de todas as formas de pagamento personalizadas.');
      return null;
    }

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
          sale_id: saleId, name: opt.name, order_index: idx, display_mode: opt.display_mode || 'total',
        }))
      ).select('id, order_index');
      if (insertedOptions) {
        insertedOptions.forEach((o: any) => { optionIdMap[o.order_index] = o.id; });
      }
    }

    // Remap proposal_payment_options.quote_option_id → newly-inserted DB ids,
    // then re-save the sale row so the per-option payment configurations persist
    // across reloads (quote options are deleted+reinserted with fresh ids).
    if (Object.keys(optionIdMap).length > 0) {
      const remapped = proposalPaymentOptions.filter(o => o.enabled).map(o => {
        const oldId = o.quote_option_id;
        let newId: string | null = null;
        if (oldId) {
          const idx = quoteOptions.findIndex(q => q.id === oldId || String(q.order_index) === oldId);
          if (idx >= 0 && optionIdMap[idx]) newId = optionIdMap[idx];
          else if (optionIdMap[0]) newId = optionIdMap[0];
        } else if (optionIdMap[0]) {
          newId = optionIdMap[0];
        }
        return { ...o, quote_option_id: newId };
      });
      await supabase.from('sales').update({ proposal_payment_options: remapped } as any).eq('id', saleId);
      // Sync local state so the UI keeps showing the per-option configs without reload
      setQuoteOptions(prev => prev.map((q, i) => ({ ...q, id: optionIdMap[i] || q.id })));
      setProposalPaymentOptions(remapped);
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
        eticket_number: p.eticket_number || '', seat: p.seat || '',
        baggage_personal_item: p.baggage_personal_item ?? 0,
        baggage_carry_on: p.baggage_carry_on ?? 0,
        baggage_checked: p.baggage_checked ?? 0,
      })));
    }

    // Save internal files
    if (internalFiles.length > 0) {
      await (supabase.from('sale_internal_files' as any) as any).insert(
        internalFiles.map(f => ({ sale_id: saleId, file_name: f.file_name, file_url: f.file_url }))
      );
    }

    // Salvar novas imagens na biblioteca (deduplicado)
    try { await persistNewImagesToLibrary(); setNewImageUrls({}); } catch (e) { console.warn('Lib save', e); }

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
    // Supplier payables are ALWAYS generated using the full cost shown in
    // "Controle de Pagamentos", regardless of payment method.
    if (true) {
      if (supplierPayments.length > 0) {
        const payables: any[] = [];
        for (const sp of supplierPayments) {
          if (sp.amount <= 0) continue;
            // sp.amount is already the value the user entered/sees (Custo Ajustado for mixed-operadora is auto-applied in the sync effect).
            // Persist exactly what's on screen — do NOT re-apply the mixed ratio here.
            const adjustedAmount = Math.round(sp.amount * 100) / 100;
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
        const costPerSupplier = totalCost / selectedSupplierIds.length;
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
          commValue = grossProfit * (pct / 100);
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
    for (const [itemIdx, item] of items.entries()) {
      if (item.metadata?.type === 'hotel' && item.metadata.hotel) {
        const h = item.metadata.hotel;
        const selectedImages = itemImages[itemIdx]?.length ? itemImages[itemIdx] : h.images || [];
        const imageBase64 = selectedImages.length > 0 ? await loadVoucherImageBase64(selectedImages[0]) : undefined;
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
          checkInTime: h.checkInTime || '',
          checkOutTime: h.checkOutTime || '',
          roomCount: h.roomCount,
          guestCount: h.guestCount,
          city: h.city,
          country: h.country,
          category: h.category,
          observations: h.observations,
          address: h.address,
          tripadvisorRating: h.tripadvisorRating,
          tripadvisorReviewsCount: h.tripadvisorReviewsCount,
          tripadvisorRanking: h.tripadvisorRanking,
          tripadvisorBadges: h.tripadvisorBadges,
          tripadvisorTopReviews: h.tripadvisorTopReviews,
          tripadvisorRatingBreakdown: h.tripadvisorRatingBreakdown,
          tripadvisorPopularMentions: h.tripadvisorPopularMentions,
          imageBase64,
          images: selectedImages,
        });
      }
    }

    const hotelsWithoutImage = hotels.filter((h: any) => !h.imageBase64);
    if (hotels.length > 0 && hotelsWithoutImage.length > 0) {
      const names = hotelsWithoutImage.map((h: any) => h.name).filter(Boolean).join(', ');
      toast.error(`Selecione ao menos uma imagem para gerar o voucher${names ? `: ${names}` : '.'}`);
      return;
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

    // Get sale short_id and prefer the purchase number informed on the items for services vouchers
    let saleShortId = '';
    if (editSaleId) {
      const { data: saleData } = await (supabase.from('sales').select('short_id').eq('id', editSaleId).single() as any);
      if (saleData) saleShortId = saleData.short_id;
    }

    const firstPurchaseNumber = items.find(item => (item.purchase_number || '').trim())?.purchase_number?.trim();
    const voucherReference = firstPurchaseNumber || saleShortId;

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
      shortId: voucherReference,
      hideReference: isQuoteMode,
    };

    return { voucherData, logoBase64, shortId: saleShortId };
  };

  const handleExportServicesVoucher = async (appendTo?: any): Promise<any | null> => {
    const result = await prepareVoucherCommonData();
    if (!result) return null;
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

    const doc = generateVoucherPdf(voucherData, appendTo);
    if (!appendTo) {
      doc.save(`voucher-servicos-${clientName.replace(/\s+/g, '-').toLowerCase()}-${saleDate}.pdf`);
      toast.success('Voucher de servicos gerado com sucesso!');
    }
    return doc;
  };

  const handleExportAirlineVoucher = async (appendTo?: any): Promise<any | null> => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório para gerar o voucher'); return; }

    const airlineItems = items.filter(i => i.metadata?.type === 'aereo' && i.metadata?.flightLegs?.length);
    const additionalAirItems = items.filter(i => i.metadata?.type === 'adicional' && i.metadata?.isAirService);
    if (airlineItems.length === 0 && additionalAirItems.length === 0) {
      if (!appendTo) toast.error('Nenhum serviço aéreo encontrado nesta venda');
      return appendTo ?? null;
    }

    // Build additional air services
    const additionalServices: AdditionalAirService[] = additionalAirItems.map(ai => ({
      title: ai.description || 'Serviço Adicional',
      description: ai.metadata?.detailedDescription ? ai.metadata.detailedDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() : undefined,
      reservationNumber: ai.reservation_number || undefined,
    }));

    const result = await prepareVoucherCommonData();
    if (!result) return null;
    const { logoBase64, shortId } = result;

    // Load agency for footer
    let agency = { name: 'Agência de Viagens', whatsapp: '', email: '', website: '', logo_url: '' };
    const agQuery = activeCompany?.id
      ? supabase.from('agency_settings').select('*').eq('empresa_id', activeCompany.id).limit(1)
      : supabase.from('agency_settings').select('*').limit(1);
    const { data: agData } = await agQuery;
    if (agData && agData.length > 0) agency = agData[0] as any;

    // Merge ALL airline items into a single voucher (same page sequence until 18 legs)
    // Each item becomes a "group" with its own title + total value
    const allLegs: any[] = [];
    const allAirlineIds = new Set<string>();
    let principalAirlineId: string | undefined;
    for (const airItem of airlineItems) {
      const meta = airItem.metadata!;
      const legs = meta.flightLegs || [];
      allLegs.push(...legs);
      if (meta.airlineId) {
        allAirlineIds.add(meta.airlineId);
        if (!principalAirlineId) principalAirlineId = meta.airlineId;
      }
      legs.forEach((l: any) => { if (l.airlineId) allAirlineIds.add(l.airlineId); });
    }

    // Resolve principal airline name
    let airlineName = '';
    if (principalAirlineId) {
      const { data: airlineData } = await (supabase.from('airlines' as any).select('name').eq('id', principalAirlineId).maybeSingle() as any);
      if (airlineData) airlineName = airlineData.name || '';
    }

    // Build airline logo cache for all legs
    const airlineCache: Record<string, { name: string; logoBase64?: string }> = {};
    for (const aid of allAirlineIds) {
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
        seat: p.seat || undefined,
        baggage: {
          personalItem: p.baggage_personal_item ?? 0,
          carryOn: p.baggage_carry_on ?? 0,
          checkedBag: p.baggage_checked ?? 0,
        },
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

    // Aggregate detailed notes from all items
    const aggregatedNotes = airlineItems
      .map(ai => ai.metadata?.detailedDescription)
      .filter(Boolean)
      .map((n: string) => n.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
      .filter(Boolean)
      .join('\n\n');

    // Build groups (one per airline item) — gives each flight a visual title
    const flightGroups = airlineItems.map((airItem, idx) => {
      const meta = airItem.metadata!;
      const legs = (meta.flightLegs || []).map((l: any) => ({
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
        localizador: l.localizador || '',
        airlineLogoBase64: l.airlineId && airlineCache[l.airlineId] ? airlineCache[l.airlineId].logoBase64 : undefined,
        airlineName: l.airlineId && airlineCache[l.airlineId] ? airlineCache[l.airlineId].name : undefined,
      }));
      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1] || firstLeg;
      const route = firstLeg ? `${firstLeg.origin || ''} → ${lastLeg?.destination || ''}` : '';
      const baseTitle = airItem.description || `Voo ${idx + 1}`;
      const title = route ? `${baseTitle} • ${route}` : baseTitle;
      const sumBag = airPax.reduce(
        (acc, p) => ({
          personalItem: acc.personalItem + (p.baggage?.personalItem || 0),
          carryOn: acc.carryOn + (p.baggage?.carryOn || 0),
          checkedBag: acc.checkedBag + (p.baggage?.checkedBag || 0),
        }),
        { personalItem: 0, carryOn: 0, checkedBag: 0 },
      );
      const bag = (sumBag.personalItem || sumBag.carryOn || sumBag.checkedBag)
        ? sumBag
        : (airItem.metadata as any)?.baggage;
      return {
        title,
        totalValue: airItem.total_value,
        legs,
        localizador: airItem.reservation_number || '',
        baggage: bag
          ? {
              personalItem: bag.personalItem ?? 0,
              carryOn: bag.carryOn ?? 0,
              checkedBag: bag.checkedBag ?? 0,
            }
          : undefined,
      };
    });

    const airVoucherData: AirlineVoucherData = {
        agencyLogoBase64: vortexWhiteLogoBase64 || logoBase64,
        airlineName,
        clientName: clientName,
        shortId: undefined,
        localizador: '',
        passengers: airPax,
        flightLegs: [],
        flightGroups,
        notes: aggregatedNotes || undefined,
        additionalServices,
        agencyName: agency.name,
        agencyWhatsapp: agency.whatsapp || '',
        agencyEmail: agency.email || '',
        agencyWebsite: agency.website || '',
        hideReference: isQuoteMode,
      };

    const combinedDoc: any = generateAirlineVoucherPdf(airVoucherData, appendTo);
    const firstAirlineName = airlineName;
    if (combinedDoc && !appendTo) {
      const fileName = `voucher-aereo-${firstAirlineName ? firstAirlineName.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      combinedDoc.save(fileName);
      toast.success('Voucher aéreo gerado!');
    }
    return combinedDoc ?? null;
  };

  const buildPremiumPdfData = async (): Promise<PremiumPdfData | null> => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório para gerar o PDF'); return null; }
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
          checkOut: h.checkOutDate, nights: h.nightsCount || tripNights || 0,
          room: h.roomType, stars: h.stars, amenities: h.amenities,
          checkInTime: h.checkInTime, checkOutTime: h.checkOutTime,
          roomCount: h.roomCount, guestCount: h.guestCount,
          city: h.city, country: h.country, category: h.category,
          observations: h.observations, address: h.address,
          tripadvisorRating: h.tripadvisorRating,
          tripadvisorReviewsCount: h.tripadvisorReviewsCount,
          tripadvisorRanking: h.tripadvisorRanking,
          tripadvisorBadges: h.tripadvisorBadges,
          tripadvisorTopReviews: h.tripadvisorTopReviews,
          tripadvisorRatingBreakdown: h.tripadvisorRatingBreakdown,
          tripadvisorPopularMentions: h.tripadvisorPopularMentions,
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
      showPerPassenger,
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

    return pdfData;
  };

  const handleExportDraftPdf = async () => {
    // Unifica voucher de serviços + aéreo em UM único PDF
    const hasAir = items.some(i =>
      (i.metadata?.type === 'aereo' && i.metadata?.flightLegs?.length) ||
      (i.metadata?.type === 'adicional' && i.metadata?.isAirService)
    );
    const hasNonAir = items.some(i =>
      i.metadata?.type !== 'aereo' &&
      !(i.metadata?.type === 'adicional' && i.metadata?.isAirService)
    );
    let unified: any = null;
    if (hasNonAir) {
      unified = await handleExportServicesVoucherCombined();
    }
    if (hasAir) {
      unified = await handleExportAirlineVoucher(unified ?? undefined);
    }
    if (unified) {
      const fileName = `proposta-${clientName.replace(/\s+/g, '-').toLowerCase()}-${saleDate}.pdf`;
      unified.save(fileName);
      toast.success('PDF da proposta gerado!');
    }
  };

  // Variação que NÃO salva, retorna o doc com voucher de serviços
  const handleExportServicesVoucherCombined = async (): Promise<any | null> => {
    const result = await prepareVoucherCommonData();
    if (!result) return null;
    const { voucherData } = result;
    let vortexWhiteLogoBase64: string | undefined;
    try {
      const vortexResp = await fetch('/images/vortex-white-logo.png');
      const vortexBlob = await vortexResp.blob();
      vortexWhiteLogoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(vortexBlob);
      });
    } catch { /* skip */ }
    voucherData.vortexWhiteLogoBase64 = vortexWhiteLogoBase64;
    return generateVoucherPdf(voucherData);
  };

  const handleGenerateLink = async () => {
    if (!editSaleId) { toast.error('Salve a venda primeiro antes de gerar o link da proposta.'); return; }
    const { data, error } = await (supabase.from('sales').select('short_id' as any).eq('id', editSaleId).single() as any);
    if (error || !data?.short_id) { toast.error('Erro ao buscar código da proposta.'); return; }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/proposta/${data.short_id}`;
    window.open(link, '_blank');
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link da proposta copiado e aberto em nova aba!');
    } catch {
      toast.success('Proposta aberta em nova aba!');
    }
  };

  const handleGenerateClientBuildsLink = async () => {
    if (!editSaleId) { toast.error('Salve a venda primeiro antes de gerar o link.'); return; }
    const { data, error } = await (supabase.from('sales').select('short_id' as any).eq('id', editSaleId).single() as any);
    if (error || !data?.short_id) { toast.error('Erro ao buscar código da proposta.'); return; }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/montar-proposta/${data.short_id}`;
    window.open(link, '_blank');
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link "Cliente monta proposta" copiado e aberto em nova aba!');
    } catch {
      toast.success('Proposta aberta em nova aba!');
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
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-28">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {saleStatus === 'active' ? 'Editar Venda' : editSaleId ? 'Editar Cotação' : 'Nova Cotação'}
          </h1>
          <Button onClick={() => {
            const activeId = activeOptionId || quoteOptions[0]?.id || '';
            if (activeId) setForceImportOptionId(activeId);
            setPdfImportOpen(true);
          }} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
            <FileUp className="h-4 w-4" /> Importar PDF
          </Button>
        </div>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full justify-start border-b mb-4">
            <TabsTrigger value="dados">📋 Dados</TabsTrigger>
            <TabsTrigger value="servicos">🛒 Serviços</TabsTrigger>
            <TabsTrigger value="passageiros">👤 Passageiros</TabsTrigger>
            <TabsTrigger value="financeiro">💰 Financeiro</TabsTrigger>
            <TabsTrigger value="custo_financeiro">💸 Custo Financeiro</TabsTrigger>
            <TabsTrigger value="documentos">📄 Documentos</TabsTrigger>
            <TabsTrigger value="fiscal">🧾 Fiscal</TabsTrigger>
          </TabsList>

          {/* TAB: Dados */}
          <TabsContent value="dados" className="space-y-5">
        {/* Basic Info */}
        <Card className="overflow-hidden border-border/60">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-3">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {isQuoteMode ? 'Informações da Cotação' : 'Informações da Venda'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quoteId && (
                <div>
                  <Label>Código da Cotação</Label>
                  <Input value={quoteId} disabled className="bg-muted" />
                </div>
              )}
              <div className="md:col-span-2">
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
                                setSelectedClientId(c.id);
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
                  {selectedClientId && (
                    <Button type="button" size="icon" variant="outline" onClick={() => navigate('/clients', { state: { openEditId: selectedClientId, returnTo: '/sales/new', returnState: editSaleId ? { editSaleId } : undefined } })} title="Editar cliente">
                      <UserPen className="h-4 w-4" />
                    </Button>
                  )}
                  <Button type="button" size="icon" variant="outline" onClick={() => setQuickClientOpen(true)} title="Cadastrar novo cliente">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {isQuoteMode && (
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
                )}
              </div>
              {!isQuoteMode && (
                <div className="md:col-span-2">
                  <Label>Vendedor Responsável</Label>
                  <Select value={sellerId} onValueChange={setSellerId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {allSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="border-t border-border/60 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente pelas datas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destino e Proposta */}
        <Card className="overflow-hidden border-border/60">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-3">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Destino e Proposta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Destino</Label>
                <Input value={destinationName} onChange={e => setDestinationName(e.target.value)} placeholder="Ex: Orlando, Paris, Cancún..." />
                <p className="text-xs text-muted-foreground mt-1">Exibido nas propostas e orçamentos</p>
              </div>
              <div>
                <Label>Título da Cotação</Label>
                <Input value={quoteTitle} onChange={e => setQuoteTitle(e.target.value)} placeholder="Ex: Viagem Las Vegas — Família Silva" />
                <p className="text-xs text-muted-foreground mt-1">Substitui o nome do cliente na proposta e PDF</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Label>Imagem do Destino <span className="text-muted-foreground font-normal">(para proposta)</span></Label>
                <Button type="button" size="default" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setDestLibrarySearch(destinationName || ''); setDestLibraryOpen(true); searchDestinationLibrary(); }}>
                  <Search className="h-4 w-4" /> Biblioteca
                </Button>
              </div>
              <div className="mt-1 flex items-center gap-3 flex-wrap">
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
                  <div className="flex-1 flex items-center justify-center gap-2 py-8 border-2 border-dashed rounded-lg text-sm text-muted-foreground">
                    <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Carregando...
                  </div>
                ) : (
                  <label className="flex-1 cursor-pointer flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
                    <ImagePlus className="h-5 w-5" />
                    Adicionar imagem do destino
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

            {/* Image Position Editor */}
            <ImagePositionEditor
              open={imagePositionEditorOpen}
              onOpenChange={setImagePositionEditorOpen}
              imageUrl={destinationImageUrl}
              initialConfig={destinationImageConfig}
              onSave={(config) => setDestinationImageConfig(config)}
            />

            <Dialog open={destLibraryOpen} onOpenChange={setDestLibraryOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Biblioteca de imagens — Cidade</DialogTitle></DialogHeader>
                <div className="flex items-center gap-2">
                  <Input value={destLibrarySearch} onChange={e => setDestLibrarySearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchDestinationLibrary(); } }} placeholder="Nome da cidade ou palavra-chave"/>
                  <Button onClick={searchDestinationLibrary} disabled={destLibraryLoading} className="gap-1"><Search className="h-4 w-4"/>Buscar</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
                  {destLibraryResults.length === 0 && !destLibraryLoading && (
                    <p className="col-span-full text-sm text-muted-foreground text-center py-8">Nenhuma imagem encontrada</p>
                  )}
                  {destLibraryResults.map((img: any) => (
                    <button key={img.id} type="button" className="group relative rounded overflow-hidden border hover:ring-2 hover:ring-primary" onClick={() => { setDestinationImageUrl(img.image_url); setDestinationImageConfig(null); setDestLibraryOpen(false); toast.success('Imagem do destino selecionada'); }}>
                      <img src={img.image_url} alt={img.product_name} className="h-32 w-full object-cover"/>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">{img.product_name}</span>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

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
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={addPassenger}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {passengers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum passageiro adicionado</p>}
            {passengers.map((pax, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center gap-2 flex-wrap">
                  <Checkbox checked={pax.is_main} onCheckedChange={(checked) => updatePassenger(idx, 'is_main', !!checked)} />
                  <Label className="text-sm font-medium">Passageiro principal</Label>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => savePassengerAsClient(pax)} title="Salvar passageiro como novo cliente no CRM">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Salvar como cliente
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removePassenger(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Label className="text-xs">Nome</Label>
                    <Input 
                      value={pax.first_name} 
                      data-passenger-name
                      onChange={e => { 
                        updatePassenger(idx, 'first_name', e.target.value); 
                        const term = `${e.target.value} ${pax.last_name}`.trim();
                        setPassengerSearchTerm(term);
                        setPassengerSearchOpen(term.length >= 2 ? idx : null);
                      }} 
                      onFocus={() => { const t = `${pax.first_name} ${pax.last_name}`.trim(); if (t.length >= 2) { setPassengerSearchTerm(t); setPassengerSearchOpen(idx); } }}
                      onBlur={() => setTimeout(() => setPassengerSearchOpen(null), 200)}
                      placeholder="Nome" 
                      autoComplete="off"
                    />
                    {passengerSearchOpen === idx && passengerSearchTerm.length >= 2 && (() => {
                      const filtered = passengerClientResults;
                      if (filtered.length === 0 && !passengerSearchLoading) return null;
                      return (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                          {passengerSearchLoading && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                          )}
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
                  <div className="relative">
                    <Label className="text-xs">Sobrenome</Label>
                    <Input
                      value={pax.last_name}
                      onChange={e => {
                        updatePassenger(idx, 'last_name', e.target.value);
                        const term = `${pax.first_name} ${e.target.value}`.trim();
                        setPassengerSearchTerm(term);
                        setPassengerSearchOpen(term.length >= 2 ? idx : null);
                      }}
                      onFocus={() => { const t = `${pax.first_name} ${pax.last_name}`.trim(); if (t.length >= 2) { setPassengerSearchTerm(t); setPassengerSearchOpen(idx); } }}
                      onBlur={() => setTimeout(() => setPassengerSearchOpen(null), 200)}
                      placeholder="Sobrenome"
                      autoComplete="off"
                    />
                  </div>
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
                  <div><Label className="text-xs">Assento</Label><Input value={pax.seat} onChange={e => updatePassenger(idx, 'seat', e.target.value)} placeholder="Ex: 12A" /></div>
                </div>
                <div className="border-t pt-3 mt-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Bagagem</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div><Label className="text-xs">Item Pessoal</Label><Input type="number" min="0" value={pax.baggage_personal_item} onChange={e => updatePassenger(idx, 'baggage_personal_item', parseInt(e.target.value) || 0)} /></div>
                    <div><Label className="text-xs">Mão</Label><Input type="number" min="0" value={pax.baggage_carry_on} onChange={e => updatePassenger(idx, 'baggage_carry_on', parseInt(e.target.value) || 0)} /></div>
                    <div><Label className="text-xs">Despachada</Label><Input type="number" min="0" value={pax.baggage_checked} onChange={e => updatePassenger(idx, 'baggage_checked', parseInt(e.target.value) || 0)} /></div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB: Serviços */}
          <TabsContent value="servicos" className="space-y-4">

        {/* Serviços — Kanban por opção */}
        {(() => {
          const optionColumns = isQuoteMode
            ? quoteOptions.map((o, i) => ({ id: o.id || String(i), name: o.name, idx: i, opt: o }))
            : [{ id: '__single__', name: 'Serviços da Venda', idx: 0, opt: null as any }];
          const typeIcon = (type?: string) => {
            switch (type) {
              case 'aereo': return Plane;
              case 'hotel': return BedDouble;
              case 'carro': return Car;
              case 'cruzeiro': return Ship;
              case 'experiencia': return MapPin;
              case 'seguro': return ShieldCheck;
              default: return Briefcase;
            }
          };
          const typeMeta = (type?: string) => {
            switch (type) {
              case 'aereo': return { label: 'Aéreo', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
              case 'hotel': return { label: 'Hotel', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
              case 'carro': return { label: 'Transfer', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
              case 'cruzeiro': return { label: 'Cruzeiro', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
              case 'experiencia': return { label: 'Experiência', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
              case 'seguro': return { label: 'Seguro', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
              default: return { label: 'Outros', pill: 'bg-inherit text-inherit', iconBg: 'bg-inherit text-inherit' };
            }
          };
          const supplierFor = (it: SaleItem): string => {
            const t = it.metadata?.type;
            if (t === 'aereo' && it.metadata?.airlineId) return allAirlines.find(a => a.id === it.metadata!.airlineId)?.name || '';
            if (t === 'hotel') return it.metadata?.hotel?.hotelName || '';
            return '';
          };
          const itemsForOption = (optId: string) => {
            const base = isQuoteMode
              ? items
                  .map((it, i) => ({ it, i }))
                  .filter(({ it }) => {
                    const ids = it.quote_option_ids || (it.quote_option_id ? [it.quote_option_id] : []);
                    return ids.includes(optId);
                  })
              : items.map((it, i) => ({ it, i }));
            // Ordem fixa: 1) Aéreo, 2) Hospedagem (por check-in / check-out), 3) Demais serviços
            const rank = (t?: string) => (t === 'aereo' ? 0 : t === 'hotel' ? 1 : 2);
            return [...base].sort((a, b) => {
              const ra = rank(a.it.metadata?.type);
              const rb = rank(b.it.metadata?.type);
              if (ra !== rb) return ra - rb;
              if (ra === 1) {
                const aIn = a.it.metadata?.hotel?.checkInDate || '';
                const bIn = b.it.metadata?.hotel?.checkInDate || '';
                if (aIn !== bIn) return aIn < bIn ? -1 : 1;
                const aOut = a.it.metadata?.hotel?.checkOutDate || '';
                const bOut = b.it.metadata?.hotel?.checkOutDate || '';
                if (aOut !== bOut) return aOut < bOut ? -1 : 1;
              }
              return a.i - b.i;
            });
          };
          const addServiceToOption = (optId: string) => {
            const ids = isQuoteMode ? [optId] : [];
            setItems(prev => {
              const next = [...prev, { description: '', cost_price: 0, rav: 0, markup_percent: 0, total_value: 0, metadata: {}, quote_option_id: ids[0], quote_option_ids: ids } as SaleItem];
              setTimeout(() => setEditingItemIdx(next.length - 1), 50);
              return next;
            });
          };
          const activeId = optionColumns.find(c => c.id === activeOptionId)?.id || optionColumns[0]?.id || '';
          const activeCol = optionColumns.find(c => c.id === activeId) || optionColumns[0];
          const activeIdx = optionColumns.findIndex(c => c.id === activeCol?.id);
          const optItems = activeCol ? itemsForOption(activeCol.id) : [];
          const totalCost = optItems.reduce((s, { it }) => s + (it.cost_price || 0), 0);
          const totalRav = optItems.reduce((s, { it }) => s + (it.rav || 0), 0);
          const avgMarkup = optItems.length > 0 ? (optItems.reduce((s, { it }) => s + (it.markup_percent || 0), 0) / optItems.length) : 0;
          const totalOption = optItems.reduce((s, { it }) => s + (it.total_value || 0), 0);
          return (
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div>
                  <CardTitle className="text-base">{isQuoteMode ? 'Serviços da Cotação' : 'Serviços da Venda'}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isQuoteMode && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const newOpt: QuoteOption = { name: `Opção ${quoteOptions.length + 1}`, order_index: quoteOptions.length, display_mode: 'total' };
                      setQuoteOptions(prev => [...prev, newOpt]);
                    }}>
                      <Plus className="h-4 w-4 mr-1" />Opção
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => addServiceToOption(activeCol?.id || '')}>
                    <Plus className="h-4 w-4 mr-1" />Serviço
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-4">
                {/* Tabs of options */}
                {isQuoteMode && (
                  <div className="flex flex-wrap items-center gap-2">
                    {optionColumns.map((col, colIdx) => {
                      const isActive = col.id === activeCol?.id;
                      return (
                        <Popover key={col.id}>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setActiveOptionId(col.id)}
                              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors border ${isActive ? 'bg-foreground text-background border-foreground' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/70'}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-background' : 'bg-muted-foreground/50'}`} />
                              {col.name}
                            </button>
                            {isActive && (
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 ml-0.5"><Edit className="h-3 w-3" /></Button>
                              </PopoverTrigger>
                            )}
                          </div>
                          <PopoverContent className="w-64 p-2 space-y-2">
                            <Label className="text-xs">Renomear opção</Label>
                            <Input
                              value={col.opt.name}
                              onChange={e => setQuoteOptions(prev => prev.map((o, i) => i === col.idx ? { ...o, name: e.target.value } : o))}
                              className="h-8 text-sm"
                            />
                            {quoteOptions.length > 1 && (
                              <Button variant="ghost" size="sm" className="w-full justify-start text-destructive h-7 text-xs" onClick={() => {
                                const removedId = col.opt.id || String(col.idx);
                                const remaining = quoteOptions.filter((_, i) => i !== col.idx);
                                const fallbackId = remaining[0]?.id || String(remaining[0]?.order_index ?? 0);
                                setQuoteOptions(remaining.map((o, i) => ({ ...o, order_index: i })));
                                setItems(prev => prev.map(item => {
                                  const ids = item.quote_option_ids || (item.quote_option_id ? [item.quote_option_id] : []);
                                  const filtered = ids.filter(id => id !== removedId);
                                  if (filtered.length === 0) return { ...item, quote_option_id: fallbackId, quote_option_ids: [fallbackId] };
                                  return { ...item, quote_option_id: filtered[0], quote_option_ids: filtered };
                                }));
                                // Drop payment options tied to the removed quote option
                                setProposalPaymentOptions(prev => prev.filter(po => (po.quote_option_id || null) !== removedId));
                                if (paymentOptionTab === removedId) setPaymentOptionTab('__geral__');
                                setActiveOptionId(fallbackId);
                              }}>
                                <Trash2 className="h-3 w-3 mr-1" /> Remover opção
                              </Button>
                            )}
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border">
                  <div className="bg-card p-3">
                    <div className="text-[11px] text-muted-foreground">Custo total</div>
                    <div className="text-sm font-semibold mt-0.5">{maskCurrency(totalCost)}</div>
                  </div>
                  <div className="bg-card p-3">
                    <div className="text-[11px] text-muted-foreground">RAV total</div>
                    <div className="text-sm font-semibold mt-0.5">{maskCurrency(totalRav)}</div>
                  </div>
                  <div className="bg-card p-3">
                    <div className="text-[11px] text-muted-foreground">Acrésc. médio</div>
                    <div className="text-sm font-semibold mt-0.5">{avgMarkup.toFixed(2).replace('.', ',')}%</div>
                  </div>
                  <div className="bg-card p-3">
                    <div className="text-[11px] text-muted-foreground">Serviços</div>
                    <div className="text-sm font-semibold mt-0.5">{optItems.length}</div>
                  </div>
                  <div className="p-3 bg-slate-50">
                    <div className="text-[11px] text-inherit">Total {activeCol?.name?.toLowerCase() || 'venda'}</div>
                    <div className="text-sm font-semibold mt-0.5 text-inherit">{maskCurrency(totalOption)}</div>
                  </div>
                </div>

                {/* Service rows */}
                <div className="flex flex-col gap-2">
                  {optItems.map(({ it, i: idx }) => {
                    const Icon = typeIcon(it.metadata?.type);
                    const tm = typeMeta(it.metadata?.type);
                    const sup = supplierFor(it);
                    const metaParts: string[] = [tm.label];
                    if (sup) metaParts.push(sup);
                    if (it.purchase_number) metaParts.push(`Compra: ${it.purchase_number}`);
                    if (it.metadata?.type === 'hotel' && it.metadata?.hotel?.checkInDate) {
                      const ci = it.metadata.hotel.checkInDate; const co = it.metadata.hotel.checkOutDate;
                      const fmt = (d: string) => { const p = (d || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : ''; };
                      if (ci) metaParts.push(`Check-in ${fmt(ci)}`);
                      if (co) metaParts.push(`Check-out ${fmt(co)}`);
                    }
                    if (it.markup_percent) metaParts.push(`Acrésc: ${Number(it.markup_percent).toFixed(2).replace('.', ',')}%`);
                    return (
                      <div key={idx} className="group flex items-center gap-3 bg-card hover:bg-muted/40 border border-border/60 rounded-lg px-3 py-2.5 transition-colors">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.iconBg}`}>
                          <Icon className={`h-4 w-4 ${it.metadata?.type === 'aereo' ? 'text-slate-600' : ''}`} />
                        </div>
                        <button type="button" onClick={() => setEditingItemIdx(idx)} className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="truncate">{it.description || <span className="text-muted-foreground italic font-normal">Editar serviço…</span>}</span>
                            {it.metadata?.type === 'hotel' && it.metadata?.hotel?.city && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                                <MapPin className="h-2.5 w-2.5" />
                                {it.metadata.hotel.city}
                              </span>
                            )}
                            {it.metadata?.type === 'hotel' && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                  (itemImages[idx]?.length || 0) > 0 || (it.metadata?.hotel?.images?.length || 0) > 0
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                                title={
                                  (itemImages[idx]?.length || 0) > 0 || (it.metadata?.hotel?.images?.length || 0) > 0
                                    ? 'Imagens do hotel adicionadas'
                                    : 'Nenhuma imagem do hotel adicionada'
                                }
                              >
                                <ImageIcon className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{metaParts.join(' · ')}</div>
                        </button>
                        {isQuoteMode && quoteOptions.length > 1 && (
                          <div className="hidden md:flex flex-wrap gap-1 max-w-[180px]">
                            {quoteOptions.map((opt, oi) => {
                              const optId = opt.id || String(oi);
                              const ids = it.quote_option_ids || (it.quote_option_id ? [it.quote_option_id] : []);
                              const checked = ids.includes(optId);
                              return (
                                <button
                                  key={oi}
                                  type="button"
                                  onClick={() => {
                                    setItems(prev => prev.map((x, j) => {
                                      if (j !== idx) return x;
                                      const cur = x.quote_option_ids || (x.quote_option_id ? [x.quote_option_id] : []);
                                      const isOn = cur.includes(optId);
                                      const newIds = isOn ? cur.filter(id => id !== optId) : [...cur, optId];
                                      const finalIds = newIds.length === 0 ? [optId] : newIds;
                                      return { ...x, quote_option_ids: finalIds, quote_option_id: finalIds[0] };
                                    }));
                                  }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${checked ? 'bg-primary/10 border-primary/40 text-foreground' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}
                                  title={opt.name}
                                >
                                  {checked ? '✓ ' : ''}{opt.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tm.pill}`}>{tm.label}</span>
                        <span className="text-sm font-semibold tabular-nums w-[110px] text-right text-inherit">{maskCurrency(it.total_value)}</span>
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItemIdx(idx)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(idx)} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add service link */}
                  <button
                    type="button"
                    onClick={() => addServiceToOption(activeCol?.id || '')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 px-3 py-2 self-start"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar serviço
                  </button>
                </div>

                {/* Footer: New option + Total */}
                <div className="flex items-center justify-between border-t pt-3">
                  <span />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total {activeCol?.name?.toLowerCase() || 'venda'}</span>
                    <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{maskCurrency(totalOption)}</span>
                  </div>
                </div>

                {/* Per-option payment methods (only in quote mode) */}
                {isQuoteMode && activeCol && (() => {
                  const scopeId = activeCol.id;
                  const activeIdx = quoteOptions.findIndex(o => (o.id || String(o.order_index)) === scopeId);
                  const activeMode: 'individual' | 'total' = (activeIdx >= 0 ? quoteOptions[activeIdx]?.display_mode : 'total') || 'total';
                  const setActiveMode = (mode: 'individual' | 'total') => {
                    setQuoteOptions(prev => prev.map((o, i) => i === activeIdx ? { ...o, display_mode: mode } : o));
                    if (activeIdx === 0) {
                      setShowIndividualValues(mode === 'individual');
                      setShowOnlyTotal(false);
                    }
                  };
                  // Options for the active quote option. Legacy/null options and stale option ids
                  // (from quotes saved before option ids were remapped) surface in the first option.
                  const firstOptionId = optionColumns[0]?.id || '';
                  const validOptionIds = new Set(optionColumns.map(col => col.id).filter(Boolean));
                  const visibleOptions = proposalPaymentOptions
                    .map((o, i) => ({ o, i }))
                    .filter(({ o }) => {
                      const oid = o.quote_option_id ?? null;
                      if (oid === scopeId) return true;
                      if (oid === null && scopeId === firstOptionId) return true;
                      if (oid && !validOptionIds.has(oid) && scopeId === firstOptionId) return true;
                      return false;
                    });
                  const updateAt = (idx: number, patch: Partial<ProposalPaymentOption>) =>
                    setProposalPaymentOptions(prev => prev.map((o, i) => i === idx ? { ...o, ...patch } : o));
                  const removeAt = (idx: number) =>
                    setProposalPaymentOptions(prev => prev.filter((_, i) => i !== idx));
                  const addOption = () => setProposalPaymentOptions(prev => [...prev, {
                    method: `custom_${Date.now()}`,
                    label: '',
                    installments: 1,
                    discountPercent: 0,
                    enabled: true,
                    quote_option_id: scopeId,
                  }]);
                  const enabledCount = visibleOptions.filter(({ o }) => o.enabled).length;
                  return (
                    <div className="border-t pt-4 mt-2">
                      {/* Display mode (per option) */}
                      <div className="mb-3 rounded-lg border border-border p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">👁️ Exibição na proposta</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveMode('individual')}
                            className={`text-left rounded-md border px-3 py-2 transition-all ${activeMode === 'individual' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-border/80'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-3.5 w-3.5 rounded-full border ${activeMode === 'individual' ? 'border-primary bg-primary' : 'border-border'}`} />
                              <span className="text-sm font-medium">Mostrar valor individual dos serviços</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 ml-5">Lista cada serviço com seu valor + total + condições de pagamento.</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMode('total')}
                            className={`text-left rounded-md border px-3 py-2 transition-all ${activeMode === 'total' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-border/80'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-3.5 w-3.5 rounded-full border ${activeMode === 'total' ? 'border-primary bg-primary' : 'border-border'}`} />
                              <span className="text-sm font-medium">Mostrar valor total <span className="text-[10px] text-muted-foreground font-normal">(padrão)</span></span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 ml-5">Mostra apenas o valor total + condições de pagamento.</p>
                          </button>
                        </div>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <span>💳 Formas de pagamento desta opção</span>
                              <span className="text-xs text-muted-foreground">({enabledCount} ativa{enabledCount === 1 ? '' : 's'})</span>
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-[min(960px,95vw)] max-h-[75vh] overflow-y-auto p-0">
                          <div className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Formas de pagamento exclusivas da <strong>"{activeCol.name}"</strong>.
                              </p>
                              <Button variant="outline" size="sm" onClick={addOption} className="shrink-0 h-8">
                                <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
                              </Button>
                            </div>
                            {visibleOptions.length === 0 ? (
                              <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                                Nenhuma forma de pagamento configurada para esta opção.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                {visibleOptions.map(({ o: opt, i: idx }) => {
                                  const isCustom = opt.method.startsWith('custom_') || opt.method.startsWith('pdf_import_');
                                  return (
                                    <div
                                      key={`${opt.method}-${idx}`}
                                      className={`rounded-lg border transition-all ${opt.enabled ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-border/80'}`}
                                    >
                                      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50">
                                        <Checkbox checked={opt.enabled} onCheckedChange={(c) => updateAt(idx, { enabled: !!c })} />
                                        {isCustom ? (
                                          <Input
                                            value={opt.label}
                                            onChange={e => updateAt(idx, { label: e.target.value })}
                                            className={`h-7 text-sm font-medium flex-1 min-w-0 ${opt.enabled && !opt.label.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                            placeholder="Nome da forma de pagamento *"
                                            required
                                          />
                                        ) : (
                                          <Label className="font-medium text-sm flex-1 truncate">{opt.label}</Label>
                                        )}
                                        {opt.highlighted && (
                                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">★ Popular</span>
                                        )}
                                        {isCustom && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeAt(idx)}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      {opt.enabled && (
                                        <div className="p-3 space-y-2.5">
                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Parcelas</Label>
                                              <Input type="number" min="1" max="24" value={opt.installments} onChange={e => updateAt(idx, { installments: parseInt(e.target.value) || 1 })} className="h-8 mt-0.5" />
                                            </div>
                                            <div>
                                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Desc/Acréscimo %</Label>
                                              <Input type="number" step="0.5" value={opt.discountPercent ? opt.discountPercent : ''} onChange={e => { const v = e.target.value; updateAt(idx, { discountPercent: v === '' || v === '-' ? 0 : (parseFloat(v) || 0), fixedValue: undefined }); }} placeholder="0 ou -5" className="h-8 mt-0.5" />
                                            </div>
                                            <div>
                                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor fixo R$</Label>
                                              <Input type="number" step="0.01" min="0" value={opt.fixedValue || ''} onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                updateAt(idx, { fixedValue: val > 0 ? val : undefined, discountPercent: val > 0 ? 0 : opt.discountPercent });
                                              }} placeholder="—" className="h-8 mt-0.5" />
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                              <Checkbox checked={opt.showPerPerson || false} onCheckedChange={(c) => updateAt(idx, { showPerPerson: !!c })} />
                                              <span className="text-xs text-muted-foreground">Por pessoa</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                              <Checkbox checked={opt.highlighted || false} onCheckedChange={(c) => updateAt(idx, { highlighted: !!c })} />
                                              <span className="text-xs text-muted-foreground">Mais Popular (destaque)</span>
                                            </label>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })()}

        {/* Notes + Internal Files - moved into Serviços */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isQuoteMode ? 'Observações da Cotação' : 'Observação da Venda'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações internas sobre a venda..." rows={4} className="min-h-[80px]" />
            <div className="border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-2 mb-2"><Paperclip className="h-4 w-4" />Arquivos Internos</Label>
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white w-fit">
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

          </TabsContent>

          {/* TAB: Financeiro */}
          <TabsContent value="financeiro" className="space-y-4">

        {/* Recebimento - only in sale mode */}
        {!isQuoteMode && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recebimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Recebimento padronizado: bloco por forma de pagamento + botão "Adicionar pagamento" */}
            <div>
              {/* Acréscimo de Comissão (cobrado por fora ao cliente) */}
              <div className="flex flex-wrap items-center justify-end gap-3 mb-3">
                <Label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap text-base" title="Quando cobramos uma comissão a mais por fora e o cliente paga diretamente para a empresa. Soma ao Total da Venda e ao Lucro Bruto.">
                  Acréscimo de Comissão:
                </Label>
                <Input
                  className="h-8 text-sm w-40"
                  value={commissionSurcharge ? `R$ ${commissionSurcharge.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                  onChange={e => {
                    const digits = e.target.value.replace(/[^\d]/g, '');
                    setCommissionSurcharge(parseInt(digits || '0', 10) / 100);
                  }}
                  placeholder="R$ 0,00"
                />
                <Select value={commissionSurchargeMethod} onValueChange={setCommissionSurchargeMethod}>
                  <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="Forma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="debito">Cartão de Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="h-8 text-sm w-44"
                  value={commissionSurchargeDate}
                  onChange={e => setCommissionSurchargeDate(e.target.value)}
                />
              </div>
              {(() => {
              const totalReceivables = receivables.reduce((s, r) => s + r.amount, 0);
              // Recebimento sempre referente apenas ao RAV/comissão da venda
              const expectedReceivables = grossProfit;
              const diff = expectedReceivables - totalReceivables;

                // Group receivables by payment_method (key)
                const labelToKey: Record<string, string> = { 'Pix': 'pix', 'Dinheiro': 'dinheiro', 'Boleto': 'boleto', 'Cartão de Crédito': 'credito', 'Cartão de Débito': 'debito', 'Transferência': 'transferencia', 'Pgto Operadora/Consolidadora': 'operadora', 'Pgto Operadora': 'operadora' };
                const allMethodOptions = [
                  { value: 'pix', label: 'Pix' },
                  { value: 'dinheiro', label: 'Dinheiro' },
                  { value: 'boleto', label: 'Boleto' },
                  { value: 'credito', label: 'Cartão de Crédito' },
                  { value: 'debito', label: 'Cartão de Débito' },
                  { value: 'transferencia', label: 'Transferência' },
                  { value: 'operadora', label: 'Pgto Operadora/Consolidadora' },
                  { value: 'faturado_cartao', label: 'Faturado + Cartão' },
                ];
                const maxInstallmentsByMethod: Record<string, number> = { credito: 18, boleto: 24, operadora: 24 };

                const renderTable = (items: { rec: Receivable; globalIdx: number }[]) => (
                  <div className="border rounded-lg overflow-hidden bg-lime-100">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                      <div className="col-span-2">Parcela</div>
                      <div className="col-span-4">Data de Recebimento</div>
                      <div className="col-span-3">Valor</div>
                      <div className="col-span-3">Centro de Custo</div>
                    </div>
                    <div className="divide-y">
                      {items.map(({ rec: r, globalIdx: idx }, localIdx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-muted/20">
                          <div className="col-span-2 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">{localIdx + 1}ª</div>
                          </div>
                          <div className="col-span-4">
                            <Input type="date" className="h-8 text-sm" value={r.due_date} onChange={e => setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, due_date: e.target.value } : rec))} />
                          </div>
                          <div className="col-span-3">
                            <Input
                              className="h-8 text-sm"
                              value={r.amount ? `R$ ${r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                              onChange={e => {
                                const digits = e.target.value.replace(/[^\d]/g, '');
                                const newAmount = parseInt(digits || '0', 10) / 100;
                                setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, amount: newAmount } : rec));
                              }}
                              placeholder="R$ 0,00"
                            />
                          </div>
                          <div className="col-span-3">
                            <Select value={r.cost_center_id || 'none'} onValueChange={v => {
                              const newVal = v === 'none' ? undefined : v;
                              if (localIdx === 0) {
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );

                return (
                  <>
                    <div className="flex items-center justify-end gap-2 mb-2">
                      <Label className="text-xs whitespace-nowrap">Centro de Custo Padrão:</Label>
                      <Select value={defaultCostCenterId || 'none'} onValueChange={v => {
                        const newVal = v === 'none' ? '' : v;
                        setDefaultCostCenterId(newVal);
                        if (newVal) {
                          setReceivables(prev => prev.map(rec => ({ ...rec, cost_center_id: newVal })));
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Top bar: Adicionar pagamento + resumo inline (estilo Controle de Pagamentos) */}
                    <div className="flex flex-wrap items-center gap-3 mb-3 p-2 rounded-md border bg-muted/30">
                      <Select value="" onValueChange={v => {
                        if (!v) return;
                        if (v === 'faturado_cartao') {
                          setPaymentMethods(prev => {
                            const next = [...prev];
                            if (!next.includes('operadora')) next.push('operadora');
                            if (!next.includes('credito')) next.push('credito');
                            return next;
                          });
                          setInstallmentsMap(prev => ({ ...prev, operadora: prev.operadora || 1, credito: prev.credito || 1 }));
                        } else if (!paymentMethods.includes(v)) {
                          setInstallmentsMap(prev => ({ ...prev, [v]: 1 }));
                          setPaymentMethods(prev => [...prev, v]);
                        }
                      }}>
                        <SelectTrigger className="h-8 text-sm w-56 border-dashed">
                          <SelectValue placeholder="+ Adicionar pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {allMethodOptions.filter(opt => !paymentMethods.includes(opt.value)).map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">RAV / Comissão: <span className="font-bold text-foreground">{fmt(expectedReceivables)}</span></span>
                        <span className="text-muted-foreground">Lançado: <span className="font-bold text-foreground">{fmt(totalReceivables)}</span></span>
                        <span className={`font-bold ${Math.abs(diff) > 0.01 ? (diff > 0 ? 'text-amber-600' : 'text-destructive') : 'text-emerald-600'}`}>
                          {Math.abs(diff) > 0.01
                            ? (diff > 0 ? `Falta lançar: ${fmt(diff)}` : `Excedente: ${fmt(Math.abs(diff))}`)
                            : '✓ Valores conferem'}
                        </span>
                      </div>
                    </div>
                    {/* Bloco por forma de pagamento — header (forma | total | parcelas | remover) + parcelas embaixo */}
                    <div className="space-y-4">
                      {paymentMethods.map(m => {
                        const items = receivables.map((rec, idx) => ({ rec, globalIdx: idx })).filter(({ rec }) => labelToKey[rec.payment_method || ''] === m);
                        const methodTotal = items.reduce((s, it) => s + it.rec.amount, 0);
                        const maxInst = maxInstallmentsByMethod[m] || 24;
                        return (
                          <div key={m} className="border rounded-lg p-3 bg-card space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className="md:col-span-4">
                                <Label className="text-xs">Forma de pagamento</Label>
                                <Select value={m} onValueChange={(v) => {
                                  if (!v || v === m) return;
                                  if (v === 'faturado_cartao') {
                                    setPaymentMethods(prev => {
                                      const next = prev.filter(x => x !== m);
                                      if (!next.includes('operadora')) next.push('operadora');
                                      if (!next.includes('credito')) next.push('credito');
                                      return next;
                                    });
                                    setInstallmentsMap(prev => ({ ...prev, operadora: prev.operadora || 1, credito: prev.credito || 1 }));
                                    return;
                                  }
                                  if (paymentMethods.includes(v)) return;
                                  setPaymentMethods(prev => prev.map(x => x === m ? v : x));
                                  setInstallmentsMap(prev => ({ ...prev, [v]: prev[v] || 1 }));
                                }}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {allMethodOptions.filter(opt => opt.value === m || !paymentMethods.includes(opt.value)).map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-xs">Valor total</Label>
                                <Input value={fmt(methodTotal)} disabled className="h-9 bg-muted" />
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-xs">Nº de parcelas</Label>
                                <Select value={String(getInstallments(m))} onValueChange={v => setMethodInstallments(m, parseInt(v))}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Array.from({ length: maxInst }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2 flex justify-end">
                                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPaymentMethods(prev => prev.filter(x => x !== m))}>
                                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                                </Button>
                              </div>
                            </div>
                            {/* Inline extras */}
                            {m === 'credito' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Tipo de Cartão</Label>
                                  <Select value={cardPaymentType} onValueChange={setCardPaymentType}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="ec">EC (Máquina)</SelectItem><SelectItem value="link">Link de Pagamento</SelectItem></SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            {m === 'boleto' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Juros (% ao mês)</Label>
                                  <Input type="number" step="0.01" value={boletoInterestRate} onChange={e => setBoletoInterestRate(parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-9" />
                                </div>
                              </div>
                            )}
                            {m === 'operadora' && (
                              <div className="text-sm text-muted-foreground">
                                Comissão Bruta: <span className="font-semibold text-primary">{fmt(grossProfit)}</span>
                              </div>
                            )}
                            {items.length > 0 && renderTable(items)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Recebimentos órfãos (ex.: Acréscimo de Comissão sem método ativo) */}
                    {(() => {
                      const orphan = receivables.map((rec, idx) => ({ rec, globalIdx: idx })).filter(({ rec }) => {
                        const key = labelToKey[rec.payment_method || ''];
                        return !key || !paymentMethods.includes(key);
                      });
                      return orphan.length > 0 ? (
                        <div className="pt-2">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Outros recebimentos</p>
                          {renderTable(orphan)}
                        </div>
                      ) : null;
                    })()}
                  </>
                );
              })()}
            </div>
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
                // Controle de Pagamentos sempre considera o custo total da venda
                const expectedCost = totalCost;
                const totalPayments = supplierPayments.reduce((s, sp) => s + sp.amount, 0);
                const diff = expectedCost - totalPayments;
                return (
                  <div className="flex items-center gap-4 text-sm mt-1">
                    <span className="text-muted-foreground">Custo Total: <strong className="text-foreground">{fmt(expectedCost)}</strong></span>
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
              {/* Top summary row: Custo Total | Fornecedores | Forma de Pagamento */}
              {(() => {
                const isOpOnlyTop = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
                const methodLabels: Record<string, string> = { pix: 'Pix', faturado: 'Faturado', credito: 'Cartão de Crédito' };
                const usedMethods = Array.from(new Set(supplierPayments.map(s => s.payment_method)));
                const formaLabel = isOpOnlyTop
                  ? 'Pagamento direto'
                  : usedMethods.length === 0
                    ? '—'
                    : usedMethods.length === 1
                      ? `${methodLabels[usedMethods[0]] || usedMethods[0]} (todos)`
                      : 'Misto';
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 border rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x bg-muted/20">
                    <div className="p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Custo Total</p>
                      <p className="text-lg font-bold text-foreground mt-1">{fmt(totalCost)}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Fornecedores</p>
                      <p className="text-lg font-bold text-foreground mt-1">{selectedSupplierIds.length} selecionado{selectedSupplierIds.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Forma de Pagamento</p>
                      <p className="text-lg font-bold text-foreground mt-1">{formaLabel}</p>
                    </div>
                  </div>
                );
              })()}

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
                    return grossProfit * (pct / 100);
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

              {/* Supplier payments table-like list */}
              {selectedSupplierIds.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    <div className="col-span-4">Fornecedor</div>
                    <div className="col-span-2">Pagamento</div>
                    <div className="col-span-2">Centro de Custo</div>
                    <div className="col-span-2">Data</div>
                    <div className="col-span-2 text-right">Valor</div>
                  </div>
                  <div className="divide-y">
                    {supplierPayments.map(sp => {
                      const sup = allSuppliers.find(s => s.id === sp.supplier_id);
                      const isOpOnly = paymentMethods.length === 1 && paymentMethods[0] === 'operadora';
                      const methodLabels: Record<string, string> = { pix: 'Pix', faturado: 'Faturado', credito: 'Cartão Crédito' };
                      const cc = costCenters.find(c => c.id === sp.cost_center_id);
                      const dateStr = sp.payment_date ? format(new Date(sp.payment_date + 'T12:00:00'), 'dd/MM/yyyy') : '—';
                      const initials = (sup?.name || 'FO').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      const isExpanded = expandedSupplierId === sp.supplier_id;
                      return (
                        <div key={sp.supplier_id}>
                          <div
                            className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer"
                            onClick={() => setExpandedSupplierId(isExpanded ? null : sp.supplier_id)}
                          >
                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">{initials}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{sup?.name || 'Fornecedor'}</p>
                                <p className="text-xs text-muted-foreground truncate">{sp.description || 'Pagamento de operadoras'}</p>
                              </div>
                            </div>
                            <div className="col-span-2 text-sm">{methodLabels[sp.payment_method] || sp.payment_method}</div>
                            <div className="col-span-2 text-sm text-muted-foreground truncate">{cc?.name || 'Nenhum'}</div>
                            <div className="col-span-2 text-sm">{dateStr}</div>
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <span className="text-sm font-semibold">{fmt(sp.amount)}</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && !isOpOnly && (
                            <div className="px-4 pb-4 pt-1 bg-muted/10 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                                <div>
                                  <Label className="text-xs">{sp.payment_method === 'credito' ? 'Nº de Parcelas' : 'Data do Pagamento'}</Label>
                                  {sp.payment_method === 'credito' ? (
                                    <Select value={String(sp.installments)} onValueChange={v => updateSupplierPayment(sp.supplier_id, 'installments', parseInt(v))}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                                    </Select>
                                  ) : (
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
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Descrição</Label>
                                  <Input value={sp.description} onChange={e => setSupplierPayments(prev => prev.map(s => s.supplier_id === sp.supplier_id ? { ...s, description: e.target.value } : s))} placeholder="Pagamento de operadoras" />
                                </div>
                                <div>
                                  <Label className="text-xs">Valor</Label>
                                  <Input
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
                              <div className="flex justify-end">
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setSelectedSupplierIds(prev => prev.filter(s => s !== sp.supplier_id))}>
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                                </Button>
                              </div>
                            </div>
                          )}
                          {isExpanded && isOpOnly && (
                            <div className="px-4 pb-4 pt-1 bg-muted/10 text-xs text-muted-foreground italic">
                              Pagamento direto ao fornecedor (Operadora)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom add-supplier row */}
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

              {selectedSupplierIds.length === 0 && (!sellerId || sellerId === 'none' || allSellers.find(s => s.id === sellerId)?.commission_type === 'none') && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum fornecedor ou comissão configurada</p>
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
              <div><p className="text-sm text-muted-foreground">Total Custo Fornecedor</p><p className="text-xl font-bold">{fmt(totalCost)}</p></div>
              {!isQuoteMode ? (
                <div>
                  <p className="text-sm text-muted-foreground">Custo Financeiro</p>
                  <p className="text-xl font-bold text-destructive">{fmt(financialCostsTotal + financialCostsCommissionTotal + machineFee)}</p>
                </div>
              ) : <div />}
              <div>
                <p className="text-sm text-muted-foreground">{isQuoteMode ? 'Total Geral (todos)' : 'Valor Total da Venda'}</p>
                <p className="text-xl font-bold">{fmt(totalSaleWithInterest)}</p>
                {(saleInterest > 0 || operatorTaxes > 0) && <p className="text-xs text-muted-foreground">(Serviços: {fmt(totalSale)}{operatorTaxes > 0 ? ` + Taxas: ${fmt(operatorTaxes)}` : ''}{saleInterest > 0 ? ` + Juros: ${fmt(saleInterest)}` : ''})</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lucro Bruto {totalSaleWithInterest > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">({((grossProfit / totalSaleWithInterest) * 100).toFixed(1).replace('.', ',')}%)</span>
                )}</p>
                <p className="text-xl font-bold text-primary">{fmt(grossProfit)}</p>
              </div>
              {!isQuoteMode && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Líquido {totalSaleWithInterest > 0 && (
                      <span className={`text-xs font-medium ${netProfit >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>({((netProfit / totalSaleWithInterest) * 100).toFixed(1).replace('.', ',')}%)</span>
                    )}</p>
                    <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netProfit)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Venda Líquido</p>
                    <p className="text-xl font-bold">{fmt(totalSaleWithInterest - (financialCostsTotal + financialCostsCommissionTotal + machineFee))}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {!isQuoteMode && editSaleId && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileCheck className="h-4 w-4" /> Comissão</CardTitle></CardHeader>
            <CardContent>
              {commissionInvoiceStatus === 'received' ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm font-medium text-emerald-800">Comissão recebida</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={async () => {
                      setCommissionInvoiceStatus(null);
                      await supabase.from('sales').update({ commission_invoice_status: null } as any).eq('id', editSaleId);
                      toast.success('Status de comissão limpo');
                    }}
                  >
                    Limpar
                  </Button>
                </div>
              ) : commissionInvoiceStatus === 'pending' ? (
                <Button
                  className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    setCommissionInvoiceStatus('received');
                    await supabase.from('sales').update({ commission_invoice_status: 'received' } as any).eq('id', editSaleId);
                    toast.success('Comissão marcada como recebida!');
                  }}
                >
                  <FileCheck className="h-4 w-4" /> Marcar como Comissão recebida
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                  onClick={async () => {
                    setCommissionInvoiceStatus('pending');
                    await supabase.from('sales').update({ commission_invoice_status: 'pending' } as any).eq('id', editSaleId);
                    toast.success('Marcado: aguardando pagamento de comissão');
                  }}
                >
                  <Clock className="h-4 w-4" /> Aguardando pagamento comissão
                </Button>
              )}
            </CardContent>
          </Card>
        )}

          </TabsContent>

          {/* TAB: Documentos */}
          <TabsContent value="custo_financeiro" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Custos Financeiros</span>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => {
                      const seller = allSellers.find(s => s.id === sellerId);
                      const pct = seller && seller.commission_type !== 'none' ? (Number(seller.commission_percentage) || 0) : 0;
                      setFinancialCosts(prev => [...prev, {
                        description: '',
                        value: 0,
                        cost_center_id: defaultCostCenterId || undefined,
                        seller_id: sellerId && sellerId !== 'none' ? sellerId : undefined,
                        commission_percent: pct,
                      }]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <Label className="text-destructive">Taxa de Máquina (R$)</Label>
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
                </div>
                {financialCosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum custo financeiro lançado. Use "Adicionar" para incluir taxas e outros custos que reduzem a margem.</p>
                ) : (
                  <div className="space-y-3">
                    {financialCosts.map((fc, idx) => {
                      const update = (patch: Partial<FinancialCost>) => setFinancialCosts(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x));
                      const remove = () => setFinancialCosts(prev => prev.filter((_, i) => i !== idx));
                      const lineCommission = (Number(fc.value) || 0) * (Number(fc.commission_percent) || 0) / 100;
                      return (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border rounded p-2">
                          <div className="md:col-span-3">
                            <Label>Valor</Label>
                            <Input
                              value={maskCurrency(Number(fc.value) || 0)}
                              onChange={e => update({ value: parseCurrency(e.target.value) })}
                              placeholder="R$ 0,00"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Label>Centro de Custo</Label>
                            <Select value={fc.cost_center_id || 'none'} onValueChange={v => update({ cost_center_id: v === 'none' ? undefined : v })}>
                              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-3">
                            <Label>Vendedor</Label>
                            <Select
                              value={fc.seller_id || 'none'}
                              onValueChange={v => {
                                if (v === 'none') {
                                  update({ seller_id: undefined, commission_percent: 0 });
                                } else {
                                  const seller = allSellers.find(s => s.id === v);
                                  const pct = seller && seller.commission_type !== 'none' ? (Number(seller.commission_percentage) || 0) : 0;
                                  update({ seller_id: v, commission_percent: pct });
                                }
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {allSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-1">
                            <Label>Comissão %</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={fc.commission_percent ?? 0}
                              onChange={e => update({ commission_percent: Number(e.target.value) })}
                            />
                          </div>
                          <div className="md:col-span-1 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={remove}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                          {lineCommission > 0 && (
                            <div className="md:col-span-12 text-xs text-muted-foreground">
                              Comissão deste item: <strong>{fmt(lineCommission)}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex justify-end gap-6 pt-2 border-t text-sm">
                      <div>Total Custos: <strong className="text-destructive">{fmt(financialCostsTotal)}</strong></div>
                      {financialCostsCommissionTotal > 0 && (
                        <div>Total Comissões: <strong className="text-destructive">{fmt(financialCostsCommissionTotal)}</strong></div>
                      )}
                      <div>Impacto na Margem: <strong className="text-destructive">- {fmt(financialCostsTotal + financialCostsCommissionTotal)}</strong></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Documentos */}
          <TabsContent value="documentos" className="space-y-4">

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

          <TabsContent value="fiscal" className="space-y-4">
            {!isQuoteMode ? (
              <>
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
              <NfseModulo
                venda={{
                  id: editSaleId,
                  empresa_id: activeCompany?.id,
                  cliente: {
                    nome: clientName,
                    cpf: (() => {
                      const mainP = passengers.find(p => p.is_main) || passengers[0];
                      if (mainP?.document_type === 'cpf') return mainP.document_number || '';
                      const cpfPax = passengers.find(p => p.document_type === 'cpf');
                      return cpfPax?.document_number || '';
                    })(),
                  },
                  valor_comissao: grossProfit,
                  descricao: `Comissão sobre venda turística — ${destinationName || ''}`,
                  data: saleDate,
                }}
              />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Disponível apenas em vendas confirmadas.</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions — barra sticky dentro da página */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleCancel} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">Cancelar</Button>
            {saleStatus === 'active' ? (
              <>
                <Button variant="outline" onClick={() => handleExportServicesVoucher()}><Download className="h-4 w-4 mr-1" /> Voucher Serviços</Button>
                <Button variant="outline" onClick={() => handleExportAirlineVoucher()}><Plane className="h-4 w-4 mr-1" /> Voucher Aéreo</Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-foreground text-background hover:bg-foreground/90 gap-1">
                    <FileText className="h-4 w-4" /> Proposta
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleExportDraftPdf}>
                    <FileText className="h-4 w-4 mr-2" /> Gerar PDF da proposta
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted">F8</span>
                  </DropdownMenuItem>
                  {editSaleId && (
                    <DropdownMenuItem onClick={handleGenerateLink}>
                      <Link2 className="h-4 w-4 mr-2" /> Link Proposta
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted">F9</span>
                    </DropdownMenuItem>
                  )}
                  {editSaleId && isQuoteMode && (
                    <DropdownMenuItem onClick={handleGenerateClientBuildsLink}>
                      <Sparkles className="h-4 w-4 mr-2" /> Cliente Monta Proposta
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex-1" />
            {isQuoteMode && (
              <Button onClick={handleSaveDraft} disabled={savingDraft} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                {savingDraft ? (<><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" /> Salvando...</>) : (<>Salvar cotação <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white">F10</span></>)}
              </Button>
            )}
            <Button onClick={handleSave} className={`gap-1 ${isQuoteMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}>
              {saleStatus === 'active' ? (<>Salvar Venda <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-background/20">F10</span></>) : (
                <><ShieldCheck className="h-4 w-4" /> Converter em venda <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-background/20">F11</span></>
              )}
            </Button>
          </div>
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
          onClose={() => { setPdfImportOpen(false); setForceImportOptionId(null); }}
          serviceCatalog={serviceCatalog}
          marginMode="none"
          marginPercent={20}
          onImport={({ items: importedItems, tripInfo, quoteOptions: importedQuoteOptions, paymentTerms, generalNotes, selectedClient }) => {
            // Auto-enrich imported hotel items via TripAdvisor (search-hotel-ai).
            const enrichImportedHotels = async (its: any[]) => {
              const hotelItems = its.filter(i => i?.metadata?.type === 'hotel' && (i?.metadata?.hotel?.hotelName || i?.description));
              if (hotelItems.length === 0) return;
              const notFound: string[] = [];
              for (const it of hotelItems) {
                const name = (it.metadata?.hotel?.hotelName || it.description || '').trim();
                if (!name) continue;
                const location = it.metadata?.hotel?.city || it.metadata?.hotel?.country || '';
                try {
                  const { data, error } = await supabase.functions.invoke('search-hotel-ai', {
                    body: { hotelName: name, location },
                  });
                  if (error) throw error;
                  if (data?.success && data?.data) {
                    const h = data.data;
                    const imgs: string[] = data.images || [];
                    setItems(prev => prev.map((p: any) => {
                      const pName = (p.metadata?.hotel?.hotelName || p.description || '').trim();
                      if (p.metadata?.type !== 'hotel' || pName !== name) return p;
                      const existingHotel: any = p.metadata?.hotel || {};
                      const mergedImages = Array.from(new Set([...(existingHotel.images || []), ...imgs]));
                      return {
                        ...p,
                        metadata: {
                          ...p.metadata,
                          hotel: {
                            ...existingHotel,
                            hotelName: existingHotel.hotelName || h.name || name,
                            stars: existingHotel.stars || h.stars,
                            address: existingHotel.address || h.address,
                            city: existingHotel.city || h.city,
                            country: existingHotel.country || h.country,
                            description: existingHotel.description || h.description,
                            amenities: existingHotel.amenities?.length ? existingHotel.amenities : (h.amenities || []),
                            checkInTime: existingHotel.checkInTime || h.check_in_time,
                            checkOutTime: existingHotel.checkOutTime || h.check_out_time,
                            category: existingHotel.category || h.category,
                            highlights: existingHotel.highlights?.length ? existingHotel.highlights : (h.highlights || []),
                            images: mergedImages,
                            tripadvisorRating: h.tripadvisor_rating,
                            tripadvisorReviewsCount: h.tripadvisor_reviews_count,
                            tripadvisorRanking: h.tripadvisor_ranking,
                            tripadvisorBadges: h.tripadvisor_badges,
                            tripadvisorTopReviews: h.tripadvisor_top_reviews,
                            tripadvisorRatingBreakdown: h.tripadvisor_rating_breakdown,
                            tripadvisorPopularMentions: h.tripadvisor_popular_mentions,
                          },
                        },
                      };
                    }));
                  } else {
                    notFound.push(name);
                  }
                } catch (e) {
                  notFound.push(name);
                }
              }
              if (notFound.length > 0) {
                toast.warning(`Hotéis não encontrados no TripAdvisor: ${notFound.join(', ')}. Edite o serviço, ajuste o nome e clique em "Buscar no TripAdvisor".`, { duration: 8000 });
              }
            };

            // If triggered from inside a service (within a specific option), force all imported items into that option.
            if (forceImportOptionId) {
              const targetId = forceImportOptionId;
              const newItems: SaleItem[] = importedItems.map(item => ({
                description: item.description,
                cost_price: item.cost_price,
                rav: item.rav,
                markup_percent: 0,
                total_value: item.total_value,
                service_catalog_id: item.service_catalog_id,
                cost_center_id: item.cost_center_id,
                metadata: item.metadata || {},
                quote_option_id: targetId,
                quote_option_ids: [targetId],
              }));
              setItems(prev => [...prev, ...newItems]);
              setForceImportOptionId(null);
              if (generalNotes) setNotes(prev => prev ? `${prev}\n\n${generalNotes}` : generalNotes);
              toast.success(`${importedItems.length} serviço(s) adicionados à opção atual!`);
              enrichImportedHotels(newItems);
              return;
            }
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

            setItems(prev => {
              const fallbackOptionId = mappedOptions.length > 1
                ? mappedOptions[0].id
                : (quoteOptions[0]?.id || String(quoteOptions[0]?.order_index ?? 0));
              return [...prev, ...importedItems.map(item => {
                const resolvedId = mappedOptions.length > 1
                  ? (optionIdMap.get(item.quote_option_id || '0') || fallbackOptionId)
                  : fallbackOptionId;
                return {
                  description: item.description,
                  cost_price: item.cost_price,
                  rav: item.rav,
                  markup_percent: 0,
                  total_value: item.total_value,
                  service_catalog_id: item.service_catalog_id,
                  cost_center_id: item.cost_center_id,
                  metadata: item.metadata || {},
                  quote_option_id: resolvedId,
                  quote_option_ids: resolvedId ? [resolvedId] : undefined,
                };
              })];
            });

            if (selectedClient) {
              setClientName(selectedClient.full_name);
              setSelectedClientId(selectedClient.id);
            }

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
            enrichImportedHotels(importedItems);
          }}
        />

        <QuickClientModal
          open={quickClientOpen}
          onClose={() => setQuickClientOpen(false)}
          initialName={clientName}
          onClientCreated={(client) => { setClientName(client.full_name); fetchClients(); }}
        />

        <Dialog open={!!previewImageUrl} onOpenChange={(v) => !v && setPreviewImageUrl(null)}>
          <DialogContent className="max-w-5xl p-2">
            {previewImageUrl && (
              <img src={previewImageUrl} alt="Imagem ampliada" className="w-full max-h-[85vh] object-contain rounded" />
            )}
          </DialogContent>
        </Dialog>

        {editingItemIdx !== null && (
          <ServiceEditModal
            open={editingItemIdx !== null}
            onClose={() => setEditingItemIdx(null)}
            description={items[editingItemIdx]?.description || ''}
            metadata={items[editingItemIdx]?.metadata || {}}
            reservationNumber={items[editingItemIdx]?.reservation_number || ''}
            costPrice={items[editingItemIdx]?.cost_price || 0}
            rav={items[editingItemIdx]?.rav || 0}
            existingImages={itemImages[editingItemIdx] || []}
            onImportPdf={() => {
              const current = items[editingItemIdx];
              const optId = current?.quote_option_id
                || (current?.quote_option_ids && current.quote_option_ids[0])
                || activeOptionId
                || quoteOptions[0]?.id
                || String(quoteOptions[0]?.order_index ?? 0);
              setForceImportOptionId(optId);
              // Se o item atual está vazio (criado pelo "+ Adicionar serviço"), remove
              // para evitar que sobre um serviço em branco após a importação.
              const isEmpty = !current?.description
                && !(current?.cost_price)
                && !(current?.rav)
                && !(current?.metadata && Object.keys(current.metadata).length > 0);
              const idxToRemove = editingItemIdx;
              setEditingItemIdx(null);
              if (isEmpty) {
                setItems(prev => prev.filter((_, i) => i !== idxToRemove));
              }
              setTimeout(() => setPdfImportOpen(true), 100);
            }}
            onSave={(desc, meta, resNumber, newCost, newRav) => {
              setItems(prev => {
                const editedItem = prev[editingItemIdx];
                const updated = prev.map((item, i) => {
                  if (i === editingItemIdx) {
                    const cost = newCost ?? item.cost_price ?? 0;
                    const ravVal = newRav ?? item.rav ?? 0;
                    const total = cost + ravVal;
                    const markup = cost > 0 ? (ravVal / cost) * 100 : 0;
                    return {
                      ...item,
                      description: desc,
                      metadata: meta,
                      cost_price: cost,
                      rav: ravVal,
                      total_value: total,
                      markup_percent: markup,
                      ...(resNumber !== undefined ? { reservation_number: resNumber } : {}),
                    };
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
              // Auto-load airline cover image when main airline is set on aereo service
              if (meta.type === 'aereo' && meta.airlineId) {
                const existing = itemImages[editingItemIdx] || [];
                if (existing.length === 0) {
                  (async () => {
                    try {
                      const { data: airline } = await (supabase.from('airlines' as any).select('cover_image_url').eq('id', meta.airlineId).maybeSingle() as any);
                      if (airline?.cover_image_url) {
                        setItemImages(prev => ({ ...prev, [editingItemIdx]: [airline.cover_image_url, ...(prev[editingItemIdx] || [])] }));
                      }
                    } catch {}
                  })();
                }
              }
              // Auto-save after service detail save (preserve status for active sales)
              if (saleStatus !== 'active') {
                setTimeout(() => handleSilentSaveDraft(), 300);
              }
            }}
            onHotelImagesFound={(images) => {
              setItemImages(prev => ({
                ...prev,
                [editingItemIdx]: images,
              }));
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
