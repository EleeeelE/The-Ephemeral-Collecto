
import React, { useState, useCallback, useRef } from 'react';
import { Printer } from './components/Printer';
import { ReceiptCard } from './components/ReceiptDisplay';
import { VocabularyPanel } from './components/VocabularyPanel';
import { Toast } from './components/Toast';
import { analyzeImage, analyzeWord } from './services/geminiService';
import { AppState, AnalysisResult, VocabularyItem } from './types';
import { Info } from 'lucide-react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';

export default function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [printingResult, setPrintingResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Interaction State
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null); // For Trace Origin
  
  // Vocabulary State
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isVocabPanelOpen, setIsVocabPanelOpen] = useState(false);
  const [vocabExpandedId, setVocabExpandedId] = useState<string | null>(null);
  
  const [toastWord, setToastWord] = useState<string | null>(null); // State for notification
  const [lastCollectedItemId, setLastCollectedItemId] = useState<string | null>(null); // Track ID for Toast action

  // Ref for the canvas container to constrain dragging
  const constraintsRef = useRef(null);

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
      setIsVocabPanelOpen(false); // Close panel if open
      setToastWord(null);
      
      const imageUrl = URL.createObjectURL(file);
      const now = new Date();
      const timestamp = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const id = `MEM-${Date.now()}`;

      const base64Data = await convertFileToBase64(file);
      const mimeType = file.type;

      const data = await analyzeImage(base64Data, mimeType);

      // Random starting position on the canvas (roughly middle-ish but scattered)
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

      // Set as printing result first (animation inside Printer)
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
      // Move from Printer to Wall History
      setHistory(prev => [...prev, printingResult]);
      setPrintingResult(null);
      setState(AppState.IDLE);
    }
  };

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (focusedId === id) setFocusedId(null);
  };

  // Bring clicked item to front by filtering and re-appending
  const handleFocusItem = (id: string) => {
    setHistory(prev => {
        const item = prev.find(i => i.id === id);
        if (!item) return prev;
        const others = prev.filter(i => i.id !== id);
        return [...others, item]; // Move to end of array (top z-index)
    });
  };

  // --- Vocabulary Logic ---

  // Triggered when a tile is expanded in the panel
  const handleVocabularyItemClick = async (item: VocabularyItem) => {
    // If analysis already exists, do nothing
    if (item.analysis) return;

    // Set loading state
    setVocabulary(prev => prev.map(v => v.id === item.id ? { ...v, isAnalyzing: true } : v));

    // Fetch analysis
    // We need the context from the original history item.
    const source = history.find(h => h.id === item.sourceId);
    const context = source ? source.data?.insight || source.data?.haiku.translation : "A fleeting moment.";
    
    try {
        const analysis = await analyzeWord(item.word, context || "Time and memory");
        setVocabulary(prev => prev.map(v => v.id === item.id ? { ...v, analysis, isAnalyzing: false } : v));
    } catch (e) {
        setVocabulary(prev => prev.map(v => v.id === item.id ? { ...v, isAnalyzing: false } : v));
    }
  };

  const handleCollectWord = (word: string, sourceId: string) => {
    // Check if word already exists for this specific source
    const existingItem = vocabulary.find(v => v.word.toLowerCase() === word.toLowerCase() && v.sourceId === sourceId);
    
    if (!existingItem) {
      const newItem: VocabularyItem = {
        id: `VOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        word,
        sourceId,
        timestamp: new Date().toLocaleDateString()
      };
      setVocabulary(prev => [newItem, ...prev]);
      
      setToastWord(word);
      setLastCollectedItemId(newItem.id);
    } else {
      setToastWord(`${word} (Exist)`);
      setLastCollectedItemId(existingItem.id);
    }
  };

  const handleRemoveVocabulary = (id: string) => {
    setVocabulary(prev => prev.filter(v => v.id !== id));
    if (vocabExpandedId === id) setVocabExpandedId(null);
  };

  const handleToastView = () => {
    setIsVocabPanelOpen(true);
    setFocusedId(null); // Close the big modal
    setHighlightedWord(null);

    if (lastCollectedItemId) {
        setVocabExpandedId(lastCollectedItemId);
        
        // We need to trigger analysis if it hasn't happened yet.
        const item = vocabulary.find(v => v.id === lastCollectedItemId);
        if (item) {
             handleVocabularyItemClick(item);
        }
    }
  };

  // Trace Origin: Close panel, Focus Receipt, Highlight Word
  const handleTraceOrigin = (item: VocabularyItem) => {
    const historyItem = history.find(h => h.id === item.sourceId);
    if (historyItem) {
        setIsVocabPanelOpen(false);
        setFocusedId(item.sourceId);
        setHighlightedWord(item.word);
    }
  };

  return (
    <LayoutGroup>
      <div className="fixed inset-0 bg-[#e0e5ec] text-[#2c2c2c] overflow-hidden font-sans selection:bg-gray-300 selection:text-black">
        
        {/* Background Texture for "Wall/Desk" feel */}
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{ 
            backgroundImage: `radial-gradient(#a3b1c6 1px, transparent 1px)`, 
            backgroundSize: '20px 20px' 
        }}></div>

        {/* Header - Fixed Top Left */}
        <header className="absolute top-8 left-8 z-10 pointer-events-none">
          <h1 className="text-3xl font-serif-jp font-bold tracking-tight text-gray-800">
            浮生拾遗
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1 tracking-widest uppercase">
            The Ephemeral Collector
          </p>
        </header>

        {/* Vocabulary Panel (Right Side) */}
        <VocabularyPanel 
          isOpen={isVocabPanelOpen}
          onToggle={() => setIsVocabPanelOpen(!isVocabPanelOpen)}
          items={vocabulary}
          onItemClick={handleVocabularyItemClick}
          onRemoveItem={handleRemoveVocabulary}
          onTraceOrigin={handleTraceOrigin}
          expandedId={vocabExpandedId}
          onExpand={setVocabExpandedId}
        />

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

        {/* The Machine - Fixed Bottom Left */}
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

        {/* Focused Overlay (Modal) */}
        <AnimatePresence>
          {focusedId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              // Improved Modal Container:
              // 1. z-index 100 (Toast is 110)
              // 2. overflow-y-auto enables scrolling for tall content
              // 3. fixed inset-0 covers the whole screen
              className="fixed inset-0 z-[100] bg-[#e0e5ec]/90 backdrop-blur-sm cursor-zoom-out overflow-y-auto"
              onClick={() => { setFocusedId(null); setHighlightedWord(null); }}
            >
              {/* 
                Centering Wrapper:
                min-h-full ensures it takes at least full height to allow vertical centering (items-center).
                py-12 adds breathing room at top/bottom.
              */}
              <div className="min-h-full flex items-center justify-center p-4 py-12">
                <div 
                  className="w-full max-w-md relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ReceiptCard 
                     result={history.find(h => h.id === focusedId)!} 
                     variant="full"
                     onClose={() => { setFocusedId(null); setHighlightedWord(null); }}
                     onCollectWord={handleCollectWord}
                     highlightedWord={highlightedWord}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        {!focusedId && (
          <footer className="absolute bottom-8 right-8 text-right pointer-events-none z-40">
            <div className="inline-flex items-center gap-2 text-[10px] text-gray-400 font-mono uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity cursor-help pointer-events-auto bg-white/50 backdrop-blur px-4 py-2 rounded-full shadow-sm">
              <Info size={12} />
              <span>Drag to Arrange • Click text to Collect</span>
            </div>
          </footer>
        )}

        {/* Notification Toast - Moved to bottom to ensure high z-index stacking */}
        <Toast 
          word={toastWord}
          onClose={() => setToastWord(null)}
          onViewPanel={handleToastView}
        />
      </div>
    </LayoutGroup>
  );
}
