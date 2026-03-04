import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { getQuoteData, getAgencySettings, clearQuoteData } from '@/lib/storage';
import { QuoteData, AgencySettings } from '@/types/quote';
import QuotePDF from '@/components/QuotePDF';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FilePlus } from 'lucide-react';

export default function Preview() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [agency, setAgency] = useState<AgencySettings | null>(null);

  useEffect(() => {
    const q = getQuoteData();
    if (!q) { navigate('/'); return; }
    setQuote(q);
    setAgency(getAgencySettings());
  }, [navigate]);

  const handleDownload = async () => {
    if (!quote || !agency) return;
    const blob = await pdf(<QuotePDF quote={quote} agency={agency} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Orcamento_${quote.client.name.replace(/\s+/g, '_') || 'cliente'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewQuote = () => {
    clearQuoteData();
    navigate('/');
  };

  if (!quote || !agency) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Visualizar Orçamento</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" /> Baixar PDF
            </Button>
            <Button variant="ghost" className="text-primary-foreground hover:text-accent" onClick={handleNewQuote}>
              <FilePlus className="h-4 w-4 mr-2" /> Nova Cotação
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="w-full h-[calc(100vh-100px)]">
          <PDFViewer width="100%" height="100%" className="rounded-lg border">
            <QuotePDF quote={quote} agency={agency} />
          </PDFViewer>
        </div>
      </main>
    </div>
  );
}
