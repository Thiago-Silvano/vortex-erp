import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { parseOFX, generateTransactionHash, type OFXTransaction } from "@/lib/ofxParser";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  Check,
  X,
  Link2,
  Unlink,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Search,
  Plus,
  Eye,
  ArrowLeft,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_digit: string;
  agency: string;
  color: string;
  empresa_id: string;
  initial_balance: number;
  bank_code: string;
  is_default: boolean;
  holder_name: string;
}
interface BankTx {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: string;
  reconciliation_status: string;
  reference_number: string;
  reconciled_with_type: string | null;
  reconciled_with_id: string | null;
  reconciliation_note: string;
  category: string;
  import_batch: string;
}
interface FinancialTitle {
  id: string;
  type: "payable" | "receivable";
  description: string;
  amount: number;
  due_date: string;
  status: string;
  client_name?: string;
  supplier_name?: string;
  is_reconciled?: boolean;
}

type SortDir = 'asc' | 'desc';
interface SortState<K extends string> { key: K; dir: SortDir; }

type TxSortKey = 'date' | 'description' | 'amount' | 'status';
type TitleSortKey = 'type' | 'description' | 'due_date' | 'amount' | 'reconciliation';

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  reconciled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-blue-100 text-blue-800 border-blue-200",
  ignored: "bg-gray-100 text-gray-600 border-gray-200",
};
const statusLabels: Record<string, string> = {
  pending: "Pendente",
  reconciled: "Conciliado",
  partial: "Parcial",
  ignored: "Ignorado",
};

