import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Archive, Box, CheckCircle, MapPin, Package, Plus, Send, Sparkles, Truck
} from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Badge, Button, Card, Input, KpiCard, Modal, SearchInput, Select } from '../components/ui';
import { useAppContext } from '../context';
import {
  apiClient,
  createResourceDispatch,
  getResourceDispatches,
  updateResourceDispatchStatus
} from '../api';
import type {
  CreateResourceDispatchRequest,
  ResourceDispatchStatus
} from '../api';
import { findIncidentClusters, RequestRecord } from '../utils/requestClustering';
import { isArchivedStatus } from '../utils/requestLifecycle';

type JsonRecord = Record<string, unknown>;
type DestinationMode = 'shelter' | 'citizen';
type SourceType = 'InKindDonation' | 'CampaignProcurement';
type DispatchStatus = 'Dispatched' | 'In Transit' | 'Delivered';
type ResourceNeed = 'water' | 'food' | 'medical';

interface Resource {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  status: string;
  lastUpdated: string;
  campaignId?: string;
  campaignTitle?: string;
  sourceType?: SourceType;
}

interface ShelterOption {
  id: string;
  name: string;
  district: string;
  status: string;
  capacity: number;
  occupied: number;
}

interface VolunteerOption {
  id: string;
  name: string;
}

interface CampaignOption {
  id: string;
  title: string;
}

interface SourceMetadata {
  campaignId?: string;
  campaignTitle?: string;
  sourceType?: SourceType | 'In-Kind Donation' | 'Campaign Fund Procurement';
}

type SourceMetadataMap = Record<string, SourceMetadata>;

interface DispatchRecord {
  batchId: string;
  dispatchId?: string;
  resourceId: string;
  resourceCategory?: string;
  itemName: string;
  quantity: number;
  unit: string;
  destinationType: 'Shelter' | 'Citizen / Cluster';
  destination: string;
  destinationId?: string;
  volunteerId?: string;
  volunteerName: string;
  campaignId?: string;
  sourceCampaign: string;
  timestamp: string;
  status: string;
}

interface DispatchDestinationOption {
  value: string;
  label: string;
}

interface AllocationRecommendation {
  id: string;
  resource: Resource;
  quantity: number;
  destinationMode: DestinationMode;
  destinationId: string;
  destinationLabel: string;
  allocationArea: string;
  title: string;
  detail: string;
  priority: number;
}

interface RecommendationState {
  items: AllocationRecommendation[];
  allCandidatesDispatched: boolean;
}

interface DispatchForm {
  destinationMode: DestinationMode;
  destinationId: string;
  destinationName: string;
  destinationRequestId: string;
  dispatchQuantity: string;
  volunteerId: string;
}

const SOURCE_METADATA_KEY = 'sevana_resource_source_metadata';
const DISPATCH_QUEUE_KEY = 'sevana_resource_dispatch_queue';
const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'InKindDonation', label: 'In-Kind Donation' },
  { value: 'CampaignProcurement', label: 'Campaign Fund Procurement' }
];
const DISPATCH_STATUSES: DispatchStatus[] = ['Dispatched', 'In Transit', 'Delivered'];

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

