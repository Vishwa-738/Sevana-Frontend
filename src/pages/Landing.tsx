import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, Phone, AlertTriangle, Users, Home,
  Heart, Zap, CheckCircle, Shield,
  ArrowRight, Activity
} from 'lucide-react';
import { Button } from '../components/ui';
import { useAppContext } from '../context';
import customLogo from '../Logo/logo.png';

function useCountUp(target: number, duration = 2000, started: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, started]);
  return count;
}

function StatCard({ value, label, icon, color, delay }: { value: number; label: string; icon: React.ReactNode; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const count = useCountUp(value, 2000, started);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-white text-center hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      style={{ animationDelay: `${delay}ms`, opacity: started ? 1 : 0, transform: started ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center shadow-inner" style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-4xl font-bold font-[Outfit] tracking-tight">{count.toLocaleString()}+</p>
      <p className="text-sm text-white/60 mt-2 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRequestAid = () => {
    if (user) {
      navigate('/citizen?openRequest=true');
    } else {
      navigate('/login?next=%2Fcitizen%3FopenRequest%3Dtrue');
    }
  };

  const handleLocateShelter = () => {
    navigate('/citizen?openShelters=true');
  };

  const navLinks = [
    { label: 'Home', path: '#home' },
    { label: 'About', path: '#about' },
    { label: 'How It Works', path: '#how-it-works' },
    { label: 'Emergency Info', path: '#emergency-info' },
    { label: 'Shelters', path: '/citizen?openShelters=true', isRoute: true }
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: typeof navLinks[0]) => {
    e.preventDefault();
    if (link.isRoute) {
      navigate(link.path);
    } else {
      const element = document.querySelector(link.path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans selection:bg-[#3B82F6] selection:text-white">
      {/* Redesigned Floating Navbar */}
      <nav className="fixed top-4 left-0 right-0 z-50 transition-all duration-300">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-4'}`}>
          <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'bg-[#0A1628]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-2 shadow-2xl' : ''}`}>
            {/* Logo Section */}
            <div className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${isScrolled ? 'scale-90 origin-left' : ''}`} onClick={() => window.scrollTo(0, 0)}>
              <img
                src={customLogo}
                alt="Sevana Logo"
                className="h-20 lg:h-24 w-auto object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                <Shield size={20} className="text-white" />
              </div>
            </div>

            {/* Centered Navigation Links */}
            <div className="hidden lg:flex items-center gap-8 bg-white/5 px-8 py-3 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.path}
                  onClick={(e) => handleNavClick(e, link)}
                  className="text-white/80 hover:text-white text-sm font-semibold tracking-wide transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Button variant="ghost" size="sm" className="!text-white hover:!bg-white/10 transition-colors font-medium" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 px-6 font-semibold" onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="lg:hidden absolute top-full left-4 right-4 mt-2 bg-[#0D1B2E]/95 backdrop-blur-xl border border-white/10 rounded-2xl py-4 px-4 space-y-4 shadow-2xl">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.path}
                onClick={(e) => handleNavClick(e, link)}
                className="block text-white/80 hover:text-white py-2 text-base font-medium"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <Button variant="outline" className="w-full justify-center !border-white/20 !text-white" onClick={() => navigate('/login')}>Sign In</Button>
              <Button className="w-full justify-center bg-blue-600 border-none" onClick={() => navigate('/register')}>Get Started</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#0D1B2E]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/10 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
          <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/15 blur-[80px]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 mb-8 shadow-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">AI-Powered Disaster Response</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] font-[Outfit] mb-6 tracking-tight">
                Crisis Response <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-blue-500">Reimagined.</span>
              </h1>

              <p className="text-white/70 text-lg lg:text-xl mb-4 leading-relaxed max-w-2xl font-light">
                Sevana unites affected citizens, emergency coordinators, and volunteers on a single intelligent platform. Delivering fast, transparent, and life-saving aid across Sri Lanka when seconds matter most.
              </p>

              <p className="text-[#60A5FA] text-sm font-sinhala mb-10 tracking-widest">රැකවරණය • සහයෝගය • බලාපොරොත්තුව</p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-none shadow-lg shadow-red-500/25 transition-all hover:scale-105 h-14 px-8 text-base"
                  icon={<AlertTriangle size={20} />}
                  onClick={handleRequestAid}
                >
                  Request Emergency Aid
                </Button>
                <Button
                  size="lg"
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all hover:scale-105 h-14 px-8 text-base"
                  icon={<Home size={20} />}
                  onClick={handleLocateShelter}
                >
                  Locate Safe Shelter
                </Button>
              </div>
              <div className="flex items-center gap-8 mt-12 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-white/80">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <Phone size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">National Hotline</p>
                    <p className="text-lg font-bold text-white">119</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Activity size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">System Status</p>
                    <p className="text-sm font-bold text-[#22C55E]">24/7 Operational</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative hidden lg:block perspective-1000">
              <div className="relative transform rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-teal-400/20 rounded-3xl blur-2xl" />
                <div className="bg-[#112240]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgb(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <Activity size={18} className="text-[#60A5FA]" />
                        <span className="text-white font-semibold tracking-wide">Live Operations</span>
                      </div>
                      <span className="bg-[#22C55E]/20 text-[#22C55E] text-xs px-3 py-1 rounded-full font-medium border border-[#22C55E]/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> Syncing
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: 'Flood Relief — Kelani Basin', status: 'Critical', count: '284 requests', color: '#EF4444', progress: 85 },
                        { label: 'Landslide — Ratnapura', status: 'High', count: '127 requests', color: '#F97316', progress: 60 },
                        { label: 'Storm Surge — Batticaloa', status: 'Medium', count: '89 requests', color: '#EAB308', progress: 40 },
                      ].map(op => (
                        <div key={op.label} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: op.color, color: op.color }} />
                              <p className="text-white text-sm font-medium">{op.label}</p>
                            </div>
                            <span className="text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider" style={{ backgroundColor: op.color + '20', color: op.color }}>
                              {op.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                            <span>{op.count} active</span>
                            <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#60A5FA]" />
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${op.progress}%`, backgroundColor: op.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -left-8 bg-[#0D1B2E] border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-2xl animate-[bounce_4s_infinite]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
                    <Brain size={24} className="text-[#60A5FA]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold font-[Outfit]">AI Rerouting Active</p>
                    <p className="text-blue-400/80 text-xs mt-0.5">Optimizing supply chains</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section id="about" className="bg-[#0A1628] py-8 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-8">
            <StatCard delay={0} value={14} label="Active Zones" icon={<AlertTriangle size={24} />} color="#EF4444" />
            <StatCard delay={100} value={4120} label="Requests Handled" icon={<Zap size={24} />} color="#3B82F6" />
            <StatCard delay={200} value={15800} label="Citizens Assisted" icon={<Users size={24} />} color="#10B981" />
            <StatCard delay={300} value={56} label="Safe Shelters" icon={<Home size={24} />} color="#8B5CF6" />
            <StatCard delay={400} value={2150} label="Volunteers" icon={<Heart size={24} />} color="#F59E0B" />
          </div>
        </div>
      </section>

      {/* Workflow Features */}
      <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-[500px] bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-4">
              <Shield size={24} />
            </div>
            <h2 className="text-4xl font-extrabold text-[#0D1B2E] font-[Outfit] mb-4 tracking-tight">Coordinating Every Step of Relief</h2>
            <p className="text-[#5A7290] text-lg leading-relaxed">From the first distress call to the final aid delivery, Sevana ensures seamless, transparent coordination between citizens, government, and volunteers.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <AlertTriangle size={28} />, color: '#EF4444', bg: 'bg-red-50',
                title: 'Instant Reporting',
                desc: 'Citizens submit targeted assistance requests with geolocations. Our AI instantly classifies severity and routes it to the nearest coordinator.'
              },
              {
                icon: <Brain size={28} />, color: '#3B82F6', bg: 'bg-blue-50',
                title: 'Smart Dispatch',
                desc: 'Command centers receive AI-powered recommendations for resource allocation, shelter mapping, and volunteer deployment.'
              },
              {
                icon: <CheckCircle size={28} />, color: '#10B981', bg: 'bg-green-50',
                title: 'Transparent Tracking',
                desc: 'End-to-end visibility from dispatch to delivery. Citizens get SMS updates, and authorities maintain complete audit trails.'
              },
            ].map((f) => (
              <div key={f.title} className="group bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${f.color}/10 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                <div className={`w-16 h-16 rounded-2xl ${f.bg} mb-6 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform`} style={{ color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-[#0D1B2E] mb-3 font-[Outfit]">{f.title}</h3>
                <p className="text-[#5A7290] leading-relaxed">{f.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: f.color }}>
                  Explore feature <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Directory */}
      <section id="emergency-info" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#0D1B2E] to-[#1A3A6B] rounded-[2.5rem] p-8 lg:p-14 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-4 py-2 mb-6">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-200 text-sm font-semibold tracking-wide">Critical Directory</span>
                </div>
                <h2 className="text-4xl font-bold text-white font-[Outfit] mb-4 tracking-tight">Need Immediate Help?</h2>
                <p className="text-blue-100/80 text-lg mb-8 leading-relaxed">If you are in immediate, life-threatening danger, contact national emergency services first. Use Sevana to coordinate ongoing relief and shelter.</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'National Emergency', number: '119', icon: <Phone size={20} />, color: 'text-red-400' },
                    { label: 'Police Headquarters', number: '118', icon: <Shield size={20} />, color: 'text-blue-400' },
                    { label: 'Disaster Management', number: '117', icon: <AlertTriangle size={20} />, color: 'text-orange-400' },
                    { label: 'Sri Lanka Red Cross', number: '011 2395300', icon: <Heart size={20} />, color: 'text-red-300' },
                  ].map(c => (
                    <div key={c.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/15 transition-colors">
                      <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shadow-inner ${c.color}`}>
                        {c.icon}
                      </div>
                      <div>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">{c.label}</p>
                        <p className="text-white font-bold text-lg">{c.number}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { title: 'For Citizens', desc: 'Request aid and find shelters', items: ['Submit aid requests', 'Track delivery status', 'Navigate to shelters', 'Receive SMS alerts'] },
                  { title: 'For Authorities', desc: 'Command and control', items: ['Manage live operations', 'Dispatch resources', 'View AI heatmaps', 'Generate audit reports'] },
                ].map(panel => (
                  <div key={panel.title} className="bg-[#0A1628]/50 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                    <h3 className="text-white font-bold text-xl mb-1 font-[Outfit]">{panel.title}</h3>
                    <p className="text-blue-200/60 text-sm mb-5">{panel.desc}</p>
                    <ul className="space-y-3">
                      {panel.items.map(item => (
                        <li key={item} className="flex items-start gap-3 text-white/80 text-sm">
                          <CheckCircle size={16} className="shrink-0 text-teal-400 mt-0.5" />
                          <span className="font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A1628] pt-16 pb-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img
                  src={customLogo}
                  alt="Sevana Logo"
                  className="h-12 w-auto object-contain drop-shadow-md"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
                <div className="hidden w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed mb-4">
                Sri Lanka's centralized, AI-enhanced humanitarian crisis management and aid coordination platform.
              </p>
            </div>

            {[
              { label: 'Platform Solutions', links: ['Citizen Portal', 'Coordinator Dashboard', 'Volunteer Network', 'Donor Transparency', 'Partner API'] },
              { label: 'Resources & Support', links: ['Documentation', 'Training Guides', 'System Status', 'Privacy Policy', 'Terms of Service'] },
              { label: 'Connect', links: ['contact@sevana.lk', 'Emergency: 119', 'Colombo, Sri Lanka', 'Twitter: @sevana_lk', 'Facebook'] },
            ].map(col => (
              <div key={col.label}>
                <h4 className="text-white font-bold mb-4 text-sm font-[Outfit] tracking-wide uppercase">{col.label}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="text-white/50 hover:text-white hover:translate-x-1 inline-block text-sm transition-all">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">© 2026 Sevana. All rights reserved.</p>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-[#22C55E] rounded-full shadow-[0_0_8px_#22C55E]" />
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icon Components
function Brain({ size, className }: { size: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}