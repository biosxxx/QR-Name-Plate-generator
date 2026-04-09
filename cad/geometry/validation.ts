import type { PlaqueCadGeometry } from '../types/cad-types';

const assertPositive = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero for STEP export.`);
  }
};

export const assertValidPlaqueCadGeometry = (geometry: PlaqueCadGeometry) => {
  assertPositive(geometry.width, 'Plaque width');
  assertPositive(geometry.height, 'Plaque height');
  assertPositive(geometry.depth, 'Plaque thickness');
  assertPositive(geometry.engravingDepth, 'Engraving depth');

  if (geometry.cornerRadius < 0 || geometry.cornerRadius >= Math.min(geometry.width, geometry.height) / 2) {
    throw new Error('Corner radius is outside the valid range for STEP export.');
  }

  if (geometry.border) {
    assertPositive(geometry.border.inset, 'Border inset');
    assertPositive(geometry.border.stroke, 'Border stroke');
    if (geometry.border.inset * 2 >= Math.min(geometry.width, geometry.height)) {
      throw new Error('Border inset is too large for the current plaque dimensions.');
    }
  }

  geometry.qrModules.forEach((module, index) => {
    assertPositive(module.width, `QR module ${index + 1} width`);
    assertPositive(module.height, `QR module ${index + 1} height`);
  });

  if (geometry.text) {
    assertPositive(geometry.text.fontSize, 'Text font size');
    assertPositive(geometry.text.maxWidth, 'Text max width');
  }
};
