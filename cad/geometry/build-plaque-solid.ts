import type { AnyShape, Drawing, Shape3D } from 'replicad';
import type { PlaqueCadGeometry } from '../types/cad-types';

type ReplicadModule = typeof import('replicad');

export const PLAQUE_CAD_FONT_FAMILY = 'qr-nameplate-inter';

const getReplicadExport = <TExport,>(
  replicadModule: ReplicadModule,
  exportName: string,
): TExport | undefined => {
  const moduleWithDefault = replicadModule as ReplicadModule & { default?: ReplicadModule };
  return (moduleWithDefault as unknown as Record<string, TExport | undefined>)[exportName] ??
    (moduleWithDefault.default as unknown as Record<string, TExport | undefined> | undefined)?.[exportName];
};

const asShape3D = (shape: AnyShape): Shape3D => shape as unknown as Shape3D;

const buildBorderFeature = (
  drawRoundedRectangle: (width: number, height: number, radius?: number) => Drawing,
  geometry: PlaqueCadGeometry,
): Shape3D | null => {
  if (!geometry.border) {
    return null;
  }

  const outerWidth = geometry.width - geometry.border.inset * 2;
  const outerHeight = geometry.height - geometry.border.inset * 2;
  const innerWidth = outerWidth - geometry.border.stroke * 2;
  const innerHeight = outerHeight - geometry.border.stroke * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return null;
  }

  const outer = drawRoundedRectangle(outerWidth, outerHeight, geometry.border.radius);
  const inner = drawRoundedRectangle(
    innerWidth,
    innerHeight,
    Math.max(geometry.border.radius - geometry.border.stroke, 0),
  );
  const ring = outer.cut(inner);

  return asShape3D(
    ring
      .sketchOnPlane('XY', geometry.depth - 0.01)
      .extrude(geometry.engravingDepth + 0.01),
  );
};

const buildQrFeatureSolids = (
  drawRoundedRectangle: (width: number, height: number, radius?: number) => Drawing,
  geometry: PlaqueCadGeometry,
): Shape3D[] =>
  geometry.qrModules.map((module) =>
    asShape3D(
      drawRoundedRectangle(module.width, module.height, 0)
        .translate(module.centerX, module.centerY)
        .sketchOnPlane('XY', geometry.depth - 0.01)
        .extrude(geometry.engravingDepth + 0.01),
    ),
  );

export const getBaseColors = (material: string) => {
  switch (material) {
    case 'copper':
      return { base: '#b87333', feature: '#101114' };
    case 'granite':
      return { base: '#2b2d31', feature: '#d8dadd' };
    case 'gold':
      return { base: '#c9a227', feature: '#17120a' };
    case 'steel':
    default:
      return { base: '#d4d7dd', feature: '#111317' };
  }
};


const buildTextFeature = (
  drawText: (
    text: string,
    config?: { startX?: number; startY?: number; fontSize?: number; fontFamily?: string },
  ) => Drawing,
  geometry: PlaqueCadGeometry,
): Shape3D | null => {
  if (!geometry.text || !geometry.text.text) {
    return null;
  }

  try {
    let drawing = drawText(geometry.text.text, {
      startX: 0,
      startY: 0,
      fontSize: geometry.text.fontSize,
      fontFamily: PLAQUE_CAD_FONT_FAMILY,
    });
    const bounds = drawing.boundingBox;
    const textWidth = bounds.width;

    if (textWidth <= 0) {
      throw new Error('Text drawing width resolved to zero.');
    }

    if (textWidth > geometry.text.maxWidth) {
      drawing = drawing.scale(geometry.text.maxWidth / textWidth, [0, 0]);
    }

    const scaledBounds = drawing.boundingBox;
    const [centerX, centerY] = scaledBounds.center;
    drawing = drawing.translate(
      geometry.text.centerX - centerX,
      geometry.text.centerY - centerY,
    );

    return asShape3D(
      drawing
        .sketchOnPlane('XY', geometry.depth - 0.01)
        .extrude(geometry.engravingDepth + 0.01),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`STEP text generation failed: ${message}`);
  }
};

export interface PlaqueSolidResult {
  shape: Shape3D;
  colors: { base: string; feature: string };
  depth: number;
}

export const buildPlaqueSolid = (
  replicadModule: ReplicadModule,
  geometry: PlaqueCadGeometry,
): PlaqueSolidResult => {
  const drawRoundedRectangle = getReplicadExport<
    (width: number, height: number, radius?: number) => Drawing
  >(replicadModule, 'drawRoundedRectangle');
  const drawText = getReplicadExport<
    (text: string, config?: { startX?: number; startY?: number; fontSize?: number; fontFamily?: string }) => Drawing
  >(replicadModule, 'drawText');
  const makeCompound = getReplicadExport<(shapes: Shape3D[]) => Shape3D>(replicadModule, 'makeCompound');

  if (!drawRoundedRectangle) {
    throw new Error('Replicad drawRoundedRectangle() export was not found.');
  }

  const colors = getBaseColors(geometry.material);

  let baseSolid = asShape3D(
    drawRoundedRectangle(geometry.width, geometry.height, geometry.cornerRadius)
      .sketchOnPlane('XY')
      .extrude(geometry.depth),
  );

  baseSolid = typeof baseSolid.simplify === 'function' ? baseSolid.simplify() : baseSolid;

  const features: Shape3D[] = [];
  const borderFeature = buildBorderFeature(drawRoundedRectangle, geometry);
  if (borderFeature) {
    features.push(borderFeature);
  }

  features.push(...buildQrFeatureSolids(drawRoundedRectangle, geometry));

  if (drawText) {
    const textFeature = buildTextFeature(drawText, geometry);
    if (textFeature) {
      features.push(textFeature);
    }
  }

  if (features.length > 0) {
    if (makeCompound) {
      try {
        baseSolid = baseSolid.fuse(asShape3D(makeCompound(features)));
      } catch {
        features.forEach((feature) => {
          baseSolid = baseSolid.fuse(feature);
        });
      }
    } else {
      features.forEach((feature) => {
        baseSolid = baseSolid.fuse(feature);
      });
    }
  }

  baseSolid = typeof baseSolid.simplify === 'function' ? baseSolid.simplify() : baseSolid;

  return {
    shape: baseSolid,
    colors,
    depth: geometry.depth,
  };
};
