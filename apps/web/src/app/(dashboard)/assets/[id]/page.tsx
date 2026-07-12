"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  User, 
  Building, 
  Loader2,
  MapPin
} from "lucide-react";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Allocation = {
  id: string;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
  allocatedAt: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  conditionNote: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
};

type Maintenance = {
  id: string;
  issue: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "APPROVED" | "REJECTED" | "TECHNICIAN_ASSIGNED" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
};

type AssetDetail = {
  id: string;
  tag: string;
  name: string;
  serialNumber: string | null;
  status: "AVAILABLE" | "ALLOCATED" | "UNDER_MAINTENANCE" | "RETIRED" | "LOST" | "STOLEN" | "DISPOSED";
  condition: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  isBookable: boolean;
  photo: string | null;
  location: string | null;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  notes: string | null;
  category: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  } | null;
  allocations: Allocation[];
  maintenances: Maintenance[];
};

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAssetDetail = async () => {
      try {
        const response = await api.get(`/assets/${id}`);
        if (response.data.success) {
          setAsset(response.data.data);
        } else {
          setError("Failed to load asset details.");
        }
      } catch (err: any) {
        console.error("Error fetching asset details:", err);
        setError(
          err.response?.data?.error?.message || "An unexpected error occurred while loading asset details."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
        <Link href="/assets">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assets
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Asset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "Asset not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: AssetDetail['status']) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Available</Badge>;
      case 'ALLOCATED': return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">Allocated</Badge>;
      case 'UNDER_MAINTENANCE': return <Badge variant="outline" className="bg-yellow-500 text-white hover:bg-yellow-600 border-none">Maintenance</Badge>;
      case 'RETIRED': return <Badge variant="outline">Retired</Badge>;
      case 'LOST': return <Badge variant="destructive">Lost</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: AssetDetail['condition']) => {
    switch (condition) {
      case 'EXCELLENT': return <Badge variant="outline" className="border-green-500 text-green-600">Excellent</Badge>;
      case 'GOOD': return <Badge variant="outline" className="border-blue-500 text-blue-600">Good</Badge>;
      case 'FAIR': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Fair</Badge>;
      case 'POOR': return <Badge variant="outline" className="border-orange-500 text-orange-600">Poor</Badge>;
      case 'DAMAGED': return <Badge variant="outline" className="border-red-500 text-red-600">Damaged</Badge>;
      default: return <Badge variant="outline">{condition}</Badge>;
    }
  };

  const getMaintenancePriorityBadge = (priority: Maintenance['priority']) => {
    switch (priority) {
      case 'CRITICAL': return <Badge className="bg-red-600 text-white">Critical</Badge>;
      case 'HIGH': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'MEDIUM': return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'LOW': return <Badge className="bg-blue-500 text-white">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getMaintenanceStatusBadge = (status: Maintenance['status']) => {
    switch (status) {
      case 'RESOLVED': return <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'TECHNICIAN_ASSIGNED': return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Assigned</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center space-x-2">
        <Link href="/assets">
          <Button variant="ghost" size="icon" className="hover:bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">{asset.name}</h2>
            <Badge variant="outline" className="text-sm font-semibold">{asset.tag}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Category: {asset.category?.name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(asset.status)}
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Condition</span>
                {getConditionBadge(asset.condition)}
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Serial Number</span>
                <span className="text-sm font-medium">{asset.serialNumber || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium flex items-center gap-1 justify-end max-w-[60%] truncate">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{asset.location || "Not assigned"}</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Bookable</span>
                <Badge variant="outline">{asset.isBookable ? "Yes" : "No"}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Department</span>
                <span className="text-sm font-medium flex items-center gap-1 justify-end max-w-[60%] truncate text-right">
                  <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{asset.department?.name || "Global / Shared"}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Additional Details Card */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Administrative Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <div className="mt-1.5 p-3 border rounded-lg bg-muted/30 min-h-[100px]">
                <p className="text-sm text-foreground whitespace-pre-line">
                  {asset.notes || "No administrative notes provided for this asset."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Activity History</CardTitle>
          <CardDescription>Review allocations and maintenance logs for this asset.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="allocations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="allocations">Allocation History</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
            </TabsList>

            <TabsContent value="allocations" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Allocated To</TableHead>
                      <TableHead>Allocation Date</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Returned At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asset.allocations && asset.allocations.length > 0 ? (
                      asset.allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell className="font-medium">
                            {allocation.user ? (
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  {allocation.user.name}
                                </span>
                                <span className="text-xs text-muted-foreground">{allocation.user.email}</span>
                              </div>
                            ) : allocation.department ? (
                              <span className="flex items-center gap-1 font-semibold text-foreground">
                                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                                {allocation.department.name}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(allocation.allocatedAt), 'PPp')}
                          </TableCell>
                          <TableCell>
                            {allocation.expectedReturn ? format(new Date(allocation.expectedReturn), 'PP') : "-"}
                          </TableCell>
                          <TableCell>
                            {allocation.returnedAt ? format(new Date(allocation.returnedAt), 'PPp') : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={allocation.status === 'ACTIVE' ? 'default' : allocation.status === 'OVERDUE' ? 'destructive' : 'outline'}
                            >
                              {allocation.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {allocation.conditionNote || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No allocation history recorded for this asset.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue / Request</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported At</TableHead>
                      <TableHead>Resolved At</TableHead>
                      <TableHead>Resolution Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asset.maintenances && asset.maintenances.length > 0 ? (
                      asset.maintenances.map((maintenance) => (
                        <TableRow key={maintenance.id}>
                          <TableCell className="font-medium max-w-[250px] truncate">
                            {maintenance.issue}
                          </TableCell>
                          <TableCell>
                            {getMainMaintenancePriorityBadge(maintenance.priority)}
                          </TableCell>
                          <TableCell>
                            {getMaintenanceStatusBadge(maintenance.status)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(maintenance.createdAt), 'PPp')}
                          </TableCell>
                          <TableCell>
                            {maintenance.resolvedAt ? format(new Date(maintenance.resolvedAt), 'PPp') : "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {maintenance.resolution || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No maintenance requests found for this asset.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
