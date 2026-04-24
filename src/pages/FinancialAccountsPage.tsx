import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import AccountsPayablePage from './AccountsPayablePage';
import AccountsReceivablePage from './AccountsReceivablePage';

/**
 * Container que unifica Contas a Pagar e Contas a Receber em uma única página
 * com alternância via botão. A aba ativa é determinada pela rota atual:
 *  - /financial/payable    -> Contas a Pagar
 *  - /financial/receivable -> Contas a Receber
 *
 * Ao clicar no toggle, navegamos para a outra rota preservando os search params,
 * o que mantém compatibilidade total com integrações existentes (ex: redirecionamento
 * vindo da Conciliação Bancária com ?new=1&from=reconciliation&account=...).
 */
export default function FinancialAccountsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isReceivable = location.pathname.startsWith('/financial/receivable');

  const switchTo = (target: 'payable' | 'receivable') => {
    const path = target === 'payable' ? '/financial/payable' : '/financial/receivable';
    navigate(`${path}${location.search}`, { replace: true });
  };

  return (
    <div className="relative">
      {/* Toggle flutuante no topo da página */}
      <div className="absolute top-3 right-6 z-20 flex items-center gap-1 bg-card border rounded-md p-1 shadow-sm">
        <Button
          size="sm"
          variant={!isReceivable ? 'default' : 'ghost'}
          onClick={() => switchTo('payable')}
          className="gap-1.5"
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Contas a Pagar
        </Button>
        <Button
          size="sm"
          variant={isReceivable ? 'default' : 'ghost'}
          onClick={() => switchTo('receivable')}
          className="gap-1.5"
        >
          <ArrowDownCircle className="h-3.5 w-3.5" />
          Contas a Receber
        </Button>
      </div>

      {isReceivable ? <AccountsReceivablePage /> : <AccountsPayablePage />}
    </div>
  );
}