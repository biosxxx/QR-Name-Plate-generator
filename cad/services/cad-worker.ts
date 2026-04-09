/// <reference lib="webworker" />

import type { OpenCascadeInstance } from 'replicad-opencascadejs';
import { buildPlaqueSolid, PLAQUE_CAD_FONT_FAMILY } from '../geometry/build-plaque-solid';
import { assertValidPlaqueCadGeometry } from '../geometry/validation';
import type { PlaqueWorkerMessage, PlaqueWorkerRequest, PlaqueWorkerResult } from './cad-worker-protocol';

type ReplicadModule = typeof import('replicad');

let replicadPromise: Promise<ReplicadModule> | null = null;
let ocInitPromise: Promise<OpenCascadeInstance> | null = null;
let fontInitPromise: Promise<void> | null = null;

const cadFontUrl = new URL('../../assets/fonts/InterVariable.ttf', import.meta.url).toString();

const loadReplicad = () => {
  if (!replicadPromise) {
    replicadPromise = import('replicad');
  }

  return replicadPromise;
};

const ensureOpenCascade = async () => {
  if (!ocInitPromise) {
    ocInitPromise = (async () => {
      const [replicadModule, ocModule] = await Promise.all([loadReplicad(), import('replicad-opencascadejs')]);
      const wasmUrl = new URL('replicad-opencascadejs/src/replicad_single.wasm', import.meta.url).toString();
      const ocFactory = ocModule.default as unknown as (options?: {
        locateFile?: (path: string, scriptDir: string) => string;
      }) => Promise<OpenCascadeInstance>;
      const oc = await ocFactory({
        locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : path),
      });

      replicadModule.setOC(oc);
      return oc;
    })();
  }

  try {
    return await ocInitPromise;
  } catch (error) {
    ocInitPromise = null;
    throw error;
  }
};

