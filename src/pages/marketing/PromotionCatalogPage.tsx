import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Eye, Save, Link2, FileText, ImageIcon,
  Copy, Trash2, MoreHorizontal, Plus, LayoutGrid
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import PromotionCard, { type PromotionCardData } from "@/components/marketing/PromotionCard";
import { toPng } from "html-to-image";

type LayoutStyle = "lateral" | "overlay" | "catalog" | "minimal" | "premium_gold" | "premium_overlay" | "premium_dark";

interface CatalogPage {
  id: string;
  title: string;
  layout_style: LayoutStyle;
  promotion_ids: string[];
  token: string;
  show_logo: boolean;
  show_legal_text: boolean;
  legal_text: string | null;
  background_color: string | null;
  created_at: string;
}

const LAYOUT_LABELS: Record<LayoutStyle, string> = {
  catalog: "Catálogo Editorial",
  lateral: "Imagem Lateral",
  overlay: "Texto Sobreposto",
  minimal: "Minimalista",
  premium_gold: "Premium Gold",
  premium_overlay: "Premium Overlay",
  premium_dark: "Premium Dark",
};

export default function PromotionCatalogPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [pages, setPages] = useState<CatalogPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPage, setEditingPage] = useState<CatalogPage | null>(null);
  const [title, setTitle] = useState("Catálogo de Promoções");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("catalog");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(true);
  const [showLegalText, setShowLegalText] = useState(false);
  const [legalText, setLegalText] = useState("");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [promotions, setPromotions] = useState<PromotionCardData[]>([]);
  const [saving, setSaving] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);

  const fetchPages = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("promotion_pages")
      .select("*")
      .eq("empresa_id", activeCompany.id)
      .order("created_at", { ascending: false });
    setPages((data as any[])?.map(d => ({
      ...d,
      promotion_ids: d.promotion_ids || [],
    })) || []);
    setLoading(false);
  };

  const fetchPromotions = async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .eq("empresa_id", activeCompany.id)
      .eq("status", "active")
      .order("destination_name");
    setPromotions((data as any[]) || []);
  };

  const fetchLogo = async () => {
    if (!activeCompany) return;
    const { data } = await supabase
      .from("agency_settings")
      .select("logo_url")
      .eq("empresa_id", activeCompany.id)
      .single();
    if (data) setAgencyLogo((data as any).logo_url);
  };

  useEffect(() => { fetchPages(); fetchPromotions(); fetchLogo(); }, [activeCompany]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === promotions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(promotions.map(p => p.id));
    }
  };

  const openBuilder = (page?: CatalogPage) => {
    if (page) {
      setEditingPage(page);
      setTitle(page.title);
      setLayoutStyle(page.layout_style as LayoutStyle);
      setSelectedIds(page.promotion_ids);
      setShowLogo(page.show_logo);
      setShowLegalText(page.show_legal_text);
      setLegalText(page.legal_text || "");
      setBgColor(page.background_color || "#ffffff");
    } else {
      setEditingPage(null);
      setTitle("Catálogo de Promoções");
      setLayoutStyle("catalog");
      setSelectedIds([]);
      setShowLogo(true);
      setShowLegalText(false);
      setLegalText("");
      setBgColor("#ffffff");
    }
    setShowBuilder(true);
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    if (!selectedIds.length) { toast.error("Selecione ao menos uma promoção"); return; }
    setSaving(true);

    const payload: any = {
      empresa_id: activeCompany.id,
      title,
      layout_style: layoutStyle,
      promotion_ids: selectedIds,
      show_logo: showLogo,
      show_legal_text: showLegalText,
      legal_text: showLegalText ? legalText : null,
      background_color: bgColor,
    };

    let error: any;
    if (editingPage) {
      ({ error } = await supabase.from("promotion_pages").update(payload).eq("id", editingPage.id));
    } else {
      ({ error } = await supabase.from("promotion_pages").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success(editingPage ? "Página atualizada!" : "Página criada!");
      setShowBuilder(false);
      fetchPages();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("promotion_pages").delete().eq("id", deleteId);
    toast.success("Página excluída");
    setDeleteId(null);
    fetchPages();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/catalogo/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const exportImage = async (format: "png" | "jpg") => {
    if (!previewRef.current) return;
    try {
      const dataUrl = await toPng(previewRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `catalogo.${format}`;
      link.href = dataUrl;
      link.click();
      toast.success(`Exportado como ${format.toUpperCase()}!`);
    } catch {
      toast.error("Erro ao exportar");
    }
  };

  const selectedPromos = promotions.filter(p => selectedIds.includes(p.id));

  const gridCols = layoutStyle === "lateral" || layoutStyle === "minimal"
    ? "grid-cols-1 md:grid-cols-1 lg:grid-cols-2"
    : layoutStyle === "premium_gold" || layoutStyle === "premium_overlay" || layoutStyle === "premium_dark"
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/marketing/promotions")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Página de Promoções</h1>
              <p className="text-xs text-muted-foreground">Gere catálogos visuais das suas promoções</p>
            </div>
          </div>
          <Button size="sm" onClick={() => openBuilder()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Página
          </Button>
        </div>

        {/* Pages list */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead className="text-center">Promoções</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : pages.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma página criada</TableCell></TableRow>
              ) : pages.map(page => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{LAYOUT_LABELS[page.layout_style as LayoutStyle] || page.layout_style}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{page.promotion_ids.length}</TableCell>
                  <TableCell>{new Date(page.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { openBuilder(page); }}>
                          <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingPage(page);
                          setTitle(page.title);
                          setLayoutStyle(page.layout_style as LayoutStyle);
                          setSelectedIds(page.promotion_ids);
                          setShowLogo(page.show_logo);
                          setBgColor(page.background_color || "#ffffff");
                          setShowPreview(true);
                        }}>
                          <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyLink(page.token)}>
                          <Link2 className="h-3.5 w-3.5 mr-2" /> Copiar Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/catalogo/${page.token}`, "_blank")}>
                          <Eye className="h-3.5 w-3.5 mr-2" /> Abrir Link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(page.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Editar Página" : "Nova Página de Promoções"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Título da página</Label>
                  <Input className="h-8 text-xs" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Estilo de layout</Label>
                  <Select value={layoutStyle} onValueChange={v => setLayoutStyle(v as LayoutStyle)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(LAYOUT_LABELS) as [LayoutStyle, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                  <Label className="text-xs">Exibir logo da agência</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={showLegalText} onCheckedChange={setShowLegalText} />
                  <Label className="text-xs">Texto legal / condições</Label>
                </div>
                {showLegalText && (
                  <Textarea className="text-xs" rows={3} value={legalText} onChange={e => setLegalText(e.target.value)} placeholder="Condições gerais..." />
                )}
              </div>

              {/* Promo selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Promoções ({selectedIds.length} selecionadas)</Label>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAll}>
                    {selectedIds.length === promotions.length ? "Desmarcar todas" : "Selecionar todas"}
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                  {promotions.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">Nenhuma promoção ativa</p>
                  ) : promotions.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelection(p.id)} />
                      {p.main_image_url && <img src={p.main_image_url} className="h-8 w-8 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.destination_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.accommodation_type} • {p.nights}N</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {p.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview mini */}
            {selectedIds.length > 0 && (
              <div>
                <Label className="text-xs font-medium mb-2 block">Preview</Label>
                <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto" style={{ backgroundColor: bgColor }}>
                  <div className={`grid gap-4 ${gridCols}`}>
                    {selectedPromos.map(p => (
                      <PromotionCard key={p.id} promo={p} layout={layoutStyle} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBuilder(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview / Export Dialog - shows only cards */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar & Exportar</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => copyLink(editingPage?.token || "")}>
              <Link2 className="h-3.5 w-3.5 mr-1" /> Copiar Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportImage("png")}>
              <ImageIcon className="h-3.5 w-3.5 mr-1" /> PNG
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportImage("jpg")}>
              <ImageIcon className="h-3.5 w-3.5 mr-1" /> JPG
            </Button>
          </div>
          <div className={`grid gap-6 ${gridCols}`}>
            {selectedPromos.map(p => (
              <div key={p.id} ref={selectedPromos.length === 1 ? previewRef : undefined}>
                <PromotionCard promo={p} layout={layoutStyle} />
              </div>
            ))}
          </div>
          {/* Hidden render target for multi-card export */}
          {selectedPromos.length > 1 && (
            <div ref={previewRef} className="absolute -left-[9999px] top-0" style={{ width: 1200 }}>
              <div className={`grid gap-6 ${gridCols}`}>
                {selectedPromos.map(p => (
                  <PromotionCard key={p.id} promo={p} layout={layoutStyle} />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
