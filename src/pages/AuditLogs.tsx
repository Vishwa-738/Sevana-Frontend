import { useState } from 'react';
import { FileText, Search, Filter, Eye, Brain, User, Clock } from 'lucide-react';
import { Button, Card, KpiCard, Badge, Modal, SearchBar, Select } from '../components/ui';
import { mockAuditLogs } from '../data/mockData';
import Layout from '../components/Layout';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  APPROVED_AI_RECOMMENDATION: { label: 'AI Approved', color: 'text-green-700 bg-green-50 border-green-200' },
  REJECTED_AI_RECOMMENDATION: { label: 'AI Rejected', color: 'text-red-700 bg-red-50 border-red-200' },
  RESOURCE_ALLOCATED: { label: 'Resource Allocated', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  USER_ROLE_UPDATED: { label: 'Role Updated', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  REQUEST_CREATED: { label: 'Request Created', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  SHELTER_ALLOCATED: { label: 'Shelter Allocated', color: 'text-teal-700 bg-teal-50 border-teal-200' },
};

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState<typeof mockAuditLogs[0] | null>(null);
  const [roleFilter, setRoleFilter] = useState('');

  const filtered = mockAuditLogs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !q || log.user.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.entity.toLowerCase().includes(q);
    const matchRole = !roleFilter || log.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-sm text-slate-500 mt-0.5">Complete audit trail of all platform actions and AI decisions</p>
          </div>
          <Button variant="outline" size="sm" icon={<Filter size={14} />}>Export Audit Log</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Events Today" value="891" icon={<FileText size={20} className="text-blue-600" />} iconBg="bg-blue-100" />
          <KpiCard label="AI Actions Logged" value="47" icon={<Brain size={20} className="text-purple-600" />} iconBg="bg-purple-100" />
          <KpiCard label="Human Overrides" value="12" icon={<User size={20} className="text-orange-600" />} iconBg="bg-orange-100" />
          <KpiCard label="Critical Actions" value="8" icon={<Clock size={20} className="text-red-600" />} iconBg="bg-red-100" />
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            <SearchBar placeholder="Search user, action, entity…" value={search} onChange={setSearch} className="flex-1" />
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'Emergency Coordinator', label: 'Emergency Coordinator' },
                { value: 'Resource Manager', label: 'Resource Manager' },
                { value: 'System Administrator', label: 'System Administrator' },
              ]}
              placeholder="All Roles"
              className="w-48"
            />
            <Button variant="outline" size="sm" icon={<Filter size={14} />}>More Filters</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Event ID', 'User', 'Role', 'Action', 'Entity', 'Timestamp', 'IP Address', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((log, i) => {
                  const actionCfg = ACTION_LABELS[log.action] || { label: log.action, color: 'text-slate-700 bg-slate-50 border-slate-200' };
                  return (
                    <tr key={log.id} className={`hover:bg-slate-50 transition-colors animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
                      <td className="px-5 py-3.5"><span className="font-mono text-xs text-slate-400">{log.id}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {log.user.split(' ').slice(-1)[0][0]}
                          </div>
                          <span className="font-medium text-slate-800 whitespace-nowrap">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{log.role}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${actionCfg.color} whitespace-nowrap`}>{actionCfg.label}</span>
                      </td>
                      <td className="px-5 py-3.5"><span className="font-mono text-xs text-[#1B3A6B]">{log.entity}</span></td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{log.ip}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setDetailModal(log)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`Audit Event — ${detailModal?.id}`} size="lg"
        footer={<Button variant="outline" onClick={() => setDetailModal(null)}>Close</Button>}
      >
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Event ID', value: detailModal.id },
                { label: 'Timestamp', value: detailModal.timestamp },
                { label: 'User', value: detailModal.user },
                { label: 'Role', value: detailModal.role },
                { label: 'Entity', value: detailModal.entity },
                { label: 'IP Address', value: detailModal.ip },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono text-sm">{value}</p>
                </div>
              ))}
            </div>

            {detailModal.prevValue && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-600 font-semibold">Previous Value</p>
                  <p className="text-sm text-slate-800 mt-1">{detailModal.prevValue}</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs text-green-600 font-semibold">New Value</p>
                  <p className="text-sm text-slate-800 mt-1">{detailModal.newValue}</p>
                </div>
              </div>
            )}

            {detailModal.aiRec && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-purple-600" />
                  <p className="text-sm font-semibold text-purple-900">AI Recommendation Details</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-purple-500">Original Recommendation</p>
                    <p className="text-slate-800 mt-0.5">{detailModal.aiRec}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-500">Confidence</p>
                    <p className="font-bold text-purple-700 text-lg mt-0.5">{detailModal.confidence}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-purple-500">Human Decision</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{detailModal.humanAction}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
