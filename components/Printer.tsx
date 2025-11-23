
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, Sparkles, Power, AlignJustify } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult } from '../types';
import { ReceiptCard } from './ReceiptDisplay';

interface PrinterProps {
  onImageSelected: (file: File) => void;
  isAnalyzing: boolean;
  printingResult: AnalysisResult | null;
  onPrintComplete: () => void;
}

export const Printer: React.FC<PrinterProps> = ({ 
  onImageSelected, 
  isAnalyzing, 
  printingResult,
  onPrintComplete 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-complete printing after animation
  useEffect(() => {
    if (printingResult) {
      const timer = setTimeout(() => {
        onPrintComplete();
      }, 6000); // Wait for the slow slide up animation
      return () => clearTimeout(timer);
    }
  }, [printingResult, onPrintComplete]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div className="relative w-80 perspective-1000 flex flex-col items-center group">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* --- LAYER 1: The Paper (Extruding) --- 
          Z-Index: 10. Positioned behind the Front Plate (Z-20)
      */}
      <div className="absolute top-8 w-full flex justify-center z-10">
        <AnimatePresence>
          {printingResult && (
            <motion.div
              key="printing-paper"
              // Start positioned inside the machine
              initial={{ y: 60, opacity: 0 }}
              // Animate UPWARDS
              animate={{ y: -360, opacity: 1 }}
              exit={{ opacity: 0 }} 
              transition={{ 
                duration: 5.5, // Slow, mechanical extrusion
                ease: [0.25, 1, 0.5, 1], // Soft ease-out
                opacity: { duration: 0.5 } 
              }}
              className="origin-bottom"
            >
               {/* Scale down slightly to fit slot width */}
               <div className="scale-[0.80] shadow-sm">
                 <ReceiptCard result={printingResult} variant="printing" />
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- LAYER 2: The Machine Body (Retro Clay) --- 
          Z-Index: 20.
      */}
      <motion.div 
        className="relative z-20 w-full"
        // Gentle, slow breathing vibration during analysis
        animate={isAnalyzing ? { y: [0, 1, 0] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        {/* Main Chassis */}
        <div 
          className={`
            bg-[#e0e5ec] /* Clay Base */
            rounded-2xl
            p-5
            transition-all duration-300
            relative
            flex flex-col
            border-t border-white/50
            border-b border-gray-400/20
          `}
          style={{
            boxShadow: `
              15px 15px 30px #bebebe, 
              -15px -15px 30px #ffffff
            `
          }}
          onClick={() => !isAnalyzing && !printingResult && fileInputRef.current?.click()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          
          {/* Top Section: Roller / Output Slot */}
          <div className="relative h-12 w-full bg-[#d1d9e6] rounded-lg shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] mb-6 overflow-hidden flex items-center justify-center border-b border-white/30">
             {/* Roller Texture */}
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 2px, #000 2px, #000 3px)' }}></div>
             {/* The Slot Opening */}
             <div className="w-[85%] h-2 bg-[#2c2c2c] rounded-full shadow-inner opacity-80 relative z-10"></div>
          </div>

          {/* Middle Section: Control Interface */}
          <div className="flex justify-between items-end px-2">
            
            {/* Left: Speaker Vents & Info */}
            <div className="flex flex-col gap-3">
               <div className="space-y-1.5">
                  <div className="w-16 h-1 rounded-full bg-gray-400/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"></div>
                  <div className="w-16 h-1 rounded-full bg-gray-400/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"></div>
                  <div className="w-16 h-1 rounded-full bg-gray-400/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"></div>
               </div>
               <div className="text-[9px] font-mono text-gray-400 tracking-tighter opacity-70">
                  <div>MODEL: MONO-01</div>
                  <div>SERIES: EPHEMERA</div>
               </div>
            </div>

            {/* Center: Main Actuator Button */}
            <div className="relative group/btn cursor-pointer">
               {/* Label */}
               <div className="absolute -top-4 left-0 right-0 text-center text-[8px] font-bold text-gray-400 tracking-widest uppercase">
                  {isAnalyzing ? 'Processing' : 'Capture'}
               </div>
               
               <div 
                 className={`
                    w-20 h-20 rounded-xl
                    flex items-center justify-center
                    transition-all duration-200
                    ${isHovered ? 'shadow-clay-pressed scale-[0.98]' : 'shadow-clay-flat'}
                 `}
               >
                 {isAnalyzing ? (
                   <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                 ) : (
                   <div className={`transition-transform duration-300 ${isHovered ? 'scale-95' : ''}`}>
                      <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center">
                         <div className="w-8 h-8 rounded-full bg-gray-300 shadow-inner"></div>
                      </div>
                   </div>
                 )}
               </div>
            </div>

            {/* Right: Rotary Knob (Decorative) */}
            <div className="flex flex-col items-center gap-2">
               <div className="w-12 h-12 rounded-full shadow-clay-convex flex items-center justify-center relative">
                  <div className="w-2 h-2 rounded-full bg-gray-300 absolute top-2"></div>
                  <div className="w-8 h-8 rounded-full border border-gray-300/50"></div>
               </div>
               <div className="text-[8px] font-bold text-gray-400 tracking-widest uppercase">GAIN</div>
            </div>

          </div>

          {/* Bottom Section: Status Bar */}
          <div className="mt-6 flex items-center justify-between bg-[#d1d9e6]/30 rounded-lg p-2 border border-white/40">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${isAnalyzing ? 'bg-amber-400 animate-pulse' : printingResult ? 'bg-emerald-400' : 'bg-gray-300'}`}></div>
                <span className="text-[9px] font-mono text-gray-500">POWER</span>
             </div>
             
             <div className="h-1 w-16 bg-gray-300/50 rounded-full overflow-hidden">
                {isAnalyzing && (
                   <motion.div 
                     className="h-full bg-gray-500"
                     initial={{ width: "0%" }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 2, repeat: Infinity }}
                   />
                )}
             </div>
          </div>

        </div>
        
        {/* Table Shadow */}
        <div className="w-[90%] h-4 mx-auto mt-[-5px] bg-black/10 blur-lg rounded-full z-[-1]"></div>
      </motion.div>
    </div>
  );
};
