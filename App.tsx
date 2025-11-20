import React, { useState, useCallback } from 'react';
import { PlaqueConfig, MaterialType } from './types';
import { Controls } from './components/Controls';
import { Scene } from './components/Scene';
import { generatePreviewPDF } from './utils/canvasGenerator';
import { generateDXF } from './utils/dxfGenerator';

const App: React.FC = () => {
  const [config, setConfig] = useState<PlaqueConfig>({
    text: 'Scan For Info',
    qrUrl: 'https://example.com/your-page',
    width: 150,
    height: 150,
    depth: 5,
    radius: 10,
    border: true,
    material: MaterialType.STEEL
  });

  const [qrData, setQrData] = useState<{ modules: boolean[][], canvas: HTMLCanvasElement | null }>({ 
    modules: [], 
    canvas: null 
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTextureReady = useCallback((modules: boolean[][], canvas: HTMLCanvasElement) => {
    setQrData({ modules, canvas });
  }, []);

  const downloadPDF = async () => {
    if (!qrData.canvas) return;
    setIsProcessing(true);
    try {
      await generatePreviewPDF(qrData.canvas, config.width, config.height);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDXF = () => {
    if (!qrData.modules.length) return;
    setIsProcessing(true);
    try {
      const dxfString = generateDXF(config, qrData.modules);
      const blob = new Blob([dxfString], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plaque-${config.width}x${config.height}.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to generate DXF");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M8 11h16M4 11h16v8H4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">PlaquePro</h1>
              <p className="text-xs text-gray-500 font-medium">Industrial Configurator</p>
            </div>
          </div>
          <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Help & Specs</a>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls (Sticky) */}
          <div className="lg:col-span-4 xl:col-span-3">
             <div className="lg:sticky lg:top-28">
                <Controls 
                  config={config} 
                  onChange={setConfig} 
                  onDownloadPDF={downloadPDF}
                  onDownloadDXF={downloadDXF}
                  isProcessing={isProcessing}
                />
             </div>
          </div>

          {/* Right Column: 3D Preview */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            <div className="bg-gray-800 rounded-3xl p-1 border border-gray-700 shadow-2xl h-[60vh] lg:h-[75vh]">
              <Scene config={config} onTextureReady={handleTextureReady} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-start gap-3">
                   <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div>
                     <h4 className="font-bold text-sm text-white">Print Ready</h4>
                     <p className="text-xs text-gray-400 mt-1">High-resolution PDF generation for client proofs.</p>
                   </div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-start gap-3">
                   <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                   </div>
                   <div>
                     <h4 className="font-bold text-sm text-white">CNC Compatible</h4>
                     <p className="text-xs text-gray-400 mt-1">Export standard DXF R12 files for laser engravers.</p>
                   </div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-start gap-3">
                   <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                   </div>
                   <div>
                     <h4 className="font-bold text-sm text-white">Real Materials</h4>
                     <p className="text-xs text-gray-400 mt-1">Physically based rendering for accurate preview.</p>
                   </div>
                </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;