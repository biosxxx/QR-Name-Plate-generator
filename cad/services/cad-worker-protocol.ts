import type { PlaqueCadGeometry } from '../types/cad-types';

export type PlaqueWarmupRequest = {
  type: 'warmup';
  requestId: string;
};

export type PlaqueStepRequest = {
  type: 'generate-step';
  requestId: string;
  geometry: PlaqueCadGeometry;
};

export type PlaqueWorkerRequest = PlaqueWarmupRequest | PlaqueStepRequest;

export type PlaqueWorkerProgress = {
  type: 'progress';
  requestId: string;
  stage: 'init' | 'geometry' | 'export';
  done: number;
  total: number;
};

export type PlaqueWorkerResult =
  | {
      type: 'result';
      requestId: string;
      ok: true;
      payload: { step: ArrayBuffer };
    }
  | {
      type: 'result';
      requestId: string;
      ok: false;
      payload: { message: string; stack?: string };
    };

export type PlaqueWorkerMessage = PlaqueWorkerProgress | PlaqueWorkerResult;
