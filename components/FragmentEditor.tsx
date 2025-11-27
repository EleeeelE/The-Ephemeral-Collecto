
import React from 'react';
import { CollageFragment, CollageStyle } from '../types';
import { X, Type, Palette, Move, Trash2, Bookmark, LayoutTemplate } from 'lucide-react';

interface FragmentEditorProps {
  fragment: CollageFragment;
  onChange: (updates: Partial<CollageFragment>) => void;
  onClose: () => void;
  onDelete: () => void;
  onCollect: () => void;
}

export const FragmentEditor: React.FC<FragmentEditorProps> = ({ fragment, onChange, onClose, onDelete, onCollect }) => {
  
  // Helper to apply preset styles
  const applyStylePreset = (style: CollageStyle) => {
    let updates: Partial<CollageFragment> = { style };
    
    // Apply specific defaults for each style to reset overrides
    switch (style) {
        case 'newspaper':
            updates = { ...updates, backgroundColor: '#f0f0f0', color: '#000000', fontFamily: undefined };
            break;
        case 'typewriter':
            updates = { ...updates, backgroundColor: '#ffffff', color: '#000000', fontFamily: undefined };
            break;
        case 'handwritten':
            updates = { ...updates, backgroundColor: '#fffdcb', color: '#1e3a8a', fontFamily: undefined };
            break;
        case 'magazine-cutout':
            updates = { ...updates, backgroundColor: '#000000', color: '#ffffff', fontFamily: undefined };
            break;
    }
    onChange(updates);
  };

  return (
    <div className="absolute left-4 top-24 bottom-24 w-64 bg-[#e0e5ec] rounded-2xl shadow-clay-flat border border-white/50 z-50 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#fdfbf7]/50">
        <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <Type size={12} /> Editor
        </h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        
        {/* Text Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Content</label>
          <textarea
            value={fragment.text}
            onChange={(e) => onChange({ text: e.target.value })}
            className="w-full bg-[#fdfbf7] border-none rounded-lg p-3 text-sm font-serif shadow-inner resize-none focus:ring-1 focus:ring-gray-300 outline-none"
            rows={2}
          />
        </div>

        {/* Style Presets */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <LayoutTemplate size={10} /> Style Preset
          </label>
          <div className="grid grid-cols-2 gap-2">
             {(['newspaper', 'typewriter', 'handwritten', 'magazine-cutout'] as CollageStyle[]).map(style => (
                 <button
                    key={style}
                    onClick={() => applyStylePreset(style)}
                    className={`
                        px-2 py-2 text-[9px] uppercase tracking-wider rounded-lg border transition-all text-center
                        ${fragment.style === style ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm' : 'bg-white/50 border-transparent text-gray-500 hover:bg-white'}
                    `}
                 >
                    {style.replace('-', ' ')}
                 </button>
             ))}
          </div>
        </div>

        {/* Geometry */}
        <div className="space-y-4">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Move size={10} /> Geometry
          </label>
          
          <div className="space-y-1">
             <div className="flex justify-between text-[9px] text-gray-400">
                <span>Rotation</span>
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

          <div className="space-y-1">
             <div className="flex justify-between text-[9px] text-gray-400">
                <span>Size (Font)</span>
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
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Palette size={10} /> Colors
          </label>
          
          <div className="flex gap-2">
            <div className="flex-1">
                <span className="text-[9px] text-gray-400 block mb-1">Background</span>
                <div className="flex flex-wrap gap-2">
                    {['#f0f0f0', '#ffffff', '#2c2c2c', '#fffdcb', '#e0e5ec', '#ffadad', '#a3b1c6'].map(c => (
                        <button
                          key={c}
                          onClick={() => onChange({ backgroundColor: c })}
                          className={`w-6 h-6 rounded-full border border-gray-300 shadow-sm ${fragment.backgroundColor === c ? 'ring-2 ring-emerald-400' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
                <span className="text-[9px] text-gray-400 block mb-1">Text</span>
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
        
        {/* Collect Action */}
        <div className="pt-2">
           <button
             onClick={onCollect}
             className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors border border-emerald-100"
           >
             <Bookmark size={12} /> Collect to Tray
           </button>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-[#fdfbf7]/50">
        <button
          onClick={onDelete}
          className="w-full py-2 bg-red-50 text-red-500 rounded-lg text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <Trash2 size={12} /> Delete Fragment
        </button>
      </div>
    </div>
  );
};
