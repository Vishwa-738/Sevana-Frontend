import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/Layout';
import { Card, Button, Badge, Tabs } from '../components/ui';
import { Bell, CheckCircle, CheckCheck, Clock, RefreshCw } from 'lucide-react';
import { getNotifications, markNotificationAsRead } from '../api';
import { useAppContext } from '../context';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  timestampMs: number;
  type: string;
}

function normalizeNotification(n: any): NotificationItem {
  const rawDate =
    n.createdAtUtc ||
    n.CreatedAtUtc ||
    n.createdAt ||
    n.CreatedAt ||
    n.timestamp ||
    n.Timestamp ||
    '';
  const parsedMs = rawDate ? Date.parse(rawDate) : 0;

  return {
    id: n.id || n.Id || '',
    title: n.title || n.Title || '',
    message: n.message || n.Message || n.content || n.Content || '',
    isRead: Boolean(n.isRead ?? n.IsRead ?? false),
    createdAt: rawDate,
    timestampMs: isNaN(parsedMs) ? 0 : parsedMs,
    type: n.type || n.Type || 'Info',
  };
}

function formatDate(timestampMs: number): string {
  if (!timestampMs) return 'Just now';
  return new Date(timestampMs).toLocaleString();
}

function getTypeVariant(type: string): 'danger' | 'warning' | 'success' | 'info' | 'neutral' {
  const t = type.toLowerCase();
  if (t.includes('alert') || t.includes('critical') || t.includes('error')) return 'danger';
  if (t.includes('warn')) return 'warning';
  if (t.includes('success') || t.includes('assign') || t.includes('shelter')) return 'success';
  if (t.includes('info') || t.includes('campaign')) return 'info';
  return 'neutral';
}

export function NotificationCenter() {
  const { addToast } = useAppContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const notifyBadgeSync = (items: NotificationItem[]) => {
    const unread = items.filter((n) => !n.isRead).length;
    window.dispatchEvent(new CustomEvent('sevana:notifications-updated', { detail: { unread } }));
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      const rawList = Array.isArray(res) ? res : (res?.data || res?.items || []);
      const normalized = rawList
        .map(normalizeNotification)
        .sort((a: NotificationItem, b: NotificationItem) => b.timestampMs - a.timestampMs);

      setNotifications(normalized);
      notifyBadgeSync(normalized);
    } catch (error: any) {
      console.error('Failed to fetch notifications', error);
      addToast({ type: 'error', message: error?.message || 'Failed to load notifications.' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        notifyBadgeSync(updated);
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to mark as read', error);
      addToast({ type: 'error', message: error?.message || 'Could not mark notification as read.' });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadItems = notifications.filter((n) => !n.isRead);
    if (unreadItems.length === 0) return;

    setMarkingAll(true);
    try {
      await Promise.all(unreadItems.map((n) => markNotificationAsRead(n.id)));
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, isRead: true }));
        notifyBadgeSync(updated);
        return updated;
      });
      addToast({ type: 'success', message: 'All notifications marked as read.' });
    } catch (error: any) {
      addToast({ type: 'error', message: error?.message || 'Failed to mark all notifications as read.' });
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on emergency alerts, assignments, and campaign statuses"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            {unreadCount > 0 && (
              <Button size="sm" onClick={handleMarkAllAsRead} disabled={markingAll}>
                <CheckCheck size={15} /> {markingAll ? 'Updating...' : 'Mark All Read'}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <Card padding="p-0" className="overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Loading notifications...</div>
        ) : visibleNotifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Bell size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">
              {activeTab === 'unread' ? 'No unread notifications.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleNotifications.map((notif, idx) => (
              <div
                key={notif.id || idx}
                className={`p-4 flex items-start gap-4 transition-colors ${
                  notif.isRead ? 'bg-white opacity-75' : 'bg-blue-50/50'
                }`}
              >
                <div
                  className={`mt-1 shrink-0 p-2 rounded-full ${
                    notif.isRead ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  {notif.title && (
                    <p className="text-sm font-semibold text-slate-900 mb-0.5">{notif.title}</p>
                  )}
                  <p className={`text-sm ${notif.isRead ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {formatDate(notif.timestampMs)}
                    </span>
                    {notif.type && (
                      <Badge variant={getTypeVariant(notif.type)} className="ml-1 scale-90 origin-left">
                        {notif.type}
                      </Badge>
                    )}
                  </div>
                </div>
                {!notif.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="shrink-0 text-blue-600 hover:bg-blue-100"
                  >
                    <CheckCircle size={15} /> Mark Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}