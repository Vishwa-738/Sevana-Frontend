import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Brain, CheckCircle, Download, Package, RefreshCw, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Layout, PageHeader } from '../components/Layout';
import { Badge, Button, Card, KpiCard } from '../components/ui';
import { apiClient } from '../api';

type DataRecord = Record<string, unknown>;
type Timeframe = '24h' | '7d' | '30d' | '90d' | 'all';
type TrendPoint = { date: string; requests: number; resolved: number };
type AreaMetric = { name: string; people: number; reports: number };
type CategoryMetric = { name: string; requests: number; resolved: number; resolutionRate: number };

const TIMEFRAMES: Array<{ value: Timeframe; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' }
];

function isRecord(value: unknown): value is DataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecords(value: unknown): DataRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  const rows = value.data ?? value.items ?? value.results;
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

function getString(record: DataRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getNumber(record: DataRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === '') continue;
    if (typeof value !== 'number' && typeof value !== 'string') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getCreatedAtMs(request: DataRecord): number | null {
  const value = getString(request, 'createdAtUtc', 'CreatedAtUtc');
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getRequestStatus(request: DataRecord): string {
  return getString(request, 'status', 'Status').toLowerCase().replace(/[\s_-]+/g, '');
}

function isResolved(request: DataRecord): boolean {
  return ['delivered', 'completed', 'closed'].includes(getRequestStatus(request));
}

function getRequestCategory(request: DataRecord): string {
  return getString(request, 'category', 'Category') || 'Unspecified';
}

function getRequestArea(request: DataRecord): string {
  return getString(request, 'district', 'District', 'area', 'Area', 'location', 'Location') || 'Area not recorded';
}

function getAffectedCount(request: DataRecord): number {
  const people = getNumber(
    request,
    'affectedPeopleCount',
    'AffectedPeopleCount',
    'affectedCount',
    'affected',
    'peopleCount',
    'PeopleCount'
  );
  return people !== null && people > 0 ? people : 1;
}

function hasValidAiAnalysis(request: DataRecord): boolean {
  const analysis = `${getString(request, 'aiSummary', 'AiSummary')} ${getString(request, 'aiRecommendation', 'AiRecommendation')}`
    .trim()
    .toLowerCase();
  return analysis.length > 0 &&
    !/ai analysis(?: is)?(?: currently| temporarily)? unavailable|analysis temporarily unavailable|^unavailable$|^n\/?a$/.test(analysis);
}

function getUrgencies(request: DataRecord): string[] {
  return [
    getString(request, 'urgency', 'Urgency'),
    getString(request, 'priority', 'Priority'),
    getString(request, 'calculatedUrgency', 'CalculatedUrgency')
  ].filter(Boolean).map(value => value.toLowerCase());
}

function getUrgency(request: DataRecord): string {
  return getUrgencies(request)[0] || '';
}

function isHighUrgency(request: DataRecord): boolean {
  return getUrgencies(request).some(urgency => urgency.includes('critical') || urgency.includes('high'));
}

function getCutoff(timeframe: Timeframe, now: number): number | null {
  const durations: Partial<Record<Timeframe, number>> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  const duration = durations[timeframe];
  return duration === undefined ? null : now - duration;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTrendBucket(timestamp: number, timeframe: Timeframe): { key: string; label: string } {
  const date = new Date(timestamp);
  if (timeframe === '24h') {
    date.setMinutes(0, 0, 0);
    return {
      key: `${getDateKey(date)}-${date.getHours()}`,
      label: date.toLocaleTimeString([], { hour: 'numeric' })
    };
  }
  if (timeframe === '90d') {
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return { key: getDateKey(date), label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }) };
  }
  if (timeframe === 'all') {
    date.setDate(1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString([], { month: 'short', year: '2-digit' })
    };
  }
  return { key: getDateKey(date), label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }) };
}

function buildTrend(requests: DataRecord[], timeframe: Timeframe): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  const order = new Map<string, number>();
  for (const request of requests) {
    const createdAt = getCreatedAtMs(request);
    if (createdAt === null) continue;
    const bucket = getTrendBucket(createdAt, timeframe);
    const point = points.get(bucket.key) || { date: bucket.label, requests: 0, resolved: 0 };
    point.requests += 1;
    if (isResolved(request)) point.resolved += 1;
    points.set(bucket.key, point);
    order.set(bucket.key, new Date(createdAt).getTime());
  }
  return [...points.entries()]
    .sort((first, second) => (order.get(first[0]) || 0) - (order.get(second[0]) || 0))
    .map(([, point]) => point);
}

