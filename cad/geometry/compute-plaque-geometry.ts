import type { PlaqueConfig } from '../../types';
import type { PlaqueCadGeometry, PlaqueQrModule, PlaqueTextGeometry } from '../types/cad-types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const BORDER_INSET_RATIO = 15 / 1024;
const BORDER_STROKE_RATIO = 15 / 1024;
const TEXT_CENTER_Y_RATIO = 0.30;
const QR_TOP_RATIO = 0.35;
const QR_SIZE_RATIO = 0.52;
const TEXT_MAX_WIDTH_RATIO = 0.86;
const TEXT_FONT_RATIO = 160 / 1024;

const computeQrModules = (
  config: PlaqueConfig,
  qrModules: boolean[][],
): PlaqueQrModule[] => {
  const rows = qrModules.length;
  if (!rows) {
    return [];
  }

  const cols = qrModules[0]?.length ?? 0;
  if (!cols) {
    return [];
  }

  const qrSide = Math.min(config.width, config.height) * QR_SIZE_RATIO;
  const moduleWidth = qrSide / cols;
  const moduleHeight = qrSide / rows;
  const qrLeft = -config.width / 2 + (config.width - qrSide) / 2;
  const qrTop = config.height / 2 - config.height * QR_TOP_RATIO;
  const modules: PlaqueQrModule[] = [];

  qrModules.forEach((row, rowIndex) => {
    row.forEach((isDark, colIndex) => {
      if (!isDark) {
        return;
      }

      const centerX = qrLeft + colIndex * moduleWidth + moduleWidth / 2;
      const centerY = qrTop - rowIndex * moduleHeight - moduleHeight / 2;
      modules.push({
        centerX,
        centerY,
        width: moduleWidth,
        height: moduleHeight,
      });
    });
  });

  return modules;
};

const computeTextGeometry = (config: PlaqueConfig): PlaqueTextGeometry | null => {
  const text = config.text.trim();
  if (!text) {
    return null;
  }

  return {
    text,
    centerX: 0,
    centerY: config.height * TEXT_CENTER_Y_RATIO,
    maxWidth: config.width * TEXT_MAX_WIDTH_RATIO,
    fontSize: Math.max(config.height * TEXT_FONT_RATIO, 6),
  };
};

export const computePlaqueCadGeometry = (
  config: PlaqueConfig,
  qrModules: boolean[][],
): PlaqueCadGeometry => {
  const width = Math.max(config.width, 20);
  const height = Math.max(config.height, 20);
  const depth = Math.max(config.depth, 1);
  const cornerRadius = clamp(config.radius, 0, Math.min(width, height) / 2 - 0.01);
  const engravingDepth = clamp(depth * 0.12, 0.45, Math.min(depth * 0.55, 1.4));
  const borderInset = Math.min(width, height) * BORDER_INSET_RATIO;
  const borderStroke = Math.min(width, height) * BORDER_STROKE_RATIO;

  return {
    width,
    height,
    depth,
    cornerRadius,
    engravingDepth,
    border: config.border
      ? {
          inset: borderInset,
          stroke: borderStroke,
          radius: Math.max(cornerRadius - borderInset, 0),
        }
      : null,
    text: computeTextGeometry({ ...config, width, height, depth, radius: cornerRadius }),
    qrModules: computeQrModules({ ...config, width, height, depth, radius: cornerRadius }, qrModules),
    material: config.material,
    source: 'config',
  };
};
