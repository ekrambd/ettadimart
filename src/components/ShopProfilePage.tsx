import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, Star, MapPin, ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { Vendor, Product } from '../types';
import StoreHeader from './StoreHeader';
import EttadiFooter from './EttadiFooter';
import { useAppStore } from '../store/useAppStore';

interface ShopProfilePageProps {
  onAddToCart?: (product: Product, quantity?: number) => void;
  onOpenProductDetail?: (product: Product) => void;
}

export default function ShopProfilePage({ onAddToCart, onOpenProductDetail }: ShopProfilePageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { ecomSettings, addToCart } = useAppStore();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [productSearch, setProductSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load vendor details
    fetch('/api/vendors')
      .then(res => res.json())
      .then((vendors: Vendor[]) => {
        if (Array.isArray(vendors)) {
          const match = vendors.find(v => v.slug === slug || v.id === slug);
          if (match) {
            setVendor(match);
          } else if (vendors.length > 0) {
            setVendor(vendors[0]);
          }
        }
      })
      .catch(console.error);

    // Load products of this vendor
    fetch('/api/products')
      .then(res => res.json())
      .then((allProds: any[]) => {
        if (Array.isArray(allProds)) {
          setProducts(allProds);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  // Filter products for this vendor (or show all if vendor has none yet)
  const vendorProducts = products.filter(p => {
    const belongsToVendor = vendor && (
      p.vendorId === vendor.id || 
      p.vendorName?.toLowerCase() === vendor.storeName?.toLowerCase()
    );
    // If no vendor specific products, show general products for visual showcase
    const matchesVendor = belongsToVendor || !p.vendorId;
    if (!matchesVendor) return false;

    if (!productSearch.trim()) return true;
    return p.title.toLowerCase().includes(productSearch.toLowerCase());
  });

  const bannerUrl = vendor?.banner || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&h=500&fit=crop';
  const logoUrl = vendor?.logo || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      <div>
        {/* Top Header matching home website */}
        <StoreHeader activeNav="shops" />

        {/* Top Shop Banner Cover */}
        <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden">
          <img
            src={bannerUrl}
            alt={vendor?.storeName || 'Shop'}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

          <button
            onClick={() => navigate('/shops')}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 px-3.5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer z-10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Shops</span>
          </button>
        </div>

        {/* Shop Info Header Card (Overlapping Banner matching Screenshot 2) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Logo */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={vendor?.storeName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-white p-1 border-2 border-slate-100 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-50 text-[#16a34a] flex items-center justify-center font-black border-2 border-emerald-100 shadow-md shrink-0">
                  <Store className="w-10 h-10 stroke-[2.2]" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {vendor?.storeName || 'Shop Profile'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Online
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{vendor?.rating ? Number(vendor.rating).toFixed(1) : '5.0'}</span>
                    <span className="text-slate-400 font-normal">(0 reviews)</span>
                  </span>
                  <span>•</span>
                  <span>{vendorProducts.length}+ Items</span>
                  {vendor?.district && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vendor.district}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Chat / Contact Action */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => alert(`Direct store contact: ${vendor?.phone || '01726275850'}`)}
                className="px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Contact Shop</span>
              </button>
            </div>
          </div>

          {/* Tab & Search Filter Navigation Row (matching Screenshot 2) */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Products
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Reviews (0)
              </button>
            </div>

            {/* Product Search inside this shop */}
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-[#16a34a] rounded-xl text-xs sm:text-sm outline-none font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Products Grid */}
          {activeTab === 'products' && (
            <div className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <div key={n} className="h-60 rounded-xl bg-white border border-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : vendorProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <Store className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No products matching in this shop</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {vendorProducts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        if (onOpenProductDetail) {
                          onOpenProductDetail(prod);
                        } else {
                          navigate(`/product/${prod.slug || prod.id}`);
                        }
                      }}
                      className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 p-3 flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="aspect-square rounded-xl bg-slate-50 overflow-hidden mb-2 relative">
                          <img
                            src={prod.image || '/placeholder-product.svg'}
                            alt={prod.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {prod.regularPrice && prod.regularPrice > prod.price && (
                            <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                              -{Math.round(((prod.regularPrice - prod.price) / prod.regularPrice) * 100)}%
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">
                          {prod.category || 'General'}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#16a34a] transition-colors">
                          {prod.title}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-900">
                            ৳{prod.price}
                          </div>
                          {prod.regularPrice && prod.regularPrice > prod.price && (
                            <div className="text-[10px] text-slate-400 line-through">
                              ৳{prod.regularPrice}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAddToCart) {
                              onAddToCart(prod, 1);
                            } else {
                              addToCart({ product: prod, quantity: 1 });
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-[#16a34a] text-[#16a34a] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="mt-6 bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-sm">
              <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800">No reviews yet for {vendor?.storeName}</p>
              <p className="text-xs mt-1">Verified customers will be able to leave reviews after purchasing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16">
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
    </div>
  );
}