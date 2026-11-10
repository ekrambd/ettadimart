import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  Search, 
  ShoppingCart, 
  User, 
  ChevronDown, 
  Menu, 
  Truck, 
  LayoutGrid, 
  Tag, 
  X,
  Phone,
  Mail,
  Heart,
  Flame,
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface StoreHeaderProps {
  activeNav?: string;
  onNavigate?: (tab: string) => void;
  onOpenCart?: () => void;
  onOpenTracking?: () => void;
}

export default function StoreHeader({ 
  activeNav = 'home', 
  onNavigate, 
  onOpenCart, 
  onOpenTracking 
}: StoreHeaderProps) {
  const navigate = useNavigate();
  const { ecomSettings, cart = [] } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayStoreName = ecomSettings?.storeName || 'EttadiMart';
  const displayStoreLogo = ecomSettings?.storeLogo || '/ettadimart-logo.svg';
  const displayPhone = ecomSettings?.contactPhone || '01726275850';
  const displayEmail = ecomSettings?.contactEmail || 'support@ettadimart.com';

  const totalCartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);

  // Close category dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/shop');
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchTerm(tag);
    navigate(`/shop?search=${encodeURIComponent(tag)}`);
  };

  const handleNavClick = (route: string, tabName?: string) => {
    setIsMobileMenuOpen(false);
    if (onNavigate && tabName) {
      onNavigate(tabName);
    }
    navigate(route);
  };

  const rawCategories = ecomSettings?.categories || [];
  const categoryItems = ecomSettings?.categoryItems || [];
  const displayCategories = categoryItems.length > 0 
    ? categoryItems.map(c => c.name) 
    : rawCategories.length > 0 
    ? rawCategories 
    : ['Home & Kitchen', 'Electronics', 'Smart Gadgets', 'Beauty & Personal Care', 'Lifestyle'];

  const trendingKeywords = ['Coffee Whisk', 'Kitchen Gadgets', 'Water Heater', 'Cooker', 'Storage Bag'];

  return (
    <header className="sticky top-0 z-40 bg-white text-slate-900 border-b border-slate-200/80 shadow-xs font-sans">
      {/* 1. TOP UTILITY BAR (Cartup Style: Hotline, Fast COD delivery, Track order shortcut) */}
      <div className="bg-[#0f172a] text-slate-300 text-[11px] sm:text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <a 
              href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`} 
              className="flex items-center gap-1.5 hover:text-white transition-colors text-slate-300 no-underline"
            >
              <Phone className="w-3 h-3 text-[#F37022]" />
              <span className="font-semibold">হটলাইন: {displayPhone}</span>
            </a>
            <span className="hidden md:flex items-center gap-1.5 text-slate-400">
              <Truck className="w-3 h-3 text-emerald-400" />
              <span>সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => onOpenTracking ? onOpenTracking() : navigate('/track-order')}
              className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-orange-400" />
              <span>Track Order</span>
            </button>
            <div className="h-3 w-px bg-slate-700 hidden sm:block" />
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="hover:text-white transition-colors cursor-pointer text-slate-400 text-[11px]"
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR (Brand Logo, Cartup-Style Centered Capsule Search, Cart Trigger, Account) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center shrink-0">
          <button 
            type="button"
            className="flex items-center cursor-pointer group shrink-0 border-0 bg-transparent p-0 transition-transform active:scale-95 text-left" 
            onClick={() => handleNavClick('/', 'home')}
            title={`${displayStoreName} - Home`}
          >
            <img 
              src={displayStoreLogo} 
              alt={displayStoreName} 
              className="h-9 sm:h-10 md:h-11 w-auto max-w-[160px] sm:max-w-[200px] object-contain shrink-0" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/ettadimart-logo.svg';
              }}
            />
          </button>
        </div>

        {/* Center: Cartup-Style Wide Search Bar */}
        <div className="relative flex-1 min-w-0 max-w-2xl mx-1 sm:mx-4">
          <form 
            onSubmit={handleSearch}
            className="relative flex items-center bg-slate-50 hover:bg-slate-100/90 focus-within:bg-white rounded-full overflow-hidden border border-slate-200 focus-within:border-[#F37022] focus-within:ring-4 focus-within:ring-orange-500/10 transition-all w-full pl-4 pr-1 py-1 shadow-2xs"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="পণ্য, গ্যাজেটস বা কিচেন সামগ্রী খুঁজুন..."
              className="w-full py-1 text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors mr-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="bg-[#F37022] hover:bg-[#d95c10] active:scale-95 text-white px-3 sm:px-4 h-7 sm:h-8 rounded-full transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-xs text-xs font-bold"
              title="Search"
            >
              <span>খুঁজুন</span>
            </button>
          </form>

          {/* Quick Trending Searches beneath search bar on desktop */}
          <div className="hidden lg:flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 truncate px-2">
            <span className="font-semibold text-slate-400 flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 text-[#F37022]" />
              <span>জনপ্রিয়:</span>
            </span>
            {trendingKeywords.map((kw, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickTagClick(kw)}
                className="hover:text-[#F37022] hover:underline cursor-pointer transition-colors"
              >
                {kw}{idx < trendingKeywords.length - 1 ? ',' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions Cluster (Track Order, Cart, Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-slate-900 justify-end">
          
          {/* Track Order Button */}
          <button
            type="button"
            onClick={() => onOpenTracking ? onOpenTracking() : navigate('/track-order')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Track Your Order"
          >
            <Truck className="w-4 h-4 text-[#F37022]" />
            <span>অর্ডার ট্র্যাকিং</span>
          </button>

          {/* Cartup-Style Cart Button */}
          <button 
            type="button"
            onClick={() => onOpenCart ? onOpenCart() : navigate('/checkout')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50/40 border border-slate-200 hover:border-[#F37022] text-slate-800 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
            title="Shopping Cart"
          >
            <div className="relative w-8 h-8 rounded-lg bg-orange-50 text-[#F37022] flex items-center justify-center transition-colors shrink-0 group-hover:bg-[#F37022] group-hover:text-white">
              <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#F37022] text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                  {totalCartCount}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">কার্ট</span>
              <span className="text-xs sm:text-sm font-black text-[#F37022] whitespace-nowrap mt-0.5">
                ৳{cartSubtotal.toLocaleString()}
              </span>
            </div>
          </button>

          {/* Account / Login */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">লগইন</span>
          </button>
        </div>

      </div>

      {/* 3. NAVIGATION CATEGORY SUB-HEADER (Cartup Style with "All Categories" Dropdown) */}
      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            {/* All Categories Dropdown Button (Cartup Style) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs my-1"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#F37022]" />
                <span>সকল ক্যাটাগরি</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Category Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    ব্রাউজ করুন
                  </div>
                  {displayCategories.map((catName, idx) => {
                    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <a
                        key={idx}
                        href={`/category/${encodeURIComponent(slug)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setIsCategoryDropdownOpen(false);
                          navigate(`/category/${encodeURIComponent(slug)}`);
                        }}
                        className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#F37022] transition-colors"
                      >
                        <span>{catName}</span>
                        <Tag className="w-3 h-3 text-slate-300" />
                      </a>
                    );
                  })}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen(false);
                        navigate('/shop');
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#F37022] hover:bg-orange-50 transition-colors"
                    >
                      সব পণ্য দেখুন →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Navigation Links */}
            <nav className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 text-xs sm:text-sm font-bold text-slate-700">
              <button
                type="button"
                onClick={() => handleNavClick('/', 'home')}
                className={`px-2.5 py-1 rounded-md hover:text-[#F37022] transition-colors cursor-pointer ${
                  activeNav === 'home' ? 'text-[#F37022] font-black bg-orange-50/70' : ''
                }`}
              >
                হোম (Home)
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('/shop', 'shop')}
                className={`px-2.5 py-1 rounded-md hover:text-[#F37022] transition-colors cursor-pointer ${
                  activeNav === 'shop' ? 'text-[#F37022] font-black bg-orange-50/70' : ''
                }`}
              >
                শপ (All Products)
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('/shop?flash=true', 'shop')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[#F37022] hover:bg-orange-50 font-bold transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 fill-[#F37022]" />
                <span>স্পেশাল অফার</span>
                <span className="text-[9px] bg-red-600 text-white font-black px-1 rounded uppercase">HOT</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('/about', 'about')}
                className={`px-2.5 py-1 rounded-md hover:text-[#F37022] transition-colors cursor-pointer hidden md:block ${
                  activeNav === 'about' ? 'text-[#F37022] font-black bg-orange-50/70' : ''
                }`}
              >
                আমাদের সম্পর্কে
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('/contact', 'contact')}
                className={`px-2.5 py-1 rounded-md hover:text-[#F37022] transition-colors cursor-pointer ${
                  activeNav === 'contact' ? 'text-[#F37022] font-black bg-orange-50/70' : ''
                }`}
              >
                যোগাযোগ
              </button>
            </nav>
          </div>

          {/* Right: Quick Delivery Support Tag */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>সরাসরি কল করুন: <strong>{displayPhone}</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
