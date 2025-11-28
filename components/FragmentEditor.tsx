




import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CollageFragment, CollageStyle } from '../types';
import { X, Type, Palette, Move, Trash2, Bookmark, LayoutTemplate, Bold, BoxSelect, Layers, Blend, Droplets, Image as ImageIcon, Scissors, Pipette } from 'lucide-react';

interface FragmentEditorProps {
  fragment: CollageFragment;
  onChange: (updates: Partial<CollageFragment>) => void;
  onClose: () => void;
  onDelete: () => void;
  onCollect: () => void;
}

const FONTS = [
    { label: 'Serif (Elegant)', value: '"Playfair Display", serif' },
    { label: 'Sans (Bold)', value: '"Anton", sans-serif' },
    { label: 'Mono (Clean)', value: '"Space Mono", monospace' },
    { label: 'Typewriter', value: '"Courier Prime", monospace' },
    { label: 'Handwritten', value: '"Permanent Marker", cursive' },
    { label: 'Mincho (Classic)', value: '"Zen Old Mincho", serif' },
    { label: 'Ma Shan Zheng (Seal)', value: '"Ma Shan Zheng", cursive' },
    { label: 'ZCOOL XiaoWei (Serif)', value: '"ZCOOL XiaoWei", serif' },
    { label: 'ZCOOL QingKe (Bold)', value: '"ZCOOL QingKe HuangYou", sans-serif' },
    { label: 'ZCOOL KuaiLe (Cute)', value: '"ZCOOL KuaiLe", cursive' },
    { label: 'Long Cang (Calligraphy)', value: '"Long Cang", cursive' },
    { label: 'Liu Jian Mao Cao (Cursive)', value: '"Liu Jian Mao Cao", cursive' },
];

