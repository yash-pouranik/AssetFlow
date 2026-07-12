"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  UserCheck
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AuditItem {
  id: string;
  result: "PENDING" | "VERIFIED" | "MISSING" | "DAMAGED";
  notes: string | null;
  verifiedAt: string | null;
  asset: {
    id: string;
    tag: string;
    name: string;
    status: string;
    location: string | null;
  };
  auditor: {
    id: string;
    name: string;
    email: string;
  };
}

interface AuditDetail {
  id: string;
  title: string;
  scope: "DEPARTMENT" | "LOCATION";
  scopeValue: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  items: AuditItem[];
}

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const id = params?.id as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  
  // Form State
  const [result, setResult] = useState<"VERIFIED" | "MISSING" | "DAMAGED" | "PENDING">("VERIFIED");
  const [notes, setNotes] = useState("");

  const isSystemAdmin = user?.role === "ADMIN";
  const canManageAudits = user?.role === "ADMIN" || user?.role === "ASSET_MANAGER";

  // Fetch Audit details
  const { data: auditData, isLoading, error } = useQuery<{ success: boolean; data: AuditDetail }>({
    queryKey: ["audit", id],
    queryFn: async () => {
      const res = await api.get(`/audit-cycles/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const audit = auditData?.data;

  // Mark Audit Item Mutation
  const markItemMutation = useMutation({
    mutationFn: async (payload: { assetId: string; result: "VERIFIED" | "MISSING" | "DAMAGED"; notes?: string }) => {
      return await api.patch(`/audit-cycles/${id}/items`, payload);
    },
    onSuccess: () => {
      toast.success("Audit item verified successfully");
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setIsAuditDialogOpen(false);
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update audit item");
    },
  });

  // Close Cycle Mutation
  const closeCycleMutation = useMutation({
    mutationFn: async () => {
      return await api.patch(`/audit-cycles/${id}/close`);
    },
    onSuccess: () => {
      toast.success("Audit cycle closed successfully. Discrepancies processed.");
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to close audit cycle");
    },
  });

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (result === "PENDING") {
      toast.error("Please choose verified, missing or damaged status");
      return;
    }

    markItemMutation.mutate({
      assetId: selectedItem.asset.id,
      result,
      notes: notes.trim() || undefined,
    });
  };

  const handleCloseCycle = () => {
    if (confirm("Are you sure you want to CLOSE this audit cycle? This will lock all items, mark any pending items as Verified, and automatically update missing assets to 'LOST' and damaged assets to 'DAMAGED' status in the inventory.")) {
      closeCycleMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
        <p>Loading audit cycle details...</p>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-rose-500">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p>Failed to load audit cycle details. It may not exist or you lack permission.</p>
        <Link href="/audits" className="mt-4">
          <Button variant="outline">Back to Audits</Button>
        </Link>
      </div>
    );
  }

  // Filter items in scope
  const filteredItems = audit.items.filter((item) => {
    const term = searchQuery.toLowerCase();
    return (
      item.asset.name.toLowerCase().includes(term) ||
      item.asset.tag.toLowerCase().includes(term) ||
      (item.asset.location && item.asset.location.toLowerCase().includes(term)) ||
      item.auditor.name.toLowerCase().includes(term)
    );
  });

  const totalItems = audit.items.length;
  const verifiedCount = audit.items.filter(i => i.result === "VERIFIED").length;
  const missingCount = audit.items.filter(i => i.result === "MISSING").length;
  const damagedCount = audit.items.filter(i => i.result === "DAMAGED").length;
  const pendingCount = audit.items.filter(i => i.result === "PENDING").length;

  const getResultBadge = (result: AuditItem["result"]) => {
    switch (result) {
      case "VERIFIED":
        return <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-400">Verified</Badge>;
      case "MISSING":
        return <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400">Missing</Badge>;
      case "DAMAGED":
        return <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400">Damaged</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/50">Pending</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-8 max-w-7xl mx-auto w-full">
      {/* Header breadcrumb */}
      <div>
        <Link href="/audits" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Audits
        </Link>
      </div>

      {/* Main Title & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{audit.title}</h2>
            <Badge variant={audit.status === "OPEN" ? "default" : "secondary"} className={audit.status === "OPEN" ? "bg-amber-500 text-white" : ""}>
              {audit.status === "OPEN" ? "In Progress" : "Closed"}
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm flex items-center gap-2">
            <span>Scope:</span>
            <span className="font-semibold">{audit.scope}</span>
            <span>-</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{audit.scopeValue}</span>
          </p>
        </div>

        {isSystemAdmin && audit.status === "OPEN" && (
          <Button 
            onClick={handleCloseCycle} 
            disabled={closeCycleMutation.isPending}
            className="shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
          >
            {closeCycleMutation.isPending ? "Closing Cycle..." : "Close Audit Cycle"}
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs">Total Scope Assets</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs text-green-600 dark:text-green-400">Verified OK</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">{verifiedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs text-rose-600 dark:text-rose-400">Missing / Lost</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">{missingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs text-orange-600 dark:text-orange-400">Damaged / Broken</CardDescription>
            <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-400">{damagedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs text-slate-500">Remaining Pending</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-500">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Discrepancy Alert Banner */}
      {(missingCount > 0 || damagedCount > 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Compliance Alert:</span> There are currently <span className="font-bold">{missingCount} missing</span> and <span className="font-bold">{damagedCount} damaged</span> assets logged. Closing this audit cycle will automatically reflect these changes in the global inventory repository.
          </div>
        </div>
      )}

      {/* Audit Items Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Assets In Scope</CardTitle>
            <CardDescription>Review and verify assets allocated in this cycle.</CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by tag, name, auditor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No matching assets found in this audit scope.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:border-slate-800">
                  <TableHead className="w-[120px] font-semibold text-slate-700 dark:text-slate-300">Asset Tag</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Asset Name</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Location</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Assigned Auditor</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Result</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Verification Date</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white">{item.asset.tag}</TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      <div>
                        <span>{item.asset.name}</span>
                        {item.notes && (
                          <span className="block text-xs font-normal text-slate-500 mt-1 italic">
                            Notes: "{item.notes}"
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.asset.location || "N/A"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300 block">{item.auditor.name}</span>
                        <span className="text-xs text-slate-400 block">{item.auditor.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getResultBadge(item.result)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {item.verifiedAt ? format(new Date(item.verifiedAt), "MMM dd, yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {audit.status === "OPEN" ? (
                        <Dialog open={isAuditDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                          setIsAuditDialogOpen(open);
                          if (open) {
                            setSelectedItem(item);
                            setResult(item.result === "PENDING" ? "VERIFIED" : (item.result as any));
                            setNotes(item.notes || "");
                          }
                        }}>
                          {canManageAudits && (
                            <DialogTrigger render={
                              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                                Verify Asset
                              </Button>
                            } />
                          )}
                          <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleAuditSubmit} className="space-y-4">
                              <DialogHeader>
                                <DialogTitle>Verify Asset Tag</DialogTitle>
                                <DialogDescription>
                                  Verify physical condition and presence for asset: <span className="font-bold">{item.asset.tag} - {item.asset.name}</span>
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4 py-2">
                                <div className="space-y-1.5">
                                  <Label htmlFor="auditResult">Verification Result</Label>
                                  <Select value={result} onValueChange={(val: any) => setResult(val)}>
                                    <SelectTrigger id="auditResult">
                                      <SelectValue placeholder="Select verification result" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="VERIFIED">Verified & OK</SelectItem>
                                      <SelectItem value="MISSING">Missing / Lost</SelectItem>
                                      <SelectItem value="DAMAGED">Damaged / Needs repair</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="auditNotes">Notes / Observations</Label>
                                  <Textarea 
                                    id="auditNotes" 
                                    placeholder="Enter physical details, location mismatch notes, or serial key validations..." 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>
                              </div>

                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAuditDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={markItemMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                  {markItemMutation.isPending ? "Logging..." : "Confirm Verification"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Audit Locked</span>
                      )}
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
