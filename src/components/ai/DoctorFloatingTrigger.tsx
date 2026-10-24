import React from 'react';
import { Sparkles } from 'lucide-react';

interface DoctorFloatingTriggerProps {
  onOpenDoctor: () => void;
  selectedProductCount?: number;
  whatsappNumber?: string;
  storeName?: string;
}

export const DoctorFloatingTrigger: React.FC<DoctorFloatingTriggerProps> = ({
  onOpenDoctor,
  selectedProductCount = 0,
  whatsappNumber = '01726275850',
  storeName = 'ETTADI MART'
}) => {
  const cleanPhone = (whatsappNumber || '01726275850').replace(/[^0-9]/g, '');

  return (
    <div className="fixed bottom-4 right-3.5 sm:bottom-5 sm:right-5 z-50 flex flex-col items-center gap-2 sm:gap-2.5 select-none pointer-events-none">
      
      {/* 1. WhatsApp Floating Circular Button (TOP) - Compact & Elegant */}
      <a
        href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(storeName)},%20I%20would%20like%20to%20know%20more%20about%20your%20products.`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        title="WhatsApp Support"
        className="pointer-events-auto group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#128C7E] via-[#25D366] to-[#2ecc71] shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white/90 ring-2 ring-emerald-500/20 cursor-pointer"
      >
        {/* Soft glowing ambient ripple ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-green-500 opacity-60 blur-[2px] group-hover:opacity-90 animate-pulse transition duration-700"></span>

        {/* WhatsApp Icon */}
        <svg 
          className="relative w-5 h-5 sm:w-6 sm:h-6 fill-white drop-shadow-xs group-hover:scale-110 transition-transform duration-300" 
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>

        {/* Live Support Online Dot */}
        <span className="absolute bottom-0 right-0 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-full w-full bg-[#25D366] border border-white shadow-2xs"></span>
        </span>
      </a>

      {/* 2. AI Skincare Doctor Floating Circular Button (BOTTOM) - Exact Matching Size */}
      <button
        onClick={onOpenDoctor}
        aria-label="Open AI Skincare Doctor"
        title="AI Skincare Doctor"
        className="pointer-events-auto group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-slate-950 via-rose-900 to-rose-600 shadow-xl shadow-rose-900/35 hover:shadow-rose-600/45 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white/90 ring-2 ring-rose-500/20 cursor-pointer"
      >
        {/* Soft glowing ambient ripple ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 opacity-60 blur-[2px] group-hover:opacity-100 animate-pulse transition duration-700"></span>

        {/* Doctor Circular Image Container */}
        <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-b from-rose-100 via-white to-rose-50">
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80"
            alt="AI Skincare Doctor"
            className="w-full h-full object-cover object-top group-hover:scale-115 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<span class="text-xl sm:text-2xl">👨‍⚕️</span>';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rose-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity"></div>
        </div>

        {/* Floating Sparkle Micro-Badge */}
        <div className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs border border-white">
          <Sparkles className="w-2 h-2 text-white animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Live Doctor Online Dot */}
        <span className="absolute bottom-0 right-0 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border border-white shadow-2xs"></span>
        </span>

        {/* Selected Products Count Badge */}
        {selectedProductCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-md border border-white animate-bounce">
            {selectedProductCount}
          </span>
        )}
      </button>

    </div>
  );
};
