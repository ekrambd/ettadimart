import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Star, ArrowRight, Search } from 'lucide-react';
import { Vendor } from '../types';
import StoreHeader from './StoreHeader';
import EttadiFooter from './EttadiFooter';
import { useAppStore } from '../store/useAppStore';

interface ShopsListPageProps {
  onGoToShop?: (shopSlug: string) => void;
}

export default function ShopsListPage({ onGoToShop }: ShopsListPageProps) {
  const navigate = useNavigate();
  const { ecomSettings } = useAppStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setVendors(data);
        }
      })
      .catch(err => console.error('Failed to load vendors:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredVendors = vendors.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.storeName?.toLowerCase().includes(q) ||
      v.address?.toLowerCase().includes(q) ||
      v.district?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      <div>
        {/* Top Header matching home website */}
        <StoreHeader activeNav="shops" />

        {/* Title Bar matching reference screenshot */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  All Shops
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Browse verified stores & merchants on EttadiMart
                </p>
              </div>

              {/* Search Box */}
              <div className="w-full sm:w-80 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shops by name, area..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#16a34a] rounded-xl text-xs sm:text-sm font-medium outline-none transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Vendors Grid (Matching Reference Screenshot) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No shops found</h3>
              <p className="text-xs text-slate-500 mt-1">Try another search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => {
                const bannerImg = vendor.banner || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop';
                const logoImg = vendor.logo || '';
                const rating = vendor.rating || 5.0;
                const soldCount = vendor.ordersCount || 24;

                return (
                  <div
                    key={vendor.id}
                    onClick={() => {
                      if (onGoToShop) {
                        onGoToShop(vendor.slug || vendor.id);
                      } else {
                        navigate(`/shops/${vendor.slug || vendor.id}`);
                      }
                    }}
                    className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-64 flex flex-col justify-between border border-slate-800"
                  >
                    {/* Shop Front Store Banner (Matching cozy store facade image) */}
                    <img
                      src={bannerImg}
                      alt={vendor.storeName}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-80 group-hover:brightness-90"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

                    {/* Top Store Signboard (Matching store name watermark) */}
                    <div className="relative z-10 pt-4 px-6 text-center">
                      <span className="text-xl sm:text-2xl font-serif italic text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                        {vendor.storeName}
                      </span>
                    </div>

                    {/* Bottom Bar: Logo Box + Store Info + Visit Store Button */}
                    <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-3 bg-gradient-to-t from-black/95 to-transparent pt-8">
                      {/* Left: Store Logo & Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        {logoImg ? (
                          <img
                            src={logoImg}
                            alt={vendor.storeName}
                            className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-md shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white text-[#16a34a] font-black text-sm flex items-center justify-center shadow-md shrink-0">
                            <Store className="w-6 h-6 stroke-[2.2]" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="text-base font-extrabold text-white truncate drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                            {vendor.storeName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-white/90">
                            <span className="flex items-center gap-1 font-bold text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{rating.toFixed(1)}</span>
                              <span className="text-white/60 font-normal">(0)</span>
                            </span>
                            <span>•</span>
                            <span className="text-white/80">Sold: -/{soldCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Visit Store Button (Clean semi-transparent button matching image) */}
                      <button
                        type="button"
                        className="px-3.5 py-2 rounded-xl bg-[#2e7d32]/90 hover:bg-[#2e7d32] text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-black/30 transition-all cursor-pointer backdrop-blur-xs group-hover:scale-105"
                      >
                        <span>Visit Store</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <EttadiFooter
        displayStoreLogo={ecomSettings?.storeLogo || '/ettadimart-logo.svg'}
        displayStoreName={ecomSettings?.storeName || 'EttadiMart'}
        displayTagline={ecomSettings?.storeTagline || 'Multi-Vendor Marketplace'}
        displayAddress={ecomSettings?.storeAddress}
        displayEmail={ecomSettings?.contactEmail || 'support@ettadimart.com'}
        displayPhone={ecomSettings?.contactPhone || '01726275850'}
        shopCategories={['All', 'Gadgets', 'Groceries', 'Varieties']}
        socialLinks={ecomSettings?.socialLinks}
        setActiveNav={() => navigate('/shop')}
        setSelectedCategoryCheckbox={() => navigate('/shop')}
        scrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
    </div>
  );
}