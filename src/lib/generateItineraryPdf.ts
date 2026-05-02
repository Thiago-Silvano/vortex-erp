import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

const AMBER = [200, 164, 91] as const;
const DARK = [26, 26, 26] as const;
const MUTED = [120, 120, 120] as const;
const WHITE = [255, 255, 255] as const;
const LIGHT_BG = [250, 250, 250] as const;
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface Attraction {
  id: string;
  name: string;
  location: string;
  city: string;
  description: string;
  image_url: string;
  time: string;
  duration: string;
  category: string;
  sort_order: number;
}

interface Day {
  id: string;
  day_number: number;
  title: string;
  subtitle: string;
  description: string;
  attractions: Attraction[];
}

interface Destination {
  id: string;
  name: string;
  image_url: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
}

interface Itinerary {
  title: string;
  subtitle: string;
  client_name: string;
  travel_date: string;
  cover_image_url: string;
  thank_you_text: string;
  thank_you_image_url: string;
  thank_you_title?: string;
  thank_you_text_align?: string;
  thank_you_font_color?: string;
  thank_you_font_size?: number;
  thank_you_font_style?: string;
  thank_you_font_effect?: string;
  thank_you_image_size?: number;
  thank_you_image_position?: any;
  thank_you_title_font_color?: string;
  thank_you_title_font_size?: number;
  thank_you_title_font_style?: string;
  thank_you_title_font_effect?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  attraction: 'Atração',
  experience: 'Experiência',
  tour: 'Passeio',
  gastronomy: 'Gastronomia',
  landmark: 'Ponto Turístico',
  recommendation: 'Recomendação',
};

function sanitize(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .trim();
}

// Cache for loaded images to avoid duplicate fetches
const imageCache = new Map<string, string | null>();

async function loadImageViaProxy(url: string): Promise<string | null> {
  if (!url) return null;
  
  // Check cache
  if (imageCache.has(url)) return imageCache.get(url)!;

  // Try direct fetch first (works for Supabase storage URLs and same-origin)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        imageCache.set(url, dataUrl);
        return dataUrl;
      }
    }
  } catch {
    // Direct fetch failed (likely CORS), use proxy
  }

  // Use edge function proxy for cross-origin images (Google Maps, etc.)
  try {
    const { data, error } = await supabase.functions.invoke('proxy-image', {
      body: { url },
    });
    if (!error && data?.dataUrl) {
      imageCache.set(url, data.dataUrl);
      return data.dataUrl;
    }
  } catch {
    // Proxy also failed
  }

  // Final fallback: img + canvas
  try {
    const result = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      const separator = url.includes('?') ? '&' : '?';
      img.src = `${url}${separator}t=${Date.now()}`;
    });
    imageCache.set(url, result);
    return result;
  } catch {
    imageCache.set(url, null);
    return null;
  }
}

function paginateAttractions(attractions: Attraction[]): Attraction[][] {
  const pages: Attraction[][] = [];
  for (let i = 0; i < attractions.length; i += 3) {
    pages.push(attractions.slice(i, i + 3));
  }
  return pages.length > 0 ? pages : [[]];
}

