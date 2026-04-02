import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, MapPin, Building2, CalendarDays, Plane, Ticket, DollarSign, ImageIcon, Upload, X, Wand2 } from "lucide-react";
import { maskCurrencyInput, parseCurrency } from "@/lib/masks";
import GenerateCreativesModal from "@/components/marketing/GenerateCreativesModal";

interface PromotionForm {
  destination_name: string;
  destination_country: string;
  accommodation_type: string;
  nights: number;
  period_text: string;
  departure_date: string;
  return_date: string;
  airport_origin: string;
  airport_destination: string;
  included_tickets: boolean;
  included_tours: boolean;
  included_guide: boolean;
  included_transfer: boolean;
  included_train: boolean;
  installments: number;
  installment_value: number;
  total_value: number;
  main_image_url: string;
  gallery_urls: string[];
  status: string;
}

const defaultForm: PromotionForm = {
  destination_name: "",
  destination_country: "",
  accommodation_type: "",
  nights: 1,
  period_text: "",
  departure_date: "",
  return_date: "",
  airport_origin: "",
  airport_destination: "",
  included_tickets: false,
  included_tours: false,
  included_guide: false,
  included_transfer: false,
  included_train: false,
  installments: 1,
  installment_value: 0,
  total_value: 0,
  main_image_url: "",
  gallery_urls: [],
  status: "active",
};

