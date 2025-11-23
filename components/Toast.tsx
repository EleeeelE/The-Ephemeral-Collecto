
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid } from 'lucide-react';

interface ToastProps {
  word: string | null;
  onClose: () => void;
  onViewPanel: () => void;
}

export const Toast: React.FC<ToastProps> = ({ word, onClose, onViewPanel }) => {
  useEffect(() => {
    if (word) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [word, onClose]);

  return (
    <AnimatePresence>
      {word && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          // Increased z-index to 110 to sit above the Modal (z-100)
          className="fixed bottom-24 right-8 z-[110] pointer-events-auto"
        >
          <div className="bg-[#e0e5ec] pl-5 pr-2 py-3 rounded-2xl shadow-clay-flat border border-white/50 flex items-center gap-4 relative overflow-hidden">
            
            {/* Emerald Accent Line (Inset) */}
            <div className="absolute left-2 top-3 bottom-3 w-1 rounded-full bg-emerald-500/30 shadow-inner"></div>

            {/* Content */}
            <div className="flex flex-col min-w-[150px] pl-2">
              <div className="flex items-baseline gap-2">
                 <span className="font-serif font-bold text-[#2c2c2c] text-lg leading-tight">"{word}"</span>
              </div>
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mt-1">
                Collected successfully.
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300/50"></div>

            {/* Action Button */}
            <button 
              onClick={() => {
                onViewPanel();
                onClose();
              }}
              className="group flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#e0e5ec] hover:shadow-clay-flat active:shadow-clay-pressed transition-all border border-transparent hover:border-white/60 active:scale-95"
            >
              <Grid size={14} className="text-gray-500 group-hover:text-emerald-600 transition-colors" />
              <span className="text-[7px] font-mono text-gray-400 mt-1 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">View</span>
            </button>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
