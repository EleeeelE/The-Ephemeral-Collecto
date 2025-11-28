
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, RotateCcw, Loader2, Plus, Settings2, Image as ImageIcon, Check, Shuffle, PenTool, Eraser, Highlighter, Pen, AlignCenter, Maximize, Minimize, Palette } from 'lucide-react';
import { generateCollageFragments } from '../services/geminiService';
import { CollageFragment, GenerationSettings, VocabularyDifficulty, CanvasBackground, CollageStyle, DoodleStroke, BrushType, ColorTheme } from '../types';
import { CollageMaterial } from './CollageMaterial';
import { FragmentEditor } from './FragmentEditor';
import { ClayCard } from './ClayCard';
import { ExportPreview } from './ExportPreview';
import { DoodleCanvas } from './DoodleCanvas';
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Infinite Canvas State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Export State
  const [exportImage, setExportImage] = useState<string | null>(null);
  const [exportPadding, setExportPadding] = useState(50); // Default whitespace padding
  
  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>({
      difficulty: 'High School',
      quantity: 15,
      stylePreference: 'mixed',
      colorTheme: 'random'
  });
  const [background, setBackground] = useState<CanvasBackground>('dots');

  // Doodle State
  const [isDoodleMode, setIsDoodleMode] = useState(false);
  const [doodleStrokes, setDoodleStrokes] = useState<DoodleStroke[]>([]);
  const [activeBrush, setActiveBrush] = useState<BrushType>('pen');
  const [activeDoodleColor, setActiveDoodleColor] = useState('#2c2c2c');

  // --- Infinite Canvas Pan Handlers ---
  const handlePanStart = (e: React.PointerEvent) => {
    // Only pan if clicking on the background (not a fragment)
    // and if not in doodle mode (unless middle click)
    const isMiddleClick = e.button === 1;
    
    if (isDoodleMode && !isMiddleClick) return;

    if (e.target === canvasRef.current || isMiddleClick) {
        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);
        isPanning.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        canvasRef.current?.style.setProperty('cursor', 'grabbing');
    }
  };

  const handlePanMove = (e: React.PointerEvent) => {
      if (!isPanning.current) return;
      e.preventDefault();
      
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handlePanEnd = (e: React.PointerEvent) => {
      if (isPanning.current) {
          isPanning.current = false;
          (e.target as Element).releasePointerCapture(e.pointerId);
          canvasRef.current?.style.removeProperty('cursor');
      }
  };

  // Helper to get center of VIEWPORT in World Coordinates
  const getViewCenterInWorld = () => {
     const cx = window.innerWidth / 2;
     const cy = window.innerHeight / 2;
     return {
         x: cx - pan.x,
         y: cy - pan.y
     };
  };

  const performGeneration = async (isRemix: boolean = false) => {
    if (!input.trim()) return;
    setIsGenerating(true);
    setSelectedFragmentId(null);
    setShowSettings(false);
    setIsDoodleMode(false); // Exit doodle mode

    if (isRemix) {
        setFragments([]); 
        setDoodleStrokes([]); // Clear doodles on remix
    }

    try {
      const newFragments = await generateCollageFragments(input, settings, isRemix);
      
      const center = getViewCenterInWorld();

      const centeredFragments = newFragments.map(frag => ({
        ...frag,
        x: center.x + (Math.random() * 200 - 100),
        y: center.y + (Math.random() * 200 - 100) - 50,
        width: undefined,
        height: undefined,
        type: 'text' as const
      }));

      setFragments(prev => [...prev, ...centeredFragments]);
      if (!isRemix) setInput(''); 
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => performGeneration(false);
  const handleShuffle = () => performGeneration(true);

  // --- Auto Layout Logic ---
  const handleAutoLayout = () => {
    const textFrags = fragments.filter(f => f.type !== 'image');
    if (textFrags.length === 0) return;

    // 1. Separate images (keep them where they are or ignore)
    // 2. Shuffle text fragments slightly for variation
    const sorted = [...textFrags].sort(() => Math.random() - 0.5);
    
    const center = getViewCenterInWorld();
    
    const lineHeight = 100; // Increased base line height for less crowding
    const gap = 30; // Horizontal gap
    const maxLineWidth = Math.min(600, window.innerWidth - 80);
    
    let currentLine: CollageFragment[] = [];
    let currentWidth = 0;
    const lines: CollageFragment[][] = [];

    // Simple greedy line packing
    sorted.forEach(frag => {
        const fontSize = frag.fontSize || 20;
        const estWidth = (frag.text.length * fontSize * 0.8) + 40; 
        
        if (currentWidth + estWidth > maxLineWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentWidth = 0;
        }
        currentLine.push(frag);
        currentWidth += estWidth + gap;
    });
    if (currentLine.length > 0) lines.push(currentLine);

    // Calculate layout bounds
    const totalHeight = lines.length * lineHeight;
    let startY = center.y - totalHeight / 2;

    const newPositions = new Map<string, {x: number, y: number}>();

    lines.forEach((line) => {
        const lineTotalWidth = line.reduce((acc, frag) => {
             const fontSize = frag.fontSize || 20;
             return acc + (frag.text.length * fontSize * 0.8) + 40 + gap;
        }, 0);
        
        let startX = center.x - lineTotalWidth / 2;

        line.forEach(frag => {
            const fontSize = frag.fontSize || 20;
            const width = (frag.text.length * fontSize * 0.8) + 40;
            
            const randomYOffset = (Math.random() * 20) - 10;
            const randomXOffset = (Math.random() * 10) - 5;
            
            newPositions.set(frag.id, {
                x: startX + width / 2 + randomXOffset,
                y: startY + randomYOffset
            });
            
            startX += width + gap;
        });
        
        startY += lineHeight + (Math.random() * 20);
    });

    setFragments(prev => prev.map(f => {
        const pos = newPositions.get(f.id);
        if (pos) {
            return { ...f, x: pos.x, y: pos.y, rotation: (Math.random() * 8) - 4 };
        }
        return f;
    }));
  };

  const handleAddManualFragment = () => {
     const center = getViewCenterInWorld();
     const newFrag: CollageFragment = {
         id: `MANUAL-${Date.now()}`,
         text: "输入文本",
         style: settings.stylePreference === 'mixed' ? 'typewriter' : settings.stylePreference,
         rotation: 0,
         x: center.x,
         y: center.y,
         zIndex: fragments.length + 1,
         type: 'text'
     };
     setFragments(prev => [...prev, newFrag]);
     setSelectedFragmentId(newFrag.id);
     setIsDoodleMode(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const center = getViewCenterInWorld();
                  const newFrag: CollageFragment = {
                      id: `IMG-${Date.now()}`,
                      text: "", // Image fragments usually don't have text
                      type: 'image',
                      imageUrl: ev.target.result as string,
                      style: 'minimal',
                      rotation: 0,
                      x: center.x,
                      y: center.y,
                      zIndex: fragments.length + 1,
                      opacity: 1,
                      blendMode: 'normal'
                  };
                  setFragments(prev => [...prev, newFrag]);
                  setSelectedFragmentId(newFrag.id);
                  setIsDoodleMode(false);
              }
          };
          reader.readAsDataURL(file);
      }
      // Reset input
      if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleUpdateFragment = (id: string, updates: Partial<CollageFragment>) => {
    setFragments(prev => prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
    ));
  };

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
    setDoodleStrokes([]);
    setSelectedFragmentId(null);
  };

  const handleExport = async () => {
    setSelectedFragmentId(null);
    setIsDoodleMode(false);
    
    // Wait for UI to update (deselection)
    setTimeout(async () => {
        // We capture the "World" container
        const worldContainer = canvasRef.current?.querySelector('.infinite-world-layer') as HTMLElement;
        
        if (worldContainer) {
            try {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                let hasContent = false;

                // A. Fragments Bounds
                const fragmentElements = worldContainer.querySelectorAll('.collage-fragment');

                fragmentElements.forEach(el => {
                    // Use offsetLeft/Top because they are relative to the world container
                    // But transforms complicate things. simpler to use getBoundingClientRect relative to world container
                    const rect = el.getBoundingClientRect();
                    const worldRect = worldContainer.getBoundingClientRect();

                    const relLeft = rect.left - worldRect.left;
                    const relTop = rect.top - worldRect.top;
                    
                    if (relLeft < minX) minX = relLeft;
                    if (relTop < minY) minY = relTop;
                    if (relLeft + rect.width > maxX) maxX = relLeft + rect.width;
                    if (relTop + rect.height > maxY) maxY = relTop + rect.height;
                    hasContent = true;
                });

                // B. Doodles Bounds
                doodleStrokes.forEach(stroke => {
                    stroke.points.forEach(p => {
                        if (p.x < minX) minX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y > maxY) maxY = p.y;
                        hasContent = true;
                    });
                    // Buffer
                    minX -= 10; minY -= 10; maxX += 10; maxY += 10;
                });

                if (!hasContent) {
                   // Fallback
                   minX = 0; minY = 0; maxX = 800; maxY = 600;
                }

                // Add Padding
                const PADDING = exportPadding;
                minX = Math.max(0, minX - PADDING);
                minY = Math.max(0, minY - PADDING);
                const width = (maxX - minX) + (PADDING * 2);
                const height = (maxY - minY) + (PADDING * 2);

                // We need to capture the 'worldContainer', but adjusted for the crop
                // html2canvas captures what is visible or in DOM. 
                // We use crop options relative to the world container's transformed position
                const worldRect = worldContainer.getBoundingClientRect();
                
                const canvas = await html2canvas(worldContainer, {
                    scale: 3, 
                    backgroundColor: null, 
                    useCORS: true,
                    x: minX, // relative to the element being captured
                    y: minY,
                    width: width,
                    height: height,
                    ignoreElements: (element) => element.classList.contains('exclude-export')
                });

                setExportImage(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error("Export failed:", e);
            }
        }
    }, 100);
  };

  const selectedFragment = fragments.find(f => f.id === selectedFragmentId);

  const getBackgroundStyle = () => {
      // Offset background pattern by pan to create infinite illusion
      const pos = `${pan.x}px ${pan.y}px`;
      
      switch (background) {
          case 'dots': return { backgroundImage: `radial-gradient(#a3b1c6 1px, transparent 1px)`, backgroundSize: '20px 20px', backgroundPosition: pos, opacity: 0.2 };
          case 'grid': return { backgroundImage: `linear-gradient(#a3b1c6 1px, transparent 1px), linear-gradient(90deg, #a3b1c6 1px, transparent 1px)`, backgroundSize: '40px 40px', backgroundPosition: pos, opacity: 0.1 };
          case 'paper': return { backgroundColor: '#fdfbf7', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, opacity: 0.05 };
          case 'dark': return { backgroundColor: '#1a1a1a', opacity: 1 };
          case 'clay': return { backgroundColor: '#e0e5ec', opacity: 1 };
          default: return {};
      }
  };

  const isDarkBg = background === 'dark';

  return (
    <>
    {/* Hidden Inputs */}
    <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
        accept="image/*"
    />

    <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
      
      {/* Editor Panel (Left) */}
      <AnimatePresence>
        {selectedFragment && !isDoodleMode && (
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

      {/* Padding Control Slider (Left Side) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-4 bg-[#e0e5ec] py-6 px-2 rounded-full shadow-clay-flat border border-white/50 z-30 exclude-export">
         {/* Fixed: Removed rotate-180 so vertical text flows top-to-bottom naturally */}
         <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest writing-vertical-rl flex items-center gap-2">
            <Maximize size={10} className="mb-1" /> 留白 (Padding)
         </div>
         <input 
            type="range"
            min="10"
            max="200"
            value={exportPadding}
            onChange={(e) => setExportPadding(Number(e.target.value))}
            className="h-32 w-1 bg-gray-300 rounded-lg appearance-none cursor-pointer writing-vertical-rl"
            style={{ writingMode: 'vertical-lr' }}
            title="Adjust export whitespace"
         />
         <div className="text-[8px] font-mono text-gray-400">{exportPadding}</div>
      </div>

      {/* Doodle Toolbar (Floating Left/Top) */}
      <AnimatePresence>
        {isDoodleMode && (
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="absolute left-6 top-24 pointer-events-auto bg-[#e0e5ec] rounded-xl shadow-clay-flat border border-white/50 p-3 flex flex-col gap-4 z-50"
           >
              <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest text-center">工具 (Tools)</div>
              
              <div className="flex flex-col gap-2">
                 {(['pen', 'marker', 'highlighter'] as BrushType[]).map(b => (
                    <button
                       key={b}
                       onClick={() => setActiveBrush(b)}
                       className={`p-2 rounded-lg transition-all ${activeBrush === b ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'hover:bg-white/50 text-gray-500'}`}
                       title={b}
                    >
                       {b === 'pen' && <Pen size={16} />}
                       {b === 'marker' && <PenTool size={16} />}
                       {b === 'highlighter' && <Highlighter size={16} />}
                    </button>
                 ))}
              </div>
              
              <div className="w-full h-px bg-gray-300"></div>
              
              <div className="grid grid-cols-2 gap-2">
                 {['#2c2c2c', '#b91c1c', '#1e3a8a', '#047857', '#eab308', '#d946ef'].map(c => (
                    <button
                       key={c}
                       onClick={() => setActiveDoodleColor(c)}
                       className={`w-6 h-6 rounded-full border border-gray-300 ${activeDoodleColor === c ? 'ring-2 ring-emerald-400 transform scale-110' : ''}`}
                       style={{ backgroundColor: c }}
                    />
                 ))}
              </div>

              <div className="w-full h-px bg-gray-300"></div>

              <button
                onClick={() => setDoodleStrokes(prev => prev.slice(0, -1))}
                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-gray-400 flex flex-col items-center"
                title="Undo"
              >
                 <RotateCcw size={14} />
                 <span className="text-[8px] mt-1">撤销</span>
              </button>
           </motion.div>
        )}
      </AnimatePresence>

      {/* The Canvas (Infinite) */}
      <div 
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-auto overflow-hidden transition-colors duration-500 ${isDarkBg ? 'bg-[#1a1a1a]' : 'bg-[#e0e5ec]'}`}
        style={{ cursor: isDoodleMode ? 'crosshair' : 'grab' }}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerLeave={handlePanEnd}
        // Deselect if clicking on empty space (and not panning far)
        onClick={(e) => {
            if (!isPanning.current) setSelectedFragmentId(null);
        }}
      >
        {/* Background Layer */}
        <div className="absolute inset-0 pointer-events-none z-0 transition-all duration-500 will-change-transform" style={getBackgroundStyle()}></div>
        
        {/* World Container (The Infinite Layer) */}
        {/* Using style transform directly for performance during drag */}
        <div 
           className="infinite-world-layer absolute inset-0 pointer-events-none origin-top-left will-change-transform"
           style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
            {/* Doodle Layer */}
            {/* Doodles need to be interactive, so we allow pointer events inside */}
            <DoodleCanvas 
            isActive={isDoodleMode}
            strokes={doodleStrokes}
            onAddStroke={(s) => setDoodleStrokes(prev => [...prev, s])}
            activeBrush={activeBrush}
            activeColor={activeDoodleColor}
            // Pass the parent's pointer handlers if necessary, or rely on bubbling
            // Doodles are world-space relative
            />

            {fragments.map(frag => (
                <CollageMaterial 
                    key={frag.id} 
                    fragment={frag} 
                    isSelected={selectedFragmentId === frag.id}
                    onSelect={() => {
                        if (!isDoodleMode && !isPanning.current) setSelectedFragmentId(frag.id);
                    }}
                    onUpdateFragment={(updates) => handleUpdateFragment(frag.id, updates)}
                    // NO dragConstraints for infinite canvas
                    onUpdatePosition={(x, y) => handleUpdatePosition(frag.id, x, y)}
                />
            ))}
        </div>
        
        {fragments.length === 0 && doodleStrokes.length === 0 && !isGenerating && (
            <div className={`absolute inset-0 flex items-center justify-center text-4xl font-serif select-none pointer-events-none ${isDarkBg ? 'text-gray-700' : 'text-gray-400 opacity-30'}`}>
                书写你的沉默 (Compose your silence)
            </div>
        )}
      </div>

      {/* Controls (Bottom Center) */}
      <div className="relative z-40 pointer-events-auto w-full max-w-2xl px-4 flex flex-col gap-4 exclude-export">
        
        {/* Input & Settings */}
        <div className="relative">
            <ClayCard className="p-4 flex gap-4 items-center relative z-20">
                <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入意境 (例如：雨夜、孤独、未来)..."
                className="flex-1 bg-transparent border-b border-gray-300 pb-2 font-mono text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400 text-sm md:text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={isGenerating}
                />
                
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                    <Settings2 size={18} />
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={handleGenerate}
                        disabled={!input.trim() || isGenerating}
                        className="bg-[#2c2c2c] text-white p-3 rounded-xl shadow-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                    
                    <button
                        onClick={handleShuffle}
                        disabled={!input.trim() || isGenerating}
                        className="bg-[#e0e5ec] text-gray-700 border border-gray-300 p-3 rounded-xl shadow-clay-flat hover:shadow-clay-pressed hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reshuffle"
                    >
                         <Shuffle size={18} />
                    </button>
                </div>
            </ClayCard>
            
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
                                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">词汇难度 (Vocabulary)</label>
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
                            
                            {/* Color Theme Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Palette size={10} /> 颜色主题 (Theme)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {(['random', 'morandi', 'retro', 'neon', 'monochrome', 'pastel', 'forest'] as ColorTheme[]).map(theme => (
                                        <button
                                            key={theme}
                                            onClick={() => setSettings(s => ({ ...s, colorTheme: theme }))}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] border transition-all capitalize ${settings.colorTheme === theme ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
                                        >
                                            {theme}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">数量 (Quantity)</label>
                                        <span className="text-[10px] font-mono text-gray-500">{settings.quantity}</span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="50" step="5"
                                        value={settings.quantity}
                                        onChange={(e) => setSettings(s => ({ ...s, quantity: Number(e.target.value) }))}
                                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">默认风格 (Style)</label>
                                    <select 
                                        value={settings.stylePreference}
                                        onChange={(e) => setSettings(s => ({ ...s, stylePreference: e.target.value as any }))}
                                        className="w-full bg-white border border-gray-200 text-gray-600 text-xs rounded-lg p-1.5 outline-none focus:ring-1 focus:ring-emerald-400"
                                    >
                                        <option value="mixed">混合 (Mixed)</option>
                                        <option value="newspaper">报纸 (Newspaper)</option>
                                        <option value="typewriter">打字机 (Typewriter)</option>
                                        <option value="handwritten">手写 (Handwritten)</option>
                                        <option value="magazine-cutout">杂志剪报 (Magazine)</option>
                                    </select>
                                </div>
                            </div>
                        </ClayCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Action Toolbar */}
        <div className="flex justify-between items-end px-2 gap-4">
            
            {/* Left Tools */}
            <div className="flex gap-4 items-center">
                
                {/* Background Switcher */}
                <div className="flex flex-col gap-1 items-start bg-white/50 p-2 rounded-xl border border-white/50 backdrop-blur-sm">
                     <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest pl-1">背景 (BG)</span>
                     <div className="flex gap-1.5">
                        {(['dots', 'grid', 'paper', 'clay', 'dark'] as CanvasBackground[]).map(bg => (
                            <button
                                key={bg}
                                onClick={() => setBackground(bg)}
                                className={`w-5 h-5 rounded-full border shadow-sm transition-transform hover:scale-110 ${background === bg ? 'ring-2 ring-emerald-400 scale-110' : 'border-gray-300'}`}
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

                {/* Doodle Toggle */}
                <button
                   onClick={() => {
                       setIsDoodleMode(!isDoodleMode);
                       setSelectedFragmentId(null);
                   }}
                   className={`h-full px-4 py-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${isDoodleMode ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-inner' : 'bg-white/50 border-white/50 text-gray-500 hover:bg-white'}`}
                >
                   <PenTool size={16} />
                   <span className="text-[8px] font-mono uppercase tracking-widest">涂鸦</span>
                </button>
            </div>
            
            {/* Primary Actions (Right) */}
            <div className="flex gap-3">
                <button 
                    onClick={handleAutoLayout}
                    disabled={fragments.length === 0}
                    className="h-12 px-5 bg-white/50 border border-white/50 text-gray-500 hover:bg-white hover:text-blue-500 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-xs"
                    title="Auto Compose"
                >
                    <AlignCenter size={14} /> 自动排列
                </button>

                <button 
                    onClick={handleClear}
                    className="h-12 px-5 bg-white/50 border border-white/50 text-gray-500 hover:bg-white hover:text-red-500 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-xs"
                >
                    <RotateCcw size={14} /> 清空
                </button>

                <button 
                    onClick={handleAddManualFragment}
                    className="h-12 px-4 bg-white/50 border border-white/50 text-gray-500 hover:bg-white hover:text-blue-500 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-xs"
                    title="Add Text"
                >
                    <Plus size={14} /> 文本
                </button>
                
                <button 
                    onClick={() => imageInputRef.current?.click()}
                    className="h-12 px-4 bg-white/50 border border-white/50 text-gray-500 hover:bg-white hover:text-purple-500 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-xs"
                    title="Upload Image"
                >
                    <ImageIcon size={14} /> 图片
                </button>

                <button 
                    onClick={handleExport}
                    className="h-12 px-6 bg-white/50 border border-white/50 text-gray-500 hover:bg-white hover:text-emerald-500 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2 font-mono font-bold uppercase tracking-widest text-xs"
                >
                    <Download size={14} /> 保存诗篇
                </button>
            </div>
        </div>

      </div>
    </div>
    
    <AnimatePresence>
        {exportImage && (
            <ExportPreview 
                canvasImage={exportImage}
                onClose={() => setExportImage(null)}
            />
        )}
    </AnimatePresence>
    </>
  );
};
