import React, { useState } from 'react';
import { HeartHandshake, ShieldCheck, CheckCircle } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { Card, Button, Input, Select } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';

export function VolunteerApply() {
  const { addToast } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [form, setForm] = useState({
    district: '',
    availability: 'Weekends',
    skills: '',
    assets: '',
    experience: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.district || !form.skills) {
      addToast({ type: 'error', message: 'Please provide your district and at least one skill.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/api/v1/volunteers/apply', {
        method: 'POST',
        body: JSON.stringify({
          district: form.district,
          availability: form.availability,
          skills: form.skills.split(',').map(s => s.trim()).filter(s => s),
          assets: form.assets.split(',').map(a => a.trim()).filter(a => a),
          experience: form.experience
        })
      });
      
      setIsSubmitted(true);
      addToast({ type: 'success', message: 'Application submitted successfully.' });
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to submit application.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader
          title="Register as a Volunteer"
          subtitle="Join the Sevana field response team to assist your community during crises."
        />

        {isSubmitted ? (
          <Card className="text-center py-16 animate-fade-in">
            <CheckCircle className="mx-auto text-[#16A34A] mb-4" size={48} />
            <h2 className="text-2xl font-bold text-[#0D1B2E] font-[Outfit] mb-2">Application Received</h2>
            <p className="text-[#5A7290] max-w-md mx-auto mb-6">
              Thank you for stepping up to help. Your application is now pending verification by an administrator. You will receive a notification once your account is upgraded to Volunteer status.
            </p>
            <Button onClick={() => window.location.href = '/portal'}>
              Return to Citizen Portal
            </Button>
          </Card>
        ) : (
          <Card className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6 p-4 bg-[#F0F4F8] rounded-lg border border-[#CBD8E6]">
              <HeartHandshake className="text-[#1D4ED8] shrink-0" size={24} />
              <p className="text-sm text-[#0D1B2E]">
                <strong>Why register?</strong> Volunteers get access to live crisis dispatch maps, coordinated rescue missions, and resource distribution tasks.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <Select 
                  label="Primary Operating District" 
                  value={form.district} 
                  onChange={(e: any) => setForm(f => ({ ...f, district: e.target.value }))}
                  options={[
                    { value: '', label: 'Select your district...' },
                    { value: 'Colombo', label: 'Colombo' },
                    { value: 'Gampaha', label: 'Gampaha' },
                    { value: 'Kalutara', label: 'Kalutara' },
                    { value: 'Kandy', label: 'Kandy' },
                    { value: 'Galle', label: 'Galle' }
                  ]} 
                />
                
                <Select 
                  label="General Availability" 
                  value={form.availability} 
                  onChange={(e: any) => setForm(f => ({ ...f, availability: e.target.value }))}
                  options={[
                    { value: 'Weekends', label: 'Weekends Only' },
                    { value: 'Weekdays', label: 'Weekdays' },
                    { value: 'Evenings', label: 'Evenings / Nights' },
                    { value: 'Full-time', label: 'Full-time (Emergency Standby)' }
                  ]} 
                />
              </div>

              <Input 
                label="Relevant Skills (comma separated)" 
                placeholder="e.g., First Aid, Heavy Vehicle License, Swimming, Medical" 
                value={form.skills} 
                onChange={(e: any) => setForm(f => ({ ...f, skills: e.target.value }))} 
              />

              <Input 
                label="Available Assets / Vehicles (comma separated)" 
                placeholder="e.g., 4x4 Truck, Boat, Generator, Chainsaw (Leave blank if none)" 
                value={form.assets} 
                onChange={(e: any) => setForm(f => ({ ...f, assets: e.target.value }))} 
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#5A7290]">Previous Experience (Optional)</label>
                <textarea 
                  className="w-full px-3 py-2 border border-[#CBD8E6] rounded-lg text-sm focus:outline-none focus:border-[#1D4ED8]"
                  rows={3}
                  placeholder="Briefly describe any past disaster relief or relevant experience..."
                  value={form.experience}
                  onChange={(e: any) => setForm(f => ({ ...f, experience: e.target.value }))}
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-[#E8EDF3]">
                <p className="text-xs text-[#5A7290] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#16A34A]" />
                  Your details will be verified by a coordinator.
                </p>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </Layout>
  );
}