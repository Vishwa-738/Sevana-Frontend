import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, ChevronDown, Search, Eye, EyeOff } from 'lucide-react';

// ── Button ─────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
type BtnSize = 'sm' | 'md' | 'lg';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<BtnVariant, string> = {
  primary: 'bg-[#1A3A6B] text-white hover:bg-[#163060] active:bg-[#112550] shadow-sm',
  secondary: 'bg-[#166534] text-white hover:bg-[#145c2e] active:bg-[#104824] shadow-sm',
  success: 'bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm',
  warning: 'bg-[#EA580C] text-white hover:bg-[#C2410C] shadow-sm',
  ghost: 'bg-transparent text-[#1A3A6B] hover:bg-[#EFF6FF]',
  outline: 'bg-white border border-[#CBD8E6] text-[#0D1B2E] hover:bg-[#F0F4F8]',
};

const sizeStyles: Record<BtnSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, className = '', ...props }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-[10px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

// ── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : 'w-8 h-8';
  return (
    <div className={`${s} border-2 border-current border-t-transparent rounded-full animate-spin-smooth`} />
  );
}

// ── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Input({ label, error, hint, iconLeft, iconRight, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#0D1B2E]">{label}</label>}
      <div className="relative">
        {iconLeft && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7290]">{iconLeft}</span>}
        <input
          className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-[#0D1B2E] placeholder:text-[#5A7290] focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/30 focus:border-[#1A3A6B] transition-all ${error ? 'border-[#DC2626]' : 'border-[#CBD8E6]'} ${iconLeft ? 'pl-9' : ''} ${iconRight ? 'pr-9' : ''} ${className}`}
          {...props}
        />
        {iconRight && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7290]">{iconRight}</span>}
      </div>
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
      {hint && !error && <span className="text-xs text-[#5A7290]">{hint}</span>}
    </div>
  );
}

