
import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CollageFragment } from '../types';
import { Move } from 'lucide-react';

interface CollageMaterialProps {
  fragment: CollageFragment;
  onSelect: () => void;
  isSelected: boolean;
  onUpdateFragment: (updates: Partial<CollageFragment>) => void;
  dragConstraints?: React.RefObject<Element>;
  onUpdatePosition: (x: number, y: number) => void;
}

// Procedural Sound Generator (White Noise Rustle)
const playPaperSound = () => {
    // Check if AudioContext is supported
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    try {
        const ctx = new AudioContext();
        // Create 100ms noise buffer
        const bufferSize = ctx.sampleRate * 0.1; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter to simulate paper friction (mid-high freqs)
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800; // Hz
        filter.Q.value = 1;

        // Gain envelope for "rustle" shape (Attack -> Decay)
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        
        // Clean up context after sound to save resources
        setTimeout(() => ctx.close(), 200);
    } catch (e) {
        console.warn("Audio Context failed", e);
    }
};

export const CollageMaterial: React.FC<CollageMaterialProps> = ({ 
  fragment, 
  onSelect, 
  isSelected, 
  onUpdateFragment,
  dragConstraints,
  onUpdatePosition
}) => {
  const isDragging = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Memoize random torn edge path to prevent re-calc on every render
  const tornEdgePath = useRef<string | null>(null);
  
  const isImage = fragment.type === 'image';

  // --- Torn Edge Generator ---
  useEffect(() => {
     // Apply jagged torn effect to these styles
     const tornStyles = ['newspaper', 'magazine-cutout', 'typewriter', 'handwritten'];
     
     if (tornStyles.includes(fragment.style) && !tornEdgePath.current && !isImage) {
        
        // Configuration for different levels of "roughness"
        const isRough = fragment.style === 'magazine-cutout';
        const segmentSize = isRough ? 10 : 4; // Smaller is smoother
        const variance = isRough ? 5 : 2.5; // Jaggedness depth

        let points = [];
        
        // Top edge
        for (let i = 0; i <= 100; i += segmentSize) {
            points.push(`${i}% ${Math.random() * variance}%`);
        }
        // Right edge
        for (let i = 0; i <= 100; i += segmentSize) {
            points.push(`${100 - Math.random() * variance}% ${i}%`);
        }
        // Bottom edge
        for (let i = 100; i >= 0; i -= segmentSize) {
            points.push(`${i}% ${100 - Math.random() * variance}%`);
        }
        // Left edge
        for (let i = 100; i >= 0; i -= segmentSize) {
            points.push(`${Math.random() * variance}% ${i}%`);
        }

        tornEdgePath.current = `polygon(${points.join(', ')})`;
     } else {
        // Reset if style changes to a non-torn style
        if (!tornStyles.includes(fragment.style)) {
             tornEdgePath.current = null;
        }
     }
  }, [fragment.style, isImage]);

  // Default styles based on fragment.style type
  const getDefaultStyles = () => {
    switch (fragment.style) {
      case 'newspaper':
        return { 
            bg: '#f0f0f0', 
            color: '#000000', 
            fontFamily: '"Playfair Display", serif', 
            fontWeight: 'normal',
            border: 'none',
            hasShadow: true 
        };
      case 'typewriter':
        return { 
            bg: '#ffffff', 
            color: '#000000', 
            fontFamily: '"Courier Prime", monospace', 
            fontWeight: 'normal',
            border: 'none',
            hasShadow: true 
        };
      case 'handwritten':
        return { 
            bg: '#fffdcb', 
            color: '#1e3a8a', 
            fontFamily: '"Permanent Marker", cursive', 
            fontWeight: 'normal',
            border: 'none',
            hasShadow: true
        };
      case 'magazine-cutout':
        return { 
            bg: '#000000', 
            color: '#ffffff', 
            fontFamily: '"Anton", sans-serif', 
            fontWeight: 'bold',
            border: 'none',
            hasShadow: true 
        };
      case 'label':
        return {
            bg: '#ffffff',
            color: '#2c2c2c',
            fontFamily: '"Space Mono", monospace',
            fontWeight: 'normal',
            border: '1px solid #e5e7eb',
            hasShadow: true
        };
      case 'minimal':
        return {
            bg: 'transparent',
            color: '#2c2c2c',
            fontFamily: '"Zen Old Mincho", serif',
            fontWeight: 'normal',
            border: 'none',
            hasShadow: false
        };
      case 'bold-stamp':
         return {
            bg: '#2c2c2c',
            color: '#ffffff',
            fontFamily: '"Playfair Display", serif',
            fontWeight: 'bold',
            border: 'none',
            hasShadow: false
         };
      case 'receipt':
         return {
            bg: '#ffffff',
            color: '#2c2c2c',
            fontFamily: '"Space Mono", monospace',
            fontWeight: 'normal',
            border: 'none',
            hasShadow: true
         };
      case 'prescription':
         return {
            bg: '#f0f8ff',
            color: '#1e3a8a',
            fontFamily: '"Courier Prime", monospace',
            fontWeight: 'normal',
            border: '1px solid #dbeafe',
            hasShadow: true
         };
      case 'warning':
         return {
            bg: '#fef08a',
            color: '#000000',
            fontFamily: '"Anton", sans-serif',
            fontWeight: 'bold',
            border: '2px solid #000',
            hasShadow: true
         };
      case 'manual':
         return {
            bg: '#ffffff',
            color: '#4b5563',
            fontFamily: 'sans-serif',
            fontWeight: 'normal',
            border: '1px solid #e5e7eb',
            hasShadow: true
         };
      default:
        return { 
            bg: '#ffffff', 
            color: '#2c2c2c', 
            fontFamily: '"Space Mono", monospace', 
            fontWeight: 'normal',
            border: '1px solid #e5e7eb',
            hasShadow: true 
        };
    }
  };

  const defaults = getDefaultStyles();

  const backgroundColor = fragment.backgroundColor || defaults.bg;
  const color = fragment.color || defaults.color;
  const fontSize = fragment.fontSize ? `${fragment.fontSize}px` : undefined;
  const fontFamily = fragment.fontFamily || defaults.fontFamily;
  const fontWeight = fragment.fontWeight || defaults.fontWeight;
  const hasShadow = fragment.hasShadow !== undefined ? fragment.hasShadow : defaults.hasShadow;
  
  // Opacity & Blending
  const opacity = fragment.opacity !== undefined ? fragment.opacity : 1;
  const blendMode = fragment.blendMode || 'normal';

  const styleDimensions = {
      width: fragment.width ? `${fragment.width}px` : (isImage ? '150px' : 'auto'),
      height: fragment.height ? `${fragment.height}px` : 'auto',
      whiteSpace: fragment.width ? 'normal' : 'nowrap'
  } as const;

  const handleResize = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!elementRef.current) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = elementRef.current.offsetWidth;
    const startHeight = elementRef.current.offsetHeight;
    const rotationRad = (fragment.rotation * Math.PI) / 180;

    const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        // Rotate delta to align with local axis
        const localDeltaX = deltaX * Math.cos(rotationRad) + deltaY * Math.sin(rotationRad);
        const localDeltaY = -deltaX * Math.sin(rotationRad) + deltaY * Math.cos(rotationRad);

        let newWidth = startWidth;
        let newHeight = startHeight;

        // Aspect ratio lock logic for images could go here, but free resize is more collage-like
        if (corner.includes('right')) newWidth += localDeltaX;
        if (corner.includes('left')) newWidth -= localDeltaX;
        if (corner.includes('bottom')) newHeight += localDeltaY;
        if (corner.includes('top')) newHeight -= localDeltaY;

        onUpdateFragment({ 
            width: Math.max(20, newWidth), 
            height: Math.max(20, newHeight) 
        });
    };

    const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  const handleRotate = (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const onPointerMove = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - centerX;
          const deltaY = moveEvent.clientY - centerY;
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
          onUpdateFragment({ rotation: angle });
      };

      const onPointerUp = () => {
          document.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
  };

  const handleFinishEdit = (e: React.FocusEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      onUpdateFragment({ text: target.value });
      setIsEditing(false);
  };

  // --- Dynamic Texture Generators (Only for Text) ---
  const getTextureStyle = () => {
      if (isImage) return null;
      if (fragment.style === 'newspaper') {
          return { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, opacity: 0.1, mixBlendMode: 'multiply' as const };
      }
      if (fragment.style === 'prescription') {
          return { backgroundImage: `linear-gradient(#dbeafe 1px, transparent 1px), linear-gradient(90deg, #dbeafe 1px, transparent 1px)`, backgroundSize: '10px 10px', opacity: 0.5 };
      }
      if (fragment.style === 'manual') {
          return { backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`, backgroundSize: '20px 20px', opacity: 0.5 };
      }
      if (fragment.style === 'warning') {
          return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)`, opacity: 0.1 };
      }
      if (fragment.style === 'receipt') {
          return { backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '3px 3px', opacity: 0.05 };
      }
      return null;
  };

  const textureStyle = getTextureStyle();

  // If using torn edges, we rely on filter: drop-shadow instead of box-shadow because clip-path cuts box-shadow.
  const isTorn = !!tornEdgePath.current;

  return (
    <motion.div
      ref={elementRef}
      drag={!isSelected && !isEditing}
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={() => {
        isDragging.current = true;
        playPaperSound(); // Trigger Audio Feedback
      }}
      onDragEnd={(e, info) => {
        onUpdatePosition(fragment.x + info.offset.x, fragment.y + info.offset.y);
        setTimeout(() => { isDragging.current = false; }, 200);
      }}
      initial={{ x: fragment.x, y: fragment.y, rotate: fragment.rotation, scale: 0, opacity: 0 }}
      animate={{ 
        x: fragment.x, 
        y: fragment.y,
        rotate: fragment.rotation, 
        scale: 1, 
        opacity: isImage ? opacity : 1, // Text handles opacity via color usually, but here we apply container opacity for images
        zIndex: isSelected ? 100 : fragment.zIndex || 1
      }}
      whileHover={{ scale: 1.02, zIndex: 110 }}
      className={`
        collage-fragment absolute cursor-grab select-none flex items-center justify-center group pointer-events-auto
        ${isSelected ? 'ring-1 ring-emerald-400' : ''}
        ${isImage ? '' : 'px-3 py-1.5'}
      `}
      style={{
         // Base Styles
         backgroundColor: isImage ? 'transparent' : backgroundColor,
         color,
         fontSize,
         fontFamily,
         fontWeight: fontWeight as any,
         
         // Visuals
         // If torn, we use filter drop-shadow. If not, box-shadow.
         boxShadow: (hasShadow && !isTorn) ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
         filter: (hasShadow && isTorn) ? 'drop-shadow(2px 4px 4px rgba(0,0,0,0.15))' : 'none',

         border: (isImage || isTorn) ? 'none' : defaults.border,
         borderColor: isSelected ? 'transparent' : (fragment.style === 'warning' ? '#000' : (fragment.backgroundColor && fragment.backgroundColor !== 'transparent' ? 'transparent' : 'rgba(0,0,0,0.1)')),
         
         // Clipping
         clipPath: tornEdgePath.current || 'none',
         
         // Image specific
         mixBlendMode: blendMode as any,
         
         ...styleDimensions
      }}
      onClick={(e) => {
          e.stopPropagation();
          if (!isDragging.current) {
              onSelect();
          }
      }}
      onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isImage) setIsEditing(true);
      }}
    >
      {/* Image Content */}
      {isImage && fragment.imageUrl && (
          <img 
            src={fragment.imageUrl} 
            alt="collage element"
            className="w-full h-full object-cover pointer-events-none block" 
            style={{ opacity }} // Inner opacity to ensure blend mode works on the element itself
          />
      )}

      {/* Text Content */}
      {!isImage && (
        <>
            {/* Procedural Texture Layer */}
            {textureStyle && (
                <div className="absolute inset-0 pointer-events-none" style={textureStyle}></div>
            )}

            {isEditing ? (
                <textarea 
                    autoFocus
                    className="w-full h-full bg-transparent outline-none resize-none text-center overflow-hidden relative z-10"
                    defaultValue={fragment.text}
                    onBlur={handleFinishEdit}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFinishEdit(e as any); } }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: color, fontFamily, fontWeight: fontWeight as any }}
                />
            ) : (
                <span className="leading-none py-1 px-1 pointer-events-none relative z-10 block">{fragment.text}</span>
            )}
        </>
      )}
      
      {/* Geometry Handles */}
      {isSelected && (
          <>
            <div 
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-emerald-400 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center justify-start z-50"
                onPointerDown={handleRotate}
            >
                <div className="w-3 h-3 bg-emerald-400 rounded-full -mt-1.5 shadow-sm"></div>
            </div>

            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                <div 
                    key={pos}
                    className={`absolute w-3 h-3 bg-white border border-emerald-400 rounded-full shadow-sm z-50 pointer-events-auto
                        ${pos.includes('top') ? '-top-1.5' : '-bottom-1.5'}
                        ${pos.includes('left') ? '-left-1.5' : '-right-1.5'}
                        ${(pos === 'top-left' || pos === 'bottom-right') ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}
                    `}
                    onPointerDown={(e) => handleResize(e, pos)}
                />
            ))}
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-move opacity-0 hover:opacity-100 transition-opacity bg-black/5 z-20" />
          </>
      )}
    </motion.div>
  );
};
