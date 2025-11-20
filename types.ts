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