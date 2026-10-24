import { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Phone, Clock, Search, Trash2, CheckCircle2, Eye, 
  MessageSquare, User, Calendar, Filter, RefreshCw, X, ChevronLeft, 
  ChevronRight, ArrowUpDown, Sparkles, Inbox, Reply
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { ContactMessage } from '../types';
import { CircularProgress } from './LoadingSkeleton';
import { ConfirmDialog } from './ui/ConfirmDialog';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ContactMessagesManager() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // '0' to '11' or 'all'
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Detail Modal
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyNote, setReplyNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Action feedback
  const [actionSuccess, setActionSuccess] = useState('');

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getContactMessages();
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load contact messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    const handleUpdate = () => {
      loadMessages();
    };

    window.addEventListener('contact-messages-updated', handleUpdate);
    return () => {
      window.removeEventListener('contact-messages-updated', handleUpdate);
    };
  }, []);

  // Compute available years from message history
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    messages.forEach(msg => {
      if (msg.createdAt) {
        const y = new Date(msg.createdAt).getFullYear().toString();
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [messages]);

  // Filter messages based on search, year, month, status
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      const msgYear = msgDate.getFullYear().toString();
      const msgMonth = msgDate.getMonth().toString();

      // Year Filter
      if (selectedYear !== 'all' && msgYear !== selectedYear) {
        return false;
      }

      // Month Filter
      if (selectedMonth !== 'all' && msgMonth !== selectedMonth) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all') {
        const currentStatus = msg.status || 'unread';
        if (currentStatus !== statusFilter) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (msg.name || '').toLowerCase().includes(q);
        const matchesEmail = (msg.email || '').toLowerCase().includes(q);
        const matchesPhone = (msg.phone || '').toLowerCase().includes(q);
        const matchesSubject = (msg.subject || '').toLowerCase().includes(q);
        const matchesMessage = (msg.message || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone || matchesSubject || matchesMessage;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, selectedYear, selectedMonth, statusFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / itemsPerPage));
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMessages.slice(start, start + itemsPerPage);
  }, [filteredMessages, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, statusFilter, searchTerm, itemsPerPage]);

  // Message Actions
  const handleToggleStatus = async (msg: ContactMessage, newStatus: 'unread' | 'read' | 'replied') => {
    try {
      const updated: ContactMessage = { ...msg, status: newStatus };
      await dbService.updateContactMessage(updated);
      setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage(updated);
      }
      setActionSuccess(`Status '${newStatus}' This has been changed`);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const [deleteTargetMsgId, setDeleteTargetMsgId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteTargetMsgId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetMsgId) return;
    try {
      await dbService.deleteContactMessage(deleteTargetMsgId);
      setMessages(prev => prev.filter(m => m.id !== deleteTargetMsgId));
      if (selectedMessage && selectedMessage.id === deleteTargetMsgId) {
        setSelectedMessage(null);
      }
      setActionSuccess('Message deleted successfully');
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setDeleteTargetMsgId(null);
    }
  };

  const handleOpenDetail = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyNote(msg.replyNote || '');
    if ((msg.status || 'unread') === 'unread') {
      handleToggleStatus(msg, 'read');
    }
  };

  const handleSaveReplyNote = async () => {
    if (!selectedMessage) return;
    setIsSavingNote(true);
    try {
      const updated: ContactMessage = { 
        ...selectedMessage, 
        replyNote: replyNote.trim(),
        status: replyNote.trim() ? 'replied' : selectedMessage.status 
      };
      await dbService.updateContactMessage(updated);
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? updated : m));
      setSelectedMessage(updated);
      setActionSuccess('Admin notes saved');
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      console.error('Failed to save reply note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter(m => !m.status || m.status === 'unread').length;
    const replied = messages.filter(m => m.status === 'replied').length;
    const now = new Date();
    const thisMonth = messages.filter(m => {
      const d = new Date(m.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, unread, replied, thisMonth };
  }, [messages]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="h-6 w-6 text-teal-600" />
            <span>Customer Messages</span>
          </h2>
        </div>

        <button
          onClick={loadMessages}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Total message</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <div className="text-rose-600 text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            unread message
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{stats.unread}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-100 bg-teal-50/20 shadow-xs">
          <div className="text-teal-700 text-xs font-semibold">Received this month</div>
          <div className="text-2xl font-extrabold text-teal-800 mt-1">{stats.thisMonth}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 shadow-xs">
          <div className="text-indigo-600 text-xs font-semibold">Answered</div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1">{stats.replied}</div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        
        {/* Search & Month/Year Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone or subject..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-900"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Year Filter */}
          <div className="sm:col-span-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="sm:col-span-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">All Months</option>
              {MONTH_NAMES.map((month, idx) => (
                <option key={idx} value={idx.toString()}>{month}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Status Chips & Pagination Size */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              all ({messages.length})
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                statusFilter === 'unread' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              unread ({stats.unread})
            </button>
            <button
              onClick={() => setStatusFilter('read')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                statusFilter === 'read' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              read
            </button>
            <button
              onClick={() => setStatusFilter('replied')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                statusFilter === 'replied' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              to answer ({stats.replied})
            </button>
          </div>

          {/* Items Per Page */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Per page:</span>
            <select
              value={itemsPerPage}
              onChange={e => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

        </div>

      </div>

      {/* Messages Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <CircularProgress label="Loading message..." size="md" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Inbox className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No message found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Select month, year or search feeNo contact submissions matched with alter।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Date and time</th>
                  <th className="px-4 py-3.5">Sender</th>
                  <th className="px-4 py-3.5">communication</th>
                  <th className="px-4 py-3.5">Subject and message</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMessages.map((msg) => {
                  const isUnread = !msg.status || msg.status === 'unread';
                  const dateObj = new Date(msg.createdAt);
                  const formattedDate = dateObj.toLocaleDateString('bn-BD', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr 
                      key={msg.id}
                      onClick={() => handleOpenDetail(msg)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isUnread ? 'bg-amber-50/25 font-medium text-slate-900' : ''
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pl-5">{formattedTime}</div>
                      </td>

                      {/* Sender Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isUnread ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(msg.name || msg.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {msg.name || 'no name'}
                            </div>
                            {isUnread && (
                              <span className="inline-block px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-bold rounded">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info (Email & Phone) */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 truncate font-mono">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <a 
                              href={`mailto:${msg.email}`} 
                              onClick={e => e.stopPropagation()} 
                              className="hover:text-teal-700 hover:underline"
                            >
                              {msg.email}
                            </a>
                          </div>
                          {msg.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <a 
                                href={`tel:${msg.phone}`} 
                                onClick={e => e.stopPropagation()} 
                                className="hover:text-teal-700 hover:underline"
                              >
                                {msg.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Subject & Message Preview */}
                      <td className="px-4 py-3.5 max-w-xs">
                        {msg.subject && (
                          <div className="font-bold text-slate-800 truncate mb-0.5">
                            {msg.subject}
                          </div>
                        )}
                        <div className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
                          {msg.message}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {msg.status === 'replied' ? (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            to answer
                          </span>
                        ) : msg.status === 'read' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full">
                            read
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-full animate-pulse">
                            unread
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(msg)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="View the message"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a
                            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'ETTADI MART Inquiry')}`}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition"
                            title="Reply to email"
                          >
                            <Reply className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredMessages.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              total <strong className="text-slate-800">{filteredMessages.length}</strong> T in the message 
              <strong className="text-slate-800"> {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMessages.length)}</strong> is displayed
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 py-1 font-semibold text-slate-700">
                page {currentPage} / {totalPages}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Message Detail Popup Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-5 w-5 text-teal-400" />
                <h3 className="font-bold text-sm">Full details of the message</h3>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Sender Information Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sender's Name</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedMessage.name || 'name not specified'}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date and time</span>
                  <div className="text-slate-800 font-semibold mt-0.5">
                    {new Date(selectedMessage.createdAt).toLocaleString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">email</span>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    <a href={`mailto:${selectedMessage.email}`} className="text-teal-700 hover:underline">
                      {selectedMessage.email}
                    </a>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">phone number</span>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {selectedMessage.phone ? (
                      <a href={`tel:${selectedMessage.phone}`} className="text-teal-700 hover:underline">
                        {selectedMessage.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject */}
              {selectedMessage.subject && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Message subject</span>
                  <div className="text-sm font-bold text-slate-900 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedMessage.subject}
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Message details</span>
                <div className="mt-1 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Status Update Options */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="font-bold text-slate-700">Set Status:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(selectedMessage, 'unread')}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                      selectedMessage.status === 'unread' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    unread
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedMessage, 'read')}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                      selectedMessage.status === 'read' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    read
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedMessage, 'replied')}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                      selectedMessage.status === 'replied' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                    }`}
                  >
                    Answered
                  </button>
                </div>
              </div>

              {/* Internal Reply Note */}
              <div className="space-y-1.5 pt-2">
                <label className="font-bold text-slate-700">Internal Note</label>
                <textarea
                  rows={3}
                  value={replyNote}
                  onChange={e => setReplyNote(e.target.value)}
                  placeholder="Keep a note of what was discussed with the customer or how the reply was sent..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none text-xs"
                />
                <button
                  onClick={handleSaveReplyNote}
                  disabled={isSavingNote}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingNote ? 'Saving...' : 'Save notes'}
                </button>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>delete</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedMessage.phone && (
                  <a
                    href={`tel:${selectedMessage.phone}`}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition inline-flex items-center gap-1.5"
                  >
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>call</span>
                  </a>
                )}
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || 'ETTADI MART Inquiry')}`}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-md"
                >
                  <Reply className="h-4 w-4" />
                  <span>Send reply by email</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Confirm Delete Message Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetMsgId}
        type="danger"
        title="Delete the message?"
        message="Are you sure you want to permanently delete this contact message from the database?"
        confirmText="Yes, delete"
        cancelText="canceled"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetMsgId(null)}
      />

    </div>
  );
}
