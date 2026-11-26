import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Users, Package, Home, MapPin, Clock, Phone, ExternalLink, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, StatusBadge, Button, Modal } from '../components/ui';
import { apiClient } from '../api';
import { useAppContext } from '../context';
import { findIncidentClusters, type IncidentCluster, type RequestRecord } from '../utils/requestClustering';
import { isArchivedStatus, normalizeRequestStatus } from '../utils/requestLifecycle';

const STATUS_OPTIONS = [
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Closed', label: 'Closed' }
];

type ViewMode = 'all' | 'clusters';
type SortMode = 'recent' | 'priority';
type LifecycleMode = 'active' | 'archived';
type QuickAction = 'monitor' | 'shelter' | 'deploy';
const ACTIVE_QUEUE_STATUSES: ReadonlySet<string> = new Set([
  'submitted', 'pending', 'underreview', 'verified', 'assigned', 'inprogress'
]);

function isRecord(value: unknown): value is RequestRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecords(value: unknown): RequestRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  const records = value.data ?? value.items;
  return Array.isArray(records) ? records.filter(isRecord) : [];
}

function getString(record: RequestRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getNumber(record: RequestRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getRequestId(request: RequestRecord): string {
  return getString(request, 'id', 'Id');
}

function isArchivedRequest(request: RequestRecord): boolean {
  return isArchivedStatus(getString(request, 'status', 'Status'));
}

function isActiveQueueRequest(request: RequestRecord): boolean {
  return ACTIVE_QUEUE_STATUSES.has(normalizeRequestStatus(getString(request, 'status', 'Status')));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getTimestampMs(request: RequestRecord): number {
  const raw = getString(request, 'createdAtUtc', 'CreatedAtUtc', 'createdAt', 'CreatedAt');
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTriageStatusTier(request: RequestRecord): number {
  const status = normalizeRequestStatus(getString(request, 'status', 'Status'));
  if (isArchivedStatus(status)) return 0;
  if (['assigned', 'inprogress'].includes(status)) return 1;
  return 2;
}

function getUrgencyBaseScore(request: RequestRecord): number {
  const weights: Partial<Record<string, number>> = {
    critical: 400,
    high: 300,
    medium: 200,
    moderate: 200,
    low: 100
  };
  const values = [
    getString(request, 'priority', 'Priority'),
    getString(request, 'urgency', 'Urgency'),
    getString(request, 'calculatedUrgency', 'CalculatedUrgency')
  ];
  const scores = values
    .map(value => {
      const normalized = value.trim().toLowerCase();
      if (normalized.includes('critical')) return weights.critical;
      if (normalized.includes('high')) return weights.high;
      if (normalized.includes('medium') || normalized.includes('moderate')) return weights.medium;
      if (normalized.includes('low')) return weights.low;
      return undefined;
    })
    .filter((score): score is number => score !== undefined);
  return scores.length > 0 ? Math.max(...scores) : 200;
}

function getAiUrgencyScore(request: RequestRecord): number {
  const rawScore = getNumber(request, 'aiUrgencyScore', 'AiUrgencyScore', 'urgencyScore', 'UrgencyScore');
  if (rawScore === null) return 0;
  const normalizedScore = rawScore <= 10 ? rawScore * 10 : rawScore;
  return Math.min(100, Math.max(0, normalizedScore));
}

export function getTriagePriorityScore(request: RequestRecord): number {
  const aiText = `${getString(request, 'aiRecommendation', 'AiRecommendation')} ${getString(request, 'aiSummary', 'AiSummary')}`.toLowerCase();
  const hasNoImmediate = /\bno immediate\b/.test(aiText);
  const indicatesImmediateDanger =
    /\b(evacuat\w*|rescue|life[- ]threatening|trapped|critical|medical emergency)\b/.test(aiText) ||
    (/\bimmediate\b/.test(aiText) && !hasNoImmediate);
  const indicatesLowRiskMonitoring = /\b(monitor|no immediate|no relocation|low risk)\b/.test(aiText);
  const recommendationAdjustment =
    (indicatesImmediateDanger ? 50 : 0) - (indicatesLowRiskMonitoring ? 60 : 0);

  return getTriageStatusTier(request) * 1000 +
    getUrgencyBaseScore(request) +
    getAiUrgencyScore(request) +
    recommendationAdjustment;
}

function getAffectedPeopleCount(request: RequestRecord): number {
  return getNumber(
    request,
    'affected',
    'Affected',
    'affectedPeopleCount',
    'AffectedPeopleCount',
    'affectedCount',
    'affectedPeople',
    'AffectedPeople'
  ) ?? 0;
}

function sortRequests(requestsToSort: readonly RequestRecord[], sortMode: SortMode): RequestRecord[] {
  return [...requestsToSort].sort((first, second) => {
    if (sortMode === 'priority') {
      const scoreDifference = getTriagePriorityScore(second) - getTriagePriorityScore(first);
      if (scoreDifference !== 0) return scoreDifference;

      const affectedDifference = getAffectedPeopleCount(second) - getAffectedPeopleCount(first);
      if (affectedDifference !== 0) return affectedDifference;
    }
    return getTimestampMs(second) - getTimestampMs(first);
  });
}

function isUnhandledTriageStatus(request: RequestRecord): boolean {
  const status = normalizeRequestStatus(getString(request, 'status', 'Status'));
  return ['submitted', 'pending', 'underreview', 'verified'].includes(status);
}

function normalizeStatusValue(rawStatus: string): string {
  const cleaned = String(rawStatus || 'Submitted').trim().toLowerCase().replace(/\s+/g, '');
  const match = STATUS_OPTIONS.find(
    (option) => option.value.toLowerCase().replace(/\s+/g, '') === cleaned
  );
  return match ? match.value : rawStatus || 'Submitted';
}

function getUrgencyVariant(urgency: string): 'danger' | 'warning' | 'info' | 'neutral' {
  const normalized = String(urgency || 'medium').toLowerCase();
  if (normalized === 'critical') return 'danger';
  if (normalized === 'high') return 'warning';
  if (normalized === 'low') return 'neutral';
  return 'info';
}

function getQuickAction(
  aiSummary: string,
  aiRecommendation: string,
  category: string
): QuickAction | null {
  const analysis = `${aiSummary} ${aiRecommendation}`.trim();
  const normalizedAnalysis = analysis.toLowerCase();
  if (!analysis || normalizedAnalysis.includes('ai analysis is currently unavailable')) return null;

  if (
    category.trim().toLowerCase() === 'shelter' ||
    /\b(shelter|evacuate|relocate|relocation)\b/i.test(analysis)
  ) {
    return 'shelter';
  }
  if (/\b(monitor|no immediate|no relocation|low)\b/i.test(analysis)) return 'monitor';
  if (
    /\b(dispatch|deploy|send|assign|urgent|medical|food|rescue|supply|supplies|transport|deliver|provide|assist|respond|coordinate|verify|contact|follow up)\b/i.test(analysis) ||
    (aiRecommendation.trim() !== '' && !/\b(no action|no recommendation|not actionable)\b/i.test(aiRecommendation))
  ) {
    return 'deploy';
  }
  return null;
}

function isTerminalOrAssigned(status: string): boolean {
  return isArchivedStatus(status) || ['assigned', 'inprogress'].includes(normalizeRequestStatus(status));
}

function getAffectedPeople(request: RequestRecord): number {
  return getNumber(
    request,
    'affectedPeopleCount',
    'AffectedPeopleCount',
    'affectedCount',
    'affected',
    'affectedPeople',
    'AffectedPeople'
  ) ?? 1;
}

function getVolunteerId(volunteer: RequestRecord): string {
  return getString(volunteer, 'id', 'Id');
}

function getVolunteerName(volunteer: RequestRecord): string {
  return getString(volunteer, 'fullName', 'FullName', 'name', 'Name') || 'Volunteer';
}

export function CoordinatorDashboard() {
  const { addToast } = useAppContext();
  const [stats, setStats] = useState({ crises: 0, pending: 0, volunteers: 0, capacity: 0 });
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [requestsToAssign, setRequestsToAssign] = useState<string[]>([]);
  const [volunteers, setVolunteers] = useState<RequestRecord[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [lifecycleMode, setLifecycleMode] = useState<LifecycleMode>('active');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsResponse, requestsResponse] = await Promise.all([
        apiClient('/api/v1/coordinator/stats', { method: 'GET' }),
        apiClient('/api/v1/coordinator/requests', { method: 'GET' })
      ]);

      const statsRecord = isRecord(statsResponse) ? statsResponse : {};
      setStats({
        crises: getNumber(statsRecord, 'totalActiveCrises', 'TotalActiveCrises') ?? 0,
        pending: getNumber(statsRecord, 'pendingRequests', 'PendingRequests') ?? 0,
        volunteers: getNumber(statsRecord, 'activeVolunteers', 'ActiveVolunteers') ?? 0,
        capacity: getNumber(statsRecord, 'availableResources', 'AvailableResources') ?? 0
      });

      const sortedRequests = getRecords(requestsResponse).sort(
        (first, second) => getTimestampMs(second) - getTimestampMs(first)
      );
      setRequests(sortedRequests);
    } catch (error: unknown) {
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to load coordinator data.') });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const fetchVolunteers = async () => {
    try {
      const response = await apiClient('/api/v1/volunteers?activeOnly=true', { method: 'GET' });
      setVolunteers(getRecords(response));
    } catch (error: unknown) {
      console.error('Failed to load volunteers', error);
      addToast({ type: 'error', message: 'Failed to load volunteer list.' });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const openAssignmentModal = (requestIds: string[]) => {
    setRequestsToAssign(requestIds);
    setSelectedVolunteer('');
    setAssignmentModalOpen(true);
    void fetchVolunteers();
  };

  const handleUpdateStatus = async (id: string, newStatus: string, successMessage?: string) => {
    if (!newStatus || !id) return;

    if (newStatus === 'Assigned') {
      openAssignmentModal([id]);
      return;
    }

    setUpdatingId(id);
    try {
      await apiClient(`/api/v1/coordinator/requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      addToast({
        type: 'success',
        message: successMessage || (
          isArchivedStatus(newStatus)
            ? `Request marked ${normalizeStatusValue(newStatus)} and moved to Archived.`
            : 'Status updated successfully.'
        )
      });
      setRequests(previous =>
        previous.map(request =>
          getRequestId(request) === id ? { ...request, status: newStatus, Status: newStatus } : request
        )
      );
      void fetchDashboardData();
    } catch (error: unknown) {
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to update status.') });
      void fetchDashboardData();
    } finally {
      setUpdatingId(null);
    }
  };

  const openClusterAssignment = (cluster: IncidentCluster) => {
    const unassignedIds = cluster.requests
      .filter(request => !isTerminalOrAssigned(normalizeStatusValue(getString(request, 'status', 'Status'))))
      .map(getRequestId)
      .filter(Boolean);

    if (unassignedIds.length === 0) {
      addToast({ type: 'info', message: 'All requests in this cluster are already assigned or resolved.' });
      return;
    }
    openAssignmentModal(unassignedIds);
  };

  const confirmAssignment = async () => {
    if (requestsToAssign.length === 0 || !selectedVolunteer) return;
    setIsAssigning(true);

    const assignedIds: string[] = [];
    const failedRequests: Array<{ id: string; message: string }> = [];
    try {
      for (const requestId of requestsToAssign) {
        try {
          await apiClient(`/api/v1/coordinator/requests/${requestId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
              status: 'Assigned',
              volunteerId: selectedVolunteer
            })
          });
          assignedIds.push(requestId);
        } catch (error: unknown) {
          failedRequests.push({
            id: requestId,
            message: getErrorMessage(error, 'Unknown assignment error.')
          });
        }
      }

      if (assignedIds.length > 0) {
        setRequests(previous =>
          previous.map(request =>
            assignedIds.includes(getRequestId(request))
              ? { ...request, status: 'Assigned', Status: 'Assigned' }
              : request
          )
        );
      }

      if (failedRequests.length === 0) {
        addToast({
          type: 'success',
          message: assignedIds.length === 1
            ? 'Volunteer assigned successfully!'
            : `Volunteer assigned to all ${assignedIds.length} cluster requests.`
        });
        setAssignmentModalOpen(false);
        setRequestsToAssign([]);
        setSelectedVolunteer('');
      } else {
        setRequestsToAssign(failedRequests.map(failure => failure.id));
        addToast({
          type: 'error',
          message: `Volunteer assigned to ${assignedIds.length} of ${requestsToAssign.length} requests. ${failedRequests.length} failed: ${failedRequests[0].message}`
        });
      }
      void fetchDashboardData();
    } finally {
      setIsAssigning(false);
    }
  };

  const activeQueueRequests = requests.filter(isActiveQueueRequest);
  const archivedRequests = requests.filter(isArchivedRequest);
  const clusters = findIncidentClusters(activeQueueRequests);
  const clusterSizes = new Map<RequestRecord, number>();
  for (const cluster of clusters) {
    for (const request of cluster.requests) {
      clusterSizes.set(request, cluster.requests.length);
    }
  }
  const clusteredRequests = new Set(clusterSizes.keys());
  const standaloneRequests = activeQueueRequests.filter(request => !clusteredRequests.has(request));
  const sortedRequests = sortRequests(activeQueueRequests, sortMode);
  const sortedStandaloneRequests = sortRequests(standaloneRequests, sortMode);
  const sortedArchivedRequests = sortRequests(archivedRequests, sortMode);
  const sortedClusters = [...clusters].sort((first, second) => {
    if (sortMode === 'priority') {
      const firstScore = Math.max(...first.requests.map(getTriagePriorityScore));
      const secondScore = Math.max(...second.requests.map(getTriagePriorityScore));
      if (firstScore !== secondScore) return secondScore - firstScore;
    }

    const newestRequestTime = (cluster: IncidentCluster) =>
      Math.max(...cluster.requests.map(getTimestampMs));
    const recencyDifference = newestRequestTime(second) - newestRequestTime(first);
    if (recencyDifference !== 0) return recencyDifference;
    return first.id.localeCompare(second.id);
  });

  const renderRequestsTable = (visibleRequests: RequestRecord[], archivedView = false) => (
    <div className="overflow-x-auto">
      {visibleRequests.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#5A7290]">
          {archivedView ? 'No archived requests.' : 'No standalone requests.'}
        </div>
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
            {visibleRequests.map((request, index) => {
              const requestId = getRequestId(request);
              const currentStatus = normalizeStatusValue(getString(request, 'status', 'Status') || 'Submitted');
              const isUpdating = updatingId === requestId;
              const contact = getString(
                request,
                'citizenPhoneNumber',
                'CitizenPhoneNumber',
                'contactNumber',
                'ContactNumber',
                'phoneNumber',
                'PhoneNumber',
                'citizenPhone',
                'phone'
              );
              const locationText = getString(request, 'location', 'Location') || 'Location not provided';
              const isUrlLocation = /^https?:\/\//i.test(locationText);
              const latitude = getNumber(request, 'latitude', 'Latitude');
              const longitude = getNumber(request, 'longitude', 'Longitude');
              const hasCoordinates = latitude !== null && longitude !== null && (latitude !== 0 || longitude !== 0);
              const assignedShelter = getString(request, 'assignedShelterName', 'AssignedShelterName');
              const description = getString(request, 'description', 'Description');
              const urgency = getString(request, 'urgency', 'Urgency', 'priority') || 'Medium';
              const timestampMs = getTimestampMs(request);
              const category = getString(request, 'category', 'Category') || 'Unknown';
              const aiSummary = getString(request, 'aiSummary', 'AiSummary');
              const aiRecommendation = getString(request, 'aiRecommendation', 'AiRecommendation');
              const rawConfidence = getNumber(request, 'aiConfidenceScore', 'AiConfidenceScore');
              const quickAction = getQuickAction(aiSummary, aiRecommendation, category);
              const canShowQuickAction = quickAction !== null && !isTerminalOrAssigned(currentStatus);
              const affectedCount = getAffectedPeople(request);
              const nearbyRequestCount = clusterSizes.get(request);
              const isTopTriageRequest =
                lifecycleMode === 'active' && sortMode === 'priority' &&
                index < 3 && isUnhandledTriageStatus(request);

              return (
                <tr key={requestId || index} className={`border-b border-[#E8EDF3] hover:bg-[#F8FAFC] ${isUpdating ? 'opacity-50' : ''} ${isTopTriageRequest ? 'border-l-4 border-l-[#F97316]' : ''}`}>
                  <td className="px-4 py-4 align-top">
                    <p className="font-medium text-sm text-[#0D1B2E]">
                      {getString(request, 'citizenName', 'CitizenName', 'fullName') || 'Unknown Citizen'}
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
                    <p className="text-[10px] text-[#5A7290] mt-1 font-mono">{requestId}</p>
                    {nearbyRequestCount !== undefined && (
                      <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[10px] font-medium">
                        Cluster · {nearbyRequestCount} nearby
                      </span>
                    )}
                    {isTopTriageRequest && (
                      <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] text-[10px] font-semibold">
                        Triage #{index + 1}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-1.5 items-start">
                      <Badge variant="primary">{category}</Badge>
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
                          {rawConfidence !== null && rawConfidence > 0 && (
                            <span className="text-[10px] bg-[#6D28D9]/10 text-[#6D28D9] px-1.5 py-0.5 rounded-full">
                              {Math.round(rawConfidence)}% conf.
                            </span>
                          )}
                        </div>
                        {aiSummary && (
                          <p className="text-[#0D1B2E] leading-snug" title={aiSummary}>{aiSummary}</p>
                        )}
                        {aiRecommendation && (
                          <p className="text-[#5A7290] leading-snug pt-1 border-t border-[#DDD6FE]/60" title={aiRecommendation}>
                            <strong className="text-[#6D28D9]">Action:</strong> {aiRecommendation}
                          </p>
                        )}
                        {canShowQuickAction && (
                          <button
                            type="button"
                            onClick={() => quickAction === 'monitor'
                              ? void handleUpdateStatus(requestId, 'Under Review', 'AI recommendation accepted: request marked Under Review.')
                              : void handleUpdateStatus(requestId, 'Assigned')}
                            disabled={isUpdating}
                            className="mt-1 inline-flex items-center rounded-md border border-[#C4B5FD] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6D28D9] hover:bg-[#EDE9FE] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {quickAction === 'monitor'
                              ? 'Accept & Monitor'
                              : quickAction === 'shelter'
                                ? 'Deploy Volunteer / Review Shelter'
                                : 'Deploy Volunteer'}
                          </button>
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
                      ) : hasCoordinates ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
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
                      {affectedCount} affected
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
                    {archivedView ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleUpdateStatus(
                          requestId,
                          'Under Review',
                          'Request reopened and moved to Active Queue.'
                        )}
                        disabled={isUpdating}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <select
                        className="bg-white border border-[#CBD8E6] text-[#0D1B2E] text-xs rounded-lg focus:ring-[#1A3A6B] focus:border-[#1A3A6B] block w-full p-2 disabled:opacity-50"
                        value={currentStatus}
                        onChange={(event) => void handleUpdateStatus(requestId, event.target.value)}
                        disabled={isUpdating}
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

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
          <div className="p-4 border-b border-[#CBD8E6] flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-semibold text-[#0D1B2E] font-[Outfit]">Live Assistance Requests</h3>
              <p className="text-xs text-[#5A7290] mt-0.5">
                {lifecycleMode === 'archived'
                  ? 'Archived case history · reopen a case to return it to the active queue'
                  : sortMode === 'recent'
                    ? 'Sorted by most recent first'
                    : 'Sorted by AI urgency & triage priority'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-[#F1F5F9] p-1" aria-label="Request lifecycle">
                <button
                  type="button"
                  onClick={() => setLifecycleMode('active')}
                  aria-pressed={lifecycleMode === 'active'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${lifecycleMode === 'active' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                >
                  Active Queue
                  <span className="rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] text-[#1D4ED8]">{activeQueueRequests.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLifecycleMode('archived');
                    setViewMode('all');
                  }}
                  aria-pressed={lifecycleMode === 'archived'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${lifecycleMode === 'archived' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                >
                  Archived / Closed
                  <span className="rounded-full bg-[#E2E8F0] px-1.5 py-0.5 text-[10px] text-[#475569]">{archivedRequests.length}</span>
                </button>
              </div>
              {lifecycleMode === 'active' && (
                <div className="inline-flex rounded-lg bg-[#F1F5F9] p-1" aria-label="Request view">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    aria-pressed={viewMode === 'all'}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                  >
                    All Requests
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('clusters')}
                    aria-pressed={viewMode === 'clusters'}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'clusters' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                  >
                    Incident Clusters
                    <span className="rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] text-[#1D4ED8]">{clusters.length}</span>
                  </button>
                </div>
              )}
              <div className="inline-flex rounded-lg bg-[#F1F5F9] p-1" aria-label="Request sort order">
                <button
                  type="button"
                  onClick={() => setSortMode('recent')}
                  aria-pressed={sortMode === 'recent'}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${sortMode === 'recent' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                >
                  Most Recent
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('priority')}
                  aria-pressed={sortMode === 'priority'}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${sortMode === 'priority' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
                >
                  AI Priority
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isLoading}>
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </div>
          {isLoading && requests.length === 0 ? (
            <div className="p-8 text-center text-[#5A7290]">Loading live requests...</div>
          ) : lifecycleMode === 'archived' ? (
            archivedRequests.length > 0
              ? renderRequestsTable(sortedArchivedRequests, true)
              : <div className="p-8 text-center text-[#5A7290]">No archived requests found.</div>
          ) : activeQueueRequests.length === 0 ? (
            <div className="p-8 text-center text-[#5A7290]">
              {archivedRequests.length > 0
                ? 'No active requests found. Archived cases are available in Archived / Closed.'
                : 'No active requests found.'}
            </div>
          ) : viewMode === 'all' ? (
            renderRequestsTable(sortedRequests)
          ) : (
            <div className="p-4 space-y-5">
              {clusters.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#5A7290]">No related incident clusters detected.</p>
              ) : (
                <div className="space-y-3">
                  {sortedClusters.map(cluster => {
                    const isExpanded = expandedClusters.has(cluster.id);
                    return (
                      <section key={cluster.id} className="rounded-xl border border-[#CBD8E6] bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <button
                            type="button"
                            onClick={() => setExpandedClusters(previous => {
                              const next = new Set(previous);
                              if (next.has(cluster.id)) next.delete(cluster.id);
                              else next.add(cluster.id);
                              return next;
                            })}
                            aria-expanded={isExpanded}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span className="text-[#5A7290]">
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-[#0D1B2E]">{cluster.location}</span>
                                <Badge variant="primary">{cluster.category}</Badge>
                                <Badge variant={getUrgencyVariant(cluster.highestUrgency)}>{cluster.highestUrgency} urgency</Badge>
                              </span>
                              <span className="mt-1 block text-xs text-[#5A7290]">
                                {cluster.requests.length} grouped reports · {cluster.affectedPeople} affected people
                              </span>
                            </span>
                          </button>
                          <Button
                            size="sm"
                            onClick={() => openClusterAssignment(cluster)}
                            disabled={isAssigning}
                          >
                            Assign 1 Volunteer to Cluster
                          </Button>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-[#E8EDF3] bg-[#F8FAFC] px-4 py-3">
                            <ul className="space-y-2">
                              {cluster.requests.map((request, index) => {
                                const id = getRequestId(request);
                                const description = getString(request, 'description', 'Description');
                                return (
                                  <li key={id || index} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className="font-medium text-[#0D1B2E]">{getString(request, 'citizenName', 'CitizenName') || 'Unknown Citizen'}</span>
                                    <span className="text-[#5A7290]">{description || 'No description provided'}</span>
                                    <StatusBadge status={normalizeStatusValue(getString(request, 'status', 'Status') || 'Submitted')} />
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-[#0D1B2E]">Standalone Requests</h4>
                {renderRequestsTable(sortedStandaloneRequests)}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={assignmentModalOpen}
        onClose={() => {
          if (isAssigning) return;
          setAssignmentModalOpen(false);
          setRequestsToAssign([]);
          setSelectedVolunteer('');
        }}
        title={requestsToAssign.length > 1 ? 'Assign Volunteer to Incident Cluster' : 'Assign Field Volunteer'}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAssignmentModalOpen(false);
                setRequestsToAssign([]);
                setSelectedVolunteer('');
              }}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button onClick={() => void confirmAssignment()} disabled={!selectedVolunteer || isAssigning}>
              {isAssigning ? 'Assigning...' : requestsToAssign.length > 1 ? `Assign to ${requestsToAssign.length} Requests` : 'Confirm Assignment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5A7290]">
            {requestsToAssign.length > 1
              ? `Select one verified volunteer to assign to each of the ${requestsToAssign.length} unassigned requests in this cluster.`
              : 'Select a verified volunteer to deploy to this request location. The citizen will be notified immediately.'}
          </p>

          <div>
            <label className="text-sm font-medium text-[#0D1B2E] block mb-1.5">Available Volunteers</label>
            <select
              className="bg-white border border-[#CBD8E6] text-[#0D1B2E] text-sm rounded-xl focus:ring-[#1A3A6B] focus:border-[#1A3A6B] block w-full p-3"
              value={selectedVolunteer}
              onChange={(event) => setSelectedVolunteer(event.target.value)}
              disabled={isAssigning}
            >
              <option value="">-- Select a Responder --</option>
              {volunteers.map((volunteer, index) => {
                const volunteerId = getVolunteerId(volunteer);
                return (
                  <option key={volunteerId || index} value={volunteerId}>
                    {getVolunteerName(volunteer)} {getString(volunteer, 'status', 'Status') === 'Active' ? '(Active)' : ''}
                  </option>
                );
              })}
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
