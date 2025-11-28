


import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Stamp, FileText, Image, Disc, Newspaper } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ExportTemplate, SealStyle } from '../types';

interface ExportPreviewProps {
  canvasImage: string | null;
  onClose: () => void;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({ canvasImage, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('receipt');
  const [sealText, setSealText] = useState('POET');
  const [sealStyle, setSealStyle] = useState<SealStyle>('square');
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    
    try {
        const canvas = await html2canvas(previewRef.current, {
            scale: 2, // High resolution
            useCORS: true,
            backgroundColor: null,
            logging: false,
        });
        
        const link = document.createElement('a');
        link.download = `ephemeral-poem-${selectedTemplate}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Optional: Close after download
        // onClose(); 
    } catch (err) {
        console.error("Export failed", err);
    } finally {
        setIsExporting(false);
    }
  };

  const getTemplateStyles = () => {
      // Common wrapper styles for centering
      const base = "relative flex flex-col items-center justify-center overflow-hidden transition-all duration-500";
      
      switch (selectedTemplate) {
          case 'simple':
              return `${base} bg-[#e0e5ec] p-8 shadow-2xl rounded-xl border border-white/50`;
          case 'receipt':
              return `${base} bg-[#fdfbf7] w-[350px] shadow-2xl relative jagged-bottom pb-12`;
          case 'polaroid':
              return `${base} bg-white p-4 pb-16 shadow-2xl rotate-1 w-[400px]`;
          case 'vinyl':
              return `${base} bg-[#1a1a1a] p-1 shadow-2xl w-[400px] aspect-square rounded-[2px]`;
          case 'newspaper':
              return `${base} bg-[#e3ded9] p-6 shadow-2xl w-[400px] grayscale contrast-125`;
          default:
              return base;
      }
  };

  const renderSeal = () => {
      const getShapeStyles = () => {
          switch (sealStyle) {
              case 'circle': return 'rounded-full aspect-square px-3 py-3';
              case 'oval': return 'rounded-[50%] px-3 py-4'; // Vertical oval
              default: return 'rounded-sm aspect-square px-2 py-2'; // Square
          }
      };

      const fontSizeClass = sealText.length > 5 ? 'text-[10px]' : sealText.length > 2 ? 'text-sm' : 'text-xl';

      return (
          <div className="absolute z-50 pointer-events-none" style={getSealPosition()}>
              <div className={`border-[3px] border-red-800 bg-red-800/10 backdrop-mix-blend-multiply rotate-[-6deg] shadow-sm flex items-center justify-center ${getShapeStyles()}`}>
                <div className={`border border-red-800 w-full h-full flex items-center justify-center ${sealStyle === 'circle' ? 'rounded-full' : sealStyle === 'oval' ? 'rounded-[45%]' : 'rounded-sm'}`}>
                    <span className={`font-seal text-red-800 font-bold leading-none writing-vertical-rl tracking-widest ${fontSizeClass}`}>
                        {sealText || "POET"}
                    </span>
                </div>
              </div>
          </div>
      );
  };

  const getSealPosition = () => {
      switch (selectedTemplate) {
          case 'receipt': return { bottom: '20px', right: '20px' };
          case 'polaroid': return { bottom: '15px', right: '20px' };
          case 'vinyl': return { bottom: '40px', right: '40px' };
          case 'newspaper': return { top: '30px', right: '30px' };
          default: return { bottom: '30px', right: '30px' };
      }
  };

  if (!canvasImage) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
    >
      <div className="w-full max-w-6xl h-full flex flex-col md:flex-row gap-8">
        
        {/* Left: Controls */}
        <div className="w-full md:w-80 flex flex-col gap-6 text-white shrink-0">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif-jp tracking-widest">预览 (Preview)</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="text-white" />
              </button>
           </div>
           
           <div className="space-y-4">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-widest">模板 (Template)</label>
              <div className="grid grid-cols-2 gap-3">
                 {[
                     { id: 'receipt', icon: FileText, label: '小票 (Receipt)' },
                     { id: 'polaroid', icon: Image, label: '拍立得 (Polaroid)' },
                     { id: 'vinyl', icon: Disc, label: '黑胶 (Vinyl)' },
                     { id: 'newspaper', icon: Newspaper, label: '报纸 (News)' },
                 ].map(t => (
                     <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id as ExportTemplate)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedTemplate === t.id ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'}`}
                     >
                        <t.icon size={20} />
                        <span className="text-[10px] uppercase font-mono">{t.label}</span>
                     </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
               <label className="text-xs font-mono text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <Stamp size={14} /> 个人印章 (Seal)
               </label>
               <input 
                 value={sealText}
                 onChange={(e) => setSealText(e.target.value.toUpperCase())}
                 placeholder="YOUR NAME"
                 maxLength={10}
                 className="w-full bg-transparent border-b border-gray-600 pb-2 text-white font-serif tracking-widest focus:outline-none focus:border-white transition-colors text-center uppercase"
               />
               <p className="text-[10px] text-gray-500 font-mono">
                   Max 10 characters.
               </p>
               
               {/* Style Selector */}
               <div className="flex gap-2 mt-2">
                  {(['square', 'circle', 'oval'] as SealStyle[]).map(s => (
                      <button
                          key={s}
                          onClick={() => setSealStyle(s)}
                          className={`flex-1 py-1 rounded border text-[10px] uppercase ${sealStyle === s ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-gray-600'}`}
                      >
                          {s}
                      </button>
                  ))}
               </div>
           </div>

           <div className="mt-auto pt-6">
              <button 
                onClick={handleDownload}
                disabled={isExporting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                  {isExporting ? '生成中...' : '下载图片'}
                  <Download size={18} />
              </button>
           </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 bg-[#1a1a1a] rounded-3xl flex items-center justify-center p-8 overflow-auto shadow-inner relative">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* The Capture Target */}
            <div ref={previewRef} className="scale-[0.8] md:scale-100 transition-transform origin-center">
                <div className={getTemplateStyles()}>
                    
                    {/* Template Specific Headers */}
                    {selectedTemplate === 'receipt' && (
                        <div className="w-full text-center pb-6 border-b-2 border-dashed border-gray-300 mb-6">
                            <div className="font-dot text-2xl tracking-widest uppercase">Ephemeral</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-1">{new Date().toLocaleDateString()} • POETRY-LOG</div>
                        </div>
                    )}

                    {selectedTemplate === 'newspaper' && (
                        <div className="w-full text-center border-b-4 border-black mb-4 pb-2">
                            <div className="font-serif text-4xl font-bold uppercase tracking-tight">The Daily Muse</div>
                            <div className="flex justify-between text-[10px] font-mono mt-1 border-t border-black pt-1">
                                <span>VOL. {new Date().getFullYear()}</span>
                                <span>{new Date().toLocaleDateString()}</span>
                                <span>PRICE: 1 SOUL</span>
                            </div>
                        </div>
                    )}

                    {/* Content Image */}
                    <div className={`relative ${selectedTemplate === 'vinyl' ? 'rounded-full overflow-hidden border-4 border-[#111] shadow-2xl' : ''}`}>
                         <img src={canvasImage} alt="Poem" className={`max-w-full h-auto object-contain ${selectedTemplate === 'simple' ? 'rounded-lg' : ''}`} />
                         
                         {/* Vinyl Center Hole */}
                         {selectedTemplate === 'vinyl' && (
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-gray-700"></div>
                         )}
                         
                         {/* Vinyl Glare */}
                         {selectedTemplate === 'vinyl' && (
                             <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-full"></div>
                         )}
                    </div>

                    {/* Template Footers */}
                    {selectedTemplate === 'polaroid' && (
                        <div className="w-full pt-4 px-2 flex justify-between items-end font-marker text-gray-600">
                             <span>{new Date().toLocaleDateString()}</span>
                             <span className="text-sm">#mood</span>
                        </div>
                    )}
                    
                    {selectedTemplate === 'receipt' && (
                        <div className="w-full pt-8 pb-4 flex flex-col items-center opacity-60">
                             <div className="h-8 w-[80%] bg-black" style={{ maskImage: 'repeating-linear-gradient(90deg, #000 2px, #000 4px, transparent 4px, transparent 8px)' }}></div>
                             <span className="text-[9px] font-mono mt-2">THANK YOU FOR FEELING</span>
                        </div>
                    )}
                    
                    {/* The Seal */}
                    {renderSeal()}

                </div>
            </div>
        </div>

      </div>
    </motion.div>
  );
};
