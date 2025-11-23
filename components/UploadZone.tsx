import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ClayCard } from './ClayCard';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  isLoading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelected, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <ClayCard 
        className={`min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors duration-500 ${isDragging ? 'bg-gray-200' : ''}`}
        pressed={isDragging || isLoading}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        {isLoading ? (
            <div className="flex flex-col items-center animate-pulse">
               <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-6 shadow-inner">
                 <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
               </div>
               <h2 className="text-lg font-mono text-gray-600 mb-2">OBSERVING...</h2>
               <p className="text-xs text-gray-400 max-w-[200px]">
                 Decoding the passage of time...
               </p>
            </div>
        ) : (
          <>
            {/* Decorative Indents */}
            <div className="absolute top-6 left-6 w-3 h-3 rounded-full shadow-clay-pressed opacity-50"></div>
            <div className="absolute top-6 right-6 w-3 h-3 rounded-full shadow-clay-pressed opacity-50"></div>
            <div className="absolute bottom-6 left-6 w-3 h-3 rounded-full shadow-clay-pressed opacity-50"></div>
            <div className="absolute bottom-6 right-6 w-3 h-3 rounded-full shadow-clay-pressed opacity-50"></div>

            <div className="w-32 h-32 rounded-full bg-clay-base shadow-clay-convex flex items-center justify-center mb-8 group-hover:scale-105 transition-transform duration-300">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            
            <h3 className="text-xl font-dot text-gray-700 mb-3 tracking-widest uppercase">
              Insert Ephemera
            </h3>
            
            <p className="text-sm text-gray-500 font-mono max-w-[260px] leading-relaxed mb-8">
              Upload an object or scene that shows the touch of time. <br/>
              <span className="text-[10px] opacity-60">(Tap to open camera roll)</span>
            </p>

            {/* Visual Hint */}
            <div className="flex gap-2 opacity-40">
               <div className="w-12 h-16 border-2 border-dashed border-gray-400 rounded-md flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full bg-gray-300"></div>
               </div>
               <div className="w-12 h-16 border-2 border-dashed border-gray-400 rounded-md flex items-center justify-center">
                 <ImageIcon size={16} />
               </div>
            </div>
          </>
        )}
        
        {isDragging && (
           <div className="absolute inset-0 bg-clay-base/50 backdrop-blur-sm flex items-center justify-center z-10">
             <p className="font-bold text-gray-600 tracking-widest">RELEASE TO COLLECT</p>
           </div>
        )}
      </ClayCard>
      
      <div className="mt-8 text-center space-y-2">
         <div className="inline-block px-4 py-1 rounded-full bg-gray-200/50 text-[10px] font-mono text-gray-500 shadow-inner">
            SUPPORTED: RUST, FADING, WILTED FLOWERS, RAIN
         </div>
      </div>
    </div>
  );
};