export default function BankReconciliationPage() {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [selectedAccount, setSelectedAccount] = useState(searchParams.get("account") || "");
  const [transactions, setTransactions] = useState<BankTx[]>([]);
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchTx, setSearchTx] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [txSort, setTxSort] = useState<SortState<TxSortKey>>({ key: 'date', dir: 'asc' });
  const [titleSort, setTitleSort] = useState<SortState<TitleSortKey>>({ key: 'due_date', dir: 'asc' });
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BankTx | null>(null);
  const [manualNote, setManualNote] = useState("");
  const [manualType, setManualType] = useState("");
  const [showIgnoredView, setShowIgnoredView] = useState(false);
  const [selectedTitleIds, setSelectedTitleIds] = useState<Set<string>>(new Set());

  // Quick-create title inline
  const [quickCreateType, setQuickCreateType] = useState<"payable" | "receivable" | null>(null);
  const [qcDescription, setQcDescription] = useState("");
  const [qcAmount, setQcAmount] = useState("");
  const [qcDueDate, setQcDueDate] = useState("");
  const [qcClientName, setQcClientName] = useState("");
  const [qcSaving, setQcSaving] = useState(false);

  const resetQuickCreate = () => {
    setQuickCreateType(null);
    setQcDescription("");
    setQcAmount("");
    setQcDueDate("");
    setQcClientName("");
  };

  const handleQuickCreate = async () => {
    if (!qcDescription || !qcAmount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const acct = accounts.find((a) => a.id === selectedAccount);
    const empresaId = acct?.empresa_id || activeCompany?.id;
    if (!empresaId) return;
    setQcSaving(true);
    if (quickCreateType === "payable") {
      const { error } = await supabase.from("accounts_payable").insert({
        empresa_id: empresaId,
        description: qcDescription,
        amount: parseFloat(qcAmount),
        due_date: qcDueDate || null,
        status: "open",
        origin_type: "manual",
      } as any);
      if (error) { toast.error("Erro ao criar"); setQcSaving(false); return; }
    } else {
      const { error } = await supabase.from("receivables").insert({
        empresa_id: empresaId,
        description: qcDescription,
        amount: parseFloat(qcAmount),
        due_date: qcDueDate || null,
        client_name: qcClientName || "",
        status: "pending",
        origin_type: "manual",
      } as any);
      if (error) { toast.error("Erro ao criar"); setQcSaving(false); return; }
    }
    toast.success(quickCreateType === "payable" ? "Conta a pagar criada" : "Conta a receber criada");
    resetQuickCreate();
    setQcSaving(false);
    loadTransactions();
  };


  // Stats
  const totalImported = transactions.length;
  const totalReconciled = transactions.filter((t) => t.reconciliation_status === "reconciled").length;
  const totalPending = transactions.filter((t) => t.reconciliation_status === "pending").length;
  const totalIgnored = transactions.filter((t) => t.reconciliation_status === "ignored").length;
  const sumCredits = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const sumDebits = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Number(t.amount), 0);

  useEffect(() => {
    if (!activeCompany) return;
    supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_digit, agency, color, empresa_id")
      .eq("empresa_id", activeCompany.id)
      .eq("status", "active")
      .order("bank_name")
      .then(({ data }) => setAccounts((data as any[]) || []));
  }, [activeCompany]);

  const loadTransactions = useCallback(async () => {
    if (!selectedAccount || !activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("bank_account_id", selectedAccount)
      .eq("empresa_id", activeCompany.id)
      .order("transaction_date", { ascending: false })
      .limit(500);
    setTransactions((data as any[]) || []);

    // Load financial titles — use the bank account's empresa_id so titles
    // always match the company that owns the bank account being reconciled.
    const acct = accounts.find((a) => a.id === selectedAccount);
    const titlesEmpresaId = (acct as any)?.empresa_id || activeCompany.id;
    const [payRes, recRes] = await Promise.all([
      supabase
        .from("accounts_payable")
        .select("id, description, amount, due_date, status, supplier_id, sale_id")
        .eq("empresa_id", titlesEmpresaId),
      supabase
        .from("receivables")
        .select("id, description, amount, due_date, status, client_name, sale_id")
        .eq("empresa_id", titlesEmpresaId),
    ]);
    // Exclude titles linked to draft sales
    const allSaleIds = [
      ...((payRes.data as any[]) || []).map((p) => p.sale_id),
      ...((recRes.data as any[]) || []).map((r) => r.sale_id),
    ].filter(Boolean);
    const uniqueSaleIds = [...new Set(allSaleIds)];
    let draftIds: string[] = [];
    if (uniqueSaleIds.length > 0) {
      const { data: drafts } = await supabase.from("sales").select("id").in("id", uniqueSaleIds).eq("status", "draft");
      draftIds = (drafts || []).map((d) => d.id);
    }

    // Get reconciled title IDs from bank transactions
    const { data: reconciledTxs } = await supabase
      .from("bank_transactions")
      .select("reconciled_with_id")
      .eq("empresa_id", activeCompany.id)
      .eq("reconciliation_status", "reconciled")
      .not("reconciled_with_id", "is", null);
    // Support comma-separated IDs in reconciled_with_id
    const reconciledIds = new Set<string>();
    (reconciledTxs || []).forEach((t) => {
      if (t.reconciled_with_id) {
        t.reconciled_with_id.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((id: string) => reconciledIds.add(id));
      }
    });

    const payables: FinancialTitle[] = ((payRes.data as any[]) || [])
      .filter((p) => !p.sale_id || !draftIds.includes(p.sale_id))
      .map((p) => ({
        id: p.id,
        type: "payable",
        description: p.description || "",
        amount: Number(p.amount) || 0,
        due_date: p.due_date || "",
        status: p.status,
        supplier_name: "",
        is_reconciled: reconciledIds.has(p.id),
      }));
    const receivables: FinancialTitle[] = ((recRes.data as any[]) || [])
      .filter((r) => !r.sale_id || !draftIds.includes(r.sale_id))
      .map((r) => ({
        id: r.id,
        type: "receivable",
        description: r.description || "",
        amount: Number(r.amount) || 0,
        due_date: r.due_date || "",
        status: r.status,
        client_name: r.client_name || "",
        is_reconciled: reconciledIds.has(r.id),
      }));
    setTitles([...payables, ...receivables]);
    setLoading(false);
  }, [selectedAccount, activeCompany]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // OFX Import
  const handleOFXImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccount || !activeCompany) return;

    const text = await file.text();
    const ofx = parseOFX(text);

    if (ofx.transactions.length === 0) {
      toast.error("Nenhuma transação encontrada no arquivo OFX");
      return;
    }

    const batchId = `${Date.now()}_${file.name}`;
    let imported = 0,
      duplicates = 0;

    // Get user email
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const tx of ofx.transactions) {
      const hash = generateTransactionHash(selectedAccount, tx.fitId, tx.datePosted, tx.amount);

      const { error } = await supabase.from("bank_transactions").insert({
        empresa_id: activeCompany.id,
        bank_account_id: selectedAccount,
        transaction_date: tx.datePosted,
        description: tx.name,
        reference_number: tx.refNum || tx.fitId,
        amount: tx.amount,
        transaction_type: tx.type,
        unique_hash: hash,
        import_batch: batchId,
        origin: "ofx",
      } as any);

      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) duplicates++;
        else console.error(error);
      } else {
        imported++;
      }
    }

    // Save import batch
    await supabase.from("ofx_imports").insert({
      empresa_id: activeCompany.id,
      bank_account_id: selectedAccount,
      file_name: file.name,
      period_start: ofx.startDate || null,
      period_end: ofx.endDate || null,
      balance_start: ofx.balanceStart ?? null,
      balance_end: ofx.balanceEnd ?? null,
      total_transactions: imported,
      total_credits: ofx.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      total_debits: ofx.transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      imported_by: user?.email || "",
    } as any);

    toast.success(
      `Importação concluída: ${imported} lançamentos importados${duplicates > 0 ? `, ${duplicates} duplicados ignorados` : ""}`,
    );
    if (fileRef.current) fileRef.current.value = "";
    loadTransactions();
  };

  // Auto-reconcile
  const autoReconcile = async () => {
    const pendingTxs = transactions.filter((t) => t.reconciliation_status === "pending");
    let matched = 0;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const tx of pendingTxs) {
      const absAmount = Math.abs(Number(tx.amount));
      const isDebit = Number(tx.amount) < 0;
      const candidateTitles = titles.filter(
        (t) =>
          (isDebit ? t.type === "payable" : t.type === "receivable") && Math.abs(Number(t.amount) - absAmount) < 0.01,
      );

      if (candidateTitles.length === 1) {
        const title = candidateTitles[0];
        await supabase
          .from("bank_transactions")
          .update({
            reconciliation_status: "reconciled",
            reconciled_with_type: title.type === "payable" ? "pagar" : "receber",
            reconciled_with_id: title.id,
            reconciliation_note: "Conciliação automática por valor exato",
          } as any)
          .eq("id", tx.id);

        // Update financial title status
        if (title.type === "payable") {
          await supabase
            .from("accounts_payable")
            .update({ status: "paid", payment_date: tx.transaction_date } as any)
            .eq("id", title.id);
        } else {
          await supabase
            .from("receivables")
            .update({ status: "paid", payment_date: tx.transaction_date } as any)
            .eq("id", title.id);
        }

        // Audit log
        await supabase.from("reconciliation_log").insert({
          empresa_id: activeCompany!.id,
          bank_transaction_id: tx.id,
          action: "auto_reconcile",
          reconciled_with_type: title.type === "payable" ? "pagar" : "receber",
          reconciled_with_id: title.id,
          user_email: user?.email || "",
          details: `Conciliação automática - valor: ${absAmount}`,
        } as any);

        matched++;
        setTitles((prev) => prev.filter((t) => t.id !== title.id));
      }
    }

    toast.success(`${matched} lançamentos conciliados automaticamente`);
    loadTransactions();
  };

  // Manual reconcile (single)
  const manualReconcile = async (tx: BankTx, title: FinancialTitle) => {
    await multiReconcile(tx, [title]);
  };

  // Multi-reconcile: reconcile one bank tx with multiple titles
  const multiReconcile = async (tx: BankTx, selectedTitles: FinancialTitle[]) => {
    if (selectedTitles.length === 0) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const titleIds = selectedTitles.map(t => t.id).join(',');
    const titleTypes = [...new Set(selectedTitles.map(t => t.type === "payable" ? "pagar" : "receber"))].join(',');

    await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "reconciled",
        reconciled_with_type: titleTypes,
        reconciled_with_id: titleIds,
        reconciliation_note: `Conciliação manual com ${selectedTitles.length} título(s)`,
      } as any)
      .eq("id", tx.id);

    for (const title of selectedTitles) {
      if (title.type === "payable") {
        await supabase
          .from("accounts_payable")
          .update({ status: "paid", payment_date: tx.transaction_date } as any)
          .eq("id", title.id);
      } else {
        await supabase
          .from("receivables")
          .update({ status: "paid", payment_date: tx.transaction_date } as any)
          .eq("id", title.id);
      }
    }

    await supabase.from("reconciliation_log").insert({
      empresa_id: activeCompany!.id,
      bank_transaction_id: tx.id,
      action: "manual_reconcile",
      reconciled_with_type: titleTypes,
      reconciled_with_id: titleIds,
      user_email: user?.email || "",
      details: `Conciliação manual com ${selectedTitles.length} título(s): ${selectedTitles.map(t => t.description).join(', ')}`,
    } as any);

    setSelectedTitleIds(new Set());
    toast.success(`Lançamento conciliado com ${selectedTitles.length} título(s)`);
    loadTransactions();
  };

  // Undo reconciliation (supports multi-id)
  const undoReconcile = async (tx: BankTx) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (tx.reconciled_with_id) {
      const ids = tx.reconciled_with_id.split(',').map(s => s.trim()).filter(Boolean);
      const types = (tx.reconciled_with_type || '').split(',').map(s => s.trim());
      for (const rid of ids) {
        // Determine type - if single type use it, otherwise check each
        const isPagar = types.includes('pagar');
        const isReceber = types.includes('receber');
        if (isPagar) {
          await supabase
            .from("accounts_payable")
            .update({ status: "open", payment_date: null } as any)
            .eq("id", rid);
        }
        if (isReceber) {
          await supabase
            .from("receivables")
            .update({ status: "pending", payment_date: null } as any)
            .eq("id", rid);
        }
      }
    }

    await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "pending",
        reconciled_with_type: null,
        reconciled_with_id: null,
        reconciliation_note: "",
      } as any)
      .eq("id", tx.id);

    await supabase.from("reconciliation_log").insert({
      empresa_id: activeCompany!.id,
      bank_transaction_id: tx.id,
      action: "undo_reconcile",
      user_email: user?.email || "",
      details: "Conciliação desfeita",
    } as any);

    toast.success("Conciliação desfeita");
    loadTransactions();
  };

  // Mark as ignored/tarifa/etc
  const markAs = async (tx: BankTx, type: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If reclassifying from reconciled/ignored, undo first
    if (tx.reconciliation_status !== "pending") {
      if (tx.reconciled_with_id) {
        const ids = tx.reconciled_with_id.split(',').map(s => s.trim()).filter(Boolean);
        const types = (tx.reconciled_with_type || '').split(',').map(s => s.trim());
        for (const rid of ids) {
          if (types.includes('pagar')) {
            await supabase.from("accounts_payable").update({ status: "open", payment_date: null } as any).eq("id", rid);
          }
          if (types.includes('receber')) {
            await supabase.from("receivables").update({ status: "pending", payment_date: null } as any).eq("id", rid);
          }
        }
      }
    }

    await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "ignored",
        reconciliation_note: type,
        category: type,
        reconciled_with_type: null,
        reconciled_with_id: null,
      } as any)
      .eq("id", tx.id);

    await supabase.from("reconciliation_log").insert({
      empresa_id: activeCompany!.id,
      bank_transaction_id: tx.id,
      action: "mark_as",
      user_email: user?.email || "",
      details: `Marcado como: ${type}`,
    } as any);

    toast.success(`Marcado como ${type}`);
    setShowManualModal(false);
    loadTransactions();
  };

  const toggleSort = <K extends string>(current: SortState<K>, key: K): SortState<K> => {
    if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
    return { key, dir: 'asc' };
  };

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-40" />;
    return dir === 'asc' ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />;
  };

  const filteredTx = transactions.filter((t) => {
    // Hide ignored from main list (they have their own view)
    if (!showIgnoredView && t.reconciliation_status === "ignored") return false;
    if (showIgnoredView && t.reconciliation_status !== "ignored") return false;
    // Show only pending in main view (unless viewing ignored)
    if (!showIgnoredView && t.reconciliation_status !== "pending") return false;
    if (filterType === "credit" && Number(t.amount) < 0) return false;
    if (filterType === "debit" && Number(t.amount) > 0) return false;
    if (searchTx && !t.description.toLowerCase().includes(searchTx.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const dir = txSort.dir === 'asc' ? 1 : -1;
    switch (txSort.key) {
      case 'date': return dir * (new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
      case 'description': return dir * a.description.localeCompare(b.description, 'pt-BR');
      case 'amount': return dir * (Number(a.amount) - Number(b.amount));
      case 'status': return dir * (a.reconciliation_status || '').localeCompare(b.reconciliation_status || '');
      default: return 0;
    }
  });

  const filteredTitles = titles.filter((t) => {
    if (t.is_reconciled) return false;
    if (t.status === 'paid') return false;
    if (
      searchTitle &&
      !t.description.toLowerCase().includes(searchTitle.toLowerCase()) &&
      !(t.client_name || "").toLowerCase().includes(searchTitle.toLowerCase())
    )
      return false;
    return true;
  }).sort((a, b) => {
    const dir = titleSort.dir === 'asc' ? 1 : -1;
    switch (titleSort.key) {
      case 'due_date': return dir * (new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());
      case 'description': return dir * (a.description || '').localeCompare(b.description || '', 'pt-BR');
      case 'amount': return dir * (Number(a.amount) - Number(b.amount));
      case 'type': return dir * (a.type === 'payable' ? -1 : 1) - (b.type === 'payable' ? -1 : 1);
      case 'reconciliation': return dir * ((a.is_reconciled ? 1 : 0) - (b.is_reconciled ? 1 : 0));
      default: return 0;
    }
  });

  const fmt = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Suggestions for a transaction
  const getSuggestions = (tx: BankTx): FinancialTitle[] => {
    const absAmount = Math.abs(Number(tx.amount));
    const isDebit = Number(tx.amount) < 0;
    return titles
      .filter((t) => (isDebit ? t.type === "payable" : t.type === "receivable"))
      .filter((t) => Math.abs(Number(t.amount) - absAmount) / absAmount < 0.05) // 5% tolerance
      .slice(0, 3);
  };

  const selectedTitlesTotal = Array.from(selectedTitleIds).reduce((sum, id) => {
    const t = titles.find(tt => tt.id === id);
    return sum + (t ? Number(t.amount) : 0);
  }, 0);

  const toggleTitleSelection = (id: string) => {
    setSelectedTitleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const reconcileWithSelected = async (tx: BankTx) => {
    const selectedTitles = titles.filter(t => selectedTitleIds.has(t.id));
    if (selectedTitles.length === 0) { toast.error("Selecione ao menos um título"); return; }
    await multiReconcile(tx, selectedTitles);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Conciliação Bancária</h1>
            <p className="text-sm text-muted-foreground">Importe extratos e concilie com o financeiro</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.bank_name} - {a.account_number}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <>
                <input ref={fileRef} type="file" accept=".ofx,.OFX" onChange={handleOFXImport} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar OFX
                </Button>
                <Button size="sm" onClick={autoReconcile} className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Conciliar Auto
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Dashboard cards */}
        {selectedAccount && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Total Importado</p>
              <p className="text-lg font-bold">{totalImported}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Conciliados</p>
              <p className="text-lg font-bold text-emerald-600">{totalReconciled}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-lg font-bold text-amber-600">{totalPending}</p>
            </Card>
            <Card className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow" onClick={() => setShowIgnoredView(!showIgnoredView)}>
              <p className="text-xs text-muted-foreground flex items-center gap-1">Ignorados <Eye className="h-3 w-3" /></p>
              <p className="text-lg font-bold text-muted-foreground">{totalIgnored}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Total Entradas</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(sumCredits)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Total Saídas</p>
              <p className="text-lg font-bold text-red-600">{fmt(Math.abs(sumDebits))}</p>
            </Card>
          </div>
        )}

        {selectedAccount && showIgnoredView && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Lançamentos Ignorados ({totalIgnored})
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowIgnoredView(false)}>
                  <ArrowLeft className="h-3 w-3" /> Voltar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum lançamento ignorado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {tx.transaction_date ? new Date(tx.transaction_date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                        </TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate" title={tx.description}>
                          {tx.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{tx.reconciliation_note || tx.category || "—"}</Badge>
                        </TableCell>
                        <TableCell className={`text-xs text-right font-medium ${Number(tx.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {fmt(Number(tx.amount))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => undoReconcile(tx)}
                            >
                              <Unlink className="h-3 w-3" /> Desfazer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => { setSelectedTx(tx); setShowManualModal(true); }}
                            >
                              <FileText className="h-3 w-3" /> Reclassificar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {selectedAccount && !showIgnoredView && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Bank transactions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Extrato Bancário
                </CardTitle>
                <div className="flex gap-2 flex-wrap mt-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="reconciled">Conciliados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="credit">Entradas</SelectItem>
                      <SelectItem value="debit">Saídas</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 min-w-[120px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={searchTx}
                      onChange={(e) => setSearchTx(e.target.value)}
                      placeholder="Buscar..."
                      className="h-8 text-xs pl-7"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTxSort(s => toggleSort(s, 'date'))}>
                        <span className="inline-flex items-center">Data <SortIcon active={txSort.key === 'date'} dir={txSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTxSort(s => toggleSort(s, 'description'))}>
                        <span className="inline-flex items-center">Descrição <SortIcon active={txSort.key === 'description'} dir={txSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer select-none hover:text-foreground" onClick={() => setTxSort(s => toggleSort(s, 'amount'))}>
                        <span className="inline-flex items-center justify-end">Valor <SortIcon active={txSort.key === 'amount'} dir={txSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTxSort(s => toggleSort(s, 'status'))}>
                        <span className="inline-flex items-center">Status <SortIcon active={txSort.key === 'status'} dir={txSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                          {transactions.length === 0 ? "Importe um arquivo OFX para começar" : "Nenhum resultado"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTx.map((tx) => {
                        const suggestions = tx.reconciliation_status === "pending" ? getSuggestions(tx) : [];
                        return (
                          <TableRow key={tx.id} className="group">
                            <TableCell className="text-xs whitespace-nowrap">
                              {tx.transaction_date
                                ? new Date(tx.transaction_date + "T12:00:00").toLocaleDateString("pt-BR")
                                : ""}
                            </TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate" title={tx.description}>
                              {tx.description}
                              {suggestions.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  {suggestions.map((s) => (
                                    <button
                                      key={s.id}
                                      onClick={() => manualReconcile(tx, s)}
                                      className="flex items-center gap-1 text-[10px] text-primary hover:underline w-full text-left bg-primary/5 rounded px-1.5 py-0.5"
                                    >
                                      <Link2 className="h-3 w-3 shrink-0" />
                                      <span className="truncate">
                                        {s.description} - {fmt(s.amount)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-xs text-right font-medium ${Number(tx.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {fmt(Number(tx.amount))}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${statusColors[tx.reconciliation_status] || ""}`}
                              >
                                {statusLabels[tx.reconciliation_status] || tx.reconciliation_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-1">
                              {tx.reconciliation_status === "pending" && (
                                <>
                                  {selectedTitleIds.size > 0 && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-6 text-[10px] opacity-0 group-hover:opacity-100"
                                      onClick={() => reconcileWithSelected(tx)}
                                    >
                                      <Link2 className="h-3 w-3 mr-1" />
                                      Conciliar ({selectedTitleIds.size})
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() => {
                                      setSelectedTx(tx);
                                      setShowManualModal(true);
                                    }}
                                  >
                                    <FileText className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {(tx.reconciliation_status === "reconciled" ||
                                tx.reconciliation_status === "ignored") && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500"
                                    title="Desfazer"
                                    onClick={() => undoReconcile(tx)}
                                  >
                                    <Unlink className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-primary"
                                    title="Reclassificar"
                                    onClick={() => {
                                      setSelectedTx(tx);
                                      setShowManualModal(true);
                                    }}
                                  >
                                    <FileText className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right: Financial titles */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Títulos Financeiros
                  {selectedTitleIds.size > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-2">
                      {selectedTitleIds.size} selecionado(s) = {fmt(selectedTitlesTotal)}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1 mt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/financial/payable?new=1&from=reconciliation&account=${selectedAccount}`)}>
                    <Plus className="h-3 w-3" /> Pagar
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/financial/receivable?new=1&from=reconciliation&account=${selectedAccount}`)}>
                    <Plus className="h-3 w-3" /> Receber
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                      placeholder="Buscar título..."
                      className="h-8 text-xs pl-7"
                    />
                  </div>
                  {selectedTitleIds.size > 0 && (
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedTitleIds(new Set())}>
                      Limpar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8"></TableHead>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTitleSort(s => toggleSort(s, 'type'))}>
                        <span className="inline-flex items-center">Tipo <SortIcon active={titleSort.key === 'type'} dir={titleSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTitleSort(s => toggleSort(s, 'description'))}>
                        <span className="inline-flex items-center">Descrição <SortIcon active={titleSort.key === 'description'} dir={titleSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTitleSort(s => toggleSort(s, 'due_date'))}>
                        <span className="inline-flex items-center">Vencimento <SortIcon active={titleSort.key === 'due_date'} dir={titleSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer select-none hover:text-foreground" onClick={() => setTitleSort(s => toggleSort(s, 'amount'))}>
                        <span className="inline-flex items-center justify-end">Valor <SortIcon active={titleSort.key === 'amount'} dir={titleSort.dir} /></span>
                      </TableHead>
                      <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => setTitleSort(s => toggleSort(s, 'reconciliation'))}>
                        <span className="inline-flex items-center">Conciliação <SortIcon active={titleSort.key === 'reconciliation'} dir={titleSort.dir} /></span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTitles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                          Nenhum título encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTitles.map((t) => (
                        <TableRow key={t.id} className={selectedTitleIds.has(t.id) ? "bg-primary/5" : ""}>
                          <TableCell className="px-2">
                            {!t.is_reconciled && (
                              <Checkbox
                                checked={selectedTitleIds.has(t.id)}
                                onCheckedChange={() => toggleTitleSelection(t.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${t.type === "payable" ? "text-red-600 border-red-200" : "text-emerald-600 border-emerald-200"}`}
                            >
                              {t.type === "payable" ? "Pagar" : "Receber"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {t.description}
                            {t.client_name && <span className="block text-muted-foreground">{t.client_name}</span>}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {t.due_date ? new Date(t.due_date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">{fmt(t.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${t.is_reconciled ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}
                            >
                              {t.is_reconciled ? "Conciliado" : "Pendente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedAccount && (
          <Card className="p-12 text-center">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Selecione uma conta corrente para iniciar a conciliação</p>
          </Card>
        )}
      </div>

      {/* Manual action modal */}
      <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Classificar Movimentação</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedTx.description}</p>
                <p className={`font-bold ${Number(selectedTx.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(Number(selectedTx.amount))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedTx.transaction_date
                    ? new Date(selectedTx.transaction_date + "T12:00:00").toLocaleDateString("pt-BR")
                    : ""}
                </p>
              </div>
              <div className="space-y-2">
                <Select onValueChange={(val) => markAs(selectedTx, val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Tarifa bancária",
                      "Juros",
                      "IOF",
                      "Imposto",
                      "Transferência",
                      "Estorno",
                      "Ajuste manual",
                      "Investimento automático em CDB",
                      "Resgate automático de CDB",
                      "Recebimento valor adiantado",
                      "Pagamento valor adiantado",
                    ].map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Create Title Dialog */}
      <Dialog open={!!quickCreateType} onOpenChange={(open) => { if (!open) resetQuickCreate(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickCreateType === "payable" ? "Nova Conta a Pagar" : "Nova Conta a Receber"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Descrição *</Label>
              <Input value={qcDescription} onChange={(e) => setQcDescription(e.target.value)} placeholder="Ex: Pagamento fornecedor" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input type="number" step="0.01" value={qcAmount} onChange={(e) => setQcAmount(e.target.value)} placeholder="0,00" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Vencimento</Label>
              <Input type="date" value={qcDueDate} onChange={(e) => setQcDueDate(e.target.value)} className="h-9 text-sm" />
            </div>
            {quickCreateType === "receivable" && (
              <div>
                <Label className="text-xs">Nome do Cliente</Label>
                <Input value={qcClientName} onChange={(e) => setQcClientName(e.target.value)} placeholder="Cliente" className="h-9 text-sm" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetQuickCreate}>Cancelar</Button>
            <Button size="sm" onClick={handleQuickCreate} disabled={qcSaving}>
              {qcSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
