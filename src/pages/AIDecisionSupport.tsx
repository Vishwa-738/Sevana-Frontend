import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Edit, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, Badge, Button, Modal, Textarea, Alert, Progress, Tabs, PriorityBadge } from '../components/ui';
import { useAppContext } from '../context';

interface Recommendation {
  id: string;
  type: string;
  requestId: string;
  citizen: string;
  summary: string;
  confidence: number;
  reasoning: string[];
  priority: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'deferred';
  humanAction?: string;
  humanUser?: string;
  humanTime?: string;
}

const recommendations: Recommendation[] = [
  {
    id: 'AI-0341',
    type: 'Priority Classification',
    requestId: 'REQ-2841',
    citizen: 'Kasun Jayawardena',
    summary: 'Classify as CRITICAL — Immediate dispatch required. Family of 5 with infant, flood waters rising.',
    confidence: 94,
    reasoning: [
      'Infant and elderly persons present (high vulnerability)',
      'Location in flood zone — water level rising 15cm/hr',
      'No nearby alternative shelter identified',
      'Request received during peak flood event',
    ],
    priority: 'critical',
    timestamp: '14 min ago',
    status: 'pending',
  },
  {
    id: 'AI-0340',
    type: 'Resource Matching',
    requestId: 'REQ-2840',
    citizen: 'Nimalee Perera',
    summary: 'Match with Red Cross Medical Unit at Kelaniya — insulin stock available, 2.3 km distance.',
    confidence: 89,
    reasoning: [
      'Matching medication type in Red Cross inventory',
      'Closest verified medical unit with insulin stock',
      'Unit has available capacity (2 of 4 medics on duty)',
      'Road access confirmed by traffic monitoring',
    ],
    priority: 'high',
    timestamp: '22 min ago',
    status: 'approved',
    humanAction: 'Approved without modification',
    humanUser: 'Amara Perera',
    humanTime: '20 min ago',
  },
  {
    id: 'AI-0339',
    type: 'Shelter Recommendation',
    requestId: 'REQ-2838',
    citizen: 'Sampath Gunaratne',
    summary: 'Allocate to Kelaniya Community Center — Room B3. 47 spaces available, accessible facilities.',
    confidence: 76,
    reasoning: [
      'Nearest shelter with available accessible rooms',
      'Citizen requires wheelchair access (stated in request)',
      'Medical staff on site 24/7',
      'Food supply confirmed for next 72 hours',
    ],
    priority: 'high',
    timestamp: '41 min ago',
    status: 'modified',
    humanAction: 'Modified — Allocated to Army Camp Shelter instead (better accessibility)',
    humanUser: 'Chaminda Rathnayake',
    humanTime: '35 min ago',
  },
  {
    id: 'AI-0338',
    type: 'Duplicate Detection',
    requestId: 'REQ-2836',
    citizen: 'Sunil Bandara',
    summary: 'Potential duplicate of REQ-2831 from same address (12A, Riverside Rd, Kelaniya). Recommend merging.',
    confidence: 82,
    reasoning: [
      'Same GPS coordinates (within 15m)',
      'Same household surname',
      'Both requesting food assistance',
      'Submitted 23 minutes apart',
    ],
    priority: 'medium',
    timestamp: '55 min ago',
    status: 'rejected',
    humanAction: 'Rejected — Different family units at same address (multi-apartment building)',
    humanUser: 'Amara Perera',
    humanTime: '48 min ago',
  },
  {
    id: 'AI-0337',
    type: 'Demand Forecast',
    requestId: 'FORECAST-001',
    citizen: 'System',
    summary: 'Predicted 340% surge in food requests expected in next 6 hours based on flood trajectory models.',
    confidence: 71,
    reasoning: [
      'Kelani River predicted to breach 8.5m flood mark in 4-5 hours',
      'Historical precedent: 2016 flood caused 280% surge',
      'Current requests already trending 45% above baseline',
      'Evacuation orders expected for Zone 3A',
    ],
    priority: 'high',
    timestamp: '1h ago',
    status: 'deferred',
    humanAction: 'Deferred — Awaiting confirmation from DMC on flood projections',
    humanUser: 'Amara Perera',
    humanTime: '55 min ago',
  },
];

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Pending Review', icon: <Clock size={14} />, color: 'text-[#CA8A04]' },
  approved: { label: 'Approved', icon: <CheckCircle size={14} />, color: 'text-[#16A34A]' },
  rejected: { label: 'Rejected', icon: <XCircle size={14} />, color: 'text-[#DC2626]' },
  modified: { label: 'Modified', icon: <Edit size={14} />, color: 'text-[#6D28D9]' },
  deferred: { label: 'Deferred', icon: <Clock size={14} />, color: 'text-[#5A7290]' },
};

