'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Allocation {
  id: string;
  asset?: { tag: string; name: string };
  user?: { name: string };
  department?: { name: string };
  expectedReturnDate: string | null;
  status: string;
}

interface Transfer {
  id: string;
  asset?: { tag: string };
  requestedBy?: { name: string };
  targetUser?: { name: string };
  targetDepartment?: { name: string };
  status: string;
}

export default function AllocationsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data: allocations, isLoading: isLoadingAllocations } = useQuery<Allocation[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const { data } = await api.get('/allocations');
      return data.data || data;
    },
  });

  const { data: transfers, isLoading: isLoadingTransfers } = useQuery<Transfer[]>({
    queryKey: ['transfers'],
    queryFn: async () => {
      const { data } = await api.get('/transfers');
      return data.data || data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/transfers/${id}/approve`);
    },
    onSuccess: () => {
      toast.success('Transfer approved successfully');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => {
      toast.error('Failed to approve transfer');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/transfers/${id}/reject`);
    },
    onSuccess: () => {
      toast.success('Transfer rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => {
      toast.error('Failed to reject transfer');
    },
  });

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER' || user?.role === 'MANAGER';

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200">Active</Badge>;
      case 'REQUESTED':
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200">Requested</Badge>;
      case 'REJECTED':
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200">Rejected</Badge>;
      case 'RETURNED':
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Allocations & Transfers</h2>
      </div>

      <Tabs defaultValue="allocations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocations</CardTitle>
              <CardDescription>
                View all active and past asset allocations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAllocations ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Allocated To</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations && allocations.length > 0 ? (
                      allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell className="font-medium">{allocation.asset?.tag || '-'}</TableCell>
                          <TableCell>{allocation.asset?.name || '-'}</TableCell>
                          <TableCell>
                            {allocation.user?.name || allocation.department?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {allocation.expectedReturnDate
                              ? format(new Date(allocation.expectedReturnDate), 'PPP')
                              : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(allocation.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No allocations found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Transfers</CardTitle>
              <CardDescription>
                Manage transfer requests between users and departments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      {isManagerOrAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers && transfers.length > 0 ? (
                      transfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-medium">{transfer.asset?.tag || '-'}</TableCell>
                          <TableCell>{transfer.requestedBy?.name || '-'}</TableCell>
                          <TableCell>
                            {transfer.targetUser?.name || transfer.targetDepartment?.name || '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          {isManagerOrAdmin && (
                            <TableCell className="text-right">
                              {transfer.status.toUpperCase() === 'REQUESTED' && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                    onClick={() => approveMutation.mutate(transfer.id)}
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                  >
                                    <Check className="mr-1 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    onClick={() => rejectMutation.mutate(transfer.id)}
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                  >
                                    <X className="mr-1 h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isManagerOrAdmin ? 5 : 4} className="h-24 text-center text-muted-foreground">
                          No transfer requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
