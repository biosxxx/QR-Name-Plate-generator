<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# QR Name Plate Generator

A web application for designing QR-enabled plaques/nameplates with an interactive 3D preview and export to production-ready formats. Based on the codebase, the app works mostly **entirely on the client side**: the user enters parameters, and the browser locally generates the preview, PDF report, DXF, and STEP model.

---

## 🚀 Key Features

### For the user
- enter engraving text;
- generate a QR code from a user-provided link;
- configure **width, height, thickness, and corner radius** in millimeters;
- enable or disable a decorative border;
- choose the plaque material: **stainless steel**, **copper**, **black granite**;
- use an interactive **3D preview** with orbit and zoom;
- update the model automatically or manually;
- open the **drawing preview** in a separate window;
- export a **PDF report** with technical parameters and a drawing preview;
- export **DXF** for CNC / laser / CAD workflows;
- export a **3D STEP** file directly in the browser via a local CAD worker.

### What happens technically inside the app
- when the link changes, the QR code is regenerated using the `qrcode` library;
- the 3D scene is updated with `React + Three.js + @react-three/fiber`;
- the SVG drawing and PDF document are generated locally without a server;
- the STEP model is created in a `Web Worker` so the UI stays responsive;
- the plaque body, border, text, and QR modules are computed separately and then assembled into a CAD solid.

---

## 👤 User Workflow

1. The user enters the engraving text and the QR code URL.
2. The user sets the plaque dimensions: `Width`, `Height`, `Thickness`, and `Corner radius`.
3. The user selects a material and optionally enables `Add border`.
4. The user enables `Auto-update 3D` or manually clicks `Update 3D preview`.
5. The user inspects the result in the interactive 3D view.
6. If needed, the user opens `View drawing preview`.
7. The user exports the result in one of the available formats:
   - `Download PDF report`
   - `Download DXF`
   - `Download 3D STEP`

---

## 🧩 Architecture and Code Structure

| File / module | Purpose |
|---|---|
| `App.tsx` | Main UI logic entry point: stores `formConfig` / `previewConfig`, runs validation, debounced 3D updates, triggers PDF and DXF export, and opens the drawing modal. |
| `components/Controls.tsx` | Left-side control panel with form inputs, toggles, material selection, and export buttons. |
| `components/Scene.tsx` | 3D scene built with `react-three-fiber` and `drei`: creates the plaque body, border, text, and QR elements, and configures the camera and materials. |
| `components/StepExportPanel.tsx` | Dedicated STEP export panel showing CAD generation progress and worker errors. |
| `utils/canvasGenerator.ts` | Generates the QR matrix and QR PNG data URL. |
| `utils/drawingPreview.ts` | Validates the configuration, computes layout values, and generates the SVG drawing for preview / PDF. |
| `utils/pdfReport.ts` | Builds the PDF report using `jsPDF`, including the parameter table and embedded drawing preview. |
| `utils/dxfGenerator.ts` | Builds a DXF file locally in R12 text format without using a heavy external CAD library. |
| `cad/geometry/compute-plaque-geometry.ts` | Converts user parameters into CAD geometry: base dimensions, relief depth, text placement, and QR module placement. |
| `cad/geometry/build-plaque-solid.ts` | Creates the final STEP solid model with `replicad`. |
| `cad/hooks/usePlaqueCad.ts` | React hook for warming up the CAD kernel and triggering STEP generation. |
| `cad/services/cad-worker.ts` | Web Worker that initializes `OpenCascade`, loads the font, and exports STEP in the background. |
| `types.ts` | Domain types such as `PlaqueConfig`, `MaterialType`, material labels, and shared interfaces. |

---

## ⚙️ Key Implementation Details

### 1) Parameter validation
In `utils/drawingPreview.ts`, the app checks the following constraints:
- width and height must be **at least 20 mm**;
- thickness must be **at least 1 mm**;
- corner radius cannot be negative;
- corner radius must not exceed half of the smaller side;
- the QR link must start with `http://` or `https://`.

### 2) 3D rendering
In `components/Scene.tsx`:
- the app uses `Canvas` from `@react-three/fiber`;
- the environment is added via `Environment preset="city"`;
- the camera and `OrbitControls` let the user rotate and zoom the model;
- QR modules are rendered with `instancedMesh`, reducing browser overhead;
- materials are configured with `meshPhysicalMaterial` to simulate metal and stone surfaces.

### 3) CAD / STEP generation
In `cad/services/cad-worker.ts` and `cad/geometry/build-plaque-solid.ts`:
- STEP export is offloaded to a `Web Worker`;
- the app uses `replicad` + `replicad-opencascadejs`;
- the `InterVariable.ttf` font is loaded into the CAD kernel for text generation;
- the QR code, border, and text are fused with the base plate into a single solid body.

### 4) PDF and DXF
- `pdfReport.ts` creates an A4 report with a parameter table, timestamp, and embedded drawing preview.
- `dxfGenerator.ts` manually builds the DXF structure, including the plaque outline, text, and dark QR cells as `SOLID` entities.

---

## 🛠️ Technologies and Library Versions

### Runtime dependencies

| Library | Version | Purpose |
|---|---:|---|
| `react` | `^19.2.4` | UI and application state management |
| `react-dom` | `^19.2.4` | Rendering the React app into the DOM |
| `three` | `0.183.2` | Low-level 3D engine |
| `@react-three/fiber` | `9.5.0` | React renderer for Three.js |
| `@react-three/drei` | `10.7.7` | Ready-made 3D helpers and controls (`Environment`, `OrbitControls`) |
| `qrcode` | `1.5.4` | QR code generation from a user link |
| `jspdf` | `4.2.1` | Browser-side PDF report generation |
| `replicad` | `^0.23.0` | Parametric CAD modeling for STEP geometry |
| `replicad-opencascadejs` | `^0.23.0` | OpenCascade/WASM kernel for CAD operations |
| `tailwindcss` | `^4.2.2` | Utility-first styling for the interface |
| `@tailwindcss/vite` | `^4.2.2` | Tailwind integration for Vite |

### Dev dependencies

| Library | Version | Purpose |
|---|---:|---|
| `typescript` | `~6.0.2` | Static typing |
| `vite` | `^8.0.7` | Development server and production build tool |
| `@vitejs/plugin-react` | `^6.0.1` | React support for Vite |
| `@types/node` | `^25.5.2` | Node.js typings for tooling and config |

---

## 📁 Current Implementation Notes

- All user-facing dimension inputs use **millimeters**.
- The preview updates with a small debounce (`250ms`) to keep the UI responsive.
- STEP generation runs asynchronously and reports intermediate progress.
- `types.ts` includes a `gold` material option, but it is not currently exposed in the UI.

> The project still contains traces of the original AI Studio starter template: `.env.local` and `vite.config.ts` include `GEMINI_API_KEY`, but the current QR/CAD/PDF user workflow does not depend on the Gemini API.

---

## ▶️ Run Locally

**Requirements:** Node.js

### Using npm
```bash
npm install
npm run dev
```

### Using pnpm
```bash
pnpm install
pnpm dev
```

According to `vite.config.ts`, the dev server runs on:
- `http://localhost:3000`

---

## 📦 Production Build

```bash
npm run build
npm run preview
```

or

```bash
pnpm build
pnpm preview
```

---

## 📌 Summary

`QR-Name-Plate-generator` is a compact CAD-oriented frontend project built with `React + TypeScript + Vite`. It allows users to quickly design a QR-enabled nameplate, inspect it in 3D, and immediately export the result to **PDF**, **DXF**, and **STEP** without requiring a separate backend server.
