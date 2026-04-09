import type { PlaqueConfig } from '../../types';

export type PlaqueQrModule = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

export type PlaqueBorderGeometry = {
  inset: number;
  stroke: number;
  radius: number;
};

export type PlaqueTextGeometry = {
  text: string;
  centerX: number;
  centerY: number;
  maxWidth: number;
  fontSize: number;
};

export type PlaqueCadGeometry = {
  width: number;
  height: number;
  depth: number;
  cornerRadius: number;
  engravingDepth: number;
  border: PlaqueBorderGeometry | null;
  text: PlaqueTextGeometry | null;
  qrModules: PlaqueQrModule[];
  material: PlaqueConfig['material'];
  source: 'config';
};
