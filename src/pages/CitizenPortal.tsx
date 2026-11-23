import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, MapPin, Bell, Plus, ChevronRight, CheckCircle,
  Clock, Package, Truck, Star, Upload, ShieldCheck, Phone, HeartHandshake,
  Activity, Navigation, Loader2, ExternalLink
} from 'lucide-react';
import { Button, Card, Badge, StatusBadge, Modal, Input, Textarea, Select, Alert, Progress } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient, getAssignedVolunteerForRequest, getNotifications } from '../api'; 

const requestTimeline = [
  { status: 'Submitted', time: 'Just now', done: true, desc: 'Your request was received and queued for review.' },
  { status: 'Under Review', time: 'Pending', done: false, desc: 'A coordinator is reviewing your request.' },
  { status: 'Assigned', time: 'Pending', done: false, desc: 'Awaiting assignment to an aid unit.' },
];

function MobileNav({ active }: { active: string }) {
  const items = [
    { label: 'Home', icon: <Home size={20} />, path: '/citizen' },
    { label: 'Requests', icon: <Package size={20} />, path: '/citizen/requests' },
    { label: 'Shelters', icon: <MapPin size={20} />, path: '/citizen/shelters' },
    { label: 'Alerts', icon: <Bell size={20} />, path: '/notifications' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBD8E6] flex z-40 lg:hidden">
      {items.map(item => (
        <Link key={item.label} to={item.path}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs ${active === item.label ? 'text-[#1A3A6B]' : 'text-[#5A7290]'}`}>
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function CitizenPortal() {
  const { user, addToast } = useAppContext();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [requestStep, setRequestStep] = useState<'form' | 'ai' | 'confirm' | 'success'>('form');
  const [trackModal, setTrackModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);

  // Live Backend States
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [nearbyShelters, setNearbyShelters] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [aiResult, setAiResult] = useState<any>(null); 
  
  // Responder Details States
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [assignedResponder, setAssignedResponder] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form State (includes accurate latitude & longitude)
  const [form, setForm] = useState({
    category: '',
    urgency: '',
    description: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    affected: '1',
  });

  // OpenStreetMap (Nominatim) Autocomplete & GPS States
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Debounced search for OpenStreetMap (Sri Lanka)
  useEffect(() => {
    if (locationSearch.length < 3 || locationSearch === form.location) {
      setLocationResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&addressdetails=1&countrycodes=lk&limit=5`
        );
        const data = await res.json();
        setLocationResults(data || []);
        setShowLocationDropdown(true);
      } catch (err) {
        console.error('Location search failed', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [locationSearch, form.location]);

  const handleSelectLocation = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const address = place.display_name;

    setForm(f => ({
      ...f,
      location: address,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lon) ? null : lon,
    }));
    setLocationSearch(address);
    setShowLocationDropdown(false);
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

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data?.display_name) {
            resolvedAddress = data.display_name;
          }
        } catch (err) {
          console.warn('Reverse geocoding failed, using coordinates.', err);
        }

        setForm(f => ({
          ...f,
          location: resolvedAddress,
          latitude,
          longitude,
        }));
        setLocationSearch(resolvedAddress);
        setShowLocationDropdown(false);
        setIsLocatingGps(false);
        addToast({ type: 'success', message: 'Exact GPS location captured.' });
      },
      (err) => {
        console.error('GPS Error:', err);
        setIsLocatingGps(false);
        addToast({ type: 'error', message: 'Unable to access GPS. Please search and select your address below.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const mapShelterData = (sheltersArray: any[]) =>
    sheltersArray.map((s: any) => {
      const rawCapacity = s.capacity ?? s.Capacity ?? 0;
      const occupied = s.occupiedSpaces ?? s.OccupiedSpaces ?? s.occupied ?? 0;
      const available = s.availableSpaces ?? s.AvailableSpaces ?? s.available ?? Math.max(0, rawCapacity - occupied);
      const capacity = rawCapacity > 0 ? rawCapacity : Math.max(available + occupied, available);
      return {
        id: s.id || s.Id,
        name: s.name || s.Name,
        location: s.location || s.Location || '',
        district: s.district || s.District || '',
        contact: s.contactNumber || s.ContactNumber || s.contact || s.Contact || '',
        latitude: s.latitude ?? s.Latitude ?? null,
        longitude: s.longitude ?? s.Longitude ?? null,
        distance: typeof s.distance === 'number' ? `${s.distance.toFixed(1)} km` : (s.distance || s.Distance || 'Nearby'),
        available,
        capacity,
        hasCapacity: rawCapacity > 0,
        facilities: Array.isArray(s.facilities) ? s.facilities : (s.Facilities || []),
      };
    });

  const loadDashboardData = useCallback(async () => {
    try {
      const [reqResponse, notifResponse] = await Promise.all([
        apiClient('/api/v1/requests/my-requests', { method: 'GET' }),
        getNotifications().catch(() => []),
      ]);

      const requestsArray = Array.isArray(reqResponse) ? reqResponse : (reqResponse?.data || reqResponse?.items || []);
      const normalizedRequests = requestsArray.map((r: any) => ({
        id: r.id || r.Id,
        category: r.category || r.Category || 'Unknown',
        status: String(r.status || r.Status || 'pending').toLowerCase(),
        updated: new Date(r.createdAtUtc || r.CreatedAtUtc || Date.now()).toLocaleDateString(),
        description: r.description || r.Description,
        priority: r.priority || r.Priority || r.urgency || 'medium',
        location: r.location || r.Location,
        assignedShelterName: r.assignedShelterName || r.AssignedShelterName || null,
      }));
      setMyRequests(normalizedRequests);

      const notifArray = Array.isArray(notifResponse) ? notifResponse : (notifResponse?.data || notifResponse?.items || []);
      setUnreadNotifications(notifArray.filter((n: any) => !(n.isRead ?? n.IsRead)).length);

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const shelterResp = await apiClient(`/api/v1/shelters/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=10`, { method: 'GET' });
            const sheltersArray = Array.isArray(shelterResp) ? shelterResp : (shelterResp?.data || shelterResp?.items || []);
            setNearbyShelters(mapShelterData(sheltersArray));
          },
          async () => {
             console.warn("Geolocation denied or unavailable. Loading default shelters.");
             const shelterResp = await apiClient(`/api/v1/shelters/nearby?latitude=6.9497&longitude=79.9248&radiusKm=20`, { method: 'GET' });
             const sheltersArray = Array.isArray(shelterResp) ? shelterResp : (shelterResp?.data || shelterResp?.items || []);
             setNearbyShelters(mapShelterData(sheltersArray));
          }
        );
      }
    } catch (error: any) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const submitRequest = async () => {
    if (!form.category || !form.urgency || !form.description || !form.location) {
      addToast({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    if (form.latitude === null || form.longitude === null) {
      addToast({
        type: 'error',
        message: 'Please select an address from the dropdown or click "Use My GPS" so we can pinpoint your location on the map.'
      });
      return;
    }
    
    setRequestStep('ai');
    
    try {
      const response = await apiClient('/api/v1/ai/analyze-request', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          urgency: form.urgency,
          description: form.description,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          affected: parseInt(form.affected, 10) || 1
        })
      });
      
      setAiResult(response);
      setRequestStep('confirm');
    } catch (error: any) {
      console.warn('AI Analysis unavailable, proceeding with manual submission:', error);
      addToast({ type: 'warning', message: 'AI analysis is temporarily busy. You can still submit your request directly.' });
      setAiResult({
        calculatedUrgency: form.urgency.toUpperCase(),
        urgencyScore: form.urgency === 'critical' ? 9.5 : form.urgency === 'high' ? 8.0 : 5.5,
        confidenceScore: 0,
        recommendedAction: 'Direct coordinator review (AI service temporarily unavailable)',
        nearestResource: 'Will be matched by coordinator on the Live Map'
      });
      setRequestStep('confirm');
    }
  };

  const confirmRequest = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiClient('/api/v1/requests', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          urgency: form.urgency,
          description: form.description,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          affected: parseInt(form.affected, 10) || 1
        })
      });

      const newTrackingId = response?.id || response?.Id || response?.data?.id || `REQ-${Math.floor(Math.random() * 10000)}`;
      setTrackingId(newTrackingId);

      setRequestStep('success');
      
      setTimeout(() => { 
        setShowRequestModal(false); 
        setRequestStep('form'); 
        setAiResult(null);
        setForm({ category: '', urgency: '', description: '', location: '', latitude: null, longitude: null, affected: '1' });
        setLocationSearch('');
        loadDashboardData(); 
      }, 3500);

    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to submit assistance request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewResponder = async (requestId: string) => {
    setActiveRequest(requestId);
    setDetailsLoading(true);
    try {
      const responder = await getAssignedVolunteerForRequest(requestId);
      setAssignedResponder(responder);
    } catch (err) {
      console.error("Failed to load responder", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getDirectionsUrl = (shelter: any) => {
    if (shelter.latitude && shelter.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shelter.location || shelter.name)}`;
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 bg-[#1A3A6B] text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/citizen" className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
          <img 
            src="/logo.png"
            alt="Sevana Logo" 
            className="w-8 h-8 object-contain drop-shadow-md rounded-lg bg-white/10 p-1"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
             <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold font-[Outfit] leading-none text-lg">Sevana</p>
            <p className="text-[#60A5FA] text-[10px] font-sinhala font-medium mt-0.5">සෙවන</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="relative p-2 hover:bg-white/10 rounded-lg cursor-pointer" title="Notifications">
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA580C] rounded-full" />
            )}
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h1 className="text-xl font-bold text-[#0D1B2E] font-[Outfit]">Welcome, {user?.name || 'Citizen'}</h1>
          <p className="text-sm text-[#5A7290]">Stay informed and access aid during emergencies</p>
        </div>

        <div className="grid grid-cols-2 gap-3 animate-fade-in delay-100">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex flex-col items-center gap-2 p-4 bg-[#1A3A6B] text-white rounded-2xl hover:bg-[#163060] transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="text-sm font-semibold">Request Assistance</span>
            <span className="text-xs text-white/70">Food, Medicine, Shelter...</span>
          </button>
          <button
            onClick={() => setShowShelterModal(true)}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-[#CBD8E6] rounded-2xl hover:border-[#1A3A6B]/30 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center text-[#1A3A6B]">
              <MapPin size={20} />
            </div>
            <span className="text-sm font-semibold text-[#0D1B2E]">Find Shelter</span>
            <span className="text-xs text-[#5A7290]">{nearbyShelters.length} shelters nearby</span>
          </button>
        </div>

        {(user?.role === 'Volunteer' || user?.role === 'volunteer') ? (
          <div 
            className="bg-green-50 border border-green-200 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition-all shadow-sm animate-fade-in"
            onClick={() => window.location.href = '/volunteer-dashboard'} 
          >
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Activity className="text-green-600" size={24} />
            </div>
            <h3 className="font-semibold text-green-900 mb-1">Access Volunteer Dashboard</h3>
            <p className="text-xs text-green-700">View your active field assignments and tasks</p>
          </div>
        ) : (
          <div 
            className="bg-white border border-[#CBD8E6] p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#1D4ED8] transition-all shadow-sm animate-fade-in"
            onClick={() => window.location.href = '/portal/volunteer-apply'}
          >
            <div className="bg-[#EFF6FF] w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <HeartHandshake className="text-[#1D4ED8]" size={24} />
            </div>
            <h3 className="font-semibold text-[#0D1B2E] mb-1">Apply to Volunteer</h3>
            <p className="text-xs text-[#5A7290]">Join the field response team</p>
          </div>
        )}

        <div className="animate-fade-in delay-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0D1B2E] font-[Outfit]">My Requests</h2>
            <button className="text-xs text-[#1A3A6B] hover:underline">See all</button>
          </div>
          <div className="space-y-3">
            {isLoadingData ? (
               <div className="text-center py-6 text-[#5A7290] text-sm">Loading requests...</div>
            ) : myRequests.length === 0 ? (
               <div className="text-center py-6 text-[#5A7290] text-sm bg-white rounded-2xl border border-[#CBD8E6]">You haven't submitted any requests yet.</div>
            ) : (
              myRequests.map(req => (
                <Card key={req.id} padding="p-4" hover className="cursor-pointer" onClick={() => setTrackModal(true)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs text-[#1A3A6B] font-medium">{req.id}</span>
                      <p className="text-sm font-medium text-[#0D1B2E] mt-0.5">{req.description}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#5A7290] flex-wrap">
                    <span className="flex items-center gap-1 uppercase"><Package size={12} />{req.category}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} />{req.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{req.updated}</span>
                  </div>
                  {req.assignedShelterName && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2">
                      <Home size={13} />
                      <span>Assigned Shelter: <strong>{req.assignedShelterName}</strong></span>
                    </div>
                  )}
                  {req.status === 'inprogress' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#16A34A] bg-[#F0FDF4] rounded-lg px-3 py-2">
                      <Truck size={12} />
                      <span>Aid team dispatched — ETA 30 min</span>
                    </div>
                  )}
                  {req.status === 'delivered' && (
                    <button
                      onClick={e => { e.stopPropagation(); setFeedbackModal(true); }}
                      className="mt-3 text-xs text-[#1A3A6B] hover:underline flex items-center gap-1"
                    >
                      <Star size={12} /> Leave feedback
                    </button>
                  )}
                  
                  {req.status === 'assigned' && (
                    <button
                      onClick={e => { e.stopPropagation(); viewResponder(req.id); }}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-[#1A3A6B] text-white text-xs font-medium rounded-xl hover:bg-[#112A50] transition-colors"
                    >
                      <ShieldCheck size={14} /> View Responder Details
                    </button>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="animate-fade-in delay-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0D1B2E] font-[Outfit]">Nearby Shelters</h2>
            <button onClick={() => setShowShelterModal(true)} className="text-xs text-[#1A3A6B] hover:underline cursor-pointer">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {isLoadingData ? (
               <div className="text-center py-6 text-[#5A7290] text-sm">Locating shelters...</div>
            ) : nearbyShelters.length === 0 ? (
               <div className="text-center py-6 text-[#5A7290] text-sm bg-white rounded-2xl border border-[#CBD8E6]">No open shelters found in your immediate area.</div>
            ) : (
              nearbyShelters.map((s, idx) => (
                <Card key={s.id || idx} padding="p-4" hover>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0D1B2E]">{s.name}</p>
                      <p className="text-xs text-[#5A7290] flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {s.distance}
                      </p>
                    </div>
                    <Badge variant={s.available > 30 ? 'success' : s.available > 10 ? 'warning' : 'danger'}>
                      {s.available} spaces
                    </Badge>
                  </div>
                  <Progress value={Math.max(0, s.capacity - s.available)} max={Math.max(s.capacity, 1)} size="sm" />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {s.facilities.slice(0,3).map((f: string) => <Badge key={f} variant="neutral" className="text-xs">{f}</Badge>)}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setShowShelterModal(true)}>
                      Details <ChevronRight size={12} />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <Card padding="p-4" className="animate-fade-in delay-400">
          <h2 className="text-sm font-semibold text-[#0D1B2E] mb-3 font-[Outfit]">Emergency Contacts</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Emergency', number: '119' },
              { label: 'Police', number: '118' },
              { label: 'DMC', number: '117' },
              { label: 'Sevana Help', number: '1990' },
            ].map(c => (
              <a key={c.label} href={`tel:${c.number}`} className="flex items-center gap-2 p-2.5 bg-[#F0F4F8] rounded-xl hover:bg-[#E8EDF3] transition-colors">
                <div className="w-7 h-7 bg-[#1A3A6B] rounded-lg flex items-center justify-center">
                  <Phone size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#5A7290]">{c.label}</p>
                  <p className="text-sm font-bold text-[#0D1B2E]">{c.number}</p>
                </div>
              </a>
            ))}
          </div>
        </Card>
      </div>

      <MobileNav active="Home" />

      {/* Find Shelter Modal */}
      <Modal
        open={showShelterModal}
        onClose={() => setShowShelterModal(false)}
        title="Nearby Relief Shelters"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowShelterModal(false)}>Close</Button>
        }
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {isLoadingData ? (
            <div className="text-center py-8 text-[#5A7290] text-sm">Locating open shelters near you...</div>
          ) : nearbyShelters.length === 0 ? (
            <Alert type="info" message="No open relief shelters were found in your immediate area. Please submit an Assistance Request so a coordinator can help." />
          ) : (
            nearbyShelters.map((s, idx) => (
              <div key={s.id || idx} className="p-4 bg-[#F8FAFC] border border-[#CBD8E6] rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0D1B2E] font-[Outfit]">{s.name}</h3>
                    <p className="text-xs text-[#5A7290] flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {s.location || s.district || 'Location available on map'} · <strong>{s.distance}</strong>
                    </p>
                  </div>
                  <Badge variant={s.available > 30 ? 'success' : s.available > 10 ? 'warning' : 'danger'}>
                    {s.hasCapacity ? `${s.available} / ${s.capacity} spaces` : `${s.available} spaces available`}
                  </Badge>
                </div>

                <Progress value={Math.max(0, s.capacity - s.available)} max={Math.max(s.capacity, 1)} size="sm" />

                {s.facilities.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {s.facilities.map((f: string) => (
                      <Badge key={f} variant="neutral" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <a
                    href={getDirectionsUrl(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1A3A6B] text-white text-xs font-medium rounded-xl hover:bg-[#112A50] transition-colors"
                  >
                    <Navigation size={13} /> Get Directions <ExternalLink size={11} />
                  </a>
                  {s.contact && (
                    <a
                      href={`tel:${s.contact}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#CBD8E6] text-[#0D1B2E] text-xs font-medium rounded-xl hover:bg-[#F0F4F8] transition-colors"
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setRequestStep('form');
          setAiResult(null);
          setShowLocationDropdown(false);
        }}
        title="Request Assistance"
        size="lg"
        footer={
          requestStep === 'form' ? (
            <>
              <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
              <Button onClick={submitRequest}>Submit Request</Button>
            </>
          ) : requestStep === 'confirm' ? (
            <>
              <Button variant="outline" onClick={() => setRequestStep('form')} disabled={isSubmitting}>Edit</Button>
              <Button variant="success" onClick={confirmRequest} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </>
          ) : null
        }
      >
        {requestStep === 'form' && (
          <div className="space-y-4">
            <Alert type="info" message="Please provide accurate information. False requests may delay assistance to others." />
            <Select
              label="Assistance category"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={[
                { value: '', label: 'Select category...' },
                { value: 'food', label: 'Food & Water' },
                { value: 'medicine', label: 'Medicine & Medical' },
                { value: 'shelter', label: 'Temporary Shelter' },
                { value: 'transport', label: 'Transportation' },
                { value: 'accessibility', label: 'Accessibility Assistance' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Select
              label="Urgency level"
              value={form.urgency}
              onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
              options={[
                { value: '', label: 'Select urgency...' },
                { value: 'critical', label: 'Critical — Immediate danger to life' },
                { value: 'high', label: 'High — Urgent need within 2 hours' },
                { value: 'medium', label: 'Medium — Need within today' },
                { value: 'low', label: 'Low — Can wait 1-2 days' },
              ]}
            />
            <Textarea
              label="Description"
              placeholder="Describe your situation and what assistance you need..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
            />

            {/* Accurate Location Capture (GPS + OpenStreetMap Autocomplete) */}
            <div className="flex flex-col gap-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#0D1B2E]">Your current location</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocatingGps}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A3A6B] hover:text-[#112A50] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLocatingGps ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  {isLocatingGps ? 'Locating...' : 'Use My GPS'}
                </button>
              </div>

              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-2.5 text-[#5A7290]" />
                <input
                  type="text"
                  placeholder="Search town, road, or landmark in Sri Lanka..."
                  className="w-full pl-9 pr-9 py-2 border border-[#CBD8E6] rounded-xl text-sm text-[#0D1B2E] focus:outline-none focus:border-[#1A3A6B] bg-white"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setForm(f => ({ ...f, location: e.target.value, latitude: null, longitude: null }));
                  }}
                  onFocus={() => { if (locationResults.length > 0) setShowLocationDropdown(true); }}
                />
                {isSearchingLocation && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-[#5A7290]" />
                )}
              </div>

              {showLocationDropdown && locationResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#CBD8E6] rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {locationResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2.5 text-xs text-[#0D1B2E] hover:bg-[#F0F4F8] cursor-pointer border-b border-[#F0F4F8] last:border-0 flex items-start gap-2"
                      onClick={() => handleSelectLocation(result)}
                    >
                      <MapPin size={14} className="text-[#1A3A6B] shrink-0 mt-0.5" />
                      <span>{result.display_name}</span>
                    </div>
                  ))}
                </div>
              )}

              {form.latitude !== null && form.longitude !== null ? (
                <p className="text-xs text-[#16A34A] flex items-center gap-1 font-medium mt-0.5">
                  <CheckCircle size={12} />
                  Location pinned on map ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
                </p>
              ) : (
                <p className="text-xs text-[#5A7290] mt-0.5">
                  Select a suggestion or click <strong>Use My GPS</strong> so responders & shelters can locate you accurately.
                </p>
              )}
            </div>

            <Input
              label="Number of affected people"
              type="number"
              min="1"
              value={form.affected}
              onChange={e => setForm(f => ({ ...f, affected: e.target.value }))}
            />
            <div>
              <label className="text-sm font-medium text-[#0D1B2E] block mb-1.5">Supporting evidence (optional)</label>
              <div className="border-2 border-dashed border-[#CBD8E6] rounded-xl p-6 text-center cursor-pointer hover:border-[#1A3A6B]/40 transition-colors">
                <Upload size={24} className="text-[#5A7290] mx-auto mb-2" />
                <p className="text-sm text-[#5A7290]">Upload photos or documents</p>
                <p className="text-xs text-[#5A7290] mt-1">JPG, PNG, PDF up to 10MB</p>
              </div>
            </div>
          </div>
        )}

        {requestStep === 'ai' && (
          <div className="text-center py-10 animate-fade-in">
            <div className="w-16 h-16 bg-[#F5F3FF] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Brain size={28} className="text-[#6D28D9]" />
            </div>
            <h3 className="font-semibold text-[#0D1B2E] mb-2">AI is analyzing your request...</h3>
            <p className="text-sm text-[#5A7290]">Classifying urgency and matching available resources</p>
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-[#6D28D9] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {requestStep === 'confirm' && aiResult && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-[#F5F3FF] rounded-xl border border-[#DDD6FE]">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-[#6D28D9]" />
                <p className="text-sm font-semibold text-[#6D28D9]">AI Analysis Result</p>
                <span className="ml-auto text-xs bg-[#6D28D9]/10 text-[#6D28D9] px-2 py-0.5 rounded-full">{aiResult.confidenceScore || aiResult.ConfidenceScore || 90}% confidence</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#5A7290]">Urgency Score</p>
                  <p className={`font-semibold mt-0.5 ${(aiResult.calculatedUrgency || aiResult.CalculatedUrgency || '').toUpperCase() === 'CRITICAL' ? 'text-[#DC2626]' : 'text-[#EA580C]'}`}>
                    {(aiResult.calculatedUrgency || aiResult.CalculatedUrgency || 'HIGH').toUpperCase()} — {aiResult.urgencyScore || aiResult.UrgencyScore || 8.0}/10
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#5A7290]">Recommended Action</p>
                  <p className="font-medium text-[#0D1B2E] mt-0.5">{aiResult.recommendedAction || aiResult.RecommendedAction || 'Review Required'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#5A7290]">Nearest available resource</p>
                  <p className="font-medium text-[#0D1B2E] mt-0.5">{aiResult.nearestResource || aiResult.NearestResource || 'Calculating via map data...'}</p>
                </div>
              </div>
              <p className="text-xs text-[#5A7290] mt-3 italic">AI recommendations are subject to human review by authorized coordinators.</p>
            </div>
            <Alert type="info" title="Request Ready to Submit" message="Your request will be assigned a tracking number upon submission." />
          </div>
        )}

        {requestStep === 'success' && (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-20 h-20 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-[#16A34A]" />
            </div>
            <h3 className="text-lg font-bold text-[#0D1B2E] mb-1">Request Submitted!</h3>
            <p className="text-sm text-[#5A7290] mb-2">Your tracking number is</p>
            <p className="font-mono text-xl font-bold text-[#1A3A6B]">{trackingId}</p>
            <p className="text-xs text-[#5A7290] mt-4">Your location has been shared with coordinators for rapid response.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={trackModal}
        onClose={() => setTrackModal(false)}
        title="Track Request"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] text-sm">
            <p className="font-semibold text-[#1D4ED8]">Reviewing Request Status</p>
            <p className="text-xs text-[#3B82F6] mt-0.5">Tracking details will update once assigned</p>
          </div>
          <div className="relative pl-4">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#CBD8E6]" />
            {requestTimeline.map((event, i) => (
              <div key={i} className="relative flex gap-3 mb-4 last:mb-0">
                <div className={`absolute -left-2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${event.done ? 'bg-[#16A34A] border-[#16A34A]' : 'bg-white border-[#CBD8E6]'}`}>
                  {event.done && <CheckCircle size={10} className="text-white" />}
                </div>
                <div className="pl-4">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${event.done ? 'text-[#0D1B2E]' : 'text-[#5A7290]'}`}>{event.status}</p>
                    <span className="text-xs text-[#5A7290]">{event.time}</span>
                  </div>
                  <p className="text-xs text-[#5A7290] mt-0.5">{event.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={feedbackModal} onClose={() => setFeedbackModal(false)} title="Rate Your Experience" size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setFeedbackModal(false)}>Skip</Button>
            <Button onClick={() => setFeedbackModal(false)}>Submit Feedback</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5A7290]">How satisfied were you with the assistance provided?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)} className="cursor-pointer">
                <Star size={32} className={s <= rating ? 'text-[#CA8A04] fill-[#CA8A04]' : 'text-[#CBD8E6]'} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Additional comments (optional)" rows={3} />
        </div>
      </Modal>

      {/* Responder Details Modal */}
      <Modal 
        open={!!activeRequest} 
        onClose={() => { setActiveRequest(null); setAssignedResponder(null); }} 
        title="Assigned Responder"
        size="sm"
      >
        <div className="flex flex-col justify-center py-4">
          {detailsLoading ? (
            <p className="text-center text-slate-500">Retrieving responder details...</p>
          ) : assignedResponder ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {assignedResponder.volunteerName || assignedResponder.fullName || assignedResponder.name || 'Assigned Responder'}
                  </p>
                  <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-2">
                    <Phone size={14} /> {assignedResponder.phoneNumber || assignedResponder.contactNumber || 'No phone provided'}
                  </p>
                </div>
              </div>
              <Alert type="info" message="Your responder is en route. Please contact them directly via phone to coordinate your location." />
              <a 
                href={`tel:${assignedResponder.phoneNumber || assignedResponder.contactNumber || ''}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                <Phone size={18} /> Call Responder
              </a>
            </div>
          ) : (
            <p className="text-center text-slate-500">Could not load responder details.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Brain({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
    </svg>
  );
}