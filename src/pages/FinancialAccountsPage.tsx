import { useLocation } from 'react-router-dom';
import AccountsPayablePage from './AccountsPayablePage';
import AccountsReceivablePage from './AccountsReceivablePage';

/**
 * Container que alterna entre Contas a Pagar e Contas a Receber conforme a rota.
 * O toggle entre as duas vive dentro do header de cada sub-página.
 */
export default function FinancialAccountsPage() {
  const location = useLocation();
  const isReceivable = location.pathname.startsWith('/financial/receivable');
  return isReceivable ? <AccountsReceivablePage /> : <AccountsPayablePage />;
}