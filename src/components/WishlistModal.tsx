import React from 'react';
import { Heart, X } from 'lucide-react';
import { Product } from '../types';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: string[];
  products: Product[];
  handleAddToCart: (product: Product, qty: number) => void;
  openCart: () => void;
  toggleWishlist: (productId: string, e: React.MouseEvent) => void;
}

const WishlistModal = React.memo(function WishlistModal({
  isOpen,
  onClose,
  wishlist,
  products,
  handleAddToCart,
  openCart,
  toggleWishlist
}: WishlistModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 fill-white" />
            <h3 className="font-extrabold text-base">Wishlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-rose-700 rounded-full transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {wishlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.filter(p => wishlist.includes(p.id)).map((product) => (
                <div key={product.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3 items-center">
                  <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="w-14 h-16 object-contain rounded-lg bg-white p-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{product.title}</h4>
                    <p className="text-[11px] text-slate-500">{product.authorName || product.subtitle}</p>
                    <p className="font-extrabold text-rose-600 text-xs mt-1">Tk.{product.price.toLocaleString('bn-BD')}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        handleAddToCart(product, 1);
                        onClose();
                        openCart();
                      }}
                      className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                    >
                      buy
                    </button>
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="text-[10px] text-rose-600 font-bold hover:underline"
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">You have no books in your favorites list.</p>
              <p>Sort the list of favorites by clicking on the heart icon above the book.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WishlistModal;
