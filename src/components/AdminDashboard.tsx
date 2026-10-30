import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, LogOut, Menu, X, Check, ShoppingBag, ShoppingCart, ClipboardList, Package, LayoutDashboard, User, Code, Truck, CreditCard, Tag, Boxes, Store, Globe, Layout, Layers, Bell, Coins, Send, Sparkles, Eye, Bookmark, Camera, Zap, Volume2, VolumeX, RefreshCw, Share2, ScanLine, ChevronDown, ChevronRight, FileText, Clock, Briefcase, Percent, Crown
} from 'lucide-react';
import { dbService, subscribeToOrders } from '../lib/dbService';
import { playCuteAdminOrderTone, initAudioUnlock } from '../lib/soundUtils';
import { showDesktopOrderNotification, requestNotificationPermission } from '../lib/pushNotifications';
import { ApiClient } from '../services/apiClient';
import { BookOrder, ActiveTab, Product, Customer } from '../types';
import DashboardOverview from './DashboardOverview';
import ProfileSettings from './ProfileSettings';
import { lazy, Suspense } from 'react';
const OrderManager = lazy(() => import('./OrderManager'));
const ProductManager = lazy(() => import('./ProductManager'));
const CustomerManager = lazy(() => import('./CustomerManager'));
const CouponManager = lazy(() => import('./CouponManager'));
const StockInventoryManager = lazy(() => import('./StockInventoryManager'));
const CategoryManager = lazy(() => import('./CategoryManager'));
const BrandManager = lazy(() => import('./BrandManager'));
const LandingPageManager = lazy(() => import('./LandingPageManager'));
const PixelSettingsManager = lazy(() => import('./PixelSettingsManager'));
const CourierSettingsManager = lazy(() => import('./CourierSettingsManager'));
const PaymentSettingsManager = lazy(() => import('./PaymentSettingsManager'));
const DeliverySettingsManager = lazy(() => import('./DeliverySettingsManager'));
const FlashSaleManager = lazy(() => import('./FlashSaleManager'));
const SupplierManager = lazy(() => import('./SupplierManager'));
const AffiliateManager = lazy(() => import('./AffiliateManager'));
const VendorManager = lazy(() => import('./VendorManager'));
const PosView = lazy(() => import('./PosView'));
const VatTaxManager = lazy(() => import('./VatTaxManager'));
const DriverManager = lazy(() => import('./DriverManager'));
const SubscriptionManager = lazy(() => import('./SubscriptionManager'));
const AttributesManager = lazy(() => import('./AttributesManager'));
const UnitsManager = lazy(() => import('./UnitsManager'));
const PurchaseManager = lazy(() => import('./PurchaseManager'));
import { TabContentSkeleton } from './LoadingSkeleton';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  adminEmail: string;
  onLogout: () => void;
}

