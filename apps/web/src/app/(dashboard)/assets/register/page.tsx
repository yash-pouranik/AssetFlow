"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Please select a category"),
  serialNumber: z.string().optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"], {
    required_error: "Please select a condition",
  }),
  location: z.string().optional(),
  isBookable: z.boolean().default(false),
  photoUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Category = {
  id: string;
  name: string;
};

export default function RegisterAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      categoryId: "",
      serialNumber: "",
      condition: "GOOD",
      location: "",
      isBookable: false,
      photoUrl: "",
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        if (response.data.success) {
          const categoriesData = Array.isArray(response.data.data) 
            ? response.data.data 
            : response.data.data.data || [];
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.post("/assets", {
        name: data.name,
        categoryId: data.categoryId,
        serialNumber: data.serialNumber || undefined,
        condition: data.condition,
        location: data.location || undefined,
        isBookable: data.isBookable,
      });
      if (response.data.success) {
        router.push("/assets");
        router.refresh();
      } else {
        setError(response.data.error?.message || "Failed to register asset");
      }
    } catch (error: any) {
      console.error("Error registering asset:", error);
      setError(error.response?.data?.error?.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryIdValue = watch("categoryId");
  const conditionValue = watch("condition");

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center space-x-2">
        <Link href="/assets">
          <Button variant="ghost" size="icon" className="hover:bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Register Asset</h2>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>
            Enter the information for the new asset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Asset Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. MacBook Pro M3"
                  {...register("name")}
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId" className="text-sm font-medium">Category <span className="text-destructive">*</span></Label>
                <Select
                  value={categoryIdValue}
                  onValueChange={(value) => setValue("categoryId", value, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.categoryId ? "border-destructive focus:ring-destructive" : ""}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No categories found</div>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-sm font-medium">Serial Number</Label>
                <Input
                  id="serialNumber"
                  placeholder="e.g. C02XABCD1234"
                  {...register("serialNumber")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition" className="text-sm font-medium">Condition <span className="text-destructive">*</span></Label>
                <Select
                  value={conditionValue}
                  onValueChange={(value: any) => setValue("condition", value, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.condition ? "border-destructive focus:ring-destructive" : ""}>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="FAIR">Fair</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && (
                  <p className="text-xs text-destructive mt-1">{errors.condition.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Building A, Room 101"
                  {...register("location")}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="photoUrl" className="text-sm font-medium">Photo / Document URL (Mockup)</Label>
                <Input
                  id="photoUrl"
                  placeholder="e.g. https://images.unsplash.com/... or /docs/receipt.pdf"
                  {...register("photoUrl")}
                />
              </div>

              <div className="flex items-start space-x-2 md:col-span-2 pt-2">
                <Checkbox
                  id="isBookable"
                  checked={watch("isBookable")}
                  onCheckedChange={(checked) => setValue("isBookable", !!checked, { shouldValidate: true })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="isBookable"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Allow Booking
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This asset can be booked/reserved by team members.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Link href="/assets">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Register Asset"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
