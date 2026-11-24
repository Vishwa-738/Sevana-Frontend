import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Plus, DollarSign, Package, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, KpiCard, Badge, Button, Modal, Input, Select, Progress } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient, updateCampaign } from '../api';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
  endDate: string;
}

interface DonationRecord {
  id: string;
  donorName: string;
  type: 'Monetary' | 'Food' | 'Water' | 'Medical' | 'Shelter';
  amountOrQty: number;
  unit: string;
  itemName?: string;
  campaignId: string;
  campaignTitle: string;
  status: 'Allocated' | 'In Stock';
  date: string;
}

const STORAGE_KEY = 'sevana_donations_log';

export function DonorManagement() {
  const { addToast } = useAppContext();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [resourceCount, setResourceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    donorName: '',
    type: 'Monetary' as DonationRecord['type'],
    campaignId: '',
    amount: '',
    itemName: '',
    quantity: '',
    unit: 'Parcels',
    location: 'Main Warehouse',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [campRes, resRes] = await Promise.all([
        apiClient('/api/v1/campaigns', { method: 'GET' }),
        apiClient('/api/v1/resources', { method: 'GET' }).catch(() => []),
      ]);

      const rawCamps = Array.isArray(campRes) ? campRes : (campRes?.data || campRes?.items || []);
      const normalizedCamps: Campaign[] = rawCamps.map((c: any) => ({
        id: c.id || c.Id || '',
        title: c.title || c.Title || c.name || 'Untitled Campaign',
        description: c.description || c.Description || '',
        targetAmount: Number(c.targetAmount ?? c.TargetAmount ?? c.goalAmount ?? 0) || 0,
        currentAmount: Number(c.currentAmount ?? c.CurrentAmount ?? c.raisedAmount ?? 0) || 0,
        status: c.status || c.Status || 'Active',
        endDate: c.endDate || c.EndDate || '',
      }));
      setCampaigns(normalizedCamps);

      const rawRes = Array.isArray(resRes) ? resRes : (resRes?.data || resRes?.items || []);
      setResourceCount(rawRes.reduce((sum: number, r: any) => sum + (Number(r.quantity ?? r.Quantity) || 0), 0));

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setDonations(JSON.parse(saved));
        } catch {
          setDonations([]);
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load donor and campaign data.' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.donorName.trim()) {
      addToast({ type: 'error', message: 'Donor name is required.' });
      return;
    }

    const selectedCampaign = campaigns.find(c => c.id === form.campaignId);
    setIsSubmitting(true);

    try {
      if (form.type === 'Monetary') {
        const amount = parseFloat(form.amount);
        if (isNaN(amount) || amount <= 0) {
          addToast({ type: 'error', message: 'Enter a valid LKR donation amount.' });
          setIsSubmitting(false);
          return;
        }

        // Sync monetary donation directly to the selected Campaign in the backend
        if (selectedCampaign) {
          await updateCampaign(selectedCampaign.id, {
            title: selectedCampaign.title,
            description: selectedCampaign.description,
            targetAmount: selectedCampaign.targetAmount,
            currentAmount: selectedCampaign.currentAmount + amount,
            endDate: selectedCampaign.endDate ? selectedCampaign.endDate.split('T')[0] : new Date().toISOString().split('T')[0],
            status: selectedCampaign.status || 'Active',
          });
        }

        const newRecord: DonationRecord = {
          id: `DON-${Date.now().toString().slice(-4)}`,
          donorName: form.donorName.trim(),
          type: 'Monetary',
          amountOrQty: amount,
          unit: 'LKR',
          campaignId: selectedCampaign?.id || '',
          campaignTitle: selectedCampaign?.title || 'General Relief Fund',
          status: 'Allocated',
          date: new Date().toLocaleDateString(),
        };

        const updated = [newRecord, ...donations];
        setDonations(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        addToast({ type: 'success', message: `LKR ${amount.toLocaleString()} recorded and linked to ${newRecord.campaignTitle}.` });
      } else {
        // In-Kind Donation -> Automatically adds physical stock to Resource Management
        const qty = parseInt(form.quantity, 10);
        if (!form.itemName.trim() || isNaN(qty) || qty <= 0) {
          addToast({ type: 'error', message: 'Item name and valid quantity are required for in-kind donations.' });
          setIsSubmitting(false);
          return;
        }

        await apiClient('/api/v1/resources', {
          method: 'POST',
          body: JSON.stringify({
            itemName: form.itemName.trim(),
            category: form.type,
            quantity: qty,
            unit: form.unit.trim() || 'Units',
            location: form.location.trim() || 'Main Warehouse',
          }),
        });

        const newRecord: DonationRecord = {
          id: `DON-${Date.now().toString().slice(-4)}`,
          donorName: form.donorName.trim(),
          type: form.type,
          amountOrQty: qty,
          unit: form.unit.trim() || 'Units',
          itemName: form.itemName.trim(),
          campaignId: selectedCampaign?.id || '',
          campaignTitle: selectedCampaign?.title || 'General Relief Drive',
          status: 'In Stock',
          date: new Date().toLocaleDateString(),
        };

        const updated = [newRecord, ...donations];
        setDonations(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        addToast({
          type: 'success',
          message: `${qty} ${newRecord.unit} of ${newRecord.itemName} logged and added to Resource Inventory.`,
        });
      }

      setIsModalOpen(false);
      setForm({
        donorName: '',
        type: 'Monetary',
        campaignId: '',
        amount: '',
        itemName: '',
        quantity: '',
        unit: 'Parcels',
        location: 'Main Warehouse',
      });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to record donation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRaised = campaigns.reduce((sum, c) => sum + c.currentAmount, 0);
  const activeCampaigns = campaigns.filter(c => String(c.status).toLowerCase() === 'active');
  const inKindCount = donations.filter(d => d.type !== 'Monetary').length;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Donor & Donation Management"
          subtitle="Record monetary & in-kind donations linked directly to Campaigns and Resource Inventory"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
                Manage Campaigns
              </Button>
              <Button size="sm" icon={<Plus size={15} />} onClick={() => setIsModalOpen(true)}>
                Record Donation
              </Button>
            </div>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Raised (LKR)"
            value={`LKR ${totalRaised.toLocaleString()}`}
            icon={<DollarSign size={20} />}
            color="#16A34A"
          />
          <KpiCard
            label="Active Campaigns"
            value={activeCampaigns.length.toString()}
            icon={<Target size={20} />}
            color="#1A3A6B"
          />
          <KpiCard
            label="Logged Donations"
            value={donations.length.toString()}
            icon={<Heart size={20} />}
            color="#DC2626"
          />
          <KpiCard
            label="Warehouse Stock Units"
            value={resourceCount.toLocaleString()}
            icon={<Package size={20} />}
            color="#EA580C"
          />
        </div>

        {/* Live Active Campaigns Progress */}
        <Card padding="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0D1B2E] font-[Outfit]">Live Campaigns</h3>
            <button
              onClick={() => navigate('/campaigns')}
              className="text-xs text-[#1A3A6B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Open Campaign Management <ArrowRight size={12} />
            </button>
          </div>
          {isLoading ? (
            <p className="text-sm text-[#5A7290]">Loading live campaigns...</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-[#5A7290]">No campaigns created yet. Create one in Campaign Management first.</p>
          ) : (
            <div className="space-y-4">
              {campaigns.map(c => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[#0D1B2E]">{c.title}</span>
                    <span className="text-xs text-[#5A7290]">
                      LKR {c.currentAmount.toLocaleString()} / {c.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={c.currentAmount} max={Math.max(c.targetAmount, 1)} size="sm" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Donations Table */}
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 border-b border-[#CBD8E6] flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#0D1B2E] font-[Outfit]">Recent Donations</h3>
              <p className="text-xs text-[#5A7290] mt-0.5">
                Monetary donations update Campaign totals · In-kind donations ({inKindCount}) auto-sync to Resource Inventory
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/resources')}>
              View Inventory
            </Button>
          </div>

          {donations.length === 0 ? (
            <div className="p-10 text-center text-[#5A7290] text-sm">
              No donations recorded yet. Click <strong>Record Donation</strong> to log a monetary or physical contribution.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#5A7290] text-xs uppercase font-semibold border-b border-[#CBD8E6]">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Donor</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount / Items</th>
                    <th className="px-4 py-3">Linked Campaign</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF3]">
                  {donations.map(d => (
                    <tr key={d.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3.5 font-mono text-xs text-[#5A7290]">{d.id}</td>
                      <td className="px-4 py-3.5 font-medium text-[#0D1B2E]">{d.donorName}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={d.type === 'Monetary' ? 'success' : 'info'}>{d.type}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#0D1B2E]">
                        {d.type === 'Monetary'
                          ? `LKR ${d.amountOrQty.toLocaleString()}`
                          : `${d.amountOrQty.toLocaleString()} ${d.unit} — ${d.itemName}`}
                      </td>
                      <td className="px-4 py-3.5 text-[#5A7290]">{d.campaignTitle}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={d.status === 'In Stock' ? 'primary' : 'success'}>
                          <CheckCircle size={11} className="mr-1" /> {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#5A7290]">{d.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Record Donation Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Incoming Donation"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleRecordDonation} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Donation'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleRecordDonation}>
          <Input
            label="Donor Name / Organisation"
            placeholder="e.g., Lanka Foundation or Anonymous"
            value={form.donorName}
            onChange={(e: any) => setForm(f => ({ ...f, donorName: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Donation Type"
              value={form.type}
              onChange={(e: any) => setForm(f => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'Monetary', label: 'Monetary (LKR)' },
                { value: 'Food', label: 'In-Kind: Food' },
                { value: 'Water', label: 'In-Kind: Water' },
                { value: 'Medical', label: 'In-Kind: Medical' },
                { value: 'Shelter', label: 'In-Kind: Shelter Supplies' },
              ]}
            />
            <Select
              label="Link to Campaign"
              value={form.campaignId}
              onChange={(e: any) => setForm(f => ({ ...f, campaignId: e.target.value }))}
              options={[
                { value: '', label: 'General Relief Fund' },
                ...campaigns.map(c => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>

          {form.type === 'Monetary' ? (
            <Input
              label="Amount (LKR)"
              type="number"
              min="1"
              placeholder="e.g., 50000"
              value={form.amount}
              onChange={(e: any) => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
          ) : (
            <>
              <Input
                label="Item Name (Auto-added to Resource Inventory)"
                placeholder="e.g., Dry Rations Pack, Bottled Water 1L"
                value={form.itemName}
                onChange={(e: any) => setForm(f => ({ ...f, itemName: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={form.quantity}
                  onChange={(e: any) => setForm(f => ({ ...f, quantity: e.target.value }))}
                  required
                />
                <Input
                  label="Unit"
                  placeholder="Parcels, Bottles, Kits"
                  value={form.unit}
                  onChange={(e: any) => setForm(f => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <Input
                label="Warehouse / Storage Location"
                placeholder="e.g., Main Colombo Warehouse"
                value={form.location}
                onChange={(e: any) => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </>
          )}
        </form>
      </Modal>
    </Layout>
  );
}

export default DonorManagement;