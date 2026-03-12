import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Plus, Trash2, Upload, FileText, ExternalLink, FileUp, ChevronsUpDown, Download, Link2, ImagePlus, X, Edit, Paperclip, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { generateVoucherPdf, VoucherPdfData } from '@/lib/generateVoucherPdf';
import { generatePremiumQuotePdf, PremiumPdfData } from '@/lib/generatePremiumQuotePdf';
import PdfImportModal from '@/components/PdfImportModal';
import QuickClientModal from '@/components/QuickClientModal';
import ServiceEditModal, { ServiceMetadata } from '@/components/ServiceEditModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { maskPhone, maskCpf, maskEmail, maskCurrency, parseCurrency } from '@/lib/masks';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

interface SaleItem {
  id?: string;
  description: string;
  cost_price: number;
  rav: number;
  total_value: number;
  service_catalog_id?: string;
  cost_center_id?: string;
  metadata?: ServiceMetadata;
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
}

interface SupplierOption { id: string; name: string; }
interface SellerOption { id: string; full_name: string; }
interface ClientOption { id: string; full_name: string; }
interface Receivable { installment_number: number; due_date: string; amount: number; }
interface CostCenter { id: string; name: string; }
interface CardRateEntry { installments: number; rate: number; }

interface ProposalPaymentOption {
  method: string;
  label: string;
  installments: number;
  installmentValue: number;
  totalValue: number;
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