function getSourceTypeLabel(sourceType: SourceMetadata['sourceType']): string {
  if (sourceType === 'InKindDonation' || sourceType === 'In-Kind Donation') return 'In-Kind Donation';
  if (sourceType === 'CampaignProcurement' || sourceType === 'Campaign Fund Procurement') {
    return 'Campaign Fund Procurement';
  }
  return '';
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(record: JsonRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function getNumber(record: JsonRecord, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function unwrapRecords(response: unknown): JsonRecord[] {
  if (Array.isArray(response)) return response.filter(isRecord);
  if (!isRecord(response)) return [];
  const data = response.data ?? response.items;
  return Array.isArray(data) ? data.filter(isRecord) : [];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeResource(record: JsonRecord, index: number): Resource {
  const rawSourceType = getString(record, 'sourceType', 'SourceType');
  const sourceType = rawSourceType === 'InKindDonation' || rawSourceType === 'CampaignProcurement'
    ? rawSourceType
    : undefined;
  return {
    id: getString(record, 'id', 'Id') || `resource-${index}`,
    itemName: getString(record, 'itemName', 'ItemName') || 'Unnamed item',
    category: getString(record, 'category', 'Category') || 'Other',
    quantity: Math.max(0, getNumber(record, 'quantity', 'Quantity')),
    unit: getString(record, 'unit', 'Unit') || 'Units',
    location: getString(record, 'location', 'Location') || 'Unknown location',
    status: getString(record, 'status', 'Status') || 'Available',
    lastUpdated: getString(record, 'lastUpdated', 'LastUpdated') || new Date().toISOString(),
    campaignId: getString(record, 'campaignId', 'CampaignId') || undefined,
    campaignTitle: getString(record, 'campaignTitle', 'CampaignTitle', 'campaignName', 'CampaignName') || undefined,
    sourceType
  };
}

function normalizeShelter(record: JsonRecord): ShelterOption {
  return {
    id: getString(record, 'id', 'Id'),
    name: getString(record, 'name', 'Name') || 'Unnamed Shelter',
    district: getString(record, 'district', 'District'),
    status: getString(record, 'status', 'Status') || 'Open',
    capacity: Math.max(0, getNumber(record, 'capacity', 'Capacity')),
    occupied: Math.max(0, getNumber(record, 'occupiedSpaces', 'OccupiedSpaces', 'occupied', 'Occupied'))
  };
}

function normalizeVolunteer(record: JsonRecord): VolunteerOption {
  return {
    id: getString(record, 'id', 'Id', 'userId', 'UserId'),
    name: getString(record, 'fullName', 'FullName', 'name', 'Name') || 'Unnamed Volunteer'
  };
}

function normalizeCampaign(record: JsonRecord): CampaignOption | null {
  const status = (getString(record, 'status', 'Status') || 'Active').toLowerCase();
  const id = getString(record, 'id', 'Id');
  const title = getString(record, 'title', 'Title', 'name', 'Name');
  return status === 'active' && id && title ? { id, title } : null;
}

function isActiveShelter(shelter: ShelterOption): boolean {
  return !['closed', 'inactive', 'archived'].includes(shelter.status.trim().toLowerCase());
}

function getRequestId(request: RequestRecord): string {
  return getString(request, 'id', 'Id');
}

function getRequestLabel(request: RequestRecord): string {
  const citizen = getString(request, 'citizenName', 'CitizenName') || 'Citizen';
  const category = getString(request, 'category', 'Category') || 'Assistance';
  const urgency = getString(request, 'urgency', 'Urgency', 'priority', 'Priority') || 'Medium';
  const location = getString(request, 'location', 'Location') || 'No location';
  return `${citizen} · ${category} (${urgency}) · ${location}`;
}

function getAffectedCount(request: RequestRecord): number {
  const value = getNumber(
    request,
    'affectedPeopleCount',
    'AffectedPeopleCount',
    'affectedCount',
    'AffectedCount',
    'affected',
    'Affected'
  );
  return value > 0 ? value : 1;
}

function getUrgencyRank(request: RequestRecord): number {
  const urgency = getString(
    request,
    'priority',
    'Priority',
    'urgency',
    'Urgency',
    'calculatedUrgency',
    'CalculatedUrgency'
  ).toLowerCase();
  if (urgency === 'critical' || urgency === 'emergency') return 4;
  if (urgency === 'high' || urgency === 'urgent') return 3;
  if (urgency === 'medium' || urgency === 'moderate') return 2;
  return 1;
}

function getResourceNeed(resource: Resource): ResourceNeed | null {
  const text = `${resource.itemName} ${resource.category}`.toLowerCase();
  if (/water|hydration|drinking/.test(text)) return 'water';
  if (/food|meal|ration|grocery/.test(text)) return 'food';
  if (/medical|medicine|medication|health|first aid/.test(text)) return 'medical';
  return null;
}

function getCanonicalResourceCategory(category: string): string {
  const normalized = category.toLowerCase();
  if (/water|hydration|drinking/.test(normalized)) return 'water';
  if (/food|meal|ration|grocery/.test(normalized)) return 'food';
  if (/medical|medicine|medication|health|first aid/.test(normalized)) return 'medical';
  return normalized.replace(/[^a-z0-9]+/g, ' ').trim();
}

function isRecommendationDispatchStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return normalized === 'dispatched' || normalized === 'intransit' || normalized === 'delivered';
}

function normalizeRecommendationKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function requestMatchesNeed(requests: readonly RequestRecord[], need: ResourceNeed): boolean {
  const text = requests
    .map(request => [
      getString(request, 'category', 'Category'),
      getString(request, 'description', 'Description'),
      getString(request, 'aiSummary', 'AiSummary'),
      getString(request, 'aiRecommendation', 'AiRecommendation')
    ].join(' '))
    .join(' ')
    .toLowerCase();

  if (need === 'water') return /water|hydration|thirst|drinking/.test(text);
  if (need === 'food') return /food|meal|ration|grocery|hungry/.test(text);
  return /medical|medicine|medication|health|injur|first aid/.test(text);
}

function isSourceMetadata(value: unknown): value is SourceMetadata {
  if (!isRecord(value)) return false;
  return (value.sourceType === undefined ||
    value.sourceType === 'InKindDonation' ||
    value.sourceType === 'CampaignProcurement' ||
    value.sourceType === 'In-Kind Donation' ||
    value.sourceType === 'Campaign Fund Procurement') &&
    (value.campaignId === undefined || typeof value.campaignId === 'string') &&
    (value.campaignTitle === undefined || typeof value.campaignTitle === 'string');
}

function isSourceMetadataMap(value: unknown): value is SourceMetadataMap {
  return isRecord(value) && Object.values(value).every(isSourceMetadata);
}

function isLocalDispatch(value: unknown): value is DispatchRecord {
  if (!isRecord(value)) return false;
  return typeof value.batchId === 'string' &&
    typeof value.resourceId === 'string' &&
    typeof value.itemName === 'string' &&
    typeof value.quantity === 'number' &&
    typeof value.unit === 'string' &&
    (value.destinationType === 'Shelter' || value.destinationType === 'Citizen / Cluster') &&
    typeof value.destination === 'string' &&
    typeof value.volunteerName === 'string' &&
    typeof value.sourceCampaign === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.status === 'string' &&
    (value.dispatchId === undefined || typeof value.dispatchId === 'string') &&
    (value.resourceCategory === undefined || typeof value.resourceCategory === 'string') &&
    (value.destinationId === undefined || typeof value.destinationId === 'string') &&
    (value.volunteerId === undefined || typeof value.volunteerId === 'string') &&
    (value.campaignId === undefined || typeof value.campaignId === 'string');
}

function getStoredDispatches(): DispatchRecord[] {
  try {
    const stored = localStorage.getItem(DISPATCH_QUEUE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isLocalDispatch)) return parsed;
    console.warn('Stored dispatch tracking data has an invalid format.');
  } catch (error: unknown) {
    console.warn('Failed to restore locally saved dispatch tracking data.', error);
  }
  return [];
}

function getUiDispatchStatus(status: string): string {
  const normalized = status.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'dispatched') return 'Dispatched';
  if (normalized === 'delivered') return 'Delivered';
  if (normalized === 'intransit') return 'In Transit';
  return status.trim() || 'Dispatched';
}

function getApiDispatchStatus(status: DispatchStatus): ResourceDispatchStatus {
  return status === 'In Transit' ? 'InTransit' : status;
}

function normalizeDispatch(
  record: JsonRecord,
  index: number,
  resources: readonly Resource[],
  shelters: readonly ShelterOption[],
  requests: readonly RequestRecord[],
  volunteers: readonly VolunteerOption[],
  campaigns: readonly CampaignOption[]
): DispatchRecord {
  const dispatchId = getString(record, 'dispatchId', 'DispatchId', 'id', 'Id');
  const resourceId = getString(record, 'resourceId', 'ResourceId');
  const resource = resources.find(item => item.id === resourceId);
  const rawDestinationType = getString(record, 'destinationType', 'DestinationType');
  const destinationType = rawDestinationType.toLowerCase() === 'shelter'
    ? 'Shelter'
    : 'Citizen / Cluster';
  const destinationId = getString(record, 'destinationId', 'DestinationId');
  const shelter = destinationType === 'Shelter'
    ? shelters.find(item => item.id === destinationId)
    : undefined;
  const request = destinationType !== 'Shelter'
    ? requests.find(item => getRequestId(item) === destinationId)
    : undefined;
  const volunteerId = getString(record, 'volunteerId', 'VolunteerId');
  const volunteer = volunteers.find(item => item.id === volunteerId);
  const campaignId = getString(record, 'campaignId', 'CampaignId');
  const campaign = campaigns.find(item => item.id === campaignId);
  const nestedResource = isRecord(record.resource) ? record.resource : {};
  const nestedVolunteer = isRecord(record.volunteer) ? record.volunteer : {};
  const nestedCampaign = isRecord(record.campaign) ? record.campaign : {};
  const nestedDestination = isRecord(record.destination) ? record.destination : {};
  const destinationName = getString(
    record,
    'destinationName',
    'DestinationName',
    'destinationLabel',
    'DestinationLabel'
  ) || getString(nestedDestination, 'name', 'Name', 'label', 'Label') ||
    shelter?.name ||
    (request ? getRequestLabel(request) : '');
  const quantity = getNumber(record, 'quantity', 'Quantity');
  const timestamp = getString(record, 'createdAtUtc', 'CreatedAtUtc', 'dispatchedAtUtc', 'DispatchedAtUtc')
    || new Date().toISOString();
  const mappedStatus = getUiDispatchStatus(getString(record, 'status', 'Status'));
  const itemName = getString(record, 'itemName', 'ItemName') ||
    getString(nestedResource, 'itemName', 'ItemName', 'name', 'Name') ||
    resource?.itemName ||
    'Resource';

  return {
    batchId: dispatchId || getString(record, 'batchId', 'BatchId') || `DSP-${index + 1}`,
    ...(isGuid(dispatchId) ? { dispatchId } : {}),
    resourceId,
    resourceCategory: getString(record, 'resourceCategory', 'ResourceCategory') ||
      getString(nestedResource, 'category', 'Category') ||
      resource?.category ||
      '',
    itemName,
    quantity,
    unit: getString(record, 'unit', 'Unit') ||
      getString(nestedResource, 'unit', 'Unit') ||
      resource?.unit ||
      'Units',
    destinationType,
    destination: destinationName || destinationId,
    ...(isGuid(destinationId) ? { destinationId } : {}),
    ...(isGuid(volunteerId) ? { volunteerId } : {}),
    volunteerName: getString(record, 'volunteerName', 'VolunteerName') ||
      getString(nestedVolunteer, 'fullName', 'FullName', 'name', 'Name') ||
      volunteer?.name ||
      'Unassigned',
    ...(isGuid(campaignId) ? { campaignId } : {}),
    sourceCampaign: getString(record, 'campaignTitle', 'CampaignTitle', 'campaignName', 'CampaignName') ||
      getString(nestedCampaign, 'title', 'Title', 'name', 'Name') ||
      campaign?.title ||
      '',
    timestamp,
    status: mappedStatus
  };
}

export function ResourceManagement() {
  const { addToast } = useAppContext();
  const [resources, setResources] = useState<Resource[]>([]);
  const [shelters, setShelters] = useState<ShelterOption[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadataMap>({});
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dispatchModalData, setDispatchModalData] = useState<Resource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    itemName: '',
    category: 'Food',
    quantity: '',
    unit: 'Parcels',
    location: '',
    sourceCampaignId: '',
    sourceType: '' as SourceType | ''
  });
  const [dispatchForm, setDispatchForm] = useState<DispatchForm>({
    destinationMode: 'shelter',
    destinationId: '',
    destinationName: '',
    destinationRequestId: '',
    dispatchQuantity: '',
    volunteerId: ''
  });

  const loadResources = useCallback(async (): Promise<Resource[]> => {
    setIsLoading(true);
    try {
      const response: unknown = await apiClient('/api/v1/resources', { method: 'GET' });
      const normalized = unwrapRecords(response).map(normalizeResource);
      setResources(normalized);
      return normalized;
    } catch (error: unknown) {
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to load resources.') });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const loadSupportingData = useCallback(async () => {
    const endpoints = [
      apiClient('/api/v1/coordinator/requests', { method: 'GET' }),
      apiClient('/api/v1/shelters', { method: 'GET' }),
      apiClient('/api/v1/volunteers?activeOnly=true', { method: 'GET' }),
      apiClient('/api/v1/campaigns', { method: 'GET' })
    ] as const;
    const [requestResult, shelterResult, volunteerResult, campaignResult] = await Promise.allSettled(endpoints);

    if (requestResult.status === 'fulfilled') {
      setRequests(unwrapRecords(requestResult.value));
    } else {
      setRequests([]);
      addToast({ type: 'error', message: getErrorMessage(requestResult.reason, 'Failed to load assistance requests.') });
    }

    if (shelterResult.status === 'fulfilled') {
      setShelters(unwrapRecords(shelterResult.value).map(normalizeShelter).filter(shelter => shelter.id));
    } else {
      setShelters([]);
      addToast({ type: 'error', message: getErrorMessage(shelterResult.reason, 'Failed to load shelters.') });
    }

    if (volunteerResult.status === 'fulfilled') {
      setVolunteers(unwrapRecords(volunteerResult.value).map(normalizeVolunteer).filter(volunteer => volunteer.id));
    } else {
      setVolunteers([]);
      addToast({ type: 'error', message: getErrorMessage(volunteerResult.reason, 'Failed to load active volunteers.') });
    }

    if (campaignResult.status === 'fulfilled') {
      setCampaigns(
        unwrapRecords(campaignResult.value)
          .map(normalizeCampaign)
          .filter((campaign): campaign is CampaignOption => campaign !== null)
      );
    } else {
      setCampaigns([]);
      addToast({ type: 'error', message: getErrorMessage(campaignResult.reason, 'Failed to load campaigns.') });
    }
  }, [addToast]);

  const saveLocalData = useCallback((key: string, value: unknown, errorMessage: string) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error: unknown) {
      console.error(errorMessage, error);
      addToast({ type: 'error', message: getErrorMessage(error, errorMessage) });
    }
  }, [addToast]);

  const loadDispatchQueue = useCallback(async () => {
    const storedDispatches = getStoredDispatches();
    try {
      const response = await getResourceDispatches();
      const apiDispatches = unwrapRecords(response)
        .map((record, index) => normalizeDispatch(
          record,
          index,
          resources,
          shelters,
          requests,
          volunteers,
          campaigns
        ));
      const apiIds = new Set(apiDispatches.flatMap(dispatch => dispatch.dispatchId ? [dispatch.dispatchId] : []));
      const localOnly = storedDispatches.filter(dispatch => {
        if (dispatch.dispatchId && apiIds.has(dispatch.dispatchId)) return false;
        const mirroredByApi = apiDispatches.some(apiDispatch =>
          apiDispatch.resourceId === dispatch.resourceId &&
          apiDispatch.destinationId === dispatch.destinationId &&
          apiDispatch.quantity === dispatch.quantity &&
          Math.abs(new Date(apiDispatch.timestamp).getTime() - new Date(dispatch.timestamp).getTime()) < 60_000
        );
        return !mirroredByApi;
      });
      const combined = [...apiDispatches, ...localOnly];
      setDispatches(combined);
      saveLocalData(DISPATCH_QUEUE_KEY, combined, 'Failed to save the dispatch tracking queue.');
      return combined;
    } catch (error: unknown) {
      console.warn('Live dispatch history is unavailable; showing locally stored dispatches.', error);
      setDispatches(storedDispatches);
      return storedDispatches;
    }
  }, [campaigns, requests, resources, saveLocalData, shelters, volunteers]);

  useEffect(() => {
    void loadResources();
    void loadSupportingData();

    try {
      const metadataText = localStorage.getItem(SOURCE_METADATA_KEY);
      if (metadataText) {
        const metadata: unknown = JSON.parse(metadataText);
        if (!isSourceMetadataMap(metadata)) throw new Error('Stored resource source metadata has an invalid format.');
        setSourceMetadata(metadata);
      }

    } catch (error: unknown) {
      console.error('Failed to restore resource tracking data.', error);
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to restore locally saved resource tracking data.') });
    }
  }, [addToast, loadResources, loadSupportingData]);

  useEffect(() => {
    void loadDispatchQueue();
  }, [loadDispatchQueue]);

  const activeRequests = useMemo(
    () => requests.filter(request => !isArchivedStatus(request.status ?? request.Status)),
    [requests]
  );
  const activeShelters = useMemo(() => shelters.filter(isActiveShelter), [shelters]);
  const clusters = useMemo(() => findIncidentClusters(activeRequests), [activeRequests]);

  const requestOptions = useMemo<DispatchDestinationOption[]>(
    () => activeRequests
      .filter(request => isGuid(getRequestId(request)))
      .map(request => ({ value: `request:${getRequestId(request)}`, label: getRequestLabel(request) })),
    [activeRequests]
  );
  const clusterOptions = useMemo<DispatchDestinationOption[]>(
    () => clusters.map(cluster => ({
      value: `cluster:${cluster.id}`,
      label: `${cluster.location} · ${cluster.category} · ${cluster.requests.length} reports`
    })),
    [clusters]
  );
  const citizenDestinationOptions = useMemo(
    () => [...clusterOptions, ...requestOptions],
    [clusterOptions, requestOptions]
  );

  const recommendationState = useMemo<RecommendationState>(() => {
    const availableResources = resources.filter(resource => resource.quantity > 0);
    const suggestions: AllocationRecommendation[] = [];
    const clusteredRequestIds = new Set(
      clusters.flatMap(cluster => cluster.requests.map(getRequestId).filter(Boolean))
    );

    for (const cluster of clusters) {
      const clusterRequestIds = cluster.requests
        .map(getRequestId)
        .filter(isGuid);
      if (clusterRequestIds.length === 0) continue;
      const urgency = cluster.requests.reduce(
        (highest, request) => Math.max(highest, getUrgencyRank(request)),
        1
      );
      const affected = cluster.affectedPeople;
      if (urgency < 3 && affected < 5) continue;

      for (const resource of availableResources) {
        const need = getResourceNeed(resource);
        if (!need || !requestMatchesNeed(cluster.requests, need)) continue;
        const quantity = Math.min(
          resource.quantity,
          Math.max(1, Math.ceil(affected * (need === 'water' ? 2 : 1.5)))
        );
        suggestions.push({
          id: `cluster:${cluster.id}:${resource.id}`,
          resource,
          quantity,
          destinationMode: 'citizen',
          destinationId: `cluster:${cluster.id}`,
          destinationLabel: `${cluster.location} · ${cluster.category} · ${cluster.requests.length} reports`,
          allocationArea: cluster.location,
          title: `${urgency >= 4 ? 'Critical' : 'High'} Demand · ${cluster.location}`,
          detail: `${affected} people affected across ${cluster.requests.length} related reports`,
          priority: urgency * 100 + Math.min(affected, 99)
        });
      }
    }

    for (const request of activeRequests) {
      const requestId = getRequestId(request);
      if (!isGuid(requestId) || clusteredRequestIds.has(requestId)) continue;
      const urgency = getUrgencyRank(request);
      const affected = getAffectedCount(request);
      if (urgency < 3 && affected < 5) continue;

      for (const resource of availableResources) {
        const need = getResourceNeed(resource);
        if (!need || !requestMatchesNeed([request], need)) continue;
        const quantity = Math.min(
          resource.quantity,
          Math.max(1, Math.ceil(affected * (need === 'water' ? 2 : 1.5)))
        );
        const destinationLabel = getRequestLabel(request);
        suggestions.push({
          id: `request:${requestId}:${resource.id}`,
          resource,
          quantity,
          destinationMode: 'citizen',
          destinationId: `request:${requestId}`,
          destinationLabel,
          allocationArea: getString(request, 'location', 'Location') || destinationLabel,
          title: `${urgency >= 4 ? 'Critical' : 'High'} Demand · ${getString(request, 'location', 'Location') || 'Request location'}`,
          detail: `${affected} people affected · ${getString(request, 'category', 'Category') || 'Assistance'}`,
          priority: urgency * 100 + Math.min(affected, 99)
        });
      }
    }

    for (const shelter of activeShelters) {
      if (shelter.capacity <= 0 && shelter.occupied <= 0) continue;
      const occupancyRatio = shelter.capacity > 0
        ? Math.min(1, shelter.occupied / shelter.capacity)
        : 0;
      const demand = Math.max(shelter.occupied, Math.ceil(shelter.capacity * 0.25), 1);
      const shelterLabel = `${shelter.name}${shelter.district ? ` · ${shelter.district}` : ''}`;

      for (const resource of availableResources) {
        const need = getResourceNeed(resource);
        if (!need || !isGuid(shelter.id)) continue;
        const quantity = Math.min(
          resource.quantity,
          Math.max(1, Math.ceil(demand * (need === 'water' ? 2 : 1)))
        );
        suggestions.push({
          id: `shelter:${shelter.id}:${resource.id}`,
          resource,
          quantity,
          destinationMode: 'shelter',
          destinationId: shelter.id,
          destinationLabel: shelterLabel,
          allocationArea: shelterLabel,
          title: `Shelter Restock · ${shelter.name}`,
          detail: `${shelter.occupied.toLocaleString()} occupied · ${shelter.capacity.toLocaleString()} capacity`,
          priority: 100 + Math.round(occupancyRatio * 100) + Math.min(shelter.occupied, 99)
        });
      }
    }

    const resourceById = new Map(resources.map(resource => [resource.id, resource]));
    const eligibleSuggestions = suggestions.filter(suggestion => {
      const isShelter = suggestion.destinationMode === 'shelter';
      const targetIds = isShelter
        ? [suggestion.destinationId]
        : suggestion.destinationId.startsWith('cluster:')
          ? clusters
            .find(cluster => `cluster:${cluster.id}` === suggestion.destinationId)
            ?.requests.map(getRequestId)
            .filter(isGuid) || []
          : [suggestion.destinationId.replace(/^request:/, '')];
      const candidateCategory = getCanonicalResourceCategory(suggestion.resource.category);

      return !dispatches.some(dispatch => {
        if (!isRecommendationDispatchStatus(dispatch.status)) return false;
        if (isShelter !== (dispatch.destinationType === 'Shelter')) return false;
        if (!dispatch.destinationId || !targetIds.includes(dispatch.destinationId)) return false;

        const dispatchedResource = resourceById.get(dispatch.resourceId);
        const dispatchedCategory = getCanonicalResourceCategory(
          dispatch.resourceCategory || dispatchedResource?.category || ''
        );
        return dispatch.resourceId === suggestion.resource.id ||
          (!!dispatchedCategory && dispatchedCategory === candidateCategory);
      });
    });

    const deduplicatedSuggestions = new Map<string, AllocationRecommendation>();
    for (const suggestion of eligibleSuggestions) {
      const need = getResourceNeed(suggestion.resource) ||
        getCanonicalResourceCategory(suggestion.resource.category);
      const groupKey = [
        suggestion.destinationMode,
        normalizeRecommendationKey(suggestion.allocationArea || suggestion.destinationId),
        need
      ].join(':');
      const existing = deduplicatedSuggestions.get(groupKey);
      if (
        !existing ||
        suggestion.resource.quantity > existing.resource.quantity ||
        (suggestion.resource.quantity === existing.resource.quantity &&
          suggestion.resource.id.localeCompare(existing.resource.id) < 0)
      ) {
        deduplicatedSuggestions.set(groupKey, suggestion);
      }
    }

    return {
      items: [...deduplicatedSuggestions.values()]
        .sort((first, second) => second.priority - first.priority)
        .slice(0, 4),
      allCandidatesDispatched: suggestions.length > 0 && eligibleSuggestions.length === 0
    };
  }, [activeRequests, activeShelters, clusters, dispatches, resources]);
  const recommendations = recommendationState.items;

  const filteredResources = resources.filter(resource =>
    resource.itemName.toLowerCase().includes(search.toLowerCase()) ||
    resource.location.toLowerCase().includes(search.toLowerCase())
  );
  const totalItems = resources.reduce((total, resource) => total + resource.quantity, 0);
  const lowStockItems = resources.filter(resource => resource.quantity > 0 && resource.quantity < 50).length;
  const outOfStockItems = resources.filter(
    resource => resource.quantity === 0 || resource.status.toLowerCase() === 'outofstock'
  ).length;

  const openDispatchModal = (resource: Resource) => {
    setDispatchModalData(resource);
    setDispatchForm({
      destinationMode: 'shelter',
      destinationId: '',
      destinationName: '',
      destinationRequestId: '',
      dispatchQuantity: '',
      volunteerId: ''
    });
  };

  const openRecommendedDispatch = (recommendation: AllocationRecommendation) => {
    const [targetType, targetId] = recommendation.destinationId.split(':', 2);
    const cluster = targetType === 'cluster'
      ? clusters.find(option => option.id === targetId)
      : undefined;
    const requestId = cluster
      ? getRequestId(cluster.requests.find(request => isGuid(getRequestId(request))) || {})
      : targetType === 'request' && isGuid(targetId)
        ? targetId
        : '';
    setDispatchModalData(recommendation.resource);
    setDispatchForm({
      destinationMode: recommendation.destinationMode,
      destinationId: recommendation.destinationId,
      destinationName: recommendation.destinationLabel,
      destinationRequestId: requestId,
      dispatchQuantity: String(recommendation.quantity),
      volunteerId: ''
    });
  };

  const handleAddResource = async () => {
    const quantity = Number(addForm.quantity);
    if (!addForm.itemName.trim() || !Number.isInteger(quantity) || quantity <= 0 || !addForm.location.trim()) {
      addToast({ type: 'error', message: 'Enter an item name, a positive whole-number quantity, and a storage location.' });
      return;
    }

    const selectedCampaign = campaigns.find(campaign => campaign.id === addForm.sourceCampaignId);
    if (addForm.sourceCampaignId && (!selectedCampaign || !isGuid(selectedCampaign.id))) {
      addToast({ type: 'error', message: 'Select a valid campaign before adding stock.' });
      return;
    }
    const existingIds = new Set(resources.map(resource => resource.id));
    setIsSubmitting(true);
    try {
      const response: unknown = await apiClient('/api/v1/resources', {
        method: 'POST',
        body: JSON.stringify({
          itemName: addForm.itemName.trim(),
          category: addForm.category,
          quantity,
          unit: addForm.unit.trim(),
          location: addForm.location.trim(),
          ...(selectedCampaign ? { campaignId: selectedCampaign.id } : {}),
          ...(addForm.sourceType ? { sourceType: addForm.sourceType } : {})
        })
      });

      const responseRecord = isRecord(response) ? response : {};
      const responseData = isRecord(responseRecord.data) ? responseRecord.data : responseRecord;
      let resourceId = getString(responseData, 'id', 'Id');
      const refreshedResources = await loadResources();

      if (!resourceId) {
        const matchingNewResources = refreshedResources.filter(resource =>
          !existingIds.has(resource.id) &&
          resource.itemName.toLowerCase() === addForm.itemName.trim().toLowerCase() &&
          resource.category.toLowerCase() === addForm.category.toLowerCase() &&
          resource.quantity === quantity &&
          resource.location.toLowerCase() === addForm.location.trim().toLowerCase()
        );
        if (matchingNewResources.length === 1) resourceId = matchingNewResources[0].id;
      }

      if (resourceId && isGuid(resourceId)) {
        const metadata = { ...sourceMetadata };
        if (selectedCampaign || addForm.sourceType) {
          metadata[resourceId] = {
            ...(selectedCampaign ? { campaignId: selectedCampaign.id, campaignTitle: selectedCampaign.title } : {}),
            ...(addForm.sourceType ? { sourceType: addForm.sourceType } : {})
          };
          setSourceMetadata(metadata);
          saveLocalData(SOURCE_METADATA_KEY, metadata, 'Failed to save the resource source tag.');
        }
      } else if (selectedCampaign || addForm.sourceType) {
        addToast({
          type: 'error',
          message: 'Resource was added, but its source metadata could not be linked because the inventory item ID was unavailable.'
        });
      }

      addToast({ type: 'success', message: 'Resource added to inventory.' });
      setIsAddModalOpen(false);
      setAddForm({
        itemName: '',
        category: 'Food',
        quantity: '',
        unit: 'Parcels',
        location: '',
        sourceCampaignId: '',
        sourceType: ''
      });
    } catch (error: unknown) {
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to add resource.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchModalData) return;
    const quantity = Number(dispatchForm.dispatchQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      addToast({ type: 'error', message: 'Enter a positive whole-number dispatch quantity.' });
      return;
    }
    if (quantity > dispatchModalData.quantity) {
      addToast({
        type: 'error',
        message: `Cannot dispatch more than the available stock (${dispatchModalData.quantity}).`
      });
      return;
    }

    let destinationId = '';
    let destinationLabel = '';
    let destinationType: CreateResourceDispatchRequest['destinationType'];
    if (dispatchForm.destinationMode === 'shelter') {
      const shelter = activeShelters.find(option => option.id === dispatchForm.destinationId);
      if (!shelter || !isGuid(shelter.id)) {
        addToast({ type: 'error', message: 'Select an active shelter with a valid ID.' });
        return;
      }
      destinationId = shelter.id;
      destinationLabel = shelter.name;
      destinationType = 'Shelter';
    } else {
      const selectedDestination = citizenDestinationOptions.find(
        option => option.value === dispatchForm.destinationId
      );
      if (!selectedDestination) {
        addToast({ type: 'error', message: 'Select an active assistance request or incident cluster.' });
        return;
      }
      const [targetType, targetId] = dispatchForm.destinationId.split(':', 2);
      if (targetType === 'cluster') {
        const cluster = clusters.find(option => option.id === targetId);
        const selectedRequest = cluster?.requests.find(
          request => getRequestId(request) === dispatchForm.destinationRequestId
        );
        if (!selectedRequest || !isGuid(getRequestId(selectedRequest))) {
          addToast({ type: 'error', message: 'Choose a specific active request from the selected incident cluster.' });
          return;
        }
        destinationId = getRequestId(selectedRequest);
      } else if (targetType === 'request' && isGuid(targetId)) {
        destinationId = targetId;
      } else {
        addToast({ type: 'error', message: 'Select a valid active assistance request.' });
        return;
      }
      destinationLabel = selectedDestination.label;
      destinationType = 'CitizenRequest';
    }

    const volunteer = volunteers.find(option => option.id === dispatchForm.volunteerId);
    const linkedSource = sourceMetadata[dispatchModalData.id];
    const campaignId = dispatchModalData.campaignId || linkedSource?.campaignId || '';
    const volunteerId = dispatchForm.volunteerId;
    if (!isGuid(dispatchModalData.id)) {
      addToast({ type: 'error', message: 'This inventory item has no valid resource ID and cannot be dispatched.' });
      return;
    }
    if (volunteerId && (!isGuid(volunteerId) || !volunteer)) {
      addToast({ type: 'error', message: 'Select a valid active volunteer or leave the assignment empty.' });
      return;
    }
    if (campaignId && !isGuid(campaignId)) {
      addToast({ type: 'error', message: 'The linked campaign ID is invalid; refresh inventory before dispatching.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateResourceDispatchRequest = {
        resourceId: dispatchModalData.id,
        quantity,
        destinationType,
        destinationId,
        ...(volunteerId ? { volunteerId } : {}),
        ...(campaignId ? { campaignId } : {})
      };
      const response = await createResourceDispatch(payload);
      const responseRecord = isRecord(response) ? response : {};
      const responseData = isRecord(responseRecord.data) ? responseRecord.data : responseRecord;
      const dispatchId = getString(responseData, 'dispatchId', 'DispatchId', 'id', 'Id');
      const campaignTitle = campaigns.find(item => item.id === campaignId)?.title ||
        linkedSource?.campaignTitle ||
        '';
      const localRecord: DispatchRecord = {
        batchId: isGuid(dispatchId) ? dispatchId : `DSP-${Date.now().toString(36).toUpperCase()}`,
        ...(isGuid(dispatchId) ? { dispatchId } : {}),
        resourceId: dispatchModalData.id,
        resourceCategory: dispatchModalData.category,
        itemName: dispatchModalData.itemName,
        quantity,
        unit: dispatchModalData.unit,
        destinationType: destinationType === 'Shelter' ? 'Shelter' : 'Citizen / Cluster',
        destination: destinationLabel,
        destinationId,
        ...(volunteerId ? { volunteerId } : {}),
        volunteerName: volunteer?.name || 'Unassigned',
        ...(campaignId ? { campaignId } : {}),
        sourceCampaign: campaignTitle,
        timestamp: new Date().toISOString(),
        status: 'Dispatched'
      };
      const immediatelyUpdatedDispatches = [
        localRecord,
        ...dispatches.filter(dispatch => !dispatchId || dispatch.dispatchId !== dispatchId)
      ];
      setDispatches(immediatelyUpdatedDispatches);
      saveLocalData(
        DISPATCH_QUEUE_KEY,
        immediatelyUpdatedDispatches,
        'Failed to save the dispatch tracking record.'
      );

      addToast({
        type: 'success',
        message: `Successfully dispatched ${quantity} ${dispatchModalData.unit} to ${destinationLabel}.`
      });
      if (!isGuid(dispatchId)) {
        addToast({
          type: 'error',
          message: 'Dispatch succeeded, but the backend did not return a valid dispatch ID. Status updates are unavailable for this batch.'
        });
      }
      setDispatchModalData(null);
      setDispatchForm({
        destinationMode: 'shelter',
        destinationId: '',
        destinationName: '',
        destinationRequestId: '',
        dispatchQuantity: '',
        volunteerId: ''
      });
      await Promise.all([loadResources(), loadDispatchQueue()]);
    } catch (error: unknown) {
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to dispatch resources.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDispatchStatus = async (dispatch: DispatchRecord) => {
    if (!dispatch.dispatchId || !isGuid(dispatch.dispatchId)) {
      addToast({ type: 'error', message: 'This dispatch has no valid backend ID and cannot be updated.' });
      return;
    }
    const currentIndex = DISPATCH_STATUSES.findIndex(status => status === dispatch.status);
    if (currentIndex < 0) return;
    const nextStatus = DISPATCH_STATUSES[Math.min(currentIndex + 1, DISPATCH_STATUSES.length - 1)];
    if (nextStatus === dispatch.status) return;
    setIsSubmitting(true);
    try {
      await updateResourceDispatchStatus(dispatch.dispatchId, getApiDispatchStatus(nextStatus));
      const updatedDispatches = dispatches.map(item =>
        item.dispatchId === dispatch.dispatchId ? { ...item, status: nextStatus } : item
      );
      setDispatches(updatedDispatches);
      saveLocalData(DISPATCH_QUEUE_KEY, updatedDispatches, 'Failed to save the updated delivery status.');
    } catch (error: unknown) {
      addToast({ type: 'error', message: getErrorMessage(error, 'Failed to update dispatch status.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dispatchShelterOptions = useMemo<DispatchDestinationOption[]>(
    () => activeShelters.filter(shelter => isGuid(shelter.id)).map(shelter => ({
      value: shelter.id,
      label: `${shelter.name}${shelter.district ? ` (${shelter.district})` : ''}`
    })),
    [activeShelters]
  );

  const selectedCluster = useMemo(() => {
    const [targetType, targetId] = dispatchForm.destinationId.split(':', 2);
    return targetType === 'cluster' ? clusters.find(cluster => cluster.id === targetId) : undefined;
  }, [clusters, dispatchForm.destinationId]);

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Resource Management"
          subtitle="Track physical aid, incoming donations, and outgoing dispatches to shelters"
          actions={
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
              Log Incoming Stock
            </Button>
          }
        />

        <section className="mb-6" aria-labelledby="allocation-recommendations-title">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-violet-600" />
            <h2 id="allocation-recommendations-title" className="text-base font-semibold text-[#0D1B2E]">
              AI Allocation Recommendations
            </h2>
            <Badge variant="info">{recommendations.length}</Badge>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {recommendations.length === 0 ? (
              <Card padding="p-4" className="text-sm text-[#5A7290]">
                {recommendationState.allCandidatesDispatched
                  ? 'All current high-priority AI allocation recommendations have been dispatched.'
                  : 'No urgent request or shelter allocations match the currently available Water, Food, or Medical stock.'}
              </Card>
            ) : recommendations.map(recommendation => (
              <Card key={recommendation.id} padding="p-4" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#0D1B2E]">{recommendation.title}</p>
                  <p className="mt-1 text-xs text-[#5A7290]">{recommendation.detail}</p>
                  <p className="mt-1 text-sm text-[#334155]">
                    {recommendation.resource.itemName} · Recommend dispatching{' '}
                    <strong>{recommendation.quantity} {recommendation.resource.unit}</strong>
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={() => openRecommendedDispatch(recommendation)}
                >
                  Dispatch Recommended
                </Button>
              </Card>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#71839A]">
            Recommendations use active assistance demand, nearby incident clusters, shelter occupancy, and available stock.
          </p>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Units in Stock" value={totalItems.toLocaleString()} icon={<Archive size={20} />} color="#1A3A6B" />
          <KpiCard label="Unique Item Types" value={resources.length.toString()} icon={<Box size={20} />} color="#16A34A" />
          <KpiCard label="Low Stock Alerts" value={lowStockItems.toString()} icon={<AlertCircle size={20} />} color="#EA580C" />
          <KpiCard label="Out of Stock" value={outOfStockItems.toString()} icon={<Package size={20} />} color="#DC2626" />
        </div>

        <Card padding="p-0">
          <div className="p-4 border-b border-[#CBD8E6] bg-[#F8FAFC]">
            <SearchInput
              placeholder="Search inventory by item or location..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full max-w-md bg-white"
            />
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-[#5A7290]">Syncing inventory data...</div>
            ) : filteredResources.length === 0 ? (
              <div className="p-8 text-center text-[#5A7290]">No resources found in inventory.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#CBD8E6] bg-white">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Item Details</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Quantity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map(resource => {
                    const fallbackSource = sourceMetadata[resource.id];
                    const campaignId = resource.campaignId || fallbackSource?.campaignId || '';
                    const campaignTitle = resource.campaignTitle ||
                      campaigns.find(campaign => campaign.id === campaignId)?.title ||
                      (fallbackSource?.campaignId === campaignId ? fallbackSource.campaignTitle : '') ||
                      '';
                    const campaignTag = campaignId ? campaignTitle || `Campaign ${campaignId}` : '';
                    const sourceType = resource.sourceType || fallbackSource?.sourceType;
                    const sourceTypeLabel = getSourceTypeLabel(sourceType);
                    return (
                      <tr key={resource.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC]">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-sm text-[#0D1B2E]">{resource.itemName}</p>
                          <p className="text-xs text-[#5A7290] mt-0.5">{resource.category}</p>
                          {(campaignTag || sourceTypeLabel) && (
                            <span className="mt-1 inline-flex flex-wrap gap-1">
                              {campaignTag && <Badge variant="info">{campaignTag}</Badge>}
                              {sourceTypeLabel && <Badge variant="neutral">{sourceTypeLabel}</Badge>}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-sm text-[#0D1B2E] font-[Outfit]">
                            {resource.quantity.toLocaleString()} <span className="text-xs font-normal text-[#5A7290]">{resource.unit}</span>
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm flex items-center gap-1.5 text-[#5A7290]"><MapPin size={14} /> {resource.location}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={resource.quantity === 0 ? 'danger' : resource.quantity < 50 ? 'warning' : 'success'}>
                            {resource.quantity === 0 ? 'Out of Stock' : resource.quantity < 50 ? 'Low Stock' : 'Available'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Send size={14} />}
                            disabled={resource.quantity === 0 || !isGuid(resource.id)}
                            onClick={() => openDispatchModal(resource)}
                          >
                            Dispatch
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <section className="mt-8" aria-labelledby="dispatch-queue-title">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={18} className="text-[#1A3A6B]" />
            <h2 id="dispatch-queue-title" className="text-base font-semibold text-[#0D1B2E]">
              Outgoing Dispatches &amp; Delivery Tracking
            </h2>
            <Badge variant="neutral">{dispatches.length}</Badge>
          </div>
          <Card padding="p-0" className="overflow-hidden">
            {dispatches.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#5A7290]">No outgoing dispatches have been recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead className="bg-[#F8FAFC] text-xs uppercase text-[#5A7290]">
                    <tr>
                      <th className="px-4 py-3 text-left">Batch ID</th>
                      <th className="px-4 py-3 text-left">Item &amp; Quantity</th>
                      <th className="px-4 py-3 text-left">Destination</th>
                      <th className="px-4 py-3 text-left">Volunteer</th>
                      <th className="px-4 py-3 text-left">Source Campaign</th>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map(dispatch => (
                      <tr key={dispatch.batchId} className="border-t border-[#E8EDF3]">
                        <td className="px-4 py-3 font-mono text-xs">{dispatch.batchId}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#0D1B2E]">{dispatch.itemName}</p>
                          <p className="text-xs text-[#5A7290]">{dispatch.quantity.toLocaleString()} {dispatch.unit}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={dispatch.destinationType === 'Shelter' ? 'primary' : 'info'}>
                            {dispatch.destinationType}
                          </Badge>
                          <p className="mt-1 max-w-xs truncate text-xs text-[#5A7290]" title={dispatch.destination}>{dispatch.destination}</p>
                        </td>
                        <td className="px-4 py-3">{dispatch.volunteerName}</td>
                        <td className="px-4 py-3">{dispatch.sourceCampaign || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#5A7290]">{new Date(dispatch.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant={dispatch.status === 'Delivered' ? 'success' : dispatch.status === 'In Transit' ? 'warning' : 'neutral'}>
                            {dispatch.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(dispatch.status === 'Dispatched' || dispatch.status === 'In Transit') && (
                            <Button size="sm" variant="outline" disabled={!dispatch.dispatchId || isSubmitting} onClick={() => void updateDispatchStatus(dispatch)}>
                              {dispatch.status === 'Dispatched' ? 'Mark In Transit' : 'Confirm Delivered'}
                            </Button>
                          )}
                          {dispatch.status === 'Delivered' && <CheckCircle size={18} className="ml-auto text-green-600" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>

      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Incoming Stock"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddResource} loading={isSubmitting}>Add to Inventory</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Bottled Water (1L)"
            value={addForm.itemName}
            onChange={event => setAddForm(form => ({ ...form, itemName: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={addForm.category}
              onChange={event => setAddForm(form => ({ ...form, category: event.target.value }))}
              options={[
                { value: 'Food', label: 'Food & Rations' },
                { value: 'Water', label: 'Drinking Water' },
                { value: 'Medical', label: 'Medical Supplies' },
                { value: 'Shelter', label: 'Tents & Blankets' },
                { value: 'Other', label: 'Other' }
              ]}
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={addForm.quantity}
              onChange={event => setAddForm(form => ({ ...form, quantity: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Type"
              placeholder="e.g. Bottles, Parcels, Kits"
              value={addForm.unit}
              onChange={event => setAddForm(form => ({ ...form, unit: event.target.value }))}
            />
            <Input
              label="Storage Location"
              placeholder="e.g. Main Warehouse"
              value={addForm.location}
              onChange={event => setAddForm(form => ({ ...form, location: event.target.value }))}
            />
          </div>
          <Select
            label="Source Campaign (optional)"
            value={addForm.sourceCampaignId}
            onChange={event => setAddForm(form => ({ ...form, sourceCampaignId: event.target.value }))}
            options={[
              { value: '', label: 'No campaign linked' },
              ...campaigns
                .filter(campaign => isGuid(campaign.id))
                .map(campaign => ({ value: campaign.id, label: campaign.title }))
            ]}
          />
          <Select
            label="Source Type (optional)"
            value={addForm.sourceType}
            onChange={event => setAddForm(form => ({ ...form, sourceType: event.target.value as SourceType | '' }))}
            options={[
              { value: '', label: 'No source type' },
              ...SOURCE_TYPES.map(sourceType => ({ value: sourceType.value, label: sourceType.label }))
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={!!dispatchModalData}
        onClose={() => setDispatchModalData(null)}
        title="Dispatch Manifest"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDispatchModalData(null)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleDispatch} loading={isSubmitting}>Confirm Dispatch</Button>
          </>
        }
      >
        {dispatchModalData && (
          <div className="space-y-4">
            {(() => {
              const fallbackSource = sourceMetadata[dispatchModalData.id];
              const campaignId = dispatchModalData.campaignId || fallbackSource?.campaignId || '';
              const campaignTitle = dispatchModalData.campaignTitle ||
                campaigns.find(campaign => campaign.id === campaignId)?.title ||
                (fallbackSource?.campaignId === campaignId ? fallbackSource.campaignTitle : '');
              return campaignTitle ? (
                <p className="text-xs text-[#166534]">Campaign source: {campaignTitle}</p>
              ) : null;
            })()}
            <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3">
              <p className="text-xs text-[#166534]">Available to dispatch</p>
              <p className="text-lg font-bold text-[#15803D] font-[Outfit]">
                {dispatchModalData.quantity.toLocaleString()} <span className="text-sm font-normal">{dispatchModalData.unit}</span>
              </p>
              <p className="mt-1 text-xs font-medium text-[#166534]">{dispatchModalData.itemName}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F8FAFC] p-1">
              <Button
                type="button"
                size="sm"
                variant={dispatchForm.destinationMode === 'shelter' ? 'primary' : 'ghost'}
                onClick={() => setDispatchForm(form => ({
                  ...form,
                  destinationMode: 'shelter',
                  destinationId: '',
                  destinationName: '',
                  destinationRequestId: ''
                }))}
              >
                Shelter Delivery
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dispatchForm.destinationMode === 'citizen' ? 'primary' : 'ghost'}
                onClick={() => setDispatchForm(form => ({
                  ...form,
                  destinationMode: 'citizen',
                  destinationId: '',
                  destinationName: '',
                  destinationRequestId: ''
                }))}
              >
                Citizen / Cluster
              </Button>
            </div>

            {dispatchForm.destinationMode === 'shelter' ? (
              <Select
                label="Target Shelter"
                value={dispatchForm.destinationId}
                onChange={event => {
                  const selected = activeShelters.find(shelter => shelter.id === event.target.value);
                  setDispatchForm(form => ({
                    ...form,
                    destinationId: event.target.value,
                    destinationName: selected?.name || ''
                  }));
                }}
                options={[
                  { value: '', label: 'Select an active shelter' },
                  ...dispatchShelterOptions
                ]}
              />
            ) : (
              <>
                <Select
                  label="Active Assistance Request or Incident Cluster"
                  value={dispatchForm.destinationId}
                  onChange={event => {
                    const selected = citizenDestinationOptions.find(option => option.value === event.target.value);
                    const [targetType, targetId] = event.target.value.split(':', 2);
                    const cluster = targetType === 'cluster'
                      ? clusters.find(option => option.id === targetId)
                      : undefined;
                    const defaultRequestId = cluster
                      ? getRequestId(cluster.requests.find(request => isGuid(getRequestId(request))) || {})
                      : targetType === 'request' && isGuid(targetId)
                        ? targetId
                        : '';
                    setDispatchForm(form => ({
                      ...form,
                      destinationId: event.target.value,
                      destinationName: selected?.label || '',
                      destinationRequestId: defaultRequestId
                    }));
                  }}
                  options={[
                    { value: '', label: 'Select a request or nearby incident cluster' },
                    ...citizenDestinationOptions
                  ]}
                />
                {selectedCluster && (
                  <Select
                    label="Specific Citizen Request in this Cluster"
                    value={dispatchForm.destinationRequestId}
                    onChange={event => setDispatchForm(form => ({
                      ...form,
                      destinationRequestId: event.target.value
                    }))}
                    options={selectedCluster.requests
                      .filter(request => isGuid(getRequestId(request)))
                      .map(request => ({
                        value: getRequestId(request),
                        label: getRequestLabel(request)
                      }))}
                  />
                )}
              </>
            )}

            <Input
              label="Quantity to Dispatch"
              type="number"
              min="1"
              max={dispatchModalData.quantity}
              value={dispatchForm.dispatchQuantity}
              onChange={event => setDispatchForm(form => ({ ...form, dispatchQuantity: event.target.value }))}
            />
            <Select
              label="Assign Active Field Volunteer (optional)"
              value={dispatchForm.volunteerId}
              onChange={event => setDispatchForm(form => ({ ...form, volunteerId: event.target.value }))}
              options={[
                { value: '', label: 'Leave unassigned' },
                ...volunteers.filter(volunteer => isGuid(volunteer.id)).map(volunteer => ({
                  value: volunteer.id,
                  label: volunteer.name
                }))
              ]}
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
}
