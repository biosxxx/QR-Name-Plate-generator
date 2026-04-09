import QRCode from 'qrcode';
import { EngravingMapResult } from '../types';

const DEFAULT_QR_URL = 'https://cadautoscript.com';

export const buildQrModules = (qrUrl: string): boolean[][] => {
  const qrRaw = QRCode.create(qrUrl || DEFAULT_QR_URL, { errorCorrectionLevel: 'M' });
  const moduleCount = qrRaw.modules.size;
  const modules: boolean[][] = [];

  for (let rowIndex = 0; rowIndex < moduleCount; rowIndex += 1) {
    const row: boolean[] = [];
    for (let columnIndex = 0; columnIndex < moduleCount; columnIndex += 1) {
      row.push(qrRaw.modules.get(rowIndex, columnIndex));
    }
    modules.push(row);
  }

  return modules;
};

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
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, RESOLUTION, RESOLUTION);
  
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';

  // 1. Border
  if (hasBorder) {
    const borderWidth = 15;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth, borderWidth, RESOLUTION - borderWidth * 2, RESOLUTION - borderWidth * 2);
  }

  // 2. Text
  const textY = RESOLUTION * 0.2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let fontSize = 160;
  ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  let metrics = ctx.measureText(text);
  
  // Fit text
  while (metrics.width > RESOLUTION * 0.86 && fontSize > 12) {
    fontSize -= 6;
    ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
    metrics = ctx.measureText(text);
  }
  ctx.fillText(text, RESOLUTION / 2, textY);

  // 3. QR Code
  const modules = buildQrModules(qrUrl || DEFAULT_QR_URL);
  const moduleCount = modules.length;

  // Draw QR to Canvas
  const qrSize = RESOLUTION * 0.52;
  const qrX = (RESOLUTION - qrSize) / 2;
  const qrY = RESOLUTION * 0.35;
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

export const getQrPngDataUrl = async (text: string, sizePx = 256) =>
  QRCode.toDataURL(text || DEFAULT_QR_URL, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: sizePx,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
