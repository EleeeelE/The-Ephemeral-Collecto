
import React from 'react';
import { Camera, Scissors } from 'lucide-react';
import { AppMode } from '../types';
import { motion } from 'framer-motion';

interface ModeSwitcherProps {
  currentMode: AppMode;
  onSwitch: (mode: AppMode) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ currentMode, onSwitch }) => {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-[#e0e5ec] p-1.5 rounded-full shadow-clay-pressed flex items-center gap-1 border border-white/40">
      
      {/* Collector Option */}
      <button
        onClick={() => onSwitch(AppMode.COLLECTOR)}
        className={`
          relative flex items-center gap-2 px-6 py-2 rounded-full transition-colors duration-300 z-10
          ${currentMode === AppMode.COLLECTOR ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}
        `}
      >
        {currentMode === AppMode.COLLECTOR && (
          <motion.div
            layoutId="active-mode-pill"
            className="absolute inset-0 bg-[#e0e5ec] rounded-full shadow-clay-flat border border-white/60"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Camera size={14} />
          <span className="text-[10px] font-mono tracking-widest uppercase">Collector</span>
        </span>
      </button>

      {/* Poet Option */}
      <button
        onClick={() => onSwitch(AppMode.POET)}
        className={`
          relative flex items-center gap-2 px-6 py-2 rounded-full transition-colors duration-300 z-10
          ${currentMode === AppMode.POET ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}
        `}
      >
        {currentMode === AppMode.POET && (
          <motion.div
            layoutId="active-mode-pill"
            className="absolute inset-0 bg-[#e0e5ec] rounded-full shadow-clay-flat border border-white/60"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Scissors size={14} />
          <span className="text-[10px] font-mono tracking-widest uppercase">Poet</span>
        </span>
      </button>
      
    </div>
  );
};
