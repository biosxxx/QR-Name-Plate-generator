import { getMaterialLabel, PlaqueConfig } from '../types';

type DrawingState = {
  config: PlaqueConfig;
  layout: {
    qrSizeMm: number;
    marginMm: number;
  };
  qrDataUrl?: string;
};

export const validatePlaqueConfig = (config: PlaqueConfig) => {
  if (config.width < 20 || config.height < 20) {
    return 'Width/height must be at least 20 mm.';
  }
  if (config.depth < 1) {
    return 'Thickness must be at least 1 mm.';
  }
  if (config.radius < 0) {
    return 'Corner radius cannot be negative.';
  }
  if (config.radius > Math.min(config.width, config.height) / 2) {
    return 'Corner radius is too large for the given size.';
  }
  if (!/^https?:\/\//i.test(config.qrUrl)) {
    return 'QR link must start with http:// or https://';
  }
  return '';
};

export const computeLayout = ({ widthMm, heightMm }: { widthMm: number; heightMm: number }) => {
  const clampedWidth = clamp(widthMm, 20, 5000);
  const clampedHeight = clamp(heightMm, 20, 5000);
  const minSide = Math.min(clampedWidth, clampedHeight);
  const qrSizeMm = clamp(minSide * 0.35, 18, Math.min(60, minSide * 0.6));
  const marginMm = clamp(minSide * 0.08, 8, 20);

  return { qrSizeMm, marginMm };
};

