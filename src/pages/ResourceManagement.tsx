import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Send, AlertCircle, Box, Archive, MapPin } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Modal, Input, Select, SearchInput } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';

interface Resource {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  status: string;
  lastUpdated: string;
}

export function ResourceManagement() {
  const { addToast } = useAppContext();
  const [resources, setResources] = useState<Resource[]>([]);
  const [shelters, setShelters] = useState<{ id: string; name: string; district: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dispatchModalData, setDispatchModalData] = useState<Resource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({ itemName: '', category: 'Food', quantity: '', unit: 'Parcels', location: '' });
  const [dispatchForm, setDispatchForm] = useState({ dispatchQuantity: '', destination: '' });

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, sheltersRes] = await Promise.all([
        apiClient('/api/v1/resources', { method: 'GET' }),
        apiClient('/api/v1/shelters', { method: 'GET' }).catch(() => [])
      ]);

      const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setResources(data.map((r: any) => ({
        id: r.id || r.Id,
        itemName: r.itemName || r.ItemName,
        category: r.category || r.Category,
        quantity: r.quantity || r.Quantity || 0,
        unit: r.unit || r.Unit,
        location: r.location || r.Location,
        status: r.status || r.Status || 'Available',
        lastUpdated: r.lastUpdated || r.LastUpdated || new Date().toISOString()
      })));

      const shelterList = Array.isArray(sheltersRes) ? sheltersRes : (sheltersRes?.data || sheltersRes?.items || []);
      setShelters(shelterList.map((s: any) => ({
        id: s.id || s.Id,
        name: s.name || s.Name,
        district: s.district || s.District || ''
      })));
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load resources.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleAddResource = async () => {
    if (!addForm.itemName || !addForm.quantity || !addForm.location) {
      addToast({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/api/v1/resources', {
        method: 'POST',
        body: JSON.stringify({
          itemName: addForm.itemName,
          category: addForm.category,
          quantity: parseInt(addForm.quantity, 10),
          unit: addForm.unit,
          location: addForm.location
        })
      });
      
      addToast({ type: 'success', message: 'Resource added to inventory.' });
      setIsAddModalOpen(false);
      setAddForm({ itemName: '', category: 'Food', quantity: '', unit: 'Parcels', location: '' });
      loadResources(); 
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to add resource.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchModalData || !dispatchForm.dispatchQuantity || !dispatchForm.destination) {
      addToast({ type: 'error', message: 'Quantity and destination are required.' });
      return;
    }

    const qty = parseInt(dispatchForm.dispatchQuantity, 10);
    if (qty > dispatchModalData.quantity) {
      addToast({ type: 'error', message: `Cannot dispatch more than the available stock (${dispatchModalData.quantity}).` });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient(`/api/v1/resources/${dispatchModalData.id}/dispatch`, {
        method: 'PUT',
        body: JSON.stringify({
          dispatchQuantity: qty,
          destination: dispatchForm.destination
        })
      });
      
      addToast({ type: 'success', message: `Successfully dispatched ${qty} ${dispatchModalData.unit} to ${dispatchForm.destination}.` });
      setDispatchModalData(null);
      setDispatchForm({ dispatchQuantity: '', destination: '' });
      loadResources();
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to dispatch resources.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredResources = resources.filter(r => 
    r.itemName.toLowerCase().includes(search.toLowerCase()) || 
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = resources.reduce((acc, curr) => acc + curr.quantity, 0);
  const lowStockItems = resources.filter(r => r.quantity > 0 && r.quantity < 50).length;
  const outOfStockItems = resources.filter(r => r.quantity === 0 || r.status.toLowerCase() === 'outofstock').length;

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
              onChange={(e: any) => setSearch(e.target.value)} 
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
                  {filteredResources.map(r => (
                    <tr key={r.id} className="border-b border-[#E8EDF3] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-sm text-[#0D1B2E]">{r.itemName}</p>
                        <p className="text-xs text-[#5A7290] mt-0.5">{r.category}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-sm text-[#0D1B2E] font-[Outfit]">{r.quantity.toLocaleString()} <span className="text-xs font-normal text-[#5A7290]">{r.unit}</span></p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm flex items-center gap-1.5 text-[#5A7290]"><MapPin size={14} /> {r.location}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={r.quantity === 0 ? 'danger' : r.quantity < 50 ? 'warning' : 'success'}>
                          {r.quantity === 0 ? 'Out of Stock' : r.quantity < 50 ? 'Low Stock' : 'Available'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          icon={<Send size={14} />}
                          disabled={r.quantity === 0}
                          onClick={() => setDispatchModalData(r)}
                        >
                          Dispatch
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

      {/* Add Stock Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Incoming Stock"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddResource} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add to Inventory'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Item Name" placeholder="e.g. Bottled Water (1L)" value={addForm.itemName} onChange={(e: any) => setAddForm((f: any) => ({ ...f, itemName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={addForm.category} onChange={(e: any) => setAddForm((f: any) => ({ ...f, category: e.target.value }))} options={[
              { value: 'Food', label: 'Food & Rations' },
              { value: 'Water', label: 'Drinking Water' },
              { value: 'Medical', label: 'Medical Supplies' },
              { value: 'Shelter', label: 'Tents & Blankets' },
              { value: 'Other', label: 'Other' }
            ]} />
            <Input label="Quantity" type="number" min="1" value={addForm.quantity} onChange={(e: any) => setAddForm((f: any) => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit Type" placeholder="e.g. Bottles, Parcels, Kits" value={addForm.unit} onChange={(e: any) => setAddForm((f: any) => ({ ...f, unit: e.target.value }))} />
            <Input label="Storage Location" placeholder="e.g. Main Warehouse" value={addForm.location} onChange={(e: any) => setAddForm((f: any) => ({ ...f, location: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Dispatch Modal */}
      <Modal
        open={!!dispatchModalData}
        onClose={() => setDispatchModalData(null)}
        title="Dispatch Resources"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDispatchModalData(null)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={isSubmitting}>
              {isSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
            </Button>
          </>
        }
      >
        {dispatchModalData && (
          <div className="space-y-4">
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl mb-4">
              <p className="text-xs text-[#166534]">Available to dispatch:</p>
              <p className="text-lg font-bold text-[#15803D] font-[Outfit]">{dispatchModalData.quantity} <span className="text-sm font-normal">{dispatchModalData.unit}</span></p>
              <p className="text-xs text-[#166534] mt-1 font-medium">{dispatchModalData.itemName}</p>
            </div>
            
            <Input 
              label="Quantity to Dispatch" 
              type="number" 
              min="1" 
              max={dispatchModalData.quantity}
              value={dispatchForm.dispatchQuantity} 
              onChange={(e: any) => setDispatchForm(f => ({ ...f, dispatchQuantity: e.target.value }))} 
            />

            {shelters.length > 0 && (
              <Select
                label="Quick Select Active Shelter (optional)"
                value={shelters.some(s => s.name === dispatchForm.destination) ? dispatchForm.destination : ''}
                onChange={(e: any) => {
                  if (e.target.value) setDispatchForm(f => ({ ...f, destination: e.target.value }));
                }}
                options={[
                  { value: '', label: '-- Select a relief shelter --' },
                  ...shelters.map(s => ({
                    value: s.name,
                    label: `${s.name}${s.district ? ` (${s.district})` : ''}`
                  }))
                ]}
              />
            )}

            <Input 
              label="Destination / Recipient" 
              placeholder="e.g. ja ela police or Kelani Shelter A" 
              value={dispatchForm.destination} 
              onChange={(e: any) => setDispatchForm(f => ({ ...f, destination: e.target.value }))} 
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
}