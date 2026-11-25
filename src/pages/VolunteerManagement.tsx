import React, { useState, useEffect, useCallback } from 'react';
import { Users, ShieldCheck, Truck, MapPin, CheckCircle, XCircle, Send, Phone, RefreshCw } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Modal, Select, SearchInput, Tabs } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  skills: string[];
  availability: string;
  hasVehicle: boolean;
  vehicleType: string;
  location: string;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Active';
  completedTasks: number;
}

interface DispatchRequestOption {
  id: string;
  label: string;
}

interface DispatchShelterOption {
  id: string;
  label: string;
}

function normalizeStatus(raw: string): Volunteer['status'] {
  const s = String(raw || 'Pending').trim().toLowerCase();
  if (s === 'verified' || s === 'approved' || s === 'available') return 'Verified';
  if (s === 'active' || s === 'dispatched' || s === 'assigned' || s === 'infield') return 'Active';
  if (s === 'rejected' || s === 'declined') return 'Rejected';
  return 'Pending';
}

export function VolunteerManagement() {
  const { addToast } = useAppContext();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  // Dispatch Modal States
  const [dispatchModal, setDispatchModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [dispatchForm, setDispatchForm] = useState({ targetId: '', targetType: 'AssistanceRequest' });
  const [requestOptions, setRequestOptions] = useState<DispatchRequestOption[]>([]);
  const [shelterOptions, setShelterOptions] = useState<DispatchShelterOption[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const loadVolunteers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/v1/volunteers', { method: 'GET' });
      const data = Array.isArray(res) ? res : (res?.data || res?.items || []);

      setVolunteers(
        data.map((v: any) => ({
          id: v.id || v.Id,
          name: v.fullName || v.FullName || v.name || v.Name || 'Unknown',
          email: v.email || v.Email || '',
          phoneNumber: v.phoneNumber || v.PhoneNumber || '',
          skills: Array.isArray(v.skills) ? v.skills : (v.Skills || []),
          availability: v.availability || v.Availability || 'Not specified',
          hasVehicle: !!(v.hasVehicle || v.HasVehicle),
          vehicleType: v.vehicleType || v.VehicleType || 'None',
          location: v.location || v.Location || 'Unknown',
          status: normalizeStatus(v.verificationStatus || v.VerificationStatus || v.status || v.Status),
          completedTasks: Number(v.completedTasks ?? v.CompletedTasks ?? 0) || 0,
        }))
      );
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load volunteers.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const loadDispatchTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const [reqRes, shelterRes] = await Promise.all([
        apiClient('/api/v1/coordinator/requests', { method: 'GET' }).catch(() => []),
        apiClient('/api/v1/shelters', { method: 'GET' }).catch(() => []),
      ]);

      const rawReqs = Array.isArray(reqRes) ? reqRes : (reqRes?.data || reqRes?.items || []);
      const activeReqs = rawReqs
        .filter((r: any) => {
          const st = String(r.status || r.Status || '').toLowerCase();
          return st !== 'delivered' && st !== 'closed';
        })
        .map((r: any) => {
          const id = r.id || r.Id;
          const citizen = r.citizenName || r.CitizenName || 'Citizen';
          const cat = r.category || r.Category || 'Assistance';
          const urg = r.urgency || r.Urgency || 'Medium';
          const loc = r.location || r.Location || 'No location';
          const shortLoc = loc.length > 35 ? `${loc.slice(0, 35)}...` : loc;
          return {
            id,
            label: `${citizen} — ${cat} (${urg}) · ${shortLoc}`,
          };
        });
      setRequestOptions(activeReqs);

      const rawShelters = Array.isArray(shelterRes) ? shelterRes : (shelterRes?.data || shelterRes?.items || []);
      const openShelters = rawShelters.map((s: any) => {
        const id = s.id || s.Id;
        const name = s.name || s.Name || 'Shelter';
        const district = s.district || s.District || '';
        const avail = s.availableSpaces ?? s.AvailableSpaces ?? s.available ?? '';
        return {
          id,
          label: `${name}${district ? ` (${district})` : ''}${avail !== '' ? ` — ${avail} spaces` : ''}`,
        };
      });
      setShelterOptions(openShelters);
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  const openDispatchModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setDispatchForm({ targetId: '', targetType: 'AssistanceRequest' });
    setDispatchModal(true);
    loadDispatchTargets();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient(`/api/v1/volunteers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      addToast({ type: 'success', message: `Volunteer marked as ${newStatus}.` });
      loadVolunteers();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to update status.' });
    }
  };

  const handleDispatch = async () => {
    if (!selectedVolunteer || !dispatchForm.targetId) {
      addToast({ type: 'error', message: 'Please select a destination to dispatch to.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/volunteers/${selectedVolunteer.id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          targetId: dispatchForm.targetId,
          targetType: dispatchForm.targetType,
        }),
      });

      addToast({ type: 'success', message: `${selectedVolunteer.name} dispatched successfully.` });
      setDispatchModal(false);
      setDispatchForm({ targetId: '', targetType: 'AssistanceRequest' });
      setSelectedVolunteer(null);
      loadVolunteers();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to dispatch volunteer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = volunteers.filter((v) => {
    const matchesTab = activeTab === 'all' || v.status.toLowerCase() === activeTab.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q) ||
      v.skills.some((s) => s.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const pendingCount = volunteers.filter((v) => v.status === 'Pending').length;
  const verifiedCount = volunteers.filter((v) => v.status === 'Verified').length;
  const activeCount = volunteers.filter((v) => v.status === 'Active').length;

  const currentTargetOptions =
    dispatchForm.targetType === 'AssistanceRequest' ? requestOptions : shelterOptions;

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Volunteer Management"
          subtitle="Verify credentials, assign roles, and dispatch field units"
          actions={
            <Button variant="outline" size="sm" onClick={loadVolunteers} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Volunteers" value={volunteers.length.toString()} icon={<Users size={20} />} color="#1A3A6B" />
          <KpiCard label="Pending Verification" value={pendingCount.toString()} icon={<ShieldCheck size={20} />} color="#EA580C" />
          <KpiCard label="Ready to Dispatch" value={verifiedCount.toString()} icon={<CheckCircle size={20} />} color="#16A34A" />
          <KpiCard label="Active in Field" value={activeCount.toString()} icon={<Truck size={20} />} color="#6D28D9" />
        </div>

        <Card padding="p-0">
          <div className="p-4 border-b border-[#CBD8E6] flex flex-wrap justify-between items-center gap-4 bg-[#F8FAFC]">
            <SearchInput
              placeholder="Search name, location, or skills..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              className="w-72 bg-white"
            />
            <Tabs
              tabs={[
                { id: 'all', label: `All (${volunteers.length})` },
                { id: 'pending', label: `Pending (${pendingCount})` },
                { id: 'verified', label: `Verified (${verifiedCount})` },
                { id: 'active', label: `Active in Field (${activeCount})` },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-[#5A7290]">Loading volunteers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-[#5A7290]">No volunteers found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#CBD8E6] bg-white">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Volunteer Details</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Skills & Assets</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-sm text-[#0D1B2E]">{v.name}</p>
                        <p className="text-xs text-[#5A7290] mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {v.phoneNumber ? (
                            <a href={`tel:${v.phoneNumber}`} className="text-[#1A3A6B] hover:underline inline-flex items-center gap-1">
                              <Phone size={11} /> {v.phoneNumber}
                            </a>
                          ) : (
                            <span>No phone</span>
                          )}
                          {v.email && <span>• {v.email}</span>}
                        </p>
                        <p className="text-xs text-[#5A7290] mt-1 flex items-center gap-1">
                          <MapPin size={12} /> {v.location} (Avail: {v.availability})
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {v.skills.length > 0 ? (
                            v.skills.map((s) => (
                              <Badge key={s} variant="neutral" className="text-[10px]">{s}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-[#5A7290]">No skills listed</span>
                          )}
                        </div>
                        {v.hasVehicle ? (
                          <p className="text-[10px] text-[#1D4ED8] flex items-center gap-1 bg-[#EFF6FF] w-max px-2 py-0.5 rounded border border-[#BFDBFE]">
                            <Truck size={10} /> {v.vehicleType}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#5A7290]">No vehicle</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            v.status === 'Verified'
                              ? 'success'
                              : v.status === 'Pending'
                              ? 'warning'
                              : v.status === 'Active'
                              ? 'primary'
                              : 'danger'
                          }
                        >
                          {v.status}
                        </Badge>
                        {v.completedTasks > 0 && (
                          <p className="text-[10px] text-[#5A7290] mt-1">{v.completedTasks} tasks completed</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {v.status === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[#DC2626] border-[#DC2626] hover:bg-[#FEF2F2]"
                              onClick={() => handleUpdateStatus(v.id, 'Rejected')}
                              icon={<XCircle size={14} />}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#16A34A] hover:bg-[#15803D]"
                              onClick={() => handleUpdateStatus(v.id, 'Verified')}
                              icon={<CheckCircle size={14} />}
                            >
                              Verify
                            </Button>
                          </div>
                        )}
                        {v.status === 'Verified' && (
                          <Button size="sm" onClick={() => openDispatchModal(v)} icon={<Send size={14} />}>
                            Dispatch
                          </Button>
                        )}
                        {v.status === 'Active' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(v.id, 'Verified')}>
                            Recall (Set Available)
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={dispatchModal}
        onClose={() => setDispatchModal(false)}
        title={`Dispatch ${selectedVolunteer?.name || ''}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDispatchModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleDispatch} disabled={isSubmitting || !dispatchForm.targetId}>
              {isSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Destination Type"
            value={dispatchForm.targetType}
            onChange={(e: any) =>
              setDispatchForm({ targetType: e.target.value, targetId: '' })
            }
            options={[
              { value: 'AssistanceRequest', label: 'Distress Call / Assistance Request' },
              { value: 'Shelter', label: 'Shelter Facility' },
            ]}
          />

          <Select
            label={
              dispatchForm.targetType === 'AssistanceRequest'
                ? 'Select Assistance Request'
                : 'Select Relief Shelter'
            }
            value={dispatchForm.targetId}
            onChange={(e: any) =>
              setDispatchForm((f) => ({ ...f, targetId: e.target.value }))
            }
            disabled={loadingTargets}
            options={[
              {
                value: '',
                label: loadingTargets
                  ? 'Loading destinations...'
                  : currentTargetOptions.length === 0
                  ? 'No active destinations available'
                  : '-- Select a destination --',
              },
              ...currentTargetOptions.map((opt) => ({
                value: opt.id,
                label: opt.label,
              })),
            ]}
          />

          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
            <p className="text-xs text-[#1D4ED8] font-medium">Volunteer Loadout:</p>
            <p className="text-xs text-[#1E3A8A] mt-1">
              {selectedVolunteer?.hasVehicle
                ? `Driving ${selectedVolunteer.vehicleType}`
                : 'On foot / No vehicle'}
            </p>
            <p className="text-xs text-[#1E3A8A] mt-0.5">
              Skills: {selectedVolunteer?.skills?.length ? selectedVolunteer.skills.join(', ') : 'General'}
            </p>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}