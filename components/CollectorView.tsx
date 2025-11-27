
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Printer } from './Printer';
import { ReceiptCard } from './ReceiptDisplay';
import { analyzeImage } from '../services/geminiService';
import { AppState, AnalysisResult, VocabularyItem } from '../types';
import { Info } from 'lucide-react';

interface CollectorViewProps {
  onCollectWord: (word: string, sourceId: string) => void;
  // Trace Origin Request from Parent
  traceRequest: { sourceId: string; word: string } | null;
}

export const CollectorView: React.FC<CollectorViewProps> = ({ onCollectWord, traceRequest }) => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [printingResult, setPrintingResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  const constraintsRef = useRef(null);

  // React to trace requests from the Panel (via App)
  useEffect(() => {
    if (traceRequest) {
        setFocusedId(traceRequest.sourceId);
        setHighlightedWord(traceRequest.word);
    }
  }, [traceRequest]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelected = useCallback(async (file: File) => {
    if (!file) return;
    try {
      setState(AppState.ANALYZING);
      setError(null);
      setFocusedId(null);
      setHighlightedWord(null);
      
      const imageUrl = URL.createObjectURL(file);
      const now = new Date();
      const timestamp = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const id = `MEM-${Date.now()}`;

      const base64Data = await convertFileToBase64(file);
      const mimeType = file.type;

      const data = await analyzeImage(base64Data, mimeType);

      const randomX = (Math.random() * 200) - 100;
      const randomY = (Math.random() * 200) - 100;
      const randomRot = (Math.random() * 20) - 10;

      const newResult: AnalysisResult = {
        id,
        imageUrl,
        timestamp,
        data,
        x: randomX,
        y: randomY,
        rotation: randomRot
      };

      setPrintingResult(newResult);
      setState(AppState.PRINTING);

    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "The aesthetics engine encountered an error reading the signs.";
      setError(errorMessage);
      setState(AppState.ERROR);
    }
  }, []);

  const handlePrintComplete = () => {
    if (printingResult) {
      setHistory(prev => [...prev, printingResult]);
      setPrintingResult(null);
      setState(AppState.IDLE);
    }
  };

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (focusedId === id) setFocusedId(null);
  };

  const handleFocusItem = (id: string) => {
    setHistory(prev => {
        const item = prev.find(i => i.id === id);
        if (!item) return prev;
        const others = prev.filter(i => i.id !== id);
        return [...others, item]; 
    });
  };

  return (
    <>
        {/* The Wall (Canvas) */}
        <div ref={constraintsRef} className="absolute inset-0 z-0 flex items-center justify-center">
            <AnimatePresence>
                {history.map((result, index) => (
                    <ReceiptCard 
                        key={result.id} 
                        result={result} 
                        variant="thumbnail"
                        dragConstraints={constraintsRef}
                        zIndex={index}
                        onExpand={() => { setFocusedId(result.id); setHighlightedWord(null); }}
                        onClose={() => handleDelete(result.id)}
                        onFocus={() => handleFocusItem(result.id)}
                        className={`${focusedId === result.id ? 'opacity-0' : 'opacity-100'}`}
                    />
                ))}
            </AnimatePresence>
        </div>

        {/* The Machine */}
        <div className="absolute bottom-8 left-8 z-50">
           <Printer 
              onImageSelected={handleImageSelected} 
              isAnalyzing={state === AppState.ANALYZING}
              printingResult={printingResult}
              onPrintComplete={handlePrintComplete}
           />
           {state === AppState.ERROR && (
              <div className="absolute bottom-full mb-4 left-0 w-64 p-4 bg-red-50 text-red-800 text-[10px] font-mono rounded-lg shadow-xl border border-red-100">
                 <div className="font-bold mb-1">SYSTEM ALERT</div>
                 {error}
              </div>
           )}
        </div>

        {/* Focused Modal */}
        <AnimatePresence>
          {focusedId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#e0e5ec]/90 backdrop-blur-sm cursor-zoom-out overflow-y-auto"
              onClick={() => { setFocusedId(null); setHighlightedWord(null); }}
            >
              <div className="min-h-full flex items-center justify-center p-4 py-12">
                <div 
                  className="w-full max-w-md relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ReceiptCard 
                     result={history.find(h => h.id === focusedId)!} 
                     variant="full"
                     onClose={() => { setFocusedId(null); setHighlightedWord(null); }}
                     onCollectWord={onCollectWord}
                     highlightedWord={highlightedWord}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Footer */}
        {!focusedId && (
          <footer className="absolute bottom-8 right-8 text-right pointer-events-none z-40">
            <div className="inline-flex items-center gap-2 text-[10px] text-gray-400 font-mono uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity cursor-help pointer-events-auto bg-white/50 backdrop-blur px-4 py-2 rounded-full shadow-sm">
              <Info size={12} />
              <span>Drag to Arrange • Click text to Collect</span>
            </div>
          </footer>
        )}
    </>
  );
};
