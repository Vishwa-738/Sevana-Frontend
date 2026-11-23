export const mockStats = {
  activeEmergencies: 7,
  requestsReceived: 2847,
  peopleAssisted: 18432,
  availableShelters: 43,
  activeVolunteers: 692,
};

export const mockRequests = [
  { id: 'REQ-2024-001', citizen: 'Kumari Perera', category: 'Food', location: 'Galle, Southern Province', priority: 'critical', aiRecommendation: 'Immediate dispatch', status: 'submitted', org: 'Red Cross Sri Lanka', created: '2024-01-15 08:23', aiConfidence: 94 },
  { id: 'REQ-2024-002', citizen: 'Nimal Fernando', category: 'Medicine', location: 'Matara, Southern Province', priority: 'high', aiRecommendation: 'Priority queue', status: 'under_review', org: 'Health Ministry', created: '2024-01-15 09:11', aiConfidence: 87 },
  { id: 'REQ-2024-003', citizen: 'Saman Wijesinghe', category: 'Shelter', location: 'Hambantota', priority: 'high', aiRecommendation: 'Allocate shelter B3', status: 'verified', org: 'UNHCR', created: '2024-01-15 09:45', aiConfidence: 91 },
  { id: 'REQ-2024-004', citizen: 'Priya Rajapaksa', category: 'Transportation', location: 'Ratnapura', priority: 'medium', aiRecommendation: 'Schedule pickup', status: 'assigned', org: 'Army Civil Affairs', created: '2024-01-15 10:02', aiConfidence: 78 },
  { id: 'REQ-2024-005', citizen: 'Dilshan Bandara', category: 'Food', location: 'Kalutara', priority: 'low', aiRecommendation: 'Routine allocation', status: 'in_progress', org: 'WFP Sri Lanka', created: '2024-01-15 10:30', aiConfidence: 82 },
  { id: 'REQ-2024-006', citizen: 'Chamari Silva', category: 'Accessibility', location: 'Colombo 7', priority: 'critical', aiRecommendation: 'Wheelchair + nurse', status: 'submitted', org: 'Ministry of Social', created: '2024-01-15 10:55', aiConfidence: 96 },
];

export const mockShelters = [
  { id: 'SH-001', name: 'Galle District Sports Complex', location: 'Galle, Southern Province', capacity: 500, occupancy: 423, facilities: ['Medical', 'Kitchen', 'WiFi', 'Generator'], accessibility: true, status: 'operational', lat: 6.0535, lng: 80.2210 },
  { id: 'SH-002', name: 'Matara National School', location: 'Matara, Southern Province', capacity: 300, occupancy: 187, facilities: ['Kitchen', 'Medical'], accessibility: false, status: 'operational', lat: 5.9485, lng: 80.5353 },
  { id: 'SH-003', name: 'Hambantota Community Center', location: 'Hambantota', capacity: 200, occupancy: 200, facilities: ['Kitchen', 'Generator'], accessibility: true, status: 'full', lat: 6.1241, lng: 81.1185 },
  { id: 'SH-004', name: 'Ratnapura Town Hall', location: 'Ratnapura, Sabaragamuwa', capacity: 400, occupancy: 91, facilities: ['Medical', 'Kitchen', 'WiFi'], accessibility: true, status: 'operational', lat: 6.6802, lng: 80.3990 },
  { id: 'SH-005', name: 'Kalutara District Hall', location: 'Kalutara, Western Province', capacity: 250, occupancy: 163, facilities: ['Kitchen', 'Medical', 'WiFi'], accessibility: false, status: 'operational', lat: 6.5854, lng: 79.9607 },
];

export const mockResources = [
  { id: 'RES-001', name: 'Emergency Food Packs', category: 'Food', available: 4200, allocated: 1800, dispatched: 1200, unit: 'packs', location: 'Colombo Warehouse', expiry: '2024-06-30' },
  { id: 'RES-002', name: 'Drinking Water (5L)', category: 'Water', available: 8500, allocated: 3200, dispatched: 2100, unit: 'bottles', location: 'Galle Depot', expiry: null },
  { id: 'RES-003', name: 'First Aid Kits', category: 'Medicine', available: 320, allocated: 180, dispatched: 95, unit: 'kits', location: 'Colombo Medical Store', expiry: '2025-12-31' },
  { id: 'RES-004', name: 'Ambulances', category: 'Vehicles', available: 12, allocated: 8, dispatched: 6, unit: 'units', location: 'Multiple Depots', expiry: null },
  { id: 'RES-005', name: 'Emergency Blankets', category: 'Equipment', available: 2100, allocated: 900, dispatched: 650, unit: 'units', location: 'Matara Warehouse', expiry: null },
  { id: 'RES-006', name: 'Insulin (rapid-acting)', category: 'Medicine', available: 45, allocated: 32, dispatched: 28, unit: 'vials', location: 'Colombo Medical Store', expiry: '2024-08-15' },
];

export const mockVolunteers = [
  { id: 'VOL-001', name: 'Haritha Gamage', skills: ['First Aid', 'Search & Rescue', 'Sinhala/English'], location: 'Colombo', availability: 'available', verified: true, assigned: 3, completed: 47, matchScore: 96 },
  { id: 'VOL-002', name: 'Nadeesha Pathirana', skills: ['Nursing', 'Medical Triage', 'Tamil/English'], location: 'Galle', availability: 'available', verified: true, assigned: 1, completed: 31, matchScore: 91 },
  { id: 'VOL-003', name: 'Kasun Mendis', skills: ['Logistics', 'Driving', 'Warehouse'], location: 'Matara', availability: 'busy', verified: true, assigned: 2, completed: 22, matchScore: 84 },
  { id: 'VOL-004', name: 'Anusha Cooray', skills: ['Social Work', 'Counseling', 'Child Care'], location: 'Kalutara', availability: 'available', verified: false, assigned: 0, completed: 8, matchScore: 79 },
];

