
import React, { useRef, useState, useEffect } from 'react';
import { DoodleStroke, BrushType } from '../types';

interface DoodleCanvasProps {
  strokes: DoodleStroke[];
  onAddStroke: (stroke: DoodleStroke) => void;
  activeColor: string;
  activeBrush: BrushType;
  isActive: boolean;
  className?: string;
}

export const DoodleCanvas: React.FC<DoodleCanvasProps> = ({ 
  strokes, 
  onAddStroke, 
  activeColor, 
  activeBrush,
  isActive,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const isDrawing = useRef(false);

  // Brush settings
  const getBrushStyles = (type: BrushType) => {
    switch (type) {
      case 'pen': return { width: 2, opacity: 1, lineCap: 'round' as const };
      case 'marker': return { width: 8, opacity: 0.8, lineCap: 'round' as const };
      case 'highlighter': return { width: 16, opacity: 0.4, lineCap: 'square' as const };
    }
  };

  const currentBrushStyle = getBrushStyles(activeBrush);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive || !svgRef.current) return;
    
    // Capture pointer to track outside window
    (e.target as Element).setPointerCapture(e.pointerId);
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    isDrawing.current = true;
    setCurrentStroke([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || !isActive || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    if (currentStroke.length > 1) {
      const newStroke: DoodleStroke = {
        id: `stroke-${Date.now()}`,
        points: currentStroke,
        color: activeColor,
        width: currentBrushStyle.width,
        type: activeBrush
      };
      onAddStroke(newStroke);
    }
    setCurrentStroke([]);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Convert points to SVG path data
  const getPathData = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    
    // Simple line smoothing can be added here, for now linear
    const d = points.reduce((acc, point, i) => {
      return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, '');
    
    return d;
  };

  return (
    <div className={`absolute inset-0 z-[150] ${isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}>
      <svg
        ref={svgRef}
        className="w-full h-full overflow-visible"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Existing Strokes */}
        {strokes.map(stroke => {
          const style = getBrushStyles(stroke.type);
          return (
            <path
              key={stroke.id}
              d={getPathData(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeOpacity={style.opacity}
              strokeLinecap={style.lineCap}
              strokeLinejoin="round"
              fill="none"
              className="pointer-events-none"
            />
          );
        })}

        {/* Current Stroke (Preview) */}
        {currentStroke.length > 1 && (
           <path
             d={getPathData(currentStroke)}
             stroke={activeColor}
             strokeWidth={currentBrushStyle.width}
             strokeOpacity={currentBrushStyle.opacity}
             strokeLinecap={currentBrushStyle.lineCap}
             strokeLinejoin="round"
             fill="none"
             className="pointer-events-none"
           />
        )}
      </svg>
    </div>
  );
};
