/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Clipboard, 
  Check, 
  Copy, 
  Search, 
  X, 
  Trash2, 
  FileText,
  AlertCircle,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScriptItem, ScriptSummary, DialogueLine, SectionHeader } from './types.ts';

export default function App() {
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState<Record<number, boolean>>({});

  const parseScript = useCallback(() => {
    if (!rawText.trim()) return;

    const lines = rawText.split('\n');
    const parsedItems: ScriptItem[] = [];
    let currentDialogue: DialogueLine | null = null;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Detect Section Header: SECTION [number] — [TITLE]
      const sectionMatch = trimmed.match(/^SECTION\s+(\d+)\s+[—–-]\s+(.*)$/i);
      if (sectionMatch) {
        // If we were collecting dialogue, push it
        if (currentDialogue) {
          parsedItems.push(currentDialogue);
          currentDialogue = null;
        }
        parsedItems.push({
          type: 'section',
          number: parseInt(sectionMatch[1], 10),
          title: sectionMatch[2].toUpperCase(),
          originalIndex: index
        });
        return;
      }

      // Detect Speaker Line: Speaker 1: or Speaker 2:
      const speakerMatch = trimmed.match(/^Speaker\s+(1|2):\s*(.*)$/i);
      if (speakerMatch) {
        if (currentDialogue) {
          parsedItems.push(currentDialogue);
        }
        currentDialogue = {
          type: 'dialogue',
          speaker: parseInt(speakerMatch[1], 10) as 1 | 2,
          text: speakerMatch[2],
          originalIndex: index
        };
        return;
      }

      // If it's not a header or a new speaker label, it might be multi-line text
      if (currentDialogue) {
        currentDialogue.text += ' ' + trimmed;
      }
    });

    // Push the last collected dialogue if any
    if (currentDialogue) {
      parsedItems.push(currentDialogue);
    }

    setItems(parsedItems);
  }, [rawText]);

  const clearAll = () => {
    setRawText('');
    setItems([]);
    setSearchQuery('');
    setCopyStatus({});
  };

  const handleCopy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(prev => ({ ...prev, [id]: true }));
      // Removed timeout to make status persistent
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const copyAllBySpeaker = async (speaker: 1 | 2) => {
    const text = items
      .filter((item): item is DialogueLine => item.type === 'dialogue' && item.speaker === speaker)
      .map(item => item.text)
      .join('\n');
    
    if (text) {
      await navigator.clipboard.writeText(text);
      // Visual feedback could be added here if needed, but the button itself could show state
    }
  };

  const summary = useMemo<ScriptSummary>(() => {
    return items.reduce((acc, item) => {
      if (item.type === 'section') acc.sections++;
      else if (item.speaker === 1) acc.speaker1Lines++;
      else acc.speaker2Lines++;
      return acc;
    }, { speaker1Lines: 0, speaker2Lines: 0, sections: 0 });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter(item => {
      if (item.type === 'section') {
        return item.title.toLowerCase().includes(lowerQuery);
      }
      return item.text.toLowerCase().includes(lowerQuery);
    });
  }, [items, searchQuery]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</span> 
        : part
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Script Formatter Pro</h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Transform raw script text into polished, readable dialogue cards.
          </p>
        </header>

        {/* Input Section */}
        <section className="space-y-4 mb-12">
          <div className="relative group">
            <textarea
              id="script-input"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your script here... (e.g., Speaker 1: Hello! \n Speaker 2: Hi there!)"
              className="w-full h-64 bg-[#161b22] border-2 border-[#30363d] rounded-xl p-6 focus:outline-none focus:border-blue-500 transition-all text-slate-200 placeholder:text-slate-600 resize-none font-mono text-sm leading-relaxed"
            />
            {rawText && (
              <button 
                onClick={() => setRawText('')}
                className="absolute top-4 right-4 p-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Clear Input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              id="format-btn"
              onClick={parseScript}
              disabled={!rawText.trim()}
              className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
            >
              Format Script
            </button>
            <button
              id="clear-all-btn"
              onClick={clearAll}
              className="px-6 py-3 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-semibold rounded-xl transition-all flex items-center gap-2 border border-[#30363d]"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </section>

        {/* Output Section */}
        <AnimatePresence mode="wait">
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <hr className="border-[#30363d]" />

              {/* Toolbar & Summary */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Speaker 1: {summary.speaker1Lines}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Speaker 2: {summary.speaker2Lines}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/10 text-slate-400 rounded-full border border-slate-500/20">
                    <Hash className="w-3.5 h-3.5" />
                    {summary.sections} Sections
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search lines..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all w-full md:w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Bulk Copy Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => copyAllBySpeaker(1)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg text-xs font-bold uppercase tracking-wider text-blue-400 transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All Speaker 1
                </button>
                <button
                  onClick={() => copyAllBySpeaker(2)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg text-xs font-bold uppercase tracking-wider text-purple-400 transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All Speaker 2
                </button>
              </div>

              {/* Script List */}
              <div className="space-y-4">
                {filteredItems.map((item, idx) => {
                  if (item.type === 'section') {
                    const isCopying = copyStatus[item.originalIndex];

                    return (
                      <motion.div 
                        key={`section-${idx}`} 
                        layout
                        onClick={() => handleCopy(`SECTION ${item.number} — ${item.title}`, item.originalIndex)}
                        className={`pt-8 pb-4 px-4 -mx-4 rounded-xl cursor-pointer transition-all relative ${
                          isCopying ? 'bg-emerald-500/5' : 'hover:bg-[#1c2128]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <h3 className={`flex-shrink-0 text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                            isCopying ? 'text-emerald-400' : 'text-slate-500'
                          }`}>
                            SECTION {item.number}
                          </h3>
                          <div className={`h-px w-full transition-colors ${
                            isCopying ? 'bg-emerald-500/20' : 'bg-[#30363d]'
                          }`} />
                          {isCopying && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider"
                            >
                              <Check className="w-3 h-3" />
                              Copied
                            </motion.span>
                          )}
                        </div>
                        <h2 className={`text-xl font-bold mt-2 mb-4 uppercase tracking-tight transition-colors ${
                          isCopying ? 'text-emerald-50' : 'text-white'
                        }`}>
                          {item.title}
                        </h2>
                      </motion.div>
                    );
                  }

                  const isSpeaker1 = item.speaker === 1;
                  const isCopying = copyStatus[item.originalIndex];

                  return (
                    <motion.div
                      key={`line-${idx}`}
                      layout
                      onClick={() => handleCopy(item.text, item.originalIndex)}
                      whileTap={{ scale: 0.995 }}
                      className={`group relative flex gap-4 p-5 rounded-xl border border-transparent transition-all cursor-pointer ${
                        isCopying 
                        ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500 shadow-inner' 
                        : isSpeaker1 
                          ? 'border-l-4 border-l-blue-500/50 hover:bg-[#1c2128]' 
                          : 'border-l-4 border-l-purple-500/50 hover:bg-[#1c2128]'
                      }`}
                    >
                      {/* Speaker Badge */}
                      <div className="flex-shrink-0 pt-0.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isCopying
                          ? 'bg-emerald-500 text-white'
                          : isSpeaker1 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-purple-600 text-white'
                        }`}>
                          {isCopying ? <Check className="w-3 h-3 mr-1" /> : null}
                          SPKR {item.speaker}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-grow pt-0.5 min-w-0">
                        <p className={`leading-relaxed text-[15px] font-medium break-words transition-colors ${
                          isCopying ? 'text-emerald-50' : 'text-slate-300'
                        }`}>
                          {highlightText(item.text, searchQuery)}
                        </p>
                      </div>

                      {/* Line Copy Button */}
                      <div className={`flex-shrink-0 transition-opacity ${isCopying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(item.text, item.originalIndex);
                          }}
                          className={`p-2.5 rounded-lg transition-all ${
                            isCopying 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-[#21262d] text-slate-400 hover:text-white hover:bg-[#30363d]'
                          }`}
                          title="Copy Line"
                        >
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={isCopying ? 'check' : 'clip'}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 1.5, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {isCopying ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                            </motion.div>
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-[#30363d] rounded-2xl">
                  <div className="inline-flex p-4 bg-[#161b22] rounded-full mb-4">
                    <AlertCircle className="w-6 h-6 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-400">No results found</h3>
                  <p className="text-slate-600">Try adjusting your search query.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-[#30363d] text-center text-slate-600 text-sm">
          <p>© 2026 Script Formatter Pro · Designed for Performance</p>
        </footer>
      </div>
    </div>
  );
}
