import React, { useState } from 'react';
import {
  HandHeart, Heart, Bell, Map, BarChart3, FileText, Settings, Users, Shield,
  Plus, Filter, Download, Search, CheckCircle, XCircle, Clock, MapPin,
  AlertTriangle, Package, Home, TrendingUp, Star, User, Lock, Globe,
  Eye, MoreHorizontal, ChevronRight, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Tabs, SearchInput, Modal, Input, Select, Textarea, Alert, Progress, Table, Avatar, StatusBadge, PriorityBadge, EmptyState, Dropdown } from '../components/ui';
import { useAppContext } from '../context';

// ── Volunteer Management ──────────────────────────────────────────────────

const volunteers = [
  { id: 'V-001', name: 'Dinesh Weerasinghe', skills: ['Medical', 'First Aid'], location: 'Kelaniya', availability: 'Available', verified: true, tasks: 3, distance: '2.1 km', match: 95 },
  { id: 'V-002', name: 'Priya Jayasuriya', skills: ['Search & Rescue', 'Driving'], location: 'Ragama', availability: 'Busy', verified: true, tasks: 5, distance: '4.3 km', match: 87 },
  { id: 'V-003', name: 'Saman Kumara', skills: ['Logistics', 'Driving'], location: 'Ja-Ela', availability: 'Available', verified: true, tasks: 1, distance: '6.7 km', match: 78 },
  { id: 'V-004', name: 'Nishantha Perera', skills: ['Medical', 'Counselling'], location: 'Wattala', availability: 'Available', verified: false, tasks: 0, distance: '8.2 km', match: 72 },
  { id: 'V-005', name: 'Kumari Dissanayake', skills: ['Community', 'Food Distribution'], location: 'Gampaha', availability: 'Available', verified: true, tasks: 2, distance: '11.4 km', match: 65 },
];

