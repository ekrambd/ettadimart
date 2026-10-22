import React from 'react';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  primaryColor?: string;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onOpenDetail: (product: Product) => void;
  onOpenPdf?: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow?: (product: Product) => void;
}

export const ProductCard = React.memo(function ProductCard({
  product,
  isWishlisted,
  primaryColor = '#e11d48',
  onToggleWishlist,
  onOpenDetail,
  onAddToCart,
  onBuyNow,
}: ProductCardProps) {
  const lowestVariant = product.hasVariants && product.variants?.length
    ? product.variants.reduce((prev, curr) => (prev.price < curr.price ? prev : curr))
    : null;
  const regPrice = lowestVariant ? lowestVariant.regularPrice : product.regularPrice;
  const currentPrice = lowestVariant ? lowestVariant.price : product.price;
  const hasDiscount = regPrice && regPrice > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((regPrice - currentPrice) / regPrice) * 100) : 0;
  const isOutOfStock = (product.stock ?? 0) <= 0 && !product.continueSelling;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-slate-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group relative">
      {/* 1. Full-Width Edge-to-Edge Watch Cover Image */}
      <div 
        onClick={() => onOpenDetail(product)}
        className="relative w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group/img select-none"
      >
        {/* Top Left Badge (New Arrival or Discount) */}
        <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
          {product.isNewArrival ? (
            <span className="bg-[#00b862] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
              NEW
            </span>
          ) : hasDiscount ? (
            <span className="bg-[#e11d48] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
              -{discountPercent}%
            </span>
          ) : null}
        </div>

        {/* Top Right Floating Glassmorphic Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id, e);
          }}
          className="absolute top-2 right-2 p-1.5 bg-white/85 hover:bg-white backdrop-blur-md rounded-full text-slate-500 hover:text-rose-500 shadow-xs hover:shadow-md transition-all duration-200 z-20 cursor-pointer hover:scale-110 active:scale-95"
          title="Wishlist"
          aria-label="Wishlist"
        >
          <Heart className={`h-3.5 w-3.5 transition-colors ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Watch Image with Full-Width Object Cover */}
        <img
          src={product.image || 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80'}
          alt={`${product.title} - ${product.brand || 'Watch'}`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Quick View Hover Bar */}
        <div className="absolute inset-x-0 bottom-0 py-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
          <Eye className="w-3 h-3" />
          <span>QUICK VIEW</span>
        </div>
      </div>

      {/* 2. Product Information & Pricing Section (Compact & Sleek) */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between bg-white">
        <div className="space-y-0.5">
          {/* Brand Name & Category */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black text-rose-600 tracking-widest uppercase truncate">
              {product.brand || 'TIMEPIECE'}
            </span>
            {product.category && (
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider truncate">
                {product.category}
              </span>
            )}
          </div>

          {/* Model / Subtitle / Title */}
          <h3 
            onClick={() => onOpenDetail(product)}
            className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug line-clamp-1 cursor-pointer hover:text-rose-600 transition-colors"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Subtitle / Spec Line */}
          {product.subtitle && (
            <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* Price & Action Button */}
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                Tk. {currentPrice.toLocaleString('en-US')}
              </span>
              {hasDiscount && (
                <span className="text-[10px] sm:text-[11px] text-slate-400 line-through font-medium">
                  Tk. {regPrice?.toLocaleString('en-US')}
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                SAVE Tk. {(regPrice! - currentPrice).toLocaleString('en-US')}
              </span>
            )}
          </div>

          {/* Full-width Add to Cart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isOutOfStock) return;
              onAddToCart(product, 1);
            }}
            disabled={isOutOfStock}
            className={`w-full mt-2 py-1.5 sm:py-2 px-2.5 text-white text-[11px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 shadow-xs cursor-pointer active:scale-[0.98] ${
              isOutOfStock 
                ? 'bg-slate-300 cursor-not-allowed opacity-70' 
                : 'bg-slate-900 hover:bg-[#e11d48] hover:shadow-md'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>{isOutOfStock ? 'Out of Stock' : 'Add To Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});