export default function PromotionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activeCompany } = useCompany();
  const [form, setForm] = useState<PromotionForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCreatives, setShowCreatives] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const isEdit = !!id && id !== "new";

  useEffect(() => {
    if (isEdit) {
      supabase
        .from("promotions")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data, error }: any) => {
          if (data) {
            setForm({
              destination_name: data.destination_name || "",
              destination_country: data.destination_country || "",
              accommodation_type: data.accommodation_type || "",
              nights: data.nights || 1,
              period_text: data.period_text || "",
              departure_date: data.departure_date || "",
              return_date: data.return_date || "",
              airport_origin: data.airport_origin || "",
              airport_destination: data.airport_destination || "",
              included_tickets: data.included_tickets || false,
              included_tours: data.included_tours || false,
              included_guide: data.included_guide || false,
              included_transfer: data.included_transfer || false,
              included_train: data.included_train || false,
              installments: data.installments || 1,
              installment_value: Number(data.installment_value) || 0,
              total_value: Number(data.total_value) || 0,
              main_image_url: data.main_image_url || "",
              gallery_urls: (data.gallery_urls as string[]) || [],
              status: data.status || "active",
            });
          }
          if (error) toast.error("Erro ao carregar promoção");
        });
    }
  }, [id, isEdit]);

  const set = (key: keyof PromotionForm, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file: File, target: "main" | "gallery") => {
    if (!activeCompany) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${activeCompany.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("promotion-images").upload(path, file);
    if (error) {
      toast.error("Erro ao fazer upload");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("promotion-images").getPublicUrl(path);
    const url = urlData.publicUrl;

    if (target === "main") {
      set("main_image_url", url);
    } else {
      setForm((prev) => ({ ...prev, gallery_urls: [...prev.gallery_urls, url] }));
    }
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const removeGalleryImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      gallery_urls: prev.gallery_urls.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    if (!form.destination_name.trim()) {
      toast.error("Informe o destino");
      return;
    }
    setSaving(true);

    const payload: any = {
      ...form,
      empresa_id: activeCompany.id,
      departure_date: form.departure_date || null,
      return_date: form.return_date || null,
      main_image_url: form.main_image_url || null,
      gallery_urls: form.gallery_urls,
    };

    let error: any;
    if (isEdit) {
      ({ error } = await supabase.from("promotions").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("promotions").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success(isEdit ? "Promoção atualizada!" : "Promoção criada!");
      navigate("/marketing/promotions");
    }
    setSaving(false);
  };

  const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );

  const promotionData = isEdit ? { id, ...form } : null;

  return (
    <AppLayout>
      <div className="p-4 max-w-[900px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/marketing/promotions")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">
                {isEdit ? "Editar Promoção" : "Nova Promoção"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Preencha os dados da promoção
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEdit && (
              <Button variant="outline" size="sm" onClick={() => setShowCreatives(true)}>
                <Wand2 className="h-3.5 w-3.5 mr-1" /> Gerar Criativos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/promo-maker?promotion=${id || "new"}`)}>
              Abrir no Editor
            </Button>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-[110px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Destino */}
          <Card className="p-4">
            <SectionTitle icon={MapPin} title="Destino" />
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome do destino *</Label>
                <Input className="h-7 text-xs" value={form.destination_name} onChange={(e) => set("destination_name", e.target.value)} placeholder="Ex: João Pessoa" />
              </div>
              <div>
                <Label className="text-xs">País</Label>
                <Input className="h-7 text-xs" value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} placeholder="Ex: Brasil" />
              </div>
            </div>
          </Card>

          {/* Hospedagem */}
          <Card className="p-4">
            <SectionTitle icon={Building2} title="Hospedagem" />
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tipo de acomodação</Label>
                <Input className="h-7 text-xs" value={form.accommodation_type} onChange={(e) => set("accommodation_type", e.target.value)} placeholder="Ex: Resort All Inclusive" />
              </div>
              <div>
                <Label className="text-xs">Noites</Label>
                <Input className="h-7 text-xs w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" min={1} value={form.nights} onChange={(e) => set("nights", parseInt(e.target.value) || 1)} />
              </div>
            </div>
          </Card>

          {/* Período */}
          <Card className="p-4">
            <SectionTitle icon={CalendarDays} title="Período" />
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Período (texto livre)</Label>
                <Input className="h-7 text-xs" value={form.period_text} onChange={(e) => set("period_text", e.target.value)} placeholder="Ex: Março a Junho 2026" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Data de partida</Label>
                  <Input type="date" className="h-7 text-xs" value={form.departure_date} onChange={(e) => set("departure_date", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Data de retorno</Label>
                  <Input type="date" className="h-7 text-xs" value={form.return_date} onChange={(e) => set("return_date", e.target.value)} />
                </div>
              </div>
            </div>
          </Card>

          {/* Voos */}
          <Card className="p-4">
            <SectionTitle icon={Plane} title="Voos" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Aeroporto de saída</Label>
                <Input className="h-7 text-xs" value={form.airport_origin} onChange={(e) => set("airport_origin", e.target.value.toUpperCase())} placeholder="FLN" maxLength={5} />
              </div>
              <div>
                <Label className="text-xs">Aeroporto de chegada</Label>
                <Input className="h-7 text-xs" value={form.airport_destination} onChange={(e) => set("airport_destination", e.target.value.toUpperCase())} placeholder="JPA" maxLength={5} />
              </div>
            </div>
          </Card>

          {/* Serviços */}
          <Card className="p-4">
            <SectionTitle icon={Ticket} title="Serviços Inclusos" />
            <div className="space-y-2">
              {[
                { key: "included_tickets", label: "Ingressos" },
                { key: "included_tours", label: "Passeios" },
                { key: "included_guide", label: "Guia turístico" },
                { key: "included_transfer", label: "Transfer hotel" },
                { key: "included_train", label: "Trem" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={(form as any)[key]} onCheckedChange={(v) => set(key as keyof PromotionForm, !!v)} />
                  {label}
                </label>
              ))}
            </div>
          </Card>

          {/* Valores */}
          <Card className="p-4">
            <SectionTitle icon={DollarSign} title="Valores" />
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Número de parcelas</Label>
                <Input
                  className="h-7 text-xs w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  type="number"
                  min={1}
                  value={form.installments || ""}
                  onChange={(e) => set("installments", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Valor da parcela (R$)</Label>
                <Input
                  className="h-7 text-xs w-40"
                  value={form.installment_value ? maskCurrencyInput(form.installment_value) : ""}
                  onChange={(e) => set("installment_value", parseCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label className="text-xs">Valor total (R$)</Label>
                <Input
                  className="h-7 text-xs w-40"
                  value={form.total_value ? maskCurrencyInput(form.total_value) : ""}
                  onChange={(e) => set("total_value", parseCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Mídia */}
        <Card className="p-4">
          <SectionTitle icon={ImageIcon} title="Mídia" />
          <div className="space-y-4">
            {/* Imagem principal */}
            <div>
              <Label className="text-xs font-medium">Imagem principal</Label>
              <div className="mt-1 flex items-start gap-3">
                {form.main_image_url ? (
                  <div className="relative">
                    <img src={form.main_image_url} alt="Principal" className="h-32 rounded-md object-cover" />
                    <button onClick={() => set("main_image_url", "")} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? "Enviando..." : "Upload"}
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "main"); e.target.value = ""; }} />
              </div>
            </div>

            {/* Galeria */}
            <div>
              <Label className="text-xs font-medium">Galeria</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {form.gallery_urls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Galeria ${i + 1}`} className="h-20 w-20 rounded-md object-cover" />
                    <button onClick={() => removeGalleryImage(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-20 w-20" disabled={uploading} onClick={() => galleryRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "gallery"); e.target.value = ""; }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {isEdit && promotionData && (
        <GenerateCreativesModal
          open={showCreatives}
          onClose={() => setShowCreatives(false)}
          promotion={promotionData}
        />
      )}
    </AppLayout>
  );
}