export function VolunteerManagement() {
  const { addToast } = useAppContext();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedVol, setSelectedVol] = useState<typeof volunteers[0] | null>(null);
  const [matchModal, setMatchModal] = useState(false);

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Volunteer Management"
          subtitle="Coordinate and assign volunteers across operations"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={<Search size={14} />} onClick={() => setMatchModal(true)}>AI Match Volunteer</Button>
              <Button size="sm" icon={<Plus size={14} />}>Add Volunteer</Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Volunteers" value="1,240" icon={<Users size={20} />} color="#1A3A6B" />
          <KpiCard label="Available Now" value="487" icon={<CheckCircle size={20} />} color="#16A34A" />
          <KpiCard label="On Active Tasks" value="312" icon={<Clock size={20} />} color="#EA580C" />
          <KpiCard label="Verified" value="891" icon={<Shield size={20} />} color="#6D28D9" />
        </div>

        <Tabs tabs={[{id:'all',label:'All'},{id:'available',label:'Available'},{id:'busy',label:'On Task'}]} active={activeTab} onChange={setActiveTab} className="mb-4" />

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {volunteers.filter(v => activeTab === 'all' || (activeTab === 'available' ? v.availability === 'Available' : v.availability === 'Busy')).map(v => (
            <Card key={v.id} hover className="cursor-pointer" onClick={() => setSelectedVol(v)} padding="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={v.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[#0D1B2E]">{v.name}</p>
                    {v.verified && <Shield size={12} className="text-[#16A34A]" />}
                  </div>
                  <p className="text-xs text-[#5A7290] flex items-center gap-1"><MapPin size={10} />{v.location} · {v.distance}</p>
                </div>
                <Badge variant={v.availability === 'Available' ? 'success' : 'warning'}>{v.availability}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {v.skills.map(s => <Badge key={s} variant="primary" className="text-xs">{s}</Badge>)}
              </div>
              <div className="flex items-center justify-between text-xs text-[#5A7290]">
                <span>Active tasks: <strong>{v.tasks}</strong></span>
                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); addToast({ type: 'success', title: 'Task assigned', message: `${v.name} has been assigned a task.` }); }}>
                  Assign Task
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Match Modal */}
      <Modal
        open={matchModal}
        onClose={() => setMatchModal(false)}
        title="AI Volunteer Matching"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setMatchModal(false)}>Cancel</Button>
            <Button onClick={() => { setMatchModal(false); addToast({ type: 'success', title: 'Volunteer assigned', message: 'Dinesh Weerasinghe has been assigned.' }); }}>
              Assign Recommended
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-sm text-[#1D4ED8]">
            Task: Medical assistance needed at Kelaniya Community Center
          </div>
          <div className="space-y-3">
            {volunteers.slice(0, 3).map((v, i) => (
              <div key={v.id} className={`p-4 rounded-xl border ${i === 0 ? 'border-[#1A3A6B] bg-[#EFF6FF]' : 'border-[#CBD8E6]'}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={v.name} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{v.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      {v.skills.map(s => <span key={s} className="text-xs text-[#5A7290]">{s}</span>)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: v.match >= 90 ? '#16A34A' : v.match >= 75 ? '#CA8A04' : '#EA580C' }}>{v.match}% match</p>
                    <p className="text-xs text-[#5A7290]">{v.distance}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

// ── Donor Management ──────────────────────────────────────────────────────

const donations = [
  { id: 'DON-0201', donor: 'Lanka Foundation', type: 'Monetary', amount: 'LKR 500,000', campaign: 'Flood Relief 2024', status: 'allocated', date: '15 Jun 2024' },
  { id: 'DON-0200', donor: 'Chamara Perera', type: 'Food', amount: '200 kg rice', campaign: 'Community Drive', status: 'received', date: '14 Jun 2024' },
  { id: 'DON-0199', donor: 'ABC Pharmaceuticals', type: 'Medicine', amount: 'Insulin ×100', campaign: 'Medical Supplies', status: 'dispatched', date: '13 Jun 2024' },
  { id: 'DON-0198', donor: 'Anonymous', type: 'Monetary', amount: 'LKR 50,000', campaign: 'General Fund', status: 'allocated', date: '13 Jun 2024' },
];

const campaignProgress = [
  { name: 'Flood Relief 2024', raised: 2400000, target: 5000000 },
  { name: 'Medical Supplies', raised: 850000, target: 1000000 },
  { name: 'Shelter & Housing', raised: 340000, target: 2000000 },
];

export function DonorManagement() {
  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Donor & Donation Management"
          subtitle="Track donations, campaigns, and fund allocation"
          actions={<Button size="sm" icon={<Plus size={14} />}>Create Campaign</Button>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Donations (LKR)" value="3.6M" icon={<Heart size={20} />} color="#DC2626" />
          <KpiCard label="Active Campaigns" value="8" icon={<TrendingUp size={20} />} color="#1A3A6B" />
          <KpiCard label="Donors (This Month)" value="234" icon={<Users size={20} />} color="#16A34A" />
          <KpiCard label="Utilization Rate" value="89%" icon={<BarChart3 size={20} />} color="#EA580C" />
        </div>

        {/* Campaign progress */}
        <Card className="mb-6" padding="p-5">
          <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Active Campaigns</h3>
          <div className="space-y-4">
            {campaignProgress.map(c => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-[#0D1B2E]">{c.name}</span>
                  <span className="text-[#5A7290]">LKR {(c.raised / 1000).toFixed(0)}K / {(c.target / 1000).toFixed(0)}K</span>
                </div>
                <Progress value={c.raised} max={c.target} label="" />
              </div>
            ))}
          </div>
        </Card>

        {/* Donations table */}
        <Card padding="p-0">
          <div className="p-4 border-b border-[#CBD8E6]">
            <h3 className="font-semibold text-[#0D1B2E] font-[Outfit]">Recent Donations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#CBD8E6]">
                  {['ID', 'Donor', 'Type', 'Amount/Value', 'Campaign', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC] cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-[#1A3A6B]">{d.id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{d.donor}</td>
                    <td className="px-4 py-3"><Badge variant="primary">{d.type}</Badge></td>
                    <td className="px-4 py-3 text-sm">{d.amount}</td>
                    <td className="px-4 py-3 text-sm text-[#5A7290]">{d.campaign}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-xs text-[#5A7290]">{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────

const notifications = [
  { id: 1, type: 'emergency', title: 'Flood Alert — Kelani River Zone 3', message: 'Water level has reached 8.2m. Zone 3A evacuation order issued.', time: '5 min ago', read: false, priority: 'critical' },
  { id: 2, type: 'request', title: 'New Critical Request — REQ-2841', message: 'Kasun Jayawardena submitted an urgent food request in Kelaniya.', time: '14 min ago', read: false, priority: 'critical' },
  { id: 3, type: 'ai', title: 'AI Recommendation Pending Review', message: '3 new AI recommendations are awaiting human review.', time: '22 min ago', read: false, priority: 'high' },
  { id: 4, type: 'shelter', title: 'Shelter B3 — 90% Capacity', message: 'Army Camp Shelter Panagoda has reached 90% occupancy.', time: '35 min ago', read: true, priority: 'medium' },
  { id: 5, type: 'resource', title: 'Medicine Shortage Alert', message: 'Insulin stock at MOH Cold Chain is critically low (45 vials remaining).', time: '1h ago', read: true, priority: 'high' },
  { id: 6, type: 'volunteer', title: 'Volunteer Task Completed', message: 'Dinesh Weerasinghe completed medical assistance task at Kelaniya.', time: '2h ago', read: true, priority: 'low' },
];

export function NotificationCenter() {
  const [activeTab, setActiveTab] = useState('all');
  const unread = notifications.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="p-6 max-w-3xl">
        <PageHeader
          title="Notification Center"
          subtitle={`${unread} unread notifications`}
          actions={<Button variant="outline" size="sm">Mark all read</Button>}
        />

        <Tabs
          tabs={[{id:'all',label:'All'},{id:'unread',label:`Unread (${unread})`},{id:'emergency',label:'Emergency'}]}
          active={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />

        <div className="space-y-2">
          {notifications
            .filter(n => activeTab === 'all' ? true : activeTab === 'unread' ? !n.read : n.type === 'emergency')
            .map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors hover:shadow-sm ${!n.read ? 'bg-white border-[#CBD8E6]' : 'bg-[#F8FAFC] border-[#E8EDF3]'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.priority === 'critical' ? 'bg-[#FFF1F2] text-[#DC2626]' : n.priority === 'high' ? 'bg-[#FFF7ED] text-[#EA580C]' : 'bg-[#EFF6FF] text-[#1A3A6B]'}`}>
                  {n.type === 'emergency' ? <AlertTriangle size={18} /> : n.type === 'ai' ? <Star size={18} /> : n.type === 'request' ? <Package size={18} /> : n.type === 'shelter' ? <Home size={18} /> : n.type === 'resource' ? <Package size={18} /> : <Users size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.read ? 'text-[#0D1B2E]' : 'text-[#5A7290]'}`}>{n.title}</p>
                    <span className="text-xs text-[#5A7290] shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-[#5A7290] mt-0.5">{n.message}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-[#EA580C] rounded-full shrink-0 mt-1" />}
              </div>
            ))}
        </div>
      </div>
    </Layout>
  );
}

// ── Map View ──────────────────────────────────────────────────────────────

export function MapView() {
  const [filter, setFilter] = useState('all');
  const markers = [
    { type: 'crisis', label: 'Flood Zone — Kelani Basin', lat: 7.004, lng: 79.994, severity: 'critical' },
    { type: 'shelter', label: 'Kelaniya Community Center', lat: 7.006, lng: 79.920, spaces: 47 },
    { type: 'shelter', label: 'Welisara School', lat: 7.024, lng: 79.898, spaces: 12 },
    { type: 'resource', label: 'Colombo Warehouse', lat: 6.927, lng: 79.861 },
    { type: 'request', label: '23 pending requests', lat: 7.014, lng: 79.940, priority: 'high' },
  ];

  const filterTypes = [
    { id: 'all', label: 'All' },
    { id: 'crisis', label: '🔴 Crises' },
    { id: 'shelter', label: '🏠 Shelters' },
    { id: 'resource', label: '📦 Resources' },
    { id: 'request', label: '🆘 Requests' },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Controls bar */}
        <div className="flex items-center gap-3 p-4 bg-white border-b border-[#CBD8E6] shrink-0">
          <SearchInput placeholder="Search location..." className="w-64" />
          <div className="flex gap-2">
            {filterTypes.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${filter === f.id ? 'bg-[#1A3A6B] text-white' : 'bg-[#F0F4F8] text-[#5A7290] hover:bg-[#E8EDF3]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" icon={<MapPin size={14} />}>My Location</Button>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="flex-1 relative overflow-hidden bg-[#1A3A6B]">
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, #0D1B2E 0%, #1A3A6B 35%, #1D4ED8 65%, #166534 100%)',
          }}>
            {/* Grid overlay to simulate map tiles */}
            <svg width="100%" height="100%" className="opacity-10">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Simulated map markers */}
            {markers.map((m, i) => (
              <div
                key={i}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 20}%` }}
              >
                <div className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-white text-lg shadow-lg transition-transform group-hover:scale-110 ${
                  m.type === 'crisis' ? 'bg-[#DC2626]' :
                  m.type === 'shelter' ? 'bg-[#16A34A]' :
                  m.type === 'resource' ? 'bg-[#EA580C]' : 'bg-[#6D28D9]'
                }`}>
                  {m.type === 'crisis' ? '⚠' : m.type === 'shelter' ? '🏠' : m.type === 'resource' ? '📦' : '🆘'}
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-[#0D1B2E] text-xs px-2 py-1 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {m.label}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 text-sm shadow-lg">
              <p className="font-semibold text-[#0D1B2E] mb-2 font-[Outfit]">Map Legend</p>
              {[
                { color: '#DC2626', label: 'Active Crisis' },
                { color: '#16A34A', label: 'Shelter' },
                { color: '#EA580C', label: 'Resource Depot' },
                { color: '#6D28D9', label: 'Assistance Request' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-[#5A7290]">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Stats overlay */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 text-sm shadow-lg">
              <p className="font-semibold text-[#0D1B2E] mb-2 font-[Outfit]">Visible Area</p>
              <div className="space-y-1">
                <p className="text-xs text-[#5A7290]">🔴 2 crisis zones</p>
                <p className="text-xs text-[#5A7290]">🏠 5 shelters</p>
                <p className="text-xs text-[#5A7290]">📦 3 resource depots</p>
                <p className="text-xs text-[#5A7290]">🆘 47 active requests</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Reports & Analytics ───────────────────────────────────────────────────

const analyticsData = [
  { date: 'Jun 10', requests: 45, resolved: 40, avgTime: 28 },
  { date: 'Jun 11', requests: 67, resolved: 58, avgTime: 32 },
  { date: 'Jun 12', requests: 89, resolved: 71, avgTime: 29 },
  { date: 'Jun 13', requests: 124, resolved: 98, avgTime: 24 },
  { date: 'Jun 14', requests: 198, resolved: 145, avgTime: 22 },
  { date: 'Jun 15', requests: 284, resolved: 201, avgTime: 19 },
];

export function Reports() {
  const [dateFilter, setDateFilter] = useState('7d');

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Operational insights and performance metrics"
          actions={
            <div className="flex gap-2">
              <div className="flex bg-[#F0F4F8] rounded-xl p-1 gap-1">
                {['24h', '7d', '30d', '90d'].map(d => (
                  <button key={d} onClick={() => setDateFilter(d)} className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${dateFilter === d ? 'bg-white text-[#0D1B2E] shadow-sm' : 'text-[#5A7290]'}`}>{d}</button>
                ))}
              </div>
              <Button variant="outline" size="sm" icon={<Download size={14} />}>Export</Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Requests" value="807" icon={<Package size={20} />} color="#1A3A6B" change="47%" changePositive={false} />
          <KpiCard label="Resolved" value="613" icon={<CheckCircle size={20} />} color="#16A34A" change="76%" changePositive={true} />
          <KpiCard label="Avg Response Time" value="24 min" icon={<Clock size={20} />} color="#EA580C" change="18%" changePositive={true} />
          <KpiCard label="AI Override Rate" value="14%" icon={<Star size={20} />} color="#6D28D9" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <Card padding="p-5">
            <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Request Volume & Resolution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="req" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A3A6B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1A3A6B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="res" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5A7290' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5A7290' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #CBD8E6', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="requests" stroke="#1A3A6B" fill="url(#req)" strokeWidth={2} name="Requests" />
                <Area type="monotone" dataKey="resolved" stroke="#16A34A" fill="url(#res)" strokeWidth={2} name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card padding="p-5">
            <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Average Response Time (min)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5A7290' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#5A7290' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #CBD8E6', fontSize: 12 }} />
                <Line type="monotone" dataKey="avgTime" stroke="#EA580C" strokeWidth={2.5} dot={{ fill: '#EA580C', r: 4 }} name="Avg Time (min)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// ── Audit Logs ────────────────────────────────────────────────────────────

