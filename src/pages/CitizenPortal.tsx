import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Home, MapPin, Bell, Plus, ChevronRight, CheckCircle,
  Clock, Package, Truck, Star, Upload, ShieldCheck, Phone, HeartHandshake,
  Activity, Navigation, Loader2, ExternalLink, Globe
} from 'lucide-react';
import { Button, Card, Badge, StatusBadge, Modal, Input, Textarea, Select, Alert, Progress } from '../components/ui';
import { useAppContext } from '../context';
import { ApiError, apiClient, getAssignedVolunteerForRequest, getNotifications } from '../api';
import { isArchivedStatus } from '../utils/requestLifecycle';

type CitizenLang = 'en' | 'si' | 'ta';
type RequestView = 'active' | 'history';

const LANG_STORAGE_KEY = 'sevana_citizen_lang';
const VERIFIED_REQUESTS_STORAGE_KEY = 'sevana_verified_citizen_requests';

function getVerifiedRequestIds(): Set<string> {
  try {
    const stored = localStorage.getItem(VERIFIED_REQUESTS_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.flatMap((entry: unknown) => {
        if (typeof entry === 'string') return [entry];
        if (
          typeof entry === 'object' &&
          entry !== null &&
          'requestId' in entry &&
          typeof entry.requestId === 'string'
        ) {
          return [entry.requestId];
        }
        return [];
      })
    );
  } catch (error: unknown) {
    console.warn('Failed to load citizen feedback confirmations.', error);
    return new Set();
  }
}

const LANG_OPTIONS: { code: CitizenLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'si', label: 'සිං' },
  { code: 'ta', label: 'தமிழ்' },
];

