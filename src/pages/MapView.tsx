import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layout, PageHeader } from '../components/Layout';
import { Badge, Button } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';
import { AlertTriangle, Home, MapPin, Users, Navigation, CheckCircle } from 'lucide-react';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const crisisIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const shelterIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const citizenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const citizenShelterNeedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Haversine formula to calculate distance in km between two lat/lng points
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function MapView() {
  const { addToast } = useAppContext();
  const [crises, setCrises] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<[[number, number], [number, number]] | null>(null);

  // Default center point (Sri Lanka)
  const defaultCenter: [number, number] = [7.8731, 80.7718];
  const defaultZoom = 7;

  const loadMapData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [crisesRes, sheltersRes, requestsRes] = await Promise.all([
        apiClient('/api/v1/crises', { method: 'GET' }),
        apiClient('/api/v1/shelters', { method: 'GET' }),
        apiClient('/api/v1/coordinator/requests', { method: 'GET' }).catch(() => [])
      ]);

      const crisesData = Array.isArray(crisesRes) ? crisesRes : (crisesRes?.data || crisesRes?.items || []);
      const sheltersData = Array.isArray(sheltersRes) ? sheltersRes : (sheltersRes?.data || sheltersRes?.items || []);
      const requestsData = Array.isArray(requestsRes) ? requestsRes : (requestsRes?.data || requestsRes?.items || []);

      setCrises(crisesData);
      setShelters(sheltersData);
      setRequests(requestsData);
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load map data.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Find the nearest open shelter with enough available spaces
  const findNearestAvailableShelter = (lat: number, lng: number, neededSpaces: number) => {
    let nearest: { shelter: any; distance: number; lat: number; lng: number; available: number } | null = null;

    for (const s of shelters) {
      const sLat = parseFloat(s.latitude ?? s.Latitude);
      const sLng = parseFloat(s.longitude ?? s.Longitude);
      if (isNaN(sLat) || isNaN(sLng)) continue;

      const status = String(s.status || s.Status || 'open').toLowerCase();
      const cap = s.capacity ?? s.Capacity ?? 0;
      const occ = s.occupiedSpaces ?? s.OccupiedSpaces ?? s.occupied ?? 0;
      const available = cap - occ;

      if (status !== 'open' || available < neededSpaces) continue;

      const dist = getDistanceKm(lat, lng, sLat, sLng);
      if (!nearest || dist < nearest.distance) {
        nearest = { shelter: s, distance: dist, lat: sLat, lng: sLng, available };
      }
    }

    return nearest;
  };

  const handleAssignNearestShelter = async (req: any, nearest: { shelter: any; distance: number }) => {
    const reqId = req.id || req.Id;
    const shelterId = nearest.shelter.id || nearest.shelter.Id;
    const shelterName = nearest.shelter.name || nearest.shelter.Name;
    const count = parseInt(req.affectedCount ?? req.AffectedCount ?? req.affected ?? '1', 10) || 1;

    setAllocatingId(reqId);
    try {
      await apiClient(`/api/v1/shelters/${shelterId}/allocate`, {
        method: 'PUT',
        body: JSON.stringify({ count, requestId: reqId })
      });

      addToast({
        type: 'success',
        message: `Assigned ${count} person(s) to ${shelterName} (${nearest.distance.toFixed(1)} km away).`
      });
      loadMapData();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to assign citizen to shelter.' });
    } finally {
      setAllocatingId(null);
    }
  };

  // Filter requests that have valid map coordinates
  const mappedRequests = requests.filter((r) => {
    const lat = parseFloat(r.latitude ?? r.Latitude);
    const lng = parseFloat(r.longitude ?? r.Longitude);
    return !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
  });

  const shelterNeedCount = mappedRequests.filter(
    (r) => String(r.category || r.Category || '').toLowerCase() === 'shelter'
  ).length;

  return (
    <Layout>
      <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col">
        <PageHeader
          title="Live Crisis Map"
          subtitle="Geospatial overview of active incidents, citizen requests, and relief shelters"
        />

        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#CBD8E6] overflow-hidden shadow-sm flex flex-col md:flex-row relative z-0">
          
          {/* Map Container */}
          <div className="flex-1 h-full z-0">
            <MapContainer 
              center={defaultCenter} 
              zoom={defaultZoom} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Dashed route line between selected citizen and nearest shelter */}
              {selectedRoute && (
                <Polyline
                  positions={selectedRoute}
                  pathOptions={{ color: '#EA580C', weight: 3, dashArray: '8, 8' }}
                />
              )}

              {/* Plot Crises */}
              {crises.map((c) => {
                const lat = parseFloat(c.latitude ?? c.Latitude);
                const lng = parseFloat(c.longitude ?? c.Longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                return (
                  <Marker key={`crisis-${c.id || c.Id}`} position={[lat, lng]} icon={crisisIcon}>
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={16} className="text-red-600" />
                          <h3 className="font-bold text-[#0D1B2E] font-[Outfit] m-0">{c.title || c.Title}</h3>
                        </div>
                        <Badge variant="danger" className="mb-2 block w-fit">{c.type || c.Type}</Badge>
                        <p className="text-xs text-[#5A7290] m-0 mb-1"><MapPin size={12} className="inline mr-1" />{c.location || c.Location}</p>
                        <p className="text-xs font-semibold text-[#0D1B2E] m-0"><Users size={12} className="inline mr-1" />{c.affectedCount || c.AffectedCount} affected</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Plot Shelters */}
              {shelters.map((s) => {
                const lat = parseFloat(s.latitude ?? s.Latitude);
                const lng = parseFloat(s.longitude ?? s.Longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                const cap = s.capacity ?? s.Capacity ?? 0;
                const occ = s.occupiedSpaces ?? s.OccupiedSpaces ?? s.occupied ?? 0;
                const isFull = occ >= cap;

                return (
                  <Marker key={`shelter-${s.id || s.Id}`} position={[lat, lng]} icon={shelterIcon}>
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Home size={16} className="text-green-600" />
                          <h3 className="font-bold text-[#0D1B2E] font-[Outfit] m-0">{s.name || s.Name}</h3>
                        </div>
                        <Badge variant={isFull ? 'danger' : 'success'} className="mb-2 block w-fit">
                          {isFull ? 'Shelter Full' : `${cap - occ} Spaces Available`}
                        </Badge>
                        <p className="text-xs text-[#5A7290] m-0 mb-1"><MapPin size={12} className="inline mr-1" />{s.location || s.Location}</p>
                        <p className="text-xs font-semibold text-[#0D1B2E] m-0">Occupancy: {occ} / {cap}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Plot Citizen Assistance Requests */}
              {mappedRequests.map((r) => {
                const lat = parseFloat(r.latitude ?? r.Latitude);
                const lng = parseFloat(r.longitude ?? r.Longitude);
                const reqId = r.id || r.Id;
                const category = String(r.category || r.Category || 'Assistance');
                const needsShelter = category.toLowerCase() === 'shelter';
                const affected = parseInt(r.affectedCount ?? r.AffectedCount ?? r.affected ?? '1', 10) || 1;
                const citizenName = r.citizenName || r.CitizenName || r.fullName || 'Citizen';
                const urgency = String(r.urgency || r.Urgency || r.priority || 'Medium');
                const nearest = findNearestAvailableShelter(lat, lng, affected);

                return (
                  <Marker
                    key={`request-${reqId}`}
                    position={[lat, lng]}
                    icon={needsShelter ? citizenShelterNeedIcon : citizenIcon}
                    eventHandlers={{
                      click: () => {
                        if (nearest) {
                          setSelectedRoute([[lat, lng], [nearest.lat, nearest.lng]]);
                        } else {
                          setSelectedRoute(null);
                        }
                      }
                    }}
                  >
                    <Popup>
                      <div className="min-w-[240px] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-[#0D1B2E] font-[Outfit] m-0 text-sm">{citizenName}</h3>
                          <Badge variant={needsShelter ? 'warning' : 'info'}>{category}</Badge>
                        </div>

                        <p className="text-xs text-[#5A7290] m-0">
                          <MapPin size={11} className="inline mr-1" />
                          {r.location || r.Location}
                        </p>
                        <p className="text-xs text-[#0D1B2E] m-0">
                          <Users size={11} className="inline mr-1" />
                          <strong>{affected}</strong> affected · Urgency: <strong>{urgency}</strong>
                        </p>

                        {nearest ? (
                          <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg space-y-2 mt-2">
                            <div className="flex items-start gap-1.5">
                              <Navigation size={13} className="text-[#16A34A] shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <p className="font-semibold text-[#166534] m-0">
                                  Nearest Shelter: {nearest.shelter.name || nearest.shelter.Name}
                                </p>
                                <p className="text-[#15803D] m-0">
                                  {nearest.distance.toFixed(1)} km away · {nearest.available} spaces left
                                </p>
                              </div>
                            </div>
                            {needsShelter && (
                              <Button
  size="sm"
  className="w-full"
  disabled={allocatingId === reqId}
  onClick={() => handleAssignNearestShelter(r, nearest)}
>
  <CheckCircle size={13} className="mr-1" />
  {allocatingId === reqId ? 'Assigning...' : 'Assign to Nearest Shelter'}
</Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#DC2626] m-0">No open shelter with enough capacity found.</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Side Panel for Legend/Stats */}
          <div className="w-full md:w-80 bg-[#F8FAFC] border-t md:border-t-0 md:border-l border-[#CBD8E6] p-5 overflow-y-auto z-10 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-[#0D1B2E] font-[Outfit] mb-3">Map Legend</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-[#E8EDF3] shadow-sm">
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Red Marker" className="w-5 h-8 object-contain" />
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2E]">Active Crises</p>
                    <p className="text-xs text-[#5A7290]">Emergency incidents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-[#E8EDF3] shadow-sm">
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" alt="Green Marker" className="w-5 h-8 object-contain" />
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2E]">Relief Shelters</p>
                    <p className="text-xs text-[#5A7290]">Safe zones & aid centers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-[#E8EDF3] shadow-sm">
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png" alt="Orange Marker" className="w-5 h-8 object-contain" />
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2E]">Shelter Requests</p>
                    <p className="text-xs text-[#5A7290]">Citizens needing shelter</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-[#E8EDF3] shadow-sm">
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png" alt="Blue Marker" className="w-5 h-8 object-contain" />
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2E]">Other Aid Requests</p>
                    <p className="text-xs text-[#5A7290]">Food, medicine & transport</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#0D1B2E] font-[Outfit] mb-3">Live Summary</h3>
              {isLoading ? (
                <p className="text-xs text-[#5A7290]">Loading coordinates...</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-[#E8EDF3]">
                    <span className="text-[#5A7290]">Mapped Incidents</span>
                    <span className="font-bold text-[#DC2626]">{crises.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-[#E8EDF3]">
                    <span className="text-[#5A7290]">Active Shelters</span>
                    <span className="font-bold text-[#16A34A]">{shelters.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5 border-b border-[#E8EDF3]">
                    <span className="text-[#5A7290]">Mapped Citizens</span>
                    <span className="font-bold text-[#1D4ED8]">{mappedRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1.5">
                    <span className="text-[#5A7290]">Needing Shelter</span>
                    <span className="font-bold text-[#EA580C]">{shelterNeedCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}