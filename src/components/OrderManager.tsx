import React, { useEffect, useState, useRef } from 'react';
import { 
  ShoppingBag, ExternalLink, Search, Filter, Plus, Phone, MapPin, Calendar, 
  CheckCircle, Clock, Truck, XCircle, Trash2, Edit3, Printer, 
  Check, ArrowUpDown, User, Package, DollarSign, Send, ShieldCheck,
  ChevronDown, FileSpreadsheet, Download, Upload, MessageSquare,
  Copy, RefreshCw, FileText, CheckSquare, AlertCircle, Sparkles, Tag,
  ArrowLeft, MoreVertical
} from 'lucide-react';
import { BookOrder } from '../types';
import { OrderDetailsView } from './OrderDetailsView';
import { dbService } from '../lib/dbService';
import { ApiClient } from '../services/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import ResponsiveImage from './ResponsiveImage';

import { ConfirmDialog } from './ui/ConfirmDialog';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';

interface OrderManagerProps {
  orders: BookOrder[];
  onAddOrder: (order: BookOrder) => Promise<void>;
  onUpdateOrder: (order: BookOrder) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onRefreshOrders?: () => Promise<void>;
}

// Crisp Barcode SVG Generator for print outputs
function BarcodeSVG({ value, height = 38 }: { value: string; height?: number }) {
  const bars: { width: number; space: number }[] = [];
  const clean = (value || 'ORD-1001').toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    bars.push({
      width: (code % 3) + 1.5,
      space: ((code * 2) % 3) + 1.5
    });
  }

  let currentX = 10;
  bars.forEach(b => { currentX += b.width + b.space; });
  const totalWidth = currentX + 10;

  let renderX = 10;
  return (
    <svg viewBox={`0 0 ${totalWidth} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      {bars.map((b, idx) => {
        const x = renderX;
        renderX += b.width + b.space;
        return (
          <rect
            key={idx}
            x={x}
            y={0}
            width={b.width}
            height={height}
            fill="#000000"
          />
        );
      })}
    </svg>
  );
}

// Available Export Column Options for Custom Column Modal
const DEFAULT_EXPORT_COLUMNS = [
  { id: 'id', label: 'ID', defaultChecked: true },
  { id: 'customerName', label: 'Customer Name', defaultChecked: true },
  { id: 'phone', label: 'Phone', defaultChecked: true },
  { id: 'address', label: 'Address', defaultChecked: true },
  { id: 'status', label: 'Status', defaultChecked: true },
  { id: 'channel', label: 'Channel', defaultChecked: true },
  { id: 'shopId', label: 'Shop ID', defaultChecked: true },
  { id: 'supplierIds', label: 'Supplier IDs', defaultChecked: true },
  { id: 'resellerId', label: 'Reseller ID', defaultChecked: true },
  { id: 'attributionId', label: 'Attribution ID', defaultChecked: true },
  { id: 'affiliateCode', label: 'Affiliate Code', defaultChecked: true },
  { id: 'net', label: 'Net', defaultChecked: true },
  { id: 'logistics', label: 'Logistics', defaultChecked: true },
  { id: 'logisticsCharge', label: 'Logistics Charge', defaultChecked: true },
  { id: 'total', label: 'Total', defaultChecked: true },
  { id: 'rEarn', label: 'R. Earn', defaultChecked: true },
  { id: 'resell', label: 'Resell', defaultChecked: true },
  { id: 'paid', label: 'Paid', defaultChecked: true },
  { id: 'due', label: 'Due', defaultChecked: true },
  { id: 'rDue', label: 'R. Due', defaultChecked: true },
  { id: 'profit', label: 'Profit', defaultChecked: true },
  { id: 'created', label: 'Created', defaultChecked: true },
  { id: 'logisticsNote', label: 'Logistics Note', defaultChecked: true },
  { id: 'contactName', label: 'Contact Name', defaultChecked: true },
  { id: 'contactPhone', label: 'Contact Phone', defaultChecked: true },
];


const MAIN_STATUSES = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Confirmed', label: 'Approved' },
  { id: 'Packaging', label: 'Packaging' },
  { id: 'Ready for Shipment', label: 'Ready for Shipment' },
  { id: 'Shipped', label: 'Courier' },
  { id: 'Delivered', label: 'Delivered' }
];

const EXCEPTION_STATUSES = ['Hold', 'Under Review', 'Not Responding', 'Return', 'Cancelled'];

function StatusStepper({ order, onChange }: { order: BookOrder, onChange: (o: BookOrder, s: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const currentIdx = MAIN_STATUSES.findIndex(s => s.id === order.status);
  const isException = EXCEPTION_STATUSES.includes(order.status) || (currentIdx === -1 && order.status);

  return (
    <div className="flex items-center w-full min-w-[200px] gap-2">
      {isException ? (
        <div className="flex-1 flex items-center justify-between bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
          <span className="text-[11px] font-bold text-rose-700">{order.status}</span>
        </div>
      ) : (
        <div className="flex items-center flex-1">
          {MAIN_STATUSES.map((step, idx) => {
            const isCompleted = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            return (
              <React.Fragment key={step.id}>
                <div 
                  onClick={() => onChange(order, step.id)}
                  title={`Mark as ${step.label}`}
                  className={`relative flex items-center justify-center w-4 h-4 rounded-full cursor-pointer transition-all shrink-0 border-2 ${
                    isCurrent ? 'border-teal-600 bg-white ring-2 ring-teal-100 ring-offset-1' :
                    isCompleted ? 'border-teal-600 bg-teal-600' : 
                    'border-slate-200 bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {isCompleted && !isCurrent && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  {isCurrent && <div className="w-1.5 h-1.5 bg-teal-600 rounded-full" />}
                </div>
                {idx < MAIN_STATUSES.length - 1 && (
                  <div className={`h-[3px] flex-1 mx-0.5 rounded-full transition-colors ${
                    currentIdx > idx ? 'bg-teal-600' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      
      {/* Exception Menu */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[60]"
            >
               <div className="px-3 pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 Update Status
               </div>
               
               {isException && (
                 <button 
                   onClick={() => { onChange(order, 'Pending'); setShowMenu(false); }}
                   className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                 >
                   <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                   waiting-Reset to
                 </button>
               )}
               {EXCEPTION_STATUSES.map(status => (
                 <button 
                   key={status}
                   onClick={() => { onChange(order, status); setShowMenu(false); }}
                   className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 ${
                     status === 'Cancelled' ? 'text-rose-600 hover:bg-rose-50' : 'text-amber-700 hover:bg-amber-50'
                   }`}
                 >
                   {status === 'Cancelled' ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                   {status === 'Hold'? 'Suspended' : status === 'Under Review'? 'Verification' : status === 'Not Responding'? 'No answer' : status === 'Return'? 'Return' : 'canceled'}
                 </button>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OrderManager({
  orders,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onRefreshOrders
}: OrderManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'landing' | 'physical' | 'store'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchDialog, setDispatchDialog] = useState<{ orderId: string; message: string; success: boolean } | null>(null);
  const [openActionMenuOrderId, setOpenActionMenuOrderId] = useState<string | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<BookOrder | null>(null);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<{ newStatus: string; count: number } | null>(null);
  const [invoiceBrand, setInvoiceBrand] = useState({
    name: 'ETTADI MART',
    tagline: '',
    phone: '',
    email: '',
    website: '',
    logo: ''
  });

  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Print Mode State
  const [activePrintMode, setActivePrintMode] = useState<
    'invoice' | 'stickers' | 'mini-stickers' | 'packing-slips' | 'pos-receipt' | 'pick-list' | 'check-list' | 'commercial' | null
  >(null);
  const [printOrdersList, setPrintOrdersList] = useState<BookOrder[]>([]);

  // Modals
  const [isExportColumnsModalOpen, setIsExportColumnsModalOpen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(
    DEFAULT_EXPORT_COLUMNS.map(c => c.id)
  );

  const [isImportCourierModalOpen, setIsImportCourierModalOpen] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  
  const [isBulkSmsModalOpen, setIsBulkSmsModalOpen] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState('Your order has been successfully received. Shipping on cash-on-delivery by courier soon. Thank you!');
  const [sendingSms, setSendingSms] = useState(false);

  // Customer Courier Delivery Ratio & Fraud Check Modal
  const [bulkCourierConfirm, setBulkCourierConfirm] = useState<{
    isOpen: boolean;
    provider: 'steadfast' | 'pathao';
    providerName: string;
    count: number;
  }>({
    isOpen: false,
    provider: 'steadfast',
    providerName: 'Steadfast',
    count: 0
  });

  // Add Physical Order Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    productTitle: '',
    price: 0,
    deliveryCharge: 0,
    quantity: 1,
    orderType: 'physical' as 'physical' | 'landing' | 'store',
    status: 'Confirmed' as BookOrder['status'],
    notes: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<BookOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<BookOrder | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    productTitle: '',
    price: 0,
    quantity: 1,
    deliveryCharge: 0,
    couponCode: '',
    luckyCouponCode: '',
    discountAmount: 0,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-order-actions]')) {
        setOpenActionMenuOrderId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadInvoiceBrand = async () => {
      try {
        const [ecomSettings, instituteInfo] = await Promise.all([
          dbService.getEcomSettings(),
          dbService.getInstituteInfo()
        ]);

        if (!mounted) return;

        const rawDomain = ecomSettings?.storeDomain || instituteInfo?.website || '';
        const cleanWebsite = rawDomain ? rawDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

        setInvoiceBrand({
          name: ecomSettings?.storeName || instituteInfo?.name || 'ETTADI MART',
          tagline: ecomSettings?.storeTagline || instituteInfo?.description || '',
          phone: instituteInfo?.phone || ecomSettings?.supportPhone || '',
          email: instituteInfo?.email || ecomSettings?.supportEmail || '',
          website: cleanWebsite,
          logo: ecomSettings?.storeLogo || instituteInfo?.logo || ''
        });
      } catch (err) {
        console.warn('Failed to load invoice brand data:', err);
      }
    };

    loadInvoiceBrand();
    return () => {
      mounted = false;
    };
  }, []);

  const calculateOrderTotal = (price: number, quantity: number, deliveryCharge: number, discountAmount: number) => {
    const subtotal = Math.max(0, price) * Math.max(1, quantity);
    return Math.max(0, subtotal + Math.max(0, deliveryCharge) - Math.max(0, discountAmount));
  };

  const openEditOrder = (order: BookOrder) => {
    setEditingOrder(order);
    setEditFormData({
      customerName: order.customerName || '',
      phone: order.phone || '',
      address: order.address || '',
      productTitle: order.productTitle || '',
      price: order.price || 0,
      quantity: order.quantity || 1,
      deliveryCharge: order.deliveryCharge || 0,
      couponCode: order.couponCode || '',
      luckyCouponCode: order.luckyCouponCode || '',
      discountAmount: order.discountAmount || 0,
      orderType: order.orderType || 'physical',
      status: order.status || 'Confirmed',
      notes: order.notes || ''
    } as any);
    setViewingOrder(null);
    setIsEditModalOpen(true);
  };

  const closeEditOrder = () => {
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsSubmitting(true);
    try {
      const discountAmount = Math.max(0, Number(editFormData.discountAmount) || 0);
      const totalPrice = calculateOrderTotal(
        Number(editFormData.price) || 0,
        Number(editFormData.quantity) || 1,
        Number(editFormData.deliveryCharge) || 0,
        discountAmount
      );

      const updatedOrder: BookOrder = {
        ...editingOrder,
        customerName: (editFormData.customerName || '').trim(),
        phone: (editFormData.phone || '').trim(),
        address: (editFormData.address || '').trim(),
        productTitle: (editFormData.productTitle || '').trim() || editingOrder.productTitle,
        price: Number(editFormData.price) || 0,
        quantity: Math.max(1, Number(editFormData.quantity) || 1),
        deliveryCharge: Number(editFormData.deliveryCharge) || 0,
        couponCode: (editFormData.couponCode || '').trim() || undefined,
        luckyCouponCode: (editFormData.luckyCouponCode || '').trim() || undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        totalPrice,
        notes: (editFormData.notes || '').trim() || undefined
      };

      await onUpdateOrder(updatedOrder);
      closeEditOrder();
    } catch (err) {
      console.error('Update order error:', err);
      alert('There was a problem updating the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.luckyCouponCode && order.luckyCouponCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.address && order.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || order.orderType === typeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  // Selected orders array
  const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

  // Metrics
  const totalOrders = orders.length;
  const landingCount = orders.filter(o => o.orderType === 'landing').length;
  const physicalCount = orders.filter(o => o.orderType === 'physical').length;
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const totalRevenue = orders
    .filter(o => o.status === 'Delivered' || o.status === 'Confirmed' || o.status === 'Shipped')
    .reduce((sum, o) => sum + (o.totalPrice || 580), 0);

  // Handlers for Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleStatusChange = async (order: BookOrder, newStatus: BookOrder['status']) => {
    const updated = { ...order, status: newStatus };
    await onUpdateOrder(updated);
  };

  // Bulk Status Update Action
  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order.');
      return;
    }
    setBulkStatusConfirm({ newStatus, count: selectedOrderIds.length });
  };

  const confirmBulkStatusChange = async () => {
    if (!bulkStatusConfirm) return;
    const { newStatus } = bulkStatusConfirm;
    const idsToUpdate = [...selectedOrderIds];
    setBulkStatusConfirm(null);

    for (const orderId of idsToUpdate) {
      const target = orders.find(o => o.id === orderId);
      if (target) {
        await onUpdateOrder({ ...target, status: newStatus as any });
      }
    }

    setIsActionsMenuOpen(false);
  };


  // Dispatch to Steadfast Courier
  const handleSteadfastDispatch = async (order: BookOrder) => {
    setDispatchingId(order.id);
    setOpenActionMenuOrderId(null);
    try {
      const result = await dbService.sendToSteadfastCourier(order);
      if (result.success && result.trackingCode) {
        onUpdateOrder({
          ...order,
          status: 'Shipped',
          courierProvider: 'steadfast',
          steadfastTrackingCode: result.trackingCode,
          steadfastStatus: 'In Transit'
        });
      }
      setDispatchDialog({
        orderId: order.id,
        message: result.message || 'Parcel entry has been successfully made to Steadfast Courier!',
        success: result.success
      });
    } catch (err: any) {
      console.error('Steadfast dispatch error:', err);
      setDispatchDialog({
        orderId: order.id,
        message: err?.message || 'There is a problem with courier booking',
        success: false
      });
    } finally {
      setDispatchingId(null);
    }
  };

  // Dispatch to Pathao Courier
  const handlePathaoDispatch = async (order: BookOrder) => {
    setDispatchingId(order.id);
    setOpenActionMenuOrderId(null);
    try {
      const result = await dbService.sendToPathaoCourier(order);
      if (result.success && result.consignmentId) {
        onUpdateOrder({
          ...order,
          status: 'Shipped',
          courierProvider: 'pathao',
          pathaoConsignmentId: result.consignmentId,
          pathaoTrackingCode: result.trackingCode || result.consignmentId,
          pathaoStatus: result.orderStatus || 'Pending',
          pathaoDeliveryFee: result.deliveryFee
        });
      }
      setDispatchDialog({
        orderId: order.id,
        message: result.message || `send courierE successfulBooking done! (Consignment: ${result.consignmentId})`,
        success: result.success
      });
    } catch (err: any) {
      console.error('Pathao dispatch error:', err);
      setDispatchDialog({
        orderId: order.id,
        message: err?.message || 'There is a problem with the booking of Pathao Courier',
        success: false
      });
    } finally {
      setDispatchingId(null);
    }
  };

  const handleBulkTransferToCourier = (provider: 'steadfast' | 'pathao' = 'steadfast') => {
    if (selectedOrderIds.length === 0) {
      return;
    }

    const providerName = provider === 'pathao'? 'Send it' : 'Steadfast';
    setBulkCourierConfirm({
      isOpen: true,
      provider,
      providerName,
      count: selectedOrderIds.length
    });
  };

  const handleExecuteBulkTransfer = async () => {
    const { provider, providerName } = bulkCourierConfirm;
    setBulkCourierConfirm(prev => ({ ...prev, isOpen: false }));

    let successCount = 0;
    for (const id of selectedOrderIds) {
      const target = orders.find(o => o.id === id);
      if (target) {
        try {
          if (provider === 'pathao') {
            const res = await dbService.sendToPathaoCourier(target);
            if (res.success && res.consignmentId) {
              await onUpdateOrder({
                ...target,
                status: 'Shipped',
                courierProvider: 'pathao',
                pathaoConsignmentId: res.consignmentId,
                pathaoTrackingCode: res.trackingCode || res.consignmentId,
                pathaoStatus: res.orderStatus || 'Pending',
                pathaoDeliveryFee: res.deliveryFee
              });
              successCount++;
            }
          } else {
            const res = await dbService.sendToSteadfastCourier(target);
            if (res.success && res.trackingCode) {
              await onUpdateOrder({ 
                ...target, 
                status: 'Shipped', 
                courierProvider: 'steadfast',
                steadfastTrackingCode: res.trackingCode,
                steadfastStatus: 'In Transit'
              });
              successCount++;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    setIsActionsMenuOpen(false);
  };

  const handleDeleteOrderClick = (order: BookOrder) => {
    setOpenActionMenuOrderId(null);
    setDeleteConfirmOrder(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    const target = deleteConfirmOrder;
    setDeleteConfirmOrder(null);
    await onDeleteOrder(target.id);
  };

  const handleSyncCourier = async () => {
    const candidates = orders.filter(order =>
      (order.steadfastTrackingCode || order.pathaoConsignmentId) && 
      (selectedOrderIds.length === 0 || selectedOrderIds.includes(order.id))
    );
    if (candidates.length === 0) {
      alert('Could not find Steadfast or Pathao tracking code to sync.');
      return;
    }

    let successCount = 0;
    for (const order of candidates) {
      try {
        if (order.pathaoConsignmentId) {
          const result = await ApiClient.getPathaoStatus(order.pathaoConsignmentId);
          const normalized = (result.status || '').toLowerCase();
          const status = normalized.includes('delivered')
            ? 'Delivered'
            : (normalized.includes('cancelled') || normalized.includes('returned'))
              ? 'Return'
              : order.status;
          await onUpdateOrder({ ...order, status, pathaoStatus: result.status });
          successCount++;
        } else if (order.steadfastTrackingCode) {
          const result = await ApiClient.getSteadfastStatus(order.steadfastTrackingCode);
          const normalized = result.status.toLowerCase();
          const status = normalized === 'delivered'
            ? 'Delivered'
            : normalized.includes('cancelled')
              ? 'Cancelled'
              : order.status;
          await onUpdateOrder({ ...order, status, steadfastStatus: result.status });
          successCount++;
        }
      } catch (error) {
        console.error(`Courier sync failed for ${order.id}:`, error);
      }
    }
    setIsActionsMenuOpen(false);
    alert(`${successCount} / ${candidates.length} T the courier Status successfulway synced।`);
  };

  // Export as Steadfast Bulk CSV Format
  const exportSteadfastCSV = () => {
    const list = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (list.length === 0) {
      alert('There are no orders to export.');
      return;
    }

    const headers = ['Invoice', 'Name', 'Contact', 'Address', 'Amount', 'Note'];
    const rows = list.map(o => [
      `"${o.id}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.phone}"`,
      `"${o.address.replace(/"/g, '""')}"`,
      `"${o.totalPrice || (o.price * o.quantity + o.deliveryCharge)}"`,
      `"${(o.productTitle + ' x' + o.quantity).replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Steadfast_Bulk_Upload_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Export as Pathao Bulk CSV Format
  const exportPathaoCSV = () => {
    const list = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (list.length === 0) {
      alert('There are no orders to export.');
      return;
    }

    const headers = [
      'Item Type', 'Delivery Type', 'Item Quantity', 'Recipient Name', 
      'Recipient Phone', 'Recipient Address', 'Recipient City', 'Recipient Zone', 
      'Amount to Collect', 'Item Description'
    ];

    const rows = list.map(o => [
      '"PARCEL"',
      '"NORMAL"',
      `"${o.quantity || 1}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.phone}"`,
      `"${o.address.replace(/"/g, '""')}"`,
      `"${o.district || 'Dhaka'}"`,
      `"${o.thana || 'Dhaka'}"`,
      `"${o.totalPrice || (o.price * o.quantity + o.deliveryCharge)}"`,
      `"${(o.productTitle + ' - ' + o.id).replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pathao_Bulk_Upload_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Custom Columns Export (Screenshot 5)
  const handleDownloadCustomColumnsCSV = () => {
    const list = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (list.length === 0) {
      alert('There are no orders to export.');
      return;
    }

    const cols = DEFAULT_EXPORT_COLUMNS.filter(c => selectedExportColumns.includes(c.id));
    const headers = cols.map(c => c.label);

    const rows = list.map(o => {
      return cols.map(c => {
        let val = '';
        switch (c.id) {
          case 'id': val = o.id; break;
          case 'customerName': val = o.customerName; break;
          case 'phone': val = o.phone; break;
          case 'address': val = o.address; break;
          case 'status': val = o.status; break;
          case 'channel': val = o.orderType; break;
          case 'shopId': val = 'SHOP-01'; break;
          case 'supplierIds': val = 'SUP-01'; break;
          case 'resellerId': val = '-'; break;
          case 'attributionId': val = '-'; break;
          case 'affiliateCode': val = o.couponCode || '-'; break;
          case 'net': val = String(o.price * o.quantity); break;
          case 'logistics': val = o.steadfastTrackingCode ? 'Steadfast' : 'Courier'; break;
          case 'logisticsCharge': val = String(o.deliveryCharge); break;
          case 'total': val = String(o.totalPrice); break;
          case 'rEarn': val = '0'; break;
          case 'resell': val = 'No'; break;
          case 'paid': val = isOrderPaid(o) ? String(o.totalPrice || 0) : '0'; break;
          case 'due': val = !isOrderPaid(o) ? String(o.totalPrice || 0) : '0'; break;
          case 'rDue': val = '0'; break;
          case 'profit': val = String(Math.round(o.totalPrice * 0.4)); break;
          case 'created': val = new Date(o.createdAt).toLocaleDateString('en-US'); break;
          case 'logisticsNote': val = o.notes || '-'; break;
          case 'contactName': val = o.customerName; break;
          case 'contactPhone': val = o.phone; break;
          default: val = '';
        }
        return `"${val.replace(/"/g, '""')}"`;
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Orders_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExportColumnsModalOpen(false);
  };

  // Open Print Mode with selected or single order
  const handleOpenPrintView = (
    mode: 'invoice' | 'stickers' | 'mini-stickers' | 'packing-slips' | 'pos-receipt' | 'pick-list' | 'check-list' | 'commercial',
    singleOrder?: BookOrder
  ) => {
    if (singleOrder) {
      setPrintOrdersList([singleOrder]);
    } else if (selectedOrders.length > 0) {
      setPrintOrdersList(selectedOrders);
    } else {
      setPrintOrdersList(filteredOrders.slice(0, 10));
    }
    setActivePrintMode(mode);
    setIsActionsMenuOpen(false);
  };

  // Create Physical Order Submit
  const handleCreatePhysicalOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone) return;

    setIsSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const num = orders.length + 1001;
      const sub = formData.price * formData.quantity;
      const tot = sub + formData.deliveryCharge;

      const newOrder: BookOrder = {
        id: `ORD-${year}-${num}`,
        customerName: formData.customerName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || 'Buy directly from the showroom',
        productTitle: formData.productTitle,
        price: formData.price,
        deliveryCharge: formData.deliveryCharge,
        quantity: formData.quantity,
        totalPrice: tot,
        orderType: formData.orderType,
        status: formData.status,
        createdAt: new Date().toISOString(),
        notes: formData.notes
      };

      await onAddOrder(newOrder);
      setIsAddModalOpen(false);
      setFormData({
        customerName: '',
        phone: '',
        address: '',
        productTitle: '',
        price: 0,
        deliveryCharge: 0,
        quantity: 1,
        orderType: 'physical',
        status: 'Confirmed',
        notes: ''
      });
    } catch (err) {
      console.error('Add order error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import Courier File CSV Parser
  const handleImportCourierCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setImportStatusMessage('No sufficient data found in CSV file.');
        return;
      }

      let updatedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 2) {
          const idOrPhone = parts[0];
          const trackingOrStatus = parts[1];

          const match = orders.find(o => o.id === idOrPhone || o.phone === idOrPhone);
          if (match) {
            await onUpdateOrder({
              ...match,
              steadfastTrackingCode: trackingOrStatus.startsWith('CID') || trackingOrStatus.startsWith('ST') 
                ? trackingOrStatus 
                : match.steadfastTrackingCode,
              status: trackingOrStatus.toLowerCase().includes('deliver') ? 'Delivered' : match.status
            });
            updatedCount++;
          }
        }
      }

      setImportStatusMessage(`${updatedCount} T order successfulway has been updated!`);
    };
    reader.readAsText(file);
  };

  // Send Bulk SMS Handler
  const handleSendBulkSms = () => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one recipient.');
      return;
    }
    setSendingSms(true);
    setTimeout(() => {
      setSendingSms(false);
      setIsBulkSmsModalOpen(false);
      alert(`${selectedOrderIds.length} T of order customerOn your mobile Send SMSIt has been completed!`);
    }, 1200);
  };

  // IF PRINT MODE IS ACTIVE: Render dedicated Printable Pages (Matching Screenshots 1, 2, 3)
  if (activePrintMode) {
    return (
      <div className="bg-slate-100 min-h-screen p-4 sm:p-8 font-sans">
        {/* Print Overlay Controls Bar */}
        <div className="max-w-6xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActivePrintMode(null)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to orders</span>
            </button>
            <div className="text-xs font-bold text-slate-800">
              {activePrintMode === 'invoice' && 'Tax Invoices'}
              {activePrintMode === 'stickers' && 'Order Parcel Stickers'}
              {activePrintMode === 'mini-stickers' && 'Mini Parcel Stickers'}
              {activePrintMode === 'packing-slips' && 'Packing Slips'}
              {activePrintMode === 'pos-receipt' && 'POS Thermal Receipts'}
              {activePrintMode === 'pick-list' && 'Warehouse Pick List'}
              {activePrintMode === 'check-list' && 'Order Verification Check List'}
              {activePrintMode === 'commercial' && 'Commercial / PO Documents'}
              <span className="ml-2 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px]">
                {printOrdersList.length} selected
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
            >
              Clear selection
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print {activePrintMode === 'stickers' ? 'Stickers' : 'Document'}</span>
            </button>
          </div>
        </div>

        {/* --- 1. TAX INVOICE PRINT VIEW (Matching Screenshot 1) --- */}
        {activePrintMode === 'invoice' && (
          <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {printOrdersList.map((ord) => {
              const orderDate = new Date(ord.createdAt);
              const formattedDate = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const isPaid = isOrderPaid(ord);
              
              const price = ord.price || 0;
              const qty = ord.quantity || 1;
              const delivery = ord.deliveryCharge || 0;
              const subtotal = ord.items && (ord.items as any[]).length > 0
                ? (ord.items as any[]).reduce((sum: number, it: any) => sum + ((it.variant?.price || it.product?.price || it.price || 0) * (it.quantity || 1)), 0)
                : (price * qty);
              const grandTotal = ord.totalPrice || ord.totalAmount || (subtotal + delivery);
              const paidAmount = isPaid ? grandTotal : 0;
              const dueAmount = isPaid ? 0 : grandTotal;

              return (
                <div 
                  key={ord.id} 
                  className="invoice-sheet relative bg-white p-8 sm:p-12 rounded-lg border border-slate-200 shadow-xl font-sans text-slate-800 page-break-after print:shadow-none print:border-none print:rounded-none print:p-0"
                  id={`invoice-${ord.id}`}
                >
                  {/* Decorative top border */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-teal-600 rounded-t-lg print:hidden"></div>
                  
                  <div className="invoice-sheet-inner print:px-0 print:py-0">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b-2 border-slate-100 pb-8">
                      {/* Left: Brand / Logo */}
                      <div className="flex items-start gap-4">
                        {invoiceBrand.logo && (
                          <div className="h-20 w-20 rounded-xl bg-white flex items-center justify-center shrink-0">
                            <ResponsiveImage
                              src={invoiceBrand.logo}
                              alt={invoiceBrand.name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                            {invoiceBrand.name}
                          </h2>
                          {invoiceBrand.tagline && <p className="text-sm font-medium text-slate-500 mt-1">{invoiceBrand.tagline}</p>}
                          <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                            {invoiceBrand.website && <p>{invoiceBrand.website}</p>}
                            {invoiceBrand.phone && <p>{invoiceBrand.phone}</p>}
                            {invoiceBrand.email && <p>{invoiceBrand.email}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Invoice Info */}
                      <div className="text-left md:text-right">
                        <h1 className="text-4xl font-light text-slate-300 tracking-widest uppercase mb-4">Invoice</h1>
                        <div className="grid grid-cols-2 md:grid-cols-none gap-x-6 gap-y-1 text-sm md:flex md:flex-col md:items-end">
                          <div className="flex justify-between md:w-48">
                            <span className="font-semibold text-slate-400">Invoice No:</span>
                            <span className="font-bold text-slate-800">{ord.id}</span>
                          </div>
                          <div className="flex justify-between md:w-48">
                            <span className="font-semibold text-slate-400">Date:</span>
                            <span className="font-medium text-slate-800">{formattedDate}</span>
                          </div>
                          <div className="flex justify-between md:w-48">
                            <span className="font-semibold text-slate-400">Payment:</span>
                            <span className="font-medium text-slate-800">{ord.paymentMethod || 'Cash on Delivery'}</span>
                          </div>
                          <div className="flex justify-between md:w-48">
                            <span className="font-semibold text-slate-400">Status:</span>
                            <span className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Billing & Shipping Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b-2 border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-3">Billed To</h3>
                        <p className="text-base font-bold text-slate-900">{ord.customerName}</p>
                        <p className="text-sm text-slate-600 mt-1 font-medium">{ord.address}</p>
                        <p className="text-sm text-slate-600 mt-1">{ord.phone}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-3">Shipping Details</h3>
                        <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2 border border-slate-100">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Method:</span>
                            <span className="font-semibold text-slate-800">Home Delivery</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tracking:</span>
                            <span className="font-mono font-medium text-slate-800">{ord.steadfastTrackingCode || ord.pathaoTrackingCode || 'Pending'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {ord.luckyCouponCode && (
                      <div className="mt-8 mb-4 bg-amber-50/50 border border-amber-200 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Special Offer</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">Yamaha R15 Lucky Draw Coupon: <span className="font-mono text-amber-600 ml-1">{ord.luckyCouponCode}</span></p>
                        </div>
                        <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                          🎟️
                        </div>
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="mt-8">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-y border-slate-200">
                            <th className="py-3 px-4 font-semibold">Description</th>
                            <th className="py-3 px-4 font-semibold text-center w-24">Qty</th>
                            <th className="py-3 px-4 font-semibold text-right w-32">Unit Price</th>
                            <th className="py-3 px-4 font-semibold text-right w-32">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {ord.items && ord.items.length > 0 ? (
                            ord.items.map((it: any, idx: number) => {
                              const itPrice = it.variant?.price || it.product?.price || it.price || 0;
                              const itQty = it.quantity || 1;
                              return (
                                <tr key={idx} className="border-b border-slate-100">
                                  <td className="py-4 px-4">
                                    <p className="font-semibold text-slate-900">{it.product?.title || it.title || it.name || 'Product'}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-1">
                                      {it.variant?.name ? `Variant: ${it.variant.name}` : `SKU: ${it.sku || ord.id.split('-').pop()}`}
                                    </p>
                                  </td>
                                  <td className="py-4 px-4 text-center text-slate-700">{itQty}</td>
                                  <td className="py-4 px-4 text-right text-slate-700">Tk {itPrice.toFixed(2)}</td>
                                  <td className="py-4 px-4 text-right font-semibold text-slate-900">Tk {(itPrice * itQty).toFixed(2)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="border-b border-slate-100">
                              <td className="py-4 px-4">
                                <p className="font-semibold text-slate-900">{ord.productTitle || 'Product'}</p>
                                <p className="text-xs text-slate-500 font-mono mt-1">SKU: {ord.id.split('-').pop()}</p>
                              </td>
                              <td className="py-4 px-4 text-center text-slate-700">{qty}</td>
                              <td className="py-4 px-4 text-right text-slate-700">Tk {price.toFixed(2)}</td>
                              <td className="py-4 px-4 text-right font-semibold text-slate-900">Tk {subtotal.toFixed(2)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Section */}
                    <div className="mt-6 flex flex-col md:flex-row justify-between items-start">
                      <div className="w-full md:w-1/2 mb-6 md:mb-0 pr-0 md:pr-8">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Terms & Notes</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Please keep this invoice for your records. If you have any questions concerning this invoice, contact our support. Thank you for your business!
                        </p>
                      </div>
                      
                      <div className="w-full md:w-[320px] bg-slate-50 p-6 rounded-lg border border-slate-100">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>Tk {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Shipping</span>
                            <span>Tk {delivery.toFixed(2)}</span>
                          </div>
                          <div className="h-px bg-slate-200 my-2"></div>
                          <div className="flex justify-between text-lg font-black text-slate-900">
                            <span>Total</span>
                            <span>Tk {grandTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 pt-2 text-xs">
                            <span>Paid</span>
                            <span>Tk {paidAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-teal-600 text-sm">
                            <span>Balance Due</span>
                            <span>Tk {dueAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Signature */}
                    <div className="mt-16 pt-6 flex justify-between items-end">
                      <div className="text-xs text-slate-400">
                        <p>{invoiceBrand.name} - Generated on {new Date().toLocaleDateString('en-GB')}</p>
                      </div>
                      <div className="text-center w-48 border-t-2 border-slate-200 pt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                          Authorized Sign
                        </span>
                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activePrintMode === 'stickers' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 print:hidden">
              <span>Selected orders: <strong>{printOrdersList.length}</strong></span>
              <button onClick={() => setSelectedOrderIds([])} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 cursor-pointer">
                Clear selection
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {printOrdersList.map((ord) => {
                const orderDate = new Date(ord.createdAt);
                const dateFormatted = orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                  <div key={ord.id} className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4 font-sans text-slate-900 page-break-inside-avoid">
                    {/* Header Sticker Barcode */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">PARCEL STICKER</span>
                        <h3 className="text-lg font-black text-slate-900">#{ord.id}</h3>
                        <span className="text-[10px] text-slate-400 font-semibold">{dateFormatted}</span>
                      </div>
                      <div className="w-36 text-right">
                        <BarcodeSVG value={ord.id} height={36} />
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-1 text-xs border-b border-slate-200 pb-3">
                      <h4 className="text-sm font-black text-slate-900">{ord.customerName}</h4>
                      <p className="font-mono font-bold text-slate-800 text-sm">{ord.phone}</p>
                      <p className="text-slate-600 font-medium leading-tight">{ord.address}</p>
                    </div>

                    {/* Courier & COD Payable */}
                    <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3 text-xs">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">COURIER / TRACKING</span>
                        <span className="font-bold text-slate-900">{ord.steadfastTrackingCode || ord.pathaoTrackingCode || 'Courier'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {isOrderPaid(ord) ? 'PAID' : 'COD PAYABLE'}
                        </span>
                        <span className={`text-base font-black ${isOrderPaid(ord) ? 'text-emerald-600' : 'text-amber-600'}`}>
                          Tk. {(isOrderPaid(ord) ? 0 : (ord.totalPrice || ord.totalAmount || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Seller Footer */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-1">
                      <span>Seller: {invoiceBrand.name}</span>
                      <span>{ord.quantity} item(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 3. OTHER PRINT VIEWS (Mini Stickers, Packing Slips, POS Receipt, Pick List) --- */}
        {(activePrintMode === 'mini-stickers' || activePrintMode === 'packing-slips' || activePrintMode === 'pos-receipt' || activePrintMode === 'pick-list') && (
          <div className="max-w-3xl mx-auto space-y-6">
            {printOrdersList.map(ord => (
              <div key={ord.id} className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm text-xs space-y-3 font-sans">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-extrabold text-sm text-slate-900">{activePrintMode.toUpperCase()} - {ord.id}</span>
                  <span className="font-mono font-bold text-slate-600">{ord.phone}</span>
                </div>
                <div className="space-y-1">
                  <p><strong>Customer:</strong> {ord.customerName}</p>
                  <p><strong>Address:</strong> {ord.address}</p>
                  <p><strong>Product:</strong> {ord.productTitle || (ord.items?.[0]?.product?.title) || 'Product'} × {ord.quantity || 1}</p>
                  <p><strong>Payment Status:</strong> {isOrderPaid(ord) ? 'PAID' : `UNPAID (${ord.paymentMethod || 'COD'})`}</p>
                  <p><strong>Total:</strong> Tk. {ord.totalPrice || ord.totalAmount || 0}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- STANDARD MAIN ORDER MANAGEMENT DASHBOARD VIEW ---
  if (viewingOrder) {
    return (
      <OrderDetailsView 
        order={viewingOrder} 
        onClose={() => setViewingOrder(null)} 
        onUpdateStatus={async (id, newStatus) => {
          await onUpdateOrder({ ...viewingOrder, status: newStatus });
          setViewingOrder({ ...viewingOrder, status: newStatus });
        }}
        onEditOrder={openEditOrder}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-teal-600" />
            <span>Orders</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage orders, courier bookings, and print invoices.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onRefreshOrders && (
            <button 
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshOrders();
                } finally {
                  setTimeout(() => setIsRefreshing(false), 400);
                }
              }}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
              title="নতুন অর্ডার রিফ্রেশ করুন"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 text-slate-500 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
              <span>{isRefreshing ? 'রিফ্রেশ হচ্ছে...' : 'রিফ্রেশ'}</span>
            </button>
          )}

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New order add
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">total order</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalOrders}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Landing page order</span>
          <span className="text-xl sm:text-2xl font-extrabold text-indigo-600">{landingCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">Physical order</span>
          <span className="text-xl sm:text-2xl font-extrabold text-teal-700">{physicalCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Pending</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600">{pendingCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Estimate gross sales</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">Tk. {totalRevenue}</span>
        </div>
      </div>

      {/* Selected Items Floating Action Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3 text-xs font-bold">
            <span className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg">
              {selectedOrderIds.length} selected
            </span>
            <span>Order selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Clear selection
            </button>

            {/* Print Parcel Stickers Quick Button */}
            <button
              onClick={() => handleOpenPrintView('stickers')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Stickers</span>
            </button>

            {/* Print Tax Invoices Quick Button */}
            <button
              onClick={() => handleOpenPrintView('invoice')}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Print Invoices</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Controls with Actions & Export Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Customer Name, Mobile or Order ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold w-full md:w-auto shrink-0">
            <button 
              onClick={() => setTypeFilter('all')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              all Type
            </button>
            <button 
              onClick={() => setTypeFilter('landing')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'landing' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Landing ({landingCount})
            </button>
            <button 
              onClick={() => setTypeFilter('physical')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'physical' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Store ({physicalCount})
            </button>
          </div>

          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">All status</option>
            <option value="Pending">waiting</option>
            <option value="Confirmed">allowed</option>
            <option value="Packaging">Packaging</option>
            <option value="Ready for Shipment">Ready for shipment</option>
            <option value="Shipped">by courier</option>
            <option value="Delivered">delivered</option>
            <option value="Hold">adjourned</option>
            <option value="Under Review">verification</option>
            <option value="Not Responding">no response</option>
            <option value="Return">return</option>
            <option value="Cancelled">canceled</option>
          </select>

          {/* BULK ACTIONS DROPDOWN BUTTON (Matching Screenshots) */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => {
                setIsActionsMenuOpen(!isActionsMenuOpen);
                setIsExportMenuOpen(false);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl flex items-center justify-between gap-2 border border-slate-200 transition-colors cursor-pointer"
            >
              <span>Actions</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Actions Menu Popup List (Exact match for Screenshot options) */}
            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-xs font-semibold text-slate-800 space-y-1 max-h-96 overflow-y-auto animate-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                  Bulk Print & Docs
                </div>

                <button
                  onClick={() => handleOpenPrintView('invoice')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Print invoices</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('packing-slips')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span>Print packing slips</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('pos-receipt')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <DollarSign className="h-4 w-4 text-slate-600" />
                  <span>Print POS Receipts</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('stickers')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Tag className="h-4 w-4 text-slate-600" />
                  <span>Print Parcel Stickers</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('mini-stickers')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Tag className="h-4 w-4 text-slate-600" />
                  <span>Print Mini Stickers</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('pick-list')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4 text-slate-600" />
                  <span>Pick List</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('check-list')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4 text-slate-600" />
                  <span>Check List</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('commercial')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span>Commercial / PO Docs</span>
                </button>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 pt-2 border-t border-slate-100">
                  Courier Integration (send it Steadfast)
                </div>

                <button
                  onClick={() => handleBulkTransferToCourier('pathao')}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-800 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Send className="h-4 w-4 text-red-600" />
                  <span>Send to Pathaosend</span>
                </button>

                <button
                  onClick={() => handleBulkTransferToCourier('steadfast')}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 text-amber-800 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Truck className="h-4 w-4 text-amber-600" />
                  <span>Send to SteadfastSteadfast</span>
                </button>

                <button
                  onClick={handleSyncCourier}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer font-semibold"
                >
                  <RefreshCw className="h-4 w-4 text-teal-600" />
                  <span>Sync courier status</span>
                </button>

                <button
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setIsImportCourierModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-slate-600" />
                  <span>Import courier file</span>
                </button>

                <button
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setIsBulkSmsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 text-slate-600" />
                  <span>Send Bulk SMS</span>
                </button>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 pt-2 border-t border-slate-100">
                  Update Status
                </div>

                <button onClick={() => handleBulkStatusChange('Confirmed')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mark Confirmed</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Packaging')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-indigo-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Package className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Mark Packaging</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Ready for Shipment')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-indigo-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Truck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Mark Ready for Shipment</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Shipped')} className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-purple-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Truck className="h-3.5 w-3.5 text-purple-600" />
                  <span>Mark Shipping</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Delivered')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mark Delivered</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Hold')} className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Mark Hold</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Under Review')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Search className="h-3.5 w-3.5 text-slate-600" />
                  <span>Mark Under Review</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Not Responding')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-800 rounded-lg flex items-center space-x-2 cursor-pointer font-semibold">
                  <Phone className="h-3.5 w-3.5 text-rose-600" />
                  <span>Mark Not Responding</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Return')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-rose-600" />
                  <span>Mark Return</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Cancelled')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-800 rounded-lg flex items-center space-x-2 cursor-pointer font-bold">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Mark Canceled</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Pending')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                  <span>Reset to Placed</span>
                </button>
              </div>
            )}
          </div>

          {/* EXPORT BULK COURIER CSV BUTTON */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => {
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsActionsMenuOpen(false);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-between gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Courier Bulk CSV</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-xs font-semibold text-slate-800 space-y-1 animate-in zoom-in-95 duration-150">
                <button
                  onClick={exportSteadfastCSV}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-900 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Steadfast Bulk Upload CSV</span>
                </button>

                <button
                  onClick={exportPathaoCSV}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 text-teal-900 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Download className="h-4 w-4 text-teal-600" />
                  <span>Pathao Courier Bulk CSV</span>
                </button>

                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    setIsExportColumnsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                  <span>Custom Columns Export (CSV/Excel)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-visible">
        <div className="overflow-visible min-h-[300px] pb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="py-3.5 px-4">ID & Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Customer information</th>
                <th className="py-3.5 px-4">Product and quantity</th>
                <th className="py-3.5 px-4">Total Rs</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    No orders found।
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <tr 
                      key={order.id} 
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, input, select, a, svg')) return;
                        setViewingOrder(order);
                      }}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-teal-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                        />
                      </td>

                      {/* ID & Date */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{order.id}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('bn-BD', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                        {order.luckyCouponCode && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                            🎟️ {order.luckyCouponCode}
                          </span>
                        )}
                      </td>

                      {/* Order Type Badge */}
                      <td className="py-3.5 px-4">
                        {order.orderType === 'landing' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Landing
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            Store
                          </span>
                        )}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4 space-y-1">
                        <span className="font-bold text-slate-900 block">{order.customerName}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-600 flex items-center gap-1 text-xs font-mono">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            {order.phone}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs" title={order.address}>
                          {order.address}
                        </span>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const firstItem = order.items?.[0];
                            const thumbImg = firstItem?.variant?.image || firstItem?.product?.image || firstItem?.image || firstItem?.productImage;
                            return thumbImg ? (
                              <img 
                                src={thumbImg} 
                                alt={order.productTitle || 'watch'} 
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                            );
                          })()}
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block text-xs leading-snug">{order.productTitle}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Quantity: {order.quantity}</span>
                          </div>
                        </div>
                      </td>

                      {/* Total Price & Payment Method */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <span className="font-extrabold text-slate-900 text-sm block">
                          Tk. {order.totalPrice || (order.price * order.quantity + order.deliveryCharge)}
                        </span>
                        {order.paymentMethod === 'bKash' ? (
                          <span className="inline-block text-[10px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded font-bold border border-pink-200">
                            Bikash (bKash)
                          </span>
                        ) : order.paymentMethod === 'Nagad' ? (
                          <span className="inline-block text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                            cash (Nagad)
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                            Cash on delivery
                          </span>
                        )}
                        {order.trxId && (
                          <span className="text-[10px] font-mono font-bold text-slate-600 block">
                            TrxID: {order.trxId}
                            {order.senderPhone && ` (${order.senderPhone})`}
                          </span>
                        )}
                      </td>

                      {/* Status Select Badge & Courier Code */}
                      <td className="py-3.5 px-4 space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          order.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          order.status === 'Confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          order.status === 'Shipped' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {order.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                          {order.status === 'Confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'Packaging' && <Package className="w-3 h-3 mr-1" />}
                          {order.status === 'Ready for Shipment' && <Package className="w-3 h-3 mr-1" />}
                          {order.status === 'Shipped' && <Truck className="w-3 h-3 mr-1" />}
                          {order.status === 'Delivered' && <CheckSquare className="w-3 h-3 mr-1" />}
                          {(order.status === 'Hold' || order.status === 'Cancelled' || order.status === 'Return' || order.status === 'Under Review' || order.status === 'Not Responding') && <AlertCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'Pending'? 'Waiting' :
                           order.status === 'Confirmed'? 'Allowed' :
                           order.status === 'Packaging'? 'Packaging' :
                           order.status === 'Ready for Shipment'? 'Ready for shipment' :
                           order.status === 'Shipped'? 'Courier' :
                           order.status === 'Delivered'? 'Delivered' :
                           order.status === 'Hold'? 'Suspended' :
                           order.status === 'Under Review'? 'Verification' :
                           order.status === 'Not Responding'? 'No answer' :
                           order.status === 'Return'? 'Return' :
                           order.status === 'Cancelled'? 'Canceled' :
                           order.status}
                        </span>

                        {order.pathaoConsignmentId && (
                          <div className="mt-1">
                            <span 
                              className="text-[10px] font-mono font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60 inline-flex items-center gap-1 max-w-full overflow-hidden"
                              title={`Pathao: ${order.pathaoConsignmentId}`}
                            >
                              <Truck className="h-3 w-3 text-red-600 flex-shrink-0" />
                              <span className="truncate">
                                Pathao: #{order.pathaoConsignmentId}
                              </span>
                            </span>
                          </div>
                        )}

                        {order.steadfastTrackingCode && (
                          <div className="mt-1">
                            <span 
                              className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-flex items-center gap-1 max-w-full overflow-hidden"
                              title={order.steadfastTrackingCode}
                            >
                              <Truck className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              <span className="truncate">
                                {order.steadfastTrackingCode.startsWith('SFR') ? 'ID: ' + order.steadfastTrackingCode.slice(-8) : '#' + order.steadfastTrackingCode}
                              </span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="relative flex items-center justify-end" data-order-actions>
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuOrderId(prev => prev === order.id ? null : order.id)}
                            title="Order actions"
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuOrderId === order.id}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          <AnimatePresence>
                            {openActionMenuOrderId === order.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                transition={{ duration: 0.14 }}
                                className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                              >
                                <button
                                  type="button"
                                  onClick={() => handlePathaoDispatch(order)}
                                  disabled={dispatchingId === order.id || Boolean(order.pathaoConsignmentId)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Send className="h-4 w-4 text-red-600" />
                                  <span>{dispatchingId === order.id ? 'Booking...' : 'Send to Pathaosend'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSteadfastDispatch(order)}
                                  disabled={dispatchingId === order.id || Boolean(order.steadfastTrackingCode)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Send className="h-4 w-4 text-amber-600" />
                                  <span>{dispatchingId === order.id ? 'Booking...' : 'Send to Steadfast'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    handleOpenPrintView('invoice', order);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span>Print invoice</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    openEditOrder(order);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrderClick(order)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-2xl">
            <div className="flex justify-between sm:hidden w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">
                  showing <span className="font-bold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> T, total <span className="font-bold text-slate-900">{filteredOrders.length}</span> in order
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="sr-only">Previous</span>
                    &larr;
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-bold focus:z-20 focus:outline-offset-0 cursor-pointer ${
                        currentPage === i + 1 
                        ? 'z-10 bg-teal-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600' 
                        : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="sr-only">Next</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>


      <AnimatePresence>
        {dispatchDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className={`px-5 py-4 flex items-start gap-3 ${dispatchDialog.success ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${dispatchDialog.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {dispatchDialog.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Steadfast</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    {dispatchDialog.success ? 'Parcel entry completed' : 'Parcel entry failed'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {dispatchDialog.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchDialog(null)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
                  aria-label="Close dialog"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 flex justify-end bg-white">
                <button
                  type="button"
                  onClick={() => setDispatchDialog(null)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${dispatchDialog.success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  ok
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmOrder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start gap-3 bg-rose-50">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Delete order</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    This is the orderT want to delete?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-900">{deleteConfirmOrder.customerName}</span>
                    {' '}({deleteConfirmOrder.id}) orderT will be permanently deleted।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOrder(null)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
                  aria-label="Close dialog"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteOrder}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkStatusConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start gap-3 bg-indigo-50">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Update Status</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    Status Update make sure
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Are you sure that is selected <span className="font-semibold text-slate-900">{bulkStatusConfirm.count}</span> Order Status "<span className="font-semibold text-slate-900">{bulkStatusConfirm.newStatus}</span>" want to do?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkStatusConfirm(null)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
                  aria-label="Close dialog"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setBulkStatusConfirm(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBulkStatusChange}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EXPORT COLUMNS MODAL (Exact match for Screenshot 5) --- */}
      {isExportColumnsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Export columns</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the fields included in CSV or Excel downloads.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedExportColumns(DEFAULT_EXPORT_COLUMNS.map(c => c.id))}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExportColumns(['id', 'customerName', 'phone', 'address', 'total', 'status'])}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Compact
                </button>
                <button 
                  onClick={() => setIsExportColumnsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 ml-2"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Grid of Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-800 max-h-72 overflow-y-auto pr-1">
              {DEFAULT_EXPORT_COLUMNS.map((col) => {
                const isChecked = selectedExportColumns.includes(col.id);
                return (
                  <label key={col.id} className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedExportColumns(selectedExportColumns.filter(i => i !== col.id));
                        } else {
                          setSelectedExportColumns([...selectedExportColumns, col.id]);
                        }
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <span>{col.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsExportColumnsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                canceled
              </button>
              <button
                type="button"
                onClick={handleDownloadCustomColumnsCSV}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV / Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IMPORT COURIER FILE MODAL --- */}
      {isImportCourierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Import Courier file</h3>
              <button onClick={() => setIsImportCourierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Providing courier services CSV Upload the file। In the first column in the file Order ID And In the second column Tracking ID will have to stay।
            </p>

            <div className="border-2 border-dashed border-slate-300 p-6 rounded-2xl text-center bg-slate-50 space-y-3">
              <Upload className="h-8 w-8 mx-auto text-slate-400" />
              <div className="text-xs font-bold text-slate-700">
                CSV Select the file
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCourierCsv}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>

            {importStatusMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
                {importStatusMessage}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsImportCourierModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                turn off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SEND BULK SMS MODAL --- */}
      {isBulkSmsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Send Bulk SMS ({selectedOrderIds.length})</h3>
              </div>
              <button onClick={() => setIsBulkSmsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMS message text</label>
              <textarea
                rows={4}
                value={smsTemplate}
                onChange={(e) => setSmsTemplate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsBulkSmsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                canceled
              </button>
              <button
                type="button"
                disabled={sendingSms}
                onClick={handleSendBulkSms}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                <span>{sendingSms? 'Sending...' : 'Send SMS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Physical Order Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-white shrink-0 sticky top-0 z-10">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-teal-600" />
                  <span>Add new physical showroom order</span>
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePhysicalOrder} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input 
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="For example: Md. Rafiqul Islam"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input 
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Eg: 01712345678"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Order type</label>
                    <select 
                      value={formData.orderType}
                      onChange={(e) => setFormData({ ...formData, orderType: e.target.value as 'physical' | 'landing' })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="physical">Physical</option>
                      <option value="landing">Landing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address / Place of Sale</label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Eg: Showroom Cash Sale / Dhaka Delivery"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input 
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">T</label>
                    <input 
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input 
                      type="number"
                      value={formData.deliveryCharge}
                      onChange={(e) => setFormData({ ...formData, deliveryCharge: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end space-x-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    canceled
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    order add
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Order Modal */}


      <AnimatePresence>
        {isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-white shrink-0 sticky top-0 z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Edit3 className="h-5 w-5 text-teal-600" />
                    <span>Edit the order</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Order ID: <span className="font-mono font-bold text-slate-700">{editingOrder.id}</span>
                  </p>
                </div>
                <button onClick={closeEditOrder} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOrderEdit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.customerName}
                      onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name / Title</label>
                  <input
                    type="text"
                    value={editFormData.productTitle}
                    onChange={(e) => setEditFormData({ ...editFormData, productTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min={1}
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({ ...editFormData, quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.deliveryCharge}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveryCharge: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.discountAmount}
                      onChange={(e) => setEditFormData({ ...editFormData, discountAmount: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount code</label>
                    <input
                      type="text"
                      value={editFormData.couponCode}
                      onChange={(e) => setEditFormData({ ...editFormData, couponCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono uppercase"
                      placeholder="e.g. SAVE100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">🎟️ Lucky Draw Coupon</label>
                    <input
                      type="text"
                      value={editFormData.luckyCouponCode}
                      onChange={(e) => setEditFormData({ ...editFormData, luckyCouponCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-xl text-xs font-bold text-amber-900 font-mono uppercase"
                      placeholder="e.g. R15-123456"
                    />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="text-[11px] text-slate-500 font-bold">New Total Rs</div>
                    <div className="text-lg font-black text-teal-700">
                      Tk. {calculateOrderTotal(
                        Number(editFormData.price) || 0,
                        Number(editFormData.quantity) || 1,
                        Number(editFormData.deliveryCharge) || 0,
                        Number(editFormData.discountAmount) || 0
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeEditOrder}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    canceled
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Update the order'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Bulk Courier Transfer Confirm Dialog */}
      <ConfirmDialog
        isOpen={bulkCourierConfirm.isOpen}
        type="info"
        title="Do courier bookings?"
        message={`Are you sure that is selected ${bulkCourierConfirm.count} T order ${bulkCourierConfirm.providerName} by courier Want to make a booking?`}
        confirmText="Yes, make a booking"
        cancelText="canceled"
        onConfirm={handleExecuteBulkTransfer}
        onClose={() => setBulkCourierConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
