import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, MapPin, Users, PackageOpen, Activity, Loader2 } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, Badge, Button, Modal, Input, Select, SearchInput } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';

interface Crisis {
  id: string;
  title: string;
  type: string;
  status: string;
  location: string;
  affectedCount: number;
  requestsCount: number;
}

export function CrisisManagement() {
  const { addToast } = useAppContext();
  const [crises, setCrises] = useState<Crisis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'Flood',
    location: '',
    latitude: 0,
    longitude: 0,
    status: 'Active',
    affectedCount: '0'
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
    const address = place.display_name;
    const lat = parseFloat(place.lat) || 0;
    const lon = parseFloat(place.lon) || 0;
    
    setForm(f => ({ ...f, location: address, latitude: lat, longitude: lon }));
    setLocationSearch(address);
    setShowLocationDropdown(false);
  };

  const loadCrises = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/v1/crises', { method: 'GET' });
      const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
      
      setCrises(data.map((c: any) => ({
        id: c.id || c.Id,
        title: c.title || c.Title || 'Unknown Crisis',
        type: c.type || c.Type || 'Other',
        status: c.status || c.Status || 'Monitoring',
        location: c.location || c.Location || 'Unknown Location',
        affectedCount: c.affectedCount || c.AffectedCount || 0,
        requestsCount: c.requestsCount || c.RequestsCount || 0,
      })));
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load crisis events.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCrises();
  }, [loadCrises]);

  const handleCreateCrisis = async () => {
    if (!form.title || !form.location) {
      addToast({ type: 'error', message: 'Title and location are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/api/v1/crises', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          status: form.status,
          affectedCount: parseInt(form.affectedCount, 10) || 0
        })
      });
      
      addToast({ type: 'success', message: 'Crisis event created successfully.' });
      setIsModalOpen(false);
      setForm({ title: '', type: 'Flood', location: '', latitude: 0, longitude: 0, status: 'Active', affectedCount: '0' });
      setLocationSearch('');
      loadCrises(); 
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to create crisis event.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCrises = crises.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  const getBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flood': return 'danger';
      case 'landslide': return 'warning';
      case 'storm': return 'primary';
      default: return 'neutral';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-red-600 bg-red-50';
      case 'monitoring': return 'text-amber-600 bg-amber-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Crisis Management"
          subtitle="Monitor and coordinate active crisis events"
          actions={
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
              New Crisis Event
            </Button>
          }
        />

        <div className="mb-6 flex">
          <SearchInput 
            placeholder="Search crises by name or location..." 
            value={search} 
            onChange={(e: any) => setSearch(e.target.value)} 
            className="w-full max-w-md bg-white" 
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#5A7290] flex flex-col items-center gap-3">
            <Activity className="animate-spin text-[#1A3A6B]" size={24} />
            <p>Syncing live crisis data...</p>
          </div>
        ) : filteredCrises.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-xl border border-[#CBD8E6]">
            <AlertTriangle className="mx-auto text-[#CBD8E6] mb-3" size={32} />
            <p className="text-[#5A7290] font-medium">No crisis events found.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCrises.map(crisis => (
              <Card key={crisis.id} hover padding="p-0" className="flex flex-col">
                <div className="p-5 border-b border-[#E8EDF3] flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={getBadgeVariant(crisis.type)}>{crisis.type}</Badge>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md capitalize ${getStatusColor(crisis.status)}`}>
                      {crisis.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0D1B2E] font-[Outfit] mb-2">{crisis.title}</h3>
                  <p className="text-sm text-[#5A7290] flex items-center gap-1.5">
                    <MapPin size={14} className="shrink-0" />
                    {crisis.location}
                  </p>
                </div>
                <div className="bg-[#F8FAFC] p-4 flex gap-4 rounded-b-xl border-t border-[#E8EDF3]">
                  <div className="flex-1 bg-white p-3 rounded-lg border border-[#E8EDF3] shadow-sm">
                    <p className="text-xs text-[#5A7290] mb-1 flex items-center gap-1"><Users size={12}/> Affected</p>
                    <p className="font-bold text-[#0D1B2E] text-lg font-[Outfit]">{crisis.affectedCount.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-lg border border-[#E8EDF3] shadow-sm">
                    <p className="text-xs text-[#5A7290] mb-1 flex items-center gap-1"><PackageOpen size={12}/> Requests</p>
                    <p className="font-bold text-[#0D1B2E] text-lg font-[Outfit]">{crisis.requestsCount.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Crisis Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setLocationSearch('');
        }}
        title="Declare New Crisis Event"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false);
              setLocationSearch('');
            }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreateCrisis} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Crisis Title" 
            placeholder="e.g. Kelani Basin Flood 2024" 
            value={form.title} 
            onChange={(e: any) => setForm(f => ({ ...f, title: e.target.value }))} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Crisis Type" 
              value={form.type} 
              onChange={(e: any) => setForm(f => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'Flood', label: 'Flood' },
                { value: 'Landslide', label: 'Landslide' },
                { value: 'Storm', label: 'Storm Surge' },
                { value: 'Tsunami', label: 'Tsunami' },
                { value: 'Fire', label: 'Wildfire' },
                { value: 'Other', label: 'Other' }
              ]} 
            />
            <Select 
              label="Initial Status" 
              value={form.status} 
              onChange={(e: any) => setForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'Active', label: 'Active (Emergency)' },
                { value: 'Monitoring', label: 'Monitoring (Warning)' },
                { value: 'Resolved', label: 'Resolved' }
              ]} 
            />
          </div>

          {/* OpenStreetMap Address Search Field */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-[#5A7290]">Affected Location Search</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Start typing the affected district or town..." 
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

          <Input 
            label="Estimated Affected Population" 
            type="number" 
            min="0"
            value={form.affectedCount} 
            onChange={(e: any) => setForm(f => ({ ...f, affectedCount: e.target.value }))} 
          />
        </div>
      </Modal>
    </Layout>
  );
}