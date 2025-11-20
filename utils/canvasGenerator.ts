import QRCode from 'qrcode';
import { EngravingMapResult } from '../types';

export const generatePlaqueTexture = async (
  text: string,
  qrUrl: string,
  widthMm: number,
  heightMm: number,
  hasBorder: boolean
): Promise<EngravingMapResult> => {
  const RESOLUTION = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = RESOLUTION;
  canvas.height = RESOLUTION;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // Aspect ratio of the physical object
  // We map the physical aspect ratio to the square texture 
  // But for the UV mapping on a Box, Three.js stretches. 
  // To keep it simple for the texture generation: we draw as if the canvas represents the face 1:1
  // However, since the box can be rectangular, we should draw into the canvas preserving the aspect ratio relative to the square canvas?
  // No, usually UV mapping on a cube face stretches 0..1 to corners.
  // So we draw the design stretched to 1024x1024, and the 3D geometry handles the aspect ratio.
  
  // Fill Background (Black for engraving map - assumes metal is white/grey and engraving is black? 
  // Actually for bump map: Black = deep (engraved), White = surface)
  ctx.fillStyle = 'white'; // Surface
  ctx.fillRect(0, 0, RESOLUTION, RESOLUTION);
  
  ctx.fillStyle = 'black'; // Engraving
  ctx.strokeStyle = 'black';

  // 1. Border
  if (hasBorder) {
    const borderWidth = 20;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth/2, borderWidth/2, RESOLUTION - borderWidth, RESOLUTION - borderWidth);
  }

  // 2. Text
  const textY = RESOLUTION * 0.2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let fontSize = 120;
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  let metrics = ctx.measureText(text);
  
  // Fit text
  while (metrics.width > RESOLUTION * 0.8 && fontSize > 20) {
    fontSize -= 5;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    metrics = ctx.measureText(text);
  }
  ctx.fillText(text, RESOLUTION / 2, textY);

  // 3. QR Code
  // We need the raw modules for DXF export later, so we generate using create()
  const qrRaw = QRCode.create(qrUrl || "https://example.com", { errorCorrectionLevel: 'M' });
  const moduleCount = qrRaw.modules.size;
  const modules: boolean[][] = [];
  
  // Extract boolean matrix
  for(let r=0; r<moduleCount; r++) {
    const row: boolean[] = [];
    for(let c=0; c<moduleCount; c++) {
      row.push(qrRaw.modules.get(r, c));
    }
    modules.push(row);
  }

  // Draw QR to Canvas
  const qrSize = RESOLUTION * 0.45;
  const qrX = (RESOLUTION - qrSize) / 2;
  const qrY = RESOLUTION * 0.40;
  const cellSize = qrSize / moduleCount;

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c]) {
        ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize, cellSize);
      }
    }
  }

  return {
    canvas,
    qrModules: modules
  };
};

export const generatePreviewPDF = async (canvas: HTMLCanvasElement, widthMm: number, heightMm: number): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  
  // Orientation based on dimensions
  const orientation = widthMm > heightMm ? 'l' : 'p';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(18);
  doc.text("Plaque Design Proof", 10, 10);
  doc.setFontSize(10);
  doc.text(`Dimensions: ${widthMm}mm x ${heightMm}mm`, 10, 16);

  // Add Image
  // Scale image to fit page with margins
  const margin = 20;
  const availableW = pageWidth - (margin * 2);
  const availableH = pageHeight - 40; // minus header

  const ratio = widthMm / heightMm;
  let finalW = availableW;
  let finalH = availableW / ratio;

  if (finalH > availableH) {
    finalH = availableH;
    finalW = availableH * ratio;
  }

  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', (pageWidth - finalW) / 2, 30, finalW, finalH);

  doc.save('plaque-design.pdf');
};