import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  permKey: string;
  children: React.ReactNode;
  fallback?: string;
}

export default function PermissionGuard({ permKey, children, fallback = "/" }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllowed(false); return; }
      if (user.email === "thiago@vortexviagens.com.br") { setAllowed(true); return; }
      const { data } = await (supabase
        .from("user_permissions")
        .select("user_role, permissions")
        .eq("user_id", user.id)
        .single() as any);
      if (data?.user_role === "master") { setAllowed(true); return; }
      setAllowed(!!data?.permissions?.[permKey]);
    })();
  }, [permKey]);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}