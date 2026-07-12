"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  BarChart3,
  TrendingUp,
  Building2,
  CalendarDays,
  Wrench,
  AlertTriangle,
  Loader2,
  ShieldOff,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuthStore } from "@/store/auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Roles that can access reports ───────────────────────────────────────────
const ALLOWED_ROLES = ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

// DEPARTMENT_HEAD sees fewer tabs than ADMIN/ASSET_MANAGER
const MANAGER_TABS = ["utilization", "maintenance", "departments", "heatmap", "upcoming", "overdue"] as const;
const DEPT_HEAD_TABS = ["upcoming", "overdue"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ChartLoading() {
  return (
    <div className="h-full flex items-center justify-center text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Loading…
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
      {message}
    </div>
  );
}

function conditionColor(condition: string) {
  const map: Record<string, string> = {
    EXCELLENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
    GOOD: "bg-green-50 text-green-700 border-green-200",
    FAIR: "bg-amber-50 text-amber-700 border-amber-200",
    POOR: "bg-orange-50 text-orange-700 border-orange-200",
    DAMAGED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return map[condition] ?? "bg-slate-50 text-slate-700";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "EMPLOYEE";

  // Access guard
  if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <ShieldOff className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
          Access Denied
        </h2>
        <p className="text-slate-500 max-w-sm">
          You do not have permission to view reports. Please contact your
          administrator.
        </p>
      </div>
    );
  }

  const isManagerOrAdmin = role === "ADMIN" || role === "ASSET_MANAGER";
  const isDeptHead = role === "DEPARTMENT_HEAD";

  const defaultTab = isManagerOrAdmin ? "utilization" : "upcoming";

  // ─── Queries (only enabled for allowed roles) ─────────────────────────────
  const { data: utilizationData, isLoading: isUtilLoading, error: utilError } = useQuery({
    queryKey: ["reports", "utilization"],
    enabled: isManagerOrAdmin,
    queryFn: async () => {
      const res = await api.get("/reports/asset-utilization");
      const d = res.data?.data;
      return {
        mostUsed: Array.isArray(d?.mostUsed) ? d.mostUsed : [],
        moderate: Array.isArray(d?.moderate) ? d.moderate : [],
        idle: Array.isArray(d?.idle) ? d.idle : [],
      };
    },
  });

  const { data: maintenanceData, isLoading: isMaintLoading } = useQuery({
    queryKey: ["reports", "maintenance-frequency"],
    enabled: isManagerOrAdmin,
    queryFn: async () => {
      const res = await api.get("/reports/maintenance-frequency");
      const d = res.data?.data;
      return {
        byAsset: Array.isArray(d?.byAsset) ? d.byAsset : [],
        byCategory: Array.isArray(d?.byCategory) ? d.byCategory : [],
      };
    },
  });

  const { data: departmentData, isLoading: isDeptLoading } = useQuery({
    queryKey: ["reports", "department-summary"],
    enabled: isManagerOrAdmin,
    queryFn: async () => {
      const res = await api.get("/reports/department-summary");
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const { data: heatmapData, isLoading: isHeatmapLoading } = useQuery({
    queryKey: ["reports", "booking-heatmap"],
    enabled: isManagerOrAdmin,
    queryFn: async () => {
      const res = await api.get("/reports/booking-heatmap");
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const { data: upcomingData, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ["reports", "upcoming-maintenance"],
    enabled: isManagerOrAdmin || isDeptHead,
    queryFn: async () => {
      const res = await api.get("/reports/upcoming-maintenance");
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
  });

  const { data: overdueData, isLoading: isOverdueLoading } = useQuery({
    queryKey: ["reports", "overdue-returns"],
    enabled: isManagerOrAdmin || isDeptHead,
    queryFn: async () => {
      const res = await api.get("/reports/overdue-returns");
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
  });

  // ─── Heatmap transform ────────────────────────────────────────────────────
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedHeatmap = daysOfWeek.map((day, dIdx) => {
    const dayRows = (heatmapData ?? []).filter((h: any) => h.dayOfWeek === dIdx);
    const totalCount = dayRows.reduce((acc: number, r: any) => acc + (r.count ?? 0), 0);
    return { name: day, Bookings: totalCount };
  });

  // ─── CSV Export ───────────────────────────────────────────────────────────
  const handleExport = async (endpoint: string, filename: string) => {
    try {
      const res = await api.get(endpoint, {
        params: { export: "csv" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${filename} exported successfully`);
    } catch {
      toast.error("Failed to export CSV report");
    }
  };

  // ─── Utilisation chart data ───────────────────────────────────────────────
  const utilChartData = [
    { name: "High (>5)", count: utilizationData?.mostUsed?.length ?? 0 },
    { name: "Moderate (1-5)", count: utilizationData?.moderate?.length ?? 0 },
    { name: "Idle (0)", count: utilizationData?.idle?.length ?? 0 },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col space-y-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports &amp; Analytics</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {isManagerOrAdmin
            ? "Real-time compliance metrics and exportable CSV datasets."
            : "Maintenance and overdue compliance reports for your department."}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
          {isManagerOrAdmin && (
            <>
              <TabsTrigger value="utilization" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Utilization
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">
                <Wrench className="h-4 w-4" /> Maintenance
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2">
                <Building2 className="h-4 w-4" /> Departments
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <CalendarDays className="h-4 w-4" /> Heatmap
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="upcoming" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Upcoming Service
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Overdue Returns
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Asset Utilization ─────────────────────────────────────── */}
        {isManagerOrAdmin && (
          <TabsContent value="utilization" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Asset Utilization Report</h3>
              <Button
                onClick={() =>
                  handleExport("/reports/asset-utilization", "asset-utilization.csv")
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Count by Usage Tier</CardTitle>
                  <CardDescription>
                    High-use vs moderate vs idle assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {isUtilLoading ? (
                    <ChartLoading />
                  ) : utilChartData.every((d) => d.count === 0) ? (
                    <ChartEmpty message="No allocation data available yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={utilChartData} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Assets" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Utilised Assets</CardTitle>
                  <CardDescription>Most frequently allocated assets</CardDescription>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Allocs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isUtilLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : (utilizationData?.mostUsed ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                            No highly utilised assets found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (utilizationData?.mostUsed ?? []).slice(0, 8).map((row: any) => (
                          <TableRow key={row.assetId}>
                            <TableCell className="font-mono font-bold text-xs">{row.assetTag}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={conditionColor(row.condition)}>
                                {row.condition}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">{row.allocationCount}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ── 2. Maintenance Frequency ─────────────────────────────────── */}
        {isManagerOrAdmin && (
          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Maintenance Frequency Report</h3>
              <Button
                onClick={() =>
                  handleExport("/reports/maintenance-frequency", "maintenance-frequency.csv")
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Chart by category */}
              <Card>
                <CardHeader>
                  <CardTitle>Requests by Category</CardTitle>
                  <CardDescription>Repair volume per asset category</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {isMaintLoading ? (
                    <ChartLoading />
                  ) : (maintenanceData?.byCategory ?? []).length === 0 ? (
                    <ChartEmpty message="No maintenance requests logged yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceData?.byCategory ?? []} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="totalRequests" name="Total Requests" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Table by asset */}
              <Card>
                <CardHeader>
                  <CardTitle>Breakdown per Asset</CardTitle>
                  <CardDescription>Assets with the most repeated maintenance</CardDescription>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isMaintLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : (maintenanceData?.byAsset ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                            No maintenance logs registered.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (maintenanceData?.byAsset ?? []).slice(0, 8).map((row: any) => (
                          <TableRow key={row.assetId}>
                            <TableCell className="font-mono font-bold text-xs">{row.assetTag}</TableCell>
                            <TableCell>{row.assetName}</TableCell>
                            <TableCell>{row.category}</TableCell>
                            <TableCell className="text-right font-bold text-rose-600">{row.totalRequests}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ── 3. Department Summary ─────────────────────────────────────── */}
        {isManagerOrAdmin && (
          <TabsContent value="departments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Department Allocation Summary</h3>
              <Button
                onClick={() =>
                  handleExport("/reports/department-summary", "department-summary.csv")
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Allocations by Department</CardTitle>
                <CardDescription>
                  Total ever allocated vs active now vs overdue per department
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                {isDeptLoading ? (
                  <ChartLoading />
                ) : (departmentData ?? []).length === 0 ? (
                  <ChartEmpty message="No department allocation data available." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData ?? []} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalAllocated" name="Total Ever" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="activeAllocations" name="Active Now" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="overdueCount" name="Overdue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── 4. Booking Heatmap ───────────────────────────────────────── */}
        {isManagerOrAdmin && (
          <TabsContent value="heatmap" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Resource Booking Volume by Day</h3>
              <Button
                onClick={() =>
                  handleExport("/reports/booking-heatmap", "booking-heatmap.csv")
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Weekly Booking Aggregates</CardTitle>
                  <CardDescription>Bookings grouped by day of week</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {isHeatmapLoading ? (
                    <ChartLoading />
                  ) : formattedHeatmap.every((d) => d.Bookings === 0) ? (
                    <ChartEmpty message="No booking data available yet." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formattedHeatmap} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="Bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Peak Booking Hours</CardTitle>
                  <CardDescription>Top hours by booking count</CardDescription>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hour</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isHeatmapLoading ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : (heatmapData ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-slate-400">
                            No bookings logged.
                          </TableCell>
                        </TableRow>
                      ) : (
                        [...(heatmapData ?? [])]
                          .sort((a: any, b: any) => b.count - a.count)
                          .slice(0, 7)
                          .map((row: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-semibold">
                                {String(row.hour).padStart(2, "0")}:00 –{" "}
                                {String(row.hour + 1).padStart(2, "0")}:00
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-600">
                                {row.count}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ── 5. Upcoming / At-Risk Maintenance ───────────────────────── */}
        <TabsContent value="upcoming" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">At-Risk / Overdue Maintenance</h3>
            {isManagerOrAdmin && (
              <Button
                onClick={() =>
                  handleExport("/reports/upcoming-maintenance", "upcoming-maintenance.csv")
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assets Overdue for Preventive Maintenance</CardTitle>
              <CardDescription>
                Fair/Poor/Damaged assets with no service in the past 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Last Serviced</TableHead>
                    <TableHead className="text-right">Days Since Service</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isUpcomingLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (upcomingData ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                        ✅ All assets are compliant — no at-risk assets pending maintenance.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (upcomingData ?? []).map((row: any) => (
                      <TableRow key={row.assetId}>
                        <TableCell className="font-mono font-bold text-xs">{row.assetTag}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={conditionColor(row.condition)}>
                            {row.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.lastMaintenance
                            ? new Date(row.lastMaintenance).toLocaleDateString("en-IN")
                            : <span className="text-rose-500 font-semibold">Never</span>}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600">
                          {row.daysSinceLastMaintenance !== null && row.daysSinceLastMaintenance !== undefined
                            ? `${row.daysSinceLastMaintenance} days`
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 6. Overdue Returns ───────────────────────────────────────── */}
        <TabsContent value="overdue" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Overdue Allocations Compliance</h3>
            {isManagerOrAdmin && (
              <Button
                onClick={() =>
                  handleExport("/reports/overdue-returns", "overdue-returns.csv")
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Returns Compliance Registry</CardTitle>
              <CardDescription>
                Assets that have exceeded their expected return date
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Holder</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isOverdueLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (overdueData ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                        ✅ Perfect compliance! No assets are overdue for return.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (overdueData ?? []).map((row: any) => (
                      <TableRow key={row.allocationId}>
                        <TableCell className="font-mono font-bold text-xs">{row.assetTag}</TableCell>
                        <TableCell>{row.assetName}</TableCell>
                        <TableCell className="font-semibold text-indigo-600">{row.userName}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{row.userEmail}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>
                          {row.expectedReturn
                            ? new Date(row.expectedReturn).toLocaleDateString("en-IN")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600">
                          {row.daysOverdue !== null && row.daysOverdue !== undefined
                            ? `${row.daysOverdue} days`
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
