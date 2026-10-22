import React from 'react';
import { SlidersHorizontal, X, Home, ArrowLeft, Package } from 'lucide-react';
import { ProductCard } from './ui/ProductCard';
import { Product, Brand } from '../types';

export interface AllTimepiecesPageProps {
  products: Product[];
  brands: Brand[];
  storeCategories: string[];
  brandProductCounts: Record<string, number>;
  categoryProductCounts: Record<string, number>;
  genderCounts: { gents: number; ladies: number; unisex: number };
  materialCounts: { chain: number; leather: number; silicone: number };
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  setSelectedSubCategory?: (subCat: string) => void;
  selectedGender: string;
  setSelectedGender: (gender: string) => void;
  selectedMaterial: string;
  setSelectedMaterial: (mat: string) => void;
  minPrice: number | '';
  setMinPrice: (price: number | '') => void;
  maxPrice: number | '';
  setMaxPrice: (price: number | '') => void;
  appliedMinPrice: number | '';
  setAppliedMinPrice: (price: number | '') => void;
  appliedMaxPrice: number | '';
  setAppliedMaxPrice: (price: number | '') => void;
  sortBy: 'featured' | 'price-low' | 'price-high' | 'newest';
  setSortBy: (sort: 'featured' | 'price-low' | 'price-high' | 'newest') => void;
  searchTerm: string;
  filteredProducts: Product[];
  isAnyFilterActive: boolean;
  resetAllFilters: () => void;
  onBackToHome: () => void;
  wishlist: string[];
  primaryColor: string;
  toggleWishlist: (productId: string, e?: React.MouseEvent) => void;
  openProductDetail: (product: Product) => void;
  handleAddToCart: (product: Product, quantity?: number) => void;
  handleBuyNow: (product: Product) => void;
}

