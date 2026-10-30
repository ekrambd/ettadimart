import { useState, useMemo, useEffect } from 'react';
import { 
  Store, Package, ShoppingCart, Users, ArrowRight, ExternalLink,
  Clock, CheckCircle, RefreshCw, Truck, CheckCheck, XCircle,
  BarChart3, Calendar, RotateCcw, Heart, ShoppingBag, Star
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Product, BookOrder, Customer, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';

interface DashboardOverviewProps {
  products: Product[];
  orders: BookOrder[];
  customers: Customer[];
  onNavigateTab: (tab: ActiveTab) => void;
}

export default function DashboardOverview({ 
  products = [], 
  orders = [], 
  customers = [], 
  onNavigateTab 
}: DashboardOverviewProps) {
  // Multivendor entity states
  const [vendors, setVendors] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  // Time-range filter for statistics
  const [statPeriod, setStatPeriod] = useState<'daily' | 'monthly' | 'yearly'>('yearly');
  const [customDate, setCustomDate] = useState<string>('');

  // Fetch vendors & drivers on mount
  useEffect(() => {
    let isMounted = true;
    async function loadMultiVendorEntities() {
      try {
        const [vList, dList] = await Promise.all([
          dbService.getVendors().catch(() => []),
          dbService.getDrivers().catch(() => [])
        ]);
        if (isMounted) {
          setVendors(vList || []);
          setDrivers(dList || []);
          setLoadingExtras(false);
        }
      } catch (err) {
        console.warn('Error loading multivendor entities:', err);
        if (isMounted) setLoadingExtras(false);
      }
    }
    loadMultiVendorEntities();
    return () => { isMounted = false; };
  }, []);

  // Compute Order Analytics counts across 7 stages
  const orderStageCounts = useMemo(() => {
    const counts = {
      pending: 0,
      confirm: 0,
      processing: 0,
      pickup: 0,
      onTheWay: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(o => {
      const s = (o.status || '').toLowerCase().trim();
      if (s === 'pending') {
        counts.pending++;
      } else if (s === 'confirmed' || s === 'confirm') {
        counts.confirm++;
      } else if (s === 'processing' || s === 'packaging') {
        counts.processing++;
      } else if (s === 'pickup' || s === 'ready for shipment') {
        counts.pickup++;
      } else if (s === 'on the way' || s === 'on_the_way' || s === 'shipped') {
        counts.onTheWay++;
      } else if (s === 'delivered') {
        counts.delivered++;
      } else if (s === 'cancelled' || s === 'canceled' || s === 'return') {
        counts.cancelled++;
      }
    });

    return counts;
  }, [orders]);

  // User Overview Donut counts
  const totalCustomersCount = customers.length;
  const totalShopsCount = vendors.length;
  const totalRidersCount = drivers.length;
  const totalUsersCount = totalCustomersCount + totalShopsCount + totalRidersCount;

  const userOverviewData = useMemo(() => {
    return [
      { name: 'Customer', value: totalCustomersCount, color: '#10b981' }, // emerald green
      { name: 'Shop', value: totalShopsCount, color: '#8b5cf6' }, // vibrant purple
      { name: 'Rider', value: totalRidersCount, color: '#2563eb' } // vibrant blue
    ];
  }, [totalCustomersCount, totalShopsCount, totalRidersCount]);

  // Statistics Chart Trend Data (Daily, Monthly, Yearly)
  const chartData = useMemo(() => {
    if (statPeriod === 'yearly') {
      const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
      const counts: Record<number, number> = {};
      years.forEach(y => { counts[y] = 0; });

      orders.forEach(o => {
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        const y = d.getFullYear();
        if (counts[y] !== undefined) {
          counts[y]++;
        }
      });

      return years.map(y => ({
        name: String(y),
        orders: counts[y]
      }));
    }

    if (statPeriod === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const counts = Array(12).fill(0);

      orders.forEach(o => {
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        counts[d.getMonth()]++;
      });

      return months.map((m, idx) => ({
        name: m,
        orders: counts[idx]
      }));
    }

    // Daily view: 7 days or last 10 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = Array(7).fill(0);
    orders.forEach(o => {
      const d = o.createdAt ? new Date(o.createdAt) : new Date();
      counts[d.getDay()]++;
    });

    return days.map((d, idx) => ({
      name: d,
      orders: counts[idx]
    }));
  }, [orders, statPeriod]);

  // Top Trending Shops (Real DB data only)
  const topTrendingShops = useMemo(() => {
    return [...vendors]
      .sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0))
      .slice(0, 4);
  }, [vendors]);

  // Most Favorite Products (Real DB data only)
  const mostFavoriteProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        title: p.title,
        subtitle: p.category || 'General',
        saves: p.viewsCount || 0,
        image: p.image || ''
      }));
  }, [products]);

  // Top Selling Products (Real DB data only)
  const topSellingProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.soldStock || 0) - (a.soldStock || 0))
      .slice(0, 6)
      .map(p => ({
        id: p.id,
        title: p.title,
        subtitle: p.category || 'General',
        sold: p.soldStock || 0,
        image: p.image || ''
      }));
  }, [products]);

  return (
    <div className="space-y-6 font-sans pb-10">
      
      {/* 1. TOP METRIC SUMMARY CARDS (Exact match to Reference Screenshot 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Shops Card */}
        <div 
          onClick={() => onNavigateTab('vendors')}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Store className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Shops</span>
              <h3 className="text-3xl font-extrabold text-purple-600 tracking-tight mt-0.5">
                {vendors.length}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 flex items-center text-xs font-bold text-purple-600 group-hover:text-purple-700">
            <span>View Shops</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Total Products Card */}
        <div 
          onClick={() => onNavigateTab('products')}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Products</span>
              <h3 className="text-3xl font-extrabold text-blue-600 tracking-tight mt-0.5">
                {products.length}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 flex items-center text-xs font-bold text-blue-600 group-hover:text-blue-700">
            <span>View Products</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Total Orders Card */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Orders</span>
              <h3 className="text-3xl font-extrabold text-rose-500 tracking-tight mt-0.5">
                {orders.length}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 flex items-center text-xs font-bold text-rose-500 group-hover:text-rose-600">
            <span>View Orders</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Total Customers Card */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total Customers</span>
              <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-0.5">
                {customers.length}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 flex items-center text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
            <span>View Customers</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* 2. ORDER ANALYTICS CONTAINER (Exact match to Reference Screenshot 2) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Order Analytics</h3>
            <p className="text-xs text-slate-400">Track your orders at each stage</p>
          </div>
        </div>

        {/* 7 Stage Cards in responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5">
          
          {/* 1. Pending */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">Pending</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-amber-500 mt-2">
              {orderStageCounts.pending}
            </div>
          </div>

          {/* 2. Confirm */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShoppingCart className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">Confirm</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-blue-600 mt-2">
              {orderStageCounts.confirm}
            </div>
          </div>

          {/* 3. Processing */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <RefreshCw className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">Processing</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-purple-600 mt-2">
              {orderStageCounts.processing}
            </div>
          </div>

          {/* 4. Pickup */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <Package className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">Pickup</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-teal-500 mt-2">
              {orderStageCounts.pickup}
            </div>
          </div>

          {/* 5. On The Way */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">On The Way</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-sky-500 mt-2">
              {orderStageCounts.onTheWay}
            </div>
          </div>

          {/* 6. Delivered */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">Delivered</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-2">
              {orderStageCounts.delivered}
            </div>
          </div>

          {/* 7. Cancelled */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="bg-slate-50/70 hover:bg-slate-100/80 active:scale-[0.98] rounded-xl p-3.5 transition-all cursor-pointer border border-slate-100 flex flex-col justify-between min-h-[95px] group touch-manipulation col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">Cancelled</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-2xl font-extrabold text-rose-500 mt-2">
              {orderStageCounts.cancelled}
            </div>
          </div>

        </div>
      </div>

      {/* 3. STATISTICS & USER OVERVIEW (Exact match to Reference Screenshot 3) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Statistics</h3>
              <p className="text-xs text-slate-400">Overview of your platform performance</p>
            </div>
          </div>

          {/* Filter Pills, Datepicker and Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatPeriod('daily')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statPeriod === 'daily' 
                    ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setStatPeriod('monthly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statPeriod === 'monthly' 
                    ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setStatPeriod('yearly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statPeriod === 'yearly' 
                    ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Yearly
              </button>
            </div>

            {/* Date Input */}
            <div className="relative">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
              />
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                setStatPeriod('yearly');
                setCustomDate('');
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* 2-Column Layout: Left Area Chart, Right Donut User Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          
          {/* Left: Total Orders Area Chart (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">
                {orders.length}
              </span>
              <span className="text-xs font-medium text-slate-400">Total Orders</span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {orders.length > 0 ? (
                <ResponsiveContainer width="100%" height={240} minWidth={100} minHeight={200}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        fontSize: '12px',
                        fontWeight: '600'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      name="Orders" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#orderGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                  <BarChart3 className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2" />
                  <span className="text-xs font-semibold text-slate-500">No order statistics available</span>
                  <span className="text-[11px] text-slate-400">Orders placed will be charted here automatically</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: User Overview Donut Chart (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
            <div className="w-full text-left mb-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight block">
                {totalUsersCount}
              </span>
              <span className="text-xs font-medium text-slate-400">User Overview</span>
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center">
              {totalUsersCount > 0 ? (
                <>
                  <ResponsiveContainer width={192} height={192} minWidth={150} minHeight={150}>
                    <PieChart>
                      <Pie
                        data={userOverviewData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {userOverviewData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Centered Total Count */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {totalUsersCount}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 mt-0.5">Total</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <Users className="h-8 w-8 text-slate-300 stroke-[1.5] mb-1.5" />
                  <span className="text-xs font-bold text-slate-600">0 Users</span>
                  <span className="text-[10px] text-slate-400">No customers, shops, or riders yet</span>
                </div>
              )}
            </div>

            {/* Legend Pills */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span>Customer ({totalCustomersCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                <span>Shop ({totalShopsCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                <span>Rider ({totalRidersCount})</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. THREE BOTTOM MULTIVENDOR RANKING LISTS (Exact match to Reference Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Top Trending Shops */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Top Trending Shops</h4>
              <p className="text-[11px] text-slate-400">Ranked by orders received</p>
            </div>
          </div>

          <div className="space-y-3">
            {topTrendingShops.length > 0 ? (
              topTrendingShops.map((shop, idx) => (
                <div 
                  key={shop.id || idx} 
                  onClick={() => onNavigateTab('vendors')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 overflow-hidden flex items-center justify-center shrink-0">
                      {shop.logo ? (
                        <img src={shop.logo} alt={shop.storeName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {shop.storeName?.slice(0, 2)?.toUpperCase() || 'SH'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                        {shop.storeName}
                      </h5>
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{shop.rating ? Number(shop.rating).toFixed(1) : '5.0'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {shop.ordersCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">orders</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No vendors registered yet.
              </div>
            )}
          </div>
        </div>

        {/* Most Favorite Products */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Most Favorite Products</h4>
              <p className="text-[11px] text-slate-400">Ranked by customer saves</p>
            </div>
          </div>

          <div className="space-y-3">
            {mostFavoriteProducts.length > 0 ? (
              mostFavoriteProducts.map((p, idx) => (
                <div 
                  key={p.id || idx} 
                  onClick={() => onNavigateTab('products')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.title} 
                          className="w-full h-full object-cover" 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition-colors line-clamp-1">
                        {p.title}
                      </h5>
                      <span className="text-[11px] text-slate-400">{p.subtitle}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {p.saves}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">views</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No products found.
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Top Selling Products</h4>
              <p className="text-[11px] text-slate-400">Ranked by orders placed</p>
            </div>
          </div>

          <div className="space-y-3">
            {topSellingProducts.length > 0 ? (
              topSellingProducts.map((p, idx) => (
                <div 
                  key={p.id || idx} 
                  onClick={() => onNavigateTab('products')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.title} 
                          className="w-full h-full object-cover" 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="max-w-[140px]">
                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {p.title}
                      </h5>
                      <span className="text-[11px] text-slate-400">{p.subtitle}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {p.sold}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">sold</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No products found.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
