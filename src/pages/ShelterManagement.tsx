import React, { useState, useEffect, useCallback } from 'react';
import {
  Home, Plus, MapPin, Users, Check, Accessibility, Loader2,
  Phone, Navigation, ExternalLink, RefreshCw, ShieldCheck, CheckCircle, XCircle, UserCheck
} from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Modal, Input, Select, Progress, Tabs, SearchInput } from '../components/ui';
import { LocationAutocomplete, type LocationSuggestion } from '../components/LocationAutocomplete';
import { useAppContext } from '../context';
import { apiClient } from '../api';

interface Shelter {
  id: string;
  name: string;
  location: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  occupied: number;
  status: 'open' | 'full' | 'closed';
  facilities: string[];
  accessible: boolean;
  contact: string;
  services: string[];
  org: string;
  managerId?: string;
  managerName?: string;
}

interface PendingRequestOption {
  id: string;
  citizenName: string;
  affectedCount: number;
  category: string;
  location: string;
}

interface VolunteerOption {
  id: string;
  name: string;
  phone: string;
  location: string;
}

interface ShelterRequestItem {
  id: string;
  citizenName: string;
  phoneNumber: string;
  peopleCount: number;
  notes: string;
  status: string;
  createdAtUtc: string;
}

interface RosterMember {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  peopleCount?: number;
  skills?: string[];
  assignedAtUtc?: string;
}

interface ShelterRoster {
  manager?: RosterMember | null;
  citizens: RosterMember[];
  volunteers: RosterMember[];
}

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya'
];

const facilityIcons: Record<string, string> = {
  Food: '🍚',
  Water: '💧',
  Medical: '🏥',
  Toilets: '🚽',
  Showers: '🚿',
  Security: '🛡️',
  'Child care': '👶',
};

function normalizeShelterStatus(rawStatus: string, occupied: number, capacity: number): 'open' | 'full' | 'closed' {
  const s = String(rawStatus || 'open').trim().toLowerCase();
  if (s === 'closed' || s === 'inactive') return 'closed';
  if (s === 'full' || (capacity > 0 && occupied >= capacity)) return 'full';
  return 'open';
}

function normalizeRosterMember(m: any): RosterMember {
  return {
    id: m.userId || m.UserId || m.id || m.Id || '',
    fullName: m.fullName || m.FullName || m.name || m.Name || 'Unknown',
    email: m.email || m.Email || '',
    phoneNumber: m.phoneNumber || m.PhoneNumber || '',
    role: m.role || m.Role || '',
    status: m.status || m.Status || '',
    peopleCount: m.peopleCount ?? m.PeopleCount,
    skills: Array.isArray(m.skills) ? m.skills : (Array.isArray(m.Skills) ? m.Skills : []),
    assignedAtUtc: m.assignedAtUtc || m.AssignedAtUtc || ''
  };
}

