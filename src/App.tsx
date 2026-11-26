import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context';
import { Toast } from './components/ui';
import { useAppContext } from './context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { VolunteerPortal } from './pages/VolunteerPortal';
import { Administration } from './pages/Administration';
import { VolunteerApply } from './pages/VolunteerApply';
import { Landing } from './pages/Landing';
import { Login, Register, ForgotPassword, TwoFactor } from './pages/Auth';
import { CitizenPortal } from './pages/CitizenPortal';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { AIDecisionSupport } from './pages/AIDecisionSupport';
import { ResourceManagement } from './pages/ResourceManagement';
import { ShelterManagement } from './pages/ShelterManagement';
import { VolunteerManagement } from './pages/VolunteerManagement';
import { DonorManagement } from './pages/DonorManagement';
import { MapView } from './pages/MapView';
import PublicShelters from './pages/PublicShelters';
import { CrisisManagement } from './pages/CrisisManagement';
import { CampaignManagement } from './pages/CampaignManagement'; // Added Import
import { NotificationCenter } from './pages/Notifications';
import { Layout } from './components/Layout';
import { Profile, AuditLogs } from './pages/OtherPages';
import Reports from './pages/Reports';
function ToastContainer() {
  const { toasts, removeToast } = useAppContext(); 
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}

// Added 'Volunteer' and 'volunteer' to the ALL_USERS array
const ALL_STAFF = ['coordinator', 'Coordinator', 'admin', 'Admin', 'LogisticsManager', 'ShelterAdmin', 'volunteer_coord', 'donor'] as const;
const ALL_USERS = ['citizen', 'Citizen', 'Volunteer', 'volunteer', ...ALL_STAFF] as const;

function AppRoutes() {
  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/find-shelters" element={<PublicShelters />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/2fa" element={<TwoFactor />} />

        {/* Citizen Portal & Volunteer Workflows */}
        <Route 
          path="/citizen" 
          element={<ProtectedRoute allowedRoles={[...ALL_USERS]}><CitizenPortal /></ProtectedRoute>} 
        />
        <Route 
          path="/citizen/*" 
          element={<ProtectedRoute allowedRoles={[...ALL_USERS]}><CitizenPortal /></ProtectedRoute>} 
        />
        <Route 
          path="/portal/volunteer-apply" 
          element={<ProtectedRoute allowedRoles={['Citizen', 'citizen', 'Admin', 'admin']}><VolunteerApply /></ProtectedRoute>} 
        />
        <Route 
          path="/volunteer-dashboard" 
          element={<ProtectedRoute allowedRoles={['Volunteer', 'volunteer', 'Admin', 'admin']}><VolunteerPortal /></ProtectedRoute>} 
        />

        {/* Global Authenticated Routes */}
        <Route 
          path="/profile" 
          element={<ProtectedRoute allowedRoles={[...ALL_USERS]}><Profile /></ProtectedRoute>} 
        />
        <Route 
          path="/settings" 
          element={<ProtectedRoute allowedRoles={[...ALL_USERS]}><Profile /></ProtectedRoute>} 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute allowedRoles={[...ALL_USERS]}>
              <Layout>
                <NotificationCenter />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Operational Staff Routes */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute allowedRoles={[...ALL_STAFF]}><CoordinatorDashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/crisis" 
          element={<ProtectedRoute allowedRoles={['Coordinator', 'Admin', 'admin']}><CrisisManagement /></ProtectedRoute>} 
        />
        
        {/* ADDED CAMPAIGNS ROUTE */}
        <Route 
          path="/campaigns" 
          element={<ProtectedRoute allowedRoles={['Coordinator', 'Admin', 'admin']}><CampaignManagement /></ProtectedRoute>} 
        />

        <Route 
          path="/map" 
          element={<ProtectedRoute allowedRoles={['Coordinator', 'Admin', 'admin']}><MapView /></ProtectedRoute>} 
        />
        <Route 
          path="/reports" 
          element={<ProtectedRoute allowedRoles={[...ALL_STAFF]}><Reports /></ProtectedRoute>} 
        />

        {/* Domain-Specific Operational Routes */}
        <Route 
          path="/ai" 
          element={<ProtectedRoute allowedRoles={['coordinator', 'Coordinator', 'admin', 'Admin']}><AIDecisionSupport /></ProtectedRoute>} 
        />
        <Route 
          path="/audit" 
          element={<ProtectedRoute allowedRoles={['coordinator', 'Coordinator', 'admin', 'Admin']}><AuditLogs /></ProtectedRoute>} 
        />
        <Route 
          path="/resources" 
          element={<ProtectedRoute allowedRoles={['coordinator', 'Coordinator', 'admin', 'Admin', 'LogisticsManager']}><ResourceManagement /></ProtectedRoute>} 
        />
        <Route 
          path="/shelters" 
          element={<ProtectedRoute allowedRoles={['coordinator', 'Coordinator', 'admin', 'Admin', 'ShelterAdmin']}><ShelterManagement /></ProtectedRoute>} 
        />
        <Route 
          path="/volunteers" 
          element={<ProtectedRoute allowedRoles={['coordinator', 'Coordinator', 'admin', 'Admin', 'volunteer_coord']}><VolunteerManagement /></ProtectedRoute>} 
        />
        <Route
  path="/donors"
  element={<ProtectedRoute allowedRoles={['coordinator', 'Coordinator', 'admin', 'Admin', 'donor']}><DonorManagement /></ProtectedRoute>}
/>

        {/* Strict Admin Routes */}
        <Route 
          path="/admin" 
          element={<ProtectedRoute allowedRoles={['admin', 'Admin']}><Administration /></ProtectedRoute>} 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}