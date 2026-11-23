import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Button, Card, Badge, Modal, Input, Textarea, Alert, Progress } from '../components/ui';
import { apiClient, createCampaign, updateCampaign, deleteCampaign } from '../api';

interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
  endDate: string;
}

export function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    endDate: ''
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient('/api/v1/campaigns');
      const rawList = Array.isArray(res) ? res : (res?.data || res?.items || []);

      const normalized: Campaign[] = rawList.map((c: any) => ({
        id: c.id || c.Id || '',
        title: c.title || c.Title || c.name || c.Name || 'Untitled Campaign',
        description: c.description || c.Description || '',
        targetAmount: Number(c.targetAmount ?? c.TargetAmount ?? c.goalAmount ?? c.GoalAmount ?? 0) || 0,
        currentAmount: Number(c.currentAmount ?? c.CurrentAmount ?? c.raisedAmount ?? c.RaisedAmount ?? 0) || 0,
        status: c.status || c.Status || 'Active',
        endDate: c.endDate || c.EndDate || ''
      }));

      setCampaigns(normalized);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleOpenModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingId(campaign.id);
      setFormData({
        title: campaign.title || '',
        description: campaign.description || '',
        targetAmount: String(campaign.targetAmount ?? 0),
        endDate: campaign.endDate ? String(campaign.endDate).split('T')[0] : ''
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', description: '', targetAmount: '', endDate: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const payload = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount) || 0
    };

    try {
      if (editingId) {
        await updateCampaign(editingId, payload);
      } else {
        await createCampaign(payload);
      }
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await deleteCampaign(id);
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to delete campaign.');
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Campaign Management"
          subtitle="Create and manage relief funds and resource drives"
          actions={
            <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
              New Campaign
            </Button>
          }
        />

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <Card padding="p-0" className="mt-6 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No campaigns found. Click "New Campaign" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Campaign Details</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((camp, idx) => {
                    const current = Number(camp.currentAmount) || 0;
                    const target = Number(camp.targetAmount) || 0;
                    const parsedEnd = camp.endDate ? new Date(camp.endDate) : null;
                    const formattedEndDate =
                      parsedEnd && !isNaN(parsedEnd.getTime())
                        ? parsedEnd.toLocaleDateString()
                        : 'No end date';

                    return (
                      <tr key={camp.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{camp.title}</p>
                          <p className="text-xs text-slate-500 truncate max-w-xs">{camp.description}</p>
                        </td>
                        <td className="px-4 py-4 w-64">
                          <Progress
                            value={current}
                            max={Math.max(target, 1)}
                            label={`LKR ${current.toLocaleString()} / ${target.toLocaleString()}`}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={String(camp.status).toLowerCase() === 'active' ? 'success' : 'neutral'}>
                            {camp.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formattedEndDate}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(camp)}>
                              <Edit2 size={16} className="text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(camp.id)}>
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Edit Campaign' : 'Create New Campaign'}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} loading={isSubmitting}>
                {editingId ? 'Save Changes' : 'Create Campaign'}
              </Button>
            </>
          }
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Campaign Title"
              placeholder="e.g., Kelaniya Flood Relief Fund"
              value={formData.title}
              onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              placeholder="Describe the purpose of this campaign..."
              rows={3}
              value={formData.description}
              onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Target Amount (LKR)"
                type="number"
                iconLeft={<DollarSign size={16} />}
                placeholder="100000"
                value={formData.targetAmount}
                onChange={(e: any) => setFormData({ ...formData, targetAmount: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e: any) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}