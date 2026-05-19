import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Plus, Search, Calendar, MapPin, Activity, CheckCircle2, AlertCircle, Clock, 
  Trash2, Filter, X, BarChart3, Users, DollarSign, UserRound, Globe, Edit3,
  ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';
import { 
  format, differenceInDays, parseISO, isWithinInterval, startOfDay, endOfDay, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachDayOfInterval,
  isSameDay
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Call {
  id: number;
  date: string;
  time: string;
  phone: string;
  customer_name: string;
  region: string;
  receiver: string;
  source: string;
  test_type: string;
  exchange_content: string;
  processing_status: string;
  result: string;
  list_price: number;
  extra_fee_discount: number;
  final_revenue: number;
  notes: string;
  status_updated_at?: string;
  created_at?: string;
}

const TEST_TYPES = ['ADN', 'NIPT', 'HPV', 'GTT', 'HLA', 'GA', 'HBV', 'HÓA SINH', 'THROM'];
const STATUS_OPTIONS = ['Đang tư vấn', 'Tư vấn lại', 'Thành công', 'Thất bại'];
const REGIONS = ['Hà Nội', 'TP. HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Khác'];
const SOURCES = ['Facebook', 'Google Ads', 'Zalo', 'Website', 'Người quen', 'Khác'];

interface CallFormData {
  date: string;
  time: string;
  phone: string;
  customer_name: string;
  region: string;
  receiver: string;
  source: string;
  test_type: string;
  exchange_content: string;
  processing_status: string;
  result: string;
  list_price: number;
  extra_fee_discount: number;
  notes: string;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

export default function App() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('Tất cả');
  const [filterTest, setFilterTest] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsTimeRange, setStatsTimeRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [newCall, setNewCall] = useState<CallFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    phone: '',
    customer_name: '',
    region: 'Hà Nội',
    receiver: '',
    source: 'Facebook',
    test_type: 'ADN',
    exchange_content: '',
    processing_status: 'Đang tư vấn',
    result: '',
    list_price: 0,
    extra_fee_discount: 0,
    notes: ''
  });

  const fetchCalls = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/calls');
      const result = await response.json();
      
      if (result.data) {
        setCalls(result.data);
      }
      
      if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to fetch calls:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  // Sync Logic for Status
  useEffect(() => {
    const today = new Date();
    const dateStr = format(today, 'yyyy-MM-dd');
    if (newCall.date === dateStr && newCall.processing_status === 'Đang tư vấn') {
      // Logic from previous turn: 3 days, 4-5 days, 6+ days
      // This will be used as a draft status in the form
    }
  }, [newCall.date]);

  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCall)
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setNewCall({
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          phone: '',
          customer_name: '',
          region: 'Hà Nội',
          receiver: '',
          source: 'Facebook',
          test_type: 'ADN',
          exchange_content: '',
          processing_status: 'Đang tư vấn',
          result: '',
          list_price: 0,
          extra_fee_discount: 0,
          notes: ''
        });
        fetchCalls();
      }
    } catch (error) {
      console.error('Failed to add call:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/calls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processing_status: status })
      });
      fetchCalls();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const openEditModal = (call: Call) => {
    let normalizedDate = call.date || '';
    if (normalizedDate.includes('/')) {
      const parts = normalizedDate.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        normalizedDate = `${y}-${(m || '').padStart(2, '0')}-${(d || '').padStart(2, '0')}`;
      }
    }
    setEditingCall({ ...call, date: normalizedDate });
  };

  const handleUpdateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCall || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/calls/${editingCall.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCall)
      });
      if (response.ok) {
        setEditingCall(null);
        fetchCalls();
      }
    } catch (error) {
      console.error('Failed to update call:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCall = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      await fetch(`/api/calls/${id}`, { method: 'DELETE' });
      fetchCalls();
    } catch (error) {
      console.error('Failed to delete call:', error);
    }
  };

  const processedCalls = useMemo(() => {
    const today = new Date();
    return calls.map(call => {
      if (call.processing_status === 'Thành công') return call;
      
      // Handle multiple date formats: DD/MM/YYYY or ISO YYYY-MM-DD
      // Calculate diff for aging based on last status update or creation
      const referenceTimestamp = call.status_updated_at || call.created_at;
      let referenceDate: Date;
      
      if (referenceTimestamp) {
        referenceDate = parseISO(referenceTimestamp);
      } else {
        // Fallback to call.date if no timestamp available
        if (call.date.includes('/')) {
          const [d, m, y] = call.date.split('/').map(Number);
          referenceDate = new Date(y, m - 1, d);
        } else {
          referenceDate = parseISO(call.date);
        }
      }

      // If date is invalid, don't fail, just return the call as is
      if (isNaN(referenceDate.getTime())) {
        return call;
      }

      const todayStart = startOfDay(new Date());
      const referenceDateStart = startOfDay(referenceDate);
      const diff = differenceInDays(todayStart, referenceDateStart);

      let calculatedStatus = call.processing_status;
      
      // Auto-aging logic:
      if (call.processing_status === 'Đang tư vấn') {
        // After 3 days (Day 4) move to 'Tư vấn lại'
        // After 5 days (Day 6: 3 days consulting + 2 days re-consulting) move to 'Thất bại'
        if (diff >= 6) {
          calculatedStatus = 'Thất bại';
        } else if (diff >= 4) {
          calculatedStatus = 'Tư vấn lại';
        }
      } else if (call.processing_status === 'Tư vấn lại') {
        // If manually set to 'Tư vấn lại', move to 'Thất bại' after 2 days
        if (diff >= 2) {
          calculatedStatus = 'Thất bại';
        }
      }
      
      return { ...call, processing_status: calculatedStatus };
    });
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const filtered = processedCalls.filter(call => {
      const matchesSearch = call.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           call.phone.includes(searchTerm);
      const matchesRegion = filterRegion === 'Tất cả' || call.region === filterRegion;
      const matchesTest = filterTest === 'Tất cả' || call.test_type === filterTest;
      return matchesSearch && matchesRegion && matchesTest;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date;
      const dateB = b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date;
      
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [processedCalls, searchTerm, filterRegion, filterTest]);

  const stats = useMemo(() => {
    const today = new Date();
    
    // Filter calls based on time range
    const filteredByTime = processedCalls.filter(call => {
      if (statsTimeRange === 'all') return true;

      let callDate: Date;
      if (call.date.includes('/')) {
        const [d, m, y] = call.date.split('/').map(Number);
        callDate = new Date(y, m - 1, d);
      } else {
        callDate = parseISO(call.date);
      }
      
      if (isNaN(callDate.getTime())) return false;

      switch (statsTimeRange) {
        case 'today':
          return isSameDay(callDate, today);
        case 'week':
          return isWithinInterval(callDate, { 
            start: startOfWeek(today, { weekStartsOn: 1 }), 
            end: endOfWeek(today, { weekStartsOn: 1 }) 
          });
        case 'month':
          return isWithinInterval(callDate, { 
            start: startOfMonth(today), 
            end: endOfMonth(today) 
          });
        case 'custom':
          return isWithinInterval(callDate, {
            start: startOfDay(parseISO(customStartDate)),
            end: endOfDay(parseISO(customEndDate))
          });
        default:
          return true;
      }
    });

    const total = filteredByTime.length;
    const success = filteredByTime.filter(c => c.processing_status === 'Thành công').length;
    const failed = filteredByTime.filter(c => c.processing_status === 'Thất bại').length;
    const consulting = filteredByTime.filter(c => c.processing_status === 'Đang tư vấn').length;
    const reConsult = filteredByTime.filter(c => c.processing_status === 'Tư vấn lại').length;

    const regionData = REGIONS.map(region => ({
      name: region,
      count: filteredByTime.filter(c => c.region === region).length
    })).filter(d => d.count > 0);

    const testTypeData = TEST_TYPES.map(type => ({
      name: type,
      count: filteredByTime.filter(c => c.test_type === type).length
    })).filter(d => d.count > 0);

    const statusData = [
      { name: 'Thành công', value: success },
      { name: 'Đang tư vấn', value: consulting },
      { name: 'Tư vấn lại', value: reConsult },
      { name: 'Thất bại', value: failed },
    ].filter(d => d.value > 0);

    // Trend data
    let trendData: any[] = [];
    if (statsTimeRange === 'week' || statsTimeRange === 'today' || statsTimeRange === 'all' || statsTimeRange === 'custom') {
      // For 'all' or 'today' or 'custom', we show a relevant range
      let start: Date;
      let end: Date = today;

      if (statsTimeRange === 'custom') {
        start = parseISO(customStartDate);
        end = parseISO(customEndDate);
      } else {
        start = subDays(today, statsTimeRange === 'all' ? 13 : 6);
      }

      const days = eachDayOfInterval({ start, end });
      // Limit to 31 days to keep chart readable
      const displayDays = days.length > 31 ? days.slice(days.length - 31) : days;

      trendData = displayDays.map(day => {
        const count = processedCalls.filter(c => {
          let cDate;
          if (c.date.includes('/')) {
            const [d, m, y] = c.date.split('/').map(Number);
            cDate = new Date(y, m - 1, d);
          } else {
            cDate = parseISO(c.date);
          }
          return !isNaN(cDate.getTime()) && isSameDay(cDate, day);
        }).length;
        return { name: format(day, 'dd/MM'), count };
      });
    } else if (statsTimeRange === 'month') {
      // Group by weeks of month or just days? let's do days for month
      const days = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
      trendData = days.map(day => {
        const count = processedCalls.filter(c => {
          let cDate;
          if (c.date.includes('/')) {
            const [d, m, y] = c.date.split('/').map(Number);
            cDate = new Date(y, m - 1, d);
          } else {
            cDate = parseISO(c.date);
          }
          return !isNaN(cDate.getTime()) && isSameDay(cDate, day);
        }).length;
        return { name: format(day, 'dd'), count };
      });
    }

    return { total, success, failed, consulting, reConsult, regionData, testTypeData, statusData, trendData };
  }, [processedCalls, statsTimeRange, customStartDate, customEndDate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Thành công': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Tư vấn lại': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Thất bại': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Thành công': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Tư vấn lại': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Thất bại': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getSafeDateDisplay = (dateStr: string) => {
    try {
      if (!dateStr) return '---';
      if (dateStr.includes('/')) return dateStr; // Already in DD/MM/YYYY
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col z-10 transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="min-w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tight text-indigo-950 truncate">HotlineSync</span>
        </div>

        <div className="flex-1 px-4 py-8 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition", activeTab === 'dashboard' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}>
            <BarChart3 className="w-5 h-5" /><span className="hidden md:block font-medium">Thống kê</span>
          </button>
          <button onClick={() => setActiveTab('list')} className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition", activeTab === 'list' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}>
            <Users className="w-5 h-5" /><span className="hidden md:block font-medium">Khách hàng</span>
          </button>
        </div>

        <div className="p-4 mt-auto space-y-3">
          <button 
            onClick={fetchCalls} 
            disabled={isRefreshing}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 transition bg-white text-slate-600 hover:bg-slate-50",
              isRefreshing && "opacity-50"
            )}
          >
            <Clock className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            <span className="hidden md:block font-medium">
              {isRefreshing ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}
            </span>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="w-full bg-indigo-600 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
            <Plus className="w-5 h-5" /><span className="hidden md:block font-semibold">Tạo mới</span>
          </button>
        </div>
      </nav>

      <main className="pl-20 md:pl-64 p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{activeTab === 'dashboard' ? 'Hiệu quả tư vấn' : 'Dữ liệu chăm sóc'}</h1>
            <p className="text-slate-500">Cơ sở dữ liệu: Hệ thống (Local SQLite)</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm tên, SĐT..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                {[
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'week', label: 'Tuần này' },
                  { id: 'month', label: 'Tháng này' },
                  { id: 'all', label: 'Tất cả' },
                  { id: 'custom', label: 'Tùy chọn' },
                ].map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setStatsTimeRange(range.id as any)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
                      statsTimeRange === range.id 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {statsTimeRange === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Từ</span>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-slate-50 border-none outline-none rounded-lg px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-4 h-px bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Đến</span>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-slate-50 border-none outline-none rounded-lg px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Tổng cộng" value={stats.total} subtitle="Khách hàng hotline" color="blue" />
              <StatCard title="Thành công" value={stats.success} subtitle="Chốt dịch vụ" color="emerald" />
              <StatCard title="Đang tư vấn" value={stats.consulting + stats.reConsult} subtitle="Chờ xử lý" color="amber" />
              <StatCard title="Thất bại" value={stats.failed} subtitle="Ngừng chăm sóc" color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <ChartContainer title="Biểu đồ trạng thái" hasData={stats.statusData.length > 0}><PieChart><Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ChartContainer>
              <ChartContainer title="Theo loại xét nghiệm" hasData={stats.testTypeData.length > 0}><BarChart data={stats.testTypeData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontSize: 10}} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer>
              <ChartContainer title="Xu hướng cuộc gọi" hasData={stats.trendData.some(d => d.count > 0)}>
                <BarChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50/50 flex gap-4 overflow-x-auto">
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="bg-white border rounded-lg px-3 py-1.5 text-sm outline-none"><option value="Tất cả">Tất cả khu vực</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
              <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} className="bg-white border rounded-lg px-3 py-1.5 text-sm outline-none"><option value="Tất cả">Tất cả xét nghiệm</option>{TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">NGÀY</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">GIỜ</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">ĐT KHÁCH HÀNG</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">TÊN KHÁCH HÀNG</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">KHU VỰC</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">NGƯỜI TIẾP NHẬN</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">NGUỒN</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">LOẠI XÉT NGHIỆM</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50 min-w-[250px]">NỘI DUNG CUỘC GỌI</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">TRẠNG THÁI XỬ LÝ</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50">KẾT QUẢ</th>
                    <th className="px-3 py-4 border-r border-b border-slate-200 text-right bg-slate-100/50">GIÁ NIÊM YẾT</th>
                    <th className="px-3 py-4 border-r border-b border-slate-200 text-right bg-slate-100/50">PHÍ PHÁT SINH/ƯU ĐÃI</th>
                    <th className="px-3 py-4 border-r border-b border-slate-200 text-right bg-indigo-50 font-black text-indigo-900 shadow-[inset_0_-2px_0_rgba(79,70,229,0.2)]">DOANH THU CUỐI</th>
                    <th className="px-3 py-3 border-r border-b border-slate-200 text-center bg-slate-100/50 min-w-[180px]">GHI CHÚ</th>
                    <th className="px-3 py-3 border-b border-slate-200 sticky right-0 bg-slate-100 shadow-[-4px_0_10px_rgba(0,0,0,0.1)] z-10 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {filteredCalls.map(call => (
                    <tr key={call.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-3 py-3 border-r border-slate-100 text-center whitespace-nowrap font-medium text-slate-600">{getSafeDateDisplay(call.date)}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center whitespace-nowrap text-slate-400 font-mono text-[11px]">{call.time}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center whitespace-nowrap font-bold text-indigo-600 font-mono tracking-tighter">{call.phone}</td>
                      <td className="px-3 py-3 border-r border-slate-100 whitespace-nowrap font-semibold text-slate-800">{call.customer_name}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center">{call.region}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-slate-600">{call.receiver || '---'}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold border border-slate-100">{call.source}</span>
                      </td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center font-bold text-indigo-500">{call.test_type}</td>
                      <td className="px-3 py-3 border-r border-slate-100 min-w-[250px]">
                        <div className="text-slate-600 leading-snug text-xs line-clamp-2" title={call.exchange_content}>
                          {call.exchange_content || '---'}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-r border-slate-100 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit", getStatusBadgeClass(call.processing_status))}>
                            {getStatusIcon(call.processing_status)}{call.processing_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-r border-slate-100 text-slate-500 italic text-center text-xs">{call.result || '---'}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-right font-medium text-slate-400 font-mono">{(call.list_price || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-right font-medium text-slate-400 font-mono">{(call.extra_fee_discount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-right font-bold text-indigo-700 bg-indigo-50/20 font-mono">
                        {((call.list_price || 0) + (call.extra_fee_discount || 0)).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 border-r border-slate-100 min-w-[180px]">
                        <div className="line-clamp-1 text-[11px] text-slate-400 italic" title={call.notes}>{call.notes || '---'}</div>
                      </td>
                      <td className="px-3 py-3 sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.1)] z-10 group-hover:bg-indigo-50/30 transition-colors">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEditModal(call)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-indigo-100 shadow-sm transition-all text-center"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCall(call.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-rose-100 shadow-sm transition-all text-center"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Thêm thông tin chăm sóc hotline</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              <form onSubmit={handleAddCall} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-600"><Calendar className="w-4 h-4" /> THỜI GIAN</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NGÀY</label><input required type="date" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.date} onChange={e => setNewCall({...newCall, date: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">GIỜ</label><input required type="time" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.time} onChange={e => setNewCall({...newCall, time: e.target.value})} /></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">ĐT KHÁCH HÀNG</label><input required type="tel" placeholder="090..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.phone} onChange={e => setNewCall({...newCall, phone: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">TÊN KHÁCH HÀNG</label><input type="text" placeholder="Nguyễn Văn A (Không bắt buộc)" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.customer_name} onChange={e => setNewCall({...newCall, customer_name: e.target.value})} /></div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-600"><MapPin className="w-4 h-4" /> PHÂN LOẠI</h4>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">KHU VỰC</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.region} onChange={e => setNewCall({...newCall, region: e.target.value})}>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NGƯỜI TIẾP NHẬN</label><input type="text" placeholder="Tên nhân viên..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.receiver} onChange={e => setNewCall({...newCall, receiver: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NGUỒN</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.source} onChange={e => setNewCall({...newCall, source: e.target.value})}>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">LOẠI XÉT NGHIỆM</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.test_type} onChange={e => setNewCall({...newCall, test_type: e.target.value})}>{TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-600"><DollarSign className="w-4 h-4" /> CHI TIẾT XỬ LÝ</h4>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">TRẠNG THÁI XỬ LÝ</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.processing_status} onChange={e => setNewCall({...newCall, processing_status: e.target.value})}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">KẾT QUẢ</label><input type="text" placeholder="Ghi nhận kết quả..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.result} onChange={e => setNewCall({...newCall, result: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">GIÁ NIÊM YẾT (VNĐ)</label><input type="number" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.list_price} onChange={e => {
                      const rawVal = e.target.value;
                      const val = Number(rawVal);
                      setNewCall({...newCall, list_price: rawVal as any, final_revenue: (Number(rawVal) || 0) + (Number(newCall.extra_fee_discount) || 0)});
                    }} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">PHÍ PHÁT SINH/ƯU ĐÃI</label><input type="number" placeholder="Nhập trừ (-) để giảm giá..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={newCall.extra_fee_discount} onChange={e => {
                      const rawVal = e.target.value;
                      setNewCall({...newCall, extra_fee_discount: rawVal as any, final_revenue: (Number(newCall.list_price) || 0) + (Number(rawVal) || 0)});
                    }} /></div>
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">DOANH THU CUỐI</div>
                      <div className="text-lg font-bold text-indigo-600">{((Number(newCall.list_price) || 0) + (Number(newCall.extra_fee_discount) || 0)).toLocaleString()} đ</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NỘI DUNG CUỘC GỌI</label><textarea rows={3} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm resize-none" value={newCall.exchange_content} onChange={e => setNewCall({...newCall, exchange_content: e.target.value})} placeholder="Tóm tắt yêu cầu của khách..." /></div>
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">GHI CHÚ</label><textarea rows={3} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm resize-none" value={newCall.notes} onChange={e => setNewCall({...newCall, notes: e.target.value})} placeholder="Thông tin lưu ý thêm..." /></div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">Hủy bỏ</button>
                  <button type="submit" disabled={isSaving} className={`flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isSaving ? 'Đang lưu...' : <><CheckCircle2 className="w-4 h-4" /> Lưu thông tin</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCall(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Cập nhật thông tin khách hàng</h3>
                <button onClick={() => setEditingCall(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              <form onSubmit={handleUpdateCall} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-600"><Calendar className="w-4 h-4" /> THỜI GIAN</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NGÀY</label><input required type="date" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.date} onChange={e => setEditingCall({...editingCall, date: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">GIỜ</label><input required type="time" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.time} onChange={e => setEditingCall({...editingCall, time: e.target.value})} /></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">ĐT KHÁCH HÀNG</label><input required type="tel" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.phone} onChange={e => setEditingCall({...editingCall, phone: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">TÊN KHÁCH HÀNG</label><input type="text" placeholder="Không bắt buộc" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.customer_name} onChange={e => setEditingCall({...editingCall, customer_name: e.target.value})} /></div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-600"><MapPin className="w-4 h-4" /> PHÂN LOẠI</h4>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">KHU VỰC</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.region} onChange={e => setEditingCall({...editingCall, region: e.target.value})}>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NGƯỜI TIẾP NHẬN</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.receiver} onChange={e => setEditingCall({...editingCall, receiver: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NGUỒN</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.source} onChange={e => setEditingCall({...editingCall, source: e.target.value})}>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">LOẠI XÉT NGHIỆM</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.test_type} onChange={e => setEditingCall({...editingCall, test_type: e.target.value})}>{TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-600"><DollarSign className="w-4 h-4" /> CHI TIẾT XỬ LÝ</h4>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">TRẠNG THÁI XỬ LÝ</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.processing_status} onChange={e => setEditingCall({...editingCall, processing_status: e.target.value})}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">KẾT QUẢ</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.result} onChange={e => setEditingCall({...editingCall, result: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">GIÁ NIÊM YẾT (VNĐ)</label><input type="number" className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.list_price} onChange={e => {
                      const rawVal = e.target.value;
                      setEditingCall({...editingCall, list_price: rawVal as any, final_revenue: (Number(rawVal) || 0) + (Number(editingCall.extra_fee_discount) || 0)});
                    }} /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">PHÍ PHÁT SINH/ƯU ĐÃI</label><input type="number" placeholder="Nhập trừ (-) để giảm giá..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm" value={editingCall.extra_fee_discount} onChange={e => {
                      const rawVal = e.target.value;
                      setEditingCall({...editingCall, extra_fee_discount: rawVal as any, final_revenue: (Number(editingCall.list_price) || 0) + (Number(rawVal) || 0)});
                    }} /></div>
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">DOANH THU CUỐI</div>
                      <div className="text-lg font-bold text-indigo-600">{((Number(editingCall.list_price) || 0) + (Number(editingCall.extra_fee_discount) || 0)).toLocaleString()} đ</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">NỘI DUNG CUỘC GỌI</label><textarea rows={3} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm resize-none" value={editingCall.exchange_content} onChange={e => setEditingCall({...editingCall, exchange_content: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">GHI CHÚ</label><textarea rows={3} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-sm resize-none" value={editingCall.notes} onChange={e => setEditingCall({...editingCall, notes: e.target.value})} /></div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditingCall(null)} className="flex-1 py-3 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">Hủy bỏ</button>
                  <button type="submit" disabled={isSaving} className={`flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isSaving ? 'Đang cập nhật...' : 'Cập nhật thay đổi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: any) {
  const styles: any = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', 
    amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600'
  };
  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 font-bold", styles[color])}>{title[0]}</div>
      <h3 className="text-2xl font-bold">{value}</h3>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function ChartContainer({ title, children, hasData = true }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h3 className="font-bold mb-6">{title}</h3>
      <div className="h-[300px] w-full flex items-center justify-center">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <BarChart3 className="w-8 h-8 opacity-20" />
            <p className="text-sm font-medium">Không có dữ liệu trong khoảng thời gian này</p>
          </div>
        )}
      </div>
    </div>
  );
}