const auditLogs = [
  { id: 'EVT-8821', user: 'Amara Perera', role: 'Coordinator', action: 'AI Approved', entity: 'REQ-2840', time: '11:23:14', ip: '10.0.1.45', prev: 'Pending AI review', next: 'Approved — Matched to Red Cross' },
  { id: 'EVT-8820', user: 'Chaminda Rathnayake', role: 'Case Manager', action: 'Shelter Allocated', entity: 'SH-003/REQ-2838', time: '10:58:32', ip: '10.0.1.62', prev: 'Unallocated', next: 'Army Camp Shelter — Room 4B' },
  { id: 'EVT-8819', user: 'Amara Perera', role: 'Coordinator', action: 'AI Rejected', entity: 'AI-0338', time: '10:47:19', ip: '10.0.1.45', prev: 'Merge REQ-2836 into REQ-2831', next: 'Rejected — Different households' },
  { id: 'EVT-8818', user: 'System', role: 'System', action: 'Alert Issued', entity: 'FLOOD-002', time: '10:30:00', ip: 'system', prev: 'Warning level', next: 'Critical alert issued' },
  { id: 'EVT-8817', user: 'Dilshan Fernando', role: 'Resource Manager', action: 'Resource Dispatched', entity: 'R-004/REQ-2841', time: '10:15:44', ip: '10.0.1.78', prev: 'Allocated', next: '4 buses dispatched' },
];