export async function generateItineraryPdf(
  itinerary: Itinerary,
  destinations: Destination[],
  days: Day[],
  checklist: ChecklistItem[],
  mapImageUrl?: string,
): Promise<jsPDF> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const destinationNames = destinations.map(d => d.name).filter(Boolean);

  // Clear image cache for fresh generation
  imageCache.clear();

  // Pre-load all images in parallel for speed
  const allImageUrls: string[] = [];
  if (itinerary.cover_image_url) allImageUrls.push(itinerary.cover_image_url);
  if (itinerary.thank_you_image_url) allImageUrls.push(itinerary.thank_you_image_url);
  if (mapImageUrl) allImageUrls.push(mapImageUrl);
  days.forEach(day => {
    day.attractions.forEach(attr => {
      if (attr.image_url) allImageUrls.push(attr.image_url);
    });
  });
  
  // Load all images in parallel (batch of 5 to avoid overwhelming)
  for (let i = 0; i < allImageUrls.length; i += 5) {
    const batch = allImageUrls.slice(i, i + 5);
    await Promise.all(batch.map(url => loadImageViaProxy(url)));
  }

  // ===== COVER PAGE =====
  const coverImg = await loadImageViaProxy(itinerary.cover_image_url);
  if (coverImg) {
    pdf.addImage(coverImg, 'JPEG', 0, 0, PAGE_W, PAGE_H);
  } else {
    for (let i = 0; i < PAGE_H; i++) {
      const r = Math.round(30 + (i / PAGE_H) * 50);
      const g = Math.round(50 + (i / PAGE_H) * 30);
      const b = Math.round(120 + (i / PAGE_H) * 50);
      pdf.setFillColor(r, g, b);
      pdf.rect(0, i, PAGE_W, 1.5, 'F');
    }
  }
  // Dark overlay at bottom
  for (let i = 0; i < 120; i++) {
    const alpha = Math.min(0.7, (i / 120) * 0.7);
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(pdf.GState({ opacity: alpha }));
    pdf.rect(0, PAGE_H - 120 + i, PAGE_W, 1.5, 'F');
  }
  pdf.setGState(pdf.GState({ opacity: 1 }));

  let coverY = PAGE_H - 80;
  if (itinerary.subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...WHITE);
    pdf.text(sanitize(itinerary.subtitle).toUpperCase(), MARGIN, coverY);
    coverY += 8;
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.setTextColor(...WHITE);
  const titleLines = pdf.splitTextToSize(sanitize(itinerary.title || 'Roteiro de Viagem'), CONTENT_W);
  titleLines.forEach((line: string) => {
    pdf.text(line, MARGIN, coverY);
    coverY += 14;
  });

  if (destinationNames.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.text(destinationNames.join(' · '), MARGIN, coverY + 4);
    coverY += 12;
  }

  if (itinerary.client_name || itinerary.travel_date) {
    pdf.setFontSize(9);
    pdf.setTextColor(200, 200, 200);
    pdf.text([itinerary.client_name, itinerary.travel_date].filter(Boolean).join('  |  '), MARGIN, coverY + 4);
  }

  // ===== INDEX PAGE =====
  pdf.addPage();
  pdf.setFillColor(...LIGHT_BG);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  let y = 40;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...AMBER);
  pdf.text('INDICE', MARGIN, y);
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...DARK);
  pdf.text('Conteudo do Roteiro', MARGIN, y);
  y += 16;

  const indexItems: { label: string; detail: string }[] = [];
  if (destinations.length > 0) {
    indexItems.push({ label: 'Destinos', detail: destinationNames.join(', ') });
  }
  days.forEach(day => {
    indexItems.push({ label: day.title || `Dia ${day.day_number}`, detail: `${day.attractions.length} atracao(oes)` });
  });
  if (checklist.length > 0) indexItems.push({ label: 'Checklist de Viagem', detail: '' });
  if (mapImageUrl) indexItems.push({ label: 'Mapa da Viagem', detail: '' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  indexItems.forEach(item => {
    pdf.setTextColor(...DARK);
    pdf.text(sanitize(item.label), MARGIN, y);
    if (item.detail) {
      pdf.setTextColor(...MUTED);
      pdf.setFontSize(9);
      pdf.text(sanitize(item.detail), PAGE_W - MARGIN, y, { align: 'right' });
      pdf.setFontSize(11);
    }
    y += 10;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
  });

  // ===== DAY PAGES =====
  for (const day of days) {
    const pages = paginateAttractions(day.attractions);
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      pdf.addPage();
      pdf.setFillColor(...WHITE);
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

      let dy = 0;

      if (pageIdx === 0) {
        // Linhas douradas + retângulo preto
        pdf.setDrawColor(...AMBER);
        pdf.setLineWidth(0.6);
        pdf.line(0, 4, PAGE_W, 4);
        pdf.line(0, 6, PAGE_W, 6);
        pdf.setFillColor(30, 30, 35);
        pdf.rect(0, 8, PAGE_W, 32, 'F');
        pdf.line(0, 42, PAGE_W, 42);
        pdf.line(0, 44, PAGE_W, 44);
        pdf.setLineWidth(0.2);

        // Título do dia centralizado verticalmente no retângulo (8 → 40)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...AMBER);
        const titleText = sanitize(day.title || `DIA ${String(day.day_number).padStart(2, '0')}`).toUpperCase();
        const titleY = day.subtitle ? 23 : 27;
        pdf.text(titleText, MARGIN, titleY);
        if (day.subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(200, 200, 200);
          pdf.text(sanitize(day.subtitle), MARGIN, 33);
        }
        dy = 54;
      } else {
        dy = 25;
      }

      const pageAttractions = pages[pageIdx];
      for (let attrIdx = 0; attrIdx < pageAttractions.length; attrIdx++) {
        const attr = pageAttractions[attrIdx];
        const globalIdx = pageIdx * 3 + attrIdx;
        const isEven = globalIdx % 2 === 0;
        const blockH = 70;
        const imgW = 80;
        const textW = CONTENT_W - imgW - 6;

        const imgX = isEven ? MARGIN : MARGIN + textW + 6;
        const textX = isEven ? MARGIN + imgW + 6 : MARGIN;

        // Image
        const imgData = await loadImageViaProxy(attr.image_url);
        if (imgData) {
          try {
            pdf.addImage(imgData, 'JPEG', imgX, dy, imgW, blockH - 5);
          } catch {
            pdf.setFillColor(240, 240, 240);
            pdf.roundedRect(imgX, dy, imgW, blockH - 5, 3, 3, 'F');
          }
        } else {
          pdf.setFillColor(245, 245, 245);
          pdf.roundedRect(imgX, dy, imgW, blockH - 5, 3, 3, 'F');
          pdf.setTextColor(...MUTED);
          pdf.setFontSize(8);
          pdf.text('Sem imagem', imgX + imgW / 2, dy + blockH / 2, { align: 'center' });
        }

        // Text
        let ty = dy + 4;
        if (attr.category) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6);
          pdf.setTextColor(...AMBER);
          pdf.text((CATEGORY_LABELS[attr.category] || attr.category).toUpperCase(), textX, ty);
          ty += 7;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...DARK);
        const nameLines = pdf.splitTextToSize(sanitize(attr.name || 'Atracao'), textW);
        nameLines.slice(0, 3).forEach((line: string) => {
          pdf.text(line, textX, ty);
          ty += 7;
        });
        ty += 1;

        if (attr.location || attr.city) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(...MUTED);
          // Apenas cidade (sem região/localização longa)
          const cityOnly = sanitize(attr.city || attr.location || '').split(/[\/,]/)[0].trim();
          pdf.text(cityOnly, textX, ty);
          ty += 6;
        }

        if (attr.description) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(80, 80, 80);
          const descLines = pdf.splitTextToSize(sanitize(attr.description), textW);
          descLines.slice(0, 5).forEach((line: string) => {
            pdf.text(line, textX, ty);
            ty += 4.5;
          });
        }

        if (attr.time || attr.duration) {
          ty += 2;
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED);
          const timeStr = [attr.time ? `Horario: ${attr.time}` : '', attr.duration ? `Duracao: ${attr.duration}` : ''].filter(Boolean).join('  |  ');
          pdf.text(sanitize(timeStr), textX, ty);
        }

        dy += blockH + 5;
      }

      if (pages.length > 1) {
        pdf.setFontSize(7);
        pdf.setTextColor(...MUTED);
        pdf.text(`${sanitize(day.title)} - Pagina ${pageIdx + 1} de ${pages.length}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
      }
    }
  }

  // ===== CHECKLIST PAGE =====
  if (checklist.length > 0) {
    pdf.addPage();
    pdf.setFillColor(...WHITE);
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

    let cy = 40;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...AMBER);
    pdf.text('PREPARACAO', MARGIN, cy);
    cy += 10;
    pdf.setFontSize(22);
    pdf.setTextColor(...DARK);
    pdf.text('Checklist de Viagem', MARGIN, cy);
    cy += 16;

    const cats = Array.from(new Set(checklist.map(c => c.category)));
    const colW = (CONTENT_W - 10) / 2;
    let col = 0;
    let colY = [cy, cy];

    cats.forEach(cat => {
      const items = checklist.filter(c => c.category === cat);
      const blockH = 12 + items.length * 7;

      if (colY[col] + blockH > PAGE_H - 20) {
        col = col === 0 ? 1 : 0;
        if (colY[col] + blockH > PAGE_H - 20) {
          pdf.addPage();
          pdf.setFillColor(...WHITE);
          pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
          colY = [30, 30];
          col = 0;
        }
      }

      const x = MARGIN + col * (colW + 10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...DARK);
      pdf.text(sanitize(cat).toUpperCase(), x, colY[col]);
      colY[col] += 3;
      pdf.setDrawColor(230, 230, 230);
      pdf.line(x, colY[col], x + colW, colY[col]);
      colY[col] += 6;

      items.forEach(item => {
        pdf.setDrawColor(...MUTED);
        pdf.rect(x, colY[col] - 3, 3.5, 3.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text(sanitize(item.item), x + 6, colY[col]);
        colY[col] += 7;
      });

      colY[col] += 5;
      col = col === 0 ? 1 : 0;
    });
  }

  // ===== MAP PAGE =====
  if (mapImageUrl) {
    pdf.addPage();
    pdf.setFillColor(...WHITE);
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

    let my = 40;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...AMBER);
    pdf.text('ROTA', MARGIN, my);
    my += 10;
    pdf.setFontSize(22);
    pdf.setTextColor(...DARK);
    pdf.text('Mapa da Viagem', MARGIN, my);
    my += 14;

    const mapImg = await loadImageViaProxy(mapImageUrl);
    if (mapImg) {
      try {
        // Static map is 800x500 (ratio 1.6), fit within content area preserving aspect ratio
        const mapW = CONTENT_W;
        const mapH = mapW / 1.6; // preserve 800x500 ratio = 106.25mm
        const mapX = MARGIN;
        // Center vertically in available space
        const availableH = PAGE_H - my - 20;
        const mapY = my + Math.max(0, (availableH - mapH) / 2);
        pdf.addImage(mapImg, 'PNG', mapX, mapY, mapW, mapH);
      } catch { /* ignore */ }
    }
  }

  return pdf;
}