const translations = {
  en: {
    brandSub: 'සෙවන',
    notifications: 'Notifications',
    welcome: 'Welcome,',
    citizenFallback: 'Citizen',
    portalSubtitle: 'Stay informed and access aid during emergencies',
    assignedReliefShelter: 'Assigned Relief Shelter',
    verified: 'Verified',
    getDirections: 'Get Directions',
    directions: 'Directions',
    callShelter: 'Call Shelter',
    call: 'Call',
    requestAssistance: 'Request Assistance',
    requestAssistanceSub: 'Food, Medicine, Shelter...',
    findShelter: 'Find Shelter',
    sheltersNearby: (count: number) => `${count} shelters nearby`,
    accessVolunteerDashboard: 'Access Volunteer Dashboard',
    accessVolunteerDashboardSub: 'View your active field assignments and tasks',
    applyToVolunteer: 'Apply to Volunteer',
    applyToVolunteerSub: 'Join the field response team',
    myRequests: 'My Requests',
    activeRequestsTab: 'Active',
    requestHistoryTab: 'History',
    noActiveRequests: 'You have no active requests. Your past requests are available in History.',
    viewHistory: 'View History',
    noHistoryRequests: 'No closed, delivered, or completed requests yet.',
    loadingRequests: 'Loading requests...',
    noRequestsYet: "You haven't submitted any requests yet.",
    assignedShelterLabel: 'Assigned Shelter:',
    requestedShelterLabel: 'Requested Shelter:',
    awaitingManagerVerification: '(Awaiting Manager Verification)',
    aidTeamDispatched: 'Aid team dispatched — ETA 30 min',
    postResolutionCheckIn: 'Post-Resolution Check-in',
    confirmRateAid: 'Confirm & Rate Aid',
    requestRecoveryFollowUp: 'Request Recovery Follow-Up',
    verifiedByCitizen: 'Verified by Citizen',
    recoveryFollowUpDescription: (id: string) => `Post-disaster recovery follow-up for request ${id}.`,
    feedbackThankYou: 'Thank you for confirming and rating the aid provided.',
    feedbackAlreadySubmitted: 'Feedback was already submitted for this request. It is marked verified.',
    feedbackStatusNotEligible: 'Feedback can be submitted only for delivered or closed requests.',
    feedbackSubmitFailed: 'Failed to submit feedback. Please try again.',
    feedbackSaveFailed: 'Your confirmation could not be saved on this device.',
    viewResponderDetails: 'View Responder Details',
    nearbyShelters: 'Nearby Shelters',
    viewAll: 'View all',
    locatingShelters: 'Locating shelters...',
    locatingOpenShelters: 'Locating open shelters near you...',
    noOpenShelters: 'No open shelters found in your immediate area.',
    noOpenSheltersModal:
      'No open relief shelters were found in your immediate area. Please submit an Assistance Request so a coordinator can help.',
    spaces: (count: number) => `${count} spaces`,
    spacesOfCapacity: (avail: number, cap: number) => `${avail} / ${cap} spaces`,
    spacesAvailable: (avail: number) => `${avail} spaces available`,
    nearby: 'Nearby',
    locationOnMap: 'Location available on map',
    details: 'Details',
    emergencyContacts: 'Emergency Contacts',
    contactEmergency: 'Emergency',
    contactPolice: 'Police',
    contactDmc: 'DMC',
    contactSevana: 'Sevana Help',
    navHome: 'Home',
    navRequests: 'Requests',
    navShelters: 'Shelters',
    navAlerts: 'Alerts',
    nearbyReliefShelters: 'Nearby Relief Shelters',
    close: 'Close',
    cancel: 'Cancel',
    requestSpace: 'Request Space',
    requestSpaceAt: (name: string) => `Request Space at ${name}`,
    numberOfPeople: 'Number of people',
    notesOptional: 'Notes (optional)',
    notesPlaceholder: 'e.g., Elderly / Infant',
    sending: 'Sending...',
    confirmRequest: 'Confirm Request',
    submitRequest: 'Submit Request',
    edit: 'Edit',
    submitting: 'Submitting...',
    confirmAndSubmit: 'Confirm & Submit',
    accurateInfoAlert:
      'Please provide accurate information. False requests may delay assistance to others.',
    assistanceCategory: 'Assistance category',
    selectCategory: 'Select category...',
    categories: {
      food: 'Food & Water',
      medicine: 'Medicine & Medical',
      shelter: 'Temporary Shelter',
      transport: 'Transportation',
      accessibility: 'Accessibility Assistance',
      other: 'Other',
    } as Record<string, string>,
    urgencyLevel: 'Urgency level',
    selectUrgency: 'Select urgency...',
    urgencies: {
      critical: 'Critical — Immediate danger to life',
      high: 'High — Urgent need within 2 hours',
      medium: 'Medium — Need within today',
      low: 'Low — Can wait 1-2 days',
    } as Record<string, string>,
    description: 'Description',
    descriptionPlaceholder: 'Describe your situation and what assistance you need...',
    yourCurrentLocation: 'Your current location',
    useMyGps: 'Use My GPS',
    locating: 'Locating...',
    searchLocationPlaceholder: 'Search town, road, or landmark in Sri Lanka...',
    locationPinned: (lat: string, lng: string) => `Location pinned on map (${lat}, ${lng})`,
    locationHelperPrefix: 'Select a suggestion or click ',
    locationHelperSuffix: ' so responders & shelters can locate you accurately.',
    affectedPeople: 'Number of affected people',
    supportingEvidence: 'Supporting evidence (optional)',
    uploadPrompt: 'Upload photos or documents',
    uploadHint: 'JPG, PNG, PDF up to 10MB',
    aiAnalyzingTitle: 'AI is analyzing your request...',
    aiAnalyzingSub: 'Classifying urgency and matching available resources',
    aiAnalysisResult: 'AI Analysis Result',
    aiSummaryLabel: 'AI Summary',
    aiUnavailableTitle: 'AI Analysis Temporarily Unavailable',
    aiUnavailableMsg:
      'AI analysis is temporarily unavailable. Please try again later. You can still submit your assistance request directly for coordinator review.',
    confidence: (score: number) => `${score}% confidence`,
    urgencyScore: 'Urgency Score',
    recommendedAction: 'Recommended Action',
    nearestResource: 'Nearest available resource',
    aiDisclaimer: 'AI recommendations are subject to human review by authorized coordinators.',
    requestReadyTitle: 'Request Ready to Submit',
    requestReadyMsg: 'Your request will be assigned a tracking number upon submission.',
    requestSubmittedTitle: 'Request Submitted!',
    trackingNumberLabel: 'Your tracking number is',
    locationSharedMsg: 'Your location has been shared with coordinators for rapid response.',
    trackRequest: 'Track Request',
    trackingUpdateHint: 'Tracking details update automatically as coordinators process your request',
    statusCompleted: 'Completed',
    statusCurrent: 'Current Status',
    statusPending: 'Pending',
    timeline: [
      { status: 'Submitted', desc: 'Your request was received and queued for review.' },
      { status: 'Under Review', desc: 'A coordinator is reviewing your request.' },
      { status: 'Assigned', desc: 'An aid unit or volunteer has been assigned.' },
      { status: 'In Progress', desc: 'Aid team is en route or actively assisting.' },
      { status: 'Delivered', desc: 'Assistance has been delivered.' },
    ],
    rateExperience: 'Rate Your Experience',
    ratePrompt: 'How satisfied were you with the assistance provided?',
    additionalComments: 'Additional comments (optional)',
    skip: 'Skip',
    submitFeedback: 'Submit Feedback',
    assignedResponder: 'Assigned Responder',
    retrievingResponder: 'Retrieving responder details...',
    responderFallback: 'Assigned Responder',
    noPhoneProvided: 'No phone provided',
    responderEnRoute:
      'Your responder is en route. Please contact them directly via phone to coordinate your location.',
    callResponder: 'Call Responder',
    couldNotLoadResponder: 'Could not load responder details.',
    toastGeoUnsupported: 'Geolocation is not supported by your browser.',
    toastGpsCaptured: 'Exact GPS location captured.',
    toastGpsFailed: 'Unable to access GPS. Please search and select your address below.',
    toastValidPeople: 'Please enter a valid number of people.',
    toastShelterReqSent: (name: string) =>
      `Shelter space request sent to ${name}. The Shelter Manager will verify it shortly.`,
    toastShelterReqFailed: 'Failed to submit shelter request.',
    toastFillRequired: 'Please fill in all required fields.',
    toastPinLocation:
      'Please select an address from the dropdown or click "Use My GPS" so we can pinpoint your location on the map.',
    toastSubmitFailed: 'Failed to submit assistance request.',
  },

  si: {
    brandSub: 'සෙවන',
    notifications: 'දැනුම්දීම්',
    welcome: 'ආයුබෝවන්,',
    citizenFallback: 'පුරවැසියා',
    portalSubtitle: 'හදිසි අවස්ථාවලදී දැනුවත්ව සිටින්න සහ සහන සේවා ලබාගන්න',
    assignedReliefShelter: 'වෙන් කළ ආරක්ෂිත නවාතැන',
    verified: 'තහවුරු කළා',
    getDirections: 'මාර්ගය බලන්න',
    directions: 'මාර්ගය',
    callShelter: 'නවාතැන අමතන්න',
    call: 'අමතන්න',
    requestAssistance: 'සහන ඉල්ලන්න',
    requestAssistanceSub: 'ආහාර, ඖෂධ, නවාතැන්...',
    findShelter: 'නවාතැන් සොයන්න',
    sheltersNearby: (count: number) => `ආසන්න නවාතැන් ${count} ක්`,
    accessVolunteerDashboard: 'ස්වේච්ඡා සේවක පුවරුවට පිවිසෙන්න',
    accessVolunteerDashboardSub: 'ඔබේ සක්‍රීය ක්ෂේත්‍ර පැවරුම් සහ රාජකාරි බලන්න',
    applyToVolunteer: 'ස්වේච්ඡා සේවයට අයදුම් කරන්න',
    applyToVolunteerSub: 'ක්ෂේත්‍ර සහන කණ්ඩායමට එක්වන්න',
    myRequests: 'මගේ ඉල්ලීම්',
    activeRequestsTab: 'සක්‍රීය',
    requestHistoryTab: 'ඉතිහාසය',
    noActiveRequests: 'ඔබට සක්‍රීය ඉල්ලීම් නොමැත. ඔබේ පෙර ඉල්ලීම් ඉතිහාසයේ ඇත.',
    viewHistory: 'ඉතිහාසය බලන්න',
    noHistoryRequests: 'වසා දැමූ, ලබා දුන් හෝ සම්පූර්ණ කළ ඉල්ලීම් තවම නැත.',
    loadingRequests: 'ඉල්ලීම් පූරණය වෙමින් පවතී...',
    noRequestsYet: 'ඔබ තවමත් කිසිදු ඉල්ලීමක් ඉදිරිපත් කර නැත.',
    assignedShelterLabel: 'වෙන් කළ නවාතැන:',
    requestedShelterLabel: 'ඉල්ලූ නවාතැන:',
    awaitingManagerVerification: '(කළමනාකරුගේ අනුමැතිය අපේක්ෂාවෙන්)',
    aidTeamDispatched: 'සහන කණ්ඩායම පිටත් වී ඇත — ඇස්තමේන්තු කාලය විනාඩි 30',
    postResolutionCheckIn: 'සහන සේවාවෙන් පසු තහවුරු කිරීම',
    confirmRateAid: 'තහවුරු කර අගයන්න',
    requestRecoveryFollowUp: 'ප්‍රතිසාධන සහාය ඉල්ලන්න',
    verifiedByCitizen: 'පුරවැසියා විසින් තහවුරු කරන ලදී',
    recoveryFollowUpDescription: (id: string) => `ඉල්ලීම ${id} සඳහා ආපදා ප්‍රතිසාධන සහාය අවශ්‍යයි.`,
    feedbackThankYou: 'තහවුරු කර ප්‍රතිචාරය ලබාදුන් ඔබට ස්තුතියි.',
    feedbackAlreadySubmitted: 'මෙම ඉල්ලීම සඳහා ප්‍රතිචාරය දැනටමත් ලබා දී ඇත. එය තහවුරු කළ ලෙස සලකුණු කර ඇත.',
    feedbackStatusNotEligible: 'ප්‍රතිචාර ලබා දිය හැක්කේ සම්පූර්ණ කළ හෝ වසා දැමූ ඉල්ලීම් සඳහා පමණි.',
    feedbackSubmitFailed: 'ප්‍රතිචාරය යැවීමට නොහැකි විය. නැවත උත්සාහ කරන්න.',
    feedbackSaveFailed: 'ඔබේ තහවුරු කිරීම මෙම උපාංගයේ සුරැකීමට නොහැකි විය.',
    viewResponderDetails: 'සහන සේවක විස්තර බලන්න',
    nearbyShelters: 'ආසන්න ආරක්ෂිත නවාතැන්',
    viewAll: 'සියල්ල බලන්න',
    locatingShelters: 'නවාතැන් සොයමින් පවතී...',
    locatingOpenShelters: 'ඔබ අසල විවෘත නවාතැන් සොයමින් පවතී...',
    noOpenShelters: 'ඔබේ ආසන්න ප්‍රදේශයේ විවෘත නවාතැන් හමු නොවීය.',
    noOpenSheltersModal:
      'ඔබේ ආසන්න ප්‍රදේශයේ විවෘත නවාතැන් හමු නොවීය. සම්බන්ධීකාරකවරයෙකුගේ සහාය ලබා ගැනීමට කරුණාකර සහන ඉල්ලීමක් ඉදිරිපත් කරන්න.',
    spaces: (count: number) => `ඉඩකඩ ${count}`,
    spacesOfCapacity: (avail: number, cap: number) => `ඉඩකඩ ${avail} / ${cap}`,
    spacesAvailable: (avail: number) => `ඉඩකඩ ${avail} ක් ඇත`,
    nearby: 'ආසන්නයේ',
    locationOnMap: 'සිතියමේ ස්ථානය පෙන්වා ඇත',
    details: 'විස්තර',
    emergencyContacts: 'හදිසි දුරකථන අංක',
    contactEmergency: 'හදිසි ඇමතුම්',
    contactPolice: 'පොලීසිය',
    contactDmc: 'ආපදා කළමනාකරණ',
    contactSevana: 'සෙවන උපකාරක',
    navHome: 'මුල් පිටුව',
    navRequests: 'ඉල්ලීම්',
    navShelters: 'නවාතැන්',
    navAlerts: 'දැනුම්දීම්',
    nearbyReliefShelters: 'ආසන්න ආරක්ෂිත නවාතැන්',
    close: 'වසන්න',
    cancel: 'අවලංගු කරන්න',
    requestSpace: 'ඉඩ වෙන් කරන්න',
    requestSpaceAt: (name: string) => `${name} හි ඉඩ ඉල්ලන්න`,
    numberOfPeople: 'පුද්ගලයින් ගණන',
    notesOptional: 'විශේෂ සටහන් (අත්‍යවශ්‍ය නොවේ)',
    notesPlaceholder: 'උදා: වැඩිහිටි / කුඩා දරුවන්',
    sending: 'යවමින් පවතී...',
    confirmRequest: 'ඉල්ලීම තහවුරු කරන්න',
    submitRequest: 'ඉල්ලීම යවන්න',
    edit: 'සංස්කරණය',
    submitting: 'ඉදිරිපත් කරමින්...',
    confirmAndSubmit: 'තහවුරු කර ඉදිරිපත් කරන්න',
    accurateInfoAlert:
      'කරුණාකර නිවැරදි තොරතුරු ලබා දෙන්න. ව්‍යාජ ඉල්ලීම් අනෙක් අයට සහන ලැබීම ප්‍රමාද කළ හැකිය.',
    assistanceCategory: 'සහන වර්ගය',
    selectCategory: 'වර්ගය තෝරන්න...',
    categories: {
      food: 'ආහාර සහ ජලය',
      medicine: 'ඖෂධ සහ වෛද්‍ය සේවා',
      shelter: 'තාවකාලික නවාතැන්',
      transport: 'ප්‍රවාහන පහසුකම්',
      accessibility: 'ප්‍රවේශ්‍යතා සහාය',
      other: 'වෙනත්',
    } as Record<string, string>,
    urgencyLevel: 'හදිසි මට්ටම',
    selectUrgency: 'හදිසි මට්ටම තෝරන්න...',
    urgencies: {
      critical: 'අතිශය හදිසි — ජීවිතයට ක්ෂණික අවදානමක්',
      high: 'ඉහළ — පැය 2ක් ඇතුළත හදිසි අවශ්‍යතාව',
      medium: 'මධ්‍යම — අද දින ඇතුළත අවශ්‍යයි',
      low: 'අඩු — දින 1-2ක් රැඳී සිටිය හැක',
    } as Record<string, string>,
    description: 'විස්තරය',
    descriptionPlaceholder: 'ඔබේ තත්ත්වය සහ අවශ්‍ය සහාය විස්තර කරන්න...',
    yourCurrentLocation: 'ඔබේ වත්මන් ස්ථානය',
    useMyGps: 'මගේ GPS භාවිතා කරන්න',
    locating: 'ස්ථානය සොයමින්...',
    searchLocationPlaceholder: 'ශ්‍රී ලංකාවේ නගරය, මාර්ගය හෝ ස්ථානය සොයන්න...',
    locationPinned: (lat: string, lng: string) => `සිතියමේ ස්ථානය සලකුණු කළා (${lat}, ${lng})`,
    locationHelperPrefix: 'සහන කණ්ඩායම්වලට ඔබව සොයා ගැනීමට ලිපිනයක් තෝරන්න හෝ ',
    locationHelperSuffix: ' ඔබන්න.',
    affectedPeople: 'බලපෑමට ලක් වූ පුද්ගලයින් ගණන',
    supportingEvidence: 'අමතර සාක්ෂි (අත්‍යවශ්‍ය නොවේ)',
    uploadPrompt: 'ඡායාරූප හෝ ලේඛන උඩුගත කරන්න',
    uploadHint: 'JPG, PNG, PDF (10MB දක්වා)',
    aiAnalyzingTitle: 'AI ඔබේ ඉල්ලීම විශ්ලේෂණය කරමින් පවතී...',
    aiAnalyzingSub: 'හදිසි මට්ටම වර්ගීකරණය කරමින් සහ සම්පත් ගලපමින් සිටී',
    aiAnalysisResult: 'AI විශ්ලේෂණ ප්‍රතිඵලය',
    aiSummaryLabel: 'AI සාරාංශය',
    aiUnavailableTitle: 'AI විශ්ලේෂණය තාවකාලිකව ලබාගත නොහැක',
    aiUnavailableMsg:
      'AI විශ්ලේෂණය තාවකාලිකව ලබාගත නොහැක. කරුණාකර පසුව උත්සාහ කරන්න. ඔබට තවමත් සම්බන්ධීකාරක සමාලෝචනය සඳහා ඔබේ ඉල්ලීම කෙලින්ම ඉදිරිපත් කළ හැකිය.',
    confidence: (score: number) => `${score}% විශ්වාසනීයත්වය`,
    urgencyScore: 'හදිසි ලකුණු',
    recommendedAction: 'නිර්දේශිත ක්‍රියාමාර්ගය',
    nearestResource: 'ආසන්නතම සම්පත',
    aiDisclaimer: 'AI නිර්දේශ බලයලත් සම්බන්ධීකාරකවරුන්ගේ සමාලෝචනයට යටත් වේ.',
    requestReadyTitle: 'ඉල්ලීම යැවීමට සූදානම්',
    requestReadyMsg: 'ඉදිරිපත් කිරීමෙන් පසු ඔබට ලුහුබැඳීමේ අංකයක් ලැබෙනු ඇත.',
    requestSubmittedTitle: 'ඉල්ලීම ඉදිරිපත් කළා!',
    trackingNumberLabel: 'ඔබේ ලුහුබැඳීමේ අංකය',
    locationSharedMsg: 'ඉක්මන් ප්‍රතිචාර සඳහා ඔබේ ස්ථානය සම්බන්ධීකාරකවරුන් සමඟ බෙදාගෙන ඇත.',
    trackRequest: 'ඉල්ලීම ලුහුබඳින්න',
    trackingUpdateHint: 'සම්බන්ධීකාරකවරුන් ඔබේ ඉල්ලීම සකසන විට විස්තර ස්වයංක්‍රීයව යාවත්කාලීන වේ',
    statusCompleted: 'සම්පූර්ණයි',
    statusCurrent: 'වත්මන් තත්ත්වය',
    statusPending: 'පොරොත්තුවෙන්',
    timeline: [
      { status: 'ඉදිරිපත් කළා', desc: 'ඔබේ ඉල්ලීම ලැබී සමාලෝචනය සඳහා යොමු කර ඇත.' },
      { status: 'සමාලෝචනය වෙමින්', desc: 'සම්බන්ධීකාරකවරයෙකු ඔබේ ඉල්ලීම පරීක්ෂා කරමින් සිටී.' },
      { status: 'පවරා ඇත', desc: 'සහන කණ්ඩායමක් හෝ ස්වේච්ඡා සේවකයෙකු පවරා ඇත.' },
      { status: 'ක්‍රියාත්මක වෙමින්', desc: 'සහන කණ්ඩායම ඔබ වෙත පැමිණෙමින් සිටී.' },
      { status: 'බෙදා හරින ලදී', desc: 'සහන සේවාව ලබා දී අවසන්.' },
    ],
    rateExperience: 'ඔබේ අත්දැකීම අගයන්න',
    ratePrompt: 'ලබා දුන් සහන සේවාව පිළිබඳව ඔබ කෙතරම් සෑහීමකට පත්වේද?',
    additionalComments: 'අමතර අදහස් (අත්‍යවශ්‍ය නොවේ)',
    skip: 'මඟ හරින්න',
    submitFeedback: 'ප්‍රතිචාරය යවන්න',
    assignedResponder: 'පවරා ඇති සහන සේවකයා',
    retrievingResponder: 'සහන සේවක විස්තර ලබා ගනිමින්...',
    responderFallback: 'සහන සේවකයා',
    noPhoneProvided: 'දුරකථන අංකයක් ලබා දී නැත',
    responderEnRoute:
      'සහන සේවකයා ඔබ වෙත පැමිණෙමින් සිටී. ස්ථානය සම්බන්ධීකරණය කිරීමට කරුණාකර දුරකථනයෙන් අමතන්න.',
    callResponder: 'සහන සේවකයා අමතන්න',
    couldNotLoadResponder: 'සහන සේවක විස්තර පූරණය කිරීමට නොහැකි විය.',
    toastGeoUnsupported: 'ඔබේ බ්‍රව්සරය GPS ස්ථාන සේවාවට සහාය නොදක්වයි.',
    toastGpsCaptured: 'නිවැරදි GPS ස්ථානය ලබා ගත්තා.',
    toastGpsFailed: 'GPS ලබා ගැනීමට නොහැකි විය. කරුණාකර පහතින් ඔබේ ලිපිනය සොයා තෝරන්න.',
    toastValidPeople: 'කරුණාකර වලංගු පුද්ගලයින් සංඛ්‍යාවක් ඇතුළත් කරන්න.',
    toastShelterReqSent: (name: string) =>
      `${name} වෙත නවාතැන් ඉල්ලීම යවන ලදී. කළමනාකරු එය ඉක්මනින් තහවුරු කරනු ඇත.`,
    toastShelterReqFailed: 'නවාතැන් ඉල්ලීම යැවීම අසාර්ථක විය.',
    toastFillRequired: 'කරුණාකර අවශ්‍ය සියලුම ක්ෂේත්‍ර පුරවන්න.',
    toastPinLocation:
      'සිතියමේ ස්ථානය සලකුණු කිරීමට කරුණාකර ලැයිස්තුවෙන් ලිපිනයක් තෝරන්න හෝ "මගේ GPS භාවිතා කරන්න" ඔබන්න.',
    toastSubmitFailed: 'සහන ඉල්ලීම ඉදිරිපත් කිරීම අසාර්ථක විය.',
  },

  ta: {
    brandSub: 'செவன',
    notifications: 'அறிவிப்புகள்',
    welcome: 'வணக்கம்,',
    citizenFallback: 'குடிமகன்',
    portalSubtitle: 'அவசர காலங்களில் தகவலறிந்திருங்கள் மற்றும் நிவாரண உதவிகளைப் பெறுங்கள்',
    assignedReliefShelter: 'ஒதுக்கப்பட்ட பாதுகாப்பு தங்குமிடம்',
    verified: 'உறுதிசெய்யப்பட்டது',
    getDirections: 'வழிகாட்டுதல்',
    directions: 'வழி',
    callShelter: 'தங்குமிடத்தை அழைக்கவும்',
    call: 'அழைக்கவும்',
    requestAssistance: 'உதவி கோரவும்',
    requestAssistanceSub: 'உணவு, மருந்து, தங்குமிடம்...',
    findShelter: 'தங்குமிடம் தேடவும்',
    sheltersNearby: (count: number) => `அருகில் ${count} தங்குமிடங்கள்`,
    accessVolunteerDashboard: 'தன்னார்வலர் கட்டுப்பாட்டுப் பலகை',
    accessVolunteerDashboardSub: 'உங்கள் செயலில் உள்ள களப் பணிகளைப் பார்க்கவும்',
    applyToVolunteer: 'தன்னார்வலராக விண்ணப்பிக்கவும்',
    applyToVolunteerSub: 'கள நிவாரணக் குழுவில் இணையுங்கள்',
    myRequests: 'எனது கோரிக்கைகள்',
    activeRequestsTab: 'செயலில்',
    requestHistoryTab: 'வரலாறு',
    noActiveRequests: 'செயலில் உள்ள கோரிக்கைகள் இல்லை. உங்கள் முந்தைய கோரிக்கைகள் வரலாற்றில் உள்ளன.',
    viewHistory: 'வரலாற்றைப் பார்க்கவும்',
    noHistoryRequests: 'மூடப்பட்ட, வழங்கப்பட்ட அல்லது முடிக்கப்பட்ட கோரிக்கைகள் இன்னும் இல்லை.',
    loadingRequests: 'கோரிக்கைகள் ஏற்றப்படுகின்றன...',
    noRequestsYet: 'நீங்கள் இதுவரை எந்த கோரிக்கையும் சமர்ப்பிக்கவில்லை.',
    assignedShelterLabel: 'ஒதுக்கப்பட்ட தங்குமிடம்:',
    requestedShelterLabel: 'கோரப்பட்ட தங்குமிடம்:',
    awaitingManagerVerification: '(மேலாளர் உறுதிப்படுத்தலுக்காக காத்திருக்கிறது)',
    aidTeamDispatched: 'நிவாரணக் குழு புறப்பட்டுள்ளது — சுமார் 30 நிமிடங்கள்',
    postResolutionCheckIn: 'உதவி வழங்கிய பின் உறுதிப்படுத்தல்',
    confirmRateAid: 'உறுதிப்படுத்தி மதிப்பிடவும்',
    requestRecoveryFollowUp: 'மீட்பு உதவியைக் கோரவும்',
    verifiedByCitizen: 'குடிமகனால் உறுதிப்படுத்தப்பட்டது',
    recoveryFollowUpDescription: (id: string) => `கோரிக்கை ${id}க்கான பேரிடர் மீட்பு உதவி.`,
    feedbackThankYou: 'உறுதிப்படுத்தி மதிப்பிட்டதற்கு நன்றி.',
    feedbackAlreadySubmitted: 'இந்தக் கோரிக்கைக்கான கருத்து ஏற்கனவே சமர்ப்பிக்கப்பட்டது. இது உறுதிப்படுத்தப்பட்டதாகக் குறிக்கப்பட்டுள்ளது.',
    feedbackStatusNotEligible: 'வழங்கப்பட்ட அல்லது மூடப்பட்ட கோரிக்கைகளுக்கு மட்டுமே கருத்து சமர்ப்பிக்க முடியும்.',
    feedbackSubmitFailed: 'கருத்தைச் சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    feedbackSaveFailed: 'உங்கள் உறுதிப்படுத்தலை இந்தச் சாதனத்தில் சேமிக்க முடியவில்லை.',
    viewResponderDetails: 'உதவியாளர் விவரங்களைப் பார்க்கவும்',
    nearbyShelters: 'அருகிலுள்ள தங்குமிடங்கள்',
    viewAll: 'அனைத்தும்',
    locatingShelters: 'தங்குமிடங்கள் தேடப்படுகின்றன...',
    locatingOpenShelters: 'உங்கள் அருகிலுள்ள திறந்த தங்குமிடங்கள் தேடப்படுகின்றன...',
    noOpenShelters: 'உங்கள் அருகிலுள்ள பகுதியில் திறந்த தங்குமிடங்கள் எதுவும் இல்லை.',
    noOpenSheltersModal:
      'உங்கள் அருகிலுள்ள பகுதியில் திறந்த தங்குமிடங்கள் எதுவும் இல்லை. ஒருங்கிணைப்பாளரின் உதவியைப் பெற உதவி கோரிக்கையைச் சமர்ப்பிக்கவும்.',
    spaces: (count: number) => `${count} இடங்கள்`,
    spacesOfCapacity: (avail: number, cap: number) => `${avail} / ${cap} இடங்கள்`,
    spacesAvailable: (avail: number) => `${avail} இடங்கள் உள்ளன`,
    nearby: 'அருகில்',
    locationOnMap: 'வரைபடத்தில் இடம் உள்ளது',
    details: 'விவரங்கள்',
    emergencyContacts: 'அவசர தொடர்பு எண்கள்',
    contactEmergency: 'அவசர உதவி',
    contactPolice: 'காவல்துறை',
    contactDmc: 'அனர்த்த முகாமைத்துவம்',
    contactSevana: 'செவன உதவி',
    navHome: 'முகப்பு',
    navRequests: 'கோரிக்கைகள்',
    navShelters: 'தங்குமிடங்கள்',
    navAlerts: 'அறிவிப்புகள்',
    nearbyReliefShelters: 'அருகிலுள்ள நிவாரணத் தங்குமிடங்கள்',
    close: 'மூடு',
    cancel: 'ரத்து செய்',
    requestSpace: 'இடம் கோரவும்',
    requestSpaceAt: (name: string) => `${name} இல் இடம் கோரவும்`,
    numberOfPeople: 'நபர்களின் எண்ணிக்கை',
    notesOptional: 'குறிப்புகள் (விருப்பமானது)',
    notesPlaceholder: 'எ.கா: முதியவர் / குழந்தை',
    sending: 'அனுப்பப்படுகிறது...',
    confirmRequest: 'கோரிக்கையை உறுதிப்படுத்து',
    submitRequest: 'கோரிக்கையை சமர்ப்பி',
    edit: 'திருத்து',
    submitting: 'சமர்ப்பிக்கப்படுகிறது...',
    confirmAndSubmit: 'உறுதிசெய்து சமர்ப்பி',
    accurateInfoAlert:
      'தயவுசெய்து துல்லியமான தகவலை வழங்கவும். தவறான கோரிக்கைகள் மற்றவர்களுக்கு உதவி கிடைப்பதை தாமதப்படுத்தலாம்.',
    assistanceCategory: 'உதவி வகை',
    selectCategory: 'வகையைத் தேர்ந்தெடுக்கவும்...',
    categories: {
      food: 'உணவு மற்றும் நீர்',
      medicine: 'மருந்து மற்றும் மருத்துவம்',
      shelter: 'தற்காலிக தங்குமிடம்',
      transport: 'போக்குவரத்து',
      accessibility: 'அணுகல்தன்மை உதவி',
      other: 'மற்றவை',
    } as Record<string, string>,
    urgencyLevel: 'அவசர நிலை',
    selectUrgency: 'அவசர நிலையைத் தேர்ந்தெடுக்கவும்...',
    urgencies: {
      critical: 'மிக அவசரம் — உயிருக்கு உடனடி ஆபத்து',
      high: 'அதிகம் — 2 மணி நேரத்திற்குள் அவசர தேவை',
      medium: 'நடுத்தரம் — இன்று தேவை',
      low: 'குறைவு — 1-2 நாட்கள் காத்திருக்கலாம்',
    } as Record<string, string>,
    description: 'விளக்கம்',
    descriptionPlaceholder: 'உங்கள் சூழ்நிலை மற்றும் தேவையான உதவியை விவரிக்கவும்...',
    yourCurrentLocation: 'உங்கள் தற்போதைய இடம்',
    useMyGps: 'எனது GPS ஐப் பயன்படுத்து',
    locating: 'இடம் தேடப்படுகிறது...',
    searchLocationPlaceholder: 'இலங்கையில் நகரம், வீதி அல்லது அடையாளத்தைத் தேடுங்கள்...',
    locationPinned: (lat: string, lng: string) => `வரைபடத்தில் இடம் குறிக்கப்பட்டது (${lat}, ${lng})`,
    locationHelperPrefix: 'உதவியாளர்கள் உங்களைக் கண்டறிய முகவரியைத் தேர்ந்தெடுக்கவும் அல்லது ',
    locationHelperSuffix: ' என்பதைக் கிளிக் செய்யவும்.',
    affectedPeople: 'பாதிக்கப்பட்டவர்களின் எண்ணிக்கை',
    supportingEvidence: 'ஆதாரங்கள் (விருப்பமானது)',
    uploadPrompt: 'புகைப்படங்கள் அல்லது ஆவணங்களைப் பதிவேற்றவும்',
    uploadHint: 'JPG, PNG, PDF (10MB வரை)',
    aiAnalyzingTitle: 'AI உங்கள் கோரிக்கையை பகுப்பாய்வு செய்கிறது...',
    aiAnalyzingSub: 'அவசர நிலையை வகைப்படுத்தி வளங்களைப் பொருத்துகிறது',
    aiAnalysisResult: 'AI பகுப்பாய்வு முடிவு',
    aiSummaryLabel: 'AI சுருக்கம்',
    aiUnavailableTitle: 'AI பகுப்பாய்வு தற்காலிகமாக கிடைக்கவில்லை',
    aiUnavailableMsg:
      'AI பகுப்பாய்வு தற்காலிகமாக கிடைக்கவில்லை. தயவுசெய்து பின்னர் முயற்சிக்கவும். ஒருங்கிணைப்பாளர் மதிப்பாய்விற்காக உங்கள் கோரிக்கையை நேரடியாகச் சமர்ப்பிக்கலாம்.',
    confidence: (score: number) => `${score}% நம்பகத்தன்மை`,
    urgencyScore: 'அவசர மதிப்பெண்',
    recommendedAction: 'பரிந்துரைக்கப்பட்ட நடவடிக்கை',
    nearestResource: 'அருகிலுள்ள வளம்',
    aiDisclaimer: 'AI பரிந்துரைகள் அங்கீகரிக்கப்பட்ட ஒருங்கிணைப்பாளர்களின் மதிப்பாய்வுக்கு உட்பட்டவை.',
    requestReadyTitle: 'கோரிக்கை சமர்ப்பிக்கத் தயார்',
    requestReadyMsg: 'சமர்ப்பித்தவுடன் உங்களுக்கு கண்காணிப்பு எண் வழங்கப்படும்.',
    requestSubmittedTitle: 'கோரிக்கை சமர்ப்பிக்கப்பட்டது!',
    trackingNumberLabel: 'உங்கள் கண்காணிப்பு எண்',
    locationSharedMsg: 'விரைவான உதவிக்காக உங்கள் இடம் ஒருங்கிணைப்பாளர்களுடன் பகிரப்பட்டுள்ளது.',
    trackRequest: 'கோரிக்கையைக் கண்காணிக்கவும்',
    trackingUpdateHint: 'ஒருங்கிணைப்பாளர்கள் உங்கள் கோரிக்கையைச் செயலாக்கும்போது விவரங்கள் தானாகப் புதுப்பிக்கப்படும்',
    statusCompleted: 'முடிந்தது',
    statusCurrent: 'தற்போதைய நிலை',
    statusPending: 'நிலுவையில்',
    timeline: [
      { status: 'சமர்ப்பிக்கப்பட்டது', desc: 'உங்கள் கோரிக்கை பெறப்பட்டு மதிப்பாய்வுக்கு அனுப்பப்பட்டுள்ளது.' },
      { status: 'மதிப்பாய்வில் உள்ளது', desc: 'ஒருங்கிணைப்பாளர் உங்கள் கோரிக்கையை ஆய்வு செய்கிறார்.' },
      { status: 'ஒதுக்கப்பட்டது', desc: 'நிவாரணக் குழு அல்லது தன்னார்வலர் ஒதுக்கப்பட்டுள்ளார்.' },
      { status: 'நடைபெற்று வருகிறது', desc: 'நிவாரணக் குழு வந்து கொண்டிருக்கிறது.' },
      { status: 'வழங்கப்பட்டது', desc: 'உதவி வெற்றிகரமாக வழங்கப்பட்டது.' },
    ],
    rateExperience: 'உங்கள் அனுபவத்தை மதிப்பிடவும்',
    ratePrompt: 'வழங்கப்பட்ட உதவியில் நீங்கள் எவ்வளவு திருப்தி அடைந்தீர்கள்?',
    additionalComments: 'கூடுதல் கருத்துகள் (விருப்பமானது)',
    skip: 'தவிர்',
    submitFeedback: 'கருத்தைச் சமர்ப்பி',
    assignedResponder: 'ஒதுக்கப்பட்ட உதவியாளர்',
    retrievingResponder: 'உதவியாளர் விவரங்கள் பெறப்படுகின்றன...',
    responderFallback: 'ஒதுக்கப்பட்ட உதவியாளர்',
    noPhoneProvided: 'தொலைபேசி எண் வழங்கப்படவில்லை',
    responderEnRoute:
      'உங்கள் உதவியாளர் வந்து கொண்டிருக்கிறார். உங்கள் இடத்தை ஒருங்கிணைக்க தொலைபேசியில் தொடர்பு கொள்ளவும்.',
    callResponder: 'உதவியாளரை அழைக்கவும்',
    couldNotLoadResponder: 'உதவியாளர் விவரங்களை ஏற்ற முடியவில்லை.',
    toastGeoUnsupported: 'உங்கள் உலாவி GPS இருப்பிட சேவையை ஆதரிக்கவில்லை.',
    toastGpsCaptured: 'துல்லியமான GPS இடம் பெறப்பட்டது.',
    toastGpsFailed: 'GPS பெற முடியவில்லை. கீழே உங்கள் முகவரியைத் தேடித் தேர்ந்தெடுக்கவும்.',
    toastValidPeople: 'சரியான நபர்களின் எண்ணிக்கையை உள்ளிடவும்.',
    toastShelterReqSent: (name: string) =>
      `${name} இற்கான தங்குமிடக் கோரிக்கை அனுப்பப்பட்டது. மேலாளர் விரைவில் உறுதிப்படுத்துவார்.`,
    toastShelterReqFailed: 'தங்குமிடக் கோரிக்கையை அனுப்ப முடியவில்லை.',
    toastFillRequired: 'தேவையான அனைத்து புலங்களையும் நிரப்பவும்.',
    toastPinLocation:
      'வரைபடத்தில் இடத்தைக் குறிக்க பட்டியலிலிருந்து முகவரியைத் தேர்ந்தெடுக்கவும் அல்லது "எனது GPS ஐப் பயன்படுத்து" என்பதைக் கிளிக் செய்யவும்.',
    toastSubmitFailed: 'உதவி கோரிக்கையைச் சமர்ப்பிக்க முடியவில்லை.',
  },
};

