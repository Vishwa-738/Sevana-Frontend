import { useState } from 'react';
import { BarChart2, Download, Calendar, Filter, TrendingUp, Clock, CheckCircle, Brain } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button, Card, KpiCard, Select, Tabs, useToast, ToastContainer } from '../components/ui';
import { lineChartData, categoryData, resourceUtilData } from '../data/mockData';
import Layout from '../components/Layout';

const PIE_COLORS = ['#1B3A6B', '#16A34A', '#F97316', '#0EA5E9', '#7C3AED', '#64748B'];

const responseTimeData = [
  { date: 'Jan 9', time: 4.2 }, { date: 'Jan 10', time: 3.8 }, { date: 'Jan 11', time: 3.1 },
  { date: 'Jan 12', time: 2.8 }, { date: 'Jan 13', time: 2.4 }, { date: 'Jan 14', time: 2.1 }, { date: 'Jan 15', time: 1.9 },
];

const aiData = [
  { name: 'Approved', value: 68 }, { name: 'Modified', value: 18 }, { name: 'Rejected', value: 14 },
];
const AI_COLORS = ['#16A34A', '#F97316', '#DC2626'];

export default function Reports() {
  const { toasts, show, remove } = useToast();
  const [tab, setTab] = useState('overview');
  const [crisis, setCrisis] = useState('');
  const [dateRange, setDateRange] = useState('');

  return (
    <Layout>
      <ToastContainer toasts={toasts} remove={remove} />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">Operational performance and humanitarian metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => show('success', 'Report exported as PDF.')}>Export Report</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select
            value={crisis}
            onChange={setCrisis}
            options={[
              { value: 'crs1', label: 'Southern Flood Emergency' },
              { value: 'crs2', label: 'Ratnapura Landslide' },
              { value: 'crs3', label: 'Colombo Urban Flooding' },
            ]}
            placeholder="All Crises"
            className="w-52"
          />
          <Select
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: 'custom', label: 'Custom range' },
            ]}
            placeholder="Date Range"
            className="w-44"
          />
          <Button variant="outline" size="sm" icon={<Filter size={14} />}>More Filters</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Requests" value="2,847" delta="+312 today" deltaUp={false} icon={<BarChart2 size={20} className="text-blue-600" />} iconBg="bg-blue-100" />
          <KpiCard label="Resolved" value="1,831" delta="+18%" deltaUp icon={<CheckCircle size={20} className="text-green-600" />} iconBg="bg-green-100" />
          <KpiCard label="Avg Response Time" value="1h 54m" delta="-23min" deltaUp icon={<Clock size={20} className="text-orange-600" />} iconBg="bg-orange-100" />
          <KpiCard label="AI Override Rate" value="14%" icon={<Brain size={20} className="text-purple-600" />} iconBg="bg-purple-100" />
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'requests', label: 'Requests' },
            { id: 'resources', label: 'Resources' },
            { id: 'ai', label: 'AI Performance' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Requests & Resolutions Trend</h2>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="requests" stroke="#1B3A6B" strokeWidth={2.5} dot={false} name="Total Requests" />
                      <Line type="monotone" dataKey="resolved" stroke="#16A34A" strokeWidth={2.5} dot={false} name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Average Response Time (hours)</h2>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={responseTimeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                      <Line type="monotone" dataKey="time" stroke="#F97316" strokeWidth={2.5} dot={false} name="Avg Response Time (hr)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Request Categories</h2></div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                        {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={v => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {categoryData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />{d.name}</div>
                        <span className="font-semibold">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-slate-100"><h2 className="font-semibold text-slate-900">AI Decision Outcomes</h2></div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={aiData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                        {aiData.map((_, i) => <Cell key={i} fill={AI_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={v => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {aiData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: AI_COLORS[i] }} />{d.name}</div>
                        <span className="font-semibold">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-900 mb-4">Key Metrics</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Resolution Rate', value: '64.3%', trend: '↑ +8.2%', good: true },
                    { label: 'Shelter Utilisation', value: '76%', trend: '↑ +12%', good: false },
                    { label: 'Volunteer Utilisation', value: '61%', trend: '↑ +15%', good: true },
                    { label: 'AI Accuracy', value: '87%', trend: '↑ +3%', good: true },
                    { label: 'Overdue Cases', value: '23', trend: '↓ -5', good: true },
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{m.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900">{m.value}</span>
                        <span className={`text-xs ml-2 ${m.good ? 'text-green-600' : 'text-amber-600'}`}>{m.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'resources' && (
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Resource Utilisation by Category</h2></div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resourceUtilData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="available" fill="#1B3A6B" name="Available" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="allocated" fill="#F97316" name="Allocated" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dispatched" fill="#16A34A" name="Dispatched" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {(tab === 'requests' || tab === 'ai') && (
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{tab === 'requests' ? 'Request Volume by Day' : 'AI Recommendation Analysis'}</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="requests" fill="#1B3A6B" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" fill="#16A34A" name="Resolved" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