export function AuditLogs() {
  const [selectedLog, setSelectedLog] = useState<typeof auditLogs[0] | null>(null);

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Audit Logs"
          subtitle="Complete audit trail of all system actions"
          actions={
            <div className="flex gap-2">
              <SearchInput placeholder="Search logs..." className="w-56" />
              <Button variant="outline" size="sm" icon={<Download size={14} />}>Export</Button>
            </div>
          }
        />

        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#CBD8E6]">
                  {['Event ID', 'User', 'Role', 'Action', 'Entity', 'Timestamp', 'IP Address'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC] cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-4 py-3 font-mono text-xs text-[#1A3A6B]">{log.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={log.user} size="sm" />
                        <span className="text-sm font-medium">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A7290]">{log.role}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.action.includes('Approved') ? 'success' : log.action.includes('Rejected') ? 'danger' : log.action.includes('Alert') ? 'warning' : 'primary'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5A7290]">{log.entity}</td>
                    <td className="px-4 py-3 text-xs text-[#5A7290]">{log.time}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5A7290]">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title={`Audit Event ${selectedLog?.id}`} size="md">
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'User', value: selectedLog.user },
                { label: 'Role', value: selectedLog.role },
                { label: 'Action', value: selectedLog.action },
                { label: 'Entity', value: selectedLog.entity },
                { label: 'Timestamp', value: `15 Jun 2024, ${selectedLog.time}` },
                { label: 'IP Address', value: selectedLog.ip },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-[#5A7290]">{f.label}</p>
                  <p className="text-sm font-medium text-[#0D1B2E] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#FFF1F2] rounded-xl">
                <p className="text-xs text-[#DC2626] font-semibold mb-1">Before</p>
                <p className="text-xs text-[#0D1B2E]">{selectedLog.prev}</p>
              </div>
              <div className="p-3 bg-[#F0FDF4] rounded-xl">
                <p className="text-xs text-[#16A34A] font-semibold mb-1">After</p>
                <p className="text-xs text-[#0D1B2E]">{selectedLog.next}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}

