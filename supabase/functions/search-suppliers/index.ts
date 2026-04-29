import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchParams {
  empresa_id: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  passengers: number;
  numNights?: number;
  priceMin?: number;
  priceMax?: number;
  hotelCategory?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const params: SearchParams = body.params || body;

    if (!params.empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id é obrigatório", hotels: [], services: [], errors: [] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar integrações ativas da empresa
    const { data: integrations, error: intErr } = await supabase
      .from("api_integrations")
      .select("*")
      .eq("empresa_id", params.empresa_id)
      .eq("is_active", true);

    if (intErr) {
      console.error("Erro ao ler api_integrations:", intErr);
    }

    const results: { hotels: any[]; services: any[]; errors: any[] } = {
      hotels: [],
      services: [],
      errors: [],
    };

    const list = integrations || [];
    if (list.length === 0) {
      return new Response(
        JSON.stringify({
          ...results,
          message: "Nenhuma integração de API ativa cadastrada. Cadastre em Configurações > Integrações de API.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Iterar por cada fornecedor cadastrado
    for (const supplier of list) {
      const supplierName = supplier.nome || "Fornecedor";
      try {
        if (!supplier.base_url) {
          results.errors.push({ supplier: supplierName, error: "base_url ausente" });
          continue;
        }

        // ========== Tentativa de autenticação Infotravel ==========
        // Padrão genérico: POST {base_url}/api/auth/login com credenciais
        let token: string | null = null;
        try {
          const authRes = await fetch(`${supplier.base_url}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agencyId: supplier.agency_code || supplier.client_id || "",
              username: supplier.username || "",
              password: supplier.password || "",
            }),
          });
          if (authRes.ok) {
            const authData = await authRes.json().catch(() => ({}));
            token = authData.token || authData.sessionId || authData.access_token || null;
          }
        } catch (e) {
          // continua para erro abaixo
        }

        if (!token && supplier.api_key) {
          token = supplier.api_key; // fallback: usar API key direta
        }

        if (!token) {
          results.errors.push({
            supplier: supplierName,
            error: "Não foi possível autenticar — verifique credenciais do fornecedor.",
          });
          continue;
        }

        const authHeaders: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        if (supplier.agency_code) authHeaders["X-Agency-Id"] = supplier.agency_code;

        // ========== Buscar hotéis ==========
        try {
          const hotelsUrl = new URL(`${supplier.base_url}/api/hotels/search`);
          hotelsUrl.searchParams.set("destination", params.destination);
          hotelsUrl.searchParams.set("checkIn", params.checkIn);
          hotelsUrl.searchParams.set("checkOut", params.checkOut);
          hotelsUrl.searchParams.set("passengers", String(params.passengers || 1));
          if (params.priceMin) hotelsUrl.searchParams.set("priceMin", String(params.priceMin));
          if (params.priceMax) hotelsUrl.searchParams.set("priceMax", String(params.priceMax));
          if (params.hotelCategory) hotelsUrl.searchParams.set("category", params.hotelCategory);

          const hotelsRes = await fetch(hotelsUrl.toString(), { headers: authHeaders });
          if (hotelsRes.ok) {
            const hotelsData = await hotelsRes.json().catch(() => ({}));
            const hotelsList = hotelsData.hotels || hotelsData.results || hotelsData.data || [];
            results.hotels.push(
              ...hotelsList.map((h: any) => ({ ...h, supplierName, supplierId: supplier.id })),
            );
          } else {
            results.errors.push({
              supplier: supplierName,
              endpoint: "hotels",
              status: hotelsRes.status,
            });
          }
        } catch (e) {
          results.errors.push({ supplier: supplierName, endpoint: "hotels", error: String(e) });
        }

        // ========== Buscar serviços/passeios ==========
        try {
          const svcUrl = new URL(`${supplier.base_url}/api/services/search`);
          svcUrl.searchParams.set("destination", params.destination);
          svcUrl.searchParams.set("date", params.checkIn);
          svcUrl.searchParams.set("passengers", String(params.passengers || 1));

          const svcRes = await fetch(svcUrl.toString(), { headers: authHeaders });
          if (svcRes.ok) {
            const svcData = await svcRes.json().catch(() => ({}));
            const svcList = svcData.services || svcData.results || svcData.data || [];
            results.services.push(
              ...svcList.map((s: any) => ({ ...s, supplierName, supplierId: supplier.id })),
            );
          }
        } catch (e) {
          results.errors.push({ supplier: supplierName, endpoint: "services", error: String(e) });
        }

        // Atualiza last_tested_at
        await supabase
          .from("api_integrations")
          .update({
            last_tested_at: new Date().toISOString(),
            last_test_result: { ok: true, hotels: results.hotels.length, services: results.services.length },
          })
          .eq("id", supplier.id);
      } catch (error: any) {
        results.errors.push({ supplier: supplierName, error: error?.message || String(error) });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-suppliers error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
        hotels: [],
        services: [],
        errors: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});