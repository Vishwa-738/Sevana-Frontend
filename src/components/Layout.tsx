import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Package, Home, Heart, Bell,
  Map as MapIcon, BarChart3, FileText, Settings, LogOut, ChevronLeft, ChevronRight,
  Menu, X, User, Shield, HandHeart, Target
} from 'lucide-react';
import { Avatar, Dropdown } from './ui';
import { useAppContext } from '../context';
import { getNotifications } from '../api';
import customLogo from '../Logo/logo.png';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles: string[];
}

const ALL_STAFF = ['Coordinator', 'Admin', 'LogisticsManager', 'ShelterAdmin', 'volunteer_coord', 'donor'];
const ALL_USERS = ['Citizen', 'citizen', 'Volunteer', 'volunteer', ...ALL_STAFF];

const navItems: NavItem[] = [
  { label: 'Citizen Portal', path: '/citizen', icon: <Home size={18} />, allowedRoles: ['citizen', 'Citizen', 'Admin', 'admin'] },
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, allowedRoles: ['Coordinator', 'Admin'] },
  { label: 'Crisis Management', path: '/crisis', icon: <AlertTriangle size={18} />, allowedRoles: ['Coordinator', 'Admin', 'admin'] },
  { label: 'Campaigns', path: '/campaigns', icon: <Target size={18} />, allowedRoles: ['Coordinator', 'Admin'] },
  { label: 'Resources', path: '/resources', icon: <Package size={18} />, allowedRoles: ['Coordinator', 'Admin', 'LogisticsManager'] },
  { label: 'Shelters', path: '/shelters', icon: <Home size={18} />, allowedRoles: ['Coordinator', 'Admin', 'ShelterAdmin'] },
  { label: 'Volunteers', path: '/volunteers', icon: <HandHeart size={18} />, allowedRoles: ['Coordinator', 'Admin', 'volunteer_coord'] },
  { label: 'Donors', path: '/donors', icon: <Heart size={18} />, allowedRoles: ['Coordinator', 'Admin', 'donor'] },
  { label: 'Notifications', path: '/notifications', icon: <Bell size={18} />, allowedRoles: ALL_USERS },
  { label: 'Map', path: '/map', icon: <MapIcon size={18} />, allowedRoles: ALL_STAFF },
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, allowedRoles: ALL_STAFF },
  { label: 'Audit Logs', path: '/audit', icon: <FileText size={18} />, allowedRoles: ['Coordinator', 'Admin'] },
  { label: 'Administration', path: '/admin', icon: <Shield size={18} />, allowedRoles: ['Admin', 'admin'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAppContext();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadUnread = async () => {
      try {
        const res = await getNotifications();
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        const count = list.filter((n: any) => !(n.isRead ?? n.IsRead)).length;
        if (active) setUnreadCount(count);
      } catch {
        // Ignore background poll errors
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.unread === 'number') setUnreadCount(detail.unread);
      else loadUnread();
    };
    window.addEventListener('sevana:notifications-updated', onUpdated);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('sevana:notifications-updated', onUpdated);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter(item => user && item.allowedRoles.includes(user.role));

  const getHomePath = () => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'citizen') return '/citizen';
    if (role === 'volunteer') return '/volunteer-dashboard';
    return visibleNavItems[0]?.path || '/dashboard';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full sidebar-gradient">
      {/* LOGO HEADER */}
      <div className="h-20 flex items-center justify-center px-3 border-b border-white/10 shrink-0 w-full">
        <NavLink
          to={getHomePath()}
          className="flex items-center justify-center w-full py-2 px-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          title="Sevana Home"
        >
          <img
            src={customLogo}
            alt="Sevana Logo"
            className={`${collapsed ? 'h-9' : 'h-12'} w-auto max-w-full object-contain drop-shadow-md transition-all duration-300`}
          />
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {visibleNavItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${isActive ? 'bg-white/15 text-white font-medium' : 'text-white/65 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="bg-[#EA580C] text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar name={user?.name || 'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-white/50 text-xs truncate">{user?.role || ''}</p>
            </div>
            <Dropdown
              trigger={<button className="text-white/60 hover:text-white cursor-pointer"><Settings size={16} /></button>}
              items={[
                { label: 'Profile', icon: <User size={14} />, onClick: () => navigate('/profile') },
                { label: 'Settings', icon: <Settings size={14} />, onClick: () => navigate('/settings') },
                { label: 'Logout', icon: <LogOut size={14} />, onClick: handleLogout, danger: true },
              ]}
              align="left"
              direction="up"
            />
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center text-white/60 hover:text-white cursor-pointer py-1">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4F8]">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 relative ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-[#CBD8E6] shadow-sm flex items-center justify-center text-[#5A7290] hover:text-[#1A3A6B] transition-colors cursor-pointer z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex flex-col shrink-0"><SidebarContent /></div>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#CBD8E6] flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 hover:bg-[#F0F4F8] rounded-lg cursor-pointer" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] pulse-dot" />
              <span className="text-xs text-[#5A7290]">System Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/notifications')} className="relative p-2 hover:bg-[#F0F4F8] rounded-lg cursor-pointer text-[#5A7290]" title="Notifications">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#EA580C] rounded-full" />}
            </button>

            <Dropdown
              align="right"
              trigger={
                <div className="flex items-center gap-2 cursor-pointer p-1 -mr-1 hover:bg-[#F0F4F8] rounded-lg transition-colors">
                  <Avatar name={user?.name || 'User'} size="sm" />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-medium text-[#0D1B2E]">{user?.name || 'User'}</p>
                    <p className="text-xs text-[#5A7290] capitalize">{user?.role || ''}</p>
                  </div>
                </div>
              }
              items={[
                { label: 'Profile', icon: <User size={14} />, onClick: () => navigate('/profile') },
                { label: 'Settings', icon: <Settings size={14} />, onClick: () => navigate('/settings') },
                { label: 'Logout', icon: <LogOut size={14} />, onClick: handleLogout, danger: true },
              ]}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1B2E] font-[Outfit]">{title}</h1>
        {subtitle && <p className="text-sm text-[#5A7290] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}