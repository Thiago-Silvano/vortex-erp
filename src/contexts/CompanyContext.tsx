import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Company {
  id: string;
  slug: string;
  name: string;
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (company: Company) => void;
  isLoading: boolean;
  userCompanyIds: string[];  // companies the user has access to
  isMaster: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  activeCompany: null,
  setActiveCompany: () => {},
  isLoading: true,
  userCompanyIds: [],
  isMaster: false,
});

export function useCompany() {
  return useContext(CompanyContext);
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      const comps: Company[] = (companiesData || []).map((c: any) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
      }));
      setCompanies(comps);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const isAdminEmail = user.email === 'thiago@vortexviagens.com.br';

      // Get user permissions
      const { data: permsData } = await supabase
        .from('user_permissions')
        .select('user_role, empresa_ids, default_empresa_id')
        .eq('user_id', user.id)
        .single();

      const role = (permsData as any)?.user_role || (isAdminEmail ? 'master' : 'vendedor');
      const empresaIds: string[] = (permsData as any)?.empresa_ids || [];
      const defaultEmpresaId: string | null = (permsData as any)?.default_empresa_id || null;
      const masterUser = role === 'master' || isAdminEmail;

      setIsMaster(masterUser);

      // Master has access to all companies
      const accessibleIds = masterUser ? comps.map(c => c.id) : empresaIds;
      setUserCompanyIds(accessibleIds);

      // Restore last active company from localStorage, or use default
      const savedCompanyId = localStorage.getItem('activeCompanyId');
      const savedCompany = comps.find(c => c.id === savedCompanyId && accessibleIds.includes(c.id));
      
      if (savedCompany) {
        setActiveCompanyState(savedCompany);
      } else if (masterUser && defaultEmpresaId) {
        const defaultComp = comps.find(c => c.id === defaultEmpresaId && accessibleIds.includes(c.id));
        if (defaultComp) setActiveCompanyState(defaultComp);
        else if (accessibleIds.length > 0) setActiveCompanyState(comps.find(c => accessibleIds.includes(c.id)) || comps[0]);
      } else if (accessibleIds.length > 0) {
        const defaultComp = comps.find(c => accessibleIds.includes(c.id)) || comps[0];
        setActiveCompanyState(defaultComp);
      }

      setIsLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company);
    localStorage.setItem('activeCompanyId', company.id);
  };

  return (
    <CompanyContext.Provider value={{ companies, activeCompany, setActiveCompany, isLoading, userCompanyIds, isMaster }}>
      {children}
    </CompanyContext.Provider>
  );
}
