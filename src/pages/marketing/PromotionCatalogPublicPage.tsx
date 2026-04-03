import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PromotionCard, { type PromotionCardData } from "@/components/marketing/PromotionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plane, Hotel, Bus, Ticket, Map, Users, Train } from "lucide-react";

type LayoutStyle = "lateral" | "overlay" | "catalog" | "minimal" | "premium_gold" | "premium_overlay" | "premium_dark";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PromotionCatalogPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [page, setPage] = useState<any>(null);
  const [promotions, setPromotions] = useState<PromotionCardData[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromotionCardData | null>(null);

  useEffect(() => {
    if (!token) return;
    loadPage();
  }, [token]);

  const loadPage = async () => {
    const { data: pageData } = await supabase
      .from("promotion_pages")
      .select("*")
      .eq("token", token)
      .single();

    if (!pageData) { setNotFound(true); setLoading(false); return; }
    setPage(pageData);

    const promoIds: string[] = (pageData as any).promotion_ids || [];
    if (promoIds.length) {
      const { data: promos } = await supabase
        .from("promotions")
        .select("*")
        .in("id", promoIds);
      // Keep original order
      const promoMap: Record<string, any> = {};
      (promos as any[] || []).forEach(p => { promoMap[p.id] = p; });
      setPromotions(promoIds.map(id => promoMap[id]).filter(Boolean) as PromotionCardData[]);
    }

    // Load logo
    if ((pageData as any).show_logo && (pageData as any).empresa_id) {
      const { data: settings } = await supabase
        .from("agency_settings")
        .select("logo_url")
        .eq("empresa_id", (pageData as any).empresa_id)
        .single();
      if (settings) setLogo((settings as any).logo_url);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
          <p className="text-muted-foreground">Este catálogo não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  const layout = (page?.layout_style || "catalog") as LayoutStyle;
  const cardStyle = page?.card_style || undefined;
  const gridCols = layout === "lateral" || layout === "minimal"
    ? "grid-cols-1 md:grid-cols-1 lg:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  const services = selectedPromo ? [
    { label: "Aéreo", icon: Plane, show: !!(selectedPromo.airport_origin && selectedPromo.airport_destination), detail: `${selectedPromo.airport_origin} → ${selectedPromo.airport_destination}` },
    { label: "Hospedagem", icon: Hotel, show: !!selectedPromo.accommodation_type, detail: `${selectedPromo.accommodation_type} • ${selectedPromo.nights} noites` },
    { label: "Transfer", icon: Bus, show: selectedPromo.included_transfer },
    { label: "Ingressos", icon: Ticket, show: selectedPromo.included_tickets },
    { label: "Passeios", icon: Map, show: selectedPromo.included_tours },
    { label: "Guia", icon: Users, show: selectedPromo.included_guide },
    { label: "Trem", icon: Train, show: selectedPromo.included_train },
  ].filter(s => s.show) : [];

  return (
    <div className="min-h-screen scroll-smooth" style={{ backgroundColor: page?.background_color || "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          {page?.show_logo && logo && (
            <img src={logo} alt="Logo" className="h-8 object-contain" />
          )}
          <h1 className="text-lg font-bold">{page?.title || "Promoções"}</h1>
          <div />
        </div>
      </header>

      {/* Cards */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className={`grid gap-6 ${gridCols}`}>
          {promotions.map(p => (
            <PromotionCard
              key={p.id}
              promo={p}
              layout={layout}
              onClickCta={(promo) => setSelectedPromo(promo)}
            />
          ))}
        </div>
      </main>

      {/* Legal */}
      {page?.show_legal_text && page?.legal_text && (
        <footer className="max-w-6xl mx-auto px-4 py-6 border-t">
          <p className="text-[10px] text-muted-foreground text-center whitespace-pre-line">{page.legal_text}</p>
        </footer>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedPromo} onOpenChange={() => setSelectedPromo(null)}>
        <DialogContent className="max-w-lg">
          {selectedPromo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPromo.destination_name}</DialogTitle>
              </DialogHeader>
              {selectedPromo.main_image_url && (
                <img src={selectedPromo.main_image_url} alt={selectedPromo.destination_name} className="w-full h-48 object-cover rounded-lg" />
              )}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {selectedPromo.accommodation_type} • {selectedPromo.nights} noites
                </p>
                {selectedPromo.period_text && <p className="text-sm">{selectedPromo.period_text}</p>}
                <div className="space-y-2">
                  {services.map(s => (
                    <div key={s.label} className="flex items-center gap-2 text-sm">
                      <s.icon className="h-4 w-4 text-primary" />
                      <span>{s.label}</span>
                      {s.detail && <span className="text-muted-foreground">— {s.detail}</span>}
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  {selectedPromo.installments > 1 && (
                    <p className="text-xl font-bold text-primary">
                      {selectedPromo.installments}x de {formatCurrency(selectedPromo.installment_value)}
                    </p>
                  )}
                  {selectedPromo.total_value > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Total: {formatCurrency(selectedPromo.total_value)}
                    </p>
                  )}
                </div>
                <Button className="w-full" onClick={() => {
                  const msg = encodeURIComponent(`Olá! Tenho interesse no pacote ${selectedPromo.destination_name}`);
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }}>
                  Quero esse pacote
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
