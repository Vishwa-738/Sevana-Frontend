import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Plus, MapPin, Users, Check, AlertTriangle, Accessibility, Loader2 } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Modal, Input, Select, Progress, Tabs, SearchInput } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';

interface Shelter {
  id: string;
  name: string;
  location: string;
  district: string;
  capacity: number;
  occupied: number;
  status: 'open' | 'full' | 'closed';
  facilities: string[];
  accessible: boolean;
  contact: string;
  services: string[];
  org: string;
}

const facilityIcons: Record<string, string> = {
  Food: '🍚', Water: '💧', Medical: '🏥', Toilets: '🚽', Showers: '🚿', Security: '🛡️', 'Child care': '👶',
};

export function ShelterManagement() {
  const { addToast } = useAppContext();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [allocateModal, setAllocateModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  
  const [allocForm, setAllocForm] = useState({ name: '', count: '1', needs: '' });
  const [addForm, setAddForm] = useState({
    name: '', location: '', district: '', latitude: '', longitude: '',
    capacity: '', contact: '', org: '', accessible: false, facilities: ''
  });

  // OpenStreetMap (Nominatim) Autocomplete State
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Debounced search for OpenStreetMap
  useEffect(() => {
    if (locationSearch.length < 3) {
      setLocationResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        // Fetches locations, restricting to Sri Lanka (countrycodes=lk)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&addressdetails=1&countrycodes=lk&limit=5`);
        const data = await res.json();
        setLocationResults(data);
        setShowLocationDropdown(true);
      } catch (err) {
        console.error('Location search failed', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [locationSearch]);

  const handleSelectLocation = (place: any) => {
    const lat = place.lat;
    const lon = place.lon;
    const address = place.display_name;

    // Attempt to auto-extract the district from OpenStreetMap address details
    const ad = place.address || {};
    let district = ad.state_district || ad.county || ad.city || '';
    if (district) {
      district = district.replace(' District', '').trim();
    }

    setAddForm(f => ({
      ...f,
      location: address,
      latitude: lat,
      longitude: lon,
      district: district || f.district
    }));

    setLocationSearch(address);
    setShowLocationDropdown(false);
  };

  const loadShelters = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/v1/shelters', { method: 'GET' });
      const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
      
      setShelters(data.map((s: any) => ({
        id: s.id || s.Id,
        name: s.name || s.Name,
        location: s.location || s.Location,
        district: s.district || s.District,
        capacity: s.capacity || s.Capacity || 0,
        occupied: s.occupiedSpaces || s.OccupiedSpaces || s.occupied || 0,
        status: (s.status || s.Status || 'open').toLowerCase(),
        facilities: Array.isArray(s.facilities) ? s.facilities : (s.Facilities || []),
        accessible: !!(s.accessible || s.Accessible || s.accessibility || s.Accessibility),
        contact: s.contactNumber || s.ContactNumber || s.contact || s.Contact || '',
        services: Array.isArray(s.services) ? s.services : (s.Services || []),
        org: s.managingOrganization || s.ManagingOrganization || s.organization || s.org || ''
      })));
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load shelters from database.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadShelters();
  }, [loadShelters]);

  const handleAddShelter = async () => {
    if (!addForm.name || !addForm.latitude || !addForm.longitude || !addForm.capacity) {
      addToast({ type: 'error', message: 'Name, Coordinates, and Capacity are required.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient('/api/v1/shelters', {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name,
          location: addForm.location,
          district: addForm.district,
          latitude: parseFloat(addForm.latitude) || 0,
          longitude: parseFloat(addForm.longitude) || 0,
          capacity: parseInt(addForm.capacity, 10) || 0,
          contact: addForm.contact,
          organization: addForm.org,
          accessible: addForm.accessible,
          facilities: addForm.facilities.split(',').map(f => f.trim()).filter(f => f)
        })
      });
      addToast({ type: 'success', message: 'Shelter added successfully.' });
      setAddModal(false);
      setAddForm({ name: '', location: '', district: '', latitude: '', longitude: '', capacity: '', contact: '', org: '', accessible: false, facilities: '' });
      setLocationSearch('');
      loadShelters(); 
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to add shelter.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedShelter) return;
    const count = parseInt(allocForm.count, 10);
    const spaces = selectedShelter.capacity - selectedShelter.occupied;
    
    if (count > spaces) {
      addToast({ type: 'error', message: `Only ${spaces} spaces available.` });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/shelters/${selectedShelter.id}/allocate`, {
        method: 'PUT',
        body: JSON.stringify({ count })
      });
      addToast({ type: 'success', message: `${count} person(s) allocated to ${selectedShelter.name}` });
      setAllocateModal(false);
      setSelectedShelter(null);
      setAllocForm({ name: '', count: '1', needs: '' });
      loadShelters();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to allocate people.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = shelters.filter(s =>
    (activeTab === 'all' || s.status === activeTab) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.district.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCapacity = shelters.reduce((a, s) => a + s.capacity, 0);
  const totalOccupied = shelters.reduce((a, s) => a + s.occupied, 0);
  const openShelters = shelters.filter(s => s.status === 'open').length;
  const availableSpaces = shelters.filter(s => s.status === 'open').reduce((a, s) => a + (s.capacity - s.occupied), 0);

  const statusColor = (s: Shelter) => {
    const pct = s.occupied / s.capacity;
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
          title="Shelter Management"
          subtitle="Manage shelter capacity, occupancy, and allocations"
          actions={
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddModal(true)}>
              Add Shelter
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Shelters" value={shelters.length.toString()} icon={<Home size={20} />} color="#1A3A6B" />
          <KpiCard label="Open & Active" value={openShelters.toString()} icon={<Check size={20} />} color="#16A34A" />
          <KpiCard label="Total Occupancy" value={totalCapacity > 0 ? `${Math.round((totalOccupied / totalCapacity) * 100)}%` : '0%'} icon={<Users size={20} />} color="#EA580C" />
          <KpiCard label="Available Spaces" value={availableSpaces.toString()} icon={<Home size={20} />} color="#6D28D9" />
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-4">
          <SearchInput placeholder="Search shelters..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Tabs
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'open', label: 'Open' },
              { id: 'full', label: 'Full' },
              { id: 'closed', label: 'Closed' },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Shelter cards */}
        {isLoading ? (
          <div className="py-12 text-center text-[#5A7290]">Loading shelters...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#5A7290]">No shelters found matching your criteria.</div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(shelter => {
              const pct = shelter.capacity > 0 ? (shelter.occupied / shelter.capacity) * 100 : 0;
              const available = shelter.capacity - shelter.occupied;
              return (
                <Card
                  key={shelter.id}
                  hover
                  className="cursor-pointer animate-fade-in"
                  onClick={() => setSelectedShelter(shelter)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0D1B2E] text-sm font-[Outfit] truncate">{shelter.name}</h3>
                      <p className="text-xs text-[#5A7290] flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {shelter.district}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Badge variant={shelter.status === 'open' ? 'success' : shelter.status === 'full' ? 'danger' : 'neutral'}>
                        {shelter.status.charAt(0).toUpperCase() + shelter.status.slice(1)}
                      </Badge>
                      {shelter.accessible && <span title="Wheelchair accessible"><Accessibility size={14} className="text-[#1D4ED8]" /></span>}
                    </div>
                  </div>

                  {/* Occupancy */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-[#5A7290] mb-1.5">
                      <span className="flex items-center gap-1"><Users size={11} /> {shelter.occupied}/{shelter.capacity}</span>
                      <span style={{ color: statusColor(shelter) }} className="font-medium">
                        {shelter.status === 'closed' ? 'Closed' : available > 0 ? `${available} spaces available` : 'No spaces'}
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
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {shelter.facilities.slice(0, 4).map(f => (
                      <span key={f} className="text-xs bg-[#F0F4F8] text-[#5A7290] px-2 py-0.5 rounded-full">{facilityIcons[f] || ''} {f}</span>
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
                      onClick={e => { e.stopPropagation(); setSelectedShelter(shelter); }}
                    >
                      View Details
                    </Button>
                    {shelter.status === 'open' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={e => { e.stopPropagation(); setSelectedShelter(shelter); setAllocateModal(true); }}
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

      {/* Shelter Detail Modal */}
      <Modal
        open={!!selectedShelter && !allocateModal}
        onClose={() => setSelectedShelter(null)}
        title={selectedShelter?.name || ''}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedShelter(null)}>Close</Button>
            {selectedShelter?.status === 'open' && (
              <Button onClick={() => setAllocateModal(true)}>Allocate People</Button>
            )}
          </>
        }
      >
        {selectedShelter && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#5A7290]">Location</p>
                <p className="text-sm font-medium mt-0.5">{selectedShelter.location}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A7290]">Organisation</p>
                <p className="text-sm font-medium mt-0.5">{selectedShelter.org || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A7290]">Contact</p>
                <p className="text-sm font-medium mt-0.5">{selectedShelter.contact || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A7290]">Accessibility</p>
                <p className="text-sm font-medium mt-0.5">{selectedShelter.accessible ? '✓ Wheelchair accessible' : '✗ Not fully accessible'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#5A7290] mb-2">Occupancy</p>
              <Progress value={selectedShelter.occupied} max={selectedShelter.capacity} label={`${selectedShelter.occupied} / ${selectedShelter.capacity} people`} />
            </div>
            {selectedShelter.facilities.length > 0 && (
              <div>
                <p className="text-xs text-[#5A7290] mb-2">Facilities</p>
                <div className="flex flex-wrap gap-2">
                  {selectedShelter.facilities.map(f => (
                    <span key={f} className="bg-[#EFF6FF] text-[#1D4ED8] text-xs px-3 py-1 rounded-full">{facilityIcons[f] || ''} {f}</span>
                  ))}
                </div>
              </div>
            )}
            {selectedShelter.services.length > 0 && (
              <div>
                <p className="text-xs text-[#5A7290] mb-2">Services</p>
                <ul className="space-y-1">
                  {selectedShelter.services.map(s => (
                    <li key={s} className="flex items-center gap-2 text-sm text-[#0D1B2E]">
                      <Check size={14} className="text-[#16A34A]" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Allocate Modal */}
      <Modal
        open={allocateModal}
        onClose={() => { setAllocateModal(false); setAllocForm({ name: '', count: '1', needs: '' }); }}
        title={`Allocate to ${selectedShelter?.name}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAllocateModal(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={isSubmitting}>
              {isSubmitting ? 'Allocating...' : 'Confirm Allocation'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedShelter && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-sm">
              <p className="font-medium text-[#166534]">Available spaces: {selectedShelter.capacity - selectedShelter.occupied}</p>
              {(selectedShelter.capacity - selectedShelter.occupied) < 10 && (
                <p className="text-xs text-[#DC2626] mt-0.5">⚠ Limited availability</p>
              )}
            </div>
          )}
          <Input label="Name / Family reference" placeholder="Full name or family ID" value={allocForm.name} onChange={e => setAllocForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Number of people" type="number" min="1" max={selectedShelter ? selectedShelter.capacity - selectedShelter.occupied : 1} value={allocForm.count} onChange={e => setAllocForm(f => ({ ...f, count: e.target.value }))} />
          <Select label="Special needs" options={[
            { value: '', label: 'None' },
            { value: 'medical', label: 'Medical assistance required' },
            { value: 'wheelchair', label: 'Wheelchair accessible room required' },
            { value: 'infant', label: 'Infant / young child' },
            { value: 'elderly', label: 'Elderly person' },
          ]} />
        </div>
      </Modal>

      {/* Add Shelter Modal */}
      <Modal
        open={addModal}
        onClose={() => {
          setAddModal(false);
          setLocationSearch('');
        }}
        title="Add New Shelter"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setAddModal(false);
              setLocationSearch('');
            }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddShelter} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Shelter'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Shelter name" placeholder="Official name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
          
          {/* OpenStreetMap Address Search Field */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-[#5A7290]">Address Search (Powered by OpenStreetMap)</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Start typing an address or landmark..." 
                className="w-full px-3 py-2 border border-[#CBD8E6] rounded-lg text-sm focus:outline-none focus:border-[#1D4ED8]"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                onFocus={() => { if (locationResults.length > 0) setShowLocationDropdown(true); }}
              />
              {isSearchingLocation && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-[#5A7290]" />
              )}
            </div>
            
            {showLocationDropdown && locationResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#CBD8E6] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {locationResults.map((result, idx) => (
                  <div 
                    key={idx}
                    className="px-3 py-2 text-sm hover:bg-[#F0F4F8] cursor-pointer border-b border-[#F0F4F8] last:border-0"
                    onClick={() => handleSelectLocation(result)}
                  >
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Select label="District" value={addForm.district} onChange={e => setAddForm(f => ({ ...f, district: e.target.value }))} options={[
            { value: '', label: 'Select district...' },
            { value: 'Colombo', label: 'Colombo' },
            { value: 'Gampaha', label: 'Gampaha' },
            { value: 'Kalutara', label: 'Kalutara' },
            { value: 'Kandy', label: 'Kandy' },
          ]} />
          
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude (required)" placeholder="e.g. 7.0792" type="number" step="any" value={addForm.latitude} onChange={e => setAddForm(f => ({ ...f, latitude: e.target.value }))} />
            <Input label="Longitude (required)" placeholder="e.g. 79.8899" type="number" step="any" value={addForm.longitude} onChange={e => setAddForm(f => ({ ...f, longitude: e.target.value }))} />
          </div>

          <Input label="Total capacity (persons)" type="number" value={addForm.capacity} onChange={e => setAddForm(f => ({ ...f, capacity: e.target.value }))} />
          <Input label="Contact number" type="tel" value={addForm.contact} onChange={e => setAddForm(f => ({ ...f, contact: e.target.value }))} />
          <Input label="Managing organisation" value={addForm.org} onChange={e => setAddForm(f => ({ ...f, org: e.target.value }))} />
          
          <Input label="Facilities (comma separated)" placeholder="Food, Water, Medical, Toilets" value={addForm.facilities} onChange={e => setAddForm(f => ({ ...f, facilities: e.target.value }))} />
          
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#0D1B2E]">
            <input type="checkbox" checked={addForm.accessible} onChange={e => setAddForm(f => ({ ...f, accessible: e.target.checked }))} className="rounded border-[#CBD8E6] text-[#1A3A6B]" />
            Wheelchair / accessibility accessible
          </label>
        </div>
      </Modal>
    </Layout>
  );
}