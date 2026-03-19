import jsPDF from 'jspdf';

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

async function loadImage(url: string): Promise<string | null> {
  if (!url) return null;

  // Try fetch first (works for same-origin and CORS-enabled URLs)
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
      if (dataUrl) return dataUrl;
    }
  } catch {
    // fetch failed, try img element fallback
  }

  // Fallback: load via <img> + canvas (handles more cross-origin cases)
  try {
    return await new Promise<string | null>((resolve) => {
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
      // Add cache-busting to avoid stale CORS preflight
      const separator = url.includes('?') ? '&' : '?';
      img.src = `${url}${separator}t=${Date.now()}`;
    });
  } catch {
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

  // ===== COVER PAGE =====
  const coverImg = await loadImage(itinerary.cover_image_url);
  if (coverImg) {
    pdf.addImage(coverImg, 'JPEG', 0, 0, PAGE_W, PAGE_H);
  } else {
    // Gradient fallback
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
  indexItems.push({ label: 'Agradecimento', detail: '' });

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

      // Day header (first page only)
      if (pageIdx === 0) {
        pdf.setFillColor(30, 30, 35);
        pdf.rect(0, 0, PAGE_W, 35, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(...AMBER);
        pdf.text(sanitize(day.title || `DIA ${String(day.day_number).padStart(2, '0')}`).toUpperCase(), MARGIN, 18);
        if (day.subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(200, 200, 200);
          pdf.text(sanitize(day.subtitle), MARGIN, 26);
        }
        dy = 45;
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
        const imgData = await loadImage(attr.image_url);
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
          ty += 6;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...DARK);
        const nameLines = pdf.splitTextToSize(sanitize(attr.name || 'Atracao'), textW);
        nameLines.slice(0, 2).forEach((line: string) => {
          pdf.text(line, textX, ty);
          ty += 6;
        });

        if (attr.location || attr.city) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(...MUTED);
          pdf.text(sanitize([attr.location, attr.city].filter(Boolean).join(', ')), textX, ty);
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

      // Page indicator
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

      // Check if fits, switch column
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

    const mapImg = await loadImage(mapImageUrl);
    if (mapImg) {
      try {
        pdf.addImage(mapImg, 'PNG', MARGIN, my, CONTENT_W, 180);
      } catch { /* ignore */ }
    }
  }

  // ===== THANK YOU PAGE =====
  pdf.addPage();
  const tyImg = await loadImage(itinerary.thank_you_image_url);
  if (tyImg) {
    try {
      pdf.addImage(tyImg, 'JPEG', 0, 0, PAGE_W, PAGE_H);
    } catch {
      pdf.setFillColor(250, 248, 240);
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
    }
  } else {
    pdf.setFillColor(250, 248, 240);
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  }

  // Semi-transparent overlay
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.7 }));
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  pdf.setGState(pdf.GState({ opacity: 1 }));

  const thankY = PAGE_H / 2 - 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...AMBER);
  pdf.text('OBRIGADO', PAGE_W / 2, thankY, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  const thankLines = pdf.splitTextToSize(sanitize(itinerary.thank_you_text || 'Obrigado por escolher viajar conosco!'), 120);
  thankLines.forEach((line: string, i: number) => {
    pdf.text(line, PAGE_W / 2, thankY + 12 + i * 6, { align: 'center' });
  });

  return pdf;
}
