'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Calendar as CalendarIcon,
  Activity,
  Check,
  Clock,
  Trash2,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type NotificationType = string;

const getNotificationCategory = (type: NotificationType) => {
  const alerts = ['ASSET_OVERDUE', 'AUDIT_DISCREPANCY', 'MAINTENANCE_RAISED'];
  const approvals = [
    'TRANSFER_REQUESTED',
    'TRANSFER_APPROVED',
    'TRANSFER_REJECTED',
    'MAINTENANCE_APPROVED',
    'MAINTENANCE_REJECTED',
  ];
  const bookings = ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER'];

  if (alerts.includes(type)) return 'alerts';
  if (approvals.includes(type)) return 'approvals';
  if (bookings.includes(type)) return 'bookings';
  return 'general';
};

const getNotificationIcon = (type: NotificationType) => {
  const category = getNotificationCategory(type);
  switch (category) {
    case 'alerts':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'approvals':
      return <CheckCircle className="h-5 w-5 text-amber-500" />;
    case 'bookings':
      return <CalendarIcon className="h-5 w-5 text-blue-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export default function ActivityPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifData, isLoading: isLoadingNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const res = await api.get('/activity-logs');
      return res.data;
    },
    enabled: ['ADMIN', 'ASSET_MANAGER'].includes(user?.role || ''),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id === 'all') {
        return api.patch('/notifications/read-all');
      }
      return api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notifData?.data || [];
  const logs = logsData?.data || [];
  const unreadCount = notifData?.unreadCount || 0;

  const filteredNotifications = notifications.filter((n: any) => {
    if (activeTab === 'all') return true;
    return getNotificationCategory(n.type) === activeTab;
  });

  const canViewLogs = ['ADMIN', 'ASSET_MANAGER'].includes(user?.role || '');

  return (
    <div className="flex-1 space-y-6 max-w-5xl mx-auto pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Activity Logs & Notifications</h2>
        {unreadCount > 0 && activeTab !== 'logs' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => markAsReadMutation.mutate('all')}
            disabled={markAsReadMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary hover:bg-primary/30">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            Alerts
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            Approvals
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            Bookings
          </TabsTrigger>
          {canViewLogs && (
            <TabsTrigger value="logs" className="flex items-center gap-2 ml-auto border-l border-gray-300 dark:border-gray-700 pl-4">
              <Activity className="h-4 w-4" />
              Activity Logs
            </TabsTrigger>
          )}
        </TabsList>

        {['all', 'alerts', 'approvals', 'bookings'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4 m-0">
            <Card className="border-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <CardContent className="p-0">
                {isLoadingNotifs ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <Activity className="h-8 w-8 mb-4 animate-spin text-primary" />
                    Loading notifications...
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                    <Bell className="h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No notifications found</p>
                    <p className="text-sm">You're all caught up in this category.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredNotifications.map((notification: any) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 flex items-start gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                            onClick={() => deleteMutation.mutate(notification.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {canViewLogs && (
          <TabsContent value="logs" className="space-y-4 m-0">
            <Card className="border-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <CardHeader className="bg-muted/50 border-b border-gray-100 dark:border-gray-800 pb-4">
                <CardTitle className="text-lg">System Audit Log</CardTitle>
                <CardDescription>Comprehensive timeline of all critical actions performed across the ERP.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLogs ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <Activity className="h-8 w-8 mb-4 animate-spin text-primary" />
                    Loading activity logs...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>No activity logs found.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.map((log: any) => (
                      <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.action} <span className="text-gray-500 font-normal">on {log.entityType}</span>
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.actor?.name || 'Unknown User'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
