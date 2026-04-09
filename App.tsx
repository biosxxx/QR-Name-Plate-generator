import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { Scene } from './components/Scene';
import { MaterialType, PlaqueConfig } from './types';
import { buildDrawingPreviewDocument, buildDrawingSvg, computeLayout, validatePlaqueConfig } from './utils/drawingPreview';
import { downloadPdfReport } from './utils/pdfReport';
import { buildQrModules, getQrPngDataUrl } from './utils/canvasGenerator';
import { generateDXF } from './utils/dxfGenerator';

const initialConfig: PlaqueConfig = {
  text: 'CAD AutoScript',
  qrUrl: 'https://cadautoscript.com',
  width: 150,
  height: 150,
  depth: 5,
  radius: 5,
  border: false,
  material: MaterialType.STEEL,
};

const DrawingPreviewModal: React.FC<{
  isOpen: boolean;
  drawingSvg: string;
  onClose: () => void;
}> = ({ isOpen, drawingSvg, onClose }) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[16px] border border-[var(--cas-outline-variant)] bg-[var(--cas-surface)] shadow-[var(--cas-elevation-3)]">
        <div className="flex items-center justify-between border-b border-[var(--cas-outline-variant)] px-6 py-4">
          <div>
            <h3 className="text-lg font-medium text-[var(--cas-on-surface)]">Report drawing preview</h3>
            <p className="mt-1 text-sm text-[var(--cas-on-surface-variant)]">This preview is embedded into the PDF report.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-2xl leading-none text-[var(--cas-on-surface-variant)] transition hover:bg-[var(--cas-surface-high)] hover:text-[var(--cas-on-surface)]"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="bg-white p-4">
          <iframe
            title="Drawing preview"
            className="h-[72vh] w-full rounded-[12px] border border-slate-200 bg-slate-50"
            srcDoc={buildDrawingPreviewDocument(drawingSvg)}
          />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [formConfig, setFormConfig] = useState<PlaqueConfig>(initialConfig);
  const [previewConfig, setPreviewConfig] = useState<PlaqueConfig>(initialConfig);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const [isUpdatingPreview, setIsUpdatingPreview] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingDxf, setIsExportingDxf] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    getQrPngDataUrl(formConfig.qrUrl, 320)
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error) => {
        console.error('Failed to build QR PNG', error);
        if (active) {
          setQrDataUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [formConfig.qrUrl]);

  const drawingState = useMemo(
    () => ({
      config: formConfig,
      layout: computeLayout({ widthMm: formConfig.width, heightMm: formConfig.height }),
      qrDataUrl,
    }),
    [formConfig, qrDataUrl],
  );

  const drawingSvg = useMemo(() => buildDrawingSvg(drawingState), [drawingState]);

  const commitPreview = useCallback((nextConfig: PlaqueConfig) => {
    const validation = validatePlaqueConfig(nextConfig);
    setValidationMessage(validation);
    if (validation) {
      setIsUpdatingPreview(false);
      return false;
    }

    setIsUpdatingPreview(true);
    startTransition(() => {
      setPreviewConfig(nextConfig);
    });
    return true;
  }, []);

  useEffect(() => {
    if (!autoUpdate) {
      setValidationMessage(validatePlaqueConfig(formConfig));
      return;
    }

    const timer = window.setTimeout(() => {
      commitPreview(formConfig);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoUpdate, commitPreview, formConfig]);

  const handleGeneratePreview = useCallback(() => {
    commitPreview(formConfig);
  }, [commitPreview, formConfig]);

  const handleTextureReady = useCallback(() => {
    setIsUpdatingPreview(false);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    const validation = validatePlaqueConfig(formConfig);
    setValidationMessage(validation);
    if (validation) {
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const freshQrDataUrl = await getQrPngDataUrl(formConfig.qrUrl, 320);
      const reportState = {
        config: formConfig,
        layout: computeLayout({ widthMm: formConfig.width, heightMm: formConfig.height }),
        qrDataUrl: freshQrDataUrl,
      };
      const reportDrawingSvg = buildDrawingSvg(reportState);
      await downloadPdfReport(reportState, { drawingSvg: reportDrawingSvg, qrDataUrl: freshQrDataUrl });
    } catch (error) {
      console.error(error);
      alert('Failed to generate PDF report');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [formConfig]);

  const handleDownloadDXF = useCallback(() => {
    const validation = validatePlaqueConfig(formConfig);
    setValidationMessage(validation);
    if (validation) {
      return;
    }

    setIsExportingDxf(true);
    try {
      const qrModules = buildQrModules(formConfig.qrUrl);
      const dxfString = generateDXF(formConfig, qrModules);
      const blob = new Blob([dxfString], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-nameplate_${formConfig.width}x${formConfig.height}mm.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Failed to generate DXF');
    } finally {
      setIsExportingDxf(false);
    }
  }, [formConfig]);

  return (
    <div className="min-h-screen bg-[var(--cas-background)] text-[var(--cas-on-background)]">
      <div className="mx-auto min-h-screen max-w-[1400px] px-6 py-6">
        <header className="flex flex-col gap-6 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--cas-primary)]">CAD AutoScript</div>
            <h1 className="m-0 text-[32px] font-normal leading-[1.2] text-[var(--cas-on-background)]">QR Nameplate Generator</h1>
            <p className="mt-1 max-w-[620px] text-sm text-[var(--cas-on-surface-variant)]">
              Design a QR-enabled nameplate with 3D preview, drawing preview, PDF report, DXF export, and local STEP generation.
            </p>
          </div>
          <div>
            <a
              className="inline-flex h-10 items-center rounded-full bg-[var(--cas-surface-high)] px-6 text-sm font-medium text-[var(--cas-primary)] transition hover:bg-[var(--cas-surface-highest)]"
              href="https://cadautoscript.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              cadautoscript.com
            </a>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <Controls
            config={formConfig}
            autoUpdate={autoUpdate}
            validationMessage={validationMessage}
            isUpdatingPreview={isUpdatingPreview}
            isGeneratingPdf={isGeneratingPdf}
            isExportingDxf={isExportingDxf}
            onChange={setFormConfig}
            onAutoUpdateChange={setAutoUpdate}
            onGeneratePreview={handleGeneratePreview}
            onDownloadPDF={handleDownloadPDF}
            onDownloadDXF={handleDownloadDXF}
            onShowDrawing={() => setIsDrawingOpen(true)}
          />

          <section className="overflow-hidden rounded-[16px] border border-[var(--cas-outline-variant)] bg-[var(--cas-surface-low)] shadow-[var(--cas-elevation-1)]">
            <div className="px-6 pb-4 pt-6">
              <h2 className="text-[22px] font-normal text-[var(--cas-on-surface)]">3D preview</h2>
              <p className="mt-1 text-xs text-[var(--cas-on-surface-variant)]">Orbit and zoom to inspect. This preview is for visualization only.</p>
            </div>

            <div className="px-6 pb-6">
              <div className="relative">
                <Scene config={previewConfig} onTextureReady={handleTextureReady} />
                <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs text-white/65 backdrop-blur">
                  {isUpdatingPreview ? 'Updating preview...' : 'Interactive 3D preview'}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <DrawingPreviewModal isOpen={isDrawingOpen} drawingSvg={drawingSvg} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
};

export default App;
