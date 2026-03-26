import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "https://esm.sh/node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, empresa_id } = await req.json();

    if (action === "validate") {
      const { data: cert, error } = await supabase
        .from("fiscal_certificates")
        .select("*")
        .eq("empresa_id", empresa_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !cert) {
        return new Response(
          JSON.stringify({ success: false, message: "Certificado não encontrado." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      try {
        // Decode the base64 PFX
        const pfxBase64 = cert.arquivo_encrypted;
        const passwordDecoded = atob(cert.senha_encrypted);

        // Convert base64 to binary DER
        const pfxDer = forge.util.decode64(pfxBase64);
        const pfxAsn1 = forge.asn1.fromDer(pfxDer);
        const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, passwordDecoded);

        // Extract certificate bags
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certificates = certBags[forge.pki.oids.certBag] || [];

        if (certificates.length === 0) {
          updateData.status = "invalid";
          updateData.titular = "Nenhum certificado encontrado no arquivo";
          await supabase.from("fiscal_certificates").update(updateData).eq("id", cert.id);
          return new Response(
            JSON.stringify({ success: false, message: "Nenhum certificado encontrado no arquivo PFX." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find the end-entity certificate (not a CA)
        let targetCert = certificates[0].cert;
        for (const bag of certificates) {
          if (bag.cert) {
            const isCA = bag.cert.extensions?.some(
              (ext: any) => ext.name === "basicConstraints" && ext.cA
            );
            if (!isCA) {
              targetCert = bag.cert;
              break;
            }
          }
        }

        if (!targetCert) {
          updateData.status = "invalid";
          updateData.titular = "Certificado inválido";
          await supabase.from("fiscal_certificates").update(updateData).eq("id", cert.id);
          return new Response(
            JSON.stringify({ success: false, message: "Não foi possível extrair o certificado." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract subject fields
        const subjectAttrs = targetCert.subject.attributes;
        const getAttr = (shortName: string) =>
          subjectAttrs.find((a: any) => a.shortName === shortName)?.value || "";

        const cn = getAttr("CN");
        const issuerCN = targetCert.issuer.attributes.find(
          (a: any) => a.shortName === "CN"
        )?.value || "";
        const issuerO = targetCert.issuer.attributes.find(
          (a: any) => a.shortName === "O"
        )?.value || "";

        // Extract CNPJ/CPF from CN or OID 2.16.76.1.3.3 (ICP-Brasil)
        let cnpjCpf = "";
        // Try OID for CNPJ (ICP-Brasil)
        const otherName = subjectAttrs.find(
          (a: any) => a.type === "2.16.76.1.3.3"
        );
        if (otherName) {
          cnpjCpf = otherName.value || "";
        }
        // Fallback: extract from CN using regex
        if (!cnpjCpf) {
          const cnpjMatch = cn.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
          const cpfMatch = cn.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
          cnpjCpf = cnpjMatch?.[1] || cpfMatch?.[1] || "";
        }
        // Also try extracting from serialName
        if (!cnpjCpf) {
          const serialName = getAttr("serialName") || getAttr("SERIALNUMBER");
          if (serialName) {
            const snMatch = serialName.match(/(\d{11,14})/);
            if (snMatch) cnpjCpf = snMatch[1];
          }
        }

        // Validity dates
        const validFrom = targetCert.validity.notBefore;
        const validTo = targetCert.validity.notAfter;
        const now = new Date();

        if (now > validTo) {
          updateData.status = "expired";
          updateData.titular = cn;
          updateData.cnpj_certificado = cnpjCpf;
          updateData.emissor = issuerO || issuerCN;
          updateData.validade_inicio = validFrom.toISOString();
          updateData.validade_fim = validTo.toISOString();
          updateData.validated_at = new Date().toISOString();

          await supabase.from("fiscal_certificates").update(updateData).eq("id", cert.id);
          return new Response(
            JSON.stringify({ success: false, message: "Certificado expirado em " + validTo.toLocaleDateString("pt-BR") }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Certificate is valid
        updateData.status = "active";
        updateData.titular = cn;
        updateData.cnpj_certificado = cnpjCpf;
        updateData.emissor = issuerO || issuerCN;
        updateData.validade_inicio = validFrom.toISOString();
        updateData.validade_fim = validTo.toISOString();
        updateData.validated_at = new Date().toISOString();

        // Generate hash of the file for integrity check
        const md = forge.md.sha256.create();
        md.update(pfxDer);
        updateData.arquivo_hash = md.digest().toHex();

        await supabase.from("fiscal_certificates").update(updateData).eq("id", cert.id);

        // Audit log
        await supabase.from("nfse_audit_logs").insert({
          empresa_id,
          action: "certificate_validated",
          description: `Certificado digital validado: ${cn}`,
          details: {
            certificate_id: cert.id,
            titular: cn,
            cnpj: cnpjCpf,
            emissor: issuerO || issuerCN,
            validade_fim: validTo.toISOString(),
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Certificado validado e ativado com sucesso!",
            data: {
              titular: cn,
              cnpj: cnpjCpf,
              emissor: issuerO || issuerCN,
              validade_fim: validTo.toISOString(),
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseErr: any) {
        // If parsing fails, it could be wrong password or corrupted file
        const errMsg = parseErr.message || String(parseErr);
        const isPasswordError =
          errMsg.includes("Invalid password") ||
          errMsg.includes("PKCS#12 MAC could not be verified") ||
          errMsg.includes("forge.pkcs12");

        updateData.status = "invalid";
        updateData.titular = isPasswordError
          ? "Senha incorreta"
          : "Arquivo inválido ou corrompido";

        await supabase.from("fiscal_certificates").update(updateData).eq("id", cert.id);

        return new Response(
          JSON.stringify({
            success: false,
            message: isPasswordError
              ? "Senha do certificado incorreta. Envie novamente com a senha correta."
              : "Erro ao processar o certificado: " + errMsg,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: "Ação não reconhecida." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