type TranslationDict = typeof translations.en;

const APPROVED_SHELTER_STATUSES = [
  'assigned',
  'verified',
  'approved',
  'inprogress',
  'completed',
  'delivered',
];

function isApprovedShelterStatus(status: string): boolean {
  return APPROVED_SHELTER_STATUSES.includes(String(status || '').toLowerCase());
}

function getRequestStageIndex(status: string): number {
  const normalized = String(status || '').toLowerCase().replace(/\s+/g, '');
  if (normalized === 'delivered' || normalized === 'completed' || normalized === 'closed') return 4;
  if (normalized === 'inprogress') return 3;
  if (normalized === 'assigned') return 2;
  if (normalized === 'underreview' || normalized === 'verified' || normalized === 'approved') return 1;
  return 0;
}

function canSubmitRequestFeedback(status: unknown): boolean {
  const normalized = String(status ?? '').trim().toLowerCase();
  return normalized === 'delivered' || normalized === 'closed';
}

function isDuplicateFeedbackError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 409) return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /duplicate|already.{0,30}(submitted|provided|exists|given|recorded)|feedback.{0,30}already/i.test(message);
}

function getInitialLang(): CitizenLang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'si' || saved === 'ta') return saved;
  } catch {
    // ignore storage errors
  }
  return 'en';
}

