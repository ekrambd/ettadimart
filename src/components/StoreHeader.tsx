import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Menu, 
  LayoutGrid, 
  Tag, 
  X,
  Heart,
  FileText,
  HelpCircle,
  LogIn,
  Shirt,
  Sparkles,
  Smartphone,
  Watch,
  Store,
  Home,
  Headphones
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { dbService } from '../lib/dbService';

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
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cartup-style sleek top progress bar state
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  const startTopProgress = (callback?: () => void) => {
    setIsProgressLoading(true);
    setProgressWidth(25);
    setTimeout(() => setProgressWidth(70), 100);
    setTimeout(() => setProgressWidth(95), 250);
    setTimeout(() => {
      setProgressWidth(100);
      setTimeout(() => {
        setIsProgressLoading(false);
        setProgressWidth(0);
        if (callback) callback();
      }, 150);
    }, 350);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTopProgress(() => {
      handleNavClick('/', 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const displayStoreName = ecomSettings?.storeName || 'EttadiMart';
  const displayStoreLogo = ecomSettings?.storeLogo || '/ettadimart-logo.svg';

  const totalCartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Load live DB categories and listen for real-time updates
  useEffect(() => {
    let isMounted = true;
    const loadCats = () => {
      dbService.getCategories().then(items => {
        if (isMounted && Array.isArray(items) && items.length > 0) {
          const rootCats = items.filter(c => !c.parentId && c.name && c.name.trim()).map(c => c.name.trim());
          if (rootCats.length > 0) setDbCategories(rootCats);
        }
      }).catch(() => {});
    };
    loadCats();
    window.addEventListener('categories-updated', loadCats);
    return () => {
      isMounted = false;
      window.removeEventListener('categories-updated', loadCats);
    };
  }, []);

  // Close dropdowns when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
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

  const handleNavClick = (route: string, tabName?: string) => {
    setIsMobileMenuOpen(false);
    setIsAccountDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    if (onNavigate && tabName) {
      onNavigate(tabName);
    }
    navigate(route);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const rawCategories = ecomSettings?.categories || [];
  const categoryItems = (ecomSettings?.categoryItems || []).filter(c => !c.parentId).map(c => c.name);
  const displayCategories = dbCategories.length > 0
    ? dbCategories
    : categoryItems.length > 0 
    ? categoryItems 
    : rawCategories.length > 0 
    ? rawCategories 
    : ['Kitchen Appliance', 'Electronics', 'Mobile phone & Accessories', 'Winter Products', 'Smartwatch', 'speaker'];

  // Cartup Default Top Categories with matching icons
  const cartupNavCategories = [
    { name: 'Men', icon: Shirt, slug: 'men' },
    { name: 'Women', icon: Sparkles, slug: 'women' },
    { name: 'Phones', icon: Smartphone, slug: 'phones' },
    { name: 'Watches', icon: Watch, slug: 'watches' },
    { name: 'Groceries', icon: Store, slug: 'groceries' },
    { name: 'Home & Living', icon: Home, slug: 'home-kitchen' },
    { name: 'Gadgets', icon: Headphones, slug: 'electronics' },
    { name: 'Health & Beauty', icon: Heart, slug: 'beauty-personal-care' }
  ];

  return (
    <>
      {/* Sleek Top Progress Bar (Cartup Style on Logo Click / Page Navigation) */}
      {isProgressLoading && (
        <div 
          className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-pink-500 via-[#F37022] to-pink-600 z-[999999] shadow-sm transition-all duration-150 ease-out pointer-events-none"
          style={{ width: `${progressWidth}%` }}
        />
      )}

      <header className="sticky top-0 z-40 bg-white text-slate-900 border-b border-slate-200/90 shadow-2xs font-sans">
        
        {/* ============================================================
            1. MAIN HEADER BAR (Exact Cartup standard)
            ============================================================ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 md:gap-6">
          
          {/* Left: Brand Logo + QR Exclusive Offers Badge */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button 
              type="button"
              className="flex items-center cursor-pointer group shrink-0 border-0 bg-transparent p-0 transition-transform active:scale-95 text-left" 
              onClick={handleLogoClick}
              title={`${displayStoreName} - Home`}
            >
              <img 
                src={displayStoreLogo} 
                alt={displayStoreName} 
                className="h-8 sm:h-9 md:h-10 w-auto max-w-[140px] sm:max-w-[175px] object-contain shrink-0" 
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/ettadimart-logo.svg';
                }}
              />
            </button>
          </div>

          {/* Center: Wide Search Bar with Soft Pink Search Button */}
        <div className="flex-1 max-w-2xl mx-1 sm:mx-3">
          <form 
            onSubmit={handleSearch}
            className="relative flex items-center bg-white rounded-lg border border-slate-200/90 focus-within:border-[#F37022] focus-within:ring-2 focus-within:ring-orange-500/10 transition-all w-full pl-3 pr-1 py-1 shadow-2xs"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in Ettadi Mart..."
              className="w-full py-1 px-1 text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
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
              className="w-8 h-8 rounded-md bg-pink-50 hover:bg-pink-100 active:scale-95 text-[#e91e63] transition-all cursor-pointer shrink-0 flex items-center justify-center ml-1"
              title="Search"
            >
              <Search className="w-4 h-4 text-[#e91e63] stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Right: Account & Lists Dropdown + Minimalist Cart */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-end">
          
          {/* Account & Lists (Sign in + Lists trigger with Floating Dropdown) */}
          <div className="relative" ref={accountDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              onMouseEnter={() => setIsAccountDropdownOpen(true)}
              className="flex flex-col text-left cursor-pointer group py-0.5 select-none"
            >
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal leading-none">Sign in</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs sm:text-[13px] font-bold text-slate-800 group-hover:text-[#F37022] transition-colors leading-none">
                  Account & Lists
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Floating Dropdown Card (Exact match to screenshot) */}
            {isAccountDropdownOpen && (
              <div 
                onMouseLeave={() => setIsAccountDropdownOpen(false)}
                className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-50 animate-fadeIn text-slate-700"
              >
                <button
                  type="button"
                  onClick={() => handleNavClick('/login', 'profile')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors text-left"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountDropdownOpen(false);
                    if (onOpenTracking) onOpenTracking();
                    else navigate('/track-order');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>My Orders</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('/shop', 'shop')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors text-left"
                >
                  <Heart className="w-4 h-4 text-slate-500" />
                  <span>My Wishlist</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('/contact', 'contact')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors text-left"
                >
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>Help Center</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => handleNavClick('/login', 'login')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-900 cursor-pointer transition-colors text-left"
                >
                  <LogIn className="w-4 h-4 text-slate-700" />
                  <span>Sign in</span>
                </button>
              </div>
            )}
          </div>

          {/* Minimalist Cart Icon + Cart Text (Exact Cartup standard) */}
          <button 
            type="button"
            onClick={() => onOpenCart ? onOpenCart() : navigate('/checkout')}
            className="flex items-center gap-2 cursor-pointer group py-0.5 select-none"
            title="Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-slate-800 stroke-[1.8] group-hover:text-[#F37022] transition-colors" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#F37022] text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#F37022] transition-colors">
              Cart
            </span>
          </button>

        </div>

      </div>

      {/* ============================================================
          2. SUB-NAVIGATION CATEGORY BAR (Exact Cartup standard)
          ============================================================ */}
      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          {/* All Categories Dropdown Button */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-800 hover:text-[#F37022] transition-colors cursor-pointer my-0.5"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>All Categories</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Category Dropdown Menu */}
            {isCategoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
                <div className="px-3.5 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Browse Categories
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
                    View All Products →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Horizontal Icon Categories Track */}
          <div 
            ref={categoryScrollRef}
            className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 text-xs font-medium text-slate-700 flex-1 scroll-smooth"
          >
            {cartupNavCategories.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleNavClick(`/category/${item.slug}`, 'shop')}
                  className="flex items-center gap-1.5 shrink-0 text-slate-700 hover:text-[#e91e63] font-semibold text-xs transition-colors cursor-pointer py-1 group"
                >
                  <IconComponent className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#e91e63] transition-colors" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Pink Navigation Scroll Arrows (< and >) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 pl-2">
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="w-6 h-6 rounded-full border border-pink-200 text-[#e91e63] flex items-center justify-center hover:bg-pink-50 transition-colors cursor-pointer shadow-2xs"
              aria-label="Previous categories"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="w-6 h-6 rounded-full border border-pink-200 text-[#e91e63] flex items-center justify-center hover:bg-pink-50 transition-colors cursor-pointer shadow-2xs"
              aria-label="Next categories"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

    </header>
  </>
  );
}