export function ShelterManagement() {
  const { user, addToast } = useAppContext();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestOption[]>([]);
  const [verifiedVolunteers, setVerifiedVolunteers] = useState<VolunteerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [allocateModal, setAllocateModal] = useState(false);
  const [addModal, setAddModal] = useState(false);

  // Shelter Manager Detail Data (Direct Requests & Roster)
  const [shelterRequests, setShelterRequests] = useState<ShelterRequestItem[]>([]);
  const [roster, setRoster] = useState<ShelterRoster>({ manager: null, citizens: [], volunteers: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [verifyingReqId, setVerifyingReqId] = useState<string | null>(null);

  const [allocForm, setAllocForm] = useState({
    requestId: '',
    name: '',
    count: '1',
    needs: ''
  });

  const [addForm, setAddForm] = useState({
    name: '',
    location: '',
    district: '',
    latitude: '',
    longitude: '',
    capacity: '',
    contact: '',
    org: '',
    managerVolunteerId: '',
    accessible: false,
    facilities: ''
  });

  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const isShelterManager = (user?.role || '').toLowerCase() === 'shelteradmin';
  const currentUserId = String((user as any)?.id || (user as any)?.userId || (user as any)?.sub || '').trim().toLowerCase();
  const currentUserName = String(user?.name || (user as any)?.fullName || '').trim().toLowerCase();

  const canManageShelter = useCallback(
    (shelter: Shelter) => {
      if (!isShelterManager) return true;
      const idMatch =
        !!shelter.managerId &&
        !!currentUserId &&
        String(shelter.managerId).trim().toLowerCase() === currentUserId;
      const nameMatch =
        !!shelter.managerName &&
        !!currentUserName &&
        shelter.managerName.trim().toLowerCase() === currentUserName;
      return idMatch || nameMatch;
    },
    [isShelterManager, currentUserId, currentUserName]
  );

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    const district = SRI_LANKA_DISTRICTS.find(
      item => item.toLowerCase() === suggestion.district.toLowerCase()
    );
    setAddForm(f => ({
      ...f,
      location: suggestion.displayName,
      latitude: String(suggestion.latitude),
      longitude: String(suggestion.longitude),
      district: district || f.district
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      addToast({ type: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let resolvedAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        let detectedDistrict = '';

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await res.json();
          if (data?.display_name) resolvedAddress = data.display_name;
          const ad = data?.address || {};
          const rawDist = (ad.state_district || ad.county || ad.city || '')
            .replace(/\s+District$/i, '')
            .trim()
            .toLowerCase();
          detectedDistrict = SRI_LANKA_DISTRICTS.find(district => district.toLowerCase() === rawDist) || '';
        } catch {
          // Fall back to coordinates
        }

        setAddForm(f => ({
          ...f,
          location: resolvedAddress,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          district: detectedDistrict || f.district
        }));
        setIsLocatingGps(false);
        addToast({ type: 'success', message: 'Shelter GPS coordinates captured.' });
      },
      () => {
        setIsLocatingGps(false);
        addToast({ type: 'error', message: 'Unable to access GPS. Please search your address instead.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadShelters = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, reqRes, volRes] = await Promise.all([
        apiClient('/api/v1/shelters', { method: 'GET' }),
        apiClient('/api/v1/coordinator/requests', { method: 'GET' }).catch(() => []),
        apiClient('/api/v1/volunteers', { method: 'GET' }).catch(() => [])
      ]);

      const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setShelters(
        data.map((s: any) => {
          const capacity = Number(s.capacity ?? s.Capacity ?? 0) || 0;
          const occupied = Number(s.occupiedSpaces ?? s.OccupiedSpaces ?? s.occupied ?? 0) || 0;
          const lat = s.latitude ?? s.Latitude;
          const lng = s.longitude ?? s.Longitude;

          return {
            id: s.id || s.Id,
            name: s.name || s.Name || 'Unnamed Shelter',
            location: s.location || s.Location || '',
            district: s.district || s.District || 'Unknown',
            latitude: lat !== null && lat !== undefined ? Number(lat) : null,
            longitude: lng !== null && lng !== undefined ? Number(lng) : null,
            capacity,
            occupied,
            status: normalizeShelterStatus(s.status || s.Status, occupied, capacity),
            facilities: Array.isArray(s.facilities) ? s.facilities : (s.Facilities || []),
            accessible: !!(s.accessible || s.Accessible || s.accessibility || s.Accessibility),
            contact: s.contactNumber || s.ContactNumber || s.contact || s.Contact || '',
            services: Array.isArray(s.services) ? s.services : (s.Services || []),
            org: s.managingOrganization || s.ManagingOrganization || s.organization || s.org || '',
            managerId:
              s.shelterAdminId ||
              s.ShelterAdminId ||
              s.managerId ||
              s.ManagerId ||
              s.managerVolunteerId ||
              '',
            managerName: s.managerName || s.ManagerName || ''
          };
        })
      );

      const rawReqs = Array.isArray(reqRes) ? reqRes : (reqRes?.data || reqRes?.items || []);
      const activeReqs: PendingRequestOption[] = rawReqs
        .filter((r: any) => {
          const st = String(r.status || r.Status || '').toLowerCase();
          const hasShelter = !!(r.assignedShelterName || r.AssignedShelterName);
          return st !== 'delivered' && st !== 'closed' && !hasShelter;
        })
        .map((r: any) => ({
          id: r.id || r.Id,
          citizenName: r.citizenName || r.CitizenName || 'Citizen',
          affectedCount: Number(r.affectedPeopleCount ?? r.AffectedPeopleCount ?? r.affectedCount ?? 1) || 1,
          category: r.category || r.Category || 'Assistance',
          location: r.location || r.Location || ''
        }));
      setPendingRequests(activeReqs);

      const rawVols = Array.isArray(volRes) ? volRes : (volRes?.data || volRes?.items || []);
      const verified = rawVols
        .filter((v: any) => {
          const st = String(v.verificationStatus || v.VerificationStatus || v.status || v.Status || '').toLowerCase();
          return st === 'verified' || st === 'approved' || st === 'active';
        })
        .map((v: any) => ({
          id: v.id || v.Id,
          name: v.fullName || v.FullName || v.name || v.Name || 'Volunteer',
          phone: v.phoneNumber || v.PhoneNumber || '',
          location: v.location || v.Location || ''
        }));
      setVerifiedVolunteers(verified);
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load shelters from database.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const loadShelterDetails = useCallback(async (shelterId: string) => {
    setLoadingDetails(true);
    try {
      const [reqsRes, rosterRes] = await Promise.all([
        apiClient(`/api/v1/shelters/${shelterId}/requests`, { method: 'GET' }).catch(() => []),
        apiClient(`/api/v1/shelters/${shelterId}/roster`, { method: 'GET' }).catch(() => null)
      ]);

      const rawReqs = Array.isArray(reqsRes) ? reqsRes : (reqsRes?.data || reqsRes?.items || []);
      setShelterRequests(
        rawReqs.map((r: any) => ({
          id: r.id || r.Id,
          citizenName: r.citizenName || r.CitizenName || r.fullName || 'Citizen',
          phoneNumber: r.phoneNumber || r.PhoneNumber || r.citizenPhoneNumber || '',
          peopleCount: Number(r.peopleCount ?? r.PeopleCount ?? r.affectedPeopleCount ?? 1) || 1,
          notes: r.notes || r.Notes || r.description || '',
          status: r.status || r.Status || 'Pending',
          createdAtUtc: r.createdAtUtc || r.CreatedAtUtc || ''
        }))
      );

      const rosterPayload = rosterRes?.data || rosterRes;
      if (rosterPayload) {
        const rawManager = rosterPayload.manager || rosterPayload.Manager || null;
        const rawCitizens = rosterPayload.citizens || rosterPayload.Citizens || [];
        const rawVolunteers = rosterPayload.volunteers || rosterPayload.Volunteers || [];

        setRoster({
          manager: rawManager ? normalizeRosterMember(rawManager) : null,
          citizens: Array.isArray(rawCitizens) ? rawCitizens.map(normalizeRosterMember) : [],
          volunteers: Array.isArray(rawVolunteers) ? rawVolunteers.map(normalizeRosterMember) : []
        });
      } else {
        setRoster({ manager: null, citizens: [], volunteers: [] });
      }
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadShelters();
  }, [loadShelters]);

  const openShelterDetails = (shelter: Shelter) => {
    if (!canManageShelter(shelter)) {
      addToast({ type: 'error', message: 'You are not authorized to manage this shelter.' });
      return;
    }
    setSelectedShelter(shelter);
    setDetailTab('overview');
    loadShelterDetails(shelter.id);
  };

  const openAllocateModal = (shelter: Shelter) => {
    if (!canManageShelter(shelter)) {
      addToast({ type: 'error', message: 'You are not authorized to allocate people to this shelter.' });
      return;
    }
    setSelectedShelter(shelter);
    setAllocateModal(true);
  };

  const handleVerifyShelterRequest = async (requestId: string, action: 'Approve' | 'Reject') => {
    if (!selectedShelter) return;
    setVerifyingReqId(requestId);
    try {
      await apiClient(`/api/v1/shelters/${selectedShelter.id}/requests/${requestId}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ action })
      });
      addToast({
        type: 'success',
        message: action === 'Approve' ? 'Citizen request approved and assigned to shelter.' : 'Citizen request rejected.'
      });
      await Promise.all([loadShelterDetails(selectedShelter.id), loadShelters()]);
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || `Failed to ${action.toLowerCase()} request.` });
    } finally {
      setVerifyingReqId(null);
    }
  };

  const handleAddShelter = async () => {
    const cap = parseInt(addForm.capacity, 10);
    const lat = parseFloat(addForm.latitude);
    const lng = parseFloat(addForm.longitude);

    if (!addForm.name.trim() || isNaN(lat) || isNaN(lng) || isNaN(cap) || cap <= 0) {
      addToast({ type: 'error', message: 'Valid Name, Coordinates, and Capacity (> 0) are required.' });
      return;
    }

    if (!addForm.managerVolunteerId) {
      addToast({ type: 'error', message: 'Please assign a verified volunteer as the Shelter Manager.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/api/v1/shelters', {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name.trim(),
          location: addForm.location.trim() || addForm.district || 'Sri Lanka',
          district: addForm.district || 'Colombo',
          latitude: lat,
          longitude: lng,
          capacity: cap,
          contact: addForm.contact.trim(),
          organization: addForm.org.trim(),
          managerVolunteerId: addForm.managerVolunteerId,
          accessible: addForm.accessible,
          facilities: addForm.facilities.split(',').map(f => f.trim()).filter(Boolean)
        })
      });

      addToast({ type: 'success', message: 'Shelter created and Shelter Manager assigned!' });
      setAddModal(false);
      setAddForm({
        name: '', location: '', district: '', latitude: '', longitude: '',
        capacity: '', contact: '', org: '', managerVolunteerId: '', accessible: false, facilities: ''
      });
      loadShelters();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to add shelter.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectRequestForAllocation = (reqId: string) => {
    const found = pendingRequests.find(r => r.id === reqId);
    if (found) {
      setAllocForm(f => ({
        ...f,
        requestId: reqId,
        name: found.citizenName,
        count: String(found.affectedCount)
      }));
    } else {
      setAllocForm(f => ({ ...f, requestId: '' }));
    }
  };

  const handleAllocate = async () => {
    if (!selectedShelter) return;
    if (!canManageShelter(selectedShelter)) {
      addToast({ type: 'error', message: 'You are not authorized to manage this shelter.' });
      return;
    }

    const count = parseInt(allocForm.count, 10);
    const spaces = Math.max(0, selectedShelter.capacity - selectedShelter.occupied);

    if (isNaN(count) || count <= 0) {
      addToast({ type: 'error', message: 'Enter a valid number of people (at least 1).' });
      return;
    }

    if (count > spaces) {
      addToast({ type: 'error', message: `Only ${spaces} spaces available.` });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = { count };
      if (allocForm.requestId) payload.requestId = allocForm.requestId;

      await apiClient(`/api/v1/shelters/${selectedShelter.id}/allocate`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      addToast({
        type: 'success',
        message: `${count} person(s)${allocForm.name ? ` (${allocForm.name})` : ''} allocated to ${selectedShelter.name}.`
      });
      setAllocateModal(false);
      setSelectedShelter(null);
      setAllocForm({ requestId: '', name: '', count: '1', needs: '' });
      loadShelters();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to allocate people.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDirectionsUrl = (s: Shelter) => {
    if (s.latitude !== null && s.longitude !== null && (s.latitude !== 0 || s.longitude !== 0)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location || s.name)}`;
  };

  // Scope visible shelters to only the assigned manager's shelter(s) when logged in as ShelterAdmin
  const visibleShelters = isShelterManager
    ? shelters.filter(s => canManageShelter(s))
    : shelters;

  const filtered = visibleShelters.filter(s => {
    const matchesTab = activeTab === 'all' || s.status === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.district || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const totalCapacity = visibleShelters.reduce((a, s) => a + s.capacity, 0);
  const totalOccupied = visibleShelters.reduce((a, s) => a + s.occupied, 0);
  const openCount = visibleShelters.filter(s => s.status === 'open').length;
  const fullCount = visibleShelters.filter(s => s.status === 'full').length;
  const closedCount = visibleShelters.filter(s => s.status === 'closed').length;
  const availableSpaces = visibleShelters
    .filter(s => s.status === 'open')
    .reduce((a, s) => a + Math.max(0, s.capacity - s.occupied), 0);

  const isAwaitingVerification = (status: string) =>
    ['pending', 'submitted', 'underreview'].includes(String(status || '').toLowerCase());

  const pendingShelterReqs = shelterRequests.filter(r => isAwaitingVerification(r.status));

  const statusColor = (s: Shelter) => {
    const pct = s.capacity > 0 ? s.occupied / s.capacity : 0;
    if (s.status === 'closed') return '#5A7290';
    if (pct >= 1) return '#DC2626';
    if (pct >= 0.85) return '#EA580C';
    if (pct >= 0.6) return '#CA8A04';
    return '#16A34A';
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title={isShelterManager ? 'Shelter Manager Portal' : 'Shelter Management'}
          subtitle={
            isShelterManager
              ? 'Verify incoming citizen requests, manage occupancy, and view your shelter roster'
              : 'Manage shelter capacity, assign managers, and oversee citizen allocations'
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadShelters} disabled={isLoading}>
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
              </Button>
              {!isShelterManager && (
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddModal(true)}>
                  Add Shelter
                </Button>
              )}
            </div>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label={isShelterManager ? 'My Shelters' : 'Total Shelters'}
            value={visibleShelters.length.toString()}
            icon={<Home size={20} />}
            color="#1A3A6B"
          />
          <KpiCard label="Open & Active" value={openCount.toString()} icon={<Check size={20} />} color="#16A34A" />
          <KpiCard
            label="Total Occupancy"
            value={totalCapacity > 0 ? `${Math.round((totalOccupied / totalCapacity) * 100)}%` : '0%'}
            icon={<Users size={20} />}
            color="#EA580C"
          />
          <KpiCard label="Available Spaces" value={availableSpaces.toLocaleString()} icon={<Home size={20} />} color="#6D28D9" />
        </div>

        {/* Search + filter */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <SearchInput
            placeholder="Search shelters by name or district..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            className="w-72"
          />
          <Tabs
            tabs={[
              { id: 'all', label: `All (${visibleShelters.length})` },
              { id: 'open', label: `Open (${openCount})` },
              { id: 'full', label: `Full (${fullCount})` },
              { id: 'closed', label: `Closed (${closedCount})` },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Shelter cards */}
        {isLoading ? (
          <div className="py-12 text-center text-[#5A7290]">Loading shelters...</div>
        ) : visibleShelters.length === 0 && isShelterManager ? (
          <div className="py-12 text-center text-[#5A7290]">No shelters are currently assigned to you.</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#5A7290]">No shelters found matching your criteria.</div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(shelter => {
              const pct = shelter.capacity > 0 ? (shelter.occupied / shelter.capacity) * 100 : 0;
              const available = Math.max(0, shelter.capacity - shelter.occupied);

              return (
                <Card
                  key={shelter.id}
                  hover
                  className="cursor-pointer animate-fade-in"
                  onClick={() => openShelterDetails(shelter)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#0D1B2E] text-sm font-[Outfit] truncate">{shelter.name}</h3>
                        {isShelterManager && (
                          <Badge variant="primary" className="text-[10px]">Your Shelter</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#5A7290] flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {shelter.district}
                      </p>
                      {shelter.managerName && (
                        <p className="text-xs text-[#1A3A6B] flex items-center gap-1 mt-1 font-medium">
                          <UserCheck size={11} /> Manager: {shelter.managerName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Badge variant={shelter.status === 'open' ? 'success' : shelter.status === 'full' ? 'danger' : 'neutral'}>
                        {shelter.status.charAt(0).toUpperCase() + shelter.status.slice(1)}
                      </Badge>
                      {shelter.accessible && (
                        <span title="Wheelchair accessible">
                          <Accessibility size={14} className="text-[#1D4ED8]" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Occupancy */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-[#5A7290] mb-1.5">
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {shelter.occupied}/{shelter.capacity}
                      </span>
                      <span style={{ color: statusColor(shelter) }} className="font-medium">
                        {shelter.status === 'closed'
                          ? 'Closed'
                          : available > 0
                          ? `${available} spaces available`
                          : 'No spaces'}
                      </span>
                    </div>
                    <div className="h-2 bg-[#E8EDF3] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: statusColor(shelter) }}
                      />
                    </div>
                  </div>

                  {/* Facilities */}
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                    {shelter.facilities.slice(0, 4).map(f => (
                      <span key={f} className="text-xs bg-[#F0F4F8] text-[#5A7290] px-2 py-0.5 rounded-full">
                        {facilityIcons[f] || ''} {f}
                      </span>
                    ))}
                    {shelter.facilities.length > 4 && (
                      <span className="text-xs text-[#5A7290]">+{shelter.facilities.length - 4}</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-[#E8EDF3]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={e => {
                        e.stopPropagation();
                        openShelterDetails(shelter);
                      }}
                    >
                      Manage / Roster
                    </Button>
                    {shelter.status === 'open' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={e => {
                          e.stopPropagation();
                          openAllocateModal(shelter);
                        }}
                      >
                        Allocate
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Shelter Detail & Manager Panel Modal */}
      <Modal
        open={!!selectedShelter && !allocateModal}
        onClose={() => setSelectedShelter(null)}
        title={selectedShelter?.name || ''}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedShelter(null)}>Close</Button>
            {selectedShelter && (
              <a
                href={getDirectionsUrl(selectedShelter)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-[#CBD8E6] text-[#1A3A6B] hover:bg-[#F0F4F8] transition-colors"
              >
                <Navigation size={14} /> Open in Maps <ExternalLink size={12} />
              </a>
            )}
            {selectedShelter?.status === 'open' && canManageShelter(selectedShelter) && (
              <Button onClick={() => setAllocateModal(true)}>Allocate People</Button>
            )}
          </>
        }
      >
        {selectedShelter && (
          <div className="space-y-4">
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'requests', label: `Requests (${pendingShelterReqs.length})` },
                { id: 'citizens', label: `Citizens (${roster.citizens.length})` },
                { id: 'volunteers', label: `Volunteers (${roster.volunteers.length})` },
              ]}
              active={detailTab}
              onChange={setDetailTab}
            />

            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#5A7290]">Location</p>
                    <p className="text-sm font-medium mt-0.5">{selectedShelter.location || selectedShelter.district}</p>
                    {selectedShelter.latitude !== null && selectedShelter.longitude !== null && (
                      <p className="text-[11px] font-mono text-[#5A7290] mt-0.5">
                        {selectedShelter.latitude.toFixed(4)}, {selectedShelter.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#5A7290]">Shelter Manager</p>
                    <p className="text-sm font-medium mt-0.5 text-[#1A3A6B]">
                      {roster.manager?.fullName || selectedShelter.managerName || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5A7290]">Contact</p>
                    {selectedShelter.contact ? (
                      <a
                        href={`tel:${selectedShelter.contact}`}
                        className="text-sm font-medium text-[#1A3A6B] hover:underline mt-0.5 inline-flex items-center gap-1"
                      >
                        <Phone size={13} /> {selectedShelter.contact}
                      </a>
                    ) : (
                      <p className="text-sm font-medium mt-0.5 text-[#5A7290]">Not provided</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#5A7290]">Accessibility</p>
                    <p className="text-sm font-medium mt-0.5">
                      {selectedShelter.accessible ? '✓ Wheelchair accessible' : '✗ Not fully accessible'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[#5A7290] mb-2">Occupancy</p>
                  <Progress
                    value={selectedShelter.occupied}
                    max={Math.max(selectedShelter.capacity, 1)}
                    label={`${selectedShelter.occupied} / ${selectedShelter.capacity} people`}
                  />
                </div>

                {selectedShelter.facilities.length > 0 && (
                  <div>
                    <p className="text-xs text-[#5A7290] mb-2">Facilities</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedShelter.facilities.map(f => (
                        <span key={f} className="bg-[#EFF6FF] text-[#1D4ED8] text-xs px-3 py-1 rounded-full">
                          {facilityIcons[f] || ''} {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'requests' && (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {loadingDetails ? (
                  <p className="text-sm text-center text-[#5A7290] py-6">Loading shelter requests...</p>
                ) : shelterRequests.length === 0 ? (
                  <p className="text-sm text-center text-[#5A7290] py-6">No citizen shelter requests yet.</p>
                ) : (
                  shelterRequests.map(req => {
                    const isPending = isAwaitingVerification(req.status);
                    return (
                      <div key={req.id} className="p-3.5 bg-[#F8FAFC] border border-[#CBD8E6] rounded-xl flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-[#0D1B2E]">{req.citizenName}</p>
                            <Badge variant={isPending ? 'warning' : req.status.toLowerCase() === 'rejected' ? 'danger' : 'success'}>
                              {req.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#5A7290]">
                            <Users size={11} className="inline mr-1" /> {req.peopleCount} person(s)
                            {req.phoneNumber && (
                              <> · <a href={`tel:${req.phoneNumber}`} className="text-[#1A3A6B] hover:underline">{req.phoneNumber}</a></>
                            )}
                          </p>
                          {req.notes && <p className="text-xs text-[#5A7290] italic">"{req.notes}"</p>}
                        </div>
                        {isPending && (
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[#DC2626] border-[#DC2626]"
                              disabled={verifyingReqId === req.id}
                              onClick={() => handleVerifyShelterRequest(req.id, 'Reject')}
                              icon={<XCircle size={13} />}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#16A34A] hover:bg-[#15803D]"
                              disabled={verifyingReqId === req.id}
                              onClick={() => handleVerifyShelterRequest(req.id, 'Approve')}
                              icon={<CheckCircle size={13} />}
                            >
                              Verify
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {detailTab === 'citizens' && (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
                {loadingDetails ? (
                  <p className="text-sm text-center text-[#5A7290] py-6">Loading assigned citizens...</p>
                ) : roster.citizens.length === 0 ? (
                  <p className="text-sm text-center text-[#5A7290] py-6">No citizens currently assigned to this shelter.</p>
                ) : (
                  roster.citizens.map((c, idx) => (
                    <div key={c.id || idx} className="p-3 bg-[#F8FAFC] border border-[#E8EDF3] rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#0D1B2E] truncate">{c.fullName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#5A7290] mt-0.5">
                          {c.phoneNumber && (
                            <a href={`tel:${c.phoneNumber}`} className="text-[#1A3A6B] hover:underline inline-flex items-center gap-1">
                              <Phone size={11} /> {c.phoneNumber}
                            </a>
                          )}
                          {c.email && <span className="truncate">{c.phoneNumber ? '• ' : ''}{c.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {typeof c.peopleCount === 'number' && (
                          <Badge variant="primary">{c.peopleCount} {c.peopleCount === 1 ? 'person' : 'people'}</Badge>
                        )}
                        <Badge variant="success">{c.status || 'Assigned'}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'volunteers' && (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
                {roster.manager && (
                  <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#0D1B2E] flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#1A3A6B] shrink-0" /> {roster.manager.fullName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#5A7290] mt-0.5">
                        {roster.manager.phoneNumber && (
                          <a href={`tel:${roster.manager.phoneNumber}`} className="text-[#1A3A6B] hover:underline inline-flex items-center gap-1">
                            <Phone size={11} /> {roster.manager.phoneNumber}
                          </a>
                        )}
                        {roster.manager.email && <span className="truncate">{roster.manager.phoneNumber ? '• ' : ''}{roster.manager.email}</span>}
                      </div>
                    </div>
                    <Badge variant="primary">Shelter Manager</Badge>
                  </div>
                )}

                {loadingDetails ? (
                  <p className="text-sm text-center text-[#5A7290] py-6">Loading assigned volunteers...</p>
                ) : roster.volunteers.length === 0 ? (
                  <p className="text-sm text-center text-[#5A7290] py-6">No additional field volunteers dispatched to this shelter.</p>
                ) : (
                  roster.volunteers.map((v, idx) => (
                    <div key={v.id || idx} className="p-3 bg-[#F8FAFC] border border-[#E8EDF3] rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#0D1B2E] truncate">{v.fullName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#5A7290] mt-0.5">
                          {v.phoneNumber && (
                            <a href={`tel:${v.phoneNumber}`} className="text-[#1A3A6B] hover:underline inline-flex items-center gap-1">
                              <Phone size={11} /> {v.phoneNumber}
                            </a>
                          )}
                          {v.email && <span className="truncate">{v.phoneNumber ? '• ' : ''}{v.email}</span>}
                        </div>
                        {v.skills && v.skills.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {v.skills.map(sk => <Badge key={sk} variant="neutral" className="text-[10px]">{sk}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {v.role && <Badge variant="neutral">{v.role}</Badge>}
                        <Badge variant="success">{v.status || 'Active'}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Allocate Modal */}
      <Modal
        open={allocateModal}
        onClose={() => {
          setAllocateModal(false);
          setAllocForm({ requestId: '', name: '', count: '1', needs: '' });
        }}
        title={`Allocate to ${selectedShelter?.name || ''}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAllocateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAllocate} disabled={isSubmitting}>
              {isSubmitting ? 'Allocating...' : 'Confirm Allocation'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedShelter && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-sm">
              <p className="font-medium text-[#166534]">
                Available spaces: {Math.max(0, selectedShelter.capacity - selectedShelter.occupied)}
              </p>
              {Math.max(0, selectedShelter.capacity - selectedShelter.occupied) < 10 && (
                <p className="text-xs text-[#DC2626] mt-0.5">⚠ Limited availability</p>
              )}
            </div>
          )}

          {pendingRequests.length > 0 && (
            <Select
              label="Link to Citizen Assistance Request (optional)"
              value={allocForm.requestId}
              onChange={(e: any) => handleSelectRequestForAllocation(e.target.value)}
              options={[
                { value: '', label: '-- Walk-in / Manual Allocation --' },
                ...pendingRequests.map(r => ({
                  value: r.id,
                  label: `${r.citizenName} (${r.affectedCount} ppl) — ${r.category}`
                }))
              ]}
            />
          )}

          <Input
            label="Name / Family reference"
            placeholder="Full name or family ID"
            value={allocForm.name}
            onChange={(e: any) => setAllocForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Number of people"
            type="number"
            min="1"
            max={selectedShelter ? Math.max(1, selectedShelter.capacity - selectedShelter.occupied) : 1}
            value={allocForm.count}
            onChange={(e: any) => setAllocForm(f => ({ ...f, count: e.target.value }))}
          />
          <Select
            label="Special needs"
            value={allocForm.needs}
            onChange={(e: any) => setAllocForm(f => ({ ...f, needs: e.target.value }))}
            options={[
              { value: '', label: 'None' },
              { value: 'medical', label: 'Medical assistance required' },
              { value: 'wheelchair', label: 'Wheelchair accessible room required' },
              { value: 'infant', label: 'Infant / young child' },
              { value: 'elderly', label: 'Elderly person' },
            ]}
          />
        </div>
      </Modal>

      {/* Add Shelter Modal */}
      <Modal
        open={addModal}
        onClose={() => {
          setAddModal(false);
        }}
        title="Add New Shelter"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAddModal(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddShelter} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Shelter'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Shelter name"
            placeholder="Official name"
            value={addForm.name}
            onChange={(e: any) => setAddForm(f => ({ ...f, name: e.target.value }))}
          />

          {/* Required Shelter Manager Assignment */}
          <Select
            label="Assign Shelter Manager (Verified Volunteer) *"
            value={addForm.managerVolunteerId}
            onChange={(e: any) => setAddForm(f => ({ ...f, managerVolunteerId: e.target.value }))}
            options={[
              {
                value: '',
                label: verifiedVolunteers.length === 0
                  ? 'No verified volunteers available'
                  : '-- Select a Volunteer to upgrade as Shelter Manager --'
              },
              ...verifiedVolunteers.map(v => ({
                value: v.id,
                label: `${v.name}${v.location ? ` (${v.location})` : ''}${v.phone ? ` · ${v.phone}` : ''}`
              }))
            ]}
          />

          {/* OpenStreetMap Address Search + GPS */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#5A7290]">Address Search (OpenStreetMap)</label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocatingGps}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1A3A6B] hover:text-[#112A50] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-2 py-0.5 rounded-md cursor-pointer disabled:opacity-50"
              >
                {isLocatingGps ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                {isLocatingGps ? 'Locating...' : 'Use My GPS'}
              </button>
            </div>
            <LocationAutocomplete
              value={addForm.location}
              placeholder="Start typing an address or landmark..."
              onChange={value => setAddForm(form => ({
                ...form,
                location: value,
                latitude: '',
                longitude: '',
              }))}
              onSelect={handleSelectLocation}
            />
          </div>

          <Select
            label="District"
            value={addForm.district}
            onChange={(e: any) => setAddForm(f => ({ ...f, district: e.target.value }))}
            options={[
              { value: '', label: 'Select district...' },
              ...SRI_LANKA_DISTRICTS.map(d => ({ value: d, label: d }))
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude (required)"
              placeholder="e.g. 7.0792"
              type="number"
              step="any"
              value={addForm.latitude}
              onChange={(e: any) => setAddForm(f => ({ ...f, latitude: e.target.value }))}
            />
            <Input
              label="Longitude (required)"
              placeholder="e.g. 79.8899"
              type="number"
              step="any"
              value={addForm.longitude}
              onChange={(e: any) => setAddForm(f => ({ ...f, longitude: e.target.value }))}
            />
          </div>

          <Input
            label="Total capacity (persons)"
            type="number"
            min="1"
            value={addForm.capacity}
            onChange={(e: any) => setAddForm(f => ({ ...f, capacity: e.target.value }))}
          />
          <Input
            label="Contact number"
            type="tel"
            value={addForm.contact}
            onChange={(e: any) => setAddForm(f => ({ ...f, contact: e.target.value }))}
          />
          <Input
            label="Managing organisation"
            value={addForm.org}
            onChange={(e: any) => setAddForm(f => ({ ...f, org: e.target.value }))}
          />

          <Input
            label="Facilities (comma separated)"
            placeholder="Food, Water, Medical, Toilets"
            value={addForm.facilities}
            onChange={(e: any) => setAddForm(f => ({ ...f, facilities: e.target.value }))}
          />

          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#0D1B2E]">
            <input
              type="checkbox"
              checked={addForm.accessible}
              onChange={(e) => setAddForm(f => ({ ...f, accessible: e.target.checked }))}
              className="rounded border-[#CBD8E6] text-[#1A3A6B]"
            />
            Wheelchair / accessibility accessible
          </label>
        </div>
      </Modal>
    </Layout>
  );
}