// ── PasswordInput ─────────────────────────────────────────────────────────
export function PasswordInput({ label, error, ...props }: Omit<InputProps, 'type' | 'iconRight'>) {
  const [show, setShow] = useState(false);
  return (
    <Input
      label={label}
      error={error}
      type={show ? 'text' : 'password'}
      iconRight={
        <button type="button" onClick={() => setShow(s => !s)} className="cursor-pointer">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      {...props}
    />
  );
}

// ── SearchInput ─────────────────────────────────────────────────────────────
export function SearchInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7290]" />
      <input
        className={`w-full bg-white border border-[#CBD8E6] rounded-[10px] pl-9 pr-3 py-2 text-sm text-[#0D1B2E] placeholder:text-[#5A7290] focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/30 focus:border-[#1A3A6B] transition-all ${className}`}
        {...props}
      />
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#0D1B2E]">{label}</label>}
      <div className="relative">
        <select
          className={`w-full appearance-none bg-white border rounded-[10px] px-3 py-2 pr-8 text-sm text-[#0D1B2E] focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/30 focus:border-[#1A3A6B] transition-all cursor-pointer ${error ? 'border-[#DC2626]' : 'border-[#CBD8E6]'} ${className}`}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7290] pointer-events-none" />
      </div>
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#0D1B2E]">{label}</label>}
      <textarea
        className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-[#0D1B2E] placeholder:text-[#5A7290] focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/30 focus:border-[#1A3A6B] transition-all resize-none ${error ? 'border-[#DC2626]' : 'border-[#CBD8E6]'} ${className}`}
        rows={3}
        {...props}
      />
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', hover, padding = 'p-5', onClick }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-[#CBD8E6] shadow-sm ${padding} ${hover ? 'card-hover cursor-pointer' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeVariants: Record<BadgeVariant, string> = {
  primary: 'bg-[#EFF6FF] text-[#1D4ED8]',
  secondary: 'bg-[#F0FDF4] text-[#166534]',
  success: 'bg-[#F0FDF4] text-[#166534]',
  warning: 'bg-[#FFF7ED] text-[#C2410C]',
  danger: 'bg-[#FFF1F2] text-[#DC2626]',
  info: 'bg-[#F5F3FF] text-[#6D28D9]',
  neutral: 'bg-[#F1F5F9] text-[#475569]',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({ variant = 'neutral', children, dot, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────────────
const priorityMap: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'priority-critical' },
  high: { label: 'High', className: 'priority-high' },
  medium: { label: 'Medium', className: 'priority-medium' },
  low: { label: 'Low', className: 'priority-low' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priorityMap[priority] || priorityMap.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${p.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {p.label}
    </span>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────
const statusMap: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'status-submitted' },
  review: { label: 'Under Review', className: 'status-review' },
  verified: { label: 'Verified', className: 'status-verified' },
  assigned: { label: 'Assigned', className: 'status-assigned' },
  inprogress: { label: 'In Progress', className: 'status-inprogress' },
  delivered: { label: 'Delivered', className: 'status-delivered' },
  closed: { label: 'Closed', className: 'status-closed' },
  active: { label: 'Active', className: 'status-verified' },
  inactive: { label: 'Inactive', className: 'status-closed' },
  pending: { label: 'Pending', className: 'status-review' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || { label: status, className: 'status-closed' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────
type AlertType = 'success' | 'warning' | 'error' | 'info';
const alertConfig: Record<AlertType, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: { icon: <CheckCircle size={16} />, bg: 'bg-[#F0FDF4]', border: 'border-[#86EFAC]', text: 'text-[#166534]' },
  warning: { icon: <AlertTriangle size={16} />, bg: 'bg-[#FFF7ED]', border: 'border-[#FED7AA]', text: 'text-[#C2410C]' },
  error: { icon: <AlertCircle size={16} />, bg: 'bg-[#FFF1F2]', border: 'border-[#FECDD3]', text: 'text-[#DC2626]' },
  info: { icon: <Info size={16} />, bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]', text: 'text-[#1D4ED8]' },
};

export function Alert({ type, title, message, onClose }: { type: AlertType; title?: string; message: string; onClose?: () => void }) {
  const cfg = alertConfig[type];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.text} animate-fade-in`}>
      <span className="mt-0.5 shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 hover:opacity-70 cursor-pointer">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const modalSizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${modalSizes[size]} animate-scale-in overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CBD8E6]">
          <h3 className="text-lg font-semibold text-[#0D1B2E]">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#F0F4F8] rounded-lg cursor-pointer text-[#5A7290]">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#CBD8E6] flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────
interface Tab { id: string; label: string; icon?: React.ReactNode }
interface TabsProps { tabs: Tab[]; active: string; onChange: (id: string) => void; className?: string; }

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-1 bg-[#F0F4F8] p-1 rounded-xl ${className}`}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium transition-all cursor-pointer ${active === t.id ? 'bg-white text-[#0D1B2E] shadow-sm' : 'text-[#5A7290] hover:text-[#0D1B2E]'}`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────
interface ProgressProps { value: number; max?: number; color?: string; size?: 'sm' | 'md'; label?: string }

export function Progress({ value, max = 100, color = '#1A3A6B', size = 'md', label }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100);
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const barColor = pct >= 90 ? '#DC2626' : pct >= 70 ? '#EA580C' : pct >= 50 ? '#CA8A04' : color;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-[#5A7290]">{label}</span>
          <span className="text-xs font-medium text-[#0D1B2E]">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`w-full ${h} bg-[#E8EDF3] rounded-full overflow-hidden`}>
        <div
          className={`${h} rounded-full transition-all duration-1000`}
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────
export interface ToastItem { id: string; type: AlertType; message: string; title?: string }

export function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const cfg = alertConfig[toast.type];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${cfg.bg} ${cfg.border} ${cfg.text} animate-toast-in min-w-[280px] max-w-sm`}>
      <span className="mt-0.5 shrink-0">{cfg.icon}</span>
      <div className="flex-1">
        {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
        <p className="text-sm">{toast.message}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 hover:opacity-70 cursor-pointer">
        <X size={14} />
      </button>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changePositive?: boolean;
  color?: string;
  subtitle?: string;
  onClick?: () => void;
}

export function KpiCard({ label, value, icon, change, changePositive, color = '#1A3A6B', subtitle, onClick }: KpiCardProps) {
  return (
    <Card hover={!!onClick} className={onClick ? 'cursor-pointer' : ''}>
      <div className="flex items-start justify-between mb-3" onClick={onClick}>
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${changePositive ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FFF1F2] text-[#DC2626]'}`}>
            {changePositive ? '▲' : '▼'} {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[#0D1B2E] font-[Outfit]">{value}</p>
      <p className="text-sm text-[#5A7290] mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-[#5A7290] mt-1">{subtitle}</p>}
    </Card>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
interface AvatarProps { name: string; size?: 'sm' | 'md' | 'lg'; src?: string }

const colors = ['#1A3A6B', '#166534', '#EA580C', '#6D28D9', '#C2410C', '#1D4ED8'];

export function Avatar({ name, size = 'md', src }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-12 h-12 text-base';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white shrink-0 overflow-hidden`} style={{ backgroundColor: color }}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-[#EFF6FF] rounded-2xl flex items-center justify-center text-[#1A3A6B] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#0D1B2E] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#5A7290] max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Dropdown ─────────────────────────────────────────────────────────────
interface DropdownProps {
  trigger: React.ReactNode;
  items: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }[];
  align?: 'left' | 'right';
}

export function Dropdown({ 
  trigger, 
  items, 
  align = 'right',
  direction = 'down' // Added new prop
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
          <div className={`absolute z-50 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 
            ${align === 'right' ? 'right-0' : 'left-0'} 
            ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}>
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); setIsOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
// ── Table ─────────────────────────────────────────────────────────────────
interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode; width?: string }

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
}

export function Table<T>({ columns, data, loading, onRowClick, emptyMessage = 'No records found', keyExtractor }: TableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#CBD8E6]">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-[#5A7290] uppercase tracking-wider" style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-sm text-[#5A7290]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={keyExtractor(row)}
                className={`border-b border-[#E8EDF3] table-row-hover transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-[#0D1B2E]">
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Confirmation Dialog ─────────────────────────────────────────────────
interface ConfirmProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; danger?: boolean }

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-[#5A7290]">{message}</p>
    </Modal>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
interface PaginationProps { page: number; total: number; pageSize?: number; onChange: (page: number) => void }

export function Pagination({ page, total, pageSize = 10, onChange }: PaginationProps) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-sm text-[#5A7290] hover:bg-[#F0F4F8] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
      >
        ←
      </button>
      {start > 1 && <span className="px-3 py-1.5 text-sm text-[#5A7290]">...</span>}
      {nums.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${n === page ? 'bg-[#1A3A6B] text-white' : 'text-[#5A7290] hover:bg-[#F0F4F8]'}`}
        >
          {n}
        </button>
      ))}
      {end < pages && <span className="px-3 py-1.5 text-sm text-[#5A7290]">...</span>}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="px-3 py-1.5 rounded-lg text-sm text-[#5A7290] hover:bg-[#F0F4F8] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
      >
        →
      </button>
    </div>
  );
}
