import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Users, Package, Home, MapPin, Clock, Phone, ExternalLink, Sparkles } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, StatusBadge, Button, Modal } from '../components/ui';
import { apiClient } from '../api';
import { useAppContext } from '../context';

const STATUS_OPTIONS = [
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Closed', label: 'Closed' }
];

function getTimestampMs(req: any): number {
  const raw = req.createdAtUtc || req.CreatedAtUtc || req.createdAt || req.CreatedAt;
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return isNaN(parsed) ? 0 : parsed;
}

function normalizeStatusValue(rawStatus: string): string {
  const cleaned = String(rawStatus || 'Submitted').trim().toLowerCase().replace(/\s+/g, '');
  const match = STATUS_OPTIONS.find(
    (opt) => opt.value.toLowerCase().replace(/\s+/g, '') === cleaned
  );
  return match ? match.value : rawStatus || 'Submitted';
}

function getUrgencyVariant(urgency: string): 'danger' | 'warning' | 'info' | 'neutral' {
  const u = String(urgency || 'medium').toLowerCase();
  if (u === 'critical') return 'danger';
  if (u === 'high') return 'warning';
  if (u === 'low') return 'neutral';
  return 'info';
}

export function CoordinatorDashboard() {
  const { addToast } = useAppContext();
  const [stats, setStats] = useState({ crises: 0, pending: 0, volunteers: 0, capacity: 0 });
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Assignment Modal States
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [requestToAssign, setRequestToAssign] = useState<string | null>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, requestsRes] = await Promise.all([
        apiClient('/api/v1/coordinator/stats', { method: 'GET' }),
        apiClient('/api/v1/coordinator/requests', { method: 'GET' })
      ]);

      setStats({
        crises: statsRes?.totalActiveCrises ?? statsRes?.TotalActiveCrises ?? 0,
        pending: statsRes?.pendingRequests ?? statsRes?.PendingRequests ?? 0,
        volunteers: statsRes?.activeVolunteers ?? statsRes?.ActiveVolunteers ?? 0,
        capacity: statsRes?.availableResources ?? statsRes?.AvailableResources ?? 0
      });

      const requestsArray = Array.isArray(requestsRes)
        ? requestsRes
        : (requestsRes?.data || requestsRes?.items || []);

      // Sort strictly by most recent timestamp first
      const sortedRequests = [...requestsArray].sort(
        (a, b) => getTimestampMs(b) - getTimestampMs(a)
      );

      setRequests(sortedRequests);
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load coordinator data.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const fetchVolunteers = async () => {
    try {
      const res = await apiClient('/api/v1/volunteers?activeOnly=true', { method: 'GET' });
      const activeList = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setVolunteers(activeList);
    } catch (err) {
      console.error('Failed to load volunteers', err);
      addToast({ type: 'error', message: 'Failed to load volunteer list.' });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!newStatus) return;

    // Intercept 'Assigned' status to open the volunteer selection modal
    if (newStatus === 'Assigned') {
      setRequestToAssign(id);
      setAssignmentModalOpen(true);
      fetchVolunteers();
      return;
    }

    setUpdatingId(id);
    try {
      await apiClient(`/api/v1/coordinator/requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      addToast({ type: 'success', message: 'Status updated successfully.' });
      setRequests(prev =>
        prev.map(req =>
          (req.id === id || req.Id === id) ? { ...req, status: newStatus, Status: newStatus } : req
        )
      );
      // Refresh KPI counts in the background
      fetchDashboardData();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to update status.' });
      fetchDashboardData();
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmAssignment = async () => {
    if (!requestToAssign || !selectedVolunteer) return;
    setIsAssigning(true);

    try {
      await apiClient(`/api/v1/coordinator/requests/${requestToAssign}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Assigned',
          volunteerId: selectedVolunteer
        })
      });

      addToast({ type: 'success', message: 'Volunteer assigned successfully!' });

      setRequests(prev =>
        prev.map(req =>
          (req.id === requestToAssign || req.Id === requestToAssign)
            ? { ...req, status: 'Assigned', Status: 'Assigned' }
            : req
        )
      );

      setAssignmentModalOpen(false);
      setRequestToAssign(null);
      setSelectedVolunteer('');
      fetchDashboardData();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to assign volunteer.' });
      fetchDashboardData();
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Coordinator Dashboard"
          subtitle="Live overview of Sevana emergency operations"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Active Crises" value={stats.crises.toString()} icon={<AlertTriangle size={20} />} color="#DC2626" />
          <KpiCard label="Pending Requests" value={stats.pending.toString()} icon={<Package size={20} />} color="#EA580C" />
          <KpiCard label="Active Volunteers" value={stats.volunteers.toString()} icon={<Users size={20} />} color="#1A3A6B" />
          <KpiCard label="Shelter Capacity" value={stats.capacity.toString()} icon={<Home size={20} />} color="#16A34A" />
        </div>

        <Card padding="p-0">
          <div className="p-4 border-b border-[#CBD8E6] flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-[#0D1B2E] font-[Outfit]">Live Assistance Requests</h3>
              <p className="text-xs text-[#5A7290] mt-0.5">Sorted by most recent first</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            {isLoading && requests.length === 0 ? (
              <div className="p-8 text-center text-[#5A7290]">Loading live requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-[#5A7290]">No active requests found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#CBD8E6] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Citizen Details</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Category & Urgency</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">AI Analysis</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Location & Affected</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, idx) => {
                    const reqId = r.id || r.Id;
                    const currentStatus = normalizeStatusValue(r.status || r.Status || 'Submitted');
                    const isUpdating = updatingId === reqId;
                    const contact =
                      r.citizenPhoneNumber ||
                      r.CitizenPhoneNumber ||
                      r.contactNumber ||
                      r.ContactNumber ||
                      r.phoneNumber ||
                      r.PhoneNumber ||
                      r.citizenPhone ||
                      r.phone ||
                      '';
                    const locationText = r.location || r.Location || 'Location not provided';
                    const isUrlLocation = /^https?:\/\//i.test(locationText);
                    const lat = r.latitude ?? r.Latitude;
                    const lng = r.longitude ?? r.Longitude;
                    const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined && (lat !== 0 || lng !== 0);
                    const assignedShelter = r.assignedShelterName || r.AssignedShelterName || '';
                    const description = r.description || r.Description || '';
                    const urgency = r.urgency || r.Urgency || r.priority || 'Medium';
                    const timestampMs = getTimestampMs(r);

                    // AI Analysis metadata from backend
                    const aiSummary = r.aiSummary || r.AiSummary || '';
                    const aiRecommendation = r.aiRecommendation || r.AiRecommendation || '';
                    const rawConfidence = r.aiConfidenceScore ?? r.AiConfidenceScore ?? null;
                    const aiConfidenceScore = rawConfidence !== null ? Number(rawConfidence) : null;

                    return (
                      <tr key={reqId || idx} className={`border-b border-[#E8EDF3] hover:bg-[#F8FAFC] ${isUpdating ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-sm text-[#0D1B2E]">
                            {r.citizenName || r.CitizenName || r.fullName || 'Unknown Citizen'}
                          </p>
                          {contact ? (
                            <a
                              href={`tel:${contact}`}
                              className="text-xs text-[#1A3A6B] hover:underline mt-0.5 inline-flex items-center gap-1"
                            >
                              <Phone size={11} /> {contact}
                            </a>
                          ) : (
                            <p className="text-xs text-[#5A7290] mt-0.5">No contact provided</p>
                          )}
                          <p className="text-[10px] text-[#5A7290] mt-1 font-mono">{reqId}</p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            <Badge variant="primary">{r.category || r.Category || 'Unknown'}</Badge>
                            <Badge variant={getUrgencyVariant(urgency)}>{urgency}</Badge>
                          </div>
                          {description && (
                            <p className="text-xs text-[#5A7290] mt-2 line-clamp-2 max-w-[200px]" title={description}>
                              {description}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top min-w-[240px] max-w-xs">
                          {aiSummary || aiRecommendation ? (
                            <div className="p-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-[#6D28D9] font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <Sparkles size={12} /> AI Summary
                                </span>
                                {aiConfidenceScore !== null && aiConfidenceScore > 0 && (
                                  <span className="text-[10px] bg-[#6D28D9]/10 text-[#6D28D9] px-1.5 py-0.5 rounded-full">
                                    {Math.round(aiConfidenceScore)}% conf.
                                  </span>
                                )}
                              </div>
                              {aiSummary && (
                                <p className="text-[#0D1B2E] leading-snug" title={aiSummary}>
                                  {aiSummary}
                                </p>
                              )}
                              {aiRecommendation && (
                                <p className="text-[#5A7290] leading-snug pt-1 border-t border-[#DDD6FE]/60" title={aiRecommendation}>
                                  <strong className="text-[#6D28D9]">Action:</strong> {aiRecommendation}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#94A3B8] italic">No AI analysis</span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top max-w-xs">
                          <div className="text-sm flex items-start gap-1.5">
                            <MapPin size={14} className="text-[#5A7290] shrink-0 mt-0.5" />
                            {isUrlLocation ? (
                              <a
                                href={locationText}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1A3A6B] hover:underline break-all inline-flex items-center gap-1"
                              >
                                Open Map Link <ExternalLink size={12} />
                              </a>
                            ) : hasCoords ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0D1B2E] hover:text-[#1A3A6B] hover:underline line-clamp-2"
                                title="Open exact coordinates in Google Maps"
                              >
                                {locationText}
                              </a>
                            ) : (
                              <span className="line-clamp-2">{locationText}</span>
                            )}
                          </div>

                          <p className="text-xs text-[#5A7290] mt-1">
                            <Users size={12} className="inline mr-1" />
                            {r.affectedPeopleCount ?? r.AffectedPeopleCount ?? r.affectedCount ?? r.affected ?? 1} affected
                          </p>

                          {assignedShelter && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] rounded-md px-2 py-0.5 mt-1.5">
                              <Home size={11} /> {assignedShelter}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <StatusBadge status={currentStatus} />
                          <p className="text-[10px] text-[#5A7290] mt-1.5 flex items-center gap-1">
                            <Clock size={10} />
                            {timestampMs ? new Date(timestampMs).toLocaleString() : 'Date unavailable'}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <select
                            className="bg-white border border-[#CBD8E6] text-[#0D1B2E] text-xs rounded-lg focus:ring-[#1A3A6B] focus:border-[#1A3A6B] block w-full p-2 disabled:opacity-50"
                            value={currentStatus}
                            onChange={(e) => handleUpdateStatus(reqId, e.target.value)}
                            disabled={isUpdating}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Volunteer Assignment Modal */}
      <Modal
        open={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false);
          setRequestToAssign(null);
          setSelectedVolunteer('');
        }}
        title="Assign Field Volunteer"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignmentModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmAssignment} disabled={!selectedVolunteer || isAssigning}>
              {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5A7290]">
            Select a verified volunteer to deploy to this request location. The citizen will be notified immediately.
          </p>

          <div>
            <label className="text-sm font-medium text-[#0D1B2E] block mb-1.5">Available Volunteers</label>
            <select
              className="bg-white border border-[#CBD8E6] text-[#0D1B2E] text-sm rounded-xl focus:ring-[#1A3A6B] focus:border-[#1A3A6B] block w-full p-3"
              value={selectedVolunteer}
              onChange={(e) => setSelectedVolunteer(e.target.value)}
            >
              <option value="">-- Select a Responder --</option>
              {volunteers.map(v => (
                <option key={v.id || v.Id} value={v.id || v.Id}>
                  {v.fullName || v.name || 'Volunteer'} {v.status === 'Active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
            {volunteers.length === 0 && (
              <p className="text-xs text-[#DC2626] mt-1.5">
                No verified volunteers found. Approve a volunteer first in Volunteer Management.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}