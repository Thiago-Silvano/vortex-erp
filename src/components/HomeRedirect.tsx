import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function HomeRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTarget('/dashboard'); return; }

      const { data } = await (supabase
        .from('user_permissions')
        .select('user_role, default_home_route, default_empresa_id')
        .eq('user_id', user.id)
        .single() as any);

      // Se o usuário tem rota inicial definida, usa ela
      if (data?.default_home_route) {
        setTarget(data.default_home_route);
        return;
      }

      // Caso contrário, leva ao dashboard da empresa default (ou viagens)
      if (data?.default_empresa_id) {
        const { data: comp } = await supabase
          .from('companies')
          .select('slug')
          .eq('id', data.default_empresa_id)
          .single();
        if (comp?.slug === 'vortex-vistos') {
          setTarget('/vistos/dashboard');
          return;
        }
      }

      setTarget('/dashboard');
    })();
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
}