  const [allSuppliers, setAllSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [addingSupplierId, setAddingSupplierId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogOption[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [installments, setInstallments] = useState(1);
  const [cardPaymentType, setCardPaymentType] = useState('');
  const [feeRate, setFeeRate] = useState(0);
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
  const [itemImages, setItemImages] = useState<Record<number, string[]>>({});
  const [uploadingItemImages, setUploadingItemImages] = useState<Record<number, boolean>>({});
  const [uploadingDestImage, setUploadingDestImage] = useState(false);
  const [internalFiles, setInternalFiles] = useState<InternalFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [proposalPaymentOptions, setProposalPaymentOptions] = useState<ProposalPaymentOption[]>([
    { method: 'pix', label: 'PIX / À Vista', installments: 1, installmentValue: 0, totalValue: 0, enabled: false },
    { method: 'credito_3x', label: 'Cartão 3x', installments: 3, installmentValue: 0, totalValue: 0, enabled: false },
    { method: 'credito_6x', label: 'Cartão 6x', installments: 6, installmentValue: 0, totalValue: 0, enabled: false },
    { method: 'credito_10x', label: 'Cartão 10x', installments: 10, installmentValue: 0, totalValue: 0, enabled: false },
    { method: 'credito_12x', label: 'Cartão 12x', installments: 12, installmentValue: 0, totalValue: 0, enabled: false },
    { method: 'boleto', label: 'Boleto Bancário', installments: 1, installmentValue: 0, totalValue: 0, enabled: false },
  ]);

  // Service edit modal
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [showIndividualValues, setShowIndividualValues] = useState(true);
  const [saleStatus, setSaleStatus] = useState<'draft' | 'active' | 'new'>('new');

  useEffect(() => {
    if (initialEditSaleId) loadSale(initialEditSaleId);
  }, [initialEditSaleId]);

  const loadSale = async (id: string) => {
    const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single();
    if (!sale) return;
    setSaleStatus(sale.status === 'active' ? 'active' : 'draft');
    setQuoteId(sale.quote_id || '');
    setClientName(sale.client_name);
    setSaleDate(sale.sale_date);
    setPaymentMethod(sale.payment_method || 'pix');
    setInstallments(sale.installments || 1);
    setCardPaymentType((sale as any).card_payment_type || '');
    setFeeRate(Number(sale.card_fee_rate) || 0);
    setCommissionRate(Number(sale.commission_rate) || 0);
    setSaleInterest(Number((sale as any).sale_interest) || 0);
    setSellerId((sale as any).seller_id || '');
    setNotes(sale.notes || '');
    setPassengersCount(Number((sale as any).passengers_count) || 1);
    setTripNights(Number((sale as any).trip_nights) || 0);
    if (Number((sale as any).trip_nights) > 0) setNightsManuallySet(true);
    setTripStartDate((sale as any).trip_start_date || '');
    setTripEndDate((sale as any).trip_end_date || '');
    setDestinationName((sale as any).destination_name || '');
    setInvoiceUrl((sale as any).invoice_url || '');
    setDestinationImageUrl((sale as any).destination_image_url || '');
    // Load proposal payment options
    if ((sale as any).proposal_payment_options && Array.isArray((sale as any).proposal_payment_options)) {
      setProposalPaymentOptions((sale as any).proposal_payment_options);
    }
    if ((sale as any).show_individual_values !== undefined) {
      setShowIndividualValues((sale as any).show_individual_values);
    }
    if ((sale as any).invoice_url) {
      const parts = (sale as any).invoice_url.split('/');
      setInvoiceFileName(decodeURIComponent(parts[parts.length - 1]) || 'nota-fiscal.pdf');
    }

    const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', id).order('sort_order');
    if (saleItems) {
      setItems(saleItems.map(i => ({
        id: i.id, description: i.description, cost_price: Number(i.cost_price), rav: Number(i.rav),
        total_value: Number(i.total_value), service_catalog_id: i.service_catalog_id || undefined,
        cost_center_id: i.cost_center_id || undefined,
        metadata: (i as any).metadata || {},
      })));
      
      const imgMap: Record<number, string[]> = {};
      for (let idx = 0; idx < saleItems.length; idx++) {
        const { data: imgs } = await (supabase.from('sale_item_images' as any) as any).select('*').eq('sale_item_id', saleItems[idx].id).order('sort_order');
        if (imgs && imgs.length > 0) {
          imgMap[idx] = imgs.map((img: any) => img.image_url);
        }
      }
      setItemImages(imgMap);
    }

    const { data: saleSups } = await supabase.from('sale_suppliers').select('supplier_id').eq('sale_id', id);
    if (saleSups) setSelectedSupplierIds(saleSups.map(s => s.supplier_id));

    const { data: recs } = await supabase.from('receivables').select('*').eq('sale_id', id).order('installment_number');
    if (recs) setReceivables(recs.map(r => ({ installment_number: r.installment_number, due_date: r.due_date || '', amount: Number(r.amount) })));

    const { data: pax } = await supabase.from('sale_passengers' as any).select('*').eq('sale_id', id).order('sort_order');
    if (pax) setPassengers((pax as any[]).map(p => ({
      id: p.id, first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date || '',
      document_type: p.document_type || 'cpf', document_number: p.document_number || '',
      document_expiry: p.document_expiry || '', email: p.email || '', phone: p.phone || '', is_main: p.is_main || false,
    })));

    // Load internal files
    const { data: files } = await (supabase.from('sale_internal_files' as any) as any).select('*').eq('sale_id', id).order('created_at');
    if (files) setInternalFiles(files.map((f: any) => ({ id: f.id, file_name: f.file_name, file_url: f.file_url })));
  };

  const fetchClients = () => {
    let q = supabase.from('clients').select('id, full_name').order('full_name');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    q.then(({ data }) => { if (data) setAllClients(data); });
  };

  useEffect(() => {
    fetchClients();
    supabase.from('suppliers').select('id, name').order('name').then(({ data }) => { if (data) setAllSuppliers(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').order('name').then(({ data }) => { if (data) setCostCenters(data); });
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
      (supabase.from('sellers') as any).select('id, full_name').eq('empresa_id', activeCompany.id).eq('status', 'active').order('full_name').then(({ data }: any) => { if (data) setAllSellers(data); });
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

  useEffect(() => {
    if (paymentMethod !== 'credito' || !cardPaymentType) return;
    const rates = cardPaymentType === 'ec' ? ecRates : linkRates;
    const found = rates.find(r => r.installments === installments);
    if (found) setFeeRate(found.rate);
  }, [cardPaymentType, installments, ecRates, linkRates, paymentMethod]);

  const totalSale = useMemo(() => items.reduce((s, i) => s + i.total_value, 0), [items]);
  const totalSaleWithInterest = totalSale + saleInterest;
  const totalCost = useMemo(() => items.reduce((s, i) => s + i.cost_price, 0), [items]);
  const grossProfit = totalSaleWithInterest - totalCost;
  const commissionValue = grossProfit * (commissionRate / 100);
  const cardFeeValue = paymentMethod === 'credito' ? totalSaleWithInterest * (feeRate / 100) : 0;
  const netProfit = grossProfit - commissionValue - cardFeeValue;

  // Auto-recalculate proposal payment options when total changes
  useEffect(() => {
    setProposalPaymentOptions(prev => prev.map(opt => {
      const val = totalSaleWithInterest;
      const perInstallment = opt.installments > 0 ? Math.round((val / opt.installments) * 100) / 100 : val;
      return { ...opt, totalValue: val, installmentValue: perInstallment };
    }));
  }, [totalSaleWithInterest]);

  useEffect(() => {
    if (paymentMethod === 'boleto' && installments > 1 && boletoInterestRate > 0) {
      const monthlyRate = boletoInterestRate / 100;
      const pmt = totalSaleWithInterest * (monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1);
      const recs: Receivable[] = [];
      const baseDate = new Date(saleDate || new Date());
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        recs.push({ installment_number: i, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(pmt * 100) / 100 });
      }
      setReceivables(recs);
      return;
    }
    if (paymentMethod === 'boleto' && installments > 1) {
      const perInstallment = totalSaleWithInterest / installments;
      const recs: Receivable[] = [];
      const baseDate = new Date(saleDate || new Date());
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        recs.push({ installment_number: i, due_date: dueDate.toISOString().split('T')[0], amount: Math.round(perInstallment * 100) / 100 });
      }
      setReceivables(recs);
      return;
    }
    if (paymentMethod !== 'credito') {
      setReceivables([{ installment_number: 1, due_date: '', amount: totalSaleWithInterest }]);
      return;
    }
    const perInstallment = installments > 0 ? totalSaleWithInterest / installments : totalSaleWithInterest;
    const recs: Receivable[] = [];
    const baseDate = new Date(saleDate || new Date());
    for (let i = 1; i <= installments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + i * 30);
      recs.push({ installment_number: i, due_date: dueDate.toISOString().split('T')[0], amount: perInstallment });
    }
    setReceivables(recs);
  }, [installments, paymentMethod, totalSaleWithInterest, boletoInterestRate, saleDate]);

  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'cost_price' || field === 'rav') updated.total_value = updated.cost_price + updated.rav;
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
    }]);
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
        installments: paymentMethod === 'credito' ? installments : 1,
        card_charge_type: '',
        card_payment_type: paymentMethod === 'credito' ? cardPaymentType : '',
        card_fee_rate: paymentMethod === 'credito' ? feeRate : 0,
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
        status,
        created_by: userEmail,
        updated_by: userEmail,
        empresa_id: activeCompany?.id || null,
        seller_id: sellerId && sellerId !== 'none' ? sellerId : null,
        invoice_url: invoiceUrl || null,
        destination_image_url: destinationImageUrl || null,
        sale_interest: saleInterest,
        passengers_count: passengersCount,
        trip_nights: tripNights,
        trip_start_date: tripStartDate || null,
        trip_end_date: tripEndDate || null,
        destination_name: destinationName || '',
      } as any,
      userEmail,
    };
  };

  const saveSaleCore = async (salePayload: any, userEmail: string) => {
    let saleId = editSaleId;

    if (editSaleId) {
      const { error } = await supabase.from('sales').update({ ...salePayload, updated_by: userEmail } as any).eq('id', editSaleId);
      if (error) { toast.error('Erro ao atualizar venda'); return null; }
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
    } else {
      const { data, error } = await supabase.from('sales').insert(salePayload as any).select('id').single();
      if (error || !data) { toast.error('Erro ao criar venda'); return null; }
      saleId = data.id;
    }

    if (items.length > 0) {
      const { data: insertedItems } = await supabase.from('sale_items').insert(items.map((item, idx) => ({
        sale_id: saleId, description: item.description, cost_price: item.cost_price, rav: item.rav,
        total_value: item.total_value, sort_order: idx,
        service_catalog_id: item.service_catalog_id || null, cost_center_id: item.cost_center_id || null,
        metadata: item.metadata || {},
      } as any))).select('id');

      if (insertedItems) {
        for (let idx = 0; idx < insertedItems.length; idx++) {
          const images = itemImages[idx];
          if (images && images.length > 0) {
            await (supabase.from('sale_item_images' as any) as any).insert(
              images.map((url: string, sortIdx: number) => ({
                sale_item_id: insertedItems[idx].id, image_url: url, sort_order: sortIdx,
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

  const handleSaveDraft = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    setSavingDraft(true);
    try {
      const { payload, userEmail } = await buildSalePayload('draft');
      if (editSaleId) {
        await supabase.from('receivables').delete().eq('sale_id', editSaleId);
        await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      }
      const saleId = await saveSaleCore(payload, userEmail);
      if (!saleId) { setSavingDraft(false); return; }
      if (!editSaleId) setEditSaleId(saleId);
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
        toast.success('Rascunho salvo automaticamente.');
      }
    } catch { /* silent */ }
    finally { setSavingDraft(false); }
  };

  const handleSave = async () => {
    if (!clientName.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    const { payload, userEmail } = await buildSalePayload('active');

    if (editSaleId) {
      await supabase.from('receivables').delete().eq('sale_id', editSaleId);
      await supabase.from('accounts_payable').delete().eq('sale_id', editSaleId);
      await supabase.from('seller_commissions').delete().eq('sale_id', editSaleId);
      await supabase.from('reservations').delete().eq('sale_id', editSaleId);
    }

    const saleId = await saveSaleCore(payload, userEmail);
    if (!saleId) return;

    if (receivables.length > 0) {
      await supabase.from('receivables').insert(receivables.map(r => ({
        sale_id: saleId, installment_number: r.installment_number, due_date: r.due_date || null, amount: r.amount,
        client_name: clientName, description: `Venda - ${clientName}`, status: 'pending', origin_type: 'sale',
        empresa_id: activeCompany?.id || null,
      } as any)));
    }

    if (totalCost > 0 && selectedSupplierIds.length > 0) {
      const costPerSupplier = totalCost / selectedSupplierIds.length;
      await supabase.from('accounts_payable').insert(selectedSupplierIds.map(sid => ({
        sale_id: saleId, supplier_id: sid, amount: costPerSupplier,
        due_date: saleDate, description: `Venda - ${clientName}`, status: 'open', origin_type: 'sale',
        empresa_id: activeCompany?.id || null,
      })));
    }

    if (quoteId) {
      await supabase.from('quotes').update({ status: 'concluido' }).eq('id', quoteId);
    }

    if (selectedSupplierIds.length > 0) {
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
      if (editSaleId && activeCompany?.id) {
        await supabase.from('calendar_events').delete().eq('empresa_id', activeCompany.id).ilike('title', `%${clientName}%`);
      }
      const mainPassenger = passengers.find(p => p.is_main) || passengers[0];
      const eventTitle = `${mainPassenger.first_name} ${mainPassenger.last_name}`.trim() || clientName;
      const eventDate = tripStartDate || saleDate;
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

    toast.success(editSaleId ? 'Venda atualizada! Financeiro regenerado.' : 'Venda convertida com sucesso! Financeiro gerado.');
    navigate('/sales');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExportVoucher = async () => {
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
        hotels.push({
          name: h.hotelName,
          description: h.description,
          checkIn: h.checkInDate,
          checkOut: h.checkOutDate,
          stars: h.stars,
          amenities: h.amenities,
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
      destination: items.some(i => i.metadata?.type === 'hotel') ? items.find(i => i.metadata?.type === 'hotel')?.metadata?.hotel?.hotelName || '' : '',
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
      totalTrip: totalSaleWithInterest,
      reservations,
      payment: {
        method: paymentMethod,
        installments,
        receivables: receivables.map(r => ({ number: r.installment_number, amount: r.amount, dueDate: r.due_date || undefined })),
      },
      notes: notes || undefined,
      saleDate,
      shortId,
    };

    const doc = generateVoucherPdf(voucherData);
    doc.save(`voucher-${clientName.replace(/\s+/g, '-').toLowerCase()}-${saleDate}.pdf`);
    toast.success('Voucher gerado com sucesso!');
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
      client: { name: clientName },
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
        installments,
        receivables: receivables.map(r => ({ number: r.installment_number, amount: r.amount, dueDate: r.due_date || undefined })),
      },
      notes: notes || undefined,
      destinationImageBase64,
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

  const getServiceTypeLabel = (metadata?: ServiceMetadata) => {
    if (!metadata?.type) return null;
    const labels: Record<string, string> = { aereo: '✈️', hotel: '🏨', carro: '🚗', seguro: '🛡️', experiencia: '🎟️', adicional: '📋' };
    return labels[metadata.type] || null;
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{editSaleId ? 'Editar Venda' : 'Nova Venda'}</h1>
          <Button variant="outline" onClick={() => setPdfImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />📄 Importar Orçamento (PDF)
          </Button>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da Venda</CardTitle></CardHeader>
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
                              <CommandItem key={c.id} value={c.full_name} onSelect={() => { setClientName(c.full_name); setClientPopoverOpen(false); }}>
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
                <Input type="date" value={tripStartDate} onChange={e => setTripStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Final da Viagem</Label>
                <Input type="date" value={tripEndDate} onChange={e => setTripEndDate(e.target.value)} />
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
            <div className="col-span-full mt-2">
              <Label>Imagem do Destino (para proposta)</Label>
              <div className="flex items-center gap-3 mt-1">
                {destinationImageUrl ? (
                  <div className="relative">
                    <img src={destinationImageUrl} alt="Destino" className="h-20 w-32 object-cover rounded border" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => setDestinationImageUrl('')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passengers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Passageiros da Reserva</CardTitle>
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
                  <div><Label className="text-xs">Nome</Label><Input value={pax.first_name} onChange={e => updatePassenger(idx, 'first_name', e.target.value)} placeholder="Nome" /></div>
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
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes + Internal Files - moved above suppliers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Observação da Venda</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações internas sobre a venda..." rows={6} className="min-h-[120px]" />
            
            {/* Internal Files */}
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

        {/* Suppliers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Fornecedores da Venda</CardTitle></CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Serviços da Venda */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Serviços da Venda</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems(prev => [...prev, { description: '', cost_price: 0, rav: 0, total_value: 0, metadata: {} }])}>
              <Plus className="h-4 w-4 mr-1" />Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 sm:p-0">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead className="min-w-[140px]">Serviço</TableHead>
                    <TableHead className="min-w-[100px]">Descrição</TableHead>
                    <TableHead className="w-36">Custo</TableHead>
                    <TableHead className="w-32">RAV</TableHead>
                    <TableHead className="w-36">Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <TableRow>
                        <TableCell className="px-1">
                          <div className="flex flex-col items-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => moveItem(idx, 'up')}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === items.length - 1} onClick={() => moveItem(idx, 'down')}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={item.service_catalog_id || 'manual'} onValueChange={(v) => { const svc = serviceCatalog.find(s => s.id === v); if (svc) { updateItem(idx, 'service_catalog_id', svc.id); updateItem(idx, 'description', svc.name); if (svc.cost_center_id) updateItem(idx, 'cost_center_id', svc.cost_center_id); } }}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Selecione um serviço</SelectItem>
                              {serviceCatalog.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal max-w-[120px]" onClick={() => setEditingItemIdx(idx)}>
                            <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate text-xs">{getServiceTypeLabel(item.metadata)}{item.description || 'Editar...'}</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={maskCurrency(item.cost_price)}
                            onChange={e => updateItem(idx, 'cost_price', parseCurrency(e.target.value))}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={maskCurrency(item.rav)}
                            onChange={e => updateItem(idx, 'rav', parseCurrency(e.target.value))}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={maskCurrency(item.total_value)}
                            disabled
                            className="bg-muted text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-b-2">
                        <TableCell colSpan={7} className="py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {uploadingItemImages[idx] ? (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground border border-dashed rounded px-2 py-1"><span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />Carregando...</span>
                            ) : (
                              <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded px-2 py-1">
                                <ImagePlus className="h-3 w-3" />Imagens<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleItemImageUpload(idx, e)} />
                              </label>
                            )}
                            {(itemImages[idx] || []).map((url, imgIdx) => (
                              <div key={imgIdx} className="relative group flex flex-col items-center">
                                {imgIdx === 0 && (itemImages[idx] || []).length > 1 && (
                                  <span className="text-[9px] font-semibold text-primary mb-0.5">CAPA</span>
                                )}
                                <div className="relative">
                                  <img src={url} alt="" className={`h-10 w-14 object-cover rounded border ${imgIdx === 0 ? 'ring-2 ring-primary' : ''}`} />
                                  <button type="button" onClick={() => removeItemImage(idx, imgIdx)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
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
                    <Select value={item.service_catalog_id || 'manual'} onValueChange={(v) => { const svc = serviceCatalog.find(s => s.id === v); if (svc) { updateItem(idx, 'service_catalog_id', svc.id); updateItem(idx, 'description', svc.name); if (svc.cost_center_id) updateItem(idx, 'cost_center_id', svc.cost_center_id); } }}>
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

        {/* Payment Method */}
        <Card>
          <CardHeader><CardTitle className="text-base">Forma de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'pix', label: 'Pix' },
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'boleto', label: 'Boleto' },
                { value: 'credito', label: 'Cartão de Crédito' },
                { value: 'debito', label: 'Cartão de Débito' },
              ].map(opt => (
                <Button key={opt.value} variant={paymentMethod === opt.value ? 'default' : 'outline'} className="w-full" onClick={() => setPaymentMethod(opt.value)}>
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Juros na venda? (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={saleInterest || ''} onChange={e => setSaleInterest(parseFloat(e.target.value) || 0)} placeholder="0,00" />
                  <p className="text-xs text-muted-foreground mt-1">Valor somado internamente. Não aparece para o cliente.</p>
                </div>
                {saleInterest > 0 && (
                  <>
                    <div><p className="text-sm text-muted-foreground">Total dos serviços</p><p className="text-sm font-medium">{fmt(totalSale)}</p></div>
                    <div><p className="text-sm text-muted-foreground">Total com juros</p><p className="text-sm font-bold text-primary">{fmt(totalSaleWithInterest)}</p></div>
                  </>
                )}
              </div>
            </div>

            {paymentMethod === 'credito' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de Pagamento</Label>
                    <Select value={cardPaymentType} onValueChange={setCardPaymentType}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent><SelectItem value="ec">EC (Máquina)</SelectItem><SelectItem value="link">Link de Pagamento</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Parcelamento</Label>
                    <Select value={String(installments)} onValueChange={v => setInstallments(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 18 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Taxa (%)</Label>
                    <Input type="number" step="0.01" value={feeRate} onChange={e => setFeeRate(parseFloat(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Preenchida automaticamente, editável manualmente</p>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'boleto' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Select value={String(installments)} onValueChange={v => setInstallments(parseInt(v))}>
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
                {installments > 1 && boletoInterestRate > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p>Valor total com juros: <strong>{fmt(receivables.reduce((s, r) => s + r.amount, 0))}</strong></p>
                    <p>Valor de cada parcela: <strong>{fmt(receivables[0]?.amount || 0)}</strong></p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposal Payment Options */}
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
                                  installmentValue: Math.round((o.totalValue / inst) * 100) / 100,
                                } : o));
                              }}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Valor/Parcela</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={opt.installmentValue}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setProposalPaymentOptions(prev => prev.map((o, i) => i === idx ? {
                                  ...o,
                                  installmentValue: val,
                                  totalValue: val * o.installments,
                                } : o));
                              }}
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {opt.enabled && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-primary">{fmt(opt.totalValue)}</p>
                      </div>
                    )}
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
                installmentValue: totalSaleWithInterest,
                totalValue: totalSaleWithInterest,
                enabled: true,
              }])}
            >
              <Plus className="h-4 w-4 mr-1" />Adicionar opção
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Controle de Recebíveis</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="w-24">Parcela</TableHead><TableHead>Data de Recebimento</TableHead><TableHead className="w-40">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {receivables.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{r.installment_number}ª</TableCell>
                    <TableCell><Input type="date" value={r.due_date} onChange={e => setReceivables(prev => prev.map((rec, i) => i === idx ? { ...rec, due_date: e.target.value } : rec))} /></TableCell>
                    <TableCell className="font-medium">{fmt(r.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Upload */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Nota Fiscal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
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

        {/* Notes section moved above suppliers */}

        {/* Financial Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total da Venda</p>
                <p className="text-xl font-bold">{fmt(totalSaleWithInterest)}</p>
                {saleInterest > 0 && <p className="text-xs text-muted-foreground">(Serviços: {fmt(totalSale)} + Juros: {fmt(saleInterest)})</p>}
              </div>
              <div><p className="text-sm text-muted-foreground">Total Custo Fornecedor</p><p className="text-xl font-bold">{fmt(totalCost)}</p></div>
              <div><p className="text-sm text-muted-foreground">Lucro Bruto</p><p className="text-xl font-bold text-primary">{fmt(grossProfit)}</p></div>
              <div>
                <Label className="text-sm text-muted-foreground">Comissão (%)</Label>
                <Input type="number" step="0.01" value={commissionRate} onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)} className="mt-1 w-24" />
                <p className="text-sm mt-1">{fmt(commissionValue)}</p>
              </div>
              {paymentMethod === 'credito' && (
                <div><p className="text-sm text-muted-foreground">Taxa Cartão ({feeRate}%)</p><p className="text-lg font-semibold text-destructive">{fmt(cardFeeValue)}</p></div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido Final</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-2 pb-8">
          <Button variant="destructive" onClick={handleCancel} className="w-full sm:w-auto">Cancelar</Button>
          {saleStatus === 'active' ? (
            <Button variant="outline" onClick={handleExportVoucher} className="w-full sm:w-auto"><Download className="h-4 w-4 mr-1" /> Gerar Voucher</Button>
          ) : (
            <Button variant="outline" onClick={handleExportDraftPdf} className="w-full sm:w-auto"><Download className="h-4 w-4 mr-1" /> Gerar PDF Rascunho</Button>
          )}
          {editSaleId && (
            <Button variant="outline" onClick={handleGenerateLink} className="w-full sm:w-auto"><Link2 className="h-4 w-4 mr-1" /> Gerar Link Proposta</Button>
          )}
          <Button variant="secondary" onClick={handleSaveDraft} disabled={savingDraft} className="w-full sm:w-auto">
            {savingDraft ? (<><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" /> Salvando...</>) : 'Salvar Rascunho'}
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">{editSaleId ? 'Gerar Venda' : 'Converter em Venda'}</Button>
        </div>

        <PdfImportModal
          open={pdfImportOpen}
          onClose={() => setPdfImportOpen(false)}
          serviceCatalog={serviceCatalog}
          marginMode="none"
          marginPercent={20}
          onImport={(importedItems, _tripInfo) => {
            setItems(prev => [...prev, ...importedItems.map(item => ({
              description: item.description,
              cost_price: item.cost_price,
              rav: item.rav,
              total_value: item.total_value,
              service_catalog_id: item.service_catalog_id,
              cost_center_id: item.cost_center_id,
              metadata: item.metadata || {},
            }))]);
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
              // Auto-save draft after service detail save
              setTimeout(() => handleSilentSaveDraft(), 300);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
