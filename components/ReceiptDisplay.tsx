


import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { Calendar, Thermometer, Wind, Hash, Download, X, Maximize2, Plus } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';

interface ReceiptCardProps {
  result: AnalysisResult;
  onClose?: () => void;
  className?: string;
  variant?: 'printing' | 'thumbnail' | 'full';
  onExpand?: () => void;
  // Drag props
  dragConstraints?: React.RefObject<Element>;
  zIndex?: number;
  onFocus?: () => void;
  // Vocabulary Prop
  onCollectWord?: (word: string, sourceId: string) => void;
  // Trace Origin Prop
  highlightedWord?: string | null;
}

// Helper to make text clickable
const InteractiveText: React.FC<{ 
  text: string; 
  onCollect?: (word: string) => void;
  highlightedWord?: string | null;
  className?: string;
}> = ({ text, onCollect, highlightedWord, className = '' }) => {
  if (!onCollect && !highlightedWord) return <span className={className}>{text}</span>;

  // Split by spaces but keep punctuation attached visually or separate tokens
  // For Chinese support, splitting by space is less effective, so we might want to allow character selection eventually,
  // but for now, preserving the logic for English words mixed in or if Chinese text has spaces. 
  // Ideally for Chinese, we'd just render the text. Let's keep it simple for now.
  const words = text.split(/(\s+)/);

  return (
    <span className={className}>
      {words.map((segment, i) => {
        // Simple heuristic: if it contains letters, it's a word
        // For Chinese, almost every char is a word.
        const isWord = /[a-zA-Z\u4e00-\u9fa5]/.test(segment);
        const cleanWord = segment.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        
        // Check if this is the highlighted word (Case insensitive)
        const isHighlighted = highlightedWord && cleanWord.toLowerCase() === highlightedWord.toLowerCase();

        if (isWord) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (onCollect) onCollect(cleanWord);
              }}
              // Updated Styles: Subtle "touch/pressed" effect (Claymorphism)
              // If highlighted (Trace Origin): Darker pressed state + Bold
              className={`
                rounded px-0.5 transition-all duration-300 relative group/word 
                ${onCollect ? 'cursor-pointer hover:bg-[#d1d9e6] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]' : ''}
                ${isHighlighted ? 'bg-[#d1d9e6] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] font-bold text-gray-800' : ''}
              `}
            >
              {segment}
              {/* Minimalist Tooltip */}
              {onCollect && !isHighlighted && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/word:opacity-100 transition-opacity text-[8px] tracking-widest text-white bg-[#2c2c2c] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 font-mono">
                  收藏 (Collect)
                </span>
              )}
            </span>
          );
        }
        return <span key={i}>{segment}</span>;
      })}
    </span>
  );
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ 
  result, 
  onClose, 
  className = '',
  variant = 'full',
  onExpand,
  dragConstraints,
  zIndex = 0,
  onFocus,
  onCollectWord,
  highlightedWord
}) => {
  const { data, timestamp, imageUrl, id, rotation } = result;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Ref to differentiate between a drag action and a tap action
  const isDraggingRef = useRef(false);

  // Auto-scroll to highlighted word if present
  useEffect(() => {
    if (highlightedWord && variant === 'full') {
        // Simple delay to ensure render
        setTimeout(() => {
            const el = document.querySelector('.bg-\\[\\#d1d9e6\\]'); // Select based on highlight class
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
    }
  }, [highlightedWord, variant]);

  if (!data) return null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          logging: false,
        });
        
        const link = document.createElement('a');
        link.download = `ephemeral-moment-${timestamp.replace(/[:\s]/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Failed to download receipt", err);
      }
    }
  };

  const isThumbnail = variant === 'thumbnail';
  const isPrinting = variant === 'printing';
  const isFull = variant === 'full';
  const showContent = !isThumbnail || isPrinting;

  // Animation Variants
  const contentVariants = {
    collapsed: { 
      height: 0, 
      opacity: 0,
      marginTop: 0,
      overflow: 'hidden',
    },
    expanded: { 
      height: 'auto', 
      opacity: 1,
      marginTop: 8,
      overflow: 'visible',
    }
  };

  const isDraggable = isThumbnail && !isPrinting;

  // Force rotation to 0 if printing or in full view (Auto-straighten)
  const displayRotation = (isPrinting || isFull) ? 0 : rotation;

  const handleWordCollect = (word: string) => {
    if (onCollectWord) {
      onCollectWord(word, id);
    }
  };

  return (
    <motion.div 
      layoutId={isPrinting ? undefined : `receipt-${id}`}
      drag={isDraggable}
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0.1}
      // Handle drag state to prevent accidental clicks
      onDragStart={() => {
        isDraggingRef.current = true;
        onFocus?.();
      }}
      onDragEnd={() => {
        // Small delay to ensure the tap event doesn't fire immediately after drag release
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      // Only expand if it wasn't a drag operation
      onTap={() => {
        if (!isDraggingRef.current) {
          onFocus?.();
          onExpand?.();
        }
      }}
      style={{ 
        rotate: displayRotation,
        zIndex: zIndex,
        x: isPrinting ? 0 : result.x, // Initial Position
        y: isPrinting ? 0 : result.y
      }}
      className={`relative group ${className} ${isDraggable ? 'cursor-grab active:cursor-grabbing absolute' : 'cursor-auto'}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={isDraggable ? { scale: 1.02, zIndex: 100 } : {}}
      whileTap={isDraggable ? { scale: 0.98, cursor: 'grabbing' } : {}}
    >
      
      {/* Controls Overlay (Only visible on hover for thumbnails) */}
      <AnimatePresence>
        {isHovered && isThumbnail && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-none"
          >
            <div className="bg-white/80 backdrop-blur rounded-full p-1 flex gap-2 pointer-events-auto shadow-clay-flat">
               <button onClick={(e) => { e.stopPropagation(); onExpand?.(); }} className="p-1.5 hover:bg-black/10 rounded-full text-gray-600 transition-colors">
                  <Maximize2 size={12} />
               </button>
               <button onClick={handleDownload} className="p-1.5 hover:bg-black/10 rounded-full text-gray-600 transition-colors">
                  <Download size={12} />
               </button>
               {onClose && (
                 <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-red-100 text-red-500 rounded-full transition-colors">
                    <X size={12} />
                 </button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Full View Controls */}
      {!isThumbnail && !isPrinting && (
         <div className="absolute -top-3 -right-3 flex gap-2 z-30">
            <button 
              onClick={handleDownload}
              className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-all"
            >
              <Download size={14} />
            </button>
         </div>
      )}

      {/* Actual Receipt Paper */}
      <motion.div 
        layout
        ref={cardRef}
        className={`
          bg-[#fdfbf7] relative shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] 
          mx-auto jagged-bottom overflow-hidden
          ${isThumbnail ? 'w-48 pb-4' : 'w-full max-w-md pb-8'}
        `}
      >
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        
        {/* Header */}
        <motion.div layout className={`border-b-2 border-dashed border-gray-300 relative z-20 ${isThumbnail ? 'p-2' : 'p-4'}`}>
          <div className={`flex justify-between items-center mb-2 text-gray-400 font-mono ${isThumbnail ? 'text-[8px]' : 'text-[10px]'}`}>
             <span>NO. {id.slice(-4).toUpperCase()}</span>
             {!isThumbnail && <span>{timestamp}</span>}
          </div>
          
          <div className={`aspect-square w-full bg-gray-100 mb-2 overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 border-2 border-gray-800`}>
            <motion.img layoutId={isPrinting ? undefined : `img-${id}`} src={imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
          </div>
          
          <div className={`text-center font-dot tracking-widest uppercase border-y border-gray-800 py-1 my-2 text-gray-800 ${isThumbnail ? 'text-[10px]' : 'text-lg'}`}>
            {isThumbnail ? 'EPHEMERA' : 'EPHEMERAL COLLECTOR'}
          </div>
        </motion.div>

        {/* Content Body */}
        <motion.div
           layout
           initial={false}
           animate={showContent ? "expanded" : "collapsed"}
           variants={contentVariants}
           transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
           className="bg-[#fdfbf7] relative z-20"
        >
          <div className={`${isThumbnail && !isPrinting ? 'px-2' : 'px-6 py-2'}`}>
            
            {/* Essence (Poetry) */}
            <div className="mb-6 text-center">
               <h3 className="text-[10px] font-bold tracking-widest mb-4 text-gray-400 uppercase flex items-center justify-center gap-2">
                 <Hash size={10} /> 俳句 / Essence
               </h3>
               
               {/* English Poem (Primary) */}
               <div className="font-serif text-lg mb-3 text-[#2c2c2c] leading-relaxed whitespace-pre-line">
                 <InteractiveText 
                    text={data.haiku.english} 
                    onCollect={!isThumbnail ? handleWordCollect : undefined} 
                    highlightedWord={highlightedWord}
                 />
               </div>
               
               {/* Chinese Translation (Secondary) */}
               <div className="text-xs font-serif-jp text-gray-500 italic border-t border-gray-200 pt-2 mt-2 mx-4">
                 {data.haiku.chinese}
               </div>
            </div>

            {/* Sensory Data */}
            <div className="grid grid-cols-1 gap-3 mb-6">
               <div className="border border-gray-200 p-2 relative bg-white/50">
                 <div className="absolute -top-2 left-2 bg-[#fdfbf7] px-1 text-[8px] font-bold text-gray-400 uppercase flex items-center gap-1">
                   <Wind size={8} /> 听觉 (Auditory)
                 </div>
                 <p className="text-xs text-gray-600 mt-1 leading-tight">
                   <InteractiveText 
                      text={data.senses.auditory} 
                      onCollect={!isThumbnail ? handleWordCollect : undefined} 
                      highlightedWord={highlightedWord}
                    />
                 </p>
               </div>
               
               <div className="border border-gray-200 p-2 relative bg-white/50">
                 <div className="absolute -top-2 left-2 bg-[#fdfbf7] px-1 text-[8px] font-bold text-gray-400 uppercase flex items-center gap-1">
                   <Thermometer size={8} /> 触觉 (Tactile)
                 </div>
                 <p className="text-xs text-gray-600 mt-1 leading-tight">
                    <InteractiveText 
                      text={data.senses.tactile_temperature} 
                      onCollect={!isThumbnail ? handleWordCollect : undefined} 
                      highlightedWord={highlightedWord}
                    />
                 </p>
               </div>

               <div className="border border-gray-200 p-2 relative bg-white/50">
                 <div className="absolute -top-2 left-2 bg-[#fdfbf7] px-1 text-[8px] font-bold text-gray-400 uppercase flex items-center gap-1">
                   <Calendar size={8} /> 嗅觉 (Olfactory)
                 </div>
                 <p className="text-xs text-gray-600 mt-1 leading-tight">
                    <InteractiveText 
                      text={data.senses.olfactory} 
                      onCollect={!isThumbnail ? handleWordCollect : undefined} 
                      highlightedWord={highlightedWord}
                    />
                 </p>
               </div>
            </div>

            {/* Insight Box */}
            <div className="bg-[#1a1a1a] text-gray-200 p-3 font-mono text-[10px] leading-relaxed relative overflow-hidden">
              <p className="relative z-10">
                <span className="text-green-500 mr-2">>></span>
                <InteractiveText 
                  text={data.insight} 
                  onCollect={!isThumbnail ? handleWordCollect : undefined} 
                  highlightedWord={highlightedWord}
                />
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Condensed View Text */}
        {isThumbnail && !isPrinting && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="px-2 pb-2 relative z-20"
           >
             <p className="text-[9px] text-center text-gray-500 font-serif italic leading-tight line-clamp-3 px-2">
               "{data.haiku.english}"
             </p>
           </motion.div>
        )}

        {/* Footer Barcode */}
        <motion.div 
          layout
          animate={showContent ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
          className={`px-6 pt-4 text-center pb-2 overflow-hidden relative z-20`}
        >
           <div 
             className="h-6 w-full opacity-30 mix-blend-multiply"
             style={{
               backgroundImage: `repeating-linear-gradient(90deg,#000 0px,#000 2px,transparent 2px,transparent 4px)`
             }}
           ></div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
