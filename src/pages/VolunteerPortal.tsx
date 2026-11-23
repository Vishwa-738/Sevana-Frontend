import React, { useState, useEffect } from 'react';
import { MapPin, Phone, AlertCircle, Navigation, ExternalLink, Package } from 'lucide-react';
import { PageHeader, Layout } from '../components/Layout';
import { Card, Badge, Avatar, Alert } from '../components/ui';
import { getActiveCitizensForVolunteer } from '../api';
import { useAppContext } from '../context';

interface ActiveCitizen {
  requestId: string;
  citizenId: string;
  citizenName: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  urgency: string;
  category: string;
  description: string;
  contactNumber: string;
  status: string;
}

export function VolunteerPortal() {
  const { user } = useAppContext();
  const [assignments, setAssignments] = useState<ActiveCitizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
    }
  }, [user?.id]);

  const fetchAssignments = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getActiveCitizensForVolunteer(user.id);
      const rawList = Array.isArray(data) ? data : (data?.data || data?.items || []);

      const normalized: ActiveCitizen[] = rawList.map((item: any) => ({
        requestId: item.requestId || item.RequestId || item.id || item.Id || '',
        citizenId: item.citizenId || item.CitizenId || '',
        citizenName: item.citizenName || item.CitizenName || item.fullName || item.name || 'Citizen',
        location: item.location || item.Location || item.address || item.Address || '',
        latitude: item.latitude ?? item.Latitude ?? null,
        longitude: item.longitude ?? item.Longitude ?? null,
        urgency: item.urgency || item.Urgency || item.priority || item.Priority || '',
        category: item.category || item.Category || 'Assistance',
        description: item.description || item.Description || '',
        contactNumber:
          item.contactNumber ||
          item.ContactNumber ||
          item.phoneNumber ||
          item.PhoneNumber ||
          item.citizenPhone ||
          item.phone ||
          '',
        status: item.status || item.Status || 'Assigned',
      }));

      setAssignments(normalized);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const getDirectionsUrl = (assignment: ActiveCitizen) => {
    if (assignment.latitude !== null && assignment.longitude !== null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${assignment.latitude},${assignment.longitude}`;
    }
    if (assignment.location) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.location)}`;
    }
    return '';
  };

  const getBadgeVariant = (urgency: string) => {
    const u = urgency.toLowerCase();
    if (u === 'critical') return 'danger';
    if (u === 'high') return 'warning';
    if (u === 'medium') return 'info';
    return 'neutral';
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader 
          title="Volunteer Dashboard" 
          subtitle="Manage your active field assignments and communicate with citizens in need." 
        />

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <h3 className="text-lg font-bold text-slate-800 mb-4 font-[Outfit]">My Active Assignments</h3>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading your assignments...</div>
        ) : assignments.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">You currently have no active assignments.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {assignments.map(assignment => {
              const directionsUrl = getDirectionsUrl(assignment);
              const badgeLabel = assignment.urgency || assignment.status || 'Assigned';

              return (
                <Card key={assignment.requestId} padding="p-5" className="flex flex-col h-full">
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={assignment.citizenName} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{assignment.citizenName}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 uppercase">
                          <Package size={11} /> {assignment.category}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getBadgeVariant(badgeLabel)}>
                      {badgeLabel}
                    </Badge>
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-4 line-clamp-3">
                      {assignment.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-6 flex-1 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{assignment.location || 'Location not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-400 shrink-0" />
                      <span>{assignment.contactNumber || 'No contact provided'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {assignment.contactNumber ? (
                      <a 
                        href={`tel:${assignment.contactNumber}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1A3A6B] text-white text-sm font-medium rounded-xl hover:bg-[#112A50] transition-colors"
                      >
                        <Phone size={16} /> Call Citizen
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-200 text-slate-500 text-sm font-medium rounded-xl cursor-not-allowed"
                      >
                        <Phone size={16} /> No Phone Number
                      </button>
                    )}

                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-[#CBD8E6] text-[#1A3A6B] text-sm font-medium rounded-xl hover:bg-[#F0F4F8] transition-colors"
                      >
                        <Navigation size={15} /> Get Directions <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}