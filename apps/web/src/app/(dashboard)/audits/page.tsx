'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
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

type AuditStatus = 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';

interface Audit {
  id: string | number;
  scope: string;
  startDate: string;
  endDate: string;
  status: AuditStatus;
}

export default function AuditsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: audits = [], isLoading, error } = useQuery<Audit[]>({
    queryKey: ['audits'],
    queryFn: async () => {
      const response = await api.get('/audit-cycles');
      return response.data?.data || response.data || [];
    },
  });

  const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case 'Planned':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">{status}</Badge>;
      case 'In Progress':
        return <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">{status}</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">{status}</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Audits</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your asset audit cycles and compliance checks.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="shadow-sm" />}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            New Audit
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Audit</DialogTitle>
              <DialogDescription>
                Define the scope and timeline for the new asset audit.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="scope" className="text-right text-sm font-medium">
                  Scope
                </Label>
                <Input id="scope" placeholder="e.g., IT Assets Q3" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start-date" className="text-right text-sm font-medium">
                  Start Date
                </Label>
                <Input id="start-date" type="date" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-date" className="text-right text-sm font-medium">
                  End Date
                </Label>
                <Input id="end-date" type="date" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right text-sm font-medium">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select defaultValue="Planned">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => setIsDialogOpen(false)}>Create Audit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            Audit History
          </CardTitle>
          <CardDescription className="text-slate-500">View all your current and past audit cycles.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p>Loading audits...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-rose-500">
              <p>Failed to load audits. Please try again.</p>
            </div>
          ) : audits.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                <ClipboardList className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No audits found</h3>
              <p className="text-slate-500 mt-2 max-w-sm mb-6">
                You haven't created any audit cycles yet. Start your first audit to ensure asset compliance.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="gap-2 shadow-sm bg-white hover:bg-slate-50">
                <Plus className="h-4 w-4" />
                Create First Audit
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-700 w-[100px]">ID</TableHead>
                  <TableHead className="font-semibold text-slate-700">Scope</TableHead>
                  <TableHead className="font-semibold text-slate-700">Start Date</TableHead>
                  <TableHead className="font-semibold text-slate-700">End Date</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow key={audit.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-500">
                      #{String(audit.id).padStart(4, '0')}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{audit.scope}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        {audit.startDate ? format(new Date(audit.startDate), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        {audit.endDate ? format(new Date(audit.endDate), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10">
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
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
