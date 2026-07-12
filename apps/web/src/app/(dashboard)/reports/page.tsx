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
  FileText
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
  Legend
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("utilization");

  // CSV Export Helper
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
    } catch (err) {
      toast.error("Failed to export CSV report");
    }
  };

  // Queries
  const { data: utilizationData, isLoading: isUtilLoading } = useQuery({
    queryKey: ["reports", "utilization"],
    queryFn: async () => {
      const res = await api.get("/reports/asset-utilization");
      return res.data?.data || { mostUsed: [], moderate: [], idle: [] };
    },
  });

  const { data: maintenanceData, isLoading: isMaintLoading } = useQuery({
    queryKey: ["reports", "maintenance-frequency"],
    queryFn: async () => {
      const res = await api.get("/reports/maintenance-frequency");
      return res.data?.data || { byAsset: [], byCategory: [] };
    },
  });

  const { data: departmentData, isLoading: isDeptLoading } = useQuery({
    queryKey: ["reports", "department-summary"],
    queryFn: async () => {
      const res = await api.get("/reports/department-summary");
      return res.data?.data || [];
    },
  });

  const { data: heatmapData, isLoading: isHeatmapLoading } = useQuery({
    queryKey: ["reports", "booking-heatmap"],
    queryFn: async () => {
      const res = await api.get("/reports/booking-heatmap");
      return res.data?.data || [];
    },
  });

  const { data: upcomingData, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ["reports", "upcoming-maintenance"],
    queryFn: async () => {
      const res = await api.get("/reports/upcoming-maintenance");
      return res.data?.data || [];
    },
  });

  const { data: overdueData, isLoading: isOverdueLoading } = useQuery({
    queryKey: ["reports", "overdue-returns"],
    queryFn: async () => {
      const res = await api.get("/reports/overdue-returns");
      return res.data?.data || [];
    },
  });

  // Heatmap rendering helpers (Hour vs Day of week)
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Format heatmap data for simple chart rendering
  const formattedHeatmap = daysOfWeek.map((day, dIdx) => {
    const dayRows = (heatmapData || []).filter((h: any) => h.dayOfWeek === dIdx);
    const totalCount = dayRows.reduce((acc: number, r: any) => acc + r.count, 0);
    return { name: day, bookings: totalCount };
  });

  return (
    <div className="flex flex-col space-y-6 p-8 max-w-7xl mx-auto w-full">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reports & Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Export raw CSV datasets and view real-time compliance metrics.
          </p>
        </div>
      </div>

      <Tabs defaultValue="utilization" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
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
            <CalendarDays className="h-4 w-4" /> Bookings Heatmap
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Upcoming Service
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Overdue Returns
          </TabsTrigger>
        </TabsList>

        {/* 1. Asset Utilization Tab */}
        <TabsContent value="utilization" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Asset Utilization Report</h3>
            <Button onClick={() => handleExport("/reports/asset-utilization", "asset-utilization.csv")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Count by Usage Category</CardTitle>
                <CardDescription>Visualizing highly allocated vs moderate vs idle assets</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isUtilLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Highly Utilised (>5)", count: utilizationData?.mostUsed?.length || 0 },
                      { name: "Moderate (1-5)", count: utilizationData?.moderate?.length || 0 },
                      { name: "Idle (0)", count: utilizationData?.idle?.length || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Utilised Assets</CardTitle>
                <CardDescription>Most frequently allocated assets in the inventory</CardDescription>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead className="text-right">Allocations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isUtilLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                    ) : (utilizationData?.mostUsed || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center">No highly utilized assets</TableCell></TableRow>
                    ) : (
                      utilizationData.mostUsed.slice(0, 5).map((row: any) => (
                        <TableRow key={row.assetId}>
                          <TableCell className="font-bold">{row.assetTag}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell><Badge variant="outline">{row.condition}</Badge></TableCell>
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

        {/* 2. Maintenance Frequency Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Maintenance Frequency Report</h3>
            <Button onClick={() => handleExport("/reports/maintenance-frequency", "maintenance-frequency.csv")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Category</CardTitle>
                <CardDescription>Asset categories experiencing the highest repair volumes</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isMaintLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maintenanceData?.byCategory || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalRequests" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Breakdown Frequency per Asset</CardTitle>
                <CardDescription>Assets experiencing repeat maintenance orders</CardDescription>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isMaintLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                    ) : (maintenanceData?.byAsset || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center">No maintenance logs registered</TableCell></TableRow>
                    ) : (
                      maintenanceData.byAsset.slice(0, 5).map((row: any) => (
                        <TableRow key={row.assetId}>
                          <TableCell className="font-bold">{row.assetTag}</TableCell>
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

        {/* 3. Department Summary Tab */}
        <TabsContent value="departments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Department Allocation Summary</h3>
            <Button onClick={() => handleExport("/reports/department-summary", "department-summary.csv")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Allocations Distribution</CardTitle>
              <CardDescription>Comparing total ever allocated vs current active vs overdue allocations per department</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {isDeptLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="departmentName" />
                    <YAxis />
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

        {/* 4. Bookings Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Resource Booking Volume by Day</h3>
            <Button onClick={() => handleExport("/reports/booking-heatmap", "booking-heatmap.csv")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Weekly Booking Aggregates</CardTitle>
                <CardDescription>Number of reservations grouped by day of the week</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isHeatmapLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedHeatmap}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Booking Hours</CardTitle>
                <CardDescription>Heatmap slot trends by hour of day</CardDescription>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hour</TableHead>
                      <TableHead className="text-right">Bookings Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isHeatmapLoading ? (
                      <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                    ) : (heatmapData || []).length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center">No bookings logged</TableCell></TableRow>
                    ) : (
                      [...(heatmapData || [])]
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 7)
                        .map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold">{row.hour}:00 - {row.hour + 1}:00</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{row.count}</TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Upcoming Maintenance Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">At-Risk / Overdue Maintenance</h3>
            <Button onClick={() => handleExport("/reports/upcoming-maintenance", "upcoming-maintenance.csv")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assets Overdue for Preventive Maintenance</CardTitle>
              <CardDescription>Assets currently marked as Fair/Poor/Damaged with no service log in the past 6 months</CardDescription>
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
                    <TableHead className="text-right">Days Since Last Service</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isUpcomingLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                  ) : (upcomingData || []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center p-6 text-slate-500">All assets are compliant. No at-risk assets pending maintenance.</TableCell></TableRow>
                  ) : (
                    upcomingData.map((row: any) => (
                      <TableRow key={row.assetId}>
                        <TableCell className="font-bold">{row.assetTag}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200">
                            {row.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.lastMaintenance ? new Date(row.lastMaintenance).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell className="text-right font-bold text-rose-600">
                          {row.daysSinceLastMaintenance !== null ? `${row.daysSinceLastMaintenance} days` : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Overdue Returns Tab */}
        <TabsContent value="overdue" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Overdue Allocations Compliance</h3>
            <Button onClick={() => handleExport("/reports/overdue-returns", "overdue-returns.csv")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Returns Compliance Registry</CardTitle>
              <CardDescription>Live log of assets that have exceeded their expected return date</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Holder</TableHead>
                    <TableHead>Holder Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isOverdueLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
                  ) : (overdueData || []).length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center p-6 text-slate-500">Perfect compliance! No assets are overdue for return.</TableCell></TableRow>
                  ) : (
                    overdueData.map((row: any) => (
                      <TableRow key={row.allocationId}>
                        <TableCell className="font-bold">{row.assetTag}</TableCell>
                        <TableCell>{row.assetName}</TableCell>
                        <TableCell className="font-semibold text-indigo-600">{row.userName}</TableCell>
                        <TableCell>{row.userEmail}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.expectedReturn ? new Date(row.expectedReturn).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell className="text-right font-bold text-rose-600">
                          {row.daysOverdue !== null ? `${row.daysOverdue} days` : "N/A"}
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