function buildCategoryMetrics(requests: DataRecord[]): CategoryMetric[] {
  const categories = new Map<string, { requests: number; resolved: number }>();
  for (const request of requests) {
    const name = getRequestCategory(request);
    const metric = categories.get(name) || { requests: 0, resolved: 0 };
    metric.requests += 1;
    if (isResolved(request)) metric.resolved += 1;
    categories.set(name, metric);
  }
  return [...categories.entries()]
    .map(([name, metric]) => ({
      name,
      ...metric,
      resolutionRate: metric.requests > 0 ? metric.resolved / metric.requests : 0
    }))
    .sort((first, second) => first.resolutionRate - second.resolutionRate || second.requests - first.requests);
}

function buildAreaMetrics(requests: DataRecord[]): AreaMetric[] {
  const areas = new Map<string, AreaMetric>();
  for (const request of requests) {
    const name = getRequestArea(request);
    const metric = areas.get(name) || { name, people: 0, reports: 0 };
    metric.people += getAffectedCount(request);
    metric.reports += 1;
    areas.set(name, metric);
  }
  return [...areas.values()].sort((first, second) => second.people - first.people);
}

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function getFailureReason(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export default function Reports() {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [requests, setRequests] = useState<DataRecord[]>([]);
  const [shelters, setShelters] = useState<DataRecord[]>([]);
  const [volunteers, setVolunteers] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      apiClient('/api/v1/coordinator/requests', { method: 'GET' }),
      apiClient('/api/v1/shelters', { method: 'GET' }),
      apiClient('/api/v1/volunteers?activeOnly=true', { method: 'GET' })
    ]);

    const errors: string[] = [];
    if (results[0].status === 'fulfilled') setRequests(getRecords(results[0].value));
    else {
      setRequests([]);
      errors.push(`Requests: ${getFailureReason(results[0].reason)}`);
    }
    if (results[1].status === 'fulfilled') setShelters(getRecords(results[1].value));
    else {
      setShelters([]);
      errors.push(`Shelters: ${getFailureReason(results[1].reason)}`);
    }
    if (results[2].status === 'fulfilled') setVolunteers(getRecords(results[2].value));
    else {
      setVolunteers([]);
      errors.push(`Volunteers: ${getFailureReason(results[2].reason)}`);
    }

    const message = errors.join(' · ');
    setLoadError(message);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const filteredRequests = useMemo(() => {
    const cutoff = getCutoff(timeframe, Date.now());
    if (cutoff === null) return requests;
    return requests.filter(request => {
      const createdAt = getCreatedAtMs(request);
      return createdAt !== null && createdAt >= cutoff;
    });
  }, [requests, timeframe]);

  const resolvedCount = filteredRequests.filter(isResolved).length;
  const activeCount = filteredRequests.length - resolvedCount;
  const analyzedCount = filteredRequests.filter(hasValidAiAnalysis).length;
  const resolutionRate = filteredRequests.length > 0
    ? Math.round((resolvedCount / filteredRequests.length) * 100)
    : 0;
  const aiCoverage = filteredRequests.length > 0
    ? Math.round((analyzedCount / filteredRequests.length) * 100)
    : 0;

  const trendData = useMemo(() => buildTrend(filteredRequests, timeframe), [filteredRequests, timeframe]);
  const categoryDemand = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of filteredRequests) {
      const category = getRequestCategory(request);
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, requestsCount]) => ({ name, requests: requestsCount }))
      .sort((first, second) => second.requests - first.requests);
  }, [filteredRequests]);
  const areaMetrics = useMemo(() => buildAreaMetrics(filteredRequests), [filteredRequests]);
  const categoryMetrics = useMemo(() => buildCategoryMetrics(filteredRequests), [filteredRequests]);
  const unresolvedHighUrgency = filteredRequests.filter(request => !isResolved(request) && isHighUrgency(request));
  const resolvedFloodAreas = areaMetrics.filter(area =>
    filteredRequests.some(request =>
      isResolved(request) &&
      getRequestArea(request) === area.name &&
      /\bflood\b/i.test(`${getRequestCategory(request)} ${getString(request, 'description', 'Description')}`)
    )
  );

  const shelterStats = useMemo(() => shelters.reduce<{ capacity: number; occupied: number; available: number }>((total, shelter) => {
    const occupied = getNumber(shelter, 'occupiedSpaces', 'OccupiedSpaces', 'occupied', 'Occupied') ?? 0;
    const listedAvailable = getNumber(shelter, 'availableSpaces', 'AvailableSpaces', 'available', 'Available');
    const listedCapacity = getNumber(shelter, 'capacity', 'Capacity');
    const capacity = listedCapacity ?? (listedAvailable !== null ? occupied + listedAvailable : 0);
    const available = listedAvailable ?? Math.max(0, capacity - occupied);
    return {
      capacity: total.capacity + capacity,
      occupied: total.occupied + occupied,
      available: total.available + available
    };
  }, { capacity: 0, occupied: 0, available: 0 }), [shelters]);

  const exportCsv = () => {
    const rows: unknown[][] = [
      ['Record Type', 'ID', 'Name / Category', 'Status', 'Location', 'Urgency', 'Affected People', 'AI Analyzed', 'Created At', 'Details'],
      [
        'Summary',
        '',
        `Timeframe: ${timeframe}`,
        '',
        '',
        '',
        filteredRequests.length,
        `${aiCoverage}%`,
        '',
        `Resolved: ${resolvedCount}; Active: ${activeCount}; Resolution rate: ${resolutionRate}%; Shelters: ${shelters.length}; Active volunteers: ${volunteers.length}`
      ],
      ...filteredRequests.map(request => [
        'Request',
        getString(request, 'id', 'Id'),
        getRequestCategory(request),
        getString(request, 'status', 'Status'),
        getString(request, 'location', 'Location'),
        getUrgency(request),
        getAffectedCount(request),
        hasValidAiAnalysis(request) ? 'Yes' : 'No',
        getString(request, 'createdAtUtc', 'CreatedAtUtc'),
        getString(request, 'description', 'Description')
      ]),
      ...shelters.map(shelter => [
        'Shelter',
        getString(shelter, 'id', 'Id'),
        getString(shelter, 'name', 'Name'),
        getString(shelter, 'status', 'Status'),
        getString(shelter, 'location', 'Location'),
        '',
        '',
        '',
        '',
        `Capacity: ${getNumber(shelter, 'capacity', 'Capacity') ?? ''}; Available: ${getNumber(shelter, 'availableSpaces', 'AvailableSpaces', 'available', 'Available') ?? ''}`
      ]),
      ...volunteers.map(volunteer => [
        'Active Volunteer',
        getString(volunteer, 'id', 'Id'),
        getString(volunteer, 'fullName', 'FullName', 'name', 'Name'),
        getString(volunteer, 'status', 'Status'),
        getString(volunteer, 'location', 'Location'),
        '',
        '',
        '',
        '',
        getString(volunteer, 'skills', 'Skills')
      ])
    ];
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sevana-operations-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const timeframeLabel = TIMEFRAMES.find(option => option.value === timeframe)?.label || '7d';
  const categoryBottlenecks = categoryMetrics
    .filter(category => category.resolved < category.requests)
    .slice(0, 3);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Live operational metrics and post-resolution recovery insights"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-[#F1F5F9] p-1" aria-label="Report timeframe">
                {TIMEFRAMES.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimeframe(option.value)}
                    aria-pressed={timeframe === option.value}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${timeframe === option.value ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print / Save PDF
              </Button>
              <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => void loadReportData()} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          }
        />

        {loadError && (
          <div role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            Live report data is incomplete: {loadError}
          </div>
        )}

        {isLoading && requests.length === 0 && (
          <div className="rounded-xl border border-[#CBD8E6] bg-white p-5 text-sm text-[#5A7290]">
            Loading live operational data...
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Requests" value={filteredRequests.length.toLocaleString()} icon={<Package size={20} />} color="#1A3A6B" subtitle={`Timeframe: ${timeframeLabel}`} />
          <KpiCard label="Resolved Requests" value={resolvedCount.toLocaleString()} icon={<CheckCircle size={20} />} color="#16A34A" subtitle={`${resolutionRate}% resolution rate`} />
          <KpiCard label="Pending / Active Requests" value={activeCount.toLocaleString()} icon={<Activity size={20} />} color="#EA580C" />
          <KpiCard label="AI Analyzed Coverage" value={`${aiCoverage}%`} icon={<Brain size={20} />} color="#6D28D9" subtitle={`${analyzedCount} of ${filteredRequests.length} requests`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="p-5">
            <h2 className="mb-4 font-[Outfit] font-semibold text-[#0D1B2E]">Request Volume & Resolution</h2>
            {trendData.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#5A7290]">No dated requests in this timeframe.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="liveRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A3A6B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1A3A6B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="liveResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5A7290' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5A7290' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="requests" stroke="#1A3A6B" fill="url(#liveRequests)" strokeWidth={2} name="Requests" />
                  <Area type="monotone" dataKey="resolved" stroke="#16A34A" fill="url(#liveResolved)" strokeWidth={2} name="Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card padding="p-5">
            <h2 className="mb-4 font-[Outfit] font-semibold text-[#0D1B2E]">Highest-Demand Categories</h2>
            {categoryDemand.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#5A7290]">No requests in this timeframe.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryDemand.slice(0, 8)} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="requests" name="Requests" fill="#1A3A6B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <Card padding="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-[Outfit] font-semibold text-[#0D1B2E]">AI Post-Resolution Debrief & Recovery Insights</h2>
              <p className="mt-1 text-xs text-[#5A7290]">Insights from filtered live requests and current shelter / volunteer data</p>
            </div>
            <Badge variant="info">{timeframeLabel} dataset</Badge>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-[#0D1B2E]">Most Affected Areas</h3>
              {areaMetrics.length === 0 ? (
                <p className="text-xs text-[#5A7290]">No area data available.</p>
              ) : (
                <ul className="space-y-2">
                  {areaMetrics.slice(0, 3).map(area => (
                    <li key={area.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-[#475569]" title={area.name}>{area.name}</span>
                      <span className="shrink-0 font-semibold text-[#0D1B2E]">{area.people} people · {area.reports} reports</span>
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="mb-2 mt-4 text-sm font-semibold text-[#0D1B2E]">Top-Demand Categories</h3>
              <div className="flex flex-wrap gap-1.5">
                {categoryDemand.slice(0, 4).map((category, index) => (
                  <Badge key={category.name} variant={index === 0 ? 'primary' : 'neutral'}>
                    {category.name} · {category.requests}
                  </Badge>
                ))}
                {categoryDemand.length === 0 && <span className="text-xs text-[#5A7290]">No category data.</span>}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-[#0D1B2E]">Bottleneck Alerts</h3>
              <ul className="space-y-2 text-xs">
                {categoryBottlenecks.length > 0 ? categoryBottlenecks.map(category => (
                  <li key={category.name} className="flex items-start gap-2 rounded-lg bg-[#FFF7ED] p-2 text-[#9A3412]">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{category.name}: {Math.round(category.resolutionRate * 100)}% resolved ({category.resolved}/{category.requests}).</span>
                  </li>
                )) : (
                  <li className="text-[#5A7290]">No category bottlenecks detected.</li>
                )}
                <li className={`flex items-start gap-2 rounded-lg p-2 ${unresolvedHighUrgency.length > 0 ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#F0FDF4] text-[#166534]'}`}>
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {unresolvedHighUrgency.length > 0
                      ? `${unresolvedHighUrgency.length} unresolved high / critical urgency requests need follow-up.`
                      : 'No unresolved high / critical urgency requests in this timeframe.'}
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-[#0D1B2E]">Recommended Recovery Actions</h3>
              <ul className="space-y-2 text-xs text-[#475569]">
                {resolvedFloodAreas.length > 0 ? (
                  <li className="rounded-lg bg-[#EFF6FF] p-2">
                    Schedule follow-up checks in resolved flood-affected areas: {resolvedFloodAreas.slice(0, 2).map(area => area.name).join(', ')}.
                  </li>
                ) : (
                  <li className="rounded-lg bg-[#EFF6FF] p-2">Review resolved locations for any remaining recovery needs.</li>
                )}
                <li className="rounded-lg bg-[#F8FAFC] p-2">
                  Shelter snapshot: {shelters.length} shelters, {shelterStats.available} available of {shelterStats.capacity} capacity.
                  {shelterStats.capacity > 0 && ` ${Math.round((shelterStats.occupied / shelterStats.capacity) * 100)}% occupied.`}
                </li>
                <li className="rounded-lg bg-[#F8FAFC] p-2">
                  {volunteers.length} active volunteers are currently listed for recovery coordination.
                </li>
              </ul>
            </section>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