const ensureCadFont = async () => {
  if (!fontInitPromise) {
    fontInitPromise = (async () => {
      const replicadModule = await loadReplicad();
      const loadFont =
        (replicadModule as ReplicadModule & { loadFont?: typeof import('replicad')['loadFont'] }).loadFont ??
        (replicadModule as ReplicadModule & { default?: ReplicadModule }).default?.loadFont;

      if (!loadFont) {
        throw new Error('Replicad loadFont() export was not found.');
      }

      const response = await fetch(cadFontUrl);
      if (!response.ok) {
        throw new Error(`Failed to load CAD font asset: ${response.status} ${response.statusText}`);
      }

      const fontBuffer = await response.arrayBuffer();
      await loadFont(fontBuffer, PLAQUE_CAD_FONT_FAMILY);
    })();
  }

  try {
    await fontInitPromise;
  } catch (error) {
    fontInitPromise = null;
    throw error;
  }
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const post = (message: PlaqueWorkerMessage, transfer?: Transferable[]) => {
  ctx.postMessage(message, transfer ?? []);
};

const postError = (requestId: string, error: unknown) => {
  const resolvedError = error instanceof Error ? error : new Error(String(error));
  const message: PlaqueWorkerResult = {
    type: 'result',
    requestId,
    ok: false,
    payload: {
      message: resolvedError.message,
      stack: resolvedError.stack,
    },
  };
  post(message);
};

ctx.onmessage = async (event: MessageEvent<PlaqueWorkerRequest>) => {
  const request = event.data;
  if (!request || typeof request !== 'object') {
    return;
  }

  const { requestId } = request;

  try {
    if (request.type === 'warmup') {
      post({ type: 'progress', requestId, stage: 'init', done: 0, total: 1 });
      await ensureOpenCascade();
      await ensureCadFont();
      post({ type: 'progress', requestId, stage: 'init', done: 1, total: 1 });

      const result: PlaqueWorkerResult = {
        type: 'result',
        requestId,
        ok: true,
        payload: { step: new ArrayBuffer(0) },
      };
      post(result, [result.payload.step]);
      return;
    }

    if (request.type !== 'generate-step') {
      throw new Error(`Unknown cad-worker request type: ${(request as { type?: string }).type ?? 'undefined'}`);
    }

    post({ type: 'progress', requestId, stage: 'init', done: 0, total: 1 });
    await ensureOpenCascade();
    await ensureCadFont();
    post({ type: 'progress', requestId, stage: 'init', done: 1, total: 1 });

    const replicadModule = await loadReplicad();

    post({ type: 'progress', requestId, stage: 'geometry', done: 0, total: 3 });
    assertValidPlaqueCadGeometry(request.geometry);
    post({ type: 'progress', requestId, stage: 'geometry', done: 1, total: 3 });

    const plaque = buildPlaqueSolid(replicadModule, request.geometry);
    post({ type: 'progress', requestId, stage: 'geometry', done: 2, total: 3 });

    if (!plaque || !plaque.shape || plaque.shape.isNull) {
      throw new Error('Failed to build a valid plaque solid.');
    }
    post({ type: 'progress', requestId, stage: 'geometry', done: 3, total: 3 });

    post({ type: 'progress', requestId, stage: 'export', done: 0, total: 1 });
    
    // Custom face-coloring STEP exporter via XCAF
    const getOC =
      (replicadModule as ReplicadModule & { getOC?: typeof import('replicad')['getOC'] }).getOC ??
      (replicadModule as ReplicadModule & { default?: ReplicadModule }).default?.getOC;
      
    if (!getOC) {
      throw new Error('Replicad getOC() was not found.');
    }
    
    const oc = getOC() as any;
    
    const doc = new oc.TDocStd_Document(new oc.TCollection_ExtendedString_2("XmlOcaf", false));
    oc.XCAFDoc_ShapeTool.SetAutoNaming(false);
    const mainLabel = doc.Main();
    const tool = oc.XCAFDoc_DocumentTool.ShapeTool(mainLabel).get();
    const ctool = oc.XCAFDoc_DocumentTool.ColorTool(mainLabel).get();
    
    const mainShapeNode = tool.NewShape();
    tool.SetShape(mainShapeNode, plaque.shape.wrapped);
    oc.TDataStd_Name.Set_1(mainShapeNode, new oc.TCollection_ExtendedString_2("QR Name Plate", false));
    
    const hexToOCColor = (hex: string) => {
      let c = hex.startsWith('#') ? hex.slice(1) : hex;
      if(c.length === 3) c = c.split('').map(x=>x+x).join('');
      const r = parseInt(c.slice(0,2), 16)/255;
      const g = parseInt(c.slice(2,4), 16)/255;
      const b = parseInt(c.slice(4,6), 16)/255;
      return new oc.Quantity_ColorRGBA_5(r, g, b, 1.0);
    };
    
    const baseColorOc = hexToOCColor(plaque.colors.base);
    const featureColorOc = hexToOCColor(plaque.colors.feature);
    
    const faces = plaque.shape.faces;
    for (const face of faces) {
      const faceZMax = (face.boundingBox as any).max ? (face.boundingBox as any).max[2] : face.boundingBox.bounds[1][2];
      const isFeature = faceZMax > plaque.depth + 0.001;
      const color = isFeature ? featureColorOc : baseColorOc;
      
      const faceNode = tool.AddSubShape_1 ? tool.AddSubShape_1(mainShapeNode, face.wrapped) : tool.AddSubShape(mainShapeNode, face.wrapped);
      if (faceNode && (typeof faceNode.IsNull !== 'function' || !faceNode.IsNull())) {
        ctool.SetColor_3(
          faceNode, 
          color, 
          oc.XCAFDoc_ColorType.XCAFDoc_ColorSurf
        );
      }
    }
    
    tool.UpdateAssemblies();
    
    const session = new oc.XSControl_WorkSession();
    const writer = new oc.STEPCAFControl_Writer_2(
      new oc.Handle_XSControl_WorkSession_2(session),
      false
    );
    
    writer.SetColorMode(true);
    writer.SetLayerMode(true);
    writer.SetNameMode(true);
    
    const progress = new oc.Message_ProgressRange_1();
    
    writer.Transfer_1(
      new oc.Handle_TDocStd_Document_2(doc),
      oc.STEPControl_StepModelType.STEPControl_AsIs,
      null,
      progress
    );
    
    const uuid = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}.step`;
    const done = writer.Write(uuid);
    
    if (done !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
      throw new Error('Failed to write STEP file with IFSelect_ReturnStatus ' + done);
    }
    
    // Read the file generated in the virtual filesystem
    const fs = oc.FS;
    let buffer: ArrayBuffer;
    
    try {
      const dbFile = fs.readFile("/" + uuid);
      buffer = dbFile.buffer || (dbFile as Uint8Array).slice().buffer;
    } catch {
       throw new Error('Failed to read STEP file from OpenCascade virtual filesystem.');
    } finally {
       try { fs.unlink("/" + uuid); } catch {}
    }
    post({ type: 'progress', requestId, stage: 'export', done: 1, total: 1 });

    const result: PlaqueWorkerResult = {
      type: 'result',
      requestId,
      ok: true,
      payload: { step: buffer },
    };
    post(result, [buffer]);
  } catch (error) {
    postError(requestId, error);
  }
};