export default function AdminDashboard({ adminEmail, onLogout }: AdminDashboardProps) {
  // Check if current logged-in user is a Vendor
  const [vendorUser, setVendorUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('vendor_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const isVendorRole = Boolean(vendorUser && vendorUser.role === 'vendor');
  const vendorStoreName = vendorUser?.storeName || 'Shop Vendor';

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPosMenuOpen, setIsPosMenuOpen] = useState(false);
  const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(false);
  const [isVendorsMenuOpen, setIsVendorsMenuOpen] = useState(false);
  const [isSuppliersMenuOpen, setIsSuppliersMenuOpen] = useState(false);
  const [isDriversMenuOpen, setIsDriversMenuOpen] = useState(false);
  const [isMarketingMenuOpen, setIsMarketingMenuOpen] = useState(false);
  const [isSubscriptionsMenuOpen, setIsSubscriptionsMenuOpen] = useState(false);
  const [isPurchaseMenuOpen, setIsPurchaseMenuOpen] = useState(false);
  const [isBusinessMenuOpen, setIsBusinessMenuOpen] = useState(false);
  const [isStoreSetupMenuOpen, setIsStoreSetupMenuOpen] = useState(false);
  
  // App States
  const [orders, setOrders] = useState<BookOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [viewsOverview, setViewsOverview] = useState<{ websiteViews: number; landingViews: number; totalProductViews: number }>({ websiteViews: 0, landingViews: 0, totalProductViews: 0 });
  const [loading, setLoading] = useState(true);

  // New order toast & sound notification state
  const [newOrderToast, setNewOrderToast] = useState<BookOrder | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Web Audio unlock & desktop notifications on admin mount
  useEffect(() => {
    initAudioUnlock();
    requestNotificationPermission();
  }, []);

  // Play cute notification tone
  const playNotificationSound = useCallback(() => {
    if (isSoundEnabled) {
      playCuteAdminOrderTone();
    }
  }, [isSoundEnabled]);

  // Load initial data then subscribe to real-time orders
  useEffect(() => {
    async function loadInitial() {
      try {
        const [orderList, prodList, custList, settings] = await Promise.all([
          dbService.getBookOrders(),
          dbService.getProducts(),
          dbService.getCustomers(),
          dbService.getEcomSettings()
        ]);
        
        // Update Favicon based on settings
        if (settings.storeLogo) {
          let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = settings.storeLogo;
        }

        // Seed known IDs from initial fetch (no toast for these)
        orderList.forEach(o => knownOrderIds.current.add(o.id));

        // If vendor logged in, filter orders and products to this vendor
        if (isVendorRole && vendorUser) {
          const vId = vendorUser.vendorId || vendorUser.uid;
          const vStore = (vendorUser.storeName || '').toLowerCase();
          const filteredProds = prodList.filter(p => p.vendorId === vId || p.vendorName?.toLowerCase() === vStore);
          setProducts(filteredProds);
          setOrders(orderList);
        } else {
          setOrders(orderList);
          setProducts(prodList);
        }
        setCustomers(custList);

        // Run auto-sync of Steadfast courier status in the background
        setTimeout(async () => {
          try {
            const inTransit = orderList.filter(o => o.steadfastTrackingCode && o.status !== 'Delivered' && o.status !== 'Cancelled');
            if (inTransit.length > 0) {
              const settings = await dbService.getEcomSettings();
              const earnRate = settings.pointsEarnRate || 10;
              
              for (const order of inTransit) {
                try {
                  const result = await ApiClient.getSteadfastStatus(order.steadfastTrackingCode!);
                  const normalized = result.status.toLowerCase();
                  const newStatus = normalized === 'delivered'
                    ? 'Delivered'
                    : normalized.includes('cancelled')
                      ? 'Cancelled'
                      : order.status;

                  if (newStatus !== order.status) {
                    await dbService.updateBookOrder({ 
                      ...order, 
                      status: newStatus, 
                      steadfastStatus: result.status 
                    });

                    if (settings.pointsEnabled) {
                      const earnedPoints = Math.floor(((order.price || 0) * earnRate) / 100);
                      if (earnedPoints > 0) {
                        const customer = custList.find(c => c.id === order.phone || c.phone === order.phone);
                        if (customer) {
                          let newPoints = customer.points || 0;
                          if (newStatus === 'Delivered') {
                            newPoints += earnedPoints;
                          }
                          await dbService.saveCustomer({
                            ...customer,
                            points: newPoints
                          });
                        }
                      }
                    }
                  }
                } catch (singleErr) {
                  console.warn('Auto steadfast sync failed for order:', order.id, singleErr);
                }
              }
            }
          } catch (syncErr) {
            console.error('Error running steadfast auto-sync:', syncErr);
          }
        }, 1500);
        dbService.getGlobalViews().then(setViewsOverview).catch(() => {});
        document.title = 'E-commerce Admin | Watch Store';
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
    loadInitial();

    const handleSettingsUpdate = async () => {
      try {
        const settings = await dbService.getEcomSettings();
        if (settings.storeName) {
          document.title = `E-commerce Admin | ${settings.storeName}`;
        }
        dbService.getGlobalViews().then(setViewsOverview).catch(() => {});
        if (settings.storeLogo) {
          let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = settings.storeLogo;
        }
      } catch (e) {}
    };

    window.addEventListener('ecom-settings-updated', handleSettingsUpdate);

    // Real-time listener for orders across SSE, BroadcastChannel, and high-speed sync
    const unsubOrders = subscribeToOrders((liveOrders, newlyArrivedOrder) => {
      setOrders(liveOrders);
      if (isFirstLoad.current) return; // skip during initial load

      const triggerOrderNotification = (order: BookOrder) => {
        if (!knownOrderIds.current.has(order.id)) {
          knownOrderIds.current.add(order.id);
          setNewOrderToast(order);
          playNotificationSound();
          showDesktopOrderNotification(order);
          // Auto-dismiss after 10 seconds
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setNewOrderToast(null), 10000);
        }
      };

      if (newlyArrivedOrder) {
        triggerOrderNotification(newlyArrivedOrder);
      } else {
        liveOrders.forEach(o => {
          if (!knownOrderIds.current.has(o.id)) {
            triggerOrderNotification(o);
          }
        });
      }
    });

    const handleSync = () => {
      dbService.getProducts().then(setProducts);
      dbService.getCustomers().then(setCustomers);
    };
    window.addEventListener('ecom-products-updated', handleSync);
    window.addEventListener('customers-updated', handleSync);

    return () => {
      unsubOrders();
      window.removeEventListener('ecom-products-updated', handleSync);
      window.removeEventListener('customers-updated', handleSync);
      window.removeEventListener('ecom-settings-updated', handleSettingsUpdate);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [playNotificationSound]);

  // Fast manual refresh orders handler
  const handleManualRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      const freshOrders = await dbService.getBookOrders(true);
      setOrders(freshOrders);
      freshOrders.forEach(o => knownOrderIds.current.add(o.id));
    } catch (err) {
      console.warn('Manual refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshingOrders(false), 400);
    }
  };

  // Sound test & permission toggle
  const handleToggleOrTestSound = () => {
    initAudioUnlock();
    requestNotificationPermission();
    if (!isSoundEnabled) {
      setIsSoundEnabled(true);
    }
    playCuteAdminOrderTone();
  };

  // Handlers for products
  const handleAddProduct = async (product: Product) => {
    const added = await dbService.addProduct(product);
    setProducts(prev => [added, ...prev.filter(p => p.id !== added.id)]);
  };

  const handleUpdateProduct = async (product: Product) => {
    const updated = await dbService.updateProduct(product);
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteProduct = async (id: string) => {
    await dbService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Handlers for book order management
  const handleAddOrder = async (order: BookOrder) => {
    const added = await dbService.addBookOrder(order);
    setOrders(prev => [added, ...prev.filter(o => o.id !== added.id)]);
    const updatedCust = await dbService.getCustomers();
    setCustomers(updatedCust);
  };

  const handleUpdateOrder = async (order: BookOrder) => {
    const oldOrder = orders.find(o => o.id === order.id);
    const wasDelivered = oldOrder?.status === 'Delivered';
    const isNowDelivered = order.status === 'Delivered';

    const updated = await dbService.updateBookOrder(order);

    try {
      const settings = await dbService.getEcomSettings();
      if (settings.pointsEnabled) {
        const earnRate = settings.pointsEarnRate || 10;
        const earnedPoints = Math.floor(((order.price || 0) * earnRate) / 100);
        
        if (earnedPoints > 0) {
          const cleanPhone = order.phone.trim();
          const customersList = await dbService.getCustomers();
          const customer = customersList.find(c => c.id === cleanPhone || c.phone === cleanPhone);

          if (customer) {
            let newPoints = customer.points || 0;
            if (isNowDelivered && !wasDelivered) {
              newPoints += earnedPoints;
            } else if (wasDelivered && !isNowDelivered) {
              newPoints = Math.max(0, newPoints - earnedPoints);
            }

            if (newPoints !== (customer.points || 0)) {
              await dbService.saveCustomer({
                ...customer,
                points: newPoints
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error updating customer points:', err);
    }

    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    const updatedCust = await dbService.getCustomers();
    setCustomers(updatedCust);
  };

  const handleDeleteOrder = async (id: string) => {
    await dbService.deleteBookOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
    const updatedCust = await dbService.getCustomers();
    setCustomers(updatedCust);
  };

  const menuItems = isVendorRole ? [
    { id: 'dashboard' as const, label: 'Shop Dashboard', icon: LayoutDashboard },
    { id: 'header_catalogue' as any, isHeader: true, label: 'MY SHOP CATALOGUE' },
    {
      id: 'products_group' as any,
      label: 'My Products',
      icon: Package,
      isGroup: true,
      subItems: [
        { id: 'products' as const, label: 'All Products', dot: true },
        { id: 'inventory' as const, label: 'Stock & Inventory' }
      ]
    },
    { id: 'orders' as const, label: 'My Shop Orders', icon: ShoppingBag },
    {
      id: 'vendors_group' as any,
      label: 'Wallet & Withdraw',
      icon: Store,
      isGroup: true,
      subItems: [
        { id: 'vendors_withdrawals' as const, label: 'Withdrawal Requests', dot: true }
      ]
    }
  ] : [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'pos_group' as any,
      label: 'POS',
      icon: ScanLine,
      isGroup: true,
      subItems: [
        { id: 'pos' as const, label: 'New Sale', dot: true },
        { id: 'pos_offline_sales' as const, label: 'Offline Sales' },
        { id: 'pos_drafts' as const, label: 'Draft Orders' }
      ]
    },
    { id: 'header_catalogue' as any, isHeader: true, label: 'CATALOGUE' },
    {
      id: 'products_group' as any,
      label: 'Products',
      icon: Package,
      isGroup: true,
      subItems: [
        { id: 'products' as const, label: 'All Products', dot: true },
        { id: 'inventory' as const, label: 'Stock & Inventory' },
        { id: 'attributes_management' as const, label: 'Attributes' },
        { id: 'units_management' as const, label: 'Units' },
        { id: 'category_management' as const, label: 'Categories' },
        { id: 'sub_category_management' as const, label: 'Sub Categories' },
        { id: 'brand_management' as const, label: 'Brands' }
      ]
    },
    {
      id: 'purchase_group' as any,
      label: 'Purchase',
      icon: RefreshCw,
      isGroup: true,
      subItems: [
        { id: 'purchase_stock_report' as const, label: 'Stock Report', dot: true },
        { id: 'purchase_create' as const, label: 'Add New Purchase' },
        { id: 'purchase_invoices' as const, label: 'Purchase Invoices' },
        { id: 'purchase_summary' as const, label: 'Purchase Summary' },
        { id: 'purchase_returns' as const, label: 'Purchase Returns' },
        { id: 'purchase_return_create' as const, label: 'Add Purchase Return' }
      ]
    },
    { id: 'orders' as const, label: 'Orders', icon: ShoppingBag },
    { id: 'customers' as const, label: 'Customers', icon: Users },
    {
      id: 'vendors_group' as any,
      label: 'Vendors',
      icon: Store,
      isGroup: true,
      subItems: [
        { id: 'vendors' as const, label: 'All Vendors', dot: true },
        { id: 'vendors_create' as const, label: 'Add Vendor' },
        { id: 'vendors_withdrawals' as const, label: 'Withdraw Requests' }
      ]
    },
    {
      id: 'subscriptions_group' as any,
      label: 'Subscription',
      icon: Crown,
      isGroup: true,
      subItems: [
        { id: 'subscriptions' as const, label: 'All Plans', dot: true },
        { id: 'subscriptions_create' as const, label: 'New Plan' }
      ]
    },
    {
      id: 'suppliers_group' as any,
      label: 'Suppliers',
      icon: Package,
      isGroup: true,
      subItems: [
        { id: 'suppliers' as const, label: 'List Of Suppliers', dot: true },
        { id: 'suppliers_create' as const, label: 'Add New Supplier' }
      ]
    },
    {
      id: 'drivers_group' as any,
      label: 'Drivers',
      icon: Truck,
      isGroup: true,
      subItems: [
        { id: 'drivers' as const, label: 'All Drivers', dot: true },
        { id: 'drivers_create' as const, label: 'New Driver' }
      ]
    },
    {
      id: 'marketing_group' as any,
      label: 'Sales & Marketing',
      icon: Zap,
      isGroup: true,
      subItems: [
        { id: 'flash_sale' as const, label: 'Flash Sales', dot: true },
        { id: 'flash_sale_create' as const, label: 'Add Flash Sale' },
        { id: 'coupons' as const, label: 'Coupons / Promo Codes' },
        { id: 'coupons_create' as const, label: 'Add Promo Code' },
        { id: 'affiliates' as const, label: 'Affiliates' }
      ]
    },
    { 
      id: 'business_group' as any,
      label: 'Business Settings',
      icon: Briefcase,
      isGroup: true,
      subItems: [
        { id: 'vat_tax' as const, label: 'VAT & Tax', dot: true },
        { id: 'delivery_settings' as const, label: 'Delivery Charge' },
        { id: 'payment_settings' as const, label: 'COD Settings' },
        { id: 'courier_settings' as const, label: 'Courier' }
      ]
    },
    { 
      id: 'store_setup_group' as any,
      label: 'Store Setup',
      icon: Store,
      isGroup: true,
      subItems: [
        { id: 'landing_setup' as const, label: 'Landing Pages', dot: true },
        { id: 'pixel_settings' as const, label: 'Google Tag/Pixel' },
        { id: 'profile' as const, label: 'Profile Settings' }
      ]
    },
  ];

  return (
    <div className="admin-panel h-screen w-full bg-[#f8fafc] flex font-sans text-slate-800 text-[14px] antialiased overflow-hidden">

      {/* ===== New Order Toast Notification ===== */}
      <AnimatePresence>
        {newOrderToast && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-[9999] w-80 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-700 overflow-hidden"
          >
            {/* Progress bar */}
            <motion.div
              className="h-1 bg-teal-400"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 6, ease: 'linear' }}
            />
            <div className="p-4 flex items-start gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5 animate-bounce">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-400 mb-0.5">🎉 New Order Received!</p>
                <p className="text-sm font-bold text-white truncate">{newOrderToast.customerName || 'Customer'}</p>
                <p className="text-xs text-amber-300 font-semibold mt-0.5 truncate">
                  {newOrderToast.id} · Tk. {(newOrderToast.totalAmount ?? newOrderToast.totalPrice ?? (newOrderToast as any).total ?? 0).toLocaleString()}
                </p>
                {newOrderToast.phone && (
                  <p className="text-[11px] text-slate-400 truncate">{newOrderToast.phone}</p>
                )}
                <button
                  onClick={() => { setActiveTab('orders'); setNewOrderToast(null); }}
                  className="mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer inline-flex items-center gap-1"
                >
                  <span>View Order</span>
                  <span>→</span>
                </button>
              </div>
              <button
                onClick={() => setNewOrderToast(null)}
                className="text-slate-500 hover:text-white cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-400 border-r border-slate-800/80 shrink-0 sticky top-0 h-screen z-30">
        {/* Title / Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 space-x-3 text-white">
          <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold shrink-0 shadow-xs">
            {isVendorRole ? <Store className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">
              {isVendorRole ? vendorStoreName : 'ETTADI MART'}
            </h1>
            <span className="text-[11px] text-teal-400/90 block font-semibold truncate tracking-wider uppercase">
              {isVendorRole ? 'Shop Vendor Panel' : 'Master Dashboard'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item: any) => {
            if (item.isHeader) {
              return (
                <div key={item.id} className="pt-4 pb-1.5 px-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {item.label}
                  </span>
                </div>
              );
            }

            if (item.isGroup) {
              const isPosGroup = item.id === 'pos_group';
              const isProductsGroup = item.id === 'products_group';
              const isPurchaseGroup = item.id === 'purchase_group';
              const isVendorsGroup = item.id === 'vendors_group';
              const isSubscriptionsGroup = item.id === 'subscriptions_group';
              const isSuppliersGroup = item.id === 'suppliers_group';
              const isDriversGroup = item.id === 'drivers_group';
              const isMarketingGroup = item.id === 'marketing_group' || item.id === 'flash_sales_group' || item.id === 'coupons_group';
              const isBusinessGroup = item.id === 'business_group';
              const isStoreSetupGroup = item.id === 'store_setup_group';

              const isGroupActive = isPosGroup 
                ? (activeTab === 'pos' || activeTab === 'pos_offline_sales' || activeTab === 'pos_drafts')
                : isProductsGroup
                ? (activeTab === 'products' || activeTab === 'inventory' || activeTab === 'attributes_management' || activeTab === 'units_management' || activeTab === 'category_management' || activeTab === 'sub_category_management' || activeTab === 'brand_management')
                : isPurchaseGroup
                ? (activeTab === 'purchase_stock_report' || activeTab === 'purchase_create' || activeTab === 'purchase_invoices' || activeTab === 'purchase_summary' || activeTab === 'purchase_returns' || activeTab === 'purchase_return_create')
                : isVendorsGroup
                ? (activeTab === 'vendors' || activeTab === 'vendors_create' || activeTab === 'vendors_withdrawals')
                : isSubscriptionsGroup
                ? (activeTab === 'subscriptions' || activeTab === 'subscriptions_create')
                : isSuppliersGroup
                ? (activeTab === 'suppliers' || activeTab === 'suppliers_create')
                : isDriversGroup
                ? (activeTab === 'drivers' || activeTab === 'drivers_create')
                : isMarketingGroup
                ? (activeTab === 'flash_sale' || activeTab === 'flash_sale_create' || activeTab === 'coupons' || activeTab === 'coupons_create' || activeTab === 'affiliates')
                : isBusinessGroup
                ? (activeTab === 'vat_tax' || activeTab === 'delivery_settings' || activeTab === 'payment_settings' || activeTab === 'courier_settings')
                : isStoreSetupGroup
                ? (activeTab === 'landing_setup' || activeTab === 'pixel_settings' || activeTab === 'profile')
                : false;

              const isOpen = isPosGroup ? isPosMenuOpen 
                : isProductsGroup ? isProductsMenuOpen
                : isPurchaseGroup ? isPurchaseMenuOpen 
                : isVendorsGroup ? isVendorsMenuOpen
                : isSubscriptionsGroup ? isSubscriptionsMenuOpen 
                : isSuppliersGroup ? isSuppliersMenuOpen 
                : isDriversGroup ? isDriversMenuOpen 
                : isMarketingGroup ? isMarketingMenuOpen
                : isBusinessGroup ? isBusinessMenuOpen
                : isStoreSetupGroup ? isStoreSetupMenuOpen
                : true;

              const setOpen = isPosGroup ? setIsPosMenuOpen 
                : isProductsGroup ? setIsProductsMenuOpen
                : isPurchaseGroup ? setIsPurchaseMenuOpen 
                : isVendorsGroup ? setIsVendorsMenuOpen
                : isSubscriptionsGroup ? setIsSubscriptionsMenuOpen 
                : isSuppliersGroup ? setIsSuppliersMenuOpen 
                : isDriversGroup ? setIsDriversMenuOpen 
                : isMarketingGroup ? setIsMarketingMenuOpen
                : isBusinessGroup ? setIsBusinessMenuOpen
                : isStoreSetupGroup ? setIsStoreSetupMenuOpen
                : () => {};
              const Icon = item.icon!;
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(prev => !prev);
                      if (!isGroupActive) setActiveTab(item.subItems[0].id);
                    }}
                    className={`w-full inline-flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isGroupActive
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 shadow-2xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${isGroupActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate font-bold tracking-wide">{item.label}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="pl-3 pr-1 py-1 space-y-1 bg-slate-950/40 rounded-xl border border-slate-800/40">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setActiveTab(sub.id)}
                            className={`w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                              isSubActive
                                ? 'bg-emerald-600/90 text-white font-bold shadow-2xs'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-emerald-300' : 'bg-slate-600'}`} />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full inline-flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-teal-600 text-white shadow-sm font-bold tracking-wide' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 mr-2.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {isVendorRole && (
            <div className="px-2 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-center">
              <span className="text-[10px] text-emerald-400 font-bold block truncate">{vendorStoreName}</span>
              <span className="text-[9px] text-slate-400 block truncate">{vendorUser?.email || vendorUser?.phone}</span>
            </div>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('vendor_user');
              localStorage.removeItem('vendor_token');
              onLogout();
            }}
            className="w-full inline-flex items-center justify-center px-3 py-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="relative flex flex-col w-64 bg-slate-900 text-slate-400 border-r border-slate-800 h-full"
            >
              <div className="absolute top-3.5 right-3">
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="h-16 flex items-center px-4 border-b border-slate-800 space-x-2.5 text-white">
                <ShoppingBag className="h-6 w-6 text-teal-400 shrink-0" />
                <div className="min-w-0 pr-6">
                  <h1 className="text-xs font-bold leading-tight truncate">E-commerce Admin</h1>
                  <span className="text-[10px] text-teal-400 block truncate">Control Panel</span>
                </div>
              </div>

              <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item: any) => {
                  if (item.isHeader) {
                    return (
                      <div key={item.id} className="pt-4 pb-1 px-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  if (item.isGroup) {
                    const isPosGroup = item.id === 'pos_group';
                    const isProductsGroup = item.id === 'products_group';
                    const isPurchaseGroup = item.id === 'purchase_group';
                    const isVendorsGroup = item.id === 'vendors_group';
                    const isSubscriptionsGroup = item.id === 'subscriptions_group';
                    const isSuppliersGroup = item.id === 'suppliers_group';
                    const isDriversGroup = item.id === 'drivers_group';
                    const isMarketingGroup = item.id === 'marketing_group' || item.id === 'flash_sales_group' || item.id === 'coupons_group';
                    const isBusinessGroup = item.id === 'business_group';
                    const isStoreSetupGroup = item.id === 'store_setup_group';

                    const isGroupActive = isPosGroup 
                      ? (activeTab === 'pos' || activeTab === 'pos_offline_sales' || activeTab === 'pos_drafts')
                      : isProductsGroup
                      ? (activeTab === 'products' || activeTab === 'inventory' || activeTab === 'attributes_management' || activeTab === 'units_management' || activeTab === 'category_management' || activeTab === 'sub_category_management' || activeTab === 'brand_management')
                      : isPurchaseGroup
                      ? (activeTab === 'purchase_stock_report' || activeTab === 'purchase_create' || activeTab === 'purchase_invoices' || activeTab === 'purchase_summary' || activeTab === 'purchase_returns' || activeTab === 'purchase_return_create')
                      : isVendorsGroup
                      ? (activeTab === 'vendors' || activeTab === 'vendors_create' || activeTab === 'vendors_withdrawals')
                      : isSubscriptionsGroup
                      ? (activeTab === 'subscriptions' || activeTab === 'subscriptions_create')
                      : isSuppliersGroup
                      ? (activeTab === 'suppliers' || activeTab === 'suppliers_create')
                      : isDriversGroup
                      ? (activeTab === 'drivers' || activeTab === 'drivers_create')
                      : isMarketingGroup
                      ? (activeTab === 'flash_sale' || activeTab === 'flash_sale_create' || activeTab === 'coupons' || activeTab === 'coupons_create' || activeTab === 'affiliates')
                      : isBusinessGroup
                      ? (activeTab === 'vat_tax' || activeTab === 'delivery_settings' || activeTab === 'payment_settings' || activeTab === 'courier_settings')
                      : isStoreSetupGroup
                      ? (activeTab === 'landing_setup' || activeTab === 'pixel_settings' || activeTab === 'profile')
                      : false;

                    const isOpen = isPosGroup ? isPosMenuOpen 
                      : isProductsGroup ? isProductsMenuOpen
                      : isPurchaseGroup ? isPurchaseMenuOpen 
                      : isVendorsGroup ? isVendorsMenuOpen
                      : isSubscriptionsGroup ? isSubscriptionsMenuOpen 
                      : isSuppliersGroup ? isSuppliersMenuOpen 
                      : isDriversGroup ? isDriversMenuOpen 
                      : isMarketingGroup ? isMarketingMenuOpen
                      : isBusinessGroup ? isBusinessMenuOpen
                      : isStoreSetupGroup ? isStoreSetupMenuOpen
                      : true;

                    const setOpen = isPosGroup ? setIsPosMenuOpen 
                      : isProductsGroup ? setIsProductsMenuOpen
                      : isPurchaseGroup ? setIsPurchaseMenuOpen 
                      : isVendorsGroup ? setIsVendorsMenuOpen
                      : isSubscriptionsGroup ? setIsSubscriptionsMenuOpen 
                      : isSuppliersGroup ? setIsSuppliersMenuOpen 
                      : isDriversGroup ? setIsDriversMenuOpen 
                      : isMarketingGroup ? setIsMarketingMenuOpen
                      : isBusinessGroup ? setIsBusinessMenuOpen
                      : isStoreSetupGroup ? setIsStoreSetupMenuOpen
                      : () => {};
                    const Icon = item.icon!;
                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(prev => !prev);
                            if (!isGroupActive) {
                              setActiveTab(item.subItems[0].id);
                              setSidebarOpen(false);
                            }
                          }}
                          className={`w-full inline-flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            isGroupActive
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 shadow-2xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`h-4 w-4 shrink-0 ${isGroupActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className="truncate font-bold tracking-wide">{item.label}</span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="pl-3 pr-1 py-1 space-y-1 bg-slate-950/40 rounded-xl border border-slate-800/40">
                            {item.subItems.map((sub: any) => {
                              const isSubActive = activeTab === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    setActiveTab(sub.id);
                                    setSidebarOpen(false);
                                  }}
                                  className={`w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                                    isSubActive
                                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-emerald-300' : 'bg-slate-600'}`} />
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const Icon = item.icon!;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-teal-600 text-white shadow-md' 
                          : 'hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={onLogout}
                  className="w-full inline-flex items-center justify-center px-3 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Core Body Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-[#f8fafc]">
        {/* Top Header */}
        <header className="shrink-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-5 sm:px-7 lg:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
              title="Open the menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  {activeTab === 'pos'
                    ? 'Point of Sale'
                    : activeTab === 'pos_offline_sales'
                    ? 'Offline Sales'
                    : activeTab === 'pos_drafts'
                    ? 'Draft Orders'
                    : menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
                </span>
                {isVendorRole && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Vendor Scoped
                  </span>
                )}
              </div>
              {(activeTab === 'pos' || activeTab === 'pos_offline_sales' || activeTab === 'pos_drafts') && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  {activeTab === 'pos' && 'Ring up a sale, hold it, or take it to payment'}
                  {activeTab === 'pos_offline_sales' && 'Every sale rung up at this till, and what they came to'}
                  {activeTab === 'pos_drafts' && 'Counters put aside part-way through, waiting to be picked up again'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Real-time Sync Indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>লাইভ সিঙ্ক</span>
            </div>

            {/* Sound Notification Test & Toggle Button */}
            <button
              type="button"
              onClick={handleToggleOrTestSound}
              title="সাউন্ড নোটিফিকেশন শুনুন ও টেস্ট করুন"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Volume2 className="h-4 w-4 text-teal-600 animate-pulse" />
              <span className="hidden md:inline">অর্ডার সাউন্ড টেস্ট</span>
              <span className="md:hidden">সাউন্ড</span>
            </button>

            {/* Manual Orders Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefreshOrders}
              disabled={isRefreshingOrders}
              title="নতুন অর্ডার রিফ্রেশ করুন"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isRefreshingOrders ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshingOrders ? 'রিফ্রেশ হচ্ছে...' : 'রিফ্রেশ'}</span>
            </button>

            {/* Admin Profile Pill / Quick Access */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              title="Profile Settings"
              className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 border border-teal-500/30 flex items-center justify-center font-bold text-[11px] shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {isVendorRole ? vendorStoreName : (adminEmail ? adminEmail.split('@')[0] : 'Admin')}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">
                  {isVendorRole ? 'Shop Vendor' : 'Super Admin'}
                </div>
              </div>
            </button>
          </div>
        </header>

        {/* Content canvas (Wider container, crisp typography) */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {loading ? (
            <TabContentSkeleton />
          ) : (
            <Suspense fallback={<TabContentSkeleton />}>
              <div className="min-h-full">
                {activeTab === 'dashboard' && (
                  <DashboardOverview 
                    products={products}
                    orders={orders}
                    customers={customers}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {(activeTab === 'pos' || activeTab === 'pos_offline_sales' || activeTab === 'pos_drafts') && (
                  <PosView
                    products={products}
                    customers={customers}
                    orders={orders}
                    onAddOrder={handleAddOrder}
                    activeSubView={
                      activeTab === 'pos_offline_sales'
                        ? 'offline_sales'
                        : activeTab === 'pos_drafts'
                        ? 'draft_orders'
                        : 'new_sale'
                    }
                    onSubViewChange={(sub) => {
                      if (sub === 'offline_sales') setActiveTab('pos_offline_sales');
                      else if (sub === 'draft_orders') setActiveTab('pos_drafts');
                      else setActiveTab('pos');
                    }}
                  />
                )}
                {activeTab === 'products' && (
                  <ProductManager 
                    products={products}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                  />
                )}
                {activeTab === 'orders' && (
                  <OrderManager 
                    orders={orders}
                    onAddOrder={handleAddOrder}
                    onUpdateOrder={handleUpdateOrder}
                    onDeleteOrder={handleDeleteOrder}
                    onRefreshOrders={handleManualRefreshOrders}
                  />
                )}
                {activeTab === 'inventory' && (
                  <StockInventoryManager />
                )}
                {(activeTab === 'purchase_stock_report' || activeTab === 'purchase_create' || activeTab === 'purchase_invoices' || activeTab === 'purchase_summary' || activeTab === 'purchase_returns' || activeTab === 'purchase_return_create') && (
                  <PurchaseManager 
                    initialSubTab={
                      activeTab === 'purchase_create' ? 'add_purchase' :
                      activeTab === 'purchase_invoices' ? 'invoices' :
                      activeTab === 'purchase_summary' ? 'summary' :
                      activeTab === 'purchase_returns' ? 'returns' :
                      activeTab === 'purchase_return_create' ? 'add_return' :
                      'stock_report'
                    }
                    onNavigateTab={(tab) => setActiveTab(tab)}
                    products={products}
                  />
                )}
                {activeTab === 'customers' && (
                  <CustomerManager 
                    customers={customers}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {(activeTab === 'vendors' || activeTab === 'vendors_create' || activeTab === 'vendors_withdrawals') && (
                  <VendorManager 
                    initialView={activeTab === 'vendors_create' ? 'create' : activeTab === 'vendors_withdrawals' ? 'withdrawals' : 'list'}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {(activeTab === 'subscriptions' || activeTab === 'subscriptions_create') && (
                  <SubscriptionManager 
                    initialView={activeTab === 'subscriptions_create' ? 'create' : 'list'}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {(activeTab === 'suppliers' || activeTab === 'suppliers_create') && (
                  <SupplierManager 
                    initialView={activeTab === 'suppliers_create' ? 'create' : 'list'}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {(activeTab === 'drivers' || activeTab === 'drivers_create') && (
                  <DriverManager 
                    initialView={activeTab === 'drivers_create' ? 'create' : 'list'}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {activeTab === 'affiliates' && (
                  <AffiliateManager />
                )}
                {(activeTab === 'coupons' || activeTab === 'coupons_create') && (
                  <CouponManager 
                    initialView={activeTab === 'coupons_create' ? 'create' : 'list'}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {(activeTab === 'category_management' || activeTab === 'sub_category_management') && (
                  <CategoryManager 
                    initialSubcategoryFocus={activeTab === 'sub_category_management'} 
                  />
                )}
                {activeTab === 'brand_management' && (
                  <BrandManager />
                )}
                {activeTab === 'attributes_management' && (
                  <AttributesManager />
                )}
                {activeTab === 'units_management' && (
                  <UnitsManager />
                )}
                {(activeTab === 'flash_sale' || activeTab === 'flash_sale_create') && (
                  <FlashSaleManager 
                    products={products}
                    initialView={activeTab === 'flash_sale_create' ? 'create' : 'list'}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}
                {activeTab === 'landing_setup' && (
                  <LandingPageManager />
                )}
                {activeTab === 'payment_settings' && (
                  <PaymentSettingsManager />
                )}
                {activeTab === 'delivery_settings' && (
                  <DeliverySettingsManager />
                )}
                {activeTab === 'pixel_settings' && (
                  <PixelSettingsManager />
                )}
                {activeTab === 'courier_settings' && (
                  <CourierSettingsManager />
                )}
                {activeTab === 'profile' && (
                  <ProfileSettings 
                    adminEmail={adminEmail}
                  />
                )}
              </div>
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
