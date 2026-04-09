export enum MaterialType {
  STEEL = 'steel',
  COPPER = 'copper',
  GRANITE = 'granite',
  GOLD = 'gold'
}

export interface PlaqueConfig {
  text: string;
  qrUrl: string;
  width: number; // mm
  height: number; // mm
  depth: number; // mm
  radius: number; // mm
  border: boolean;
  material: MaterialType;
}

export interface EngravingMapResult {
  canvas: HTMLCanvasElement;
  qrModules: boolean[][]; // True = dark, False = light
}

export const getMaterialLabel = (material: MaterialType) => {
  switch (material) {
    case MaterialType.COPPER:
      return 'Copper';
    case MaterialType.GRANITE:
      return 'Black granite';
    case MaterialType.GOLD:
      return 'Gold';
    case MaterialType.STEEL:
    default:
      return 'Stainless steel';
  }
};