function RecommendationCard({ rec, onAction }: { rec: Recommendation; onAction: (rec: Recommendation, action: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const s = statusConfig[rec.status];

  return (
    <Card className={`animate-fade-in ${rec.status === 'pending' ? 'border-[#6D28D9]/30' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="info">{rec.type}</Badge>
          <span className="text-xs text-[#5A7290] font-mono">{rec.requestId}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
          {s.icon}
          {s.label}
        </div>
      </div>

      <p className="text-sm font-medium text-[#0D1B2E] mb-2">{rec.summary}</p>

      {/* Confidence bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-[#5A7290]">AI Confidence</span>
            <span className="text-xs font-bold" style={{ color: rec.confidence >= 85 ? '#16A34A' : rec.confidence >= 70 ? '#CA8A04' : '#DC2626' }}>
              {rec.confidence}%
            </span>
          </div>
          <div className="h-1.5 bg-[#E8EDF3] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${rec.confidence}%`,
                backgroundColor: rec.confidence >= 85 ? '#16A34A' : rec.confidence >= 70 ? '#CA8A04' : '#DC2626'
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={rec.priority} />
        </div>
      </div>

      {/* Reasoning */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-[#5A7290] hover:text-[#1A3A6B] transition-colors cursor-pointer mb-3"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide' : 'Show'} AI reasoning ({rec.reasoning.length} factors)
      </button>

      {expanded && (
        <div className="mb-3 p-3 bg-[#F5F3FF] rounded-xl border border-[#DDD6FE] animate-slide-down">
          <p className="text-xs font-semibold text-[#6D28D9] mb-2">Supporting factors:</p>
          <ul className="space-y-1.5">
            {rec.reasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#5A7290]">
                <span className="text-[#6D28D9] font-bold mt-0.5">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#5A7290] mt-2 italic">Generated: {rec.timestamp}</p>
        </div>
      )}

      {/* Human decision (if actioned) */}
      {rec.humanAction && (
        <div className={`p-3 rounded-xl border mb-3 ${rec.status === 'approved' ? 'bg-[#F0FDF4] border-[#86EFAC]' : rec.status === 'rejected' ? 'bg-[#FFF1F2] border-[#FECDD3]' : rec.status === 'modified' ? 'bg-[#F5F3FF] border-[#DDD6FE]' : 'bg-[#F1F5F9] border-[#CBD8E6]'}`}>
          <p className="text-xs font-semibold text-[#0D1B2E] mb-0.5">Human Decision</p>
          <p className="text-xs text-[#5A7290]">{rec.humanAction}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#5A7290]">
            <span>by <strong>{rec.humanUser}</strong></span>
            <span>·</span>
            <span>{rec.humanTime}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {rec.status === 'pending' && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E8EDF3]">
          <Button size="sm" variant="success" icon={<CheckCircle size={14} />} onClick={() => onAction(rec, 'approve')}>
            Approve
          </Button>
          <Button size="sm" variant="outline" icon={<Edit size={14} />} onClick={() => onAction(rec, 'modify')}>
            Modify
          </Button>
          <Button size="sm" variant="danger" icon={<XCircle size={14} />} onClick={() => onAction(rec, 'reject')}>
            Reject
          </Button>
          <Button size="sm" variant="ghost" icon={<Clock size={14} />} onClick={() => onAction(rec, 'defer')}>
            Defer
          </Button>
        </div>
      )}
    </Card>
  );
}

export function AIDecisionSupport() {
  const { addToast } = useAppContext();
  const [activeTab, setActiveTab] = useState('pending');
  const [actionModal, setActionModal] = useState<{ open: boolean; rec: Recommendation | null; action: string; note: string }>({
    open: false, rec: null, action: '', note: ''
  });

  const handleAction = (rec: Recommendation, action: string) => {
    setActionModal({ open: true, rec, action, note: '' });
  };

  const confirmAction = () => {
    const labels: Record<string, string> = {
      approve: 'approved', reject: 'rejected', modify: 'modified', defer: 'deferred'
    };
    addToast({
      type: actionModal.action === 'reject' ? 'warning' : 'success',
      title: `Recommendation ${labels[actionModal.action]}`,
      message: `AI-${actionModal.rec?.id} has been ${labels[actionModal.action]}. Audit record created.`
    });
    setActionModal(a => ({ ...a, open: false }));
  };

  const filtered = recommendations.filter(r =>
    activeTab === 'all' ? true :
    activeTab === 'pending' ? r.status === 'pending' :
    r.status !== 'pending'
  );

  const pendingCount = recommendations.filter(r => r.status === 'pending').length;

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="AI Decision Support"
          subtitle="Review and action AI-generated recommendations"
        />

        {/* AI disclaimer */}
        <div className="mb-6 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl flex items-start gap-3">
          <Info size={18} className="text-[#1D4ED8] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#1D4ED8]">Human-in-the-Loop Policy</p>
            <p className="text-sm text-[#3B82F6]">
              AI provides recommendations based on available data and models. <strong>All final humanitarian decisions remain under authorised human control.</strong> Review each recommendation carefully before actioning.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending Review', value: pendingCount, color: '#CA8A04', bg: '#FEFCE8' },
            { label: 'Approved Today', value: 47, color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Rejected/Modified', value: 12, color: '#DC2626', bg: '#FFF1F2' },
            { label: 'Avg Confidence', value: '84%', color: '#6D28D9', bg: '#F5F3FF' },
          ].map(s => (
            <Card key={s.label} padding="p-4">
              <p className="text-2xl font-bold font-[Outfit]" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#5A7290] mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs
          tabs={[
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'actioned', label: 'Actioned' },
            { id: 'all', label: 'All' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />

        <div className="space-y-4">
          {filtered.map(rec => (
            <RecommendationCard key={rec.id} rec={rec} onAction={handleAction} />
          ))}
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        open={actionModal.open}
        onClose={() => setActionModal(a => ({ ...a, open: false }))}
        title={`${actionModal.action === 'approve' ? 'Approve' : actionModal.action === 'reject' ? 'Reject' : actionModal.action === 'modify' ? 'Modify' : 'Defer'} Recommendation`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(a => ({ ...a, open: false }))}>Cancel</Button>
            <Button
              variant={actionModal.action === 'reject' ? 'danger' : actionModal.action === 'approve' ? 'success' : 'primary'}
              onClick={confirmAction}
            >
              Confirm {actionModal.action === 'approve' ? 'Approval' : actionModal.action === 'reject' ? 'Rejection' : actionModal.action === 'modify' ? 'Modification' : 'Deferral'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionModal.rec && (
            <div className="p-3 bg-[#F0F4F8] rounded-xl border border-[#CBD8E6] text-sm">
              <p className="font-medium text-[#0D1B2E]">{actionModal.rec.summary}</p>
              <p className="text-xs text-[#5A7290] mt-1">Confidence: {actionModal.rec.confidence}% · {actionModal.rec.requestId}</p>
            </div>
          )}

          {actionModal.action === 'modify' && (
            <Textarea
              label="Modified recommendation"
              placeholder="Describe the modified action to take..."
              value={actionModal.note}
              onChange={e => setActionModal(a => ({ ...a, note: e.target.value }))}
              rows={3}
            />
          )}

          <Textarea
            label={actionModal.action === 'modify' ? 'Reason for modification' : 'Notes (optional)'}
            placeholder={`Explain why you're ${actionModal.action === 'approve' ? 'approving' : actionModal.action === 'reject' ? 'rejecting' : actionModal.action === 'modify' ? 'modifying' : 'deferring'} this recommendation...`}
            value={actionModal.action === 'modify' ? '' : actionModal.note}
            onChange={e => setActionModal(a => ({ ...a, note: e.target.value }))}
            rows={3}
          />

          <Alert
            type="info"
            message="This decision will be recorded in the audit log with your name, role, timestamp, and the original AI recommendation."
          />
        </div>
      </Modal>
    </Layout>
  );
}
