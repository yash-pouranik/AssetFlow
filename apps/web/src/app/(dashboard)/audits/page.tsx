'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ClipboardList, CalendarIcon, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type AuditStatus = 'OPEN' | 'CLOSED';

interface Audit {
  id: string;
  title: string;
  scope: 'DEPARTMENT' | 'LOCATION';
  scopeValue: string;
  startDate: string;
  endDate: string;
  status: AuditStatus;
  _count?: {
    items: number;
  };
  createdBy?: {
    name: string;
  };
}

export default function AuditsPage() {
  const { user } = useAuthStore();
  const canManageAudits = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<'DEPARTMENT' | 'LOCATION'>('DEPARTMENT');
  const [scopeValue, setScopeValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch audits with fixed response parsing
  const { data: auditsData, isLoading, error } = useQuery({
    queryKey: ['audits'],
    queryFn: async () => {
      const response = await api.get('/audit-cycles');
      return response.data;
    },
  });

  const audits: Audit[] = Array.isArray(auditsData?.data)
    ? auditsData.data
    : Array.isArray(auditsData)
    ? auditsData
    : [];

  // Create Audit Mutation
  const createAuditMutation = useMutation({
    mutationFn: async (newAudit: {
      title: string;
      scope: 'DEPARTMENT' | 'LOCATION';
      scopeValue: string;
      startDate: string;
      endDate: string;
    }) => {
      return await api.post('/audit-cycles', newAudit);
    },
    onSuccess: () => {
      toast.success('Audit cycle created successfully');
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      setIsDialogOpen(false);
      setTitle('');
      setScopeValue('');
      setStartDate('');
      setEndDate('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create audit cycle');
    },
  });

  const handleCreateAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scopeValue || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    createAuditMutation.mutate({
      title,
      scope,
      scopeValue,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
  };

  const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400">In Progress</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Audits & Verification</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Manage your asset audit cycles, auditor assignments, and discrepancy reports.
          </p>
        </div>

        {canManageAudits && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                New Audit Cycle
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleCreateAudit}>
              <DialogHeader>
                <DialogTitle>Create New Audit</DialogTitle>
                <DialogDescription>
                  Define the scope and timeline for the new asset audit.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="title">Audit Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Q3 IT Assets Audit" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="scope">Scope Type</Label>
                    <Select value={scope} onValueChange={(val: any) => setScope(val)}>
                      <SelectTrigger id="scope">
                        <SelectValue placeholder="Select scope type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEPARTMENT">Department</SelectItem>
                        <SelectItem value="LOCATION">Location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="scopeValue">Scope Value</Label>
                    <Input 
                      id="scopeValue" 
                      placeholder={scope === 'DEPARTMENT' ? 'Department Name' : 'Location Name'}
                      value={scopeValue}
                      onChange={(e) => setScopeValue(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input 
                      id="start-date" 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input 
                      id="end-date" 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAuditMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {createAuditMutation.isPending ? 'Creating...' : 'Create Audit'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <ClipboardList className="h-5 w-5 text-indigo-500" />
            Audit History
          </CardTitle>
          <CardDescription className="text-slate-500">View all your current and past audit cycles.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
              <p>Loading audits...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-rose-500">
              <p>Failed to load audits. Please try again.</p>
            </div>
          ) : audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-800">
                <ClipboardList className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No audits found</h3>
              <p className="text-slate-500 mt-2 max-w-sm mb-6">
                You haven't created any audit cycles yet. Start your first audit to ensure asset compliance.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="gap-2 shadow-sm bg-white hover:bg-slate-50 dark:bg-slate-950">
                <Plus className="h-4 w-4" />
                Create First Audit
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Audit Title</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Scope</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Start Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">End Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow key={audit.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-900 transition-colors">
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      <div>
                        <span className="font-bold block">{audit.title}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">ID: {audit.id.substring(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">{audit.scope}</span>
                        <span className="text-xs text-slate-400 block">{audit.scopeValue}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        {audit.startDate ? format(new Date(audit.startDate), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        {audit.endDate ? format(new Date(audit.endDate), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/audits/${audit.id}`} passHref legacyBehavior>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