export const buildDrawingSvg = (state: DrawingState) => {
  const mmW = clamp(state.config.width, 20, 5000);
  const mmH = clamp(state.config.height, 20, 5000);
  const mmT = clamp(state.config.depth, 1, 1000);
  const mmR = clamp(state.config.radius, 0, Math.min(mmW, mmH) / 2);
  const aspect = mmW / mmH;

  const svgWidth = 1120;
  const svgHeight = 760;
  const sheetX = 28;
  const sheetY = 28;
  const sheetWidth = svgWidth - sheetX * 2;
  const sheetHeight = svgHeight - sheetY * 2;

  const leftPaneX = 56;
  const leftPaneY = 118;
  const leftPaneWidth = 650;
  const leftPaneHeight = 584;
  const rightPaneX = 742;
  const rightPaneY = 118;
  const rightPaneWidth = 322;
  const rightPaneHeight = 584;

  const frontMarginLeft = 74;
  const frontMarginRight = 76;
  const frontMarginTop = 78;
  const frontMarginBottom = 58;
  const plateMaxWidth = leftPaneWidth - frontMarginLeft - frontMarginRight;
  const plateMaxHeight = leftPaneHeight - frontMarginTop - frontMarginBottom;
  const plateScale = Math.min(plateMaxWidth / mmW, plateMaxHeight / mmH);
  const widthPx = mmW * plateScale;
  const heightPx = mmH * plateScale;
  const plateX = leftPaneX + frontMarginLeft + (plateMaxWidth - widthPx) / 2;
  const plateY = leftPaneY + frontMarginTop + (plateMaxHeight - heightPx) / 2;
  const radiusX = mmW > 0 ? (mmR / mmW) * widthPx : 0;
  const radiusY = mmH > 0 ? (mmR / mmH) * heightPx : 0;
  const qrSizePx = Math.min(widthPx, heightPx) * 0.52;
  const qrX = plateX + (widthPx - qrSizePx) / 2;
  const qrY = plateY + heightPx * 0.35;
  const textX = plateX + widthPx / 2;
  const textY = plateY + heightPx * 0.2;
  const textValue = state.config.text.trim() || 'CAD AutoScript';
  const title = escapeXml(textValue);
  const urlValue = state.config.qrUrl.trim() || 'https://cadautoscript.com';
  const urlLines = wrapText(urlValue, 30);
  const engravingLines = wrapText(textValue, 22);
  const titleFontSize = fitPlateTitleFontSize(textValue, widthPx, heightPx);
  const dimColor = '#334155';
  const stroke = '#0f172a';
  const qrDataUrl = state.qrDataUrl;
  const panelFill = '#f8fafc';
  const subtleStroke = '#cbd5e1';
  const borderInsetPx = Math.max(8, Math.min(widthPx, heightPx) * 0.024);
  const borderRadiusX = Math.max(radiusX - borderInsetPx, 0);
  const borderRadiusY = Math.max(radiusY - borderInsetPx, 0);
  const sideViewX = rightPaneX + 38;
  const sideViewY = rightPaneY + 412;
  const sideViewWidth = rightPaneWidth - 118;
  const sideViewThickness = clamp(mmT * 4, 16, 40);
  const sideDimX = sideViewX + sideViewWidth + 34;
  const thicknessLabelY = sideViewY + sideViewThickness / 2 + 5;
  const radiusLabelX = plateX - 22;
  const radiusLabelY = plateY + 18;

  const specRows: SpecRow[] = [
    ['Engraving text', engravingLines],
    ['QR link', urlLines],
    ['Material', [getMaterialLabel(state.config.material)]],
    ['Width', [`${formatMm(mmW)} mm`]],
    ['Height', [`${formatMm(mmH)} mm`]],
    ['Thickness', [`${formatMm(mmT)} mm`]],
    ['Corner radius', [`${formatMm(mmR)} mm`]],
    ['Border', [state.config.border ? 'Yes' : 'No']],
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 Z" fill="${dimColor}"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
  <rect x="${sheetX}" y="${sheetY}" width="${sheetWidth}" height="${sheetHeight}" rx="24" fill="#ffffff" stroke="${subtleStroke}" stroke-width="1.2"/>

  <text x="56" y="68" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="${stroke}">
    REPORT DRAWING (PREVIEW)
  </text>
  <text x="56" y="94" font-family="Inter, Arial, sans-serif" font-size="12" fill="${dimColor}">
    Front view, side thickness view, and key parameters for the generated plaque.
  </text>

  <rect x="${rightPaneX}" y="${rightPaneY}" width="${rightPaneWidth}" height="256" rx="20" fill="${panelFill}" stroke="${subtleStroke}" stroke-width="1.2"/>
  <text x="${rightPaneX + 22}" y="${rightPaneY + 28}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="${stroke}">
    SPECIFICATION
  </text>
  ${renderSpecRows(specRows, rightPaneX + 22, rightPaneY + 54, rightPaneWidth - 44)}

  <rect x="${plateX}" y="${plateY}" width="${widthPx}" height="${heightPx}" rx="${radiusX}" ry="${radiusY}"
        fill="#f1f5f9" stroke="${stroke}" stroke-width="2"/>

  ${state.config.border ? `<rect x="${plateX + borderInsetPx}" y="${plateY + borderInsetPx}" width="${Math.max(0, widthPx - borderInsetPx * 2)}" height="${Math.max(0, heightPx - borderInsetPx * 2)}" rx="${borderRadiusX}" ry="${borderRadiusY}"
        fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.75"/>` : ''}

  <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="${stroke}">
    ${title}
  </text>

  ${qrDataUrl
      ? `<image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSizePx}" height="${qrSizePx}" />`
      : `<rect x="${qrX}" y="${qrY}" width="${qrSizePx}" height="${qrSizePx}" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
       <text x="${qrX + qrSizePx / 2}" y="${qrY + qrSizePx / 2}" text-anchor="middle" dominant-baseline="middle"
             font-family="Inter, Arial, sans-serif" font-size="12" fill="${dimColor}">
         QR
       </text>`
    }

  <line x1="${plateX}" y1="${plateY - 34}" x2="${plateX + widthPx}" y2="${plateY - 34}" stroke="${dimColor}" stroke-width="2"
        marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <line x1="${plateX}" y1="${plateY}" x2="${plateX}" y2="${plateY - 28}" stroke="${dimColor}" stroke-width="1"/>
  <line x1="${plateX + widthPx}" y1="${plateY}" x2="${plateX + widthPx}" y2="${plateY - 28}" stroke="${dimColor}" stroke-width="1"/>
  <text x="${plateX + widthPx / 2}" y="${plateY - 44}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" fill="${dimColor}">
    W = ${formatMm(mmW)} mm
  </text>

  <line x1="${plateX + widthPx + 38}" y1="${plateY}" x2="${plateX + widthPx + 38}" y2="${plateY + heightPx}" stroke="${dimColor}" stroke-width="2"
        marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <line x1="${plateX + widthPx}" y1="${plateY}" x2="${plateX + widthPx + 30}" y2="${plateY}" stroke="${dimColor}" stroke-width="1"/>
  <line x1="${plateX + widthPx}" y1="${plateY + heightPx}" x2="${plateX + widthPx + 30}" y2="${plateY + heightPx}" stroke="${dimColor}" stroke-width="1"/>
  <text x="${plateX + widthPx + 54}" y="${plateY + heightPx / 2}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" fill="${dimColor}">
    H = ${formatMm(mmH)} mm
  </text>

  <line x1="${radiusLabelX}" y1="${radiusLabelY}" x2="${plateX + Math.max(radiusX * 0.75, 10)}" y2="${plateY + Math.max(radiusY * 0.75, 10)}" stroke="${dimColor}" stroke-width="1.4"/>
  <text x="${radiusLabelX - 6}" y="${radiusLabelY + 4}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" fill="${dimColor}">
    R = ${formatMm(mmR)} mm
  </text>

  <rect x="${rightPaneX}" y="${rightPaneY + 286}" width="${rightPaneWidth}" height="196" rx="20" fill="${panelFill}" stroke="${subtleStroke}" stroke-width="1.2"/>
  <text x="${rightPaneX + 22}" y="${rightPaneY + 314}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="${stroke}">
    SIDE VIEW
  </text>
  <text x="${rightPaneX + 22}" y="${rightPaneY + 336}" font-family="Inter, Arial, sans-serif" font-size="11" fill="${dimColor}">
    Thickness is shown schematically for readability.
  </text>

  <rect x="${sideViewX}" y="${sideViewY}" width="${sideViewWidth}" height="${sideViewThickness}" rx="${Math.min(sideViewThickness / 2, 10)}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2"/>
  <line x1="${sideDimX}" y1="${sideViewY}" x2="${sideDimX}" y2="${sideViewY + sideViewThickness}" stroke="${dimColor}" stroke-width="2"
        marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <line x1="${sideViewX + sideViewWidth}" y1="${sideViewY}" x2="${sideDimX - 10}" y2="${sideViewY}" stroke="${dimColor}" stroke-width="1"/>
  <line x1="${sideViewX + sideViewWidth}" y1="${sideViewY + sideViewThickness}" x2="${sideDimX - 10}" y2="${sideViewY + sideViewThickness}" stroke="${dimColor}" stroke-width="1"/>
  <text x="${sideDimX + 16}" y="${thicknessLabelY}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" fill="${dimColor}">
    T = ${formatMm(mmT)} mm
  </text>

  <text x="${56}" y="${svgHeight - 58}" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="600" fill="${stroke}">
    NOTES
  </text>
  <text x="${56}" y="${svgHeight - 36}" font-family="Inter, Arial, sans-serif" font-size="11.5" fill="${dimColor}">
    Dimensions are shown in millimeters. Layout is centered for preview and PDF reporting.
  </text>
  <text x="${56}" y="${svgHeight - 16}" font-family="Inter, Arial, sans-serif" font-size="11.5" fill="${dimColor}">
    Footer: cadautoscript.com
  </text>
</svg>`;
};

export const buildDrawingPreviewDocument = (drawingSvg: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #f8fafc;
      }

      body {
        box-sizing: border-box;
        min-height: 100vh;
        padding: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      svg {
        display: block;
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    ${drawingSvg}
  </body>
</html>`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type SpecRow = [label: string, valueLines: string[]];

const renderSpecRows = (rows: SpecRow[], x: number, startY: number, width: number) => {
  const labelWidth = 104;
  const valueX = x + labelWidth + 12;
  let currentY = startY;

  return rows
    .map(([label, valueLines]) => {
      const lineCount = Math.max(valueLines.length, 1);
      const blockHeight = 18 + lineCount * 14;
      const rowSvg = `<line x1="${x}" y1="${currentY + blockHeight - 8}" x2="${x + width}" y2="${currentY + blockHeight - 8}" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${x}" y="${currentY}" font-family="Inter, Arial, sans-serif" font-size="11.5" font-weight="600" fill="#475569">${escapeXml(label)}</text>
  <text x="${valueX}" y="${currentY}" font-family="Inter, Arial, sans-serif" font-size="11.5" fill="#0f172a">${valueLines
    .map(
      (line, index) =>
        `<tspan x="${valueX}" dy="${index === 0 ? 0 : 14}">${escapeXml(line)}</tspan>`,
    )
    .join('')}</text>`;
      currentY += blockHeight;
      return rowSvg;
    })
    .join('');
};

const wrapText = (value: string, maxChars: number) => {
  const lines: string[] = [];
  let currentLine = '';
  let lastBreakIndex = -1;

  for (const char of value) {
    currentLine += char;

    if (char === ' ' || char === '/' || char === '?' || char === '&' || char === '-' || char === '_') {
      lastBreakIndex = currentLine.length - 1;
    }

    if (currentLine.length <= maxChars) {
      continue;
    }

    if (lastBreakIndex >= 0) {
      lines.push(currentLine.slice(0, lastBreakIndex + 1).trim());
      currentLine = currentLine.slice(lastBreakIndex + 1).trimStart();
      lastBreakIndex = -1;

      for (let index = currentLine.length - 1; index >= 0; index -= 1) {
        const currentChar = currentLine[index];
        if (currentChar === ' ' || currentChar === '/' || currentChar === '?' || currentChar === '&' || currentChar === '-' || currentChar === '_') {
          lastBreakIndex = index;
          break;
        }
      }
      continue;
    }

    lines.push(currentLine.slice(0, maxChars));
    currentLine = currentLine.slice(maxChars);
    lastBreakIndex = -1;
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.length > 0 ? lines : ['-'];
};

const fitPlateTitleFontSize = (text: string, widthPx: number, heightPx: number) => {
  const base = clamp(heightPx * 0.09, 16, 34);
  const approximateWidth = Math.max(text.length, 1) * base * 0.58;
  if (approximateWidth <= widthPx * 0.72) {
    return base.toFixed(1);
  }

  return clamp(base * ((widthPx * 0.72) / approximateWidth), 12, base).toFixed(1);
};

const formatMm = (value: number) => (Math.abs(value - Math.round(value)) < 0.001 ? `${Math.round(value)}` : value.toFixed(1));

const escapeXml = (value: string) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
