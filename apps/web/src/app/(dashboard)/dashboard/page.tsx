'use client';

import { useQuery } from '@tanstack/react-query';
import { Package, Users, Wrench, ShieldCheck, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetchKPIs = async () => {
  const { data } = await api.get('/dashboard/kpis');
  return data.data;
};

const fetchAssetStats = async () => {
  const { data } = await api.get('/assets/stats');
  // Transform Record<string, number> into array of { status, _count } for Recharts
  return Object.entries(data.data || {}).map(([status, count]) => ({
    status,
    _count: count,
  }));
};

const fetchAssetUtilization = async () => {
  const { data } = await api.get('/reports/asset-utilization');
  return data.data;
};

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: fetchKPIs,
  });

  const { data: assetStats, isLoading: statsLoading } = useQuery({
    queryKey: ['asset-stats'],
    queryFn: fetchAssetStats,
  });

  const { data: utilization, isLoading: utilLoading } = useQuery({
    queryKey: ['asset-utilization'],
    queryFn: fetchAssetUtilization,
  });

  const isLoading = kpisLoading || statsLoading || utilLoading;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your enterprise assets
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Assets
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.totalAssets ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered in system
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Allocations
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.activeAllocations ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Currently assigned
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Maintenance
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.pendingMaintenance ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Audits
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.activeAudits ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Ongoing compliance checks
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Asset Status Overview</CardTitle>
                <CardDescription>Current status distribution of all assets</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetStats || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="_count"
                        nameKey="status"
                      >
                        {(assetStats || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.status]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend 
                        formatter={(value, entry: any) => entry.payload.status}
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Asset Utilization</CardTitle>
                <CardDescription>
                  Most used and idle assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      Most Used
                    </h4>
                    <div className="space-y-3">
                      {(utilization?.mostUsed || []).slice(0, 3).map((asset: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{asset.name || asset.model || 'Unknown Asset'}</span>
                            <span className="text-xs text-muted-foreground">{asset.assetTag || 'No Tag'}</span>
                          </div>
                          <Badge variant="secondary">Highly utilized</Badge>
                        </div>
                      ))}
                      {(!utilization?.mostUsed || utilization.mostUsed.length === 0) && (
                        <p className="text-sm text-muted-foreground">No highly utilized assets found.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Idle Assets
                    </h4>
                    <div className="space-y-3">
                      {(utilization?.idle || []).slice(0, 3).map((asset: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{asset.name || asset.model || 'Unknown Asset'}</span>
                            <span className="text-xs text-muted-foreground">{asset.assetTag || 'No Tag'}</span>
                          </div>
                          <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20">Idle</Badge>
                        </div>
                      ))}
                      {(!utilization?.idle || utilization.idle.length === 0) && (
                        <p className="text-sm text-muted-foreground">No idle assets found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