export default function AllTimepiecesPage({
  products,
  brands,
  storeCategories,
  brandProductCounts,
  categoryProductCounts,
  genderCounts,
  materialCounts,
  selectedBrand,
  setSelectedBrand,
  selectedCategory,
  setSelectedCategory,
  setSelectedSubCategory,
  selectedGender,
  setSelectedGender,
  selectedMaterial,
  setSelectedMaterial,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  appliedMinPrice,
  setAppliedMinPrice,
  appliedMaxPrice,
  setAppliedMaxPrice,
  sortBy,
  setSortBy,
  searchTerm,
  filteredProducts,
  isAnyFilterActive,
  resetAllFilters,
  onBackToHome,
  wishlist,
  primaryColor,
  toggleWishlist,
  openProductDetail,
  handleAddToCart,
  handleBuyNow
}: AllTimepiecesPageProps) {
  return (
    <section id="catalog-section" className="space-y-6 pt-2">
      {/* Breadcrumbs & Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <button
            onClick={onBackToHome}
            className="hover:text-slate-900 cursor-pointer flex items-center gap-1 text-slate-700 hover:text-[#e11d48]"
          >
            <Home className="h-3.5 w-3.5" />
            <span>HOME</span>
          </button>
          <span>/</span>
          <span className="text-slate-900">
            {selectedBrand !== 'all' 
              ? selectedBrand.toUpperCase() 
              : selectedCategory !== 'all' 
                ? selectedCategory.toUpperCase() 
                : 'ALL TIMEPIECES'}
          </span>
        </div>

        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO HOME</span>
        </button>
      </div>

      {/* Page Title & Active Filter Summary */}
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {selectedBrand !== 'all' 
              ? `${selectedBrand.toUpperCase()} WATCHES` 
              : selectedCategory !== 'all' 
                ? `${selectedCategory.toUpperCase()} COLLECTION` 
                : searchTerm 
                  ? `SEARCH: "${searchTerm}"` 
                  : 'ALL TIMEPIECES'}
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {filteredProducts.length} PRODUCTS FOUND
          </p>
        </div>

        {isAnyFilterActive && (
          <button
            onClick={resetAllFilters}
            className="text-xs font-bold text-[#e11d48] hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            <span>CLEAR ALL FILTERS</span>
          </button>
        )}
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
        
        {/* LEFT SIDEBAR FILTERS */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200/90 rounded-lg p-5 space-y-6 shadow-2xs sticky top-28">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-slate-700" />
              <span>FILTERS</span>
            </span>
            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] font-bold text-[#e11d48] hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter by Brands */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">BRANDS</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <label 
                onClick={() => setSelectedBrand('all')}
                className="flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="brand_filter"
                    checked={selectedBrand === 'all'}
                    onChange={() => setSelectedBrand('all')}
                    className="h-3.5 w-3.5 text-[#e11d48] focus:ring-[#e11d48]"
                  />
                  <span>All Brands</span>
                </div>
                <span className="text-[10px] text-slate-400">({products.length})</span>
              </label>

              {brands.map((b) => (
                <label 
                  key={b.id || b.name}
                  onClick={() => setSelectedBrand(b.name)}
                  className="flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="radio"
                      name="brand_filter"
                      checked={selectedBrand.toLowerCase() === b.name.toLowerCase()}
                      onChange={() => setSelectedBrand(b.name)}
                      className="h-3.5 w-3.5 text-[#e11d48] focus:ring-[#e11d48]"
                    />
                    <span className="uppercase truncate">{b.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                    ({brandProductCounts[b.name] || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter by Categories */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">CATEGORIES</h4>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              <label 
                onClick={() => {
                  setSelectedCategory('all');
                  if (setSelectedSubCategory) setSelectedSubCategory('all');
                }}
                className="flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="cat_filter"
                    checked={selectedCategory === 'all'}
                    onChange={() => {
                      setSelectedCategory('all');
                      if (setSelectedSubCategory) setSelectedSubCategory('all');
                    }}
                    className="h-3.5 w-3.5 text-[#e11d48] focus:ring-[#e11d48]"
                  />
                  <span>All Categories</span>
                </div>
                <span className="text-[10px] text-slate-400">({products.length})</span>
              </label>

              {storeCategories.map((cat, idx) => (
                <label 
                  key={idx}
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (setSelectedSubCategory) setSelectedSubCategory('all');
                  }}
                  className="flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="radio"
                      name="cat_filter"
                      checked={selectedCategory.trim().toLowerCase() === cat.trim().toLowerCase()}
                      onChange={() => {
                        setSelectedCategory(cat);
                        if (setSelectedSubCategory) setSelectedSubCategory('all');
                      }}
                      className="h-3.5 w-3.5 text-[#e11d48] focus:ring-[#e11d48]"
                    />
                    <span className="truncate">{cat}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                    ({categoryProductCounts[cat] || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter by Price Range */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">PRICE RANGE</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">MinTk.</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">MaxTk.</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold outline-none focus:border-slate-800"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setAppliedMinPrice(minPrice);
                setAppliedMaxPrice(maxPrice);
              }}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded cursor-pointer transition-colors"
            >
              Apply Price
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN CATALOG & PRODUCTS */}
        <div className="flex-1 min-w-0 space-y-4">
          
          {/* Catalog Control Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-500">Showing {filteredProducts.length} Results</span>
              {selectedBrand !== 'all' && (
                <span className="bg-slate-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1">
                  <span>Brand: {selectedBrand}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-rose-600" onClick={() => setSelectedBrand('all')} />
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="bg-slate-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1">
                  <span>Category: {selectedCategory}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-rose-600" onClick={() => setSelectedCategory('all')} />
                </span>
              )}
              {selectedGender !== 'all' && (
                <span className="bg-slate-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1">
                  <span>Gender: {selectedGender}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-rose-600" onClick={() => setSelectedGender('all')} />
                </span>
              )}
            </div>

            {/* Sorting Select Dropdown */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 outline-none cursor-pointer focus:border-slate-800"
              >
                <option value="featured">Featured / Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length > 0 ? (
            <div 
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' } as React.CSSProperties}
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlist.includes(product.id)}
                  primaryColor={primaryColor}
                  onToggleWishlist={toggleWishlist}
                  onOpenDetail={openProductDetail}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs my-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white/90 shadow-sm bg-slate-900"
              >
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                No Watches Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                Your search or selected filters did not match any watches. Try resetting your filters.
              </p>
              <button
                onClick={resetAllFilters}
                className="mt-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all cursor-pointer"
              >
                View All Watches
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
