import { isArchivedStatus } from './requestLifecycle';

export type RequestRecord = Record<string, unknown>;

export interface IncidentCluster {
  id: string;
  requests: RequestRecord[];
  location: string;
  category: string;
  affectedPeople: number;
  highestUrgency: string;
}

const LOCATION_STOP_WORDS = new Set([
  'area', 'near', 'road', 'street', 'town', 'village', 'district', 'province',
  'location', 'sri', 'lanka', 'the', 'and', 'of', 'at', 'no'
]);
const KEYWORD_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were',
  'have', 'has', 'had', 'request', 'requests', 'people', 'person', 'need',
  'needs', 'help', 'assistance', 'affected', 'currently'
]);
const URGENCY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  moderate: 2,
  high: 3,
  critical: 4
};

function firstString(request: RequestRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = request[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getLocationTokens(request: RequestRecord): Set<string> {
  const location = firstString(request, 'location', 'Location');
  if (!location || /^https?:\/\//i.test(location)) return new Set();
  return new Set(
    normalizeText(location)
      .split(/\s+/)
      .filter(token => token.length >= 2 && !LOCATION_STOP_WORDS.has(token))
  );
}

function getKeywords(request: RequestRecord): Set<string> {
  const text = [
    firstString(request, 'description', 'Description'),
    firstString(request, 'aiSummary', 'AiSummary')
  ].join(' ');
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter(token => token.length >= 3 && !KEYWORD_STOP_WORDS.has(token))
  );
}

function getCoordinates(request: RequestRecord): { latitude: number; longitude: number } | null {
  const latitudeValue = request.latitude ?? request.Latitude;
  const longitudeValue = request.longitude ?? request.Longitude;
  if (latitudeValue === null || latitudeValue === undefined || longitudeValue === null || longitudeValue === undefined) {
    return null;
  }
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)) {
    return null;
  }
  return { latitude, longitude };
}

function isNearby(first: RequestRecord, second: RequestRecord): boolean {
  const firstCoordinates = getCoordinates(first);
  const secondCoordinates = getCoordinates(second);
  if (firstCoordinates && secondCoordinates) {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = radians(secondCoordinates.latitude - firstCoordinates.latitude);
    const longitudeDelta = radians(secondCoordinates.longitude - firstCoordinates.longitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(firstCoordinates.latitude)) *
      Math.cos(radians(secondCoordinates.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    if (distanceKm <= 1.5) return true;
  }

  const firstLocationTokens = getLocationTokens(first);
  const secondLocationTokens = getLocationTokens(second);
  return [...firstLocationTokens].some(token => secondLocationTokens.has(token));
}

function hasSimilarIncident(first: RequestRecord, second: RequestRecord): boolean {
  const firstCategory = normalizeText(firstString(first, 'category', 'Category'));
  const secondCategory = normalizeText(firstString(second, 'category', 'Category'));
  if (firstCategory && secondCategory && firstCategory === secondCategory) return true;

  const secondKeywords = getKeywords(second);
  return [...getKeywords(first)].some(keyword => secondKeywords.has(keyword));
}

function isActive(request: RequestRecord): boolean {
  return !isArchivedStatus(firstString(request, 'status', 'Status'));
}

function getRequestIdentifier(request: RequestRecord, index: number): string {
  return firstString(request, 'id', 'Id') || `request-${index}`;
}

function mostCommon(values: string[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] || fallback;
}

function getAffectedPeople(request: RequestRecord): number {
  const value = request.affectedPeopleCount ?? request.AffectedPeopleCount ??
    request.affectedCount ?? request.affected ?? request.affectedPeople ?? request.AffectedPeople;
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getUrgency(request: RequestRecord): string {
  return firstString(request, 'urgency', 'Urgency', 'priority', 'Priority') || 'Medium';
}

export function findIncidentClusters(requests: readonly RequestRecord[]): IncidentCluster[] {
  const activeRequests = requests
    .map((request, index) => ({ request, originalIndex: index }))
    .filter(({ request }) => isActive(request));
  const visited = new Set<number>();
  const clusters: IncidentCluster[] = [];

  for (let start = 0; start < activeRequests.length; start += 1) {
    if (visited.has(start)) continue;
    const component: number[] = [];
    const pending = [start];
    visited.add(start);

    while (pending.length > 0) {
      const current = pending.pop();
      if (current === undefined) continue;
      component.push(current);

      for (let candidate = 0; candidate < activeRequests.length; candidate += 1) {
        if (visited.has(candidate)) continue;
        const currentRequest = activeRequests[current].request;
        const candidateRequest = activeRequests[candidate].request;
        if (isNearby(currentRequest, candidateRequest) && hasSimilarIncident(currentRequest, candidateRequest)) {
          visited.add(candidate);
          pending.push(candidate);
        }
      }
    }

    if (component.length < 2) continue;
    const clusteredRequests = component.map(index => activeRequests[index].request);
    const locations = clusteredRequests.map(request => firstString(request, 'location', 'Location'));
    const categories = clusteredRequests.map(request => firstString(request, 'category', 'Category'));
    const urgencies = clusteredRequests.map(getUrgency);
    const highestUrgency = urgencies.reduce((highest, current) =>
      (URGENCY_RANK[current.toLowerCase()] || 0) > (URGENCY_RANK[highest.toLowerCase()] || 0)
        ? current
        : highest
    , urgencies[0] || 'Medium');
    const identifiers = component
      .map(index => getRequestIdentifier(activeRequests[index].request, activeRequests[index].originalIndex))
      .sort();

    clusters.push({
      id: identifiers.join('|'),
      requests: clusteredRequests,
      location: mostCommon(locations, 'Multiple nearby locations'),
      category: mostCommon(categories, 'Related reports'),
      affectedPeople: clusteredRequests.reduce((total, request) => total + getAffectedPeople(request), 0),
      highestUrgency
    });
  }

  return clusters;
}
