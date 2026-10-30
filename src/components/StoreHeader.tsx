import React, { useState } from 'react';
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
  Heart
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface StoreHeaderProps {
  activeNav?: string;
  onNavigate?: (tab: string) => void;
}

export default function StoreHeader({ activeNav = 'shops', onNavigate }: StoreHeaderProps) {
  const navigate = useNavigate();
  const { ecomSettings, cart = [] } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayStoreName = ecomSettings?.storeName || 'EttadiMart';
  const displayStoreLogo = ecomSettings?.storeLogo || '/ettadimart-logo.svg';
  const displayPhone = ecomSettings?.contactPhone || '01726275850';
  const displayEmail = ecomSettings?.contactEmail || 'support@ettadimart.com';

  const totalCartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/shop');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white text-slate-900 border-b border-slate-100 shadow-xs font-sans">
      {/* 1. TOP UTILITY BAR (matching ReadyGrocery screenshot 2: Hotline, Mail, Become a Seller / Login) */}
      <div className="bg-[#1e293b] text-slate-300 text-[11px] sm:text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>Hotline: {displayPhone}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3 h-3 text-emerald-400" />
              <span>Mail: {displayEmail}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => navigate('/shop/login')}
              className="flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Become a Seller / Shop Panel</span>
            </button>
            <div className="h-3 w-px bg-slate-700 hidden sm:block" />
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="hover:text-white transition-colors cursor-pointer hidden sm:block"
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR (Brand Logo, Search Bar, Wishlist, Cart, Login) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Brand Logo (Only Logo, matching professional brand header) */}
        <div className="flex items-center shrink-0">
          <button 
            type="button"
            className="flex items-center cursor-pointer group shrink-0 border-0 bg-transparent p-0 transition-transform active:scale-95 text-left" 
            onClick={() => navigate('/')}
            title={`${displayStoreName} - Home`}
          >
            <img 
              src={displayStoreLogo} 
              alt={displayStoreName} 
              className="h-9 sm:h-10 md:h-11 w-auto max-w-[170px] sm:max-w-[210px] object-contain shrink-0" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/ettadimart-logo.svg';
              }}
            />
          </button>
        </div>

        {/* Center: Search Bar matching image */}
        <div className="relative flex-1 min-w-0 max-w-xl mx-1 sm:mx-3">
          <form 
            onSubmit={handleSearch}
            className="relative flex items-center bg-[#f8fafc] hover:bg-slate-100/80 focus-within:bg-white rounded-full overflow-hidden border border-slate-200/90 focus-within:border-[#16a34a] focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all w-full pl-4 pr-1.5 py-1 shadow-2xs"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, China varieties, gadgets, shops..."
              className="w-full py-1 text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
            />
            <button
              type="submit"
              className="bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-md shadow-emerald-700/25"
              title="Search"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Right: Account & Cart Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-slate-900 justify-end">
          {/* Wishlist button */}
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            <Heart className="w-4 h-4 text-emerald-600" />
            <span>Wishlist</span>
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">0</span>
          </button>

          {/* Cart Button */}
          <button 
            type="button"
            onClick={() => navigate('/checkout')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-500 text-slate-800 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
            title="Shopping Cart"
          >
            <div className="relative w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-colors shrink-0 group-hover:bg-[#16a34a] group-hover:text-white">
              <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#16a34a] text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                  {totalCartCount}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">My Cart</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap mt-0.5">
                ৳{cartSubtotal.toLocaleString()}
              </span>
            </div>
          </button>

          {/* Login / Profile */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md shadow-slate-950/20 active:scale-95"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Login</span>
          </button>
        </div>

      </div>

      {/* 3. NAVIGATION CATEGORY / SHOPS SUB-HEADER (Home, Categories, Products, Shops, Most Popular, Best Deal, Contact) */}
      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2 text-xs sm:text-sm font-bold text-slate-700">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`py-1 hover:text-[#16a34a] transition-colors cursor-pointer ${
                activeNav === 'home' ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : ''
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className={`py-1 hover:text-[#16a34a] transition-colors cursor-pointer ${
                activeNav === 'categories' ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : ''
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className={`py-1 hover:text-[#16a34a] transition-colors cursor-pointer ${
                activeNav === 'products' ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : ''
              }`}
            >
              Products
            </button>
            <button
              type="button"
              onClick={() => navigate('/shops')}
              className={`flex items-center gap-1 py-1 transition-colors cursor-pointer ${
                activeNav === 'shops'
                  ? 'text-[#16a34a] font-black border-b-2 border-[#16a34a]'
                  : 'hover:text-[#16a34a]'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Shops</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="py-1 hover:text-[#16a34a] transition-colors cursor-pointer hidden md:block"
            >
              Most Popular
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="py-1 hover:text-[#16a34a] transition-colors cursor-pointer hidden md:block"
            >
              Best Deal
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className={`py-1 hover:text-[#16a34a] transition-colors cursor-pointer ${
                activeNav === 'contact' ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : ''
              }`}
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Dhaka, Bangladesh</span>
          </div>
        </div>
      </div>
    </header>
  );
}