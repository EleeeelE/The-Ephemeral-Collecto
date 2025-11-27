
import React, { useState } from 'react';
import { VocabularyPanel } from './components/VocabularyPanel';
import { Toast } from './components/Toast';
import { analyzeWord } from './services/geminiService';
import { VocabularyItem, AppMode } from './types';
import { LayoutGroup } from 'framer-motion';
import { ModeSwitcher } from './components/ModeSwitcher';
import { CollectorView } from './components/CollectorView';
import { CollageWorkbench } from './components/CollageWorkbench';

export default function App() {
  // App Mode State
  const [mode, setMode] = useState<AppMode>(AppMode.COLLECTOR);

  // Vocabulary State (Global)
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isVocabPanelOpen, setIsVocabPanelOpen] = useState(false);
  const [vocabExpandedId, setVocabExpandedId] = useState<string | null>(null);
  
  const [toastWord, setToastWord] = useState<string | null>(null); 
  const [lastCollectedItemId, setLastCollectedItemId] = useState<string | null>(null);

  // Trace Origin Request (Passed to Views)
  const [traceRequest, setTraceRequest] = useState<{ sourceId: string; word: string } | null>(null);

  // --- Vocabulary Logic ---

  const handleVocabularyItemClick = async (item: VocabularyItem) => {
    if (item.analysis) return;

    setVocabulary(prev => prev.map(v => v.id === item.id ? { ...v, isAnalyzing: true } : v));

    // For context, we only have simple text if it came from Collage, or complex if from Receipt.
    // Ideally, we'd look up the source history again, but for now we use the contextSnippet or generic.
    const context = "Time and memory"; // Simplified for now as we don't hold full history in App anymore
    
    try {
        const analysis = await analyzeWord(item.word, context);
        setVocabulary(prev => prev.map(v => v.id === item.id ? { ...v, analysis, isAnalyzing: false } : v));
    } catch (e) {
        setVocabulary(prev => prev.map(v => v.id === item.id ? { ...v, isAnalyzing: false } : v));
    }
  };

  const handleCollectWord = (word: string, sourceId: string) => {
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
    // If the view was in POET mode, we might want to stay there or switch? 
    // The panel overlays everything, so mode doesn't matter much yet.

    if (lastCollectedItemId) {
        setVocabExpandedId(lastCollectedItemId);
        const item = vocabulary.find(v => v.id === lastCollectedItemId);
        if (item) {
             handleVocabularyItemClick(item);
        }
    }
  };

  const handleTraceOrigin = (item: VocabularyItem) => {
    // If it's a Collage item, we can't really trace it back to a receipt
    if (item.sourceId.startsWith('COLLAGE')) {
        // Maybe switch to poet mode? For now, do nothing or show toast
        setMode(AppMode.POET);
        setIsVocabPanelOpen(false);
    } else {
        // It's a receipt item
        setMode(AppMode.COLLECTOR);
        setIsVocabPanelOpen(false);
        // Signal the CollectorView to focus
        setTraceRequest({ sourceId: item.sourceId, word: item.word });
        // Clear request after a bit so it doesn't get stuck? 
        // Actually CollectorView uses useEffect dependency, so changing the object ref works.
    }
  };

  return (
    <LayoutGroup>
      <div className="fixed inset-0 bg-[#e0e5ec] text-[#2c2c2c] overflow-hidden font-sans selection:bg-gray-300 selection:text-black">
        
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{ 
            backgroundImage: `radial-gradient(#a3b1c6 1px, transparent 1px)`, 
            backgroundSize: '20px 20px' 
        }}></div>

        {/* Global Header */}
        <header className="absolute top-8 left-8 z-10 pointer-events-none">
          <h1 className="text-3xl font-serif-jp font-bold tracking-tight text-gray-800">
            浮生拾遗
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1 tracking-widest uppercase">
            The Ephemeral Collector
          </p>
        </header>

        {/* Mode Switcher */}
        <ModeSwitcher currentMode={mode} onSwitch={setMode} />

        {/* Vocabulary Panel (Global) */}
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

        {/* Main Content Area */}
        {mode === AppMode.COLLECTOR ? (
            <CollectorView 
                onCollectWord={handleCollectWord} 
                traceRequest={traceRequest}
            />
        ) : (
            <CollageWorkbench 
                onCollectWord={handleCollectWord}
            />
        )}

        {/* Notification Toast */}
        <Toast 
          word={toastWord}
          onClose={() => setToastWord(null)}
          onViewPanel={handleToastView}
        />
      </div>
    </LayoutGroup>
  );
}
