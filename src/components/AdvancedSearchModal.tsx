import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Sparkles, X, Clock, TrendingUp, ShoppingBag, 
  ArrowRight, Tag, Zap, Check
} from 'lucide-react';
import { Product } from '../types';
import { 
  ProductSearchEngine, 
  POPULAR_SEARCH_KEYWORDS, 
  SKIN_CONCERN_TABS 
} from '../lib/searchIndex';
import { FantineProductItem } from './FantineStorePage';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: FantineProductItem) => void;
  onAddToCart: (product: Product) => void;
  formatPrice: (price: number) => string;
  initialQuery?: string;
}

const RECENT_SEARCHES_KEY = 'fantine_recent_searches';

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onAddToCart,
  formatPrice,
  initialQuery = ''
}: AdvancedSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedConcern, setSelectedConcern] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Search Engine
  const searchEngine = useMemo(() => new ProductSearchEngine(products), [products]);

  // Execute Search
  const searchOutput = useMemo(() => {
    return searchEngine.search(searchTerm, selectedConcern);
  }, [searchEngine, searchTerm, selectedConcern]);

  // Load Recent Searches from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 6));
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync initial query & autofocus on open
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialQuery);
      setSelectedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Save Recent Search
  const saveSearchTerm = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    try {
      const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const totalResults = searchOutput.results.length;
      if (totalResults === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalResults - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalResults - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < totalResults) {
        e.preventDefault();
        const selected = searchOutput.results[selectedIndex].product;
        saveSearchTerm(searchTerm || selected.title);
        onSelectProduct(selected as FantineProductItem);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchOutput.results, selectedIndex, searchTerm, onClose, onSelectProduct]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-10 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Command Modal Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp">
        
        {/* Top Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
          <div className="p-2.5 bg-slate-900 text-teal-400 rounded-xl shrink-0 shadow-xs">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input 
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(-1);
              }}
              placeholder="Centella, Ginseng, Niacinamide, or find with skin problems..."
              className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none pr-10"
            />
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="delete"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors shrink-0 text-xs font-bold flex items-center gap-1 border border-slate-200 bg-white shadow-2xs cursor-pointer"
          >
            <span>ESC</span>
          </button>
        </div>

        {/* Skin Concern Filter Pills Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            feeAlter:
          </span>
          {SKIN_CONCERN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedConcern(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedConcern === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 divide-y divide-slate-100"
        >
          {/* Matched Hanbang Science Botanical Card */}
          {searchOutput.matchingIngredient && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/80 rounded-2xl shadow-2xs animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                      🌿 Clinical Hanbang material: {searchOutput.matchingIngredient.name}
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                      {searchOutput.matchingIngredient.koreanName}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-200/60 text-emerald-900 text-[10px] font-bold rounded-full">
                  SayenTfeeAcTB
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 mt-2 leading-relaxed">
                {searchOutput.matchingIngredient.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {searchOutput.matchingIngredient.benefits.map((b, i) => (
                  <span key={i} className="px-2.5 py-0.5 bg-white/90 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md shadow-2xs">
                    ✓ {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* If No Query Typed: Show Recent & Popular Searches */}
          {!searchTerm.trim() && (
            <div className="space-y-5 pt-1">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Recent Searches (Recent Searches)
                    </span>
                    <button 
                      onClick={clearAllRecent}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      all delete
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((s, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSearchTerm(s);
                          inputRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-colors group"
                      >
                        <span>{s}</span>
                        <button 
                          onClick={(e) => removeRecentSearch(s, e)}
                          className="text-slate-400 hover:text-rose-600 rounded-full p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular / Trending Searches */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  popular search (Popular Skincare Formulas)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POPULAR_SEARCH_KEYWORDS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchTerm(item.term);
                        saveSearchTerm(item.term);
                        inputRef.current?.focus();
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 text-slate-800 hover:text-teal-950 text-left rounded-xl transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="text-xs font-bold truncate group-hover:translate-x-0.5 transition-transform">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Results List */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                product result ({searchOutput.results.length})
              </span>
              <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                {searchOutput.queryTimeMs}ms (L1 RAM index)
              </span>
            </div>

            {searchOutput.results.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  "{searchTerm}" No p for thisRoDuct not found
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Verify that the spelling is correct or 'Whitening', 'Centella', 'Toner', 'Serum' Search by writing।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchOutput.results.map((res, index) => {
                  const isSelected = selectedIndex === index;
                  const prod = res.product as FantineProductItem;
                  const isAdded = addedToastId === prod.id;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        saveSearchTerm(searchTerm || prod.title);
                        onSelectProduct(prod);
                        onClose();
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 group relative ${
                        isSelected 
                          ? 'bg-teal-50/50 border-teal-500 shadow-md ring-2 ring-teal-500/20' 
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                        <img 
                          src={prod.coverImage} 
                          alt={prod.title} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 truncate">
                              {prod.series || prod.category}
                            </span>
                            {res.matchedField === 'ingredient' && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded truncate">
                                material: {res.matchedTerm}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1 mt-1">
                            {prod.title}
                          </h4>
                        </div>

                        {/* Price & Add to Bag */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                              {formatPrice(prod.price)}
                            </span>
                            {prod.regularPrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatPrice(prod.regularPrice)}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(prod);
                              setAddedToastId(prod.id);
                              setTimeout(() => setAddedToastId(null), 1500);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                              isAdded 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-slate-900 hover:bg-teal-600 text-white shadow-2xs'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>has been added</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3 h-3" />
                                <span>Add +</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Key Hints */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd>
              Navigation
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵ Enter</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Esc</kbd>
              turn off
            </span>
          </div>

          <div className="text-right w-full sm:w-auto font-medium text-slate-600 flex items-center justify-end gap-1">
            <span>Clinical Hanbang Skincare</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

      </div>
    </div>
  );
}
