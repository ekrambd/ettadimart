import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Loader2, Sparkles } from 'lucide-react';
import { ProductCard } from './ui/ProductCard';

interface SkinQuizViewProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onCancel: () => void;
  isWishlisted: (productId: string) => boolean;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onOpenDetail: (product: Product) => void;
}

const QUIZ_STEPS = [
  {
    id: 'skin_type',
    question: 'What is your skin type?',
    options: ['Dry', 'Oily', 'Balanced', 'Combination', 'Sensitive']
  },
  {
    id: 'skin_goal',
    question: 'How do you want your skin to look without makeup?',
    options: ['Natural glow', 'Bright and luminous', 'Calm and even', 'Smooth and firm']
  },
  {
    id: 'routine_feel',
    question: 'What does your routine usually feel like?',
    options: ['Minimal, fast, and easy', 'A balanced daily routine', 'A fuller self-care ritual']
  },
  {
    id: 'routine_focus',
    question: 'What should your routine focus on first?',
    options: ['Hydration and softness', 'Dullness and bright-looking tone', 'Oil balance and pores', 'Barrier comfort', 'Fine lines and firmness']
  },
  {
    id: 'texture_pref',
    question: 'Which texture do you reach for most?',
    options: ['Lightweight day care', 'Creamy comfort', 'Serum-first glow', 'Night repair']
  }
];

