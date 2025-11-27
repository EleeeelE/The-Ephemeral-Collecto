
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, RotateCcw, Loader2, Plus, Settings2, Image as ImageIcon, Check } from 'lucide-react';
import { generateCollageFragments } from '../services/geminiService';
import { CollageFragment, GenerationSettings, VocabularyDifficulty, CanvasBackground, CollageStyle } from '../types';
import { CollageMaterial } from './CollageMaterial';
import { FragmentEditor } from './FragmentEditor';
import { ClayCard } from './ClayCard';
import html2canvas from 'html2canvas';

interface CollageWorkbenchProps {
  onCollectWord: (word: string, sourceId: string) => void;
}

export const CollageWorkbench: React.FC<CollageWorkbenchProps> = ({ onCollectWord }) => {
  const [input, setInput] = useState('');
  const [fragments, setFragments] = useState<CollageFragment[]>([]);
  const [selectedFragmentId, setSelectedFragmentId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // --- New Settings States ---
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>({
      difficulty: 'High School',
      quantity: 15,
      stylePreference: 'mixed'
  });
  const [background, setBackground] = useState<CanvasBackground>('dots');

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsGenerating(true);
    setSelectedFragmentId(null);
    setShowSettings(false); // Close settings on generate

    try {
      // Pass settings to service
      const newFragments = await generateCollageFragments(input, settings);
      
      // Calculate SAFE center of screen (clamped to ensure visibility)
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const centerX = viewportW / 2;
      const centerY = viewportH / 2;

      // Scatter fragments centrally
      const centeredFragments = newFragments.map(frag => ({
        ...frag,
        x: centerX + (Math.random() * 200 - 100), // +/- 100px from center X
        y: centerY + (Math.random() * 200 - 100) - 50, // +/- 100px from center Y, slightly raised
        width: undefined,
        height: undefined
      }));

      setFragments(prev => [...prev, ...centeredFragments]);
      setInput(''); 
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddManualFragment = () => {
     const centerX = window.innerWidth / 2;
     const centerY = window.innerHeight / 2;
     const newFrag: CollageFragment = {
         id: `MANUAL-${Date.now()}`,
         text: "New Text",
         style: settings.stylePreference === 'mixed' ? 'typewriter' : settings.stylePreference,
         rotation: 0,
         x: centerX,
         y: centerY,
         zIndex: fragments.length + 1
     };
     setFragments(prev => [...prev, newFrag]);
     setSelectedFragmentId(newFrag.id);
  };

  const handleUpdateFragment = (id: string, updates: Partial<CollageFragment>) => {
    setFragments(prev => prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
    ));
  };

  // Wrapper for editor which only sees the selected one
  const handleEditorUpdate = (updates: Partial<CollageFragment>) => {
      if (selectedFragmentId) handleUpdateFragment(selectedFragmentId, updates);
  }

  const handleDeleteFragment = () => {
     if (!selectedFragmentId) return;
     setFragments(prev => prev.filter(f => f.id !== selectedFragmentId));
     setSelectedFragmentId(null);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
      setFragments(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
  };

  const handleClear = () => {
    setFragments([]);
    setSelectedFragmentId(null);
  };

  const handleExport = async () => {
    // Deselect before export to remove rings
    setSelectedFragmentId(null);
    
    // Wait for state update
    setTimeout(async () => {
        if (canvasRef.current) {
            try {
                const canvas = await html2canvas(canvasRef.current, {
                    scale: 2,
                    backgroundColor: null, // Transparent to let background div show or manually handled
                    useCORS: true,
                    ignoreElements: (element) => element.classList.contains('exclude-export')
                });
                const link = document.createElement('a');
                link.download = `collage-poem-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (e) {
                console.error(e);
            }
        }
    }, 100);
  };

  const selectedFragment = fragments.find(f => f.id === selectedFragmentId);

  // Background Style Helper
  const getBackgroundStyle = () => {
      switch (background) {
          case 'dots': return { backgroundImage: `radial-gradient(#a3b1c6 1px, transparent 1px)`, backgroundSize: '20px 20px', opacity: 0.2 };
          case 'grid': return { backgroundImage: `linear-gradient(#a3b1c6 1px, transparent 1px), linear-gradient(90deg, #a3b1c6 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.1 };
          case 'paper': return { backgroundColor: '#fdfbf7', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, opacity: 0.05 };
          case 'dark': return { backgroundColor: '#1a1a1a', opacity: 1 };
          case 'clay': return { backgroundColor: '#e0e5ec', opacity: 1 };
          default: return {};
      }
  };

  const isDarkBg = background === 'dark';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
      
      {/* Editor Panel (Left) */}
      <AnimatePresence>
        {selectedFragment && (
           <div className="pointer-events-auto">
              <FragmentEditor 
                 fragment={selectedFragment}
                 onChange={handleEditorUpdate}
                 onClose={() => setSelectedFragmentId(null)}
                 onDelete={handleDeleteFragment}
                 onCollect={() => onCollectWord(selectedFragment.text, `COLLAGE-${selectedFragment.id}`)}
              />
           </div>
        )}
      </AnimatePresence>

      {/* The Canvas (Draggable Area) */}
      <div 
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-auto overflow-hidden transition-colors duration-500 ${isDarkBg ? 'bg-[#1a1a1a]' : 'bg-[#e0e5ec]'}`}
        onClick={() => setSelectedFragmentId(null)} // Click background to deselect
      >
        {/* Background Texture Layer */}
        <div className="absolute inset-0 pointer-events-none z-0 transition-all duration-500" style={getBackgroundStyle()}></div>
        
        {fragments.map(frag => (
            <CollageMaterial 
                key={frag.id} 
                fragment={frag} 
                isSelected={selectedFragmentId === frag.id}
                onSelect={() => setSelectedFragmentId(frag.id)}
                onUpdateFragment={(updates) => handleUpdateFragment(frag.id, updates)}
                dragConstraints={canvasRef}
                onUpdatePosition={(x, y) => handleUpdatePosition(frag.id, x, y)}
            />
        ))}
        
        {fragments.length === 0 && !isGenerating && (
            <div className={`absolute inset-0 flex items-center justify-center text-4xl font-serif select-none pointer-events-none ${isDarkBg ? 'text-gray-700' : 'text-gray-400 opacity-30'}`}>
                Compose your silence.
            </div>
        )}
      </div>

      {/* Controls (Bottom Center) */}
      <div className="relative z-40 pointer-events-auto w-full max-w-2xl px-4 flex flex-col gap-4 exclude-export">
        
        {/* Input & Settings Area */}
        <div className="relative">
            <ClayCard className="p-4 flex gap-4 items-center relative z-20">
                <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter mood (e.g. 'rainy sunday solitude')..."
                className="flex-1 bg-transparent border-b border-gray-300 pb-2 font-mono text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400 text-sm md:text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={isGenerating}
                />
                
                {/* Settings Toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                    <Settings2 size={18} />
                </button>

                <button
                    onClick={handleGenerate}
                    disabled={!input.trim() || isGenerating}
                    className="bg-[#2c2c2c] text-white p-3 rounded-xl shadow-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
            </ClayCard>
            
            {/* Settings Panel Popover */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: -16, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 right-0 mb-2 p-1"
                    >
                        <ClayCard className="p-4 space-y-4 shadow-xl border border-white/50">
                            
                            {/* Difficulty */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Vocabulary Difficulty</label>
                                <div className="flex flex-wrap gap-2">
                                    {(['High School', 'CET-4', 'CET-6', 'IELTS/TOEFL', 'GRE'] as VocabularyDifficulty[]).map(diff => (
                                        <button
                                            key={diff}
                                            onClick={() => setSettings(s => ({ ...s, difficulty: diff }))}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] border transition-all ${settings.difficulty === diff ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
                                        >
                                            {diff}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Quantity */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Quantity</label>
                                        <span className="text-[10px] font-mono text-gray-500">{settings.quantity}</span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="50" step="5"
                                        value={settings.quantity}
                                        onChange={(e) => setSettings(s => ({ ...s, quantity: Number(e.target.value) }))}
                                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                {/* Style Preference */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Default Style</label>
                                    <select 
                                        value={settings.stylePreference}
                                        onChange={(e) => setSettings(s => ({ ...s, stylePreference: e.target.value as any }))}
                                        className="w-full bg-white border border-gray-200 text-gray-600 text-xs rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-emerald-400"
                                    >
                                        <option value="mixed">Mixed (Random)</option>
                                        <option value="newspaper">Newspaper</option>
                                        <option value="typewriter">Typewriter</option>
                                        <option value="handwritten">Handwritten</option>
                                        <option value="magazine-cutout">Magazine Cutout</option>
                                    </select>
                                </div>
                            </div>

                        </ClayCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center px-2">
            <div className="flex gap-4">
                <button 
                    onClick={handleClear}
                    className="text-[10px] font-mono text-gray-500 hover:text-red-500 transition-colors flex items-center gap-2 uppercase tracking-widest"
                >
                    <RotateCcw size={12} /> Clear
                </button>

                <button 
                    onClick={handleAddManualFragment}
                    className="text-[10px] font-mono text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-2 uppercase tracking-widest"
                >
                    <Plus size={12} /> Add Sticker
                </button>

                {/* Background Switcher */}
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300/50">
                     <ImageIcon size={12} className="text-gray-400" />
                     <div className="flex gap-1">
                        {(['dots', 'grid', 'paper', 'clay', 'dark'] as CanvasBackground[]).map(bg => (
                            <button
                                key={bg}
                                onClick={() => setBackground(bg)}
                                className={`w-4 h-4 rounded-full border shadow-sm transition-transform hover:scale-110 ${background === bg ? 'ring-2 ring-emerald-400 scale-110' : 'border-gray-300'}`}
                                style={{
                                    backgroundColor: bg === 'dark' ? '#1a1a1a' : bg === 'clay' ? '#e0e5ec' : '#fdfbf7',
                                    backgroundImage: bg === 'dots' ? 'radial-gradient(#000 1px, transparent 1px)' : undefined,
                                    backgroundSize: '4px 4px'
                                }}
                                title={`Background: ${bg}`}
                            />
                        ))}
                     </div>
                </div>
            </div>
            
            <button 
                onClick={handleExport}
                className="text-[10px] font-mono text-gray-500 hover:text-emerald-600 transition-colors flex items-center gap-2 uppercase tracking-widest"
            >
                <Download size={12} /> Save Poem
            </button>
        </div>

      </div>
    </div>
  );
};
