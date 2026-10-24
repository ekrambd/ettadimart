import { useState, useMemo } from 'react';
import { 
  ShoppingBag, DollarSign, Package, Users, ArrowRight, 
  Search, Truck, Clock, CheckCircle2, XCircle, RefreshCw,
  Calendar, Filter, CalendarRange, RotateCcw, TrendingUp, Check
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Product, BookOrder, Customer, ActiveTab } from '../types';

interface DashboardOverviewProps {
  products: Product[];
  orders: BookOrder[];
  customers: Customer[];
  onNavigateTab: (tab: ActiveTab) => void;
}

export type DateFilterPreset = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'lastWeek' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'all' 
  | 'custom';

// Helper to safely parse order timestamps
function parseOrderTimestamp(order: BookOrder): number {
  if (order.createdAt) {
    const t = new Date(order.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (order.orderDate) {
    const t = new Date(order.orderDate).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

// Format date to YYYY-MM-DD
function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardOverview({ 
  products = [], 
  orders = [], 
  customers = [], 
  onNavigateTab 
}: DashboardOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('thisMonth');
  
  // Custom Date range state (default to last 30 days)
  const todayStr = useMemo(() => formatYYYYMMDD(new Date()), []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatYYYYMMDD(d);
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(defaultStartStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Compute Active Time Range [startMs, endMs] and human label
  const activeDateRange = useMemo(() => {
    const now = new Date();
    
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const label = `Today (${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      return { start, end, label };
    }

    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).getTime();
      const label = `Yesterday (${yesterday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      return { start, end, label };
    }

    if (dateFilter === 'last7days') {
      const startD = new Date(now);
      startD.setDate(now.getDate() - 6);
      const start = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const label = `Last 7 Days (${startD.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;
      return { start, end, label };
    }

    if (dateFilter === 'lastWeek') {
      // Last completed calendar week (Monday to Sunday)
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
      const daysSinceSunday = currentDay === 0 ? 7 : currentDay;
      const lastWeekSunday = new Date(now);
      lastWeekSunday.setDate(now.getDate() - daysSinceSunday);
      const lastWeekMonday = new Date(lastWeekSunday);
      lastWeekMonday.setDate(lastWeekSunday.getDate() - 6);

      const start = new Date(lastWeekMonday.getFullYear(), lastWeekMonday.getMonth(), lastWeekMonday.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(lastWeekSunday.getFullYear(), lastWeekSunday.getMonth(), lastWeekSunday.getDate(), 23, 59, 59, 999).getTime();
      const label = `Last Week (${lastWeekMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${lastWeekSunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;
      return { start, end, label };
    }

    if (dateFilter === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const label = `This Month (${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`;
      return { start, end, label };
    }

    if (dateFilter === 'lastMonth') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const label = `Last Month (${lastMonthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`;
      return { start, end, label };
    }

    if (dateFilter === 'custom') {
      const start = customStartDate 
        ? new Date(`${customStartDate}T00:00:00`).getTime() 
        : 0;
      const end = customEndDate 
        ? new Date(`${customEndDate}T23:59:59.999`).getTime() 
        : Date.now();
      const label = `Custom (${customStartDate || 'Start'} to ${customEndDate || 'Now'})`;
      return { start, end, label };
    }

    // Default: 'all'
    return { start: 0, end: Infinity, label: 'All Time (সব সময়)' };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filter orders by active date range
  const dateFilteredOrders = useMemo(() => {
    if (dateFilter === 'all') return orders;
    const { start, end } = activeDateRange;
    return orders.filter(o => {
      const t = parseOrderTimestamp(o);
      if (t === 0) return true; // Include if timestamp missing
      return t >= start && t <= end;
    });
  }, [orders, dateFilter, activeDateRange]);

  // Filtered metrics computed dynamically from dateFilteredOrders
  const deliveredOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Delivered').length;
  }, [dateFilteredOrders]);

  const cancelledOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Cancelled').length;
  }, [dateFilteredOrders]);

  const returnedOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Return').length;
  }, [dateFilteredOrders]);

  const totalRevenue = useMemo(() => {
    return dateFilteredOrders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  }, [dateFilteredOrders]);

  const pendingOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Pending').length;
  }, [dateFilteredOrders]);

  const confirmedOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Confirmed').length;
  }, [dateFilteredOrders]);

  // Average Order Value (AOV)
  const averageOrderValue = useMemo(() => {
    const validOrders = dateFilteredOrders.filter(o => o.status !== 'Cancelled');
    if (validOrders.length === 0) return 0;
    return Math.round(totalRevenue / validOrders.length);
  }, [dateFilteredOrders, totalRevenue]);

  // Inventory & stock (system level)
  const lowStockProductsCount = useMemo(() => {
    return products.filter(p => (p.stock ?? 0) <= 5 || !p.isAvailable).length;
  }, [products]);

  // Dynamic Chart Data based on selected date range
  const chartData = useMemo(() => {
    const { start, end } = activeDateRange;

    // Single-day view (today or yesterday): show 3-hour time slots
    if (dateFilter === 'today' || dateFilter === 'yesterday') {
      const slots = [
        { label: '12 AM', startH: 0, endH: 3 },
        { label: '3 AM', startH: 3, endH: 6 },
        { label: '6 AM', startH: 6, endH: 9 },
        { label: '9 AM', startH: 9, endH: 12 },
        { label: '12 PM', startH: 12, endH: 15 },
        { label: '3 PM', startH: 15, endH: 18 },
        { label: '6 PM', startH: 18, endH: 21 },
        { label: '9 PM', startH: 21, endH: 24 }
      ];

      const baseDate = dateFilter === 'today' ? new Date() : new Date(Date.now() - 86400000);
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth();
      const d = baseDate.getDate();

      return slots.map(slot => {
        const slotStart = new Date(y, m, d, slot.startH, 0, 0, 0).getTime();
        const slotEnd = new Date(y, m, d, slot.endH === 24 ? 23 : slot.endH, slot.endH === 24 ? 59 : 0, slot.endH === 24 ? 59 : 0, 999).getTime();

        const slotOrders = dateFilteredOrders.filter(o => {
          const t = parseOrderTimestamp(o);
          return t >= slotStart && t <= slotEnd;
        });

        const slotRev = slotOrders
          .filter(o => o.status !== 'Cancelled')
          .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        return {
          name: slot.label,
          orders: slotOrders.length,
          revenue: slotRev
        };
      });
    }

    // Multi-day ranges
    let spanDays = 7;
    if (dateFilter === 'last7days' || dateFilter === 'lastWeek') {
      spanDays = 7;
    } else if (dateFilter === 'thisMonth' || dateFilter === 'lastMonth') {
      spanDays = Math.min(Math.max(Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1), 31);
    } else if (dateFilter === 'custom') {
      spanDays = Math.min(Math.max(Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1), 60);
    } else {
      // 'all' time: default to last 7 days for readable trend
      spanDays = 7;
    }

    // Daily buckets for up to 31 days
    if (spanDays <= 31) {
      const data = [];
      const startDateObj = dateFilter === 'all' 
        ? new Date(Date.now() - 6 * 86400000) 
        : new Date(start);

      for (let i = 0; i < spanDays; i++) {
        const cur = new Date(startDateObj);
        cur.setDate(startDateObj.getDate() + i);
        const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0).getTime();
        const dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59, 999).getTime();

        const dayOrders = (dateFilter === 'all' ? orders : dateFilteredOrders).filter(o => {
          const t = parseOrderTimestamp(o);
          return t >= dayStart && t <= dayEnd;
        });

        const dayRevenue = dayOrders
          .filter(o => o.status !== 'Cancelled')
          .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        data.push({
          name: cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          orders: dayOrders.length,
          revenue: dayRevenue
        });
      }
      return data;
    }

    // Grouping into 10 intervals for large custom ranges
    const intervalCount = 10;
    const intervalMs = (end - start) / intervalCount;
    const data = [];
    for (let i = 0; i < intervalCount; i++) {
      const intStart = start + (i * intervalMs);
      const intEnd = start + ((i + 1) * intervalMs);
      const cur = new Date(intStart);

      const matched = dateFilteredOrders.filter(o => {
        const t = parseOrderTimestamp(o);
        return t >= intStart && t < intEnd;
      });

      const rev = matched
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

      data.push({
        name: cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        orders: matched.length,
        revenue: rev
      });
    }
    return data;
  }, [dateFilter, activeDateRange, dateFilteredOrders, orders]);

  // Filtered orders for table (date filter + search filter + status filter)
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const matchesSearch = 
        !searchTerm || 
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm) ||
        o.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [dateFilteredOrders, searchTerm, statusFilter]);

  const getStatusBadge = (status: BookOrder['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </span>
        );
      case 'Packaging':
      case 'Ready for Shipment':
      case 'Shipped':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="h-3 w-3 mr-1" />
            {status}
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </span>
        );
      case 'Return':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <RefreshCw className="h-3 w-3 mr-1" />
            Return
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium bg-slate-100 text-slate-700">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const presets: { id: DateFilterPreset; label: string; short: string }[] = [
    { id: 'today', label: 'Today', short: 'Today' },
    { id: 'yesterday', label: 'Yesterday', short: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 Days', short: '7 Days' },
    { id: 'lastWeek', label: 'Last Week', short: 'Last Week' },
    { id: 'thisMonth', label: 'This Month', short: 'This Month' },
    { id: 'lastMonth', label: 'Last Month', short: 'Last Month' },
    { id: 'all', label: 'All Time', short: 'All Time' },
    { id: 'custom', label: 'Custom Range 📅', short: 'Custom' }
  ];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Date Filter Bar Card */}
      <div className="bg-white p-4 sm:p-5 rounded-[6px] border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[6px] bg-[#F37022]/10 text-[#F37022] flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Dashboard Analytics & Filters
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-bold bg-[#F37022]/10 text-[#F37022]">
                  {activeDateRange.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Filter orders, revenue, and delivery performance by exact date range
              </p>
            </div>
          </div>

          {/* Quick Reset or Refresh */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            {dateFilter !== 'thisMonth' && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('thisMonth');
                  setIsCustomOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-[6px] transition-colors cursor-pointer"
                title="Reset to this month"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to This Month</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Preset Buttons */}
        <div className="pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {presets.map((preset) => {
              const isActive = dateFilter === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(preset.id);
                    if (preset.id === 'custom') {
                      setIsCustomOpen(true);
                    } else {
                      setIsCustomOpen(false);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#F37022] text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Picker Accordion/Panel */}
          {(isCustomOpen || dateFilter === 'custom') && (
            <div className="mt-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-from-date" className="text-xs font-bold text-slate-600 shrink-0">From:</label>
                  <input
                    id="custom-from-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setDateFilter('custom');
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-[6px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F37022]/20 focus:border-[#F37022]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="custom-to-date" className="text-xs font-bold text-slate-600 shrink-0">To:</label>
                  <input
                    id="custom-to-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setDateFilter('custom');
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-[6px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F37022]/20 focus:border-[#F37022]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('custom');
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-[#F37022] hover:bg-[#d95c14] text-white rounded-[6px] transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply Filter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate(defaultStartStr);
                    setCustomEndDate(todayStr);
                    setDateFilter('thisMonth');
                    setIsCustomOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-[6px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Period Summary Metric Banner */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="font-semibold text-slate-500">Period Summary:</span>
            <div className="inline-flex items-center gap-1 text-slate-700">
              <span className="font-bold text-slate-900">{dateFilteredOrders.length}</span>
              <span>Orders</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="inline-flex items-center gap-1 text-slate-700">
              <span className="font-bold text-emerald-600">৳{totalRevenue.toLocaleString()}</span>
              <span>Revenue</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="inline-flex items-center gap-1 text-slate-700">
              <span className="font-bold text-slate-800">৳{averageOrderValue.toLocaleString()}</span>
              <span>Avg. Order Value</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="inline-flex items-center gap-1 text-emerald-700">
              <span className="font-bold">{deliveredOrdersCount}</span>
              <span>Delivered</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="inline-flex items-center gap-1 text-amber-700">
              <span className="font-bold">{pendingOrdersCount}</span>
              <span>Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stat Cards (Reflecting Selected Date Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Revenue</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded-[4px] font-semibold">Filtered</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">৳{totalRevenue.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">
              Avg. Ticket: ৳{averageOrderValue.toLocaleString()}
            </span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-500/10">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Total Orders</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-[4px] font-semibold">Filtered</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
              {dateFilteredOrders.length.toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium block">
              Confirmed: {confirmedOrdersCount} | Pending: {pendingOrdersCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-blue-50 text-blue-600 flex items-center justify-center ring-4 ring-blue-500/10 group-hover:scale-105 transition-transform">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Stock / Products (Store Inventory) */}
        <div 
          onClick={() => onNavigateTab('products')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Inventory & Stock</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">
              {products.length.toLocaleString()}
            </h3>
            <span className={`text-[11px] font-medium block ${lowStockProductsCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
              {lowStockProductsCount > 0 ? `Low Stock / Out of Stock: ${lowStockProductsCount}` : 'All items in stock'}
            </span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-purple-50 text-purple-600 flex items-center justify-center ring-4 ring-purple-500/10 group-hover:scale-105 transition-transform">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Total Customers */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Total Customers</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors">
              {customers.length.toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium block">
              Delivered in period: {deliveredOrdersCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-sky-50 text-sky-600 flex items-center justify-center ring-4 ring-sky-500/10 group-hover:scale-105 transition-transform">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Additional Status Stat Cards (Filtered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Pending</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">{pendingOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Awaiting processing</span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-amber-50 text-amber-600 flex items-center justify-center ring-4 ring-amber-500/10 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Delivered Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Delivered</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">{deliveredOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Successfully fulfilled</span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-500/10 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Cancelled Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Cancelled</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">{cancelledOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Cancelled orders</span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-rose-50 text-rose-600 flex items-center justify-center ring-4 ring-rose-500/10 group-hover:scale-105 transition-transform">
            <XCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Returned Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-[6px] border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block">Returned</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-orange-600 tracking-tight">{returnedOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Courier returned parcels</span>
          </div>
          <div className="h-12 w-12 rounded-[6px] bg-orange-50 text-orange-600 flex items-center justify-center ring-4 ring-orange-500/10 group-hover:scale-105 transition-transform">
            <RefreshCw className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts (Reflecting Selected Date Filter) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orders Trend */}
        <div className="w-full min-w-0 bg-white rounded-[6px] border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Orders Trend ({activeDateRange.label})
              </h3>
              <p className="text-[11px] text-slate-400">Order frequency and volume across this period</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-[6px]">
              {dateFilteredOrders.length} Orders
            </span>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height={240} minWidth={100} minHeight={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="w-full min-w-0 bg-white rounded-[6px] border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Revenue Trend ({activeDateRange.label})
              </h3>
              <p className="text-[11px] text-slate-400">Sales revenue generated across this period</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[6px]">
              ৳{totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height={240} minWidth={100} minHeight={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `৳${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  formatter={(val) => [`৳${Number(val).toLocaleString()}`, 'Revenue']} 
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content: Orders List Filtered by Active Date */}
      <div className="w-full bg-white rounded-[6px] border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Period Orders</h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-[6px]">
                {filteredOrders.length} matching
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Orders placed within {activeDateRange.label}
            </p>
          </div>
          
          <button 
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-[#F37022] hover:text-[#d95c14] font-bold inline-flex items-center group cursor-pointer"
          >
            Open Order Manager ({orders.length} total)
            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Quick Search and Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone or order ID in this period..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-[6px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F37022]/20 focus:border-[#F37022]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-[6px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F37022]/20 focus:border-[#F37022] cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Packaging">Packaging</option>
            <option value="Ready for Shipment">Ready for Shipment</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Return">Return</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-y border-slate-100 text-[11px]">
                <th className="py-2.5 px-3 font-semibold">ID & Date</th>
                <th className="py-2.5 px-3 font-semibold">Customer & Mobile</th>
                <th className="py-2.5 px-3 font-semibold">Product</th>
                <th className="py-2.5 px-3 font-semibold">Total Price</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.slice(0, 10).map((ord) => {
                const orderTime = parseOrderTimestamp(ord);
                const dateDisplay = orderTime > 0 
                  ? new Date(orderTime).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'N/A';

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 font-mono block">{ord.id}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {dateDisplay}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">{ord.customerName}</span>
                      <a href={`tel:${ord.phone}`} className="text-[10px] font-mono text-[#F37022] hover:underline block">{ord.phone}</a>
                    </td>
                    <td className="py-3 px-3 max-w-[200px] truncate">
                      <span className="text-slate-700 block truncate" title={ord.productTitle}>{ord.productTitle}</span>
                      <span className="text-[10px] text-slate-400 block">Quantity: {ord.quantity || 1}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-600">৳{ord.totalPrice || ord.price || 0}</span>
                      <span className="text-[10px] text-slate-400 block">{ord.paymentMethod || 'COD'}</span>
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(ord.status)}
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CalendarRange className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-slate-500 font-semibold text-xs">
                        No orders found for {activeDateRange.label}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter('all');
                          setSearchTerm('');
                          setStatusFilter('all');
                        }}
                        className="text-xs text-[#F37022] hover:underline font-bold"
                      >
                        Show All Time Orders
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
