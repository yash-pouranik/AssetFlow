"use client";

import * as React from "react";
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
import { toast } from "sonner";
import { Loader2, Plus, Check, X } from "lucide-react";

// Types
type MaintenancePriority = "HIGH" | "MEDIUM" | "LOW";
type MaintenanceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "TECHNICIAN_ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED";

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

  const [open, setOpen] = React.useState(false);
  const [assetId, setAssetId] = React.useState("");
  const [priority, setPriority] = React.useState<MaintenancePriority>("MEDIUM");
  const [issue, setIssue] = React.useState("");

  // Queries
  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await api.get("/maintenance");
      return res.data as { success: boolean; items: MaintenanceRequest[] };
    },
  });

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get("/assets");
      return res.data as { success: boolean; items: Asset[] };
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: { assetId: string; priority: string; issue: string }) => {
      return await api.post("/maintenance", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance request raised successfully");
      setOpen(false);
      setAssetId("");
      setIssue("");
      setPriority("MEDIUM");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to raise request");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      return await api.patch(`/maintenance/${id}/approve`, { approved });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success(variables.approved ? "Request approved" : "Request rejected");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Action failed");
    },
  });

  const handleRaiseRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !issue || issue.trim().length < 10) {
      toast.error("Please provide an asset and an issue description (min 10 characters).");
      return;
    }
    createMutation.mutate({ assetId, priority, issue });
  };

  const requests = maintenanceData?.items || [];
  const assets = assetsData?.items || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Maintenance Requests</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Raise Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleRaiseRequest}>
                <DialogHeader>
                  <DialogTitle>Raise Maintenance Request</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="asset">Asset</Label>
                    <Select value={assetId} onValueChange={setAssetId}>
                      <SelectTrigger id="asset" disabled={assetsLoading}>
                        <SelectValue placeholder="Select an asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.tag} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
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
                  <div className="grid gap-2">
                    <Label htmlFor="issue">Issue Description</Label>
                    <Textarea
                      id="issue"
                      placeholder="Describe the issue (min 10 characters)"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      rows={4}
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
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Submit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Tag</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised By</TableHead>
              {isManagerOrAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isManagerOrAdmin ? 6 : 5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isManagerOrAdmin ? 6 : 5} className="h-24 text-center">
                  No maintenance requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.asset?.tag || "N/A"}</TableCell>
                  <TableCell className="max-w-md truncate" title={req.issue}>
                    {req.issue}
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
                  <TableCell>{req.raisedBy?.name || "Unknown"}</TableCell>
                  {isManagerOrAdmin && (
                    <TableCell className="text-right">
                      {req.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() =>
                              approveMutation.mutate({ id: req.id, approved: true })
                            }
                            disabled={approveMutation.isPending}
                          >
                            <Check className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() =>
                              approveMutation.mutate({ id: req.id, approved: false })
                            }
                            disabled={approveMutation.isPending}
                          >
                            <X className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
