
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

  // Default styles based on fragment.style type
  const getDefaultStyles = () => {
    switch (fragment.style) {
      case 'newspaper':
        return { bg: '#f0f0f0', color: '#000000', font: 'font-serif', border: 'border-gray-300' };
      case 'typewriter':
        return { bg: '#ffffff', color: '#000000', font: 'font-mono tracking-widest', border: 'border-transparent' };
      case 'handwritten':
        return { bg: '#fffdcb', color: '#1e3a8a', font: 'font-serif-jp', border: 'border-yellow-100/50' };
      case 'magazine-cutout':
        return { bg: '#000000', color: '#ffffff', font: 'font-sans font-bold', border: 'border-white' };
      default:
        return { bg: '#ffffff', color: '#2c2c2c', font: 'font-sans', border: 'border-gray-200' };
    }
  };

  const defaults = getDefaultStyles();

  // Prefer specific overrides if present, otherwise fall back to defaults
  const backgroundColor = fragment.backgroundColor || defaults.bg;
  const color = fragment.color || defaults.color;
  const fontSize = fragment.fontSize ? `${fragment.fontSize}px` : undefined;
  
  // Explicit dimensions if set
  const styleDimensions = {
      width: fragment.width ? `${fragment.width}px` : 'auto',
      height: fragment.height ? `${fragment.height}px` : 'auto',
      whiteSpace: fragment.width ? 'normal' : 'nowrap'
  } as const;

  const handleResize = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!elementRef.current) return;
    
    // Disable drag on motion div while resizing
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = elementRef.current.offsetWidth;
    const startHeight = elementRef.current.offsetHeight;
    const rotationRad = (fragment.rotation * Math.PI) / 180;

    const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        // Rotate delta to align with local axis
        // x' = x cos θ + y sin θ
        // y' = -x sin θ + y cos θ
        const localDeltaX = deltaX * Math.cos(rotationRad) + deltaY * Math.sin(rotationRad);
        const localDeltaY = -deltaX * Math.sin(rotationRad) + deltaY * Math.cos(rotationRad);

        let newWidth = startWidth;
        let newHeight = startHeight;

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
          // Calculate angle + 90deg offset because handle is at top (-y)
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

  return (
    <motion.div
      ref={elementRef}
      drag={!isSelected && !isEditing} // Only draggable when not selected/resizing to prevent conflicts
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={() => {
        isDragging.current = true;
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
        opacity: 1,
        zIndex: isSelected ? 100 : fragment.zIndex || 1
      }}
      whileHover={{ scale: 1.02, zIndex: 110 }}
      className={`
        absolute cursor-grab px-3 py-1.5 select-none shadow-sm flex items-center justify-center group
        ${defaults.font}
        ${isSelected ? 'ring-1 ring-emerald-400' : ''}
      `}
      style={{
         backgroundColor,
         color,
         fontSize,
         borderWidth: '1px',
         borderColor: isSelected ? 'transparent' : (fragment.backgroundColor ? 'transparent' : 'rgba(0,0,0,0.1)'),
         clipPath: fragment.style === 'magazine-cutout' 
           ? 'polygon(2% 0%, 100% 2%, 98% 100%, 0% 98%)' 
           : 'none',
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
          setIsEditing(true);
      }}
    >
      {isEditing ? (
          <textarea 
            autoFocus
            className="w-full h-full bg-transparent outline-none resize-none text-center overflow-hidden"
            defaultValue={fragment.text}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFinishEdit(e as any); } }}
            onClick={(e) => e.stopPropagation()}
            style={{ color: color }}
          />
      ) : (
          <span className="leading-tight pointer-events-none">{fragment.text}</span>
      )}
      
      {/* Geometry Handles (Visible when selected) */}
      {isSelected && (
          <>
            {/* Rotation Handle */}
            <div 
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-emerald-400 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center justify-start"
                onPointerDown={handleRotate}
            >
                <div className="w-3 h-3 bg-emerald-400 rounded-full -mt-1.5 shadow-sm"></div>
            </div>

            {/* Resize Handles */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                <div 
                    key={pos}
                    className={`absolute w-3 h-3 bg-white border border-emerald-400 rounded-full shadow-sm z-20 pointer-events-auto
                        ${pos.includes('top') ? '-top-1.5' : '-bottom-1.5'}
                        ${pos.includes('left') ? '-left-1.5' : '-right-1.5'}
                        ${(pos === 'top-left' || pos === 'bottom-right') ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}
                    `}
                    onPointerDown={(e) => handleResize(e, pos)}
                />
            ))}
            
            {/* Move Hint */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-move opacity-0 hover:opacity-100 transition-opacity bg-black/5"
                 onPointerDown={(e) => {
                     // Delegate drag to parent motion div? 
                     // Framer Motion handles the drag on the main div, so this just acts as a clear 'grab' area
                 }}
            >
                <Move className="text-emerald-500 w-4 h-4 opacity-50" />
            </div>
          </>
      )}
    </motion.div>
  );
};
