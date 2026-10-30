import React, { useState, useMemo } from 'react';
import { 
  Search, ScanLine, Plus, Minus, Trash2, Printer, 
  RotateCcw, CheckCircle2, User, ChevronDown, Check,
  X, Tag, ShoppingCart, ArrowRight, Clock, DollarSign,
  Grid, List, Maximize2, Minimize2, Eye, FileText, MoreVertical, SlidersHorizontal, Download
} from 'lucide-react';
import { Product, BookOrder, Customer } from '../types';

export interface PosDraftOrder {
  id: string;
  reference: string;
  heldAt: string;
  heldTimestamp: number;
  heldBy: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    product: Product;
    quantity: number;
    unitPrice: number;
    selectedVariant?: any;
  }>;
  subTotal: number;
  discount: number;
  grandTotal: number;
}

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  onAddOrder: (order: BookOrder) => Promise<void> | void;
  activeSubView?: 'new_sale' | 'offline_sales' | 'draft_orders';
  onSubViewChange?: (view: 'new_sale' | 'offline_sales' | 'draft_orders') => void;
  orders: BookOrder[];
}

export default function PosView({
  products,
  customers,
  onAddOrder,
  activeSubView = 'new_sale',
  onSubViewChange,
  orders
}: PosViewProps) {
  // Current view mode
  const currentSubView = activeSubView;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'default' | 'price_low' | 'price_high' | 'name'>('default');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Offline Sales search & date filter
  const [salesSearchQuery, setSalesSearchQuery] = useState('');

  // Cart / Counter State
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
    unitPrice: number;
    selectedVariant?: any;
  }>>([]);

  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Discount & Payment
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');

  // Checkout / Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'bKash' | 'Nagad'>('Cash');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Full-page invoice modal matching readygrocery /pos/:id/invoice screen
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<BookOrder | null>(null);

  // Action menu dropdown state for offline sales & drafts
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Drafts stored in localStorage
  const [drafts, setDrafts] = useState<PosDraftOrder[]>(() => {
    try {
      const stored = localStorage.getItem('ettadi_pos_drafts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveDraftsToStorage = (newDrafts: PosDraftOrder[]) => {
    setDrafts(newDrafts);
    try {
      localStorage.setItem('ettadi_pos_drafts', JSON.stringify(newDrafts));
    } catch {}
  };

  // Distinct categories and brands
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.brand) set.add(p.brand);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory);
    }

    if (selectedBrand !== 'All') {
      list = list.filter(p => p.brand === selectedBrand);
    }

    if (sortBy === 'price_low') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return list;
  }, [products, searchTerm, selectedCategory, selectedBrand, sortBy]);

  // Offline Sales list
  const offlineOrders = useMemo(() => {
    let list = orders.filter(o => o.orderType === 'physical' || o.source === 'pos' || o.paymentMethod === 'Cash');
    if (salesSearchQuery.trim()) {
      const q = salesSearchQuery.toLowerCase();
      list = list.filter(o => 
        o.id.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.phone && o.phone.includes(q))
      );
    }
    return list;
  }, [orders, salesSearchQuery]);

  // Calculations
  const subTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal - discountAmount);
  }, [subTotal, discountAmount]);

  const totalUnits = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Cart operations
  // Helper to compute unit price depending on customer wholesale tier
  const getProductPriceForCustomer = (product: Product, quantity: number, customer: Customer | null) => {
    const isWholesaler = customer?.customerType === 'wholesaler';
    if (
      isWholesaler &&
      product.isWholesaleAvailable &&
      product.wholesalePrice != null &&
      product.wholesalePrice > 0 &&
      quantity >= (product.minOrderQty || 1)
    ) {
      return Number(product.wholesalePrice);
    }
    return Number(product.price || 0);
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + 1;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: newQty,
          unitPrice: getProductPriceForCustomer(product, newQty, selectedCustomer)
        };
        return next;
      }
      return [...prev, {
        product,
        quantity: 1,
        unitPrice: getProductPriceForCustomer(product, 1, selectedCustomer)
      }];
    });
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart(prev => {
      const next = [...prev];
      const prod = next[index].product;
      next[index] = {
        ...next[index],
        quantity: newQty,
        unitPrice: getProductPriceForCustomer(prod, newQty, selectedCustomer)
      };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setSelectedCustomer(null);
  };

  // Hold / Save as Draft
  const handleSaveDraft = () => {
    if (cart.length === 0) return;
    const refNum = `#VK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newDraft: PosDraftOrder = {
      id: `draft_${Date.now()}`,
      reference: refNum,
      heldAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      heldTimestamp: Date.now(),
      heldBy: 'Super Admin',
      customerName: selectedCustomer?.name || 'Walk-in',
      customerPhone: selectedCustomer?.phone || '',
      items: [...cart],
      subTotal,
      discount: discountAmount,
      grandTotal
    };

    saveDraftsToStorage([newDraft, ...drafts]);
    handleClearCart();
    alert(`Sale held successfully as draft (${refNum})!`);
  };

  // Resume Draft
  const handleResumeDraft = (draft: PosDraftOrder) => {
    setCart(draft.items);
    setDiscountAmount(draft.discount);
    if (draft.customerName && draft.customerName !== 'Walk-in') {
      setSelectedCustomer({
        id: `cust_${Date.now()}`,
        name: draft.customerName,
        phone: draft.customerPhone || '',
        address: ''
      });
    } else {
      setSelectedCustomer(null);
    }
    saveDraftsToStorage(drafts.filter(d => d.id !== draft.id));
    if (onSubViewChange) onSubViewChange('new_sale');
  };

  const handleDeleteDraft = (draftId: string) => {
    saveDraftsToStorage(drafts.filter(d => d.id !== draftId));
  };

  // Apply Discount Modal
  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput) || 0;
    if (discountType === 'percent') {
      const calc = (subTotal * val) / 100;
      setDiscountAmount(Math.round(calc));
    } else {
      setDiscountAmount(val);
    }
    setIsDiscountModalOpen(false);
  };

  // Complete Payment & Place POS Order with #RC0000XX format matching screenshots
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsProcessingPayment(true);

    try {
      const nextSeq = 12 + offlineOrders.length;
      const orderId = `#RC${String(nextSeq).padStart(6, '0')}`;
      const customerName = selectedCustomer?.name || 'Walk-in customer';
      const customerPhone = selectedCustomer?.phone || '01000000001';
      const customerAddress = selectedCustomer?.address || '2515 Walker Spurs East Kody, CA 16008';

      const newOrder: BookOrder = {
        id: orderId,
        customerName,
        phone: customerPhone,
        address: customerAddress,
        quantity: totalUnits,
        deliveryCharge: 0,
        price: grandTotal,
        totalPrice: grandTotal,
        totalAmount: grandTotal,
        couponDiscount: discountAmount,
        status: 'Paid',
        paymentMethod: paymentMethod === 'Cash' ? 'Cash Payment' : `${paymentMethod} Payment`,
        orderType: 'physical',
        source: 'pos',
        createdAt: new Date().toISOString(),
        orderDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        items: cart.map(i => ({
          product: i.product,
          quantity: i.quantity,
          variant: i.selectedVariant
        }))
      };

      await onAddOrder(newOrder);
      setActiveInvoiceOrder(newOrder);
      setIsPaymentModalOpen(false);
      handleClearCart();
    } catch (err) {
      console.error('POS Sale error:', err);
      alert('Error creating POS order. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Customer filter
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customers, customerSearchQuery]);

  return (
    <div className="w-full">
      {/* =========================================================================
          VIEW 1: NEW SALE (READYGROCERY DUAL-PANE POS SCREEN)
         ========================================================================= */}
      {currentSubView === 'new_sale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Product Search, Catalog Filters, Grid/List (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            
            {/* Top Bar: Search by name, code, brand or category */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, code, brand or category..."
                className="w-full pl-11 pr-11 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <ScanLine className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
            </div>

            {/* Filter Row: Category, Brand, Sort, Grid/List Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Products</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  {filteredProducts.length} items
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Brand Filter */}
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="All">All brands</option>
                  {brands.filter(b => b !== 'All').map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="All">All categories</option>
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="default">Sort: Default</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>

                {/* Grid / List Layout toggle */}
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 rounded-md cursor-pointer transition-all ${
                      layoutMode === 'grid' 
                        ? 'bg-emerald-600 text-white shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={`p-1.5 rounded-md cursor-pointer transition-all ${
                      layoutMode === 'list' 
                        ? 'bg-emerald-600 text-white shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product List Canvas */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No products found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting search query or selected category</p>
              </div>
            ) : layoutMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const inCart = cart.find(i => i.product.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="group bg-white rounded-xl border border-slate-200 hover:border-emerald-500/60 p-3 flex flex-col justify-between transition-all hover:shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="relative w-full aspect-square rounded-lg bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center">
                          <img
                            src={p.image || '/placeholder-image.svg'}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {inCart && (
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                              {inCart.quantity} in cart
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-semibold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {p.title}
                          </h4>
                          <p className="text-sm font-bold text-emerald-600 mt-0.5">
                            Tk. {(p.price || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            In stock: {p.stock ?? 100}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image || '/placeholder-image.svg'}
                        alt={p.title}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-800">{p.title}</h4>
                        <span className="text-xs text-slate-400">{p.category || 'General'} · Stock: {p.stock ?? 100}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-emerald-600">
                        Tk. {(p.price || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 text-xs font-bold cursor-pointer transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Current Sale Counter & Checkout Till (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header: Title, Live Status, Clear button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Current Sale</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {drafts.length > 0 && (
                    <button
                      onClick={() => onSubViewChange && onSubViewChange('draft_orders')}
                      className="text-xs text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      Held ({drafts.length})
                    </button>
                  )}
                  {cart.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Selector / Search */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || 'No phone'})` : customerSearchQuery}
                      onChange={(e) => {
                        setSelectedCustomer(null);
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      placeholder="Search customer by name or phone..."
                      className="w-full pl-3 pr-8 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                    />
                    {selectedCustomer && (
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New</span>
                  </button>
                </div>

                {/* Dropdown Customer Matches */}
                {isCustomerDropdownOpen && !selectedCustomer && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Walk-in Customer (Guest)
                    </button>
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerDropdownOpen(false);
                          // Recalculate cart items pricing for this customer
                          setCart(prev => prev.map(item => ({
                            ...item,
                            unitPrice: getProductPriceForCustomer(item.product, item.quantity, c)
                          })));
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-800 hover:bg-emerald-50/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{c.name}</span>
                          {c.customerType === 'wholesaler' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-md border border-amber-200">
                              Wholesaler
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Counter Table */}
              <div className="min-h-[220px] max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-slate-300 text-center">
                    <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-600">Nothing on the counter</p>
                    <p className="text-xs text-slate-400 mt-0.5">Scan a code or tap Add on a product.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 font-medium">
                        <th className="py-2">#</th>
                        <th className="py-2">ITEM</th>
                        <th className="py-2 text-center">QTY</th>
                        <th className="py-2 text-right">TOTAL</th>
                        <th className="py-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item, idx) => (
                        <tr key={item.product.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={item.product.image || '/placeholder-image.svg'}
                                alt={item.product.title}
                                className="w-8 h-8 rounded-md object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate max-w-[140px]">
                                  {item.product.title}
                                </p>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Tk. {item.unitPrice}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="inline-flex items-center border border-slate-200 rounded-md bg-white">
                              <button
                                onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                                className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2 py-0.5 font-bold text-slate-800 text-[11px] min-w-5">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                                className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-800 font-mono">
                            Tk. {(item.unitPrice * item.quantity).toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Bottom Billing Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>{cart.length} items · {totalUnits} units</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Sub Total</span>
                  <span className="font-bold text-slate-800 font-mono">Tk. {subTotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Discount</span>
                    <button
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] cursor-pointer inline-flex items-center gap-0.5"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>{discountAmount > 0 ? 'Edit' : 'Add Discount'}</span>
                    </button>
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {discountAmount > 0 ? `- Tk. ${discountAmount.toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>

              {/* Grand Total Highlight Badge */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-950">Grand Total</span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  Tk. {grandTotal.toLocaleString()}
                </span>
              </div>

              {/* Action Buttons: Print, Save as Draft, Proceed to Payment */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    const tempOrder: BookOrder = {
                      id: `#RC${Date.now().toString().slice(-6)}`,
                      customerName: selectedCustomer?.name || 'Walk-in customer',
                      phone: selectedCustomer?.phone || '01000000001',
                      address: selectedCustomer?.address || '2515 Walker Spurs East Kody, CA 16008',
                      quantity: totalUnits,
                      deliveryCharge: 0,
                      price: grandTotal,
                      totalPrice: grandTotal,
                      totalAmount: grandTotal,
                      status: 'Paid',
                      paymentMethod: 'Cash Payment',
                      createdAt: new Date().toISOString(),
                      orderDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                      items: cart.map(i => ({ product: i.product, quantity: i.quantity }))
                    };
                    setActiveInvoiceOrder(tempOrder);
                  }}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleSaveDraft}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Save as Draft</span>
                </button>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: OFFLINE SALES (HISTORY OF TILL SALES - MATCHING IMAGE 1)
         ========================================================================= */}
      {currentSubView === 'offline_sales' && (
        <div className="space-y-5">
          {/* Top KPI Cards (Sales, Paid, Unpaid, Taken, Average sale) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{offlineOrders.length}</p>
                <p className="text-xs text-slate-400 font-medium">Sales</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{offlineOrders.length}</p>
                <p className="text-xs text-slate-400 font-medium">Paid</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">0</p>
                <p className="text-xs text-slate-400 font-medium">Unpaid</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">
                  Tk. {offlineOrders.reduce((a, b) => a + (b.totalAmount || b.price || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 font-medium">Taken</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">
                  Tk. {offlineOrders.length > 0 ? Math.round(offlineOrders.reduce((a, b) => a + (b.totalAmount || b.price || 0), 0) / offlineOrders.length).toLocaleString() : 0}
                </p>
                <p className="text-xs text-slate-400 font-medium">Average sale</p>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={salesSearchQuery}
                  onChange={(e) => setSalesSearchQuery(e.target.value)}
                  placeholder="Search by invoice or customer..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>Columns</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>Filter</span>
                </button>
                <button
                  onClick={() => onSubViewChange && onSubViewChange('new_sale')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Sale</span>
                </button>
              </div>
            </div>

            {offlineOrders.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">No sales in this period</h4>
                <p className="text-xs text-slate-400">Try another date range, or ring one up at the till.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-400 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">INVOICE</th>
                      <th className="py-3 px-4">SOLD AT</th>
                      <th className="py-3 px-4">CUSTOMER</th>
                      <th className="py-3 px-4 text-center">ITEMS</th>
                      <th className="py-3 px-4">TOTAL AMOUNT</th>
                      <th className="py-3 px-4">PAYMENT STATUS</th>
                      <th className="py-3 px-4">PAYMENT METHOD</th>
                      <th className="py-3 px-4 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {offlineOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {ord.id.startsWith('#') ? ord.id : `#${ord.id}`}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">
                            {new Date(ord.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              WC
                            </span>
                            <span className="font-semibold text-slate-800">{ord.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">
                            {ord.quantity || 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          Tk. {(ord.totalAmount || ord.price || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>Paid</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                            <span className="text-emerald-600">💵</span>
                            <span>{ord.paymentMethod || 'Cash Payment'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center relative">
                          <button
                            onClick={() => setActiveActionMenuId(activeActionMenuId === ord.id ? null : ord.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {activeActionMenuId === ord.id && (
                            <div className="absolute right-4 top-10 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 divide-y divide-slate-100 text-left">
                              <button
                                onClick={() => {
                                  setActiveInvoiceOrder(ord);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View Invoice</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveInvoiceOrder(ord);
                                  setActiveActionMenuId(null);
                                  setTimeout(() => window.print(), 300);
                                }}
                                className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold flex items-center gap-2 cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Print Invoice</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
              <span>Showing 1 to {offlineOrders.length} of {offlineOrders.length} sales</span>
              <div className="inline-flex items-center gap-1">
                <span>10 / page</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DRAFT ORDERS (HELD CARTS READY TO RESUME - MATCHING IMAGE 3)
         ========================================================================= */}
      {currentSubView === 'draft_orders' && (
        <div className="space-y-5">
          {/* Top KPI Cards (Held sales, Items waiting, Value held, Oldest) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{drafts.length}</p>
                <p className="text-xs text-slate-400 font-medium">Held sales</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">
                  {drafts.reduce((a, b) => a + b.items.reduce((s, i) => s + i.quantity, 0), 0)}
                </p>
                <p className="text-xs text-slate-400 font-medium">Items waiting</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">
                  Tk. {drafts.reduce((a, b) => a + b.grandTotal, 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 font-medium">Value held</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {drafts.length > 0 ? `${Math.round((Date.now() - (drafts[0].heldTimestamp || Date.now())) / 1000)} seconds` : '—'}
                </p>
                <p className="text-xs text-slate-400 font-medium">Oldest</p>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by reference or cashier..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>Columns</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span>Filter</span>
                </button>
                <button
                  onClick={() => onSubViewChange && onSubViewChange('new_sale')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Sale</span>
                </button>
              </div>
            </div>

            {drafts.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <RotateCcw className="h-10 w-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">Nothing is being held</h4>
                <p className="text-xs text-slate-400">A sale put aside at the till turns up here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-400 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">REFERENCE</th>
                      <th className="py-3 px-4">HELD SINCE</th>
                      <th className="py-3 px-4">HELD BY</th>
                      <th className="py-3 px-4">CUSTOMER</th>
                      <th className="py-3 px-4 text-center">ITEMS</th>
                      <th className="py-3 px-4">TOTAL</th>
                      <th className="py-3 px-4 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drafts.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.reference}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{d.heldAt}</p>
                          <p className="text-[11px] text-slate-400">
                            {Math.round((Date.now() - (d.heldTimestamp || Date.now())) / 1000)} seconds ago
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              SA
                            </span>
                            <span className="font-semibold text-slate-800">{d.heldBy}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{d.customerName}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">
                            {d.items.reduce((acc, i) => acc + i.quantity, 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          Tk. {d.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center relative">
                          <button
                            onClick={() => setActiveActionMenuId(activeActionMenuId === d.id ? null : d.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {activeActionMenuId === d.id && (
                            <div className="absolute right-4 top-10 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 divide-y divide-slate-100 text-left">
                              <button
                                onClick={() => {
                                  handleResumeDraft(d);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-2 cursor-pointer"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                <span>Resume</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteDraft(d.id);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
              <span>Showing 1 to {drafts.length} of {drafts.length} held sales</span>
              <div className="inline-flex items-center gap-1">
                <span>10 / page</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT DISCOUNT
         ========================================================================= */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add Discount</h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  discountType === 'fixed' 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Fixed (Tk.)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  discountType === 'percent' 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Percentage (%)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount Value {discountType === 'percent' ? '(%)' : '(Tk.)'}
              </label>
              <input
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 150'}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD NEW CUSTOMER
         ========================================================================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add New Customer</h3>
              <button onClick={() => setIsNewCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rahim Chowdhury"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address (Optional)</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Dhaka"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCustName.trim() || !newCustPhone.trim()) {
                    alert('Please provide customer name and phone');
                    return;
                  }
                  const created: Customer = {
                    id: `cust_${Date.now()}`,
                    name: newCustName.trim(),
                    phone: newCustPhone.trim(),
                    address: newCustAddress.trim() || 'POS Walk-in'
                  };
                  setSelectedCustomer(created);
                  setIsNewCustomerModalOpen(false);
                  setNewCustName('');
                  setNewCustPhone('');
                  setNewCustAddress('');
                }}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: PAYMENT CONFIRMATION
         ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Payment Confirmation</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <span className="text-xs text-slate-500 font-medium">Payable Amount</span>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                Tk. {grandTotal.toLocaleString()}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Select Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Cash', 'Card', 'bKash', 'Nagad'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Paid / Change calculation if cash */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cash Received (Tk.)</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={String(grandTotal)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                {typeof cashReceived === 'number' && cashReceived >= grandTotal && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-900">Change Due</span>
                    <span className="font-bold text-blue-700 font-mono text-sm">
                      Tk. {(cashReceived - grandTotal).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleCompleteSale}
                className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessingPayment ? 'Processing...' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: FULL-PAGE CLEAN INVOICE VIEW (MATCHING IMAGE 2 EXACTLY)
          /shop/pos/:id/invoice layout
         ========================================================================= */}
      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl border border-slate-200">
            
            {/* Top Toolbar: Close and Print Buttons */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                POS Invoice &bull; {activeInvoiceOrder.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setActiveInvoiceOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Canvas (Formatted like image 2) */}
            <div id="printable-pos-invoice" className="bg-white space-y-6 text-slate-800 text-xs font-sans">
              
              {/* Header: Store Name & Invoice Title */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
                    🛒
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Ettadi Mart</h2>
                    <p className="text-[11px] text-slate-500">2515 Walker Spurs East Kody, CA 16008</p>
                    <p className="text-[11px] text-slate-500">01726275850</p>
                  </div>
                </div>

                <div className="text-right">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">INVOICE</h1>
                  <p className="text-xs font-mono font-bold text-slate-600">{activeInvoiceOrder.id}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(activeInvoiceOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Blue Divider Line */}
              <div className="h-0.5 bg-indigo-700 w-full" />

              {/* Customer & Total Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p><span className="text-slate-400">Bill To:</span> <span className="font-bold text-slate-900">{activeInvoiceOrder.customerName}</span></p>
                  <p><span className="text-slate-400">Address:</span> <span className="text-slate-700">{activeInvoiceOrder.address}</span></p>
                  <p><span className="text-slate-400">Email:</span> <span className="text-slate-700">{activeInvoiceOrder.email || '—'}</span></p>
                  <p><span className="text-slate-400">Phone:</span> <span className="font-mono text-slate-700">{activeInvoiceOrder.phone}</span></p>
                </div>

                <div className="text-right space-y-2 flex flex-col items-end">
                  <div>
                    <span className="text-xs text-slate-400">Invoice of (Tk.)</span>
                    <p className="text-xl font-black text-slate-900 font-mono">
                      Tk. {(activeInvoiceOrder.totalAmount || activeInvoiceOrder.price || 0).toLocaleString()}
                    </p>
                  </div>
                  {/* Decorative QR code mockup */}
                  <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded p-1 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                    [QR CODE]
                  </div>
                </div>
              </div>

              {/* Payment Method / Invoice Number / Invoice Date / Order Date */}
              <div className="grid grid-cols-4 gap-2 pt-2 pb-2 text-[11px] border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Payment Method</span>
                  <span className="font-bold text-slate-800">{activeInvoiceOrder.paymentMethod || 'Cash Payment'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Invoice Number</span>
                  <span className="font-mono font-bold text-slate-800">{activeInvoiceOrder.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Invoice Date</span>
                  <span className="font-medium text-slate-800">
                    {new Date(activeInvoiceOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Order Date</span>
                  <span className="font-medium text-slate-800">
                    {new Date(activeInvoiceOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Items Table (Blue Table Header matching image 2) */}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-indigo-700 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-12">Item</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoiceOrder.items && activeInvoiceOrder.items.length > 0 ? (
                      activeInvoiceOrder.items.map((it: any, idx: number) => {
                        const rate = it.product?.price || 0;
                        const qty = it.quantity || 1;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}.</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900">{it.product?.title || 'Product'}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">
                                {it.product?.shortSummary || it.product?.category || 'Quality checked product'}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-medium">
                              Tk. {rate.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-center font-bold">
                              {qty}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-500 uppercase text-[10px]">
                              PCS
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              Tk. {(rate * qty).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 px-3 text-slate-500 font-mono">1.</td>
                        <td className="py-3 px-3 font-bold text-slate-900">Over-the-counter Item</td>
                        <td className="py-3 px-3 text-right font-mono">
                          Tk. {(activeInvoiceOrder.totalAmount || activeInvoiceOrder.price || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">{activeInvoiceOrder.quantity || 1}</td>
                        <td className="py-3 px-3 text-center text-slate-500 text-[10px]">PCS</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          Tk. {(activeInvoiceOrder.totalAmount || activeInvoiceOrder.price || 0).toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total</span>
                    <span className="font-bold font-mono">
                      Tk. {(activeInvoiceOrder.totalAmount || activeInvoiceOrder.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge</span>
                    <span className="font-bold font-mono">Tk. 0</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                    <span>Total Amount</span>
                    <span className="font-black font-mono text-emerald-700">
                      Tk. {(activeInvoiceOrder.totalAmount || activeInvoiceOrder.price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-6 border-t border-slate-100 text-slate-500 text-[11px]">
                <p>Thank you for shopping with us!</p>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