// ── Administration ────────────────────────────────────────────────────────

const roles = [
  { name: 'System Administrator', users: 2, permissions: 'Full access' },
  { name: 'Emergency Coordinator', users: 8, permissions: 'Dashboard, Crisis, AI, Resources, Shelters' },
  { name: 'Case Manager', users: 15, permissions: 'Cases, Requests, Shelters' },
  { name: 'Resource Manager', users: 6, permissions: 'Resources, Logistics' },
  { name: 'Shelter Administrator', users: 12, permissions: 'Shelters, Occupancy' },
  { name: 'Volunteer Coordinator', users: 4, permissions: 'Volunteers, Tasks' },
  { name: 'Donor Officer', users: 3, permissions: 'Donors, Campaigns' },
  { name: 'Citizen', users: 4821, permissions: 'Portal, Requests' },
];

const ROLES_LIST = [
  { id: '1', name: 'System Administrator' },
  { id: '2', name: 'Emergency Coordinator' },
  { id: '3', name: 'Citizen' },
  { id: '4', name: 'Volunteer' },
  { id: '5', name: 'Shelter Administrator' },
  { id: '6', name: 'Resource Manager' },
];

const getRoleName = (roleId: string | number) => {
  const role = ROLES_LIST.find(r => r.id === String(roleId));
  return role ? role.name : 'Unknown Role';
};

