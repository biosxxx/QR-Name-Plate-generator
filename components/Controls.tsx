import React from 'react';
import { PlaqueConfig, MaterialType } from '../types';
import { StepExportPanel } from './StepExportPanel';

interface ControlsProps {
  config: PlaqueConfig;
  autoUpdate: boolean;
  validationMessage: string;
  isUpdatingPreview: boolean;
  isGeneratingPdf: boolean;
  isExportingDxf: boolean;
  onChange: (newConfig: PlaqueConfig) => void;
  onAutoUpdateChange: (enabled: boolean) => void;
  onGeneratePreview: () => void;
  onDownloadPDF: () => void;
  onDownloadDXF: () => void;
  onShowDrawing: () => void;
}

const materials = [
  { id: MaterialType.STEEL, label: 'Stainless steel' },
  { id: MaterialType.COPPER, label: 'Copper' },
  { id: MaterialType.GRANITE, label: 'Black granite' },
];

export const Controls: React.FC<ControlsProps> = ({
  config,
  autoUpdate,
  validationMessage,
  isUpdatingPreview,
  isGeneratingPdf,
  isExportingDxf,
  onChange,
  onAutoUpdateChange,
  onGeneratePreview,
  onDownloadPDF,
  onDownloadDXF,
  onShowDrawing,
}) => {
  const handleChange = (field: keyof PlaqueConfig, value: PlaqueConfig[keyof PlaqueConfig]) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--cas-outline-variant)] bg-[var(--cas-surface-low)] shadow-[var(--cas-elevation-1)]">
      <div className="px-6 pb-4 pt-6">
        <h2 className="text-[22px] font-normal text-[var(--cas-on-surface)]">Parameters</h2>
        <p className="mt-1 text-xs text-[var(--cas-on-surface-variant)]">All units are in millimeters (mm).</p>
      </div>

      <div className="flex flex-col gap-5 px-6 pb-6">
        <div>
          <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">Engraving text</label>
          <input
            type="text"
            value={config.text}
            onChange={(event) => handleChange('text', event.target.value)}
            className="w-full rounded-[4px] border border-transparent border-b-[2px] border-b-[var(--cas-outline)] bg-[var(--cas-surface-high)] px-4 py-3 text-base text-[var(--cas-on-surface)] outline-none transition focus:border-b-[var(--cas-primary)] focus:bg-[var(--cas-surface-highest)]"
            placeholder="Enter engraving text"
          />
          <div className="ml-4 mt-1.5 text-[11px] text-[var(--cas-on-surface-variant)]">Text is auto-fit to the texture width.</div>
        </div>

        <div>
          <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">QR link</label>
          <input
            type="url"
            value={config.qrUrl}
            onChange={(event) => handleChange('qrUrl', event.target.value)}
            className="w-full rounded-[4px] border border-transparent border-b-[2px] border-b-[var(--cas-outline)] bg-[var(--cas-surface-high)] px-4 py-3 text-base text-[var(--cas-on-surface)] outline-none transition focus:border-b-[var(--cas-primary)] focus:bg-[var(--cas-surface-highest)]"
            placeholder="https://cadautoscript.com"
          />
          <div className="ml-4 mt-1.5 text-[11px] text-[var(--cas-on-surface-variant)]">Default is the CAD AutoScript website.</div>
        </div>

        <div className="h-px bg-[var(--cas-outline-variant)]" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">Width (mm)</label>
            <input
              type="number"
              min={20}
              step={1}
              value={config.width}
              onChange={(event) => handleChange('width', Number(event.target.value))}
              className="w-full rounded-[4px] border border-transparent border-b-[2px] border-b-[var(--cas-outline)] bg-[var(--cas-surface-high)] px-4 py-3 text-base text-[var(--cas-on-surface)] outline-none transition focus:border-b-[var(--cas-primary)] focus:bg-[var(--cas-surface-highest)]"
            />
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">Height (mm)</label>
            <input
              type="number"
              min={20}
              step={1}
              value={config.height}
              onChange={(event) => handleChange('height', Number(event.target.value))}
              className="w-full rounded-[4px] border border-transparent border-b-[2px] border-b-[var(--cas-outline)] bg-[var(--cas-surface-high)] px-4 py-3 text-base text-[var(--cas-on-surface)] outline-none transition focus:border-b-[var(--cas-primary)] focus:bg-[var(--cas-surface-highest)]"
            />
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">Thickness (mm)</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={config.depth}
              onChange={(event) => handleChange('depth', Number(event.target.value))}
              className="w-full rounded-[4px] border border-transparent border-b-[2px] border-b-[var(--cas-outline)] bg-[var(--cas-surface-high)] px-4 py-3 text-base text-[var(--cas-on-surface)] outline-none transition focus:border-b-[var(--cas-primary)] focus:bg-[var(--cas-surface-highest)]"
            />
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">Corner radius (mm)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={config.radius}
              onChange={(event) => handleChange('radius', Number(event.target.value))}
              className="w-full rounded-[4px] border border-transparent border-b-[2px] border-b-[var(--cas-outline)] bg-[var(--cas-surface-high)] px-4 py-3 text-base text-[var(--cas-on-surface)] outline-none transition focus:border-b-[var(--cas-primary)] focus:bg-[var(--cas-surface-highest)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-[12px] bg-[var(--cas-surface-high)] px-4 py-3 text-sm font-medium text-[var(--cas-on-surface)]">
            <input
              type="checkbox"
              checked={config.border}
              onChange={(event) => handleChange('border', event.target.checked)}
              className="h-[18px] w-[18px] accent-[var(--cas-primary)]"
            />
            <span>Add border</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-[12px] bg-[var(--cas-surface-high)] px-4 py-3 text-sm font-medium text-[var(--cas-on-surface)]">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(event) => onAutoUpdateChange(event.target.checked)}
              className="h-[18px] w-[18px] accent-[var(--cas-primary)]"
            />
            <span>Auto-update 3D</span>
          </label>
        </div>

        <div>
          <label className="mb-2 ml-1 block text-xs font-medium text-[var(--cas-on-surface-variant)]">Material</label>
          <div className="flex flex-col gap-2">
            {materials.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => handleChange('material', material.id)}
                className={`flex items-center rounded-[8px] border px-4 py-3 text-left text-sm font-medium transition ${
                  config.material === material.id
                    ? 'border-transparent bg-[var(--cas-secondary-container)] text-[var(--cas-on-secondary-container)]'
                    : 'border-[var(--cas-outline-variant)] bg-[var(--cas-surface-high)] text-[var(--cas-on-surface-variant)] hover:bg-[var(--cas-surface-highest)]'
                }`}
              >
                {config.material === material.id ? <span className="mr-2 font-bold">✓</span> : null}
                <span>{material.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`min-h-6 rounded-[8px] px-4 py-2 text-sm ${
            validationMessage
              ? 'block bg-[var(--cas-error-container)] text-[var(--cas-on-error-container)]'
              : 'hidden'
          }`}
          aria-live="polite"
        >
          {validationMessage}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onGeneratePreview}
            disabled={isUpdatingPreview}
            className="rounded-full bg-[var(--cas-primary)] px-5 py-3 text-sm font-semibold text-[var(--cas-on-primary)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdatingPreview ? 'Updating...' : 'Update 3D preview'}
          </button>
          <button
            type="button"
            onClick={onDownloadPDF}
            disabled={isGeneratingPdf}
            className="rounded-full border border-[var(--cas-outline-variant)] bg-[var(--cas-surface-high)] px-5 py-3 text-sm font-semibold text-[var(--cas-primary)] transition hover:bg-[var(--cas-surface-highest)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingPdf ? 'Generating...' : 'Download PDF report'}
          </button>
        </div>

        <button
          type="button"
          onClick={onShowDrawing}
          className="rounded-full border border-[var(--cas-outline-variant)] bg-transparent px-5 py-3 text-sm font-semibold text-[var(--cas-on-surface)] transition hover:bg-[var(--cas-surface-high)]"
        >
          View drawing preview
        </button>

        <div className="h-px bg-[var(--cas-outline-variant)]" />

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--cas-on-surface)]">Additional exports</h3>
            <p className="mt-1 text-xs text-[var(--cas-on-surface-variant)]">Keep the report-driven workflow from the utility app, plus local CAD exports from this React version.</p>
          </div>

          <button
            type="button"
            onClick={onDownloadDXF}
            disabled={isExportingDxf}
            className="w-full rounded-full border border-[var(--cas-outline-variant)] bg-[var(--cas-surface-high)] px-5 py-3 text-sm font-semibold text-[var(--cas-on-surface)] transition hover:bg-[var(--cas-surface-highest)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportingDxf ? 'Generating...' : 'Download DXF'}
          </button>

          <StepExportPanel config={config} />
        </div>
      </div>
    </section>
  );
};
