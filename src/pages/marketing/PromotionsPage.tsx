import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus, Search, Edit, Copy, Trash2, Palette, Wand2,
  MoreHorizontal, Filter
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import GenerateCreativesModal from "@/components/marketing/GenerateCreativesModal";

interface Promotion {
  id: string;
  destination_name: string;
  destination_country: string;
  accommodation_type: string;
  nights: number;
  period_text: string;
  airport_origin: string;
  airport_destination: string;
  installments: number;
  installment_value: number;
  total_value: number;
  status: string;
  main_image_url: string | null;
  created_at: string;
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creativePromo, setCreativePromo] = useState<Promotion | null>(null);

  const fetchPromotions = async () => {
    if (!activeCompany) return;
    setLoading(true);
    let query = supabase
      .from("promotions")
      .select("*")
      .eq("empresa_id", activeCompany.id)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar promoções");
    } else {
      setPromotions((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, [activeCompany, statusFilter]);

  const filtered = promotions.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.destination_name.toLowerCase().includes(q) ||
      p.destination_country.toLowerCase().includes(q)
    );
  });

  const handleDuplicate = async (promo: Promotion) => {
    if (!activeCompany) return;
    const { id, created_at, ...rest } = promo;
    const { error } = await supabase.from("promotions").insert({
      ...rest,
      empresa_id: activeCompany.id,
      destination_name: `${rest.destination_name} (cópia)`,
    } as any);
    if (error) {
      toast.error("Erro ao duplicar");
    } else {
      toast.success("Promoção duplicada!");
      fetchPromotions();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("promotions").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Promoção excluída");
      fetchPromotions();
    }
    setDeleteId(null);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Promoções</h1>
            <p className="text-xs text-muted-foreground">
              Cadastre e gerencie promoções de viagem
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/marketing/promotions/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Promoção
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-3">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por destino ou país..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-7 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-7 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destino</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Acomodação</TableHead>
                <TableHead className="text-center">Noites</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Voo</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma promoção encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.destination_name}</TableCell>
                    <TableCell>{p.destination_country}</TableCell>
                    <TableCell>{p.accommodation_type}</TableCell>
                    <TableCell className="text-center">{p.nights}</TableCell>
                    <TableCell>{p.period_text}</TableCell>
                    <TableCell>
                      {p.airport_origin && p.airport_destination
                        ? `${p.airport_origin} → ${p.airport_destination}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.installments}x {formatCurrency(p.installment_value)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.total_value)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>
                        {p.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/marketing/promotions/${p.id}`)}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/promo-maker?promotion=${p.id}`)}>
                            <Palette className="h-3.5 w-3.5 mr-2" /> Abrir no Editor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir promoção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
