import React, { useState, useEffect } from 'react';
import { MapPin, Phone, AlertCircle, Navigation, ExternalLink, Package, Clock, Truck } from 'lucide-react';
import { PageHeader, Layout } from '../components/Layout';
import { Card, Badge, Avatar, Alert, Button } from '../components/ui';
import {
  getActiveCitizensForVolunteer,
  getResourceDispatches,
  updateResourceDispatchStatus
} from '../api';
import type { ResourceDispatchResponse, ResourceDispatchStatus } from '../api';
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

interface ResourceDelivery {
  dispatchId: string;
  resourceId: string;
  itemName: string;
  quantity: number;
  unit: string;
  destinationType: 'Shelter' | 'CitizenRequest';
  destinationId: string;
  destinationName: string;
  status: ResourceDispatchStatus;
  timestamp: string;
}

function getDispatchRecords(
  response: Awaited<ReturnType<typeof getResourceDispatches>>
): ResourceDispatchResponse[] {
  if (Array.isArray(response)) return response;
  if (!response) return [];
  return response.data || response.items || [];
}

function isDispatchStatus(value: unknown): value is ResourceDispatchStatus {
  return value === 'Dispatched' || value === 'InTransit' || value === 'Delivered';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getDeliveryRecords(
  response: Awaited<ReturnType<typeof getResourceDispatches>>
): ResourceDelivery[] {
  return getDispatchRecords(response).flatMap(dispatch => {
    const nestedResource = dispatch.resource;
    const dispatchId = dispatch.dispatchId || dispatch.id || '';
    const destinationType = dispatch.destinationType === 'Shelter' ? 'Shelter' : 'CitizenRequest';
    const statusValue: unknown = dispatch.status;
    if (!dispatchId || !isDispatchStatus(statusValue)) return [];

    return [{
      dispatchId,
      resourceId: dispatch.resourceId || '',
      itemName: dispatch.itemName || dispatch.resourceName ||
        nestedResource?.itemName ||
        nestedResource?.name ||
        'Resource',
      quantity: typeof dispatch.quantity === 'number' ? dispatch.quantity : 0,
      unit: dispatch.unit || 'Units',
      destinationType,
      destinationId: dispatch.destinationId || '',
      destinationName: dispatch.destinationName || dispatch.destination || dispatch.shelterName ||
        dispatch.requestName || dispatch.citizenName || dispatch.destinationId || 'Destination unavailable',
      status: statusValue,
      timestamp: dispatch.dispatchedAtUtc || dispatch.createdAtUtc || dispatch.updatedAtUtc || ''
    }];
  });
}

export function VolunteerPortal() {
  const { user, addToast } = useAppContext();
  const [assignments, setAssignments] = useState<ActiveCitizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resourceDeliveries, setResourceDeliveries] = useState<ResourceDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [deliveriesError, setDeliveriesError] = useState('');
  const [updatingDispatchId, setUpdatingDispatchId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
    }
    void fetchResourceDeliveries();
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

  const fetchResourceDeliveries = async () => {
    if (!user) {
      setResourceDeliveries([]);
      setDeliveriesError('');
      setDeliveriesLoading(false);
      return;
    }

    setDeliveriesLoading(true);
    setDeliveriesError('');
    try {
      const response = await getResourceDispatches();
      setResourceDeliveries(getDeliveryRecords(response));
    } catch (requestError: unknown) {
      console.error('Failed to load volunteer resource deliveries.', requestError);
      setResourceDeliveries([]);
      setDeliveriesError(
        isRecord(requestError) && requestError.status === 403
          ? 'Resource deliveries are not available for this account.'
          : 'Unable to load your resource deliveries right now.'
      );
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleUpdateDeliveryStatus = async (delivery: ResourceDelivery) => {
    const nextStatus: ResourceDispatchStatus = delivery.status === 'Dispatched'
      ? 'InTransit'
      : 'Delivered';
    setUpdatingDispatchId(delivery.dispatchId);
    try {
      await updateResourceDispatchStatus(delivery.dispatchId, nextStatus);
      setResourceDeliveries(current => current.map(item =>
        item.dispatchId === delivery.dispatchId ? { ...item, status: nextStatus } : item
      ));
      addToast({
        type: 'success',
        message: nextStatus === 'InTransit'
          ? 'Delivery marked In Transit.'
          : 'Delivery confirmed as Delivered.'
      });
    } catch (requestError: unknown) {
      addToast({
        type: 'error',
        message: requestError instanceof Error && requestError.message
          ? requestError.message
          : 'Failed to update delivery status.'
      });
    } finally {
      setUpdatingDispatchId(null);
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

  const activeResourceDeliveries = resourceDeliveries.filter(
    delivery => delivery.status === 'Dispatched' || delivery.status === 'InTransit'
  );
  const completedResourceDeliveries = resourceDeliveries.filter(
    delivery => delivery.status === 'Delivered'
  );
  const renderResourceDeliveryCards = (deliveries: ResourceDelivery[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {deliveries.map(delivery => {
        const timestamp = delivery.timestamp ? new Date(delivery.timestamp) : null;
        const timestampLabel = timestamp && Number.isFinite(timestamp.getTime())
          ? timestamp.toLocaleString()
          : 'Timestamp unavailable';
        const isCompleted = delivery.status === 'Delivered';

        return (
          <Card key={delivery.dispatchId} padding="p-5" className="flex flex-col h-full">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900">{delivery.itemName}</h4>
                <p className="text-sm text-slate-600 mt-1">
                  {delivery.quantity.toLocaleString()} {delivery.unit}
                </p>
              </div>
              <Badge variant={isCompleted ? 'success' : delivery.status === 'InTransit' ? 'warning' : 'info'}>
                {delivery.status === 'InTransit' ? 'In Transit' : delivery.status}
              </Badge>
            </div>

            <div className="space-y-3 mb-5 flex-1 text-sm">
              <div>
                <Badge variant={delivery.destinationType === 'Shelter' ? 'primary' : 'info'}>
                  {delivery.destinationType === 'Shelter' ? 'Shelter' : 'Citizen Request'}
                </Badge>
                <p className="mt-1 text-slate-700">{delivery.destinationName}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock size={14} className="shrink-0" />
                <span>{timestampLabel}</span>
              </div>
            </div>

            {!isCompleted && (
              <Button
                size="sm"
                onClick={() => void handleUpdateDeliveryStatus(delivery)}
                disabled={updatingDispatchId === delivery.dispatchId}
                loading={updatingDispatchId === delivery.dispatchId}
              >
                {delivery.status === 'Dispatched'
                  ? 'Start Delivery (In Transit)'
                  : 'Confirm Delivered'}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader 
          title="Volunteer Dashboard" 
          subtitle="Manage your active field assignments and communicate with citizens in need." 
        />

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <section className="mb-8" aria-labelledby="resource-deliveries-title">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={19} className="text-[#1A3A6B]" />
            <h3 id="resource-deliveries-title" className="text-lg font-bold text-slate-800 font-[Outfit]">
              My Resource Deliveries
            </h3>
            {!deliveriesLoading && !deliveriesError && (
              <Badge variant="neutral">{resourceDeliveries.length}</Badge>
            )}
          </div>

          {deliveriesLoading ? (
            <Card className="py-6 text-center text-sm text-slate-500">Loading your resource deliveries...</Card>
          ) : deliveriesError ? (
            <Card padding="p-4">
              <Alert type="info" message={deliveriesError} />
            </Card>
          ) : resourceDeliveries.length === 0 ? (
            <Card className="py-6 text-center text-sm text-slate-500">
              No resource deliveries are available.
            </Card>
          ) : (
            <div className="space-y-7">
              {activeResourceDeliveries.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">
                    Active Deliveries <span className="text-slate-500">({activeResourceDeliveries.length})</span>
                  </h4>
                  {renderResourceDeliveryCards(activeResourceDeliveries)}
                </div>
              )}
              {completedResourceDeliveries.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">
                    Completed Deliveries <span className="text-slate-500">({completedResourceDeliveries.length})</span>
                  </h4>
                  {renderResourceDeliveryCards(completedResourceDeliveries)}
                </div>
              )}
            </div>
          )}
        </section>

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