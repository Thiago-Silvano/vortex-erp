import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Edit, Copy, Trash2, Palette, MoreHorizontal, LayoutTemplate
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface MarketingTemplate {
  id: string;
  name: string;
  category: string;
  tags: string[];
  preview_url: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  feed: "Feed",
  story: "Story",
  whatsapp: "WhatsApp",
  banner: "Banner",
  promotion: "Promoção",
};

export default function MarketingTemplatesPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_templates")
      .select("*")
      .eq("empresa_id", activeCompany.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar templates");
    } else {
      setTemplates((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [activeCompany]);

  const filtered = templates.filter((t) => {
    if (!search) return true;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleDuplicate = async (tpl: MarketingTemplate) => {
    if (!activeCompany) return;
    const original = await supabase
      .from("marketing_templates")
      .select("*")
      .eq("id", tpl.id)
      .single();

    if (original.error || !original.data) {
      toast.error("Erro ao duplicar");
      return;
    }

    const { id, created_at, ...rest } = original.data as any;
    const { error } = await supabase.from("marketing_templates").insert({
      ...rest,
      empresa_id: activeCompany.id,
      name: `${rest.name} (cópia)`,
    } as any);

    if (error) {
      toast.error("Erro ao duplicar");
    } else {
      toast.success("Template duplicado!");
      fetchTemplates();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("marketing_templates").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Template excluído");
      fetchTemplates();
    }
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Templates de Marketing</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie templates reutilizáveis para seus criativos
            </p>
          </div>
        </div>

        <Card className="p-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-7 text-xs"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <LayoutTemplate className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum template encontrado</p>
            <p className="text-xs mt-1">
              Salve layouts do editor como template para reutilizar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((tpl) => (
              <Card key={tpl.id} className="overflow-hidden group">
                <div className="aspect-square bg-muted flex items-center justify-center relative">
                  {tpl.preview_url ? (
                    <img
                      src={tpl.preview_url}
                      alt={tpl.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <LayoutTemplate className="h-10 w-10 text-muted-foreground/30" />
                  )}

                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/promo-maker?template=${tpl.id}`)}>
                          <Palette className="h-3.5 w-3.5 mr-2" /> Usar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(tpl)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{tpl.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {CATEGORY_LABELS[tpl.category] || tpl.category}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
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
