import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ItineraryPreview from '@/components/itinerary/ItineraryPreview';

export default function ItineraryPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [itinerary, setItinerary] = useState<any>(null);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadItinerary();
  }, [token]);

  const loadItinerary = async () => {
    const { data: it } = await supabase
      .from('itineraries')
      .select('*')
      .eq('token', token)
      .single();

    if (!it) { setNotFound(true); setLoading(false); return; }
    setItinerary(it);

    const [destRes, daysRes] = await Promise.all([
      supabase.from('itinerary_destinations').select('*').eq('itinerary_id', (it as any).id).order('sort_order'),
      supabase.from('itinerary_days').select('*').eq('itinerary_id', (it as any).id).order('sort_order'),
    ]);

    setDestinations((destRes.data as any[]) || []);

    if (daysRes.data) {
      const dayIds = (daysRes.data as any[]).map(d => d.id);
      let allAttr: any[] = [];
      if (dayIds.length > 0) {
        const { data } = await supabase
          .from('itinerary_attractions')
          .select('*')
          .in('day_id', dayIds)
          .order('sort_order');
        allAttr = data || [];
      }
      setDays((daysRes.data as any[]).map(d => ({
        ...d,
        attractions: allAttr.filter(a => a.day_id === d.id),
      })));
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Carregando roteiro...</p>
        </div>
      </div>
    );
  }

  if (notFound || !itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-6xl mb-4">🗺️</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Roteiro não encontrado</h1>
          <p className="text-gray-500 text-sm">Este link pode ter expirado ou não existir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[900px] mx-auto py-6 px-4 md:py-12 md:px-6">
        <ItineraryPreview
          itinerary={itinerary}
          destinations={destinations}
          days={days}
        />

        {/* Footer branding */}
        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-gray-400">Powered by Vortex Viagens</p>
        </div>
      </div>
    </div>
  );
}