function MobileNav({ active, t }: { active: string; t: TranslationDict }) {
  const items = [
    { key: 'Home', label: t.navHome, icon: <Home size={20} />, path: '/citizen' },
    { key: 'Requests', label: t.navRequests, icon: <Package size={20} />, path: '/citizen/requests' },
    { key: 'Shelters', label: t.navShelters, icon: <MapPin size={20} />, path: '/citizen/shelters' },
    { key: 'Alerts', label: t.navAlerts, icon: <Bell size={20} />, path: '/notifications' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBD8E6] flex z-40 lg:hidden">
      {items.map(item => (
        <Link
          key={item.key}
          to={item.path}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs ${
            active === item.key ? 'text-[#1A3A6B]' : 'text-[#5A7290]'
          }`}
        >
          {item.icon}
          <span className="truncate max-w-full px-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function CitizenPortal() {
  const { user, addToast } = useAppContext();
  const [lang, setLangState] = useState<CitizenLang>(getInitialLang);
  const t = translations[lang];

  const setLang = (next: CitizenLang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const openRequest = searchParams.get('openRequest');
    const openShelters = searchParams.get('openShelters');

    if (openRequest === 'true') {
      setShowRequestModal(true);
      setSearchParams({}, { replace: true });
    } else if (openShelters === 'true') {
      setShowShelterModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [requestStep, setRequestStep] = useState<'form' | 'ai' | 'confirm' | 'success'>('form');
  const [trackedRequest, setTrackedRequest] = useState<any | null>(null);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [verifiedRequestIds, setVerifiedRequestIds] = useState<Set<string>>(getVerifiedRequestIds);

  // Live Backend States
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [requestView, setRequestView] = useState<RequestView>('active');
  const [nearbyShelters, setNearbyShelters] = useState<any[]>([]);
  const [assignedShelter, setAssignedShelter] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // Direct Shelter Request Modal States
  const [shelterToRequest, setShelterToRequest] = useState<any>(null);
  const [shelterReqForm, setShelterReqForm] = useState({ peopleCount: '1', notes: '' });
  const [isRequestingShelter, setIsRequestingShelter] = useState(false);

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
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const openFeedbackModal = (requestId: string) => {
    const request = myRequests.find(item => String(item.id) === requestId);
    if (!request || !canSubmitRequestFeedback(request.status)) {
      addToast({ type: 'error', message: t.feedbackStatusNotEligible });
      return;
    }
    setFeedbackRequestId(requestId);
    setRating(0);
    setFeedbackComments('');
    setFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setFeedbackModal(false);
    setFeedbackRequestId(null);
    setRating(0);
    setFeedbackComments('');
  };

  const submitFeedback = async () => {
    if (!feedbackRequestId || !Number.isInteger(rating) || rating < 1 || rating > 5) return;
    const request = myRequests.find(item => String(item.id) === feedbackRequestId);
    if (!request || !canSubmitRequestFeedback(request.status)) {
      addToast({ type: 'error', message: t.feedbackStatusNotEligible });
      return;
    }
    const confirmedRequestId = feedbackRequestId;
    const trimmedComment = feedbackComments.trim();
    const markAsVerified = (duplicate: boolean) => {
      setVerifiedRequestIds(previous => new Set([...previous, confirmedRequestId]));
      try {
        const stored = localStorage.getItem(VERIFIED_REQUESTS_STORAGE_KEY);
        let existingRecords: Record<string, unknown>[] = [];
        if (stored) {
          try {
            const parsed: unknown = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              existingRecords = parsed.filter(
                (entry): entry is Record<string, unknown> =>
                  typeof entry === 'object' &&
                  entry !== null &&
                  !Array.isArray(entry) &&
                  typeof entry.requestId === 'string'
              );
            }
          } catch (error: unknown) {
            console.warn('Stored citizen feedback was invalid and will be replaced.', error);
          }
        }

        const nextRecords = existingRecords.filter(record => record.requestId !== confirmedRequestId);
        nextRecords.push({
          requestId: confirmedRequestId,
          rating,
          comment: trimmedComment || undefined,
          confirmedAtUtc: new Date().toISOString()
        });
        localStorage.setItem(VERIFIED_REQUESTS_STORAGE_KEY, JSON.stringify(nextRecords));
      } catch (error: unknown) {
        console.error('Failed to save citizen aid confirmation locally.', error);
        addToast({ type: 'error', message: t.feedbackSaveFailed });
      }

      closeFeedbackModal();
      addToast({
        type: duplicate ? 'info' : 'success',
        message: duplicate ? t.feedbackAlreadySubmitted : t.feedbackThankYou
      });
    };

    setIsSubmittingFeedback(true);
    try {
      await apiClient(`/api/v1/requests/${encodeURIComponent(confirmedRequestId)}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          ...(trimmedComment ? { comment: trimmedComment } : {})
        })
      });
      markAsVerified(false);
    } catch (error: unknown) {
      if (isDuplicateFeedbackError(error)) {
        markAsVerified(true);
      } else {
        console.error('Failed to submit citizen request feedback.', error);
        addToast({
          type: 'error',
          message: error instanceof Error && error.message ? error.message : t.feedbackSubmitFailed
        });
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const openRecoveryFollowUp = (request: any) => {
    const requestId = String(request.id || '');
    const location = String(request.location || '');
    const rawCategory = String(request.category || 'other').toLowerCase();
    const category = ['food', 'medicine', 'shelter', 'transport', 'accessibility', 'other']
      .find(value => rawCategory.includes(value)) || 'other';
    const rawUrgency = String(request.urgency || request.priority || 'medium').toLowerCase();
    const urgency = ['critical', 'high', 'medium', 'low'].find(value => rawUrgency.includes(value)) || 'medium';
    const affectedCount = Number(
      request.affectedPeopleCount ?? request.affectedCount ?? request.affected ?? 1
    );
    const latitude = request.latitude === null || request.latitude === undefined ? null : Number(request.latitude);
    const longitude = request.longitude === null || request.longitude === undefined ? null : Number(request.longitude);

    setForm({
      category,
      urgency,
      description: `${t.recoveryFollowUpDescription(requestId)} ${String(request.description || '')}`.trim(),
      location,
      latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null,
      longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null,
      affected: Number.isFinite(affectedCount) && affectedCount > 0 ? String(affectedCount) : '1',
    });
    setLocationSearch(location);
    setLocationResults([]);
    setShowLocationDropdown(false);
    setRequestStep('form');
    setAiResult(null);
    setAiUnavailable(false);
    setShowRequestModal(true);
  };

  // Debounced search for OpenStreetMap (Sri Lanka, localized to selected language)
  useEffect(() => {
    if (locationSearch.length < 3 || locationSearch === form.location) {
      setLocationResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&addressdetails=1&countrycodes=lk&limit=5&accept-language=${lang}`
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
  }, [locationSearch, form.location, lang]);

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
      addToast({ type: 'error', message: t.toastGeoUnsupported });
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let resolvedAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}`
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
        addToast({ type: 'success', message: t.toastGpsCaptured });
      },
      (err) => {
        console.error('GPS Error:', err);
        setIsLocatingGps(false);
        addToast({ type: 'error', message: t.toastGpsFailed });
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
        distance: typeof s.distance === 'number' ? `${s.distance.toFixed(1)} km` : (s.distance || s.Distance || ''),
        available,
        capacity,
        hasCapacity: rawCapacity > 0,
        facilities: Array.isArray(s.facilities) ? s.facilities : (s.Facilities || []),
      };
    });

  const loadDashboardData = useCallback(async () => {
    try {
      const [reqResponse, notifResponse, assignmentResponse] = await Promise.all([
        apiClient('/api/v1/requests/my-requests', { method: 'GET' }),
        getNotifications().catch(() => []),
        apiClient('/api/v1/shelters/my-assignment', { method: 'GET' }).catch(() => null),
      ]);

      const requestsArray = Array.isArray(reqResponse) ? reqResponse : (reqResponse?.data || reqResponse?.items || []);
      const normalizedRequests = requestsArray.map((r: any) => ({
        id: r.id || r.Id,
        category: r.category || r.Category || 'other',
        status: String(r.status || r.Status || 'pending').toLowerCase(),
        updated: new Date(r.createdAtUtc || r.CreatedAtUtc || Date.now()).toLocaleDateString(),
        description: r.description || r.Description,
        priority: r.priority || r.Priority || r.urgency || 'medium',
        urgency: r.urgency || r.Urgency || r.priority || r.Priority || 'medium',
        location: r.location || r.Location,
        latitude: r.latitude ?? r.Latitude ?? null,
        longitude: r.longitude ?? r.Longitude ?? null,
        affectedPeopleCount: r.affectedPeopleCount ?? r.AffectedPeopleCount ?? r.affectedCount ?? r.affected ?? 1,
        assignedShelterName: r.assignedShelterName || r.AssignedShelterName || null,
        assignedShelterLocation: r.assignedShelterLocation || r.AssignedShelterLocation || '',
        assignedShelterContact: r.assignedShelterContact || r.AssignedShelterContact || '',
        assignedShelterLatitude: r.assignedShelterLatitude ?? r.AssignedShelterLatitude ?? null,
        assignedShelterLongitude: r.assignedShelterLongitude ?? r.AssignedShelterLongitude ?? null,
        aiSummary: r.aiSummary || r.AiSummary || '',
        aiRecommendation: r.aiRecommendation || r.AiRecommendation || '',
        aiConfidenceScore: r.aiConfidenceScore ?? r.AiConfidenceScore ?? null,
      }));
      setMyRequests(normalizedRequests);

      // Show top Assigned Shelter banner only when verified/approved
      const assignmentStatus = assignmentResponse?.status || assignmentResponse?.Status || '';
      const hasApprovedAssignment =
        assignmentResponse &&
        (assignmentResponse.shelterName || assignmentResponse.name || assignmentResponse.assignedShelterName) &&
        (!assignmentStatus || isApprovedShelterStatus(assignmentStatus));

      if (hasApprovedAssignment) {
        setAssignedShelter({
          name: assignmentResponse.shelterName || assignmentResponse.name || assignmentResponse.assignedShelterName,
          location: assignmentResponse.location || assignmentResponse.assignedShelterLocation || '',
          contact: assignmentResponse.contactNumber || assignmentResponse.contact || assignmentResponse.assignedShelterContact || '',
          latitude: assignmentResponse.latitude ?? assignmentResponse.assignedShelterLatitude ?? null,
          longitude: assignmentResponse.longitude ?? assignmentResponse.assignedShelterLongitude ?? null,
          peopleCount: assignmentResponse.peopleCount ?? 1,
        });
      } else {
        const verifiedReq = normalizedRequests.find(
          (r: any) => r.assignedShelterName && isApprovedShelterStatus(r.status)
        );
        if (verifiedReq) {
          setAssignedShelter({
            name: verifiedReq.assignedShelterName,
            location: verifiedReq.assignedShelterLocation || verifiedReq.location || '',
            contact: verifiedReq.assignedShelterContact || '',
            latitude: verifiedReq.assignedShelterLatitude,
            longitude: verifiedReq.assignedShelterLongitude,
          });
        } else {
          setAssignedShelter(null);
        }
      }

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
            console.warn('Geolocation denied or unavailable. Loading default shelters.');
            const shelterResp = await apiClient(`/api/v1/shelters/nearby?latitude=6.9497&longitude=79.9248&radiusKm=20`, { method: 'GET' });
            const sheltersArray = Array.isArray(shelterResp) ? shelterResp : (shelterResp?.data || shelterResp?.items || []);
            setNearbyShelters(mapShelterData(sheltersArray));
          }
        );
      }
    } catch (error: any) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRequestShelterSpace = async () => {
    if (!shelterToRequest) return;
    const count = parseInt(shelterReqForm.peopleCount, 10);
    if (isNaN(count) || count < 1) {
      addToast({ type: 'error', message: t.toastValidPeople });
      return;
    }

    const trimmedNotes = shelterReqForm.notes.trim();
    const description =
      trimmedNotes || `Requesting shelter space for ${count} person(s) at ${shelterToRequest.name}.`;
    const location = (
      shelterToRequest.location ||
      shelterToRequest.district ||
      shelterToRequest.name ||
      'Sri Lanka'
    ).slice(0, 300);

    setIsRequestingShelter(true);
    try {
      await apiClient(`/api/v1/shelters/${shelterToRequest.id}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          peopleCount: count,
          affected: count,
          affectedPeopleCount: count,
          description,
          notes: trimmedNotes,
          location,
          latitude: shelterToRequest.latitude ?? 6.9271,
          longitude: shelterToRequest.longitude ?? 79.8612,
          urgency: 'high',
          category: 'shelter',
          language: lang,
        }),
      });
      addToast({
        type: 'success',
        message: t.toastShelterReqSent(shelterToRequest.name),
      });
      setShelterToRequest(null);
      setShelterReqForm({ peopleCount: '1', notes: '' });
      setShowShelterModal(false);
      loadDashboardData();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || t.toastShelterReqFailed });
    } finally {
      setIsRequestingShelter(false);
    }
  };

  const submitRequest = async () => {
    if (!form.category || !form.urgency || !form.description || !form.location) {
      addToast({ type: 'error', message: t.toastFillRequired });
      return;
    }

    if (form.latitude === null || form.longitude === null) {
      addToast({ type: 'error', message: t.toastPinLocation });
      return;
    }

    setAiResult(null);
    setAiUnavailable(false);
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
          affected: parseInt(form.affected, 10) || 1,
          language: lang,
        }),
      });

      if (!response || typeof response !== 'object') {
        setAiUnavailable(true);
      } else {
        setAiResult(response);
      }
      setRequestStep('confirm');
    } catch (error: any) {
      console.warn('AI Analysis unavailable:', error);
      setAiResult(null);
      setAiUnavailable(true);
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
          affected: parseInt(form.affected, 10) || 1,
          language: lang,
        }),
      });

      const newTrackingId = response?.id || response?.Id || response?.data?.id || `REQ-${Math.floor(Math.random() * 10000)}`;
      setTrackingId(newTrackingId);

      setRequestStep('success');

      setTimeout(() => {
        setShowRequestModal(false);
        setRequestStep('form');
        setAiResult(null);
        setAiUnavailable(false);
        setForm({ category: '', urgency: '', description: '', location: '', latitude: null, longitude: null, affected: '1' });
        setLocationSearch('');
        loadDashboardData();
      }, 3500);
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || t.toastSubmitFailed });
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
      console.error('Failed to load responder', err);
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

  const formatCategory = (rawCat: string) => {
    const key = String(rawCat || '').toLowerCase();
    return t.categories[key] || rawCat;
  };

  const activeRequests = myRequests.filter(request => !isArchivedStatus(request.status));
  const historyRequests = myRequests.filter(request => isArchivedStatus(request.status));
  const visibleRequests = requestView === 'active' ? activeRequests : historyRequests;

  const fontClass =
    lang === 'si'
      ? "font-['Noto_Sans_Sinhala',sans-serif]"
      : lang === 'ta'
      ? "font-['Noto_Sans_Tamil',sans-serif]"
      : '';

  return (
    <div className={`min-h-screen bg-[#F0F4F8] pb-20 lg:pb-0 ${fontClass}`}>
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
            <p className="text-[#60A5FA] text-[10px] font-sinhala font-medium mt-0.5">{t.brandSub}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Language Switcher: English / Sinhala / Tamil */}
          <div
            className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/15"
            role="group"
            aria-label="Language selector"
          >
            <Globe size={13} className="text-white/70 mx-1.5 hidden sm:block" />
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLang(opt.code)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  lang === opt.code
                    ? 'bg-white text-[#1A3A6B] shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Link
            to="/notifications"
            className="relative p-2 hover:bg-white/10 rounded-lg cursor-pointer"
            title={t.notifications}
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA580C] rounded-full" />
            )}
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h1 className="text-xl font-bold text-[#0D1B2E] font-[Outfit]">
            {t.welcome} {user?.name || t.citizenFallback}
          </h1>
          <p className="text-sm text-[#5A7290]">{t.portalSubtitle}</p>
        </div>

        {/* Assigned Shelter Highlight Card */}
        {assignedShelter && (
          <Card padding="p-4" className="bg-[#F0FDF4] border border-[#BBF7D0] animate-fade-in">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                  <Home size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#166534] uppercase">{t.assignedReliefShelter}</p>
                  <p className="text-base font-bold text-[#0D1B2E] font-[Outfit]">{assignedShelter.name}</p>
                </div>
              </div>
              <Badge variant="success">{t.verified}</Badge>
            </div>
            {assignedShelter.location && (
              <p className="text-xs text-[#166534] flex items-center gap-1 mt-1">
                <MapPin size={12} /> {assignedShelter.location}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <a
                href={getDirectionsUrl(assignedShelter)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#16A34A] text-white text-xs font-medium rounded-xl hover:bg-[#15803D] transition-colors"
              >
                <Navigation size={13} /> {t.getDirections} <ExternalLink size={11} />
              </a>
              {assignedShelter.contact && (
                <a
                  href={`tel:${assignedShelter.contact}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#BBF7D0] text-[#166534] text-xs font-medium rounded-xl hover:bg-[#DCFCE7] transition-colors"
                >
                  <Phone size={13} /> {t.callShelter}
                </a>
              )}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 animate-fade-in delay-100">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex flex-col items-center text-center gap-2 p-4 bg-[#1A3A6B] text-white rounded-2xl hover:bg-[#163060] transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="text-sm font-semibold leading-snug">{t.requestAssistance}</span>
            <span className="text-xs text-white/70">{t.requestAssistanceSub}</span>
          </button>
          <button
            onClick={() => setShowShelterModal(true)}
            className="flex flex-col items-center text-center gap-2 p-4 bg-white border border-[#CBD8E6] rounded-2xl hover:border-[#1A3A6B]/30 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center text-[#1A3A6B]">
              <MapPin size={20} />
            </div>
            <span className="text-sm font-semibold text-[#0D1B2E] leading-snug">{t.findShelter}</span>
            <span className="text-xs text-[#5A7290]">{t.sheltersNearby(nearbyShelters.length)}</span>
          </button>
        </div>

        {(user?.role === 'Volunteer' || user?.role === 'volunteer') ? (
          <div
            className="bg-green-50 border border-green-200 p-6 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-green-400 transition-all shadow-sm animate-fade-in"
            onClick={() => (window.location.href = '/volunteer-dashboard')}
          >
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Activity className="text-green-600" size={24} />
            </div>
            <h3 className="font-semibold text-green-900 mb-1">{t.accessVolunteerDashboard}</h3>
            <p className="text-xs text-green-700">{t.accessVolunteerDashboardSub}</p>
          </div>
        ) : (
          <div
            className="bg-white border border-[#CBD8E6] p-6 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#1D4ED8] transition-all shadow-sm animate-fade-in"
            onClick={() => (window.location.href = '/portal/volunteer-apply')}
          >
            <div className="bg-[#EFF6FF] w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <HeartHandshake className="text-[#1D4ED8]" size={24} />
            </div>
            <h3 className="font-semibold text-[#0D1B2E] mb-1">{t.applyToVolunteer}</h3>
            <p className="text-xs text-[#5A7290]">{t.applyToVolunteerSub}</p>
          </div>
        )}

        <div className="animate-fade-in delay-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0D1B2E] font-[Outfit]">{t.myRequests}</h2>
            <div className="inline-flex rounded-lg bg-[#E8EDF3] p-1" aria-label="Request lifecycle">
              <button
                type="button"
                onClick={() => setRequestView('active')}
                aria-pressed={requestView === 'active'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${requestView === 'active' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
              >
                {t.activeRequestsTab}
                <span className="rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-[10px] text-[#1D4ED8]">{activeRequests.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestView('history')}
                aria-pressed={requestView === 'history'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${requestView === 'history' ? 'bg-white text-[#1A3A6B] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
              >
                {t.requestHistoryTab}
                <span className="rounded-full bg-[#CBD5E1] px-1.5 py-0.5 text-[10px] text-[#475569]">{historyRequests.length}</span>
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {isLoadingData ? (
              <div className="text-center py-6 text-[#5A7290] text-sm">{t.loadingRequests}</div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-6 text-[#5A7290] text-sm bg-white rounded-2xl border border-[#CBD8E6]">
                {t.noRequestsYet}
              </div>
            ) : requestView === 'active' && activeRequests.length === 0 && historyRequests.length > 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#CBD8E6] bg-white px-4 py-6 text-center">
                <p className="text-sm text-[#5A7290]">{t.noActiveRequests}</p>
                <Button size="sm" onClick={() => setRequestView('history')}>
                  {t.viewHistory}
                </Button>
              </div>
            ) : visibleRequests.length === 0 ? (
              <div className="text-center py-6 text-[#5A7290] text-sm bg-white rounded-2xl border border-[#CBD8E6]">
                {t.noHistoryRequests}
              </div>
            ) : (
              visibleRequests.map(req => {
                const isResolvedRequest = isArchivedStatus(req.status);
                const isCitizenVerified = verifiedRequestIds.has(String(req.id));
                return (
                <Card key={req.id} padding="p-4" hover className="cursor-pointer" onClick={() => setTrackedRequest(req)}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <span className="font-mono text-xs text-[#1A3A6B] font-medium">{req.id}</span>
                      <p className="text-sm font-medium text-[#0D1B2E] mt-0.5">{req.description}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#5A7290] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Package size={12} />
                      {formatCategory(req.category)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {req.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {req.updated}
                    </span>
                  </div>
                  {(req.aiSummary || req.aiRecommendation) && (
                    <div className="mt-2.5 p-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between text-[#6D28D9] font-semibold">
                        <span className="flex items-center gap-1">
                          <Brain size={12} /> {t.aiSummaryLabel}
                        </span>
                        {req.aiConfidenceScore !== null && req.aiConfidenceScore > 0 && (
                          <span>{t.confidence(Math.round(req.aiConfidenceScore))}</span>
                        )}
                      </div>
                      {req.aiSummary && <p className="text-[#0D1B2E]">{req.aiSummary}</p>}
                      {req.aiRecommendation && (
                        <p className="text-[#5A7290]">
                          <strong>{t.recommendedAction}:</strong> {req.aiRecommendation}
                        </p>
                      )}
                    </div>
                  )}
                  {req.assignedShelterName && (
                    isApprovedShelterStatus(req.status) ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2">
                        <Home size={13} className="shrink-0" />
                        <span>
                          {t.assignedShelterLabel} <strong>{req.assignedShelterName}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">
                        <Clock size={13} className="shrink-0" />
                        <span>
                          {t.requestedShelterLabel} <strong>{req.assignedShelterName}</strong> {t.awaitingManagerVerification}
                        </span>
                      </div>
                    )
                  )}
                  {req.status === 'inprogress' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#16A34A] bg-[#F0FDF4] rounded-lg px-3 py-2">
                      <Truck size={12} />
                      <span>{t.aidTeamDispatched}</span>
                    </div>
                  )}
                  {isResolvedRequest && (
                    <div className="mt-3 rounded-xl border border-[#CBD8E6] bg-[#F8FAFC] p-3">
                      <p className="mb-2 text-xs font-semibold text-[#0D1B2E]">{t.postResolutionCheckIn}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {isCitizenVerified ? (
                          <Badge variant="success" className="py-1">
                            <CheckCircle size={12} /> {t.verifiedByCitizen}
                          </Badge>
                        ) : canSubmitRequestFeedback(req.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={event => {
                              event.stopPropagation();
                              openFeedbackModal(String(req.id));
                            }}
                          >
                            <Star size={12} /> {t.confirmRateAid}
                          </Button>
                        ) : (
                          <span className="text-xs text-[#71839A]">{t.feedbackStatusNotEligible}</span>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={event => {
                            event.stopPropagation();
                            openRecoveryFollowUp(req);
                          }}
                        >
                          <HeartHandshake size={12} /> {t.requestRecoveryFollowUp}
                        </Button>
                      </div>
                    </div>
                  )}

                  {req.status === 'assigned' && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        viewResponder(req.id);
                      }}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-[#1A3A6B] text-white text-xs font-medium rounded-xl hover:bg-[#112A50] transition-colors"
                    >
                      <ShieldCheck size={14} /> {t.viewResponderDetails}
                    </button>
                  )}
                </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="animate-fade-in delay-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0D1B2E] font-[Outfit]">{t.nearbyShelters}</h2>
            <button onClick={() => setShowShelterModal(true)} className="text-xs text-[#1A3A6B] hover:underline cursor-pointer">
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-3">
            {isLoadingData ? (
              <div className="text-center py-6 text-[#5A7290] text-sm">{t.locatingShelters}</div>
            ) : nearbyShelters.length === 0 ? (
              <div className="text-center py-6 text-[#5A7290] text-sm bg-white rounded-2xl border border-[#CBD8E6]">
                {t.noOpenShelters}
              </div>
            ) : (
              nearbyShelters.map((s, idx) => (
                <Card key={s.id || idx} padding="p-4" hover>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0D1B2E]">{s.name}</p>
                      <p className="text-xs text-[#5A7290] flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {s.distance || t.nearby}
                      </p>
                    </div>
                    <Badge variant={s.available > 30 ? 'success' : s.available > 10 ? 'warning' : 'danger'}>
                      {t.spaces(s.available)}
                    </Badge>
                  </div>
                  <Progress value={Math.max(0, s.capacity - s.available)} max={Math.max(s.capacity, 1)} size="sm" />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {s.facilities.slice(0, 3).map((f: string) => (
                        <Badge key={f} variant="neutral" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setShowShelterModal(true)}>
                      {t.details} <ChevronRight size={12} />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <Card padding="p-4" className="animate-fade-in delay-400">
          <h2 className="text-sm font-semibold text-[#0D1B2E] mb-3 font-[Outfit]">{t.emergencyContacts}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: t.contactEmergency, number: '119' },
              { label: t.contactPolice, number: '118' },
              { label: t.contactDmc, number: '117' },
              { label: t.contactSevana, number: '1990' },
            ].map(c => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className="flex items-center gap-2 p-2.5 bg-[#F0F4F8] rounded-xl hover:bg-[#E8EDF3] transition-colors"
              >
                <div className="w-7 h-7 bg-[#1A3A6B] rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#5A7290] truncate">{c.label}</p>
                  <p className="text-sm font-bold text-[#0D1B2E]">{c.number}</p>
                </div>
              </a>
            ))}
          </div>
        </Card>
      </div>

      <MobileNav active="Home" t={t} />

      {/* Find Shelter Modal */}
      <Modal
        open={showShelterModal}
        onClose={() => {
          setShowShelterModal(false);
          setShelterToRequest(null);
        }}
        title={t.nearbyReliefShelters}
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowShelterModal(false)}>
            {t.close}
          </Button>
        }
      >
        <div className={`space-y-4 max-h-[65vh] overflow-y-auto pr-1 ${fontClass}`}>
          {isLoadingData ? (
            <div className="text-center py-8 text-[#5A7290] text-sm">{t.locatingOpenShelters}</div>
          ) : nearbyShelters.length === 0 ? (
            <Alert type="info" message={t.noOpenSheltersModal} />
          ) : (
            nearbyShelters.map((s, idx) => (
              <div key={s.id || idx} className="p-4 bg-[#F8FAFC] border border-[#CBD8E6] rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0D1B2E] font-[Outfit]">{s.name}</h3>
                    <p className="text-xs text-[#5A7290] flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {s.location || s.district || t.locationOnMap} ·{' '}
                      <strong>{s.distance || t.nearby}</strong>
                    </p>
                  </div>
                  <Badge variant={s.available > 30 ? 'success' : s.available > 10 ? 'warning' : 'danger'}>
                    {s.hasCapacity ? t.spacesOfCapacity(s.available, s.capacity) : t.spacesAvailable(s.available)}
                  </Badge>
                </div>

                <Progress value={Math.max(0, s.capacity - s.available)} max={Math.max(s.capacity, 1)} size="sm" />

                {s.facilities.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {s.facilities.map((f: string) => (
                      <Badge key={f} variant="neutral" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Inline Request Space Form */}
                {shelterToRequest?.id === s.id ? (
                  <div className="p-3 bg-white border border-[#BFDBFE] rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-[#1A3A6B]">{t.requestSpaceAt(s.name)}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label={t.numberOfPeople}
                        type="number"
                        min="1"
                        max={Math.max(s.available, 1)}
                        value={shelterReqForm.peopleCount}
                        onChange={(e: any) => setShelterReqForm(f => ({ ...f, peopleCount: e.target.value }))}
                      />
                      <Input
                        label={t.notesOptional}
                        placeholder={t.notesPlaceholder}
                        value={shelterReqForm.notes}
                        onChange={(e: any) => setShelterReqForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShelterToRequest(null)}
                        disabled={isRequestingShelter}
                      >
                        {t.cancel}
                      </Button>
                      <Button size="sm" onClick={handleRequestShelterSpace} disabled={isRequestingShelter}>
                        {isRequestingShelter ? t.sending : t.confirmRequest}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={s.available <= 0}
                      onClick={() => {
                        setShelterToRequest(s);
                        setShelterReqForm({ peopleCount: '1', notes: '' });
                      }}
                    >
                      <Home size={13} /> {t.requestSpace}
                    </Button>
                    <a
                      href={getDirectionsUrl(s)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#CBD8E6] text-[#1A3A6B] text-xs font-medium rounded-xl hover:bg-[#F0F4F8] transition-colors"
                    >
                      <Navigation size={13} /> {t.directions} <ExternalLink size={11} />
                    </a>
                    {s.contact && (
                      <a
                        href={`tel:${s.contact}`}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#CBD8E6] text-[#0D1B2E] text-xs font-medium rounded-xl hover:bg-[#F0F4F8] transition-colors"
                      >
                        <Phone size={13} /> {t.call}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Request Assistance Modal */}
      <Modal
        open={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setRequestStep('form');
          setAiResult(null);
          setAiUnavailable(false);
          setShowLocationDropdown(false);
        }}
        title={t.requestAssistance}
        size="lg"
        footer={
          requestStep === 'form' ? (
            <>
              <Button variant="outline" onClick={() => setShowRequestModal(false)}>
                {t.cancel}
              </Button>
              <Button onClick={submitRequest}>{t.submitRequest}</Button>
            </>
          ) : requestStep === 'confirm' ? (
            <>
              <Button variant="outline" onClick={() => setRequestStep('form')} disabled={isSubmitting}>
                {t.edit}
              </Button>
              <Button variant="success" onClick={confirmRequest} disabled={isSubmitting}>
                {isSubmitting ? t.submitting : t.confirmAndSubmit}
              </Button>
            </>
          ) : null
        }
      >
        <div className={fontClass}>
          {requestStep === 'form' && (
            <div className="space-y-4">
              <Alert type="info" message={t.accurateInfoAlert} />
              <Select
                label={t.assistanceCategory}
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                options={[
                  { value: '', label: t.selectCategory },
                  { value: 'food', label: t.categories.food },
                  { value: 'medicine', label: t.categories.medicine },
                  { value: 'shelter', label: t.categories.shelter },
                  { value: 'transport', label: t.categories.transport },
                  { value: 'accessibility', label: t.categories.accessibility },
                  { value: 'other', label: t.categories.other },
                ]}
              />
              <Select
                label={t.urgencyLevel}
                value={form.urgency}
                onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                options={[
                  { value: '', label: t.selectUrgency },
                  { value: 'critical', label: t.urgencies.critical },
                  { value: 'high', label: t.urgencies.high },
                  { value: 'medium', label: t.urgencies.medium },
                  { value: 'low', label: t.urgencies.low },
                ]}
              />
              <Textarea
                label={t.description}
                placeholder={t.descriptionPlaceholder}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
              />

              {/* Accurate Location Capture (GPS + OpenStreetMap Autocomplete) */}
              <div className="flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-[#0D1B2E]">{t.yourCurrentLocation}</label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocatingGps}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A3A6B] hover:text-[#112A50] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isLocatingGps ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                    {isLocatingGps ? t.locating : t.useMyGps}
                  </button>
                </div>

                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-2.5 text-[#5A7290]" />
                  <input
                    type="text"
                    placeholder={t.searchLocationPlaceholder}
                    className="w-full pl-9 pr-9 py-2 border border-[#CBD8E6] rounded-xl text-sm text-[#0D1B2E] focus:outline-none focus:border-[#1A3A6B] bg-white"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setForm(f => ({ ...f, location: e.target.value, latitude: null, longitude: null }));
                    }}
                    onFocus={() => {
                      if (locationResults.length > 0) setShowLocationDropdown(true);
                    }}
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
                    {t.locationPinned(form.latitude.toFixed(4), form.longitude.toFixed(4))}
                  </p>
                ) : (
                  <p className="text-xs text-[#5A7290] mt-0.5">
                    {t.locationHelperPrefix}
                    <strong>{t.useMyGps}</strong>
                    {t.locationHelperSuffix}
                  </p>
                )}
              </div>

              <Input
                label={t.affectedPeople}
                type="number"
                min="1"
                value={form.affected}
                onChange={e => setForm(f => ({ ...f, affected: e.target.value }))}
              />
              <div>
                <label className="text-sm font-medium text-[#0D1B2E] block mb-1.5">{t.supportingEvidence}</label>
                <div className="border-2 border-dashed border-[#CBD8E6] rounded-xl p-6 text-center cursor-pointer hover:border-[#1A3A6B]/40 transition-colors">
                  <Upload size={24} className="text-[#5A7290] mx-auto mb-2" />
                  <p className="text-sm text-[#5A7290]">{t.uploadPrompt}</p>
                  <p className="text-xs text-[#5A7290] mt-1">{t.uploadHint}</p>
                </div>
              </div>
            </div>
          )}

          {requestStep === 'ai' && (
            <div className="text-center py-10 animate-fade-in">
              <div className="w-16 h-16 bg-[#F5F3FF] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Brain size={28} className="text-[#6D28D9]" />
              </div>
              <h3 className="font-semibold text-[#0D1B2E] mb-2">{t.aiAnalyzingTitle}</h3>
              <p className="text-sm text-[#5A7290]">{t.aiAnalyzingSub}</p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-[#6D28D9] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {requestStep === 'confirm' && (() => {
            if (aiUnavailable || !aiResult) {
              return (
                <div className="space-y-4 animate-fade-in">
                  <Alert
                    type="warning"
                    title={t.aiUnavailableTitle}
                    message={t.aiUnavailableMsg}
                  />
                  <Alert type="info" title={t.requestReadyTitle} message={t.requestReadyMsg} />
                </div>
              );
            }

            const rawScore = aiResult.urgencyScore ?? aiResult.UrgencyScore;
            const hasScore = rawScore !== null && rawScore !== undefined && Number(rawScore) > 0;
            const scoreLabel = hasScore
              ? Number(rawScore) > 10
                ? `${Number(rawScore)}/100`
                : `${Number(rawScore)}/10`
              : '';
            const rawConfidence = aiResult.confidenceScore ?? aiResult.ConfidenceScore;
            const confidenceVal =
              rawConfidence !== null && rawConfidence !== undefined ? Number(rawConfidence) : 0;
            const summaryText = aiResult.summary || aiResult.Summary || '';
            const urgencyText = (aiResult.calculatedUrgency || aiResult.CalculatedUrgency || '').toUpperCase();
            const recommendedAction = aiResult.recommendedAction || aiResult.RecommendedAction || '';
            const nearestResource = aiResult.nearestResource || aiResult.NearestResource || '';

            return (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-[#F5F3FF] rounded-xl border border-[#DDD6FE]">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain size={16} className="text-[#6D28D9]" />
                    <p className="text-sm font-semibold text-[#6D28D9]">{t.aiAnalysisResult}</p>
                    {confidenceVal > 0 && (
                      <span className="ml-auto text-xs bg-[#6D28D9]/10 text-[#6D28D9] px-2 py-0.5 rounded-full">
                        {t.confidence(Math.round(confidenceVal))}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {summaryText && (
                      <div className="col-span-2">
                        <p className="text-xs text-[#5A7290]">{t.aiSummaryLabel}</p>
                        <p className="font-medium text-[#0D1B2E] mt-0.5">{summaryText}</p>
                      </div>
                    )}
                    {(urgencyText || scoreLabel) && (
                      <div>
                        <p className="text-xs text-[#5A7290]">{t.urgencyScore}</p>
                        <p
                          className={`font-semibold mt-0.5 ${
                            urgencyText === 'CRITICAL' ? 'text-[#DC2626]' : 'text-[#EA580C]'
                          }`}
                        >
                          {[urgencyText, scoreLabel].filter(Boolean).join(' — ')}
                        </p>
                      </div>
                    )}
                    {recommendedAction && (
                      <div>
                        <p className="text-xs text-[#5A7290]">{t.recommendedAction}</p>
                        <p className="font-medium text-[#0D1B2E] mt-0.5">{recommendedAction}</p>
                      </div>
                    )}
                    {nearestResource && (
                      <div className="col-span-2">
                        <p className="text-xs text-[#5A7290]">{t.nearestResource}</p>
                        <p className="font-medium text-[#0D1B2E] mt-0.5">{nearestResource}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#5A7290] mt-3 italic">{t.aiDisclaimer}</p>
                </div>
                <Alert type="info" title={t.requestReadyTitle} message={t.requestReadyMsg} />
              </div>
            );
          })()}

          {requestStep === 'success' && (
            <div className="text-center py-8 animate-scale-in">
              <div className="w-20 h-20 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-[#16A34A]" />
              </div>
              <h3 className="text-lg font-bold text-[#0D1B2E] mb-1">{t.requestSubmittedTitle}</h3>
              <p className="text-sm text-[#5A7290] mb-2">{t.trackingNumberLabel}</p>
              <p className="font-mono text-xl font-bold text-[#1A3A6B]">{trackingId}</p>
              <p className="text-xs text-[#5A7290] mt-4">{t.locationSharedMsg}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Track Request Modal */}
      <Modal
        open={!!trackedRequest}
        onClose={() => setTrackedRequest(null)}
        title={t.trackRequest}
        size="md"
      >
        {trackedRequest && (() => {
          const currentStage = getRequestStageIndex(trackedRequest.status);
          return (
            <div className={`space-y-4 ${fontClass}`}>
              <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] text-sm flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-[#1A3A6B] font-semibold">{trackedRequest.id}</p>
                  <p className="text-xs text-[#3B82F6] mt-0.5">{t.trackingUpdateHint}</p>
                </div>
                <StatusBadge status={trackedRequest.status} />
              </div>

              <div className="relative pl-4">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#CBD8E6]" />
                {t.timeline.map((event, i) => {
                  const isDone = i <= currentStage;
                  const isCurrent = i === currentStage;
                  const stateLabel = isCurrent
                    ? t.statusCurrent
                    : isDone
                    ? t.statusCompleted
                    : t.statusPending;

                  return (
                    <div key={i} className="relative flex gap-3 mb-4 last:mb-0">
                      <div
                        className={`absolute -left-2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isDone ? 'bg-[#16A34A] border-[#16A34A]' : 'bg-white border-[#CBD8E6]'
                        }`}
                      >
                        {isDone && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <div className="pl-4">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${isDone ? 'text-[#0D1B2E]' : 'text-[#5A7290]'}`}>
                            {event.status}
                          </p>
                          <span
                            className={`text-xs ${
                              isCurrent
                                ? 'text-[#1D4ED8] font-medium'
                                : isDone
                                ? 'text-[#16A34A]'
                                : 'text-[#5A7290]'
                            }`}
                          >
                            {stateLabel}
                          </span>
                        </div>
                        <p className="text-xs text-[#5A7290] mt-0.5">{event.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Feedback Modal */}
      <Modal
        open={feedbackModal}
        onClose={closeFeedbackModal}
        title={t.rateExperience}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeFeedbackModal}>
              {t.skip}
            </Button>
            <Button
              onClick={() => void submitFeedback()}
              disabled={
                !feedbackRequestId ||
                !myRequests.some(request =>
                  String(request.id) === feedbackRequestId && canSubmitRequestFeedback(request.status)
                ) ||
                rating < 1 ||
                rating > 5 ||
                isSubmittingFeedback
              }
              loading={isSubmittingFeedback}
            >
              {t.submitFeedback}
            </Button>
          </>
        }
      >
        <div className={`space-y-4 ${fontClass}`}>
          {feedbackRequestId && (
            <p className="text-xs text-[#5A7290]">{feedbackRequestId}</p>
          )}
          <p className="text-sm text-[#5A7290]">{t.ratePrompt}</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                disabled={isSubmittingFeedback}
                onClick={() => setRating(s)}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                <Star size={32} className={s <= rating ? 'text-[#CA8A04] fill-[#CA8A04]' : 'text-[#CBD8E6]'} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder={t.additionalComments}
            rows={3}
            value={feedbackComments}
            onChange={event => setFeedbackComments(event.target.value)}
          />
        </div>
      </Modal>

      {/* Responder Details Modal */}
      <Modal
        open={!!activeRequest}
        onClose={() => {
          setActiveRequest(null);
          setAssignedResponder(null);
        }}
        title={t.assignedResponder}
        size="sm"
      >
        <div className={`flex flex-col justify-center py-4 ${fontClass}`}>
          {detailsLoading ? (
            <p className="text-center text-slate-500">{t.retrievingResponder}</p>
          ) : assignedResponder ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {assignedResponder.volunteerName ||
                      assignedResponder.fullName ||
                      assignedResponder.name ||
                      t.responderFallback}
                  </p>
                  <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-2">
                    <Phone size={14} />{' '}
                    {assignedResponder.phoneNumber || assignedResponder.contactNumber || t.noPhoneProvided}
                  </p>
                </div>
              </div>
              <Alert type="info" message={t.responderEnRoute} />
              <a
                href={`tel:${assignedResponder.phoneNumber || assignedResponder.contactNumber || ''}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                <Phone size={18} /> {t.callResponder}
              </a>
            </div>
          ) : (
            <p className="text-center text-slate-500">{t.couldNotLoadResponder}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Brain({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </svg>
  );
}