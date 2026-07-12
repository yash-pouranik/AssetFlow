'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const { data: utilization, isLoading } = useQuery({
    queryKey: ['reports', 'utilization'],
    queryFn: async () => {
      const res = await api.get('/reports/utilization');
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive data on asset utilization and performance.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Utilization by Category</CardTitle>
            <CardDescription>Number of active allocations per category</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Electronics', count: 42 },
                  { name: 'Furniture', count: 18 },
                  { name: 'Vehicles', count: 5 },
                  { name: 'Licenses', count: 12 },
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
            <CardTitle>Maintenance Frequency</CardTitle>
            <CardDescription>Maintenance requests raised over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
             {/* Mock chart data for hackathon demo */}
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Jan', requests: 4 },
                  { name: 'Feb', requests: 7 },
                  { name: 'Mar', requests: 2 },
                  { name: 'Apr', requests: 10 },
                  { name: 'May', requests: 5 },
                  { name: 'Jun', requests: 3 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
