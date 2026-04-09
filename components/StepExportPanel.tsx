import React, { useState } from 'react';
import { PlaqueConfig } from '../types';
import { computePlaqueCadGeometry } from '../cad/geometry/compute-plaque-geometry';
import { usePlaqueCad } from '../cad/hooks/usePlaqueCad';
import type { PlaqueWorkerProgress } from '../cad/services/cad-worker-protocol';
import { buildQrModules } from '../utils/canvasGenerator';

type StepExportPanelProps = {
  config: PlaqueConfig;
};

const getProgressLabel = (message: PlaqueWorkerProgress) => {
  if (message.stage === 'init') {
    return message.done >= message.total ? 'CAD kernel ready.' : 'Initializing CAD kernel...';
  }

  if (message.stage === 'export') {
    return message.done >= message.total ? 'STEP export complete.' : 'Exporting STEP file...';
  }

  const progressLabel =
    message.total > 0 ? ` (${Math.min(message.done, message.total)}/${message.total})` : '';
  return `Building plaque geometry...${progressLabel}`;
};

const downloadStepFile = (stepBuffer: ArrayBuffer, config: PlaqueConfig) => {
  const blob = new Blob([stepBuffer], { type: 'application/step' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeTitle = config.text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plaque';
  anchor.href = url;
  anchor.download = `${safeTitle}-${Math.round(config.width)}x${Math.round(config.height)}mm.step`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const StepExportPanel: React.FC<StepExportPanelProps> = ({ config }) => {
  const { workerStatus, workerError, generateStep } = usePlaqueCad();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    setErrorText(null);
    setStatusText('Initializing CAD kernel...');

    try {
      const qrModules = buildQrModules(config.qrUrl);
      const geometry = computePlaqueCadGeometry(config, qrModules);
      const step = await generateStep(geometry, {
        onProgress: (message) => {
          setStatusText(getProgressLabel(message));
        },
      });

      downloadStepFile(step, config);
      setStatusText('STEP file generated successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
      setStatusText('');
    } finally {
      setIsGenerating(false);
    }
  };

  const helperText = (() => {
    if (isGenerating) {
      return statusText || 'Generating plaque geometry in the browser...';
    }

    if (workerStatus === 'warming') {
      return 'CAD kernel is warming up in the background...';
    }

    return 'Download a local 3D STEP model with the plaque body plus raised QR, text, and optional border features.';
  })();

  return (
    <div className="rounded-[12px] border border-[var(--cas-outline-variant)] bg-[var(--cas-surface-high)] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-[10px] bg-[var(--cas-surface-highest)] p-2 text-[var(--cas-primary)]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--cas-on-surface)]">3D STEP export</p>
          <p className="mt-1 text-xs text-[var(--cas-on-surface-variant)]">{helperText}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="mt-4 w-full rounded-full border border-[var(--cas-outline-variant)] bg-[var(--cas-surface-highest)] px-5 py-3 text-sm font-semibold text-[var(--cas-on-surface)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? 'Generating 3D STEP...' : 'Download 3D STEP'}
      </button>

      {errorText || workerError ? (
        <div className="mt-3 text-xs text-[var(--cas-on-error-container)]">{errorText ?? workerError}</div>
      ) : null}
    </div>
  );
};
