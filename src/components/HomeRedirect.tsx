import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function HomeRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTarget('/dashboard'); return; }

      const { data } = await (supabase.from('user_permissions').select('user_role, default_home_route').eq('user_id', user.id).single() as any);
      const route = data?.default_home_route || '/reservations';
      setTarget(route);
    })();
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
}
