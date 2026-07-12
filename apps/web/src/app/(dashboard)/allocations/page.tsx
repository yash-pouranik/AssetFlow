'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, X, Loader2, Plus, ArrowLeftRight, RotateCcw } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Allocation {
  id: string;
  asset?: { id: string; tag: string; name: string };
  user?: { id: string; name: string };
  department?: { id: string; name: string };
  expectedReturn?: string | null;
  expectedReturnDate?: string | null;
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

  // Modal open states
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  // Form states for New Allocation
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [allocationTarget, setAllocationTarget] = useState<'user' | 'department'>('user');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');

  // Conflict block state
  const [conflictInfo, setConflictInfo] = useState<{
    holderName: string;
    activeAllocationId: string;
  } | null>(null);

  // Form states for Transfer Request
  const [transferAllocationId, setTransferAllocationId] = useState('');
  const [transferTarget, setTransferTarget] = useState<'user' | 'department'>('user');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Form states for Return Asset
  const [returnAllocationId, setReturnAllocationId] = useState('');
  const [returnCondition, setReturnCondition] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'>('GOOD');
  const [returnConditionNote, setReturnConditionNote] = useState('');

  // Fetch all allocations
  const { data: allocations, isLoading: isLoadingAllocations } = useQuery<Allocation[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const { data } = await api.get('/allocations');
      return data.data?.data || data.data || data || [];
    },
  });

  // Fetch all transfers
  const { data: transfers, isLoading: isLoadingTransfers } = useQuery<Transfer[]>({
    queryKey: ['transfers'],
    queryFn: async () => {
      const { data } = await api.get('/transfers');
      return data.data?.data || data.data || data || [];
    },
  });

  // Fetch helper lists for dropdowns
  const { data: assetsList } = useQuery({
    queryKey: ['assets-dropdown'],
    queryFn: async () => {
      const { data } = await api.get('/assets', { params: { limit: 100 } });
      return data.data?.data || data.data || [];
    },
  });

  const { data: employeesList } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data.data?.data || data.data || [];
    },
  });

  const { data: departmentsList } = useQuery({
    queryKey: ['departments-dropdown'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data.data?.data || data.data || [];
    },
  });

  const assets = Array.isArray(assetsList) ? assetsList : [];
  const employees = Array.isArray(employeesList) ? employeesList : [];
  const departments = Array.isArray(departmentsList) ? departmentsList : [];

  // Mutations
  const allocateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/allocations', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Asset allocated successfully');
      setIsAllocateOpen(false);
      setSelectedAssetId('');
      setSelectedUserId('');
      setSelectedDeptId('');
      setExpectedReturnDate('');
      setAllocationNotes('');
      setConflictInfo(null);
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['assets-dropdown'] });
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        const errorMsg = err.response?.data?.message || '';
        const holderMatch = errorMsg.match(/currently allocated to '([^']+)'/);
        const idMatch = errorMsg.match(/allocationId: '([^']+)'/);
        
        const holderName = holderMatch ? holderMatch[1] : 'another user/department';
        const activeAllocationId = idMatch ? idMatch[1] : '';

        setConflictInfo({
          holderName,
          activeAllocationId,
        });
        toast.error(`Conflict: Asset is currently held by ${holderName}`);
      } else {
        toast.error(err.response?.data?.message || 'Failed to allocate asset');
      }
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/transfers', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Transfer request submitted successfully');
      setIsTransferOpen(false);
      setTransferAllocationId('');
      setTransferUserId('');
      setTransferDeptId('');
      setTransferNotes('');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to request transfer');
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/allocations/${id}/return`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Asset returned successfully');
      setIsReturnOpen(false);
      setReturnAllocationId('');
      setReturnConditionNote('');
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['assets-dropdown'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to return asset');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/transfers/${id}/approve`, { approved: true });
    },
    onSuccess: () => {
      toast.success('Transfer approved successfully');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
    onError: () => {
      toast.error('Failed to approve transfer');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/transfers/${id}/approve`, { approved: false });
    },
    onSuccess: () => {
      toast.success('Transfer rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => {
      toast.error('Failed to reject transfer');
    },
  });

  const handleOpenTransferFromConflict = () => {
    if (!conflictInfo) return;
    setTransferAllocationId(conflictInfo.activeAllocationId);
    setConflictInfo(null);
    setIsAllocateOpen(false);
    setIsTransferOpen(true);
  };

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
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Allocations & Transfers</h2>
        {isManagerOrAdmin && (
          <Button onClick={() => setIsAllocateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Allocate Asset
          </Button>
        )}
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
                      {isManagerOrAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations && allocations.length > 0 ? (
                      allocations.map((allocation) => {
                        const targetDate = allocation.expectedReturn || allocation.expectedReturnDate;
                        return (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">{allocation.asset?.tag || '-'}</TableCell>
                            <TableCell>{allocation.asset?.name || '-'}</TableCell>
                            <TableCell>
                              {allocation.user?.name || allocation.department?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {targetDate
                                ? format(new Date(targetDate), 'PPP')
                                : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(allocation.status)}</TableCell>
                            {isManagerOrAdmin && (
                              <TableCell className="text-right">
                                {(allocation.status.toUpperCase() === 'ACTIVE' || allocation.status.toUpperCase() === 'OVERDUE') && (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                                      onClick={() => {
                                        setTransferAllocationId(allocation.id);
                                        setIsTransferOpen(true);
                                      }}
                                    >
                                      <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                                      Transfer
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => {
                                        setReturnAllocationId(allocation.id);
                                        setIsReturnOpen(true);
                                      }}
                                    >
                                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                      Return
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isManagerOrAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
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

      {/* Allocate Asset Dialog */}
      <Dialog open={isAllocateOpen} onOpenChange={(open) => {
        setIsAllocateOpen(open);
        if (!open) {
          setConflictInfo(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate Asset</DialogTitle>
            <DialogDescription>
              Assign an asset to a user or department.
            </DialogDescription>
          </DialogHeader>

          {conflictInfo ? (
            <div className="space-y-4 py-4">
              <div className="bg-destructive/15 text-destructive p-4 rounded-lg text-sm space-y-2 border border-destructive/20">
                <p className="font-semibold">Conflict Detected</p>
                <p>Asset is currently held by <strong>{conflictInfo.holderName}</strong>.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConflictInfo(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenTransferFromConflict}
                  className="bg-primary hover:bg-primary/95 text-white"
                >
                  Request Transfer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Asset <span className="text-destructive">*</span></label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                >
                  <option value="">Select an asset</option>
                  {assets.map((asset: any) => (
                    <option key={asset.id} value={asset.id}>
                      [{asset.tag}] {asset.name} ({asset.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                    <input
                      type="radio"
                      name="allocationTarget"
                      checked={allocationTarget === 'user'}
                      onChange={() => setAllocationTarget('user')}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    Individual User
                  </label>
                  <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                    <input
                      type="radio"
                      name="allocationTarget"
                      checked={allocationTarget === 'department'}
                      onChange={() => setAllocationTarget('department')}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                    />
                    Department
                  </label>
                </div>
              </div>

              {allocationTarget === 'user' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">User <span className="text-destructive">*</span></label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">Select a user</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department <span className="text-destructive">*</span></label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Return Date</label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Additional context about this allocation..."
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsAllocateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedAssetId) {
                      toast.error('Please select an asset');
                      return;
                    }
                    if (allocationTarget === 'user' && !selectedUserId) {
                      toast.error('Please select a user');
                      return;
                    }
                    if (allocationTarget === 'department' && !selectedDeptId) {
                      toast.error('Please select a department');
                      return;
                    }

                    allocateMutation.mutate({
                      assetId: selectedAssetId,
                      userId: allocationTarget === 'user' ? selectedUserId : undefined,
                      departmentId: allocationTarget === 'department' ? selectedDeptId : undefined,
                      expectedReturn: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
                      notes: allocationNotes || undefined,
                    });
                  }}
                  disabled={allocateMutation.isPending}
                >
                  {allocateMutation.isPending ? 'Allocating...' : 'Allocate Asset'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Asset Transfer</DialogTitle>
            <DialogDescription>
              Submit a request to transfer this asset from its current allocation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Assignee Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                  <input
                    type="radio"
                    name="transferTarget"
                    checked={transferTarget === 'user'}
                    onChange={() => setTransferTarget('user')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  Individual User
                </label>
                <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                  <input
                    type="radio"
                    name="transferTarget"
                    checked={transferTarget === 'department'}
                    onChange={() => setTransferTarget('department')}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  Department
                </label>
              </div>
            </div>

            {transferTarget === 'user' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Target User <span className="text-destructive">*</span></label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={transferUserId}
                  onChange={(e) => setTransferUserId(e.target.value)}
                >
                  <option value="">Select target user</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Department <span className="text-destructive">*</span></label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={transferDeptId}
                  onChange={(e) => setTransferDeptId(e.target.value)}
                >
                  <option value="">Select target department</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason & Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Reason for transfer request..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsTransferOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (transferTarget === 'user' && !transferUserId) {
                    toast.error('Please select a target user');
                    return;
                  }
                  if (transferTarget === 'department' && !transferDeptId) {
                    toast.error('Please select a target department');
                    return;
                  }

                  transferMutation.mutate({
                    allocationId: transferAllocationId,
                    targetUserId: transferTarget === 'user' ? transferUserId : undefined,
                    targetDeptId: transferTarget === 'department' ? transferDeptId : undefined,
                    notes: transferNotes || undefined,
                  });
                }}
                disabled={transferMutation.isPending}
              >
                {transferMutation.isPending ? 'Requesting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Asset Dialog */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>
              Mark the asset as returned and record its condition.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Condition <span className="text-destructive">*</span></label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={returnCondition}
                onChange={(e: any) => setReturnCondition(e.target.value)}
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged (Routes to Maintenance)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Return Notes / Condition Details</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe current state, e.g. normal wear and tear, missing charger, etc."
                value={returnConditionNote}
                onChange={(e) => setReturnConditionNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsReturnOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  returnMutation.mutate({
                    id: returnAllocationId,
                    payload: {
                      condition: returnCondition,
                      conditionNote: returnConditionNote || undefined,
                    },
                  });
                }}
                disabled={returnMutation.isPending}
              >
                {returnMutation.isPending ? 'Returning...' : 'Check-in Asset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
