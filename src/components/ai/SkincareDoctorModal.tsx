import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Mic, Sparkles, ShoppingBag,
  Sun, Moon, Lightbulb, Copy, CheckCheck,
  ArrowRight, Droplets, ShieldCheck, Sparkle, Clock
} from 'lucide-react';
import { Product } from '../../types';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
  isVoiceInput?: boolean;
}

interface SkincareDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  cartProducts?: Product[];
  activeProduct?: Product | null;
  onSelectProduct?: (product: Product) => void;
  initialSelectedProductIds?: string[];
  initialUserPrompt?: string;
}

// Inline text formatter for **bold** and `code`
const formatInlineText = (text: string, isLightBg = true): React.ReactNode => {
  if (!text) return text;

  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong 
          key={idx} 
          className={`font-bold ${isLightBg ? 'text-slate-900 bg-amber-100/60 px-1 py-0.5 rounded' : 'text-white'}`}
        >
          {boldText}
        </strong>
      );
    }
    return part;
  });
};

// Advanced Visual Routine Flowchart Component
const RoutineFlowchartCard: React.FC<{ 
  type: 'morning' | 'night'; 
  title: string; 
  stepLines: string[];
}> = ({ type, title, stepLines }) => {
  const isMorning = type === 'morning';

  // Parse step title and details
  const parsedSteps = stepLines.map((line, idx) => {
    const clean = line.replace(/^[-*•\d+.]\s*/, '').trim();
    const match = clean.match(/^(\*\*?Step\s*\d+[^:*]*:?\*\*?|Step\s*\d+[^:]*:?)(.*)/i);
    
    let stepNumber = `Step ${idx + 1}`;
    let stepTitle = `Step ${idx + 1}`;
    let stepDetail = clean;

    if (match) {
      stepTitle = match[1].replace(/[*:]/g, '').trim();
      stepDetail = match[2].replace(/^[:\-]\s*/, '').trim();
    } else if (clean.includes(':')) {
      const [head, ...rest] = clean.split(':');
      stepTitle = head.replace(/[*_]/g, '').trim();
      stepDetail = rest.join(':').trim();
    }

    return {
      number: idx + 1,
      title: stepTitle,
      detail: stepDetail
    };
  });

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 shadow-xs transition-all duration-300 ${
      isMorning 
        ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white border-amber-200/90' 
        : 'bg-gradient-to-br from-indigo-50/90 via-purple-50/30 to-white border-indigo-200/90'
    }`}>
      {/* Flowchart Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shadow-xs text-white ${
            isMorning ? 'bg-gradient-to-tr from-amber-500 to-orange-400' : 'bg-gradient-to-tr from-indigo-600 to-purple-500'
          }`}>
            {isMorning ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          <div>
            <h5 className={`font-black text-xs sm:text-sm uppercase tracking-wide ${
              isMorning ? 'text-amber-950' : 'text-indigo-950'
            }`}>
              {title.replace(/[#*`_~☀️🌙]/g, '').trim()}
            </h5>
            <span className="text-[10px] text-slate-500 font-medium">Clinical application flowchart</span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
          isMorning ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
        }`}>
          {isMorning ? 'AM ROUTINE' : 'PM ROUTINE'}
        </span>
      </div>

      {/* Horizontal Connected Timeline Nodes (Visual Flowchart) */}
      <div className="hidden sm:flex items-center justify-between gap-1 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {parsedSteps.map((step, idx) => {
          const isLast = idx === parsedSteps.length - 1;
          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center shrink-0 min-w-[70px] max-w-[95px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs border-2 transition-transform hover:scale-110 ${
                  isMorning 
                    ? 'bg-amber-100 border-amber-400 text-amber-950' 
                    : 'bg-indigo-100 border-indigo-400 text-indigo-950'
                }`}>
                  0{step.number}
                </div>
                <span className="text-[11px] font-bold text-slate-800 line-clamp-1 mt-1.5">
                  {step.title.replace(/^Step\s*\d+\s*\(?/i, '').replace(/\)?$/g, '') || `Step ${step.number}`}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 flex items-center justify-center px-1">
                  <div className={`h-0.5 w-full ${isMorning ? 'bg-amber-300' : 'bg-indigo-300'}`}></div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isMorning ? 'text-amber-500' : 'text-indigo-500'} -ml-1`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Detailed Flowchart Step Cards */}
      <div className="space-y-2.5">
        {parsedSteps.map((step, idx) => (
          <div 
            key={idx} 
            className="flex items-start gap-3 p-3 rounded-2xl bg-white/95 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors"
          >
            {/* Step Number Badge */}
            <div className={`w-6 h-6 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5 ${
              isMorning ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
            }`}>
              {step.number}
            </div>

            {/* Step Title & Detailed Instruction */}
            <div className="flex-1 text-xs leading-relaxed">
              <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                <span>{step.title}</span>
              </div>
              <p className="text-slate-600 font-light">
                {formatInlineText(step.detail, true)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Rich Markdown Content Renderer
const FormattedMessageRenderer: React.FC<{ text: string; isAssistant: boolean }> = ({ text, isAssistant }) => {
  if (!isAssistant) {
    return <p className="whitespace-pre-wrap text-white leading-relaxed">{formatInlineText(text, false)}</p>;
  }

  const sections = text.split('\n\n');

  return (
    <div className="space-y-4 text-slate-800 text-xs sm:text-sm leading-relaxed">
      {sections.map((section, sIdx) => {
        const trimmed = section.trim();

        // 1. Table Detection
        if (trimmed.includes('|') && trimmed.includes('---')) {
          const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
          return (
            <div key={sIdx} className="overflow-x-auto my-2 rounded-2xl border border-rose-200/80 shadow-2xs bg-white">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <tbody>
                  {lines.filter(l => !l.includes('---')).map((line, rIdx) => {
                    const cells = line.split('|').filter(c => c.trim().length > 0);
                    const isHeader = rIdx === 0;
                    return (
                      <tr 
                        key={rIdx} 
                        className={isHeader ? 'bg-gradient-to-r from-rose-100/90 to-amber-50 font-bold border-b border-rose-200 text-rose-950' : 'border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors'}
                      >
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2">
                            {formatInlineText(cell.trim(), true)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        // 2. Morning Routine Flowchart Card (☀️ Morning / Morning RsTNo)
        if (trimmed.includes('☀️') || trimmed.toLowerCase().includes('morning recipe') || trimmed.toLowerCase().includes('Morning')) {
          const lines = trimmed.split('\n');
          const titleLine = lines[0];
          const stepLines = lines.slice(1).filter(l => l.trim().length > 0 && !l.includes('---'));

          return (
            <RoutineFlowchartCard
              key={sIdx}
              type="morning"
              title={titleLine}
              stepLines={stepLines}
            />
          );
        }

        // 3. Night Routine Flowchart Card (🌙 Night / Night RsTNo)
        if (trimmed.includes('🌙') || trimmed.toLowerCase().includes('night recipe') || trimmed.toLowerCase().includes('Night')) {
          const lines = trimmed.split('\n');
          const titleLine = lines[0];
          const stepLines = lines.slice(1).filter(l => l.trim().length > 0 && !l.includes('---'));

          return (
            <RoutineFlowchartCard
              key={sIdx}
              type="night"
              title={titleLine}
              stepLines={stepLines}
            />
          );
        }

        // 4. Tips / Safety Alert Card (💡 Tips, ⚠️ Warnings)
        if (trimmed.includes('💡') || trimmed.includes('⚠️') || trimmed.toLowerCase().includes('tips') || trimmed.toLowerCase().includes('Warning')) {
          return (
            <div key={sIdx} className="rounded-2xl bg-gradient-to-r from-rose-50/90 to-amber-50/80 border border-rose-200/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Chef's Rule:</span>
              </div>
              <div className="text-xs text-slate-700 space-y-1.5 pl-1">
                {trimmed.split('\n').filter(l => !l.includes('---')).map((line, lIdx) => (
                  <p key={lIdx} className="leading-relaxed">
                    {formatInlineText(line.replace(/^[💡⚠️#*`_~]+\s*/, ''), true)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        // 5. Divider (---)
        if (trimmed === '---') {
          return <hr key={sIdx} className="border-t border-slate-200/80 my-2" />;
        }

        // 6. Section Heading (### Heading)
        if (trimmed.startsWith('#')) {
          const cleanHeading = trimmed.replace(/^#+\s*/, '');
          return (
            <div key={sIdx} className="flex items-center gap-2 pt-1">
              <div className="w-1.5 h-4 bg-rose-600 rounded-full"></div>
              <h5 className="font-bold text-rose-950 text-xs sm:text-sm">
                {formatInlineText(cleanHeading, true)}
              </h5>
            </div>
          );
        }

        // 7. Standard Paragraph / Bullet List
        const lines = trimmed.split('\n');
        return (
          <div key={sIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim());
              if (isBullet) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 text-xs sm:text-sm text-slate-700">
                    <span className="text-rose-500 font-bold shrink-0">•</span>
                    <div className="flex-1">
                      {formatInlineText(line.replace(/^[-*•\d+.]\s*/, ''), true)}
                    </div>
                  </div>
                );
              }
              return (
                <p key={lIdx} className="break-words">
                  {formatInlineText(line, true)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const SkincareDoctorModal: React.FC<SkincareDoctorModalProps> = ({
  isOpen,
  onClose,
  products = [],
  cartProducts = [],
  activeProduct = null,
  initialSelectedProductIds = [],
  initialUserPrompt
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const lastProcessedKeyRef = useRef<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Identify focused product from activeProduct prop or initialSelectedProductIds
  const focusedProduct = activeProduct || (
    initialSelectedProductIds && initialSelectedProductIds.length > 0 
      ? products.find(p => initialSelectedProductIds.includes(p.id)) 
      : null
  );

  // Initialize or update chat messages based on focused product or cart content
  useEffect(() => {
    if (!isOpen) return;

    const focusedId = focusedProduct?.id || '';
    const cartKey = cartProducts.map(p => p.id || p.title).sort().join(',');
    const currentKey = `${focusedId}_${cartKey}_${initialUserPrompt || ''}`;

    if (messages.length === 0 || lastProcessedKeyRef.current !== currentKey) {
      lastProcessedKeyRef.current = currentKey;

      if (initialUserPrompt) {
        setMessages([]);
        handleSendMessage(initialUserPrompt);
      } else if (focusedProduct) {
        const productGreetingText = `👋 **Hello! I am the Fantine AI Skincare Doctor.**

I see you are viewing **"${focusedProduct.title}"**.

🧪 **Formula and Description:**
${focusedProduct.benefitsHighlights || focusedProduct.description || 'Premium formulation rich in Korean clinical skincare active ingredients.'}

🥣 **Correct Usage and Routine (How to Use):**
${focusedProduct.howToUseIt ? `- **How to apply:** ${focusedProduct.howToUseIt}` : '- After cleansing and toning, gently dab 2-3 drops all over face and neck.'}
- **Morning Care (AM):** Cleanser ➔ Toner ➔ **${focusedProduct.title}** ➔ Moisturizer ➔ Sunscreen (SPF 50+)
- **Night Care (PM):** Double cleansing ➔ Toner ➔ **${focusedProduct.title}** ➔ Skin barrier cream

💡 This is a suggested routine. If you have any questions about your skin type or usage rules, please write or speak into the mic!`;

        setMessages([
          {
            id: `prod_recipe_${focusedProduct.id}_${Date.now()}`,
            role: 'assistant',
            text: productGreetingText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else if (cartProducts && cartProducts.length > 0) {
        const productTitles = cartProducts.map((p, i) => `${i + 1}. **${p.title}** (${p.category || 'Skincare'})`).join('\n');
        
        const vitCOrBrightening = cartProducts.find(p => 
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('vitamin c') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('brighten') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('antioxidant')
        );

        const spotOrNiacinamide = cartProducts.find(p => 
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('niacinamide') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('spot') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('acne') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('repair')
        );

        const hydratingOrCream = cartProducts.find(p => 
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('cream') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('hydrat') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('calm') ||
          (p.title + ' ' + (p.description || '')).toLowerCase().includes('barrier')
        );

        const cartRecipeText = `👋 **Hello! I noticed you have ${cartProducts.length} product(s) in your bag:**
${productTitles}

🥣 **Your Step-by-step Routine Flowchart:**

☀️ **1. Morning Routine (AM):**
- **Step 1 (Cleanse):** Cleanse face with mild cleanser or lukewarm water.
- **Step 2 (Tone):** Moisturize the skin with a balancing toner.
- **Step 3 (Active Step):** ${vitCOrBrightening ? `**${vitCOrBrightening.title}** - Dab 3-4 drops on the face to protect from free radicals and sun damage.` : (cartProducts[0] ? `**${cartProducts[0].title}** - Apply gently on face.` : 'Apply hydrating serum.')}
- **Step 4 (Moisture Lock):** ${hydratingOrCream ? `**${hydratingOrCream.title}** - Lock in moisture with this cream.` : 'Apply a light moisturizer.'}
- **Step 5 (Must):** During the day, always use **SPF 50 Sunscreen**.

🌙 **2. Night Deep Repair Routine (PM):**
- **Step 1 (Deep Clean):** Remove all day's dust and sunscreen with double cleansing.
- **Step 2 (Tone):** Apply a soothing toner.
- **Step 3 (Targeted Treatment):** ${spotOrNiacinamide ? `**${spotOrNiacinamide.title}** - Apply evenly on face and wait 1-2 minutes for it to absorb deep into the skin.` : (cartProducts[1] ? `**${cartProducts[1].title}** - Apply evenly.` : 'Use treatment serum.')}
- **Step 4 (Repair & Seal):** Seal the skin barrier with a moisturizing cream.

💡 **Skincare Rules:**
- Do not rub the skin while using the serum, tap gently with fingertips.
- If using multiple serums, apply from **thinnest (Watery) to thickest**.`;

        setMessages([
          {
            id: `cart_recipe_${Date.now()}`,
            role: 'assistant',
            text: cartRecipeText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages([
          {
            id: 'clean_welcome',
            role: 'assistant',
            text: `👋 **Hello! I am the Fantine AI Skincare Doctor.**

I can help you build the right Korean skincare routine and select personalized products for your skin type. 

✨ Write or speak into the mic to ask any questions about products or skin concerns!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }
  }, [isOpen, focusedProduct, cartProducts, initialUserPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputMessage(transcript);
            setIsListening(false);
            handleSendMessage(transcript, true);
          }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Your browser does not support speech recognition. Please send the text.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (customText?: string, isVoice = false) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoiceInput: isVoice
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const allContextProducts: Product[] = [];
      if (focusedProduct) {
        allContextProducts.push(focusedProduct);
      }
      if (cartProducts && cartProducts.length > 0) {
        cartProducts.forEach(cp => {
          if (!allContextProducts.some(p => p.id === cp.id)) {
            allContextProducts.push(cp);
          }
        });
      }

      const selectedProductsContext = allContextProducts.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category || 'Skincare',
        price: p.price || p.regularPrice,
        description: p.description || '',
        ingredients: p.ingredients || p.author || '',
        benefitsHighlights: p.benefitsHighlights || (Array.isArray(p.tags) ? p.tags.join(', ') : '') || '',
        howToUseIt: p.howToUseIt || ''
      }));

      const response = await fetch('/api/ai/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.text
          })),
          selectedProducts: selectedProductsContext,
          language: 'bn'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const botReply = data.reply || 'Sorry, no answer found. Try again.';

      const assistantMsg: Message = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: `bot_err_${Date.now()}`,
        role: 'assistant',
        text: `⚠️ There was a temporary connection problem। What questions do you have?T do it again?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col h-[100dvh] sm:h-[86vh] max-h-[880px] overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Clean Luxury Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-rose-100 to-white flex items-center justify-center text-rose-700 shadow-inner overflow-hidden border border-white/30">
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80"
                  alt="Doctor Avatar"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Fantine Skincare Specialist
                </h3>
                {cartProducts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <ShoppingBag className="w-2.5 h-2.5" /> {cartProducts.length}T in the bag
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-rose-200/80 font-medium">
                Live Skin & Routine Consultation
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              title="turn off"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unified Full-Height Chat & Flowchart Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[95%] sm:max-w-[90%] rounded-2xl px-4 sm:px-5 py-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                      isAssistant
                        ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                        : 'bg-slate-900 text-white rounded-tr-xs'
                    }`}
                  >
                    {/* Rich Formatted Markdown with Flowchart Nodes */}
                    <FormattedMessageRenderer text={msg.text} isAssistant={isAssistant} />

                    {/* Footer Actions / Timestamp */}
                    <div
                      className={`text-[10px] mt-3 pt-2 border-t flex items-center justify-between gap-1 ${
                        isAssistant ? 'text-slate-400 border-slate-100' : 'text-slate-400 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {msg.isVoiceInput && <span>🎙️ Voice input • </span>}
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Copy Button */}
                      {isAssistant && (
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          title="copy"
                          className="text-slate-400 hover:text-slate-700 flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedMessageId === msg.id ? (
                            <span className="text-emerald-600 flex items-center gap-0.5 font-bold">
                              <CheckCheck className="w-3 h-3" /> Copied
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="w-3 h-3" /> copy
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white p-3 rounded-2xl border border-slate-200/80 w-fit shadow-xs">
                <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Preparation of consultation and routine flowchart...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Consultation Chips */}
          <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              'Flowchart and comparison of 4 serums',
              'Blemish and pigmentation removal routine',
              'AMPM correct order',
              'Serum for dry and sensitive skin'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full bg-rose-50/80 hover:bg-rose-100 text-rose-900 text-[11px] font-semibold border border-rose-200/80 transition active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-rose-600" /> {chip}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              {/* Voice Input Button */}
              <button
                onClick={toggleListening}
                title={isListening ? 'Stop recording' : 'Speak Bengali orally'}
                className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-md ring-4 ring-rose-200'
                    : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Text input */}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? 'Listening... say it' : 'Write a question about skincare or serum...'}
                className="flex-1 bg-slate-100 focus:bg-white text-slate-900 px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-transparent focus:border-rose-400 focus:outline-none transition shadow-inner"
              />

              {/* Send button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950 disabled:opacity-40 text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {isListening && (
              <div className="mt-2 text-center text-xs text-rose-600 font-medium animate-pulse flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                mike active Yes... Ask your question
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