export function Administration() {
  const [activeTab, setActiveTab] = useState('users');
  const [addUserModal, setAddUserModal] = useState(false);
  const { addToast } = useAppContext();
  
  // Real DB State
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [newRole, setNewRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

 // Fetch users from DB
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const { apiClient } = await import('../api'); 
        const response = await apiClient('/api/v1/users', { method: 'GET' });
        const usersArray = Array.isArray(response) ? response : (response.data || response.items || []);
        
        // Normalize C# PascalCase to React camelCase
        const normalizedUsers = usersArray.map((u: any) => ({
          ...u,
          id: u.id || u.Id,
          fullName: u.fullName || u.FullName || u.name,
          email: u.email || u.Email,
          role: u.role || u.Role,
          status: u.status !== undefined ? u.status : u.Status
        }));

        setUsers(normalizedUsers);
      } catch (error: any) {
        addToast({ type: 'error', message: error.message || 'Failed to fetch users from DB.' });
      } finally {
        setIsLoadingUsers(false);
      }
    };
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, addToast]);

  const handleRoleUpdate = async () => {
    if (!editUserModal || !newRole) return;
    setIsUpdating(true);
    try {
      const { apiClient } = await import('../api');
      await apiClient(`/api/v1/users/${editUserModal.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: parseInt(newRole) })
      });
      setUsers(prev => prev.map(u => u.id === editUserModal.id ? { ...u, role: newRole } : u));
      addToast({ type: 'success', title: 'Role Updated', message: `User role successfully updated.` });
      setEditUserModal(null);
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to update user role.' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="System Administration"
          subtitle="Manage users, roles, permissions, and system settings"
        />

        <Tabs
          tabs={[
            { id: 'users', label: 'Users' },
            { id: 'roles', label: 'Roles & Permissions' },
            { id: 'settings', label: 'System Settings' },
            { id: 'ai', label: 'AI Settings' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <SearchInput placeholder="Search users..." className="w-64" />
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddUserModal(true)}>Add User</Button>
            </div>
            <Card padding="p-0">
              {isLoadingUsers ? (
                <div className="p-12 text-center text-[#5A7290]">Loading real users from database...</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#CBD8E6]">
                      {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const displayName = u.fullName || u.name || 'Unknown User';
                      return (
                        <tr key={u.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={displayName} size="sm" />
                              <span className="font-medium text-sm">{displayName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#5A7290]">{u.email}</td>
                          <td className="px-4 py-3"><Badge variant={String(u.role) === '3' ? 'neutral' : 'primary'}>{getRoleName(u.role)}</Badge></td>
                          <td className="px-4 py-3">
                            <Badge variant={u.status === 1 || u.status === 'active' ? 'success' : 'neutral'} dot>
                              {u.status === 1 || u.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="ghost" onClick={() => {
                                setEditUserModal(u);
                                setNewRole(String(u.role));
                            }}>Edit Role</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* ... (Roles, Settings, AI tabs remain the same) ... */}
      </div>

      <Modal open={!!editUserModal} onClose={() => setEditUserModal(null)} title="Manage User Access" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setEditUserModal(null)} disabled={isUpdating}>Cancel</Button>
          <Button onClick={handleRoleUpdate} disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save Changes'}</Button>
        </>}
      >
        {editUserModal && (
          <div className="space-y-4">
             <div className="p-3 bg-[#F8FAFC] rounded-xl mb-2 border border-[#E8EDF3]">
              <p className="font-semibold text-[#0D1B2E]">{editUserModal.fullName || editUserModal.name}</p>
              <p className="text-xs text-[#5A7290]">{editUserModal.email}</p>
            </div>
            <Select 
              label="Assign Role" 
              value={newRole}
              onChange={(e: any) => setNewRole(e.target.value)}
              options={[{ value: '', label: 'Select role...' }, ...ROLES_LIST.map(r => ({ value: r.id, label: r.name }))]} 
              required 
            />
          </div>
        )}
      </Modal>

      <Modal open={addUserModal} onClose={() => setAddUserModal(false)} title="Add New User" size="md"
        footer={<><Button variant="outline" onClick={() => setAddUserModal(false)}>Close</Button></>}
      >
        <div className="space-y-4">
           <Alert type="info" message="For security reasons, new users must register through the public portal." />
        </div>
      </Modal>
    </Layout>
  );
}
// ── Profile & Settings ────────────────────────────────────────────────────

export function Profile() {
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [lang, setLang] = useState('en');
  const { addToast } = useAppContext();

  // Add this safety check to satisfy TypeScript:
  if (!user) return null;

  return (
    <Layout>
// ... rest of the component stays exactly the same
      <div className="p-6 max-w-3xl">
        <PageHeader title="Profile & Settings" subtitle="Manage your account and preferences" />

        <Tabs
          tabs={[
            { id: 'profile', label: 'Profile' },
            { id: 'security', label: 'Security' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'language', label: 'Language & Accessibility' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />

        {activeTab === 'profile' && (
          <div className="space-y-5">
            <Card padding="p-6">
              <div className="flex items-center gap-5 mb-6">
                <div className="relative">
                  <Avatar name={user.name} size="lg" />
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1A3A6B] rounded-full flex items-center justify-center cursor-pointer">
                    <Plus size={12} className="text-white" />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0D1B2E] font-[Outfit]">{user.name}</h2>
                  <p className="text-sm text-[#5A7290]">{user.role}</p>
                  <Badge variant="success" dot className="mt-1">Active</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full name" defaultValue={user.name} />
                <Input label="Email" type="email" defaultValue={user.email} />
                <Input label="Phone" type="tel" defaultValue="+94 77 123 4567" />
                <Input label="Organisation" defaultValue="National Disaster Relief Center" />
                <div className="col-span-2">
                  <Textarea label="Bio" defaultValue="Emergency coordinator with 8 years of experience in humanitarian operations." rows={3} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => addToast({ type: 'success', title: 'Profile updated', message: 'Your profile has been saved.' })}>Save Changes</Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card padding="p-5">
              <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Change Password</h3>
              <div className="space-y-3 max-w-md">
                <Input label="Current password" type="password" placeholder="••••••••" />
                <Input label="New password" type="password" placeholder="Min. 8 characters" />
                <Input label="Confirm new password" type="password" placeholder="Confirm new password" />
                <Button>Update Password</Button>
              </div>
            </Card>
            <Card padding="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#0D1B2E] font-[Outfit]">Two-Factor Authentication</h3>
                  <p className="text-sm text-[#5A7290] mt-0.5">Add extra security with 2FA</p>
                </div>
                <Button variant="outline" size="sm">Enable 2FA</Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <Card padding="p-5">
            <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Notification Preferences</h3>
            <div className="space-y-3">
              {[
                { label: 'Emergency Alerts', desc: 'Critical crisis and flood alerts', enabled: true },
                { label: 'Request Updates', desc: 'Updates on your assigned requests', enabled: true },
                { label: 'AI Recommendations', desc: 'When AI recommendations await review', enabled: true },
                { label: 'System Alerts', desc: 'Resource shortages and shelter capacity', enabled: false },
                { label: 'Volunteer Activity', desc: 'Volunteer task completions', enabled: false },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between py-3 border-b border-[#E8EDF3] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#0D1B2E]">{n.label}</p>
                    <p className="text-xs text-[#5A7290]">{n.desc}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${n.enabled ? 'bg-[#16A34A]' : 'bg-[#CBD8E6]'} relative shrink-0`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${n.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'language' && (
          <div className="space-y-4">
            <Card padding="p-5">
              <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Language / භාෂාව / மொழி</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: 'en', label: 'English', native: 'English' },
                  { code: 'si', label: 'Sinhala', native: 'සිංහල' },
                  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${lang === l.code ? 'border-[#1A3A6B] bg-[#EFF6FF]' : 'border-[#CBD8E6] hover:border-[#1A3A6B]/40'}`}
                  >
                    <p className="text-lg font-bold font-sinhala">{l.native}</p>
                    <p className="text-xs text-[#5A7290]">{l.label}</p>
                  </button>
                ))}
              </div>
            </Card>
            <Card padding="p-5">
              <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Accessibility</h3>
              <div className="space-y-3">
                {[
                  { label: 'High contrast mode', enabled: false },
                  { label: 'Larger text size', enabled: false },
                  { label: 'Reduce animations', enabled: false },
                ].map(a => (
                  <div key={a.label} className="flex items-center justify-between">
                    <span className="text-sm text-[#0D1B2E]">{a.label}</span>
                    <div className={`w-11 h-6 rounded-full cursor-pointer ${a.enabled ? 'bg-[#16A34A]' : 'bg-[#CBD8E6]'} relative`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${a.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── Crisis Management ─────────────────────────────────────────────────────

const crises = [
  { id: 'CRS-001', name: 'Kelani Basin Flood 2024', type: 'Flood', location: 'Gampaha District', started: 'Jun 12, 2024', severity: 'critical', affected: 15000, requests: 284, status: 'active' },
  { id: 'CRS-002', name: 'Ratnapura Landslide', type: 'Landslide', location: 'Sabaragamuwa Province', started: 'Jun 10, 2024', severity: 'high', affected: 3200, requests: 127, status: 'active' },
  { id: 'CRS-003', name: 'Batticaloa Storm Surge', type: 'Storm', location: 'Eastern Province', started: 'Jun 08, 2024', severity: 'medium', affected: 800, requests: 89, status: 'monitoring' },
];

export function CrisisManagement() {
  const [selected, setSelected] = useState<typeof crises[0] | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const { addToast } = useAppContext();

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Crisis Management"
          subtitle="Monitor and coordinate active crisis events"
          actions={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateModal(true)}>New Crisis Event</Button>}
        />

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {crises.map(c => (
            <Card key={c.id} hover className="cursor-pointer" onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between mb-3">
                <Badge variant={c.severity === 'critical' ? 'danger' : c.severity === 'high' ? 'warning' : 'info'}>{c.type}</Badge>
                <StatusBadge status={c.status} />
              </div>
              <h3 className="font-semibold text-[#0D1B2E] font-[Outfit] mb-1">{c.name}</h3>
              <p className="text-xs text-[#5A7290] flex items-center gap-1 mb-3"><MapPin size={11} />{c.location}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#F0F4F8] rounded-lg p-2">
                  <p className="text-[#5A7290]">Affected</p>
                  <p className="font-bold text-[#0D1B2E]">{c.affected.toLocaleString()}</p>
                </div>
                <div className="bg-[#F0F4F8] rounded-lg p-2">
                  <p className="text-[#5A7290]">Requests</p>
                  <p className="font-bold text-[#0D1B2E]">{c.requests}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Crisis detail */}
        {selected && (
          <Card padding="p-6" className="animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#0D1B2E] font-[Outfit]">{selected.name}</h2>
                <p className="text-sm text-[#5A7290]">Started: {selected.started}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>

            {/* Timeline */}
            <h3 className="font-semibold text-[#0D1B2E] mb-4 font-[Outfit]">Case Timeline</h3>
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#CBD8E6]" />
              {[
                { time: 'Jun 12, 06:14', event: 'Crisis event created', user: 'System (Auto-detected)', type: 'system' },
                { time: 'Jun 12, 06:45', event: 'Emergency Coordinator assigned: Amara Perera', user: 'Admin', type: 'assign' },
                { time: 'Jun 12, 08:30', event: 'First assistance request received (REQ-2700)', user: 'System', type: 'request' },
                { time: 'Jun 12, 09:15', event: 'Red Cross deployed to Kelaniya sector', user: 'Amara Perera', type: 'action' },
                { time: 'Jun 13, 14:00', event: 'Shelter capacity upgraded — Army Camp Panagoda', user: 'Chaminda Rathnayake', type: 'shelter' },
                { time: 'Jun 15, 11:00', event: '284 requests processed, 201 resolved', user: 'System', type: 'stats' },
              ].map((event, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <div className="absolute -left-4 w-4 h-4 rounded-full bg-white border-2 border-[#CBD8E6] mt-0.5" />
                  <p className="text-xs text-[#5A7290]">{event.time}</p>
                  <p className="text-sm text-[#0D1B2E]">{event.event}</p>
                  <p className="text-xs text-[#5A7290] italic">— {event.user}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Crisis Event" size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={() => { setCreateModal(false); addToast({ type: 'success', title: 'Crisis created', message: 'New crisis event has been created and coordinators notified.' }); }}>
              Create Crisis
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Crisis name" placeholder="Descriptive event name" />
          <Select label="Crisis type" options={[
            { value: '', label: 'Select type...' },
            { value: 'flood', label: 'Flood' },
            { value: 'landslide', label: 'Landslide' },
            { value: 'earthquake', label: 'Earthquake' },
            { value: 'storm', label: 'Severe Storm' },
            { value: 'disease', label: 'Disease Outbreak' },
            { value: 'displacement', label: 'Mass Displacement' },
            { value: 'other', label: 'Other' },
          ]} />
          <Input label="Affected area / location" placeholder="District, province, area..." />
          <Select label="Severity" options={[
            { value: '', label: 'Select severity...' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]} />
          <Input label="Estimated affected population" type="number" />
          <Textarea label="Description" rows={3} />
        </div>
      </Modal>
    </Layout>
  );
}