export const SkinQuizView: React.FC<SkinQuizViewProps> = ({ products, onAddToCart, onCancel, isWishlisted, onToggleWishlist, onOpenDetail }) => {
  const [started, setStarted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [QUIZ_STEPS[currentStepIndex].id]: option }));
  };

  const handleNext = () => {
    if (currentStepIndex < QUIZ_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      generateRoutine();
    }
  };

  const generateRoutine = () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis delay
    setTimeout(() => {
      let scored = products.map(p => {
        let score = 0;
        const desc = (p.title + ' ' + p.description + ' ' + (p.benefitsHighlights || '') + ' ' + (p.category || '')).toLowerCase();
        
        // Basic matching logic based on answers
        if (answers.skin_type === 'Dry' && desc.includes('moistur')) score += 2;
        if (answers.skin_type === 'Oily' && (desc.includes('pore') || desc.includes('balance'))) score += 2;
        if (answers.skin_type === 'Sensitive' && (desc.includes('calm') || desc.includes('barrier') || desc.includes('cica'))) score += 3;
        
        if (answers.skin_goal === 'Bright and luminous' && (desc.includes('vitamin c') || desc.includes('bright'))) score += 3;
        if (answers.skin_goal === 'Smooth and firm' && (desc.includes('retinol') || desc.includes('firm') || desc.includes('aging'))) score += 3;
        if (answers.skin_goal === 'Calm and even' && (desc.includes('niacinamide') || desc.includes('calm'))) score += 2;

        if (answers.routine_focus === 'Hydration and softness' && desc.includes('hydrat')) score += 2;
        if (answers.routine_focus === 'Fine lines and firmness' && (desc.includes('retinol') || desc.includes('peptid'))) score += 3;
        
        // Ensure sunscreen is highly rated for everyone
        if (desc.includes('spf') || desc.includes('sunscreen')) score += 2;
        
        return { product: p, score };
      });
      
      scored.sort((a, b) => b.score - a.score);
      // Select top 4 products
      setRecommendedProducts(scored.slice(0, 4).map(s => s.product));
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleRetake = () => {
    setStarted(false);
    setCurrentStepIndex(0);
    setAnswers({});
    setRecommendedProducts([]);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      setStarted(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="relative overflow-hidden -mt-[84px] sm:-mt-[92px] md:-mt-[100px] pt-[84px] sm:pt-[92px] md:pt-[100px] min-h-screen flex flex-col items-center justify-center bg-[#fdfdfd] px-4 py-20 text-center animate-fadeIn">
        <Loader2 className="w-12 h-12 animate-spin text-slate-800 mb-6" />
        <h2 className="text-2xl font-serif text-slate-900 mb-2">Analyzing your skin profile...</h2>
        <p className="text-slate-500 font-light">Crafting your personalized Korean skincare routine.</p>
      </div>
    );
  }

  if (recommendedProducts.length > 0) {
    return (
      <div className="relative overflow-hidden -mt-[84px] sm:-mt-[92px] md:-mt-[100px] pt-[84px] sm:pt-[92px] md:pt-[100px] min-h-screen flex flex-col items-center bg-[#fdfdfd] px-4 py-16 animate-fadeIn text-slate-900">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h3 className="text-sm font-semibold text-[#8da583] mb-4 tracking-[0.15em] uppercase flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Personalized Routine
            </h3>
            <h1 className="text-4xl md:text-5xl font-medium text-slate-900 mb-6 max-w-3xl mx-auto font-serif tracking-tight leading-tight">
              The perfect formulas for {answers.skin_type ? answers.skin_type.toLowerCase() : 'your'} skin.
            </h1>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-light leading-relaxed">
              Based on your quiz, our AI has analyzed your profile. To help you achieve a <strong className="font-semibold text-slate-800">{answers.skin_goal ? answers.skin_goal.toLowerCase() : 'healthy'}</strong> look and focus on <strong className="font-semibold text-slate-800">{answers.routine_focus ? answers.routine_focus.toLowerCase() : 'overall wellness'}</strong>, we have handpicked these specific products to work perfectly together.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {recommendedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={isWishlisted(product.id)}
                onToggleWishlist={onToggleWishlist}
                onOpenDetail={onOpenDetail}
                onAddToCart={(p, qty) => onAddToCart(p)}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => recommendedProducts.forEach(p => onAddToCart(p))}
              className="bg-slate-950 text-white px-8 py-3.5 rounded-full font-medium hover:bg-slate-800 transition-colors w-full sm:w-auto"
            >
              Add all to Cart
            </button>
            <button 
              onClick={handleRetake}
              className="px-8 py-3.5 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors w-full sm:w-auto"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="relative overflow-hidden -mt-[84px] sm:-mt-[92px] md:-mt-[100px] pt-[84px] sm:pt-[92px] md:pt-[100px] min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#b8c9af] via-[#c2d3b9] to-[#a4b59b] px-4 py-20 text-center animate-fadeIn">
        
        {/* Animated Background Orbs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-[#8da583]/30 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite_reverse]" />

        <div className="relative z-10 flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-700/80 mb-4 tracking-[0.2em] uppercase animate-[slideInUp_0.5s_ease-out_forwards]">
            Fantine Beauty
          </h3>
          <h1 className="text-5xl md:text-7xl font-medium text-slate-900 mb-6 max-w-3xl font-serif leading-tight animate-[slideInUp_0.7s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.1s' }}>
            Find Your Daily <br/><span className="italic text-slate-800">Skin Routine</span>
          </h1>
          <p className="text-slate-800 text-lg md:text-xl max-w-2xl mb-12 font-light animate-[slideInUp_0.9s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.2s' }}>
            Answer a few quick questions and we will recommend a simple Fantine routine for your skin type, glow goals, and daily comfort.
          </p>
          <button 
            onClick={() => setStarted(true)}
            className="group relative overflow-hidden bg-slate-950 text-white px-10 py-4 rounded-full text-sm font-medium hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-[slideInUp_1.1s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.3s' }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Quiz 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </div>


      </div>
    );
  }

  const currentStep = QUIZ_STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / QUIZ_STEPS.length) * 100;
  const isAnswered = !!answers[currentStep.id];

  return (
    <div className="relative overflow-hidden -mt-[84px] sm:-mt-[92px] md:-mt-[100px] pt-[84px] sm:pt-[92px] md:pt-[100px] min-h-screen flex flex-col items-center justify-center bg-[#b8c9af] px-4 py-20 animate-fadeIn">
      
      {/* Progress Indicator */}
      <div className="w-full max-w-2xl mb-12">
        <div className="flex justify-center mb-6 text-slate-700 text-sm font-medium">
          {currentStepIndex + 1} of {QUIZ_STEPS.length}
        </div>
        <div className="h-0.5 w-full bg-slate-900/10 overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-slate-900 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question & Options */}
      <div className="w-full max-w-3xl text-center space-y-12">
        <h2 className="text-4xl md:text-5xl font-medium text-slate-900 leading-tight font-sans tracking-tight">
          {currentStep.question}
        </h2>
        
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
          {currentStep.options.map(option => {
            const isSelected = answers[currentStep.id] === option;
            return (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                className={`px-6 py-2.5 rounded-full text-sm md:text-base transition-all duration-200 border ${
                  isSelected 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-[#e2e8df] text-slate-900 border-[#e2e8df] hover:bg-[#d5ded1]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-16 flex gap-4">
        <button
          onClick={handleBack}
          className="px-8 py-2.5 rounded-full border border-slate-900 text-slate-900 font-medium hover:bg-slate-900/5 transition-colors bg-transparent"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`px-8 py-2.5 rounded-full font-medium transition-colors border ${
            isAnswered
              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-md'
              : 'bg-slate-600/40 text-white border-transparent cursor-not-allowed'
          }`}
        >
          {currentStepIndex === QUIZ_STEPS.length - 1 ? 'See Results' : 'Next'}
        </button>
      </div>

    </div>
  );
};
