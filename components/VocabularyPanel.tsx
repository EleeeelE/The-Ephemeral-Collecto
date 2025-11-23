
import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Bookmark, X, Grid, Loader2, ArrowUpLeft } from 'lucide-react';
import { VocabularyItem } from '../types';

interface VocabularyPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  items: VocabularyItem[];
  onItemClick: (item: VocabularyItem) => void;
  onRemoveItem: (id: string) => void;
  onTraceOrigin: (item: VocabularyItem) => void;
  // Lifted State
  expandedId: string | null;
  onExpand: (id: string | null) => void;
}

export const VocabularyPanel: React.FC<VocabularyPanelProps> = ({
  isOpen,
  onToggle,
  items,
  onItemClick,
  onRemoveItem,
  onTraceOrigin,
  expandedId,
  onExpand
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Bubble Up Logic:
  // When an item is expanded, move it to the top of the list so it spans the full width at the top.
  // The rest flow naturally below.
  const sortedItems = useMemo(() => {
    if (!expandedId) return items;
    const expandedItem = items.find(i => i.id === expandedId);
    const otherItems = items.filter(i => i.id !== expandedId);
    return expandedItem ? [expandedItem, ...otherItems] : items;
  }, [items, expandedId]);

  // Scroll to top when expanding to ensure the user sees the focused card
  useEffect(() => {
    if (expandedId && containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [expandedId]);

  const handleTileClick = (item: VocabularyItem) => {
    if (expandedId === item.id) {
      onExpand(null);
    } else {
      onExpand(item.id);
      onItemClick(item);
    }
  };

  return (
    <>
      {/* Toggle Tab (Visible when closed) */}
      <motion.button
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-[#e0e5ec] p-4 rounded-l-2xl shadow-clay-flat border-l border-white/40 flex flex-col items-center gap-3 group hover:pr-5 transition-all outline-none"
        onClick={onToggle}
        initial={{ x: 0 }}
        animate={{ x: isOpen ? 400 : 0 }} 
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <Grid size={18} className="text-gray-500" />
        <span className="writing-vertical-rl text-[9px] font-mono tracking-widest text-gray-400 uppercase">
          COLLECTION
        </span>
        {items.length > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
        )}
      </motion.button>

      {/* The Panel (Sliding Drawer - Specimen Tray) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-80 md:w-96 bg-[#e0e5ec] z-50 shadow-[-10px_0_40px_rgba(163,177,198,0.4)] border-l border-white/40 flex flex-col"
            >
              {/* Header */}
              <div className="p-8 flex justify-between items-center relative z-10 shrink-0">
                 {/* Clay indent decoration */}
                 <div className="absolute top-1/2 left-4 -translate-y-1/2 w-1 h-12 rounded-full shadow-clay-pressed opacity-50"></div>
                 
                 <div className="pl-4">
                   <h2 className="text-xl font-serif-jp text-gray-800 tracking-tight">拾词成集</h2>
                   <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">
                     Specimen Tray
                   </p>
                 </div>
                 
                 <button 
                   onClick={onToggle} 
                   className="w-10 h-10 rounded-full shadow-clay-flat flex items-center justify-center text-gray-500 active:shadow-clay-pressed transition-all bg-[#e0e5ec]"
                 >
                   <X size={16} />
                 </button>
              </div>

              {/* Tray Content */}
              <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 relative z-0 scrollbar-hide"
              >
                 {/* Empty State */}
                 {items.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-center opacity-40 space-y-4 rounded-2xl shadow-clay-pressed mx-2 border border-white/20">
                       <Bookmark size={32} className="text-gray-400" />
                       <p className="text-[10px] font-mono text-gray-400 max-w-[180px]">
                         The tray is empty.<br/>Collect words from your receipts.
                       </p>
                    </div>
                 )}

                 {/* Grid */}
                 <LayoutGroup>
                   <motion.div 
                     layout 
                     className="grid grid-cols-2 gap-4 auto-rows-min"
                   >
                     {sortedItems.map((item) => {
                       const isExpanded = expandedId === item.id;
                       
                       return (
                         <motion.div
                           layout
                           key={item.id}
                           onClick={() => handleTileClick(item)}
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ 
                             opacity: 1, 
                             scale: 1,
                             // The expanded item is effectively moved to index 0 via 'sortedItems',
                             // so we just need to tell it to span 2 columns.
                             gridColumn: isExpanded ? "span 2" : "span 1"
                           }}
                           transition={{ type: "spring", stiffness: 200, damping: 25 }}
                           className={`
                             relative bg-[#fdfbf7] rounded-xl shadow-[2px_2px_5px_rgba(163,177,198,0.3)] 
                             cursor-pointer flex flex-col items-center border border-transparent 
                             hover:border-white transition-colors overflow-hidden
                             ${isExpanded ? 'p-6 items-start aspect-auto min-h-[200px]' : 'p-4 justify-center aspect-square'}
                           `}
                         >
                            {/* Visual Pin Hole */}
                            <motion.div 
                                layout
                                className={`absolute top-3 w-1.5 h-1.5 bg-[#2c2c2c] rounded-full opacity-20`}
                                animate={{ 
                                    left: isExpanded ? 24 : "50%", 
                                    x: isExpanded ? 0 : "-50%" 
                                }}
                            />

                            {/* The Word */}
                            <motion.div layout className="w-full flex justify-center">
                                <motion.span 
                                layout
                                className={`font-serif text-[#2c2c2c] leading-tight w-full break-words ${isExpanded ? 'text-3xl text-left mt-4 mb-4' : 'text-lg mt-2 text-center'}`}
                                >
                                {item.word}
                                </motion.span>
                            </motion.div>
                            
                            {/* Expanded Content: Analysis */}
                            <AnimatePresence mode='wait'>
                                {isExpanded && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: 5 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full mt-2 space-y-4"
                                >
                                    <div className="w-full h-px bg-gray-100"></div>
                                    
                                    {/* Loading State */}
                                    {item.isAnalyzing && !item.analysis && (
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono py-2">
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>DECODING ESSENCE...</span>
                                    </div>
                                    )}

                                    {/* Analysis Text */}
                                    {item.analysis && (
                                    <div className="space-y-3">
                                        <div className="text-sm font-serif text-gray-600 italic leading-relaxed">
                                        "{item.analysis.definition}"
                                        </div>
                                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wide">
                                        Nuance: {item.analysis.nuance}
                                        </div>
                                    </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-between items-end w-full pt-4 mt-auto">
                                        <span className="text-[8px] font-mono text-gray-300">
                                        {item.timestamp.split(' ')[0]}
                                        </span>
                                        
                                        <button
                                        onClick={(e) => { e.stopPropagation(); onTraceOrigin(item); }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#e0e5ec] rounded-full text-[9px] font-mono text-gray-600 hover:shadow-clay-flat transition-all active:shadow-clay-pressed uppercase tracking-wider"
                                        >
                                        <ArrowUpLeft size={10} />
                                        Trace Origin
                                        </button>
                                    </div>
                                </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* Collapsed Date */}
                            {!isExpanded && (
                              <motion.div layout className="mt-auto pt-2 w-full border-t border-gray-100 text-center">
                                <span className="text-[8px] font-mono text-gray-400 tracking-tighter">
                                  {item.timestamp.split(' ')[0]}
                                </span>
                              </motion.div>
                            )}
                            
                            {/* Remove Action (Top Right) */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                              className="absolute top-2 right-2 p-1.5 text-gray-200 hover:text-red-300 transition-colors z-10"
                            >
                              <X size={10} />
                            </button>
                         </motion.div>
                       );
                     })}
                   </motion.div>
                 </LayoutGroup>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
