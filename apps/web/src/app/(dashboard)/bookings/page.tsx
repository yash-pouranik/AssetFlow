'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  CalendarDays, 
  Box, 
  User as UserIcon, 
  Clock, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isSameDay, startOfDay } from 'date-fns';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Asset {
  id: string;
  name: string;
  tag: string;
  isBookable: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  assetId: string;
  asset?: Asset;
  userId: string;
  user?: User;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  purpose?: string;
  notes?: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ONGOING':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'UPCOMING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch (error) {
    return dateStr;
  }
};

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [conflictError, setConflictError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    assetId: '',
    startTime: '',
    endTime: '',
    purpose: '',
    notes: '',
  });

  const [rescheduleData, setRescheduleData] = useState({
    id: '',
    startTime: '',
    endTime: '',
  });

  // Fetch Bookings & Fix table array parsing
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings');
      return Array.isArray(res.data) 
        ? res.data 
        : (res.data?.items || res.data?.data || []);
    },
  });

  // Fetch Assets for the dropdown
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.get('/assets');
      const list = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.items || res.data?.data || []);
      // Filter for bookable assets
      return list.filter((a: Asset) => a.isBookable);
    },
  });

  // Fetch Calendar feed for selected asset
  const { data: calendarFeed, isLoading: isLoadingCalendar } = useQuery({
    queryKey: ['bookings', 'calendar', selectedAssetId],
    queryFn: async () => {
      if (!selectedAssetId) return null;
      const res = await api.get(`/bookings/calendar/${selectedAssetId}`);
      return res.data?.data || { asset: null, bookings: [] };
    },
    enabled: !!selectedAssetId,
  });

  // Create Booking Mutation
  const createBooking = useMutation({
    mutationFn: async (newBooking: { assetId: string; startTime: string; endTime: string; purpose?: string; notes?: string }) => {
      setConflictError(null);
      const res = await api.post('/bookings', newBooking);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Booking created successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar', selectedAssetId] });
      }
      setIsDialogOpen(false);
      setFormData({ assetId: '', startTime: '', endTime: '', purpose: '', notes: '' });
      setConflictError(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to create booking';
      setConflictError(msg);
      toast.error(msg);
    },
  });

  // Reschedule Booking Mutation
  const rescheduleBooking = useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) => {
      setConflictError(null);
      const res = await api.put(`/bookings/${id}`, { startTime, endTime });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Booking rescheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar', selectedAssetId] });
      }
      setIsRescheduleOpen(false);
      setConflictError(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to reschedule booking';
      setConflictError(msg);
      toast.error(msg);
    },
  });

  // Cancel Booking Mutation
  const cancelBooking = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/bookings/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (selectedAssetId) {
        queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar', selectedAssetId] });
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetId || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      toast.error('End time must be after start time');
      return;
    }

    createBooking.mutate({
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
    });
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleData.startTime || !rescheduleData.endTime) {
      toast.error('Please specify both start and end times');
      return;
    }
    if (new Date(rescheduleData.startTime) >= new Date(rescheduleData.endTime)) {
      toast.error('End time must be after start time');
      return;
    }
    rescheduleBooking.mutate({
      id: rescheduleData.id,
      startTime: new Date(rescheduleData.startTime).toISOString(),
      endTime: new Date(rescheduleData.endTime).toISOString(),
    });
  };

  const bookings: Booking[] = bookingsData || [];
  const assets: Asset[] = assetsData || [];

  // Set default asset if not set
  React.useEffect(() => {
    if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  // Calculate Next 7 Days starting from today
  const getNext7Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(startOfDay(d));
    }
    return list;
  };
  const weekDays = getNext7Days();

  const calendarBookings: Booking[] = calendarFeed?.bookings || [];

  // Filter bookings for the daily timeline
  const bookingsForSelectedDay = calendarBookings.filter((b) => 
    isSameDay(new Date(b.startTime), selectedDay)
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-indigo-600" />
            Resource Bookings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Reserve resources, resolve overlap conflicts, and manage upcoming reservations.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setConflictError(null);
        }}>
          <DialogTrigger render={<Button className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white" />}>
            <Plus className="mr-2 h-4 w-4" />
            Book Resource
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Book a Resource</DialogTitle>
              <DialogDescription>
                Submit date and time to reserve the asset.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {conflictError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-md flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-950">Overlap Conflict:</span> {conflictError}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="asset">Asset / Resource</Label>
                <Select
                  value={formData.assetId}
                  onValueChange={(value) => setFormData({ ...formData, assetId: value || '' })}
                  disabled={isLoadingAssets}
                >
                  <SelectTrigger id="asset" className="w-full">
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        [{asset.tag}] {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Date & Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Date & Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  placeholder="e.g. Design review meeting"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Input
                  id="notes"
                  placeholder="e.g. External monitor setup required"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setConflictError(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBooking.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {createBooking.isPending ? 'Validating Slot...' : 'Confirm Reservation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduler Dashboard / Calendar Timeline Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Calendar Timeline Visualisation */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Timeline Schedule
                </CardTitle>
                <CardDescription>Select a resource below to view availability and bookings.</CardDescription>
              </div>
              <Select value={selectedAssetId} onValueChange={(val) => setSelectedAssetId(val || '')}>
                <SelectTrigger className="w-[220px] bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Select a resource" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1">
            {isLoadingCalendar ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p>Loading schedule feed...</p>
              </div>
            ) : !selectedAssetId ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Calendar className="h-12 w-12 text-slate-300 mb-2" />
                <p>Please select a resource to view timeline availability.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 7 Days Quick Grid View */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">7-Day Outlook</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const bookingsForDay = calendarBookings.filter((b) => isSameDay(new Date(b.startTime), day));
                      const isSelected = isSameDay(day, selectedDay);
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(day)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-sm ring-1 ring-indigo-500/20' 
                              : 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                            {format(day, 'EEE')}
                          </div>
                          <div className="text-lg font-bold mt-0.5">
                            {format(day, 'd')}
                          </div>
                          <div className="mt-2">
                            {bookingsForDay.length > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                                {bookingsForDay.length} booked
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Free</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day hourly timeline details */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Schedule for {format(selectedDay, 'MMMM d, yyyy')}
                    </h4>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-full">
                      {bookingsForSelectedDay.length} Active Bookings
                    </span>
                  </div>

                  {/* Hour-by-hour timeline track (8 AM - 8 PM) */}
                  <div className="space-y-2">
                    <div className="relative border border-slate-200 dark:border-slate-800 rounded-lg h-24 bg-white dark:bg-slate-950 overflow-hidden">
                      {/* Grid dividers */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                        {Array.from({ length: 11 }).map((_, idx) => (
                          <div key={idx} className="border-r border-slate-100 dark:border-slate-900 h-full" />
                        ))}
                      </div>

                      {/* Time headers */}
                      <div className="absolute bottom-1 inset-x-0 grid grid-cols-12 text-[9px] text-slate-400 px-1 pointer-events-none">
                        <span>8 AM</span>
                        <span>9 AM</span>
                        <span>10 AM</span>
                        <span>11 AM</span>
                        <span>12 PM</span>
                        <span>1 PM</span>
                        <span>2 PM</span>
                        <span>3 PM</span>
                        <span>4 PM</span>
                        <span>5 PM</span>
                        <span>6 PM</span>
                        <span>7 PM</span>
                      </div>

                      {/* Visual Blocks for Bookings */}
                      {bookingsForSelectedDay.map((booking) => {
                        const start = new Date(booking.startTime);
                        const end = new Date(booking.endTime);
                        
                        // Calculate percentage offset and width
                        const startHours = start.getHours() + start.getMinutes() / 60;
                        const endHours = end.getHours() + end.getMinutes() / 60;
                        
                        const startPct = Math.max(0, ((startHours - 8) / 12) * 100);
                        const endPct = Math.min(100, ((endHours - 8) / 12) * 100);
                        const widthPct = Math.max(2, endPct - startPct);

                        return (
                          <div
                            key={booking.id}
                            style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                            className="absolute top-2 bottom-6 bg-indigo-600/90 text-white hover:bg-indigo-700 rounded-md p-1.5 shadow-sm overflow-hidden flex flex-col justify-center transition-all cursor-pointer select-none group"
                            title={`${booking.purpose || 'Reserved'} (${format(start, 'HH:mm')} - ${format(end, 'HH:mm')})`}
                          >
                            <span className="text-[10px] font-bold truncate block">{booking.purpose || 'Reserved'}</span>
                            <span className="text-[8px] opacity-90 truncate block">{booking.user?.name}</span>
                          </div>
                        );
                      })}

                      {bookingsForSelectedDay.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">
                          No bookings scheduled for this resource today. Available 8:00 AM - 8:00 PM.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* List of bookings for the selected day */}
                  {bookingsForSelectedDay.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Timeline Details</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {bookingsForSelectedDay.map((b) => (
                          <div key={b.id} className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-start gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-950 dark:text-white truncate max-w-[180px]">
                                {b.purpose || 'Resource Booking'}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                {format(new Date(b.startTime), 'h:mm a')} - {format(new Date(b.endTime), 'h:mm a')}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                {b.user?.name || 'Unknown User'}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge className={`text-[10px] px-1.5 py-0 border-0 ${getStatusColor(b.status)}`}>
                                {b.status}
                              </Badge>
                              {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                                <div className="flex gap-1.5 mt-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    onClick={() => {
                                      setRescheduleData({
                                        id: b.id,
                                        startTime: format(new Date(b.startTime), "yyyy-MM-dd'T'HH:mm"),
                                        endTime: format(new Date(b.endTime), "yyyy-MM-dd'T'HH:mm"),
                                      });
                                      setIsRescheduleOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => {
                                      if (confirm('Cancel this reservation?')) {
                                        cancelBooking.mutate(b.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Key Details / Quick Stats */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Reservation Statistics
            </CardTitle>
            <CardDescription>Overall metrics for resource bookings.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-xs text-slate-500 block uppercase font-medium">Total Bookings</span>
                <span className="text-3xl font-extrabold text-indigo-950 dark:text-indigo-300 mt-1 block">
                  {bookings.length}
                </span>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-xs text-slate-500 block uppercase font-medium">Active Slots</span>
                <span className="text-3xl font-extrabold text-emerald-950 dark:text-emerald-300 mt-1 block">
                  {bookings.filter(b => b.status === 'UPCOMING' || b.status === 'ONGOING').length}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Useful System Rules</h4>
              <div className="space-y-3">
                <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p>Bookings are validated instantly. In case of overlap, the system will highlight the conflict and reject the booking.</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p>Admins, Asset Managers, and Booking Owners can cancel or reschedule bookings up to the time of reservation.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Reservations Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg">Recent Booking Logs</CardTitle>
          <CardDescription>A master registry of all reservations created in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingBookings ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p>Loading bookings log...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <CalendarDays className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No bookings found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                There are currently no asset reservations. Click "Book Resource" to create one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/50">
                    <TableHead className="w-[250px]">Asset / Resource</TableHead>
                    <TableHead>Booked By</TableHead>
                    <TableHead>Time Period</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
                            <Box className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[200px]">
                              {booking.asset?.name || 'Unknown Asset'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Tag: {booking.asset?.tag || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <UserIcon className="h-4 w-4 text-slate-400" />
                          {booking.user?.name || 'Unknown User'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {formatDate(booking.startTime)}
                          </span>
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            to {formatDate(booking.endTime)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={booking.purpose}>
                        {booking.purpose || <span className="text-slate-400 italic">No purpose declared</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-medium ${getStatusColor(booking.status)} border-0`}>
                          {booking.status || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              onClick={() => {
                                setRescheduleData({
                                  id: booking.id,
                                  startTime: format(new Date(booking.startTime), "yyyy-MM-dd'T'HH:mm"),
                                  endTime: format(new Date(booking.endTime), "yyyy-MM-dd'T'HH:mm"),
                                });
                                setIsRescheduleOpen(true);
                              }}
                            >
                              <Edit2 className="mr-1 h-3.5 w-3.5" />
                              Reschedule
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this reservation?')) {
                                  cancelBooking.mutate(booking.id);
                                }
                              }}
                              disabled={cancelBooking.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={(open) => {
        setIsRescheduleOpen(open);
        if (!open) setConflictError(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reschedule Reservation</DialogTitle>
            <DialogDescription>
              Select new start and end times for this booking.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-4">
            {conflictError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-md flex items-start gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-rose-950">Overlap Conflict:</span> {conflictError}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rescheduleStartTime">New Start Date & Time</Label>
              <Input
                id="rescheduleStartTime"
                type="datetime-local"
                value={rescheduleData.startTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescheduleEndTime">New End Date & Time</Label>
              <Input
                id="rescheduleEndTime"
                type="datetime-local"
                value={rescheduleData.endTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setIsRescheduleOpen(false);
                setConflictError(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={rescheduleBooking.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {rescheduleBooking.isPending ? 'Checking overlap...' : 'Apply Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

