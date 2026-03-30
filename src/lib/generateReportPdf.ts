import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportPdfOptions {
  title: string;
  period?: string;
  headers: string[];
  rows: string[][];
  totals?: { label: string; value: string }[];
}

export function generateReportPdf({ title, period, headers, rows, totals }: ReportPdfOptions) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' });

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  if (period) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Período: ${period}`, 14, 25);
    doc.setTextColor(0);
  }

  const startY = period ? 32 : 26;

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  });

  if (totals && totals.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 20;
    let y = finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    totals.forEach(t => {
      doc.text(`${t.label}: ${t.value}`, 14, y);
      y += 7;
    });
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, doc.internal.pageSize.height - 8);

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}
