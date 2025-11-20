import { PlaqueConfig } from '../types';

/**
 * A simple DXF writer implementation specifically for this app.
 * We avoid heavy external libraries by constructing the text format manually.
 */
export const generateDXF = (config: PlaqueConfig, qrModules: boolean[][]): string => {
  let dxf = "";

  // --- Helper Functions ---
  const append = (str: string) => (dxf += str + "\n");
  
  // Write a pair (Group Code, Value)
  const pair = (code: number, value: string | number) => {
    append(code.toString());
    append(value.toString());
  };

  // Start Section
  const section = (name: string) => {
    pair(0, "SECTION");
    pair(2, name);
  };

  const endSection = () => {
    pair(0, "ENDSEC");
  };

  // --- Header ---
  section("HEADER");
  pair(9, "$ACADVER");
  pair(1, "AC1009"); // R12 DXF (Most compatible)
  pair(9, "$INSUNITS");
  pair(70, 4); // Millimeters
  endSection();

  // --- Entities ---
  section("ENTITIES");

  // 1. Border (Rounded Rectangle) using LWPOLYLINE is complex in basic DXF.
  // We will approximate rounded corners with line segments or use simple lines if radius is small.
  // For high compatibility with simple laser cutters, we'll define the outer contour.
  
  const w = config.width;
  const h = config.height;
  const r = Math.min(config.radius, w/2, h/2);

  // Outer Contour (Using a Polyline with bulge for arcs would be ideal, but let's stick to lines for safety or explicit vertices)
  // A simple rectangle for the cut line
  pair(0, "LWPOLYLINE");
  pair(8, "CUT_LAYER"); // Layer name
  pair(62, 1); // Color Red
  pair(90, 4); // Number of vertices (simplified to rect for raw code, CNC operators usually radius themselves, but let's try to add points)
  pair(70, 1); // Closed
  
  // Vertex 1
  pair(10, 0); pair(20, 0);
  // Vertex 2
  pair(10, w); pair(20, 0);
  // Vertex 3
  pair(10, w); pair(20, h);
  // Vertex 4
  pair(10, 0); pair(20, h);

  // 2. The Text (Engraving Layer)
  // DXF Text is centered roughly.
  // Coordinate system: Bottom-Left is 0,0 usually.
  // Plaque center:
  const cx = w / 2;
  const cy = h * 0.8; // Text is usually at top 20%

  pair(0, "TEXT");
  pair(8, "ENGRAVE_LAYER");
  pair(62, 7); // Color White/Black
  pair(10, cx); // X
  pair(20, cy); // Y
  pair(40, Math.min(w / 10, 10)); // Height (approx font size)
  pair(1, config.text); // The text
  pair(72, 1); // Center alignment
  pair(11, cx); // Alignment point X
  pair(21, cy); // Alignment point Y

  // 3. The QR Code (Engraving Layer)
  // We need to draw a solid square (HATCH or SOLID) for every dark module.
  // QR Center:
  const qrSize = Math.min(w, h) * 0.4;
  const qrStartX = (w - qrSize) / 2;
  const qrStartY = (h * 0.35) - (qrSize / 2); // Roughly centered in bottom half
  
  const moduleCount = qrModules.length;
  const moduleSize = qrSize / moduleCount;

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qrModules[r][c]) {
        // Draw a SOLID (filled quad)
        const x = qrStartX + c * moduleSize;
        const y = (qrStartY + qrSize) - r * moduleSize; // Flip Y because image coords vs cartesian

        pair(0, "SOLID");
        pair(8, "ENGRAVE_LAYER");
        pair(62, 7);
        // Point 1 (Bottom Left)
        pair(10, x); pair(20, y - moduleSize);
        // Point 2 (Bottom Right)
        pair(10, x + moduleSize); pair(20, y - moduleSize);
        // Point 3 (Top Left) - DXF Solid vertex order is weird: 1, 2, 4, 3 for rectangular?
        // Actually Standard order 0,1,2,3 works for SOLID in R12
        pair(10, x); pair(20, y);
        // Point 4 (Top Right)
        pair(10, x + moduleSize); pair(20, y);
      }
    }
  }

  // 4. Inner Border (if enabled)
  if (config.border) {
    const margin = 3;
    pair(0, "LWPOLYLINE");
    pair(8, "ENGRAVE_LAYER");
    pair(62, 5); // Color Blue
    pair(90, 5); 
    pair(70, 1); // Closed
    pair(10, margin); pair(20, margin);
    pair(10, w - margin); pair(20, margin);
    pair(10, w - margin); pair(20, h - margin);
    pair(10, margin); pair(20, h - margin);
    pair(10, margin); pair(20, margin);
  }

  endSection(); // ENTITIES
  
  pair(0, "EOF");

  return dxf;
};