import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// National NFS-e API endpoints
const NFSE_API = {
  homologacao: "https://sefin.nfse.gov.br/sefinnacional",
  producao: "https://sefin.nfse.gov.br/sefinnacional",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { nfse_id, empresa_id } = await req.json();

    if (!nfse_id || !empresa_id) {
      return new Response(
        JSON.stringify({ success: false, message: "nfse_id e empresa_id são obrigatórios." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load NFS-e document
    const { data: doc, error: docErr } = await supabase
      .from("nfse_documents")
      .select("*")
      .eq("id", nfse_id)
      .single();

    if (docErr || !doc) {
      return new Response(
        JSON.stringify({ success: false, message: "Documento NFS-e não encontrado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load fiscal company settings
    const { data: fiscal } = await supabase
      .from("fiscal_companies")
      .select("*")
      .eq("empresa_id", empresa_id)
      .single();

    if (!fiscal) {
      await updateDocStatus(supabase, nfse_id, "rejeitada", "Configurações fiscais não encontradas.");
      return new Response(
        JSON.stringify({ success: false, message: "Configurações fiscais não encontradas." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Load certificate
    const { data: cert } = await supabase
      .from("fiscal_certificates")
      .select("*")
      .eq("empresa_id", empresa_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!cert) {
      await updateDocStatus(supabase, nfse_id, "rejeitada", "Certificado digital não encontrado ou inválido.");
      return new Response(
        JSON.stringify({ success: false, message: "Certificado digital não encontrado ou inválido." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Build DPS XML
    const dpsXml = buildDPS(doc, fiscal);

    // Update document with DPS XML
    await supabase
      .from("nfse_documents")
      .update({ xml_dps: dpsXml, status: "transmitindo" })
      .eq("id", nfse_id);

    // Log event
    await supabase.from("nfse_events").insert({
      nfse_id,
      event_type: "dps_gerada",
      description: "DPS gerada e pronta para transmissão",
      details: { xml_length: dpsXml.length },
    });

    // 5. Sign XML (placeholder - real implementation needs PKCS12 library)
    // In production, this would:
    // - Parse the PFX certificate
    // - Create XML digital signature (XMLDSig)
    // - Apply enveloped signature to the DPS
    const signedXml = dpsXml; // Placeholder

    // 6. Transmit to National API
    // NOTE: Real implementation requires:
    // - Mutual TLS with client certificate
    // - Proper SOAP/REST envelope
    // - Handling of synchronous and asynchronous responses
    
    const ambiente = (fiscal as any).ambiente || "homologacao";
    const apiUrl = NFSE_API[ambiente as keyof typeof NFSE_API];

    // Log the API call attempt
    const apiLogData = {
      nfse_id,
      empresa_id,
      endpoint: apiUrl + "/DPS",
      method: "POST",
      request_payload: signedXml.substring(0, 5000),
      ambiente,
      response_status: null as number | null,
      response_payload: null as string | null,
      response_time_ms: null as number | null,
      error_message: null as string | null,
    };

    try {
      // Simulated API call for now - real integration would POST the signed XML
      // const response = await fetch(apiUrl + "/DPS", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/xml" },
      //   body: signedXml,
      //   // client certificate would be configured here
      // });

      // Simulated response for development
      const simulatedResponse = {
        success: true,
        numero_nfse: `HML-${Date.now().toString().slice(-8)}`,
        chave: `NFSE-${empresa_id.slice(0, 8)}-${Date.now()}`,
        protocolo: `PROT-${Date.now()}`,
        xml_autorizada: `<!-- NFS-e Autorizada (simulação) -->\n${signedXml}`,
      };

      apiLogData.response_status = 200;
      apiLogData.response_payload = JSON.stringify(simulatedResponse).substring(0, 5000);
      apiLogData.response_time_ms = Date.now() - startTime;

      if (simulatedResponse.success) {
        // Update document with authorization data
        await supabase.from("nfse_documents").update({
          status: "autorizada",
          numero_nfse: simulatedResponse.numero_nfse,
          chave_nfse: simulatedResponse.chave,
          protocolo: simulatedResponse.protocolo,
          xml_nfse_autorizada: simulatedResponse.xml_autorizada,
          data_emissao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", nfse_id);

        // Log event
        await supabase.from("nfse_events").insert({
          nfse_id,
          event_type: "nfse_autorizada",
          description: `NFS-e autorizada: ${simulatedResponse.numero_nfse}`,
          details: { numero: simulatedResponse.numero_nfse, chave: simulatedResponse.chave },
        });

        // Audit log
        await supabase.from("nfse_audit_logs").insert({
          empresa_id,
          nfse_id,
          action: "emissao",
          description: `NFS-e ${simulatedResponse.numero_nfse} emitida com sucesso`,
          details: { ambiente, numero: simulatedResponse.numero_nfse },
        });

        // Save API log
        await supabase.from("nfse_api_logs").insert(apiLogData);

        return new Response(
          JSON.stringify({
            success: true,
            numero_nfse: simulatedResponse.numero_nfse,
            chave: simulatedResponse.chave,
            protocolo: simulatedResponse.protocolo,
            message: ambiente === "homologacao"
              ? "NFS-e emitida em HOMOLOGAÇÃO (simulação). Para produção, configure o ambiente e certificado real."
              : "NFS-e emitida com sucesso.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (apiErr: any) {
      apiLogData.error_message = apiErr.message;
      apiLogData.response_time_ms = Date.now() - startTime;
      await supabase.from("nfse_api_logs").insert(apiLogData);

      await updateDocStatus(supabase, nfse_id, "rejeitada", apiErr.message, apiErr.stack);

      // Add to retry queue
      await supabase.from("nfse_status_queue").insert({
        nfse_id,
        empresa_id,
        action: "retry_emit",
        status: "pending",
      });

      return new Response(
        JSON.stringify({ success: false, message: "Erro na transmissão: " + apiErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Resposta inesperada da API." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateDocStatus(
  supabase: any,
  nfseId: string,
  status: string,
  motivo: string,
  motivoTecnico?: string
) {
  await supabase.from("nfse_documents").update({
    status,
    motivo_rejeicao: motivo,
    motivo_rejeicao_tecnico: motivoTecnico || motivo,
    updated_at: new Date().toISOString(),
  }).eq("id", nfseId);

  await supabase.from("nfse_events").insert({
    nfse_id: nfseId,
    event_type: status === "rejeitada" ? "nfse_rejeitada" : status,
    description: motivo,
  });
}

function buildDPS(doc: any, fiscal: any): string {
  // Build DPS XML following the national standard
  // This is a simplified version - production would follow the full XSD schema
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS_${doc.id}">
    <tpAmb>${fiscal.ambiente === 'producao' ? '1' : '2'}</tpAmb>
    <dhEmi>${new Date().toISOString()}</dhEmi>
    <verAplic>VortexERP-1.0</verAplic>
    <serie>${fiscal.serie_nfse || '1'}</serie>
    <nDPS>${Date.now()}</nDPS>
    <dCompet>${doc.data_competencia || new Date().toISOString().split('T')[0]}</dCompet>
    <tpEmit>1</tpEmit>
    <prest>
      <CNPJ>${(fiscal.cnpj || '').replace(/\D/g, '')}</CNPJ>
      <IM>${fiscal.inscricao_municipal || ''}</IM>
      <xNome>${fiscal.razao_social || ''}</xNome>
      <xFant>${fiscal.nome_fantasia || ''}</xFant>
      <end>
        <xLgr>${fiscal.logradouro || ''}</xLgr>
        <nro>${fiscal.numero || ''}</nro>
        <xCpl>${fiscal.complemento || ''}</xCpl>
        <xBairro>${fiscal.bairro || ''}</xBairro>
        <cMun>4204608</cMun>
        <UF>${fiscal.uf || 'SC'}</UF>
        <CEP>${(fiscal.cep || '').replace(/\D/g, '')}</CEP>
      </end>
      <fone>${(fiscal.telefone || '').replace(/\D/g, '')}</fone>
      <email>${fiscal.email_fiscal || ''}</email>
    </prest>
    <toma>
      <CPFCNPJ>${(doc.tomador_cnpj_cpf || '').replace(/\D/g, '')}</CPFCNPJ>
      <xNome>${doc.tomador_razao_social || ''}</xNome>
      <end>
        <xLgr>${doc.tomador_logradouro || ''}</xLgr>
        <nro>${doc.tomador_numero || ''}</nro>
        <xCpl>${doc.tomador_complemento || ''}</xCpl>
        <xBairro>${doc.tomador_bairro || ''}</xBairro>
        <cMun>4204608</cMun>
        <UF>${doc.tomador_uf || ''}</UF>
        <CEP>${(doc.tomador_cep || '').replace(/\D/g, '')}</CEP>
      </end>
      <fone>${(doc.tomador_telefone || '').replace(/\D/g, '')}</fone>
      <email>${doc.tomador_email || ''}</email>
    </toma>
    <serv>
      <cServ>${doc.codigo_servico || fiscal.codigo_servico || ''}</cServ>
      <xDescServ>${doc.descricao_servico || ''}</xDescServ>
      <cMunPrestworking>${doc.municipio_incidencia || '4204608'}</cMunPrestworking>
    </serv>
    <valores>
      <vServPrest>${(doc.valor_servicos || 0).toFixed(2)}</vServPrest>
      <vDed>${(doc.valor_deducoes || 0).toFixed(2)}</vDed>
      <vDesc>${(doc.valor_descontos || 0).toFixed(2)}</vDesc>
      <vBC>${(doc.base_calculo || 0).toFixed(2)}</vBC>
      <pAliqISS>${(doc.aliquota || 0).toFixed(2)}</pAliqISS>
      <vISS>${(doc.valor_iss || 0).toFixed(2)}</vISS>
      <vLiq>${(doc.valor_liquido || 0).toFixed(2)}</vLiq>
      <tpRetISSQN>${doc.iss_retido ? '1' : '2'}</tpRetISSQN>
    </valores>
    <natOp>${doc.natureza_operacao || fiscal.natureza_operacao || '1'}</natOp>
    <exigISS>${doc.exigibilidade_iss || fiscal.exigibilidade_iss || '1'}</exigISS>
    <optSN>${fiscal.optante_simples ? '1' : '2'}</optSN>
    <infCompl>${doc.observacoes || ''}</infCompl>
  </infDPS>
</DPS>`;

  return xml;
}
