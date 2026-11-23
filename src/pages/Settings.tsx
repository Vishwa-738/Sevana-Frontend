import { useState } from 'react';
import { User, Lock, Bell, Globe, Accessibility, Shield, Camera } from 'lucide-react';
import { Button, Card, Input, Select, Alert, Tabs, useToast, ToastContainer } from '../components/ui';
import Layout from '../components/Layout';

export default function Settings() {
  const { toasts, show, remove } = useToast();
  const [tab, setTab] = useState('profile');
  const [lang, setLang] = useState('en');

  return (
    <Layout>
      <ToastContainer toasts={toasts} remove={remove} />
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile & Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your account, preferences, and security</p>
        </div>

        <Tabs
          tabs={[
            { id: 'profile', label: 'Profile', icon: <User size={14} /> },
            { id: 'security', label: 'Security', icon: <Lock size={14} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
            { id: 'language', label: 'Language', icon: <Globe size={14} /> },
            { id: 'accessibility', label: 'Accessibility', icon: <Accessibility size={14} /> },
          ]}
          active={tab}
          onChange={setTab}
          className="flex-wrap"
        />

        {tab === 'profile' && (
          <Card>
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2A5298] to-[#16A34A] flex items-center justify-center text-white text-2xl font-bold">KC</div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50">
                  <Camera size={13} className="text-slate-600" />
                </button>
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-xl">Kamal Cooray</h2>
                <p className="text-slate-500">Emergency Coordinator · NDMA</p>
                <p className="text-xs text-green-600 font-medium mt-1">● Online</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" value="Kamal" onChange={() => {}} required />
                <Input label="Last Name" value="Cooray" onChange={() => {}} required />
              </div>
              <Input label="Email Address" type="email" value="k.cooray@ndma.lk" onChange={() => {}} required />
              <Input label="Mobile Number" type="tel" value="+94 77 123 4567" onChange={() => {}} />
              <Input label="Organisation" value="National Disaster Management Authority" onChange={() => {}} />
              <Select label="Role" value="coordinator" onChange={() => {}} options={[
                { value: 'coordinator', label: 'Emergency Coordinator' }
              ]} />
              <Button onClick={() => show('success', 'Profile updated successfully.')}>Save Profile</Button>
            </div>
          </Card>
        )}

        {tab === 'security' && (
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Security Settings</h3>
            <div className="space-y-5">
              <div className="pb-5 border-b border-slate-100">
                <h4 className="font-medium text-slate-800 mb-3">Change Password</h4>
                <div className="space-y-3">
                  <Input label="Current Password" type="password" placeholder="••••••••" onChange={() => {}} />
                  <Input label="New Password" type="password" placeholder="Min 8 characters" onChange={() => {}}
                    hint="Must contain uppercase, lowercase, number, and special character" />
                  <Input label="Confirm New Password" type="password" placeholder="••••••••" onChange={() => {}} />
                  <Button onClick={() => show('success', 'Password changed successfully.')}>Update Password</Button>
                </div>
              </div>

              <div className="pb-5 border-b border-slate-100">
                <h4 className="font-medium text-slate-800 mb-1">Two-Factor Authentication</h4>
                <p className="text-sm text-slate-500 mb-3">Add an extra layer of security to your account</p>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">2FA is enabled</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => show('info', '2FA reconfiguration started.')}>Reconfigure</Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-3">Active Sessions</h4>
                <div className="space-y-2">
                  {[
                    { device: 'Chrome · MacBook Pro', location: 'Colombo, Sri Lanka', time: 'Current session', current: true },
                    { device: 'Firefox · Windows 11', location: 'Galle, Sri Lanka', time: '2 hours ago', current: false },
                    { device: 'Safari · iPhone 15', location: 'Colombo, Sri Lanka', time: 'Yesterday', current: false },
                  ].map(session => (
                    <div key={session.device} className={`flex items-center justify-between p-3 rounded-xl border ${session.current ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{session.device}</p>
                        <p className="text-xs text-slate-500">{session.location} · {session.time}</p>
                      </div>
                      {!session.current && (
                        <Button size="sm" variant="danger" onClick={() => show('success', 'Session terminated.')}>Revoke</Button>
                      )}
                      {session.current && <span className="text-xs text-blue-600 font-semibold">Current</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === 'notifications' && (
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Notification Preferences</h3>
            <div className="space-y-5">
              {[
                { group: 'Emergency Alerts', items: ['Critical request alerts', 'Shelter capacity warnings', 'Resource shortage alerts'] },
                { group: 'AI & Operations', items: ['AI recommendation reviews', 'Duplicate detection alerts', 'Demand forecast warnings'] },
                { group: 'Updates', items: ['Request status updates', 'Volunteer task completions', 'Donation confirmations'] },
                { group: 'System', items: ['System maintenance notices', 'Security alerts', 'Login notifications'] },
              ].map(group => (
                <div key={group.group} className="pb-5 border-b border-slate-100 last:border-0">
                  <h4 className="font-medium text-slate-800 mb-3">{group.group}</h4>
                  <div className="space-y-3">
                    {group.items.map(item => (
                      <div key={item} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{item}</span>
                        <div className="flex gap-3">
                          {['Email', 'SMS', 'Push'].map(ch => (
                            <label key={ch} className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" defaultChecked={ch !== 'SMS' || group.group === 'Emergency Alerts'} className="rounded border-slate-300 accent-[#1B3A6B] w-3.5 h-3.5" />
                              <span className="text-xs text-slate-500">{ch}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={() => show('success', 'Notification preferences saved.')}>Save Preferences</Button>
            </div>
          </Card>
        )}

        {tab === 'language' && (
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Language & Region</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
                  { code: 'si', name: 'Sinhala', native: 'සිංහල', flag: '🇱🇰' },
                  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇱🇰' },
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); show('success', `Language changed to ${l.name}.`); }}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${lang === l.code ? 'border-[#1B3A6B] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <p className="text-3xl mb-2">{l.flag}</p>
                    <p className="font-semibold text-slate-900 text-sm">{l.name}</p>
                    <p className="text-xs text-slate-500 font-sinhala">{l.native}</p>
                  </button>
                ))}
              </div>
              <Select label="Date Format" value="DMY" onChange={() => {}} options={[
                { value: 'DMY', label: 'DD/MM/YYYY (Sri Lanka)' },
                { value: 'MDY', label: 'MM/DD/YYYY (US)' },
                { value: 'ISO', label: 'YYYY-MM-DD (ISO)' },
              ]} />
              <Select label="Time Zone" value="asia_colombo" onChange={() => {}} options={[
                { value: 'asia_colombo', label: 'Asia/Colombo (UTC+5:30)' },
              ]} />
            </div>
          </Card>
        )}

        {tab === 'accessibility' && (
          <Card>
            <h3 className="font-semibold text-slate-900 mb-5">Accessibility Settings</h3>
            <div className="space-y-4">
              {[
                { label: 'High contrast mode', desc: 'Increase contrast for better readability', enabled: false },
                { label: 'Large text mode', desc: 'Increase all text sizes by 125%', enabled: false },
                { label: 'Reduce motion', desc: 'Disable animations and transitions', enabled: false },
                { label: 'Screen reader optimisation', desc: 'Enhanced ARIA labels and keyboard navigation', enabled: true },
                { label: 'Focus visible indicators', desc: 'Show keyboard focus outlines always', enabled: true },
              ].map(setting => (
                <label key={setting.label} className="flex items-start justify-between cursor-pointer gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{setting.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{setting.desc}</p>
                  </div>
                  <div className="relative shrink-0 mt-0.5">
                    <input type="checkbox" defaultChecked={setting.enabled} className="sr-only peer" onChange={() => show('success', `${setting.label} toggled.`)} />
                    <div className="w-9 h-5 bg-slate-300 peer-checked:bg-[#1B3A6B] rounded-full transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                  </div>
                </label>
              ))}
              <Alert type="info">Accessibility features help make emergency information available to all users, including those with visual or motor impairments.</Alert>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
