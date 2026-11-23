import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Navigation, ArrowLeft, Phone, Shield, Droplets, HeartPulse, Coffee } from 'lucide-react';
import { Button, Badge } from '../components/ui';

// Local mock data matching your existing active shelters
const publicShelters = [
  { id: '1', name: 'Kelaniya Community Center', district: 'Gampaha', capacity: 150, occupancy: 103, status: 'Open', phone: '011 291 1234', facilities: ['Food', 'Water', 'Medical', 'Toilets'] },
  { id: '2', name: 'Welisara National School', district: 'Gampaha', capacity: 80, occupancy: 68, status: 'Open', phone: '011 295 5678', facilities: ['Food', 'Water', 'Toilets'] },
  { id: '3', name: 'Army Camp Shelter — Panagoda', district: 'Colombo', capacity: 200, occupancy: 200, status: 'Full', phone: '011 285 4321', facilities: ['Food', 'Water', 'Medical', 'Toilets', 'Security'] },
  { id: '4', name: 'Ja-Ela Pradeshiya Sabha Hall', district: 'Gampaha', capacity: 120, occupancy: 45, status: 'Open', phone: '011 223 3445', facilities: ['Food', 'Water', 'Toilets'] },
  { id: '5', name: 'YMCA Temporary Shelter', district: 'Colombo', capacity: 60, occupancy: 0, status: 'Closed', phone: '011 243 2111', facilities: ['Water', 'Toilets'] },
];

export default function PublicShelters() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredShelters = publicShelters.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans">
      {/* Public Header */}
      <header className="bg-[#0D1B2E] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-white/70 hover:text-white transition-colors cursor-pointer p-1 -ml-1 rounded-lg hover:bg-white/10">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                 <Shield size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg leading-none font-[Outfit]">Sevana Public</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="!text-white !border-white/20 hover:!bg-white/10" onClick={() => navigate('/login')}>
            Coordinator Login
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0D1B2E] font-[Outfit] mb-2">Find a Safe Shelter</h1>
          <p className="text-[#5A7290]">Locate active emergency shelters, check live capacity, and find direct navigation routes.</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by area, district, or shelter name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Open', 'Full'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-[#0D1B2E] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Shelter Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShelters.map(shelter => {
            const spacesAvailable = shelter.capacity - shelter.occupancy;
            const pct = Math.round((shelter.occupancy / shelter.capacity) * 100);
            
            return (
              <div key={shelter.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-[#0D1B2E] text-lg leading-tight mb-1">{shelter.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                      <MapPin size={14} />
                      {shelter.district} District
                    </div>
                  </div>
                  <Badge variant={(shelter.status === 'Full' ? 'critical' : shelter.status === 'Closed' ? 'default' : 'success') as any}>
                    {shelter.status}
                  </Badge>
                </div>

                <div className="mt-4 mb-5 flex-1">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 flex items-center gap-1.5"><Users size={14}/> {shelter.occupancy} / {shelter.capacity}</span>
                    <span className={`font-semibold ${spacesAvailable === 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {spacesAvailable > 0 ? `${spacesAvailable} spaces left` : 'No spaces'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {shelter.facilities.map(fac => (
                    <span key={fac} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-xs text-slate-600 font-medium">
                      {fac === 'Water' && <Droplets size={12} className="text-blue-500"/>}
                      {fac === 'Medical' && <HeartPulse size={12} className="text-red-500"/>}
                      {fac === 'Food' && <Coffee size={12} className="text-amber-600"/>}
                      {fac}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-100">
                  <Button variant="outline" className="w-full text-sm h-10" icon={<Phone size={16} />}>
                    Call
                  </Button>
                  <Button className="w-full text-sm h-10 bg-blue-600 hover:bg-blue-700" icon={<Navigation size={16} />} disabled={shelter.status === 'Closed'}>
                    Directions
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}