import React, { useState } from 'react';


// --- Card ---
export function Card({ children, className = '', padding = 'p-6', hover = false, onClick }: { children: React.ReactNode; className?: string; padding?: string; hover?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${padding} ${hover ? 'hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  );
}

// --- KpiCard ---
// UPDATED: Added the missing props that the Dashboard is trying to pass
export function KpiCard({ 
  label, 
  value, 
  icon, 
  color, 
  delta, 
  deltaUp, 
  iconBg, 
  critical 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color?: string;
  delta?: string;
  deltaUp?: boolean;
  iconBg?: string;
  critical?: boolean;
}) {
  return (
    <Card padding="p-5" className={critical ? 'border-red-200 bg-red-50/30' : ''}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg || 'bg-slate-100'}`} style={{ color }}>
          {icon}
        </div>
        {delta && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${deltaUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {delta}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold font-[Outfit] text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
      </div>
    </Card>
  );
}

// --- Badge ---
export function Badge({ children, variant = 'neutral', className = '', dot = false }: { children: React.ReactNode; variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral' | 'critical' | 'high' | 'medium' | 'low'; className?: string; dot?: boolean }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    primary: 'bg-indigo-100 text-indigo-700',
    neutral: 'bg-slate-100 text-slate-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-slate-100 text-slate-700'
  };
  const dotColors = {
    success: 'bg-green-500', danger: 'bg-red-500', critical: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500', primary: 'bg-indigo-500', neutral: 'bg-slate-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-slate-500'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${styles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { v: any; l: string }> = {
    open: { v: 'success', l: 'Open' }, full: { v: 'danger', l: 'Full' }, closed: { v: 'neutral', l: 'Closed' },
    active: { v: 'danger', l: 'Active' }, monitoring: { v: 'warning', l: 'Monitoring' }, resolved: { v: 'success', l: 'Resolved' },
    allocated: { v: 'primary', l: 'Allocated' }, received: { v: 'success', l: 'Received' }, dispatched: { v: 'info', l: 'Dispatched' },
    inprogress: { v: 'info', l: 'In Progress' }, delivered: { v: 'success', l: 'Delivered' }
  };
  const c = config[status.toLowerCase()] || { v: 'neutral', l: status };
  return <Badge variant={c.v}>{c.l}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={priority as any} dot>{priority}</Badge>;
}

// --- Button ---
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '', 
  onClick, 
  type = 'button',
  disabled = false,
  loading = false
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'; 
  size?: 'sm' | 'md' | 'lg'; 
  icon?: React.ReactNode; 
  className?: string; 
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}) {
  const baseStyle = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#1A3A6B] text-white hover:bg-[#112A50] shadow-sm",
    secondary: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      type={type}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      ) : icon}
      {children}
    </button>
  );
}

// --- Tabs ---
// UPDATED: Added 'count' to the Tab type definition
export function Tabs({ 
  tabs, 
  active, 
  onChange, 
  className = '' 
}: { 
  tabs: { id: string; label: string; count?: number }[]; 
  active: string; 
  onChange: (id: string) => void; 
  className?: string;
}) {
  return (
    <div className={`flex gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            active === tab.id 
              ? 'bg-white text-[#1A3A6B] shadow-sm border border-slate-200/50' 
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${active === tab.id ? 'bg-[#1A3A6B]/10 text-[#1A3A6B]' : 'bg-slate-200 text-slate-500'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// --- Inputs ---
export function Input({ label, iconLeft, className = '', ...props }: any) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        {iconLeft && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{iconLeft}</div>}
        <input 
          className={`w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors py-2.5 ${iconLeft ? 'pl-10 pr-4' : 'px-4'}`}
          {...props} 
        />
      </div>
    </div>
  );
}

// NEW COMPONENT: SearchBar
export function SearchBar({ value, onChange, placeholder = "Search...", className = "" }: { value: string, onChange: (v: string) => void, placeholder?: string, className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      />
    </div>
  );
}

export function PasswordInput(props: any) {
  const [show, setShow] = useState(false);
  return (
    <div className={props.className}>
      {props.label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{props.label}</label>}
      <div className="relative">
        <input 
          type={show ? 'text' : 'password'}
          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors py-2.5 pl-4 pr-10"
          {...props} 
        />
        <button 
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? (
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          )}
        </button>
      </div>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }: any) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <textarea 
        className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors px-4 py-3"
        {...props} 
      />
    </div>
  );
}

export function Select({ label, options, className = '', ...props }: any) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <select 
        className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors px-4 py-2.5 appearance-none"
        {...props}
      >
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function SearchInput({ className = '', ...props }: any) {
  return <Input iconLeft={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>} className={className} {...props} />;
}

// --- Feedback ---
export function Alert({ type = 'info', title, message, onClose }: { type?: 'info' | 'success' | 'warning' | 'error'; title?: string; message: string; onClose?: () => void }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };
  
  return (
    <div className={`p-4 rounded-xl border ${styles[type]} flex items-start gap-3`}>
      <div className="flex-1">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="opacity-50 hover:opacity-100 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      )}
    </div>
  );
}

export function Progress({ value, max, label, size = 'md' }: { value: number; max: number; label?: string; size?: 'sm' | 'md' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div>
      {label && <div className="flex justify-between text-xs text-slate-500 mb-1.5"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${h}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-[#1A3A6B]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// --- Data Display ---
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
          <tr>
            {headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

// --- Utils ---
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 border-2 border-white shadow-sm`}>
      {initials}
    </div>
  );
}

// --- Overlays ---
export function Modal({ open, onClose, title, children, footer, size = 'md' }: any) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size as keyof typeof sizes]} flex flex-col max-h-[90vh] animate-scale-in`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 font-[Outfit]">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Dropdown({ 
  trigger, 
  items, 
  align = 'right',
  direction = 'down' 
}: { 
  trigger: React.ReactNode; 
  items: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }[]; 
  align?: 'left' | 'right';
  direction?: 'down' | 'up';
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute z-50 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 animate-fade-in
            ${align === 'right' ? 'right-0' : 'left-0'} 
            ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}>
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); setIsOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}