export const mockCrises = [
  { id: 'CRS-001', name: 'Southern Flood Emergency 2024', type: 'Flood', location: 'Southern Province', startDate: '2024-01-12', severity: 'severe', affectedPop: 45000, requests: 847, shelters: 8, volunteers: 143, orgs: 12 },
  { id: 'CRS-002', name: 'Ratnapura Landslide', type: 'Landslide', location: 'Sabaragamuwa', startDate: '2024-01-13', severity: 'critical', affectedPop: 12000, requests: 234, shelters: 3, volunteers: 67, orgs: 5 },
  { id: 'CRS-003', name: 'Colombo Urban Flash Flood', type: 'Flood', location: 'Western Province', startDate: '2024-01-14', severity: 'moderate', affectedPop: 8200, requests: 156, shelters: 4, volunteers: 89, orgs: 7 },
];

export const mockNotifications = [
  { id: 'N001', type: 'critical', title: 'Critical Request Escalated', message: 'Request REQ-2024-001 has been escalated to critical priority. Immediate action required.', time: '2 min ago', read: false },
  { id: 'N002', type: 'ai', title: 'AI Recommendation Awaiting Review', message: '3 new AI recommendations for resource allocation are awaiting human review.', time: '8 min ago', read: false },
  { id: 'N003', type: 'shelter', title: 'Shelter Capacity Alert', message: 'Hambantota Community Center has reached 100% capacity. Redirect incoming allocations.', time: '23 min ago', read: false },
  { id: 'N004', type: 'resource', title: 'Resource Shortage Warning', message: 'Insulin stocks at Colombo Medical Store below critical threshold (45 vials remaining).', time: '1 hr ago', read: true },
  { id: 'N005', type: 'volunteer', title: 'Volunteer Task Completed', message: 'Haritha Gamage has completed Task T-089: Food distribution at Galle Sports Complex.', time: '2 hr ago', read: true },
  { id: 'N006', type: 'system', title: 'System Maintenance', message: 'Scheduled maintenance window tonight 02:00-04:00 LKT. Platform may be briefly unavailable.', time: '3 hr ago', read: true },
];

export const mockAuditLogs = [
  { id: 'AUD-0891', user: 'Coordinator Perera', role: 'Emergency Coordinator', action: 'APPROVED_AI_RECOMMENDATION', entity: 'REQ-2024-001', timestamp: '2024-01-15 10:47:23', ip: '192.168.1.45', aiRec: 'Immediate dispatch of food packs', confidence: 94, humanAction: 'Approved', prevValue: 'Pending', newValue: 'Dispatching' },
  { id: 'AUD-0890', user: 'Manager Silva', role: 'Resource Manager', action: 'RESOURCE_ALLOCATED', entity: 'RES-001', timestamp: '2024-01-15 10:31:08', ip: '192.168.1.23', aiRec: null, confidence: null, humanAction: null, prevValue: '4500 packs', newValue: '4200 packs' },
  { id: 'AUD-0889', user: 'Admin Jayasena', role: 'System Administrator', action: 'USER_ROLE_UPDATED', entity: 'USR-0234', timestamp: '2024-01-15 10:18:55', ip: '192.168.1.10', aiRec: null, confidence: null, humanAction: null, prevValue: 'Volunteer', newValue: 'Volunteer Coordinator' },
  { id: 'AUD-0888', user: 'Coordinator Perera', role: 'Emergency Coordinator', action: 'REJECTED_AI_RECOMMENDATION', entity: 'REQ-2024-003', timestamp: '2024-01-15 09:52:11', ip: '192.168.1.45', aiRec: 'Allocate shelter B3', confidence: 91, humanAction: 'Rejected - allocated B5 instead due to proximity', prevValue: 'AI: B3', newValue: 'Human: B5' },
];

export const lineChartData = [
  { date: 'Jan 9', requests: 145, resolved: 98, volunteers: 45 },
  { date: 'Jan 10', requests: 287, resolved: 201, volunteers: 67 },
  { date: 'Jan 11', requests: 412, resolved: 318, volunteers: 89 },
  { date: 'Jan 12', requests: 698, resolved: 445, volunteers: 143 },
  { date: 'Jan 13', requests: 834, resolved: 612, volunteers: 187 },
  { date: 'Jan 14', requests: 921, resolved: 731, volunteers: 203 },
  { date: 'Jan 15', requests: 847, resolved: 692, volunteers: 192 },
];

export const categoryData = [
  { name: 'Food', value: 38 },
  { name: 'Shelter', value: 24 },
  { name: 'Medicine', value: 19 },
  { name: 'Transportation', value: 11 },
  { name: 'Accessibility', value: 5 },
  { name: 'Other', value: 3 },
];

export const resourceUtilData = [
  { name: 'Food', available: 4200, allocated: 1800, dispatched: 1200 },
  { name: 'Water', available: 8500, allocated: 3200, dispatched: 2100 },
  { name: 'Medicine', available: 320, allocated: 180, dispatched: 95 },
  { name: 'Equipment', available: 2100, allocated: 900, dispatched: 650 },
];
