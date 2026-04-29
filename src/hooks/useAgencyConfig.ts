import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface AgencyConfig {
  nomeAgencia: string;
  logoUrl: string;
  corPrimaria: string;
  slogan: string;
}

export function useAgencyConfig() {
  const { activeCompany } = useCompany();
  const [config, setConfig] = useState<AgencyConfig | null>(null);

  useEffect(() => {
    if (!activeCompany?.id) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('agency_settings')
        .select('name, logo_url')
        .eq('empresa_id', activeCompany.id)
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setConfig({
        nomeAgencia: (data as any)?.name || activeCompany.name || 'Agência de Viagens',
        logoUrl: (data as any)?.logo_url || '',
        corPrimaria: '#0a0a0a',
        slogan: 'Curated Journeys',
      });
    })();
    return () => { alive = false; };
  }, [activeCompany?.id]);

  return { config };
}