export const FragmentEditor: React.FC<FragmentEditorProps> = ({ fragment, onChange, onClose, onDelete, onCollect }) => {
  const isImage = fragment.type === 'image';
  const [flyingParticle, setFlyingParticle] = useState<{x: number, y: number} | null>(null);
  const bookmarkBtnRef = useRef<HTMLButtonElement>(null);
  
  const handleCollectClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (bookmarkBtnRef.current) {
          const rect = bookmarkBtnRef.current.getBoundingClientRect();
          setFlyingParticle({ x: rect.left, y: rect.top });
          
          // Trigger data collection immediately
          onCollect();
      }
  };

  // Helper to apply preset styles
  const applyStylePreset = (style: CollageStyle) => {
    let updates: Partial<CollageFragment> = { style };
    
    // Apply specific defaults for each style to reset overrides
    switch (style) {
        case 'newspaper':
            updates = { ...updates, backgroundColor: '#f0f0f0', color: '#000000', fontFamily: '"Playfair Display", serif', fontWeight: 'normal', hasShadow: true };
            break;
        case 'typewriter':
            updates = { ...updates, backgroundColor: '#ffffff', color: '#000000', fontFamily: '"Courier Prime", monospace', fontWeight: 'normal', hasShadow: true };
            break;
        case 'handwritten':
            updates = { ...updates, backgroundColor: '#fffdcb', color: '#1e3a8a', fontFamily: '"Permanent Marker", cursive', fontWeight: 'normal', hasShadow: true };
            break;
        case 'magazine-cutout':
            updates = { ...updates, backgroundColor: '#000000', color: '#ffffff', fontFamily: '"Anton", sans-serif', fontWeight: 'bold', hasShadow: true };
            break;
        case 'label':
            updates = { ...updates, backgroundColor: '#ffffff', color: '#2c2c2c', fontFamily: '"Space Mono", monospace', fontWeight: 'normal', hasShadow: true };
            break;
        case 'minimal':
            updates = { ...updates, backgroundColor: 'transparent', color: '#2c2c2c', fontFamily: '"Zen Old Mincho", serif', fontWeight: 'normal', hasShadow: false };
            break;
        case 'bold-stamp':
            updates = { ...updates, backgroundColor: '#2c2c2c', color: '#ffffff', fontFamily: '"Playfair Display", serif', fontWeight: 'bold', hasShadow: false };
            break;
        case 'receipt':
            updates = { ...updates, backgroundColor: '#ffffff', color: '#2c2c2c', fontFamily: '"Space Mono", monospace', fontWeight: 'normal', hasShadow: true };
            break;
        case 'prescription':
            updates = { ...updates, backgroundColor: '#f0f8ff', color: '#1e3a8a', fontFamily: '"Courier Prime", monospace', fontWeight: 'normal', hasShadow: true };
            break;
        case 'warning':
            updates = { ...updates, backgroundColor: '#fef08a', color: '#000000', fontFamily: '"Anton", sans-serif', fontWeight: 'bold', hasShadow: true };
            break;
        case 'manual':
             updates = { ...updates, backgroundColor: '#ffffff', color: '#4b5563', fontFamily: 'sans-serif', fontWeight: 'normal', hasShadow: true };
             break;
    }
    onChange(updates);
  };

  return (
    <>
    <div className="absolute left-4 top-24 bottom-24 w-64 bg-[#e0e5ec] rounded-2xl shadow-clay-flat border border-white/50 z-50 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center bg-[#fdfbf7]/50">
        <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 flex-1">
           {isImage ? <ImageIcon size={12} /> : <Type size={12} />} {isImage ? '图片编辑' : '文本编辑'}
        </h3>
        
        {/* New Bookmark Button in Header */}
        {!isImage && (
           <button 
             ref={bookmarkBtnRef}
             onClick={handleCollectClick}
             className="p-1.5 mr-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group"
             title="收藏 (Collect)"
           >
             <Bookmark size={16} className="group-active:scale-95 transition-transform" />
           </button>
        )}

        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        
        {/* Content Input (Text Only) */}
        {!isImage && (
            <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">内容 (Content)</label>
            <textarea
                value={fragment.text}
                onChange={(e) => onChange({ text: e.target.value })}
                className="w-full bg-[#fdfbf7] border-none rounded-lg p-3 text-sm shadow-inner resize-none focus:ring-1 focus:ring-gray-300 outline-none"
                rows={2}
                style={{ fontFamily: fragment.fontFamily }}
            />
            </div>
        )}

        {/* Style Presets (Text Only) */}
        {!isImage && (
            <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutTemplate size={10} /> 预设风格 (Presets)
            </label>
            <div className="grid grid-cols-2 gap-2">
                {(['newspaper', 'label', 'typewriter', 'minimal', 'handwritten', 'bold-stamp', 'receipt', 'prescription', 'warning', 'manual'] as CollageStyle[]).map(style => (
                    <button
                        key={style}
                        onClick={() => applyStylePreset(style)}
                        className={`
                            px-2 py-2 text-[9px] uppercase tracking-wider rounded-lg border transition-all text-center overflow-hidden text-ellipsis whitespace-nowrap
                            ${fragment.style === style ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm' : 'bg-white/50 border-transparent text-gray-500 hover:bg-white'}
                        `}
                    >
                        {style.replace('-', ' ')}
                    </button>
                ))}
            </div>
            </div>
        )}

        {/* Typography (Text Only) */}
        {!isImage && (
            <div className="space-y-3">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Type size={10} /> 字体 (Typography)
            </label>
            
            <select 
                value={fragment.fontFamily}
                onChange={(e) => onChange({ fontFamily: e.target.value })}
                className="w-full text-[10px] bg-white border border-gray-200 rounded-md p-2 outline-none"
            >
                <option value="">Default</option>
                {FONTS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                ))}
            </select>

            <div className="flex gap-2">
                <button 
                onClick={() => onChange({ fontWeight: fragment.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`flex-1 py-1.5 rounded-md text-[10px] border flex items-center justify-center gap-1 ${fragment.fontWeight === 'bold' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    <Bold size={10} /> 加粗
                </button>
                
                <button 
                onClick={() => onChange({ hasShadow: !fragment.hasShadow })}
                className={`flex-1 py-1.5 rounded-md text-[10px] border flex items-center justify-center gap-1 ${fragment.hasShadow ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    <BoxSelect size={10} /> 阴影
                </button>
            </div>
            </div>
        )}

        {/* Geometry (All) */}
        <div className="space-y-4">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Move size={10} /> 几何 (Geometry)
          </label>
          
          <div className="space-y-1">
             <div className="flex justify-between text-[9px] text-gray-400">
                <span>旋转</span>
                <span>{Math.round(fragment.rotation)}°</span>
             </div>
             <input 
               type="range" 
               min="-180" 
               max="180" 
               value={fragment.rotation}
               onChange={(e) => onChange({ rotation: Number(e.target.value) })}
               className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
             />
          </div>

          {/* Size Logic */}
          {!isImage && (
            <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-gray-400">
                    <span>大小 (Size)</span>
                    <span>{fragment.fontSize || 16}px</span>
                </div>
                <input 
                type="range" 
                min="8" 
                max="72" 
                value={fragment.fontSize || 16}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
            </div>
          )}
        </div>
        
        {/* Composition */}
        <div className="space-y-4">
             <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layers size={10} /> 合成 (Composition)
             </label>
             
             {/* Opacity */}
             <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-gray-400">
                    <span className="flex items-center gap-1"><Droplets size={8}/> 透明度</span>
                    <span>{Math.round((fragment.opacity || 1) * 100)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0.1" 
                    max="1" 
                    step="0.05"
                    value={fragment.opacity || 1}
                    onChange={(e) => onChange({ opacity: Number(e.target.value) })}
                    className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
             </div>
             
             {/* Blend Mode */}
             <div className="space-y-2 p-2 bg-white/50 rounded-lg border border-gray-100">
                <label className="text-[9px] text-gray-400 block mb-1 flex items-center gap-1 font-bold">
                    <Scissors size={10} /> 混合模式 (Blend)
                </label>
                <div className="grid grid-cols-3 gap-1">
                   {[
                     { id: 'normal', label: 'None' },
                     { id: 'multiply', label: 'Darken' },
                     { id: 'screen', label: 'Lighten' }
                   ].map((mode) => (
                       <button
                         key={mode.id}
                         onClick={() => onChange({ blendMode: mode.id as any })}
                         className={`text-[8px] uppercase py-1.5 border rounded flex flex-col items-center justify-center ${fragment.blendMode === mode.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                       >
                         {mode.label}
                       </button>
                   ))}
                </div>
             </div>

             {/* Z-Index */}
             <div className="flex gap-2 pt-1">
                <button 
                  onClick={() => onChange({ zIndex: (fragment.zIndex || 1) + 10 })}
                  className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-500 rounded text-[9px] uppercase hover:bg-gray-50 flex items-center justify-center gap-1"
                >
                    <span className="text-xs">↑</span> 前置
                </button>
                <button 
                  onClick={() => onChange({ zIndex: (fragment.zIndex || 1) - 10 })}
                  className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-500 rounded text-[9px] uppercase hover:bg-gray-50 flex items-center justify-center gap-1"
                >
                    <span className="text-xs">↓</span> 后置
                </button>
             </div>
        </div>

        {/* Colors (Text Only) */}
        {!isImage && (
            <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Palette size={10} /> 颜色 (Colors)
            </label>
            
            <div className="flex gap-2">
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-gray-400">背景 (BG)</span>
                        {/* Custom Color Picker for BG */}
                        <div className="relative w-4 h-4 rounded-full overflow-hidden border border-gray-300 shadow-sm cursor-pointer hover:scale-110 transition-transform flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500">
                             <input 
                                type="color"
                                value={fragment.backgroundColor === 'transparent' ? '#ffffff' : fragment.backgroundColor}
                                onChange={(e) => onChange({ backgroundColor: e.target.value })}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                title="Custom Color"
                             />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['#f0f0f0', '#ffffff', '#2c2c2c', '#fffdcb', '#e0e5ec', '#ffadad', '#a3b1c6', 'transparent', '#fef08a', '#f0f8ff'].map(c => (
                            <button
                            key={c}
                            onClick={() => onChange({ backgroundColor: c })}
                            className={`w-6 h-6 rounded-full border border-gray-300 shadow-sm relative ${fragment.backgroundColor === c ? 'ring-2 ring-emerald-400' : ''}`}
                            style={{ backgroundColor: c === 'transparent' ? 'white' : c }}
                            >
                                {c === 'transparent' && <div className="absolute inset-0 border-red-500 border-t transform rotate-45"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2 mt-2">
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-gray-400">文字 (Text)</span>
                        {/* Custom Color Picker for Text */}
                        <div className="relative w-4 h-4 rounded-full overflow-hidden border border-gray-300 shadow-sm cursor-pointer hover:scale-110 transition-transform flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-200">
                             <Pipette size={8} className="text-white drop-shadow-md" />
                             <input 
                                type="color"
                                value={fragment.color}
                                onChange={(e) => onChange({ color: e.target.value })}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                title="Custom Color"
                             />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['#000000', '#2c2c2c', '#ffffff', '#1a365d', '#713f12', '#b91c1c'].map(c => (
                            <button
                            key={c}
                            onClick={() => onChange({ color: c })}
                            className={`w-6 h-6 rounded-full border border-gray-300 shadow-sm ${fragment.color === c ? 'ring-2 ring-emerald-400' : ''}`}
                            style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            </div>
            </div>
        )}
        
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-[#fdfbf7]/50">
        <button
          onClick={onDelete}
          className="w-full py-2 bg-red-50 text-red-500 rounded-lg text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <Trash2 size={12} /> 删除片段
        </button>
      </div>
    </div>

    {/* Flying Animation via Portal to avoid overflow clipping */}
    {createPortal(
        <AnimatePresence>
            {flyingParticle && (
                <motion.div
                    initial={{ x: flyingParticle.x, y: flyingParticle.y, scale: 1, opacity: 1, rotate: 0 }}
                    animate={{ 
                        x: window.innerWidth - 40, 
                        y: window.innerHeight / 2, 
                        scale: 0.2, 
                        opacity: 0,
                        rotate: 90
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    onAnimationComplete={() => setFlyingParticle(null)}
                    className="fixed z-[9999] text-emerald-600 pointer-events-none"
                    style={{ left: 0, top: 0 }}
                >
                    <Bookmark size={24} fill="currentColor" />
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )}
    </>
  );
};
