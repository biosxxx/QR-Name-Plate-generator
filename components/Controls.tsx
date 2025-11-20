import React from 'react';
import { PlaqueConfig, MaterialType } from '../types';

interface ControlsProps {
  config: PlaqueConfig;
  onChange: (newConfig: PlaqueConfig) => void;
  onDownloadPDF: () => void;
  onDownloadDXF: () => void;
  isProcessing: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ config, onChange, onDownloadPDF, onDownloadDXF, isProcessing }) => {
  
  const handleChange = (field: keyof PlaqueConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const materials = [
    { id: MaterialType.STEEL, label: 'Stainless Steel', color: 'bg-gray-300' },
    { id: MaterialType.COPPER, label: 'Brushed Copper', color: 'bg-orange-300' },
    { id: MaterialType.GOLD, label: 'Polished Gold', color: 'bg-yellow-400' },
    { id: MaterialType.GRANITE, label: 'Black Granite', color: 'bg-gray-800 border-gray-600' },
  ];

  const InputClass = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";
  const LabelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2";

  return (
    <div className="space-y-8 p-1">
      {/* Content Section */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Engraving Content
        </h3>
        <div className="space-y-4">
          <div>
            <label className={LabelClass}>Plaque Title</label>
            <input 
              type="text" 
              value={config.text}
              onChange={(e) => handleChange('text', e.target.value)}
              className={InputClass}
              placeholder="Enter text..."
            />
          </div>
          <div>
            <label className={LabelClass}>QR Link Destination</label>
            <input 
              type="url" 
              value={config.qrUrl}
              onChange={(e) => handleChange('qrUrl', e.target.value)}
              className={InputClass}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Material Section */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Material & Finish
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {materials.map((mat) => (
            <button
              key={mat.id}
              onClick={() => handleChange('material', mat.id)}
              className={`relative overflow-hidden group p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                config.material === mat.id 
                ? 'border-blue-500 bg-gray-700 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${mat.color} shadow-inner border border-white/10`}></div>
              <span className={`text-sm font-medium ${config.material === mat.id ? 'text-white' : 'text-gray-400'}`}>
                {mat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions Section */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
         <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          Dimensions (mm)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LabelClass}>Width</label>
            <input type="number" value={config.width} onChange={(e) => handleChange('width', Number(e.target.value))} className={InputClass} />
          </div>
          <div>
            <label className={LabelClass}>Height</label>
            <input type="number" value={config.height} onChange={(e) => handleChange('height', Number(e.target.value))} className={InputClass} />
          </div>
          <div>
            <label className={LabelClass}>Corner Radius</label>
            <input type="number" value={config.radius} onChange={(e) => handleChange('radius', Number(e.target.value))} className={InputClass} />
          </div>
          <div>
             <label className={LabelClass}>Thickness</label>
             <input type="number" value={config.depth} onChange={(e) => handleChange('depth', Number(e.target.value))} className={InputClass} />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
             <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${config.border ? 'bg-blue-600 border-blue-600' : 'border-gray-600 bg-gray-900'}`}>
                {config.border && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
             </div>
             <input type="checkbox" className="hidden" checked={config.border} onChange={(e) => handleChange('border', e.target.checked)} />
             <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Engrave Border Line</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 space-y-3">
        <button
            onClick={onDownloadPDF}
            disabled={isProcessing}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <span>Generating...</span>
          ) : (
             <>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               Download PDF Proof
             </>
          )}
        </button>

        <button
            onClick={onDownloadDXF}
            disabled={isProcessing}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 border border-gray-600"
        >
           <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           Download CNC DXF
        </button>
      </div>
    </div>
  );
};