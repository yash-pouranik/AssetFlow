"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Loader2, 
  Plus, 
  Check, 
  X, 
  Wrench, 
  User as UserIcon, 
  FileImage,
  ClipboardCheck,
  Play
} from "lucide-react";

// Types
type MaintenancePriority = "HIGH" | "MEDIUM" | "LOW";
type MaintenanceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "TECHNICIAN_ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED";

type AssetCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";

interface User {
  id: string;
  name: string;
  email: string;
}

interface MaintenanceRequest {
  id: string;
  asset: {
    id: string;
    tag: string;
    name: string;
  };
  issue: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  raisedBy: {
    id: string;
    name: string;
  };
  technician?: {
    id: string;
    name: string;
  } | null;
  photo?: string | null;
  photoUrl?: string | null;
  resolution?: string | null;
  createdAt: string;
}

interface Asset {
  id: string;
  tag: string;
  name: string;
  status: string;
}

// Helpers
function getPriorityBadgeClass(priority: MaintenancePriority) {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200";
    case "LOW":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusBadgeClass(status: MaintenanceStatus) {
  switch (status) {
    case "PENDING":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200";
    case "APPROVED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200";
    case "TECHNICIAN_ASSIGNED":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200";
    case "IN_PROGRESS":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200";
    case "RESOLVED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "ASSET_MANAGER";

  // Modal Open States
  const [open, setOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  // Form Fields for Schedule Request
  const [assetId, setAssetId] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("MEDIUM");
  const [issue, setIssue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mockPhotoUrl, setMockPhotoUrl] = useState("");

  // Target Request for Action Modals
  const [activeRequestId, setActiveRequestId] = useState("");
  
  // Transition Form Fields
  const [notes, setNotes] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");
  const [resolution, setResolution] = useState("");
  const [condition, setCondition] = useState<AssetCondition>("GOOD");

  // Queries - Robust data parsing
  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await api.get("/maintenance");
      return res.data;
    },
  });

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get("/assets");
      return res.data;
    },
  });

  // Query Employees (technicians)
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return res.data;
    },
    enabled: isManagerOrAdmin,
  });

  const requests: MaintenanceRequest[] = Array.isArray(maintenanceData?.items) 
    ? maintenanceData.items 
    : Array.isArray(maintenanceData?.data)
    ? maintenanceData.data
    : Array.isArray(maintenanceData)
    ? maintenanceData
    : [];

  const assets: Asset[] = Array.isArray(assetsData?.items)
    ? assetsData.items
    : Array.isArray(assetsData?.data)
    ? assetsData.data
    : Array.isArray(assetsData)
    ? assetsData
    : [];

  const employees: User[] = Array.isArray(employeesData?.data)
    ? employeesData.data
    : Array.isArray(employeesData)
    ? employeesData
    : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await api.post("/maintenance", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance request raised successfully");
      setOpen(false);
      setAssetId("");
      setIssue("");
      setPriority("MEDIUM");
      setSelectedFile(null);
      setMockPhotoUrl("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to raise request");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved, notes, technicianId }: { id: string; approved: boolean; notes?: string; technicianId?: string }) => {
      return await api.patch(`/maintenance/${id}/approve`, { approved, notes, technicianId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success(variables.approved ? "Request approved successfully" : "Request rejected");
      setApproveOpen(false);
      setNotes("");
      setSelectedTechId("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Approve action failed");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, technicianId }: { id: string; technicianId: string }) => {
      return await api.patch(`/maintenance/${id}/assign-technician`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Technician assigned successfully");
      setAssignOpen(false);
      setSelectedTechId("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Assignment failed");
    },
  });

  const startWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.patch(`/maintenance/${id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Work marked as IN PROGRESS");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to start work");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution, condition }: { id: string; resolution: string; condition?: AssetCondition }) => {
      return await api.patch(`/maintenance/${id}/resolve`, { resolution, condition });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance resolved successfully, asset status restored to Available.");
      setResolveOpen(false);
      setResolution("");
      setCondition("GOOD");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to resolve request");
    },
  });

  const handleRaiseRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !issue || issue.trim().length < 10) {
      toast.error("Please provide an asset and an issue description (min 10 characters).");
      return;
    }

    const formData = new FormData();
    formData.append("assetId", assetId);
    formData.append("priority", priority);
    formData.append("issue", issue);

    if (selectedFile) {
      formData.append("photo", selectedFile);
    } else if (mockPhotoUrl) {
      // Build a dummy file metadata to pass the mock photo URL
      const blob = new Blob(["mock"], { type: "image/jpeg" });
      const file = new File([blob], "mock_photo.jpg", { type: "image/jpeg" });
      formData.append("photo", file);
    }

    createMutation.mutate(formData);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    approveMutation.mutate({
      id: activeRequestId,
      approved: true,
      notes: notes || undefined,
      technicianId: selectedTechId || undefined,
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) {
      toast.error("Please select a technician");
      return;
    }
    assignMutation.mutate({
      id: activeRequestId,
      technicianId: selectedTechId,
    });
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution || resolution.trim().length < 10) {
      toast.error("Resolution notes must be at least 10 characters");
      return;
    }
    resolveMutation.mutate({
      id: activeRequestId,
      resolution,
      condition,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-8 h-8 text-indigo-600" />
            Maintenance Tasks
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track workflow transitions from Pending to Under Maintenance to Available.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white" />}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Maintenance
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleRaiseRequest}>
              <DialogHeader>
                <DialogTitle>Raise Maintenance Request</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-1">
                  <Label htmlFor="asset">Asset</Label>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger id="asset" disabled={assetsLoading}>
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.tag} - {asset.name} ({asset.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as MaintenancePriority)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Mockup photo URL field */}
                <div className="grid gap-1.5 border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                  <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <FileImage className="w-3.5 h-3.5" />
                    Photo Attachment (Mockup)
                  </Label>
                  <Input
                    id="mockPhotoUrl"
                    placeholder="Paste dummy photo URL (mock)"
                    value={mockPhotoUrl}
                    onChange={(e) => setMockPhotoUrl(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-950"
                  />
                  <div className="text-[10px] text-center text-slate-400 font-medium my-1">OR UPLOAD FILE</div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="text-xs bg-white dark:bg-slate-950 cursor-pointer"
                  />
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="issue">Issue Description</Label>
                  <Textarea
                    id="issue"
                    placeholder="Describe the issue in detail (min 10 characters)"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead>Asset Tag & Name</TableHead>
              <TableHead>Issue Description</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Technician</TableHead>
              <TableHead>Raised By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-400 mt-2 block">Loading maintenance logs...</span>
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500 italic">
                  No maintenance requests registered in the system.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => {
                const isAssignedTech = req.technician?.id === user?.id;
                const canWork = isAssignedTech || isManagerOrAdmin;

                return (
                  <TableRow key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors">
                    <TableCell className="font-semibold text-slate-900 dark:text-white">
                      <div>
                        <span className="block">{req.asset?.tag || "N/A"}</span>
                        <span className="text-xs text-slate-400 font-normal">{req.asset?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-slate-700 dark:text-slate-300" title={req.issue}>
                      <div className="flex items-center gap-2">
                        {req.issue}
                        {(req.photo || req.photoUrl) && (
                          <Badge variant="outline" className="text-[9px] px-1 bg-indigo-50 border-indigo-100 text-indigo-700 shrink-0">
                            Photo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityBadgeClass(req.priority)}>
                        {req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {req.technician ? (
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          {req.technician.name}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{req.raisedBy?.name || "Unknown"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Manager/Admin: Approve or Reject PENDING requests */}
                        {req.status === "PENDING" && isManagerOrAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50 text-xs px-2.5"
                              onClick={() => {
                                setActiveRequestId(req.id);
                                setApproveOpen(true);
                              }}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Process
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs px-2.5"
                              onClick={() => {
                                if (confirm("Reject this maintenance request?")) {
                                  approveMutation.mutate({ id: req.id, approved: false });
                                }
                              }}
                              disabled={approveMutation.isPending}
                            >
                              <X className="mr-1 h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}

                        {/* Manager/Admin: Assign technician to APPROVED requests */}
                        {req.status === "APPROVED" && isManagerOrAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs px-2.5"
                            onClick={() => {
                              setActiveRequestId(req.id);
                              setAssignOpen(true);
                            }}
                          >
                            <UserIcon className="mr-1 h-3.5 w-3.5" /> Assign Tech
                          </Button>
                        )}

                        {/* Technician / Manager: Start Work on TECHNICIAN_ASSIGNED requests */}
                        {req.status === "TECHNICIAN_ASSIGNED" && canWork && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 border-purple-200 hover:bg-purple-50 text-xs px-2.5"
                            onClick={() => {
                              if (confirm("Mark this maintenance work as started?")) {
                                startWorkMutation.mutate(req.id);
                              }
                            }}
                            disabled={startWorkMutation.isPending}
                          >
                            <Play className="mr-1 h-3.5 w-3.5 fill-purple-600" /> Start Work
                          </Button>
                        )}

                        {/* Technician / Manager: Resolve IN_PROGRESS requests */}
                        {req.status === "IN_PROGRESS" && canWork && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs px-2.5"
                            onClick={() => {
                              setActiveRequestId(req.id);
                              setResolveOpen(true);
                            }}
                          >
                            <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Resolve Request
                          </Button>
                        )}

                        {req.status === "RESOLVED" && (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-100 text-[10px]">
                            Completed
                          </Badge>
                        )}

                        {req.status === "REJECTED" && (
                          <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-100 text-[10px]">
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve Request Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleApproveSubmit}>
            <DialogHeader>
              <DialogTitle>Approve Maintenance Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1">
                <Label htmlFor="approveNotes">Approver Notes (Optional)</Label>
                <Textarea
                  id="approveNotes"
                  placeholder="Add approval context or special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="approveTech">Assign Technician (Optional)</Label>
                <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                  <SelectTrigger id="approveTech">
                    <SelectValue placeholder="Select technician to assign immediately" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setApproveOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={approveMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Technician Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAssignSubmit}>
            <DialogHeader>
              <DialogTitle>Assign Technician</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1">
                <Label htmlFor="assignTech">Select Technician</Label>
                <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                  <SelectTrigger id="assignTech">
                    <SelectValue placeholder="Select an active technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {assignMutation.isPending ? "Assigning..." : "Assign Tech"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resolve Request Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleResolveSubmit}>
            <DialogHeader>
              <DialogTitle>Resolve Maintenance Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1">
                <Label htmlFor="resolutionNotes">Resolution Description</Label>
                <Textarea
                  id="resolutionNotes"
                  placeholder="Explain actions taken to fix the asset (min 10 characters)"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="assetCondition">Updated Asset Condition</Label>
                <Select value={condition} onValueChange={(val: any) => setCondition(val)}>
                  <SelectTrigger id="assetCondition">
                    <SelectValue placeholder="Select asset condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="FAIR">Fair</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResolveOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resolveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {resolveMutation.isPending ? "Resolving..." : "Complete & Resolve"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
