'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Layers, Users, Plus, Edit, Trash2, UserCog } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function OrganizationPage() {
  const queryClient = useQueryClient();

  // Queries with safe response unwrapping
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : []);
    },
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : []);
    },
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : []);
    },
  });

  // Department Dialog State
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    parentId: '',
    headId: '',
  });

  // Category Dialog State
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
  });
  const [extraFields, setExtraFields] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);

  // Employee Dialog State
  const [isEmpDialogOpen, setIsEmpDialogOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [empForm, setEmpForm] = useState({
    role: 'EMPLOYEE' as 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  // Department Mutation
  const departmentMutation = useMutation({
    mutationFn: async (data: typeof deptForm) => {
      const payload = {
        name: data.name,
        status: data.status,
        parentId: data.parentId || null,
        headId: data.headId || null,
      };
      if (editingDept) {
        return api.put(`/departments/${editingDept.id}`, payload);
      } else {
        return api.post('/departments', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingDept ? 'Department updated successfully' : 'Department created successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptDialogOpen(false);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred';
      toast.error(`Error: ${errMsg}`);
    },
  });

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    departmentMutation.mutate(deptForm);
  };

  // Category Mutation
  const categoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; extraFields?: Record<string, unknown> }) => {
      return api.post('/categories', data);
    },
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCatDialogOpen(false);
      setCatForm({ name: '', description: '' });
      setExtraFields([{ key: '', value: '' }]);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred';
      toast.error(`Error: ${errMsg}`);
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const fieldsObj: Record<string, string> = {};
    extraFields.forEach((f) => {
      if (f.key.trim()) {
        fieldsObj[f.key.trim()] = f.value;
      }
    });

    categoryMutation.mutate({
      name: catForm.name,
      description: catForm.description || undefined,
      extraFields: Object.keys(fieldsObj).length > 0 ? fieldsObj : undefined,
    });
  };

  // Employee Mutations
  const employeeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/auth/users/${userId}/promote`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const employeeStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      return api.patch(`/employees/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleSaveEmployee = async () => {
    if (!selectedEmp) return;

    try {
      const promises = [];
      let roleChanged = false;
      let statusChanged = false;

      if (empForm.role !== selectedEmp.role) {
        promises.push(employeeRoleMutation.mutateAsync({ userId: selectedEmp.id, role: empForm.role }));
        roleChanged = true;
      }

      if (empForm.status !== selectedEmp.status) {
        promises.push(employeeStatusMutation.mutateAsync({ userId: selectedEmp.id, status: empForm.status }));
        statusChanged = true;
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        let msg = 'Employee settings updated successfully';
        if (roleChanged && statusChanged) msg = 'Employee role and status updated';
        else if (roleChanged) msg = 'Employee role updated';
        else if (statusChanged) msg = 'Employee status updated';

        toast.success(msg);
      } else {
        toast.info('No changes made');
      }

      setIsEmpDialogOpen(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred';
      toast.error(`Error updating employee: ${errMsg}`);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Organization</h2>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Employees
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  Manage organization departments, hierarchy, and heads.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingDept(null);
                  setDeptForm({ name: '', status: 'ACTIVE', parentId: '', headId: '' });
                  setIsDeptDialogOpen(true);
                }}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Department
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead>Parent Department</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDepartments ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                          No departments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      departments.map((dept: any) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>{dept.head?.name || 'N/A'}</TableCell>
                          <TableCell>{dept.parent?.name || '-'}</TableCell>
                          <TableCell>{dept._count?.employees || 0}</TableCell>
                          <TableCell>
                            <Badge variant={dept.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {dept.status || 'ACTIVE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDept(dept);
                                setDeptForm({
                                  name: dept.name || '',
                                  status: dept.status || 'ACTIVE',
                                  parentId: dept.parentId || '',
                                  headId: dept.headId || '',
                                });
                                setIsDeptDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Asset classification categories.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setCatForm({ name: '', description: '' });
                  setExtraFields([{ key: '', value: '' }]);
                  setIsCatDialogOpen(true);
                }}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Category
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Custom Fields</TableHead>
                      <TableHead>Assets Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCategories ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                          No categories found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((cat: any) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell>{cat.description || '-'}</TableCell>
                          <TableCell>
                            {cat.extraFields && Object.keys(cat.extraFields).length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[300px]">
                                {Object.entries(cat.extraFields).map(([key, val]) => (
                                  <Badge key={key} variant="outline" className="text-xs bg-muted/50 font-normal">
                                    {key}: {String(val)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </TableCell>
                          <TableCell>{cat._count?.assets || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                List of all employees in the organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingEmployees ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                          No employees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp: any) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize font-semibold text-xs py-0.5">
                              {emp.role?.replace('_', ' ')?.toLowerCase() || 'employee'}
                            </Badge>
                          </TableCell>
                          <TableCell>{emp.department?.name || 'Unassigned'}</TableCell>
                          <TableCell>
                            <Badge variant={emp.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {emp.status || 'ACTIVE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmp(emp);
                                setEmpForm({
                                  role: emp.role || 'EMPLOYEE',
                                  status: emp.status || 'ACTIVE',
                                });
                                setIsEmpDialogOpen(true);
                              }}
                              className="h-8 flex items-center gap-1.5 ml-auto"
                            >
                              <UserCog className="w-3.5 h-3.5" /> Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleDeptSubmit}>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
              <DialogDescription>
                Fill in the details below to {editingDept ? 'update' : 'create'} the department.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Engineering"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dept-status">Status</Label>
                <Select
                  value={deptForm.status}
                  onValueChange={(val: 'ACTIVE' | 'INACTIVE') => setDeptForm({ ...deptForm, status: val })}
                >
                  <SelectTrigger id="dept-status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dept-parent">Parent Department</Label>
                <Select
                  value={deptForm.parentId || 'none'}
                  onValueChange={(val) => setDeptForm({ ...deptForm, parentId: val === 'none' ? '' : val })}
                >
                  <SelectTrigger id="dept-parent">
                    <SelectValue placeholder="None (Top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level)</SelectItem>
                    {departments
                      .filter((d: any) => !editingDept || d.id !== editingDept.id)
                      .map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dept-head">Department Head</Label>
                <Select
                  value={deptForm.headId || 'none'}
                  onValueChange={(val) => setDeptForm({ ...deptForm, headId: val === 'none' ? '' : val })}
                >
                  <SelectTrigger id="dept-head">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeptDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={departmentMutation.isPending}>
                {departmentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateCategory}>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Add a new category for classifying assets. You can define custom extra fields.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Laptops, Vehicles"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Optional description of this category"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Custom Extra Fields</Label>
                <p className="text-xs text-muted-foreground">
                  Define metadata fields that assets of this category should support (e.g. RAM, Storage, Warranty).
                </p>
                <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2">
                  {extraFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Field Key (e.g. RAM)"
                        value={field.key}
                        onChange={(e) => {
                          const updated = [...extraFields];
                          updated[idx].key = e.target.value;
                          setExtraFields(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Default Value"
                        value={field.value}
                        onChange={(e) => {
                          const updated = [...extraFields];
                          updated[idx].value = e.target.value;
                          setExtraFields(updated);
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = extraFields.filter((_, i) => i !== idx);
                          setExtraFields(updated.length > 0 ? updated : [{ key: '', value: '' }]);
                        }}
                        className="text-destructive hover:bg-destructive/10 h-9 w-9"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtraFields([...extraFields, { key: '', value: '' }])}
                  className="mt-1"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Custom Field
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCatDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={categoryMutation.isPending}>
                {categoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={isEmpDialogOpen} onOpenChange={setIsEmpDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Manage Employee</DialogTitle>
            <DialogDescription>
              Update role and status for {selectedEmp?.name || 'employee'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={selectedEmp?.name || ''} disabled className="bg-muted" />
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={selectedEmp?.email || ''} disabled className="bg-muted" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp-role">Role</Label>
              <Select
                value={empForm.role}
                onValueChange={(val: any) => setEmpForm({ ...empForm, role: val })}
              >
                <SelectTrigger id="emp-role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
                  <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp-status">Status</Label>
              <Select
                value={empForm.status}
                onValueChange={(val: any) => setEmpForm({ ...empForm, status: val })}
              >
                <SelectTrigger id="emp-status">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive (Deactivated)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmpDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmployee}
              disabled={employeeRoleMutation.isPending || employeeStatusMutation.isPending}
            >
              {employeeRoleMutation.isPending || employeeStatusMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
