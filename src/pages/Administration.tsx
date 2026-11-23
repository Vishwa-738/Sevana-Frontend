import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, UserCog, Edit, ShieldAlert } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Modal, Select, SearchInput, Tabs } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';

interface SystemUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export function Administration() {
  const { addToast } = useAppContext();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const [roleModal, setRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [newRole, setNewRole] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/v1/users', { method: 'GET' });
      const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
      
      setUsers(data.map((u: any) => ({
        id: u.id || u.Id,
        fullName: u.fullName || u.FullName || u.name || u.Name || 'Unknown User',
        email: u.email || u.Email,
        role: u.role || u.Role || 'Citizen'
      })));
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load system users.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) {
      addToast({ type: 'error', message: 'Please select a valid role.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/users/${selectedUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      addToast({ type: 'success', message: `${selectedUser.fullName}'s role updated to ${newRole}.` });
      setRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      loadUsers(); // Refresh the list
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to update user role.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (activeTab === 'all' || (activeTab === 'staff' && u.role.toLowerCase() !== 'citizen') || u.role.toLowerCase() === activeTab.toLowerCase()) &&
    (u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const totalUsers = users.length;
  const staffCount = users.filter(u => u.role.toLowerCase() !== 'citizen').length;
  const adminCount = users.filter(u => u.role.toLowerCase() === 'admin').length;

  const roleColors: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
    Admin: 'danger',
    Coordinator: 'primary',
    Citizen: 'neutral',
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="System Administration"
          subtitle="Manage user accounts, roles, and system access levels"
        />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <KpiCard label="Total Registered Users" value={totalUsers.toString()} icon={<Users size={20} />} color="#1A3A6B" />
          <KpiCard label="Operational Staff" value={staffCount.toString()} icon={<UserCog size={20} />} color="#16A34A" />
          <KpiCard label="System Admins" value={adminCount.toString()} icon={<ShieldAlert size={20} />} color="#DC2626" />
        </div>

        <Card padding="p-0">
          <div className="p-4 border-b border-[#CBD8E6] flex justify-between items-center gap-4 bg-[#F8FAFC]">
            <SearchInput placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-72 bg-white" />
            <Tabs
              tabs={[
                { id: 'all', label: 'All Users' },
                { id: 'staff', label: 'Staff Only' },
                { id: 'citizen', label: 'Citizens' },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-[#5A7290]">Loading user database...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-[#5A7290]">No users found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#CBD8E6] bg-white">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">User Details</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Email Address</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Current Role</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-sm text-[#0D1B2E] flex items-center gap-2">
                          {u.role.toLowerCase() === 'admin' && <Shield size={14} className="text-[#DC2626]" />}
                          {u.fullName}
                        </p>
                        <p className="text-xs text-[#5A7290] font-mono mt-0.5">ID: {u.id.substring(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#5A7290]">
                        {u.email}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={roleColors[u.role] || 'primary'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => { 
                            setSelectedUser(u); 
                            setNewRole(u.role); 
                            setRoleModal(true); 
                          }} 
                          icon={<Edit size={14} />}
                        >
                          Change Role
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={roleModal}
        onClose={() => setRoleModal(false)}
        title="Update User Role"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleModal(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdateRole} disabled={isSubmitting || newRole === selectedUser?.role}>
              {isSubmitting ? 'Updating...' : 'Save Role'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#F8FAFC] border border-[#E8EDF3] rounded-lg mb-4">
            <p className="text-xs text-[#5A7290]">Modifying access for:</p>
            <p className="text-sm font-semibold text-[#0D1B2E] mt-1">{selectedUser?.fullName}</p>
            <p className="text-xs text-[#5A7290]">{selectedUser?.email}</p>
          </div>
          
         <Select 
            label="Assign System Role" 
            value={newRole} 
            onChange={e => setNewRole(e.target.value)}
            options={[
              { value: 'Citizen', label: 'Citizen (Standard Access)' },
              { value: 'Coordinator', label: 'Coordinator (Manage Requests & Dispatches)' },
              { value: 'ShelterAdmin', label: 'Shelter Manager (Manage Facilities)' }, 
              { value: 'LogisticsManager', label: 'Resource Manager (Manage Inventory)' },
              { value: 'Admin', label: 'System Admin (Full Access)' }
            ]}
          />
          
          {newRole === 'Admin' && newRole !== selectedUser?.role && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg flex gap-2">
              <ShieldAlert size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
              <p className="text-xs text-[#991B1B]">Warning: Granting Admin status gives this user unrestricted access to all system modules and user management.</p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}