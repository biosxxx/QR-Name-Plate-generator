import { jsPDF } from 'jspdf';
import { getMaterialLabel, PlaqueConfig } from '../types';

type ReportState = {
  config: PlaqueConfig;
  layout: {
    qrSizeMm: number;
    marginMm: number;
  };
  qrDataUrl?: string;
};

export const downloadPdfReport = async (
  state: ReportState,
  { drawingSvg, qrDataUrl }: { drawingSvg?: string; qrDataUrl?: string } = {},
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('QR Nameplate - Report Drawing', margin, margin + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`, margin, margin + 13);

  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.textWithLink('cadautoscript.com', pageWidth - margin, pageHeight - 8, {
    url: 'https://cadautoscript.com',
    align: 'right',
  });
  doc.setTextColor(0, 0, 0);

  const tableTop = margin + 20;
  const rowHeight = 7;
  const leftColumnWidth = 52;
  const rightColumnWidth = pageWidth - margin * 2 - leftColumnWidth;
  const rows = buildRows(state);

  let y = tableTop;
  drawCell(doc, margin, y, leftColumnWidth, rowHeight, 'Parameter', true);
  drawCell(doc, margin + leftColumnWidth, y, rightColumnWidth, rowHeight, 'Value', true);
  y += rowHeight;

  rows.forEach(([key, value]) => {
    drawCell(doc, margin, y, leftColumnWidth, rowHeight, key);
    drawCell(doc, margin + leftColumnWidth, y, rightColumnWidth, rowHeight, value);
    y += rowHeight;
  });

  const drawingTop = y + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Drawing preview', margin, drawingTop);

  const boxTop = drawingTop + 4;
  const boxHeight = pageHeight - boxTop - 18;
  const boxWidth = pageWidth - margin * 2;

  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, boxTop, boxWidth, boxHeight);

  if (drawingSvg) {
    const png = await svgToPngDataUrl(drawingSvg, 1400, 900);
    const pad = 4;
    doc.addImage(png, 'PNG', margin + pad, boxTop + pad, boxWidth - pad * 2, boxHeight - pad * 2, undefined, 'FAST');
  }

  if (qrDataUrl) {
    const qrSize = 24;
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - qrSize, margin + 4, qrSize, qrSize, undefined, 'FAST');
  }

  doc.save(`qr-nameplate_${state.config.width}x${state.config.height}mm.pdf`);
};

const buildRows = (state: ReportState) => [
  ['Engraving text', safe(state.config.text)],
  ['QR link', safe(state.config.qrUrl)],
  ['Width (mm)', String(state.config.width)],
  ['Height (mm)', String(state.config.height)],
  ['Thickness (mm)', String(state.config.depth)],
  ['Corner radius (mm)', String(state.config.radius)],
  ['Border', state.config.border ? 'Yes' : 'No'],
  ['Material', getMaterialLabel(state.config.material)],
  ['QR size (mm)', String(state.layout.qrSizeMm.toFixed(0))],
  ['Margin (mm)', String(state.layout.marginMm.toFixed(0))],
];

const safe = (value: string) => value.trim() || '-';

const drawCell = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  header = false,
) => {
  if (header) {
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(241, 245, 249);
    doc.rect(x, y, width, height, 'F');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  doc.rect(x, y, width, height);
  doc.setFontSize(10);
  doc.text(String(text), x + 2.5, y + 4.8, { maxWidth: width - 5 });
};

const svgToPngDataUrl = async (svgString: string, widthPx: number, heightPx: number) => {
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const scale = Math.min(widthPx / image.width, heightPx / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = (widthPx - drawWidth) / 2;
    const drawY = (heightPx - drawHeight) / 2;

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load drawing image for PDF export.'));
    img.src = src;
  });
