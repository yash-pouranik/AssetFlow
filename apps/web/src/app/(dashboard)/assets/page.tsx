"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Asset = {
  id: string;
  name: string;
  tag: string;
  serialNumber: string | null;
  location: string | null;
  condition: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  status: "AVAILABLE" | "ALLOCATED" | "UNDER_MAINTENANCE" | "RETIRED" | "LOST" | "STOLEN" | "DISPOSED";
  category: {
    id: string;
    name: string;
  };
  createdAt: string;
};

type Meta = {
  total: number;
  page: number;
  limit: number;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await api.get("/assets", {
          params: searchQuery ? { search: searchQuery } : undefined
        });
        if (response.data.success) {
          const payload = response.data;
          // Standardize parsing for Assets list
          const dataArray = Array.isArray(payload.data)
            ? payload.data
            : (payload.data?.data && Array.isArray(payload.data.data) ? payload.data.data : []);
          
          setAssets(dataArray);
          setMeta({
            total: payload.total ?? payload.data?.total ?? 0,
            page: payload.page ?? payload.data?.page ?? 1,
            limit: payload.limit ?? payload.data?.limit ?? 20,
          });
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [searchQuery]);

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Available</Badge>;
      case 'ALLOCATED': return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">Allocated</Badge>;
      case 'UNDER_MAINTENANCE': return <Badge variant="outline" className="bg-yellow-500 text-white hover:bg-yellow-600 border-none">Maintenance</Badge>;
      case 'RETIRED': return <Badge variant="outline">Retired</Badge>;
      case 'LOST': return <Badge variant="destructive">Lost</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: Asset['condition']) => {
    switch (condition) {
      case 'EXCELLENT': return <Badge variant="outline" className="border-green-500 text-green-600">Excellent</Badge>;
      case 'GOOD': return <Badge variant="outline" className="border-blue-500 text-blue-600">Good</Badge>;
      case 'FAIR': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Fair</Badge>;
      case 'POOR': return <Badge variant="outline" className="border-orange-500 text-orange-600">Poor</Badge>;
      case 'DAMAGED': return <Badge variant="outline" className="border-red-500 text-red-600">Damaged</Badge>;
      default: return <Badge variant="outline">{condition}</Badge>;
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Assets</h2>
        <div className="flex items-center space-x-2">
          <Link href="/assets/register">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Register Asset
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Asset Inventory</CardTitle>
          <CardDescription>
            Manage and track all company assets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 space-x-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading assets...
                    </TableCell>
                  </TableRow>
                ) : assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No assets found. Register one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.tag}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.category?.name || "Uncategorized"}</TableCell>
                      <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell>{asset.location || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/assets/${asset.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {meta && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing {assets.length} of {meta.total} assets.
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" disabled={meta.page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={assets.length < meta.limit}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
