import React, { useState, useMemo, useEffect } from 'react';
import { 
  X,
  Plus, 
  Minus, 
  Check, 
  ShoppingBag, 
  CheckCircle2, 
  MessageCircle,
  RefreshCw,
  Tag,
  Trash2
} from 'lucide-react';
import { Product, ProductVariant, BookOrder, EcomSettings, Coupon } from '../types';
import { dbService, DEFAULT_DELIVERY_METHODS } from '../lib/dbService';
import { trackEvent, createEventId } from '../lib/pixelGtmService';
import { playOrderSuccessVibe } from '../lib/soundUtils';
import { validateBDPhone, validateDeliveryAddress, sanitizeBDPhoneInput } from '../lib/validationUtils';
import { calculateDeliveryCharge } from '../lib/deliveryUtils';
import { useAppStore } from '../store/useAppStore';

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedVariant?: string;
  variant?: ProductVariant;
}

interface CheckoutPageProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
  onClearCart: () => void;
  ecomSettings: EcomSettings;
  onNavigateHome: () => void;
  onNavigateShop: () => void;
  onOpenLoginModal?: () => void;
}

export default function CheckoutPage({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  ecomSettings,
  onNavigateHome,
  onNavigateShop,
}: CheckoutPageProps) {
  // Form State (matching screenshot fields)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');

  // Dynamic Store Settings & Delivery Methods from Admin Panel
  const [liveSettings, setLiveSettings] = useState<EcomSettings>(ecomSettings);

  useEffect(() => {
    if (ecomSettings) {
      setLiveSettings(ecomSettings);
    }
    // Fetch live settings on mount to ensure real-time synchronization with Admin changes
    dbService.getEcomSettings().then(fresh => {
      if (fresh) {
        setLiveSettings(fresh);
      }
    }).catch(() => {});
  }, [ecomSettings]);

  // Cart Calculations
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const isWholesaler = currentCustomer?.customerType === 'wholesaler';

  const getItemEffectivePrice = (item: CartItem) => {
    if (
      isWholesaler &&
      item.product.isWholesaleAvailable &&
      item.product.wholesalePrice != null &&
      item.product.wholesalePrice > 0 &&
      item.quantity >= (item.product.minOrderQty || 1)
    ) {
      return Number(item.product.wholesalePrice);
    }
    return item.variant?.price ?? item.product.price;
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (getItemEffectivePrice(item) * item.quantity), 0);
  }, [cart, isWholesaler]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Free delivery logic: Store threshold OR product-level "Free delivery" toggle
  const isFreeDelivery = useMemo(() => {
    const storeWideFree = Boolean(
      liveSettings?.freeDeliveryEnabled && 
      liveSettings?.freeDeliveryMinPurchase && 
      cartSubtotal >= liveSettings.freeDeliveryMinPurchase
    );

    const productFree = cart.length > 0 && cart.some(item => 
      item.product.deliveryChargeEnabled === false || 
      (item.product as any).freeDelivery === true ||
      (item.product as any).isFreeDelivery === true
    );

    return storeWideFree || productFree;
  }, [liveSettings, cartSubtotal, cart]);

  // Delivery Methods dynamically derived from Admin Panel settings with Weight-Based calculation
  const deliveryOptions = useMemo(() => {
    const list = (liveSettings?.deliveryMethods && liveSettings.deliveryMethods.length > 0)
      ? liveSettings.deliveryMethods
      : DEFAULT_DELIVERY_METHODS;

    const activeList = list.filter(m => m.status === 'Active');
    const sourceList = activeList.length > 0 ? activeList : list;

    return sourceList.map(m => {
      const calc = calculateDeliveryCharge({
        items: cart,
        method: m,
        settings: liveSettings,
        isFreeDelivery
      });

      return {
        id: m.id,
        title: m.title,
        charge: calc.totalCharge,
        baseCharge: calc.baseCharge,
        extraCharge: calc.extraCharge,
        baseWeightKg: calc.baseWeightKg,
        totalWeightKg: calc.totalWeightKg,
        extraWeightKg: calc.extraWeightKg,
        extraPerKgRate: calc.extraPerKgRate,
        isWeightBased: calc.isWeightBased,
        weightBreakdownText: calc.weightBreakdownText,
        zone: m.title
      };
    });
  }, [liveSettings, cart, isFreeDelivery]);

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('');

  useEffect(() => {
    if (deliveryOptions.length > 0) {
      if (!selectedDeliveryId || !deliveryOptions.some(o => o.id === selectedDeliveryId)) {
        setSelectedDeliveryId(deliveryOptions[0].id);
      }
    }
  }, [deliveryOptions, selectedDeliveryId]);

  const selectedDelivery = useMemo(() => {
    return deliveryOptions.find(o => o.id === selectedDeliveryId) || deliveryOptions[0] || { 
      id: 'default', 
      title: 'ডেলিভারি', 
      charge: 0, 
      zone: 'Default',
      baseCharge: 0,
      extraCharge: 0,
      baseWeightKg: 1,
      totalWeightKg: 0,
      extraWeightKg: 0,
      extraPerKgRate: 0,
      isWeightBased: false
    };
  }, [deliveryOptions, selectedDeliveryId]);

  const deliveryCost = isFreeDelivery ? 0 : selectedDelivery.charge;

  // Coupon Logic
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    dbService.getCoupons().then(list => {
      setAvailableCoupons(list.filter(c => c.status === 'Active'));
    }).catch(() => {});
  }, []);

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percentage' || (appliedCoupon.type as any) === 'percent') {
      const disc = Math.round((cartSubtotal * appliedCoupon.discount) / 100);
      return appliedCoupon.maxDiscount ? Math.min(disc, appliedCoupon.maxDiscount) : disc;
    }
    return Math.min(appliedCoupon.discount, cartSubtotal);
  }, [appliedCoupon, cartSubtotal]);

  const grandTotal = Math.max(0, cartSubtotal + deliveryCost - couponDiscountAmount);

  // Track InitiateCheckout on checkout view entry
  useEffect(() => {
    if (cart.length > 0) {
      const eventId = createEventId('initiate_checkout');
      trackEvent('InitiateCheckout', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: grandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemCount,
        contents: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          quantity: item.quantity,
          item_price: item.product.price
        }))
      }, eventId);
    }
  }, []);

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetCode = couponCodeInput.trim();
    if (!targetCode) return;
    setCouponError('');
    setCouponSuccess('');

    const match = availableCoupons.find(c => c.code.toLowerCase() === targetCode.toLowerCase());
    if (!match) {
      setCouponError('কুপন কোডটি সঠিক নয় বা মেয়াদোত্তীর্ণ।');
      return;
    }
    if (match.minSpent && cartSubtotal < match.minSpent) {
      setCouponError(`এই কুপনের জন্য নূন্যতম ৳${match.minSpent.toLocaleString()} অর্ডারের প্রয়োজন।`);
      return;
    }
    setAppliedCoupon(match);
    setCouponSuccess(`কুপন "${match.code}" সফলভাবে যুক্ত হয়েছে!`);
    setCouponCodeInput('');
  };

  // Order Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<BookOrder | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }

    const phoneVal = validateBDPhone(phone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.error || '');
      alert(phoneVal.error || 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
      return;
    }
    setPhoneError('');

    const addrVal = validateDeliveryAddress(address);
    if (!addrVal.isValid) {
      setAddressError(addrVal.error || '');
      alert(addrVal.error || 'অনুগ্রহ করে সম্পূর্ণ বিস্তারিত ঠিকানা লিখুন।');
      return;
    }
    setAddressError('');

    if (cart.length === 0) {
      alert('আপনার শপিং ব্যাগ খালি। অনুগ্রহ করে পণ্য যোগ করুন।');
      return;
    }
    if (!agreeTerms) {
      alert('অর্ডার সম্পন্ন করতে শর্তাবলী ও নীতিমালায় সম্মতি দিন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderId = `SB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const orderPayload: BookOrder = {
        id: orderId,
        customerName: name.trim(),
        name: name.trim(),
        phone: phoneVal.cleanedPhone,
        address: addrVal.cleanedAddress,
        district: selectedDelivery.zone,
        deliveryArea: selectedDelivery.title,
        deliveryZone: selectedDelivery.title,
        deliveryCharge: deliveryCost,
        price: cartSubtotal,
        unitPrice: cart.length === 1 ? (cart[0].variant?.price ?? cart[0].product.price) : cartSubtotal,
        totalAmount: grandTotal,
        totalPrice: grandTotal,
        productName: cart.map(i => `${i.product.title}${i.variant?.name ? ` (${i.variant.name})` : ''} (x${i.quantity})`).join(', '),
        productTitle: cart.map(i => `${i.product.title}${i.variant?.name ? ` (${i.variant.name})` : ''} (x${i.quantity})`).join(', '),
        status: 'Pending',
        orderType: 'storefront',
        paymentMethod: 'COD',
        paymentGateway: 'Cash on Delivery',
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
        quantity: totalItemCount,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        items: cart.map(i => ({
          product: {
            id: i.product.id,
            title: i.variant?.name ? `${i.product.title} - ${i.variant.name}` : i.product.title,
            price: i.variant?.price ?? i.product.price,
            regularPrice: i.variant?.regularPrice ?? i.product.regularPrice,
            image: i.variant?.image || i.product.coverImage || i.product.image,
            category: i.product.category,
            stock: i.product.stock || 100,
            isAvailable: true
          },
          quantity: i.quantity,
          variant: i.variant
        }))
      };

      // Server-side authoritative checkout API
      let confirmedOrder: BookOrder = orderPayload;
      try {
        const response = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            deliveryZone: selectedDelivery.title,
            deliveryCharge: deliveryCost,
            deliveryMethodId: selectedDelivery.id,
            paymentMethod: 'Cash on Delivery',
            couponCode: appliedCoupon?.code,
            items: cart.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              variantId: item.variant?.id,
              variantName: item.variant?.name
            }))
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result && result.order) {
            confirmedOrder = result.order;
          }
        } else {
          await dbService.addBookOrder(orderPayload);
        }
      } catch {
        await dbService.addBookOrder(orderPayload);
      }

      // Track Purchase Event
      const purchaseEventId = createEventId('purchase');
      trackEvent('Purchase', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: grandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemCount,
        contents: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          quantity: item.quantity,
          item_price: item.product.price
        }))
      }, purchaseEventId);

      playOrderSuccessVibe();
      setOrderSuccess(confirmedOrder);
      onClearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Order placement failed:', err);
      alert('অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ORDER SUCCESS SCREEN
  if (orderSuccess) {
    const contactWa = (ecomSettings?.whatsappNumber || '8801329458568').replace(/[^0-9]/g, '');
    return (
      <div className="min-h-screen bg-[#f7f6f2] py-8 sm:py-16 px-4 flex items-center justify-center font-sans animate-fadeIn">
        <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">আপনার অর্ডার সফল হয়েছে!</h1>
            <p className="text-sm text-slate-600">
              ধন্যবাদ <span className="font-semibold text-slate-900">{orderSuccess.customerName}</span>! আমাদের প্রতিনিধি আপনাকে কল করে দ্রুত কনফার্ম করবেন।
            </p>
          </div>

          <div className="p-5 bg-[#faf9f6] rounded-2xl border border-slate-200 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500">অর্ডার ট্র্যাকিং আইডি:</span>
              <span className="font-mono font-bold text-slate-900">{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500">সর্বমোট প্রদেয় মূল্য:</span>
              <span className="font-extrabold text-slate-950 text-base sm:text-lg">{(orderSuccess.totalAmount || orderSuccess.totalPrice || 0).toLocaleString()} TK</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500">পেমেন্ট মেথড:</span>
              <span className="font-semibold text-slate-800">ক্যাশ অন ডেলিভারি (COD)</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 shrink-0">ডেলিভারি ঠিকানা:</span>
              <span className="font-medium text-slate-800 text-right">{orderSuccess.address}</span>
            </div>
          </div>

          {/* 1-Click WhatsApp Order Confirmation */}
          <a
            href={`https://wa.me/${contactWa}?text=${encodeURIComponent(
              `Hello ${ecomSettings?.storeName || 'ETTADI MART'},\nআমি একটি অর্ডার করেছি!\nঅর্ডার আইডি: #${orderSuccess.id}\nসর্বমোট: ${(orderSuccess.totalAmount || orderSuccess.totalPrice || 0).toLocaleString()} TK\nনাম: ${orderSuccess.customerName}\nমোবাইল: ${orderSuccess.customerPhone || orderSuccess.phone}\nঠিকানা: ${orderSuccess.address}\nঅনুগ্রহ করে ডেলিভারি কনফার্ম করুন!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            WhatsApp-এ অর্ডার কনফার্ম করুন
          </a>

          <button
            type="button"
            onClick={onNavigateShop}
            className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            আরো পণ্য কিনুন (Continue Shopping)
          </button>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT UX (Matching Naturo BD Screenshot Exactly)
  return (
    <div className="min-h-screen bg-[#f7f6f2] py-4 sm:py-8 px-2 sm:px-4 flex items-center justify-center font-sans">
      <div className="max-w-4xl w-full bg-[#faf9f6] rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            অর্ডার করুন - ক্যাশ অন ডেলিভারিতে
          </h1>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title="বন্ধ করুন"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">আপনার কার্টে কোন পণ্য নেই</p>
            <button
              type="button"
              onClick={onNavigateShop}
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer shadow-sm transition"
            >
              Explore Products
            </button>

          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            
            {/* 2-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
              
              {/* ============================================================
                  LEFT COLUMN: 1. আপনার পণ্য  +  2. ডেলিভারি
                  ============================================================ */}
              <div className="space-y-4 sm:space-y-5">
                
                {/* CARD 1: আপনার পণ্য */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      আপনার পণ্য
                    </h2>
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold">
                      {totalItemCount} টি
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                    {cart.map((item, idx) => {
                      const unitPrice = item.variant?.price ?? item.product.price ?? 0;
                      const img = item.variant?.image || item.product.coverImage || item.product.image || '/placeholder-image.svg';
                      const title = item.variant?.name ? `${item.product.title} - ${item.variant.name}` : item.product.title;
                      const variantKey = item.variant?.id;

                      return (
                        <div key={`${item.product.id}-${variantKey || idx}`} className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={title}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg border border-slate-100 bg-[#fafafa] p-1 shrink-0"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/placeholder-image.svg';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              {title}
                            </h4>
                            {item.product.vendorName && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                Seller: <span className="text-slate-600 font-semibold">{item.product.vendorName}</span>
                              </p>
                            )}
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              ৳{unitPrice.toLocaleString()}
                            </p>
                          </div>

                          {/* Stepper [-] [quantity] [+] */}
                          <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  onUpdateQuantity(item.product.id, item.quantity - 1, variantKey);
                                } else {
                                  onRemoveItem(item.product.id, variantKey);
                                }
                              }}
                              className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 py-1 text-xs font-bold text-slate-900 min-w-[1.75rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, variantKey)}
                              className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Direct Remove Item Button */}
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id, variantKey)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="কার্ট থেকে মুছে ফেলুন (Remove)"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotal Bottom Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs sm:text-sm font-semibold text-slate-600">
                      পণ্যের সাবটোটাল
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {cartSubtotal.toLocaleString()} TK
                    </span>
                  </div>
                </div>

                {/* CARD 2: ডেলিভারি */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    ডেলিভারি
                  </h2>

                  <div className="space-y-2.5">
                    {deliveryOptions.map((opt) => {
                      const isSelected = selectedDeliveryId === opt.id;
                      const chargeToDisplay = isFreeDelivery ? 0 : opt.charge;

                      return (
                        <label
                          key={opt.id}
                          onClick={() => setSelectedDeliveryId(opt.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-amber-400 bg-amber-50/40 shadow-xs ring-1 ring-amber-400' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'border-amber-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                            </span>
                            <div>
                              <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
                                {opt.title}
                              </span>
                              {opt.isWeightBased && opt.extraWeightKg > 0 && !isFreeDelivery && (
                                <span className="text-[11px] text-amber-700 block mt-0.5">
                                  বেস ৳{opt.baseCharge} ({opt.baseWeightKg} কেজি) + অতিরিক্ত {opt.extraWeightKg} কেজি ৳{opt.extraCharge}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                              {isFreeDelivery ? 'ফ্রি' : `${chargeToDisplay} TK`}
                            </span>
                            {opt.isWeightBased && opt.totalWeightKg > 0 && (
                              <span className="text-[10px] text-slate-500 block font-medium">
                                মোট ওজন: {opt.totalWeightKg} কেজি
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* ============================================================
                  RIGHT COLUMN: 3. গ্রাহকের তথ্য  +  4. মূল্য বিবরণ
                  ============================================================ */}
              <div className="space-y-4 sm:space-y-5">
                
                {/* CARD 3: অর্ডার করতে নিচের তথ্যগুলি দিন */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3.5">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    অর্ডার করতে নিচের তথ্যগুলি দিন
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm">
                    {/* নাম */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        নাম
                      </label>
                      <input
                        type="text"
                        placeholder="আপনার নাম"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* মোবাইল নাম্বার */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          মোবাইল নাম্বার <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          ১১ ডিজিট
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="tel"
                          inputMode="numeric"
                          placeholder="যেমন: 01315861003"
                          value={phone}
                          onKeyDown={(e) => {
                            if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                              return;
                            }
                            if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
                              return;
                            }
                            if (!/^[0-9০-৯\+]$/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            const clean = sanitizeBDPhoneInput(pasted);
                            setPhone(clean);
                            if (phoneError) setPhoneError('');
                            if (clean.length === 11) {
                              const val = validateBDPhone(clean);
                              if (!val.isValid) setPhoneError(val.error || '');
                              else setPhoneError('');
                            }
                          }}
                          onChange={(e) => {
                            const sanitized = sanitizeBDPhoneInput(e.target.value);
                            setPhone(sanitized);
                            if (phoneError) setPhoneError('');
                            if (sanitized.length === 11) {
                              const val = validateBDPhone(sanitized);
                              if (!val.isValid) setPhoneError(val.error || '');
                              else setPhoneError('');
                            }
                          }}
                          onBlur={() => {
                            if (phone.trim()) {
                              const val = validateBDPhone(phone);
                              if (!val.isValid) setPhoneError(val.error || '');
                              else setPhoneError('');
                            }
                          }}
                          required
                          className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border ${
                            phoneError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-400'
                          } rounded-xl focus:ring-1 outline-none transition text-slate-900 placeholder:text-slate-400 font-mono`}
                        />
                        {phone.length === 11 && !phoneError && (
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs select-none">
                            ✓
                          </span>
                        )}
                      </div>
                      {phoneError && (
                        <p className="text-[11px] text-red-600 mt-1 font-medium">{phoneError}</p>
                      )}
                    </div>

                    {/* ঠিকানা */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          সম্পূর্ণ ডেলিভারি ঠিকানা <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          বাসা/রোড আবশ্যক
                        </span>
                      </div>
                      <div className="relative">
                        <textarea
                          rows={3}
                          placeholder="যেমন: বাসা নং ১০, আদাবর, ঢাকা অথবা গ্রাম: মঙ্গলবাড়ি, থানা: ধামইরহাট, জেলা: নওগাঁ"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            if (addressError) setAddressError('');
                            if (e.target.value.trim().length >= 10) {
                              const val = validateDeliveryAddress(e.target.value);
                              if (val.isValid) setAddressError('');
                            }
                          }}
                          onBlur={() => {
                            if (address.trim()) {
                              const val = validateDeliveryAddress(address);
                              if (!val.isValid) setAddressError(val.error || '');
                              else setAddressError('');
                            }
                          }}
                          required
                          className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border ${
                            addressError ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-400'
                          } rounded-xl focus:ring-1 outline-none transition text-slate-900 placeholder:text-slate-400 resize-none`}
                        />
                        {address.trim().length >= 10 && validateDeliveryAddress(address).isValid && !addressError && (
                          <span className="absolute right-3.5 bottom-3.5 text-emerald-600 font-bold text-xs select-none">
                            ✓
                          </span>
                        )}
                      </div>
                      {addressError && (
                        <p className="text-[11px] text-red-600 mt-1 font-medium leading-tight">{addressError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 4: মূল্য বিবরণ */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    মূল্য বিবরণ
                  </h2>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>মোট</span>
                      <span className="font-bold text-slate-800">{cartSubtotal.toLocaleString()} TK</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span>ডেলিভারি চার্জ</span>
                        {selectedDelivery.isWeightBased && selectedDelivery.totalWeightKg > 0 && !isFreeDelivery && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            {selectedDelivery.totalWeightKg} কেজি
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-800">
                        {isFreeDelivery ? 'ফ্রি' : (deliveryCost > 0 ? `${deliveryCost} TK` : 'এলাকা নির্বাচন করুন')}
                      </span>
                    </div>

                    {selectedDelivery.isWeightBased && selectedDelivery.extraWeightKg > 0 && !isFreeDelivery && (
                      <div className="flex justify-between items-center text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60 font-medium">
                        <span>অতিরিক্ত ওজন চার্জ ({selectedDelivery.extraWeightKg} কেজি x ৳{selectedDelivery.extraPerKgRate}):</span>
                        <span className="font-bold">+{selectedDelivery.extraCharge} TK</span>
                      </div>
                    )}

                    {couponDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>কুপন ছাড়</span>
                        <span>-{couponDiscountAmount.toLocaleString()} TK</span>
                      </div>
                    )}

                    <div className="border-t border-slate-100 my-2" />

                    <div className="flex justify-between items-center text-slate-900">
                      <span className="font-bold text-sm sm:text-base">সর্বমোট</span>
                      <span className="font-extrabold text-base sm:text-lg text-slate-900">{grandTotal.toLocaleString()} TK</span>
                    </div>
                  </div>

                  {/* Optional Coupon Toggle */}
                  <div className="pt-1">
                    {!couponOpen && !appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => setCouponOpen(true)}
                        className="text-[11px] text-[#c5892b] hover:text-[#a36f1f] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        কুপন কোড আছে? (এখানে ক্লিক করুন)
                      </button>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="কুপন কোড লিখুন"
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none uppercase font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                          >
                            Apply
                          </button>
                        </div>
                        {couponError && <p className="text-[10px] text-rose-500 font-medium">{couponError}</p>}
                        {couponSuccess && <p className="text-[10px] text-emerald-600 font-medium">{couponSuccess}</p>}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* ============================================================
                BOTTOM FULL-WIDTH SECTION: Terms + Confirm CTA + Reassurance
                ============================================================ */}
            <div className="pt-2 sm:pt-4 space-y-3.5">
              
              {/* Terms & Policy Agreement */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#F37022] accent-[#F37022] rounded cursor-pointer shrink-0"
                />
                <span className="leading-relaxed">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                    className="text-[#F37022] underline font-medium hover:text-[#d95c10] inline p-0 bg-transparent border-0"
                  >
                    Terms & Conditions
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                    className="text-[#F37022] underline font-medium hover:text-[#d95c10] inline p-0 bg-transparent border-0"
                  >
                    Privacy Policy
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                    className="text-[#F37022] underline font-medium hover:text-[#d95c10] inline p-0 bg-transparent border-0"
                  >
                    Return Policy
                  </button>
                  .
                </span>
              </label>

              {/* Big Primary CTA Button (#F37022) */}
              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 sm:py-4 px-6 bg-[#F37022] hover:bg-[#d95c10] active:scale-[0.99] text-white font-bold text-base sm:text-lg rounded-xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 text-white">
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    Processing Order...
                  </span>
                ) : (
                  <span>Confirm Order — {grandTotal.toLocaleString()} BDT</span>
                )}
              </button>


              {/* Reassurance Subtitle */}
              <p className="text-center text-xs text-slate-500 font-medium pt-1">
                আমাদের একজন কাস্টমার প্রতিনিধি আপনাকে কল করে আবার কনফার্ম হবে
              </p>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
