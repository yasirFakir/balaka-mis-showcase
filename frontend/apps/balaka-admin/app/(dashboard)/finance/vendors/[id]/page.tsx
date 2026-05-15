"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/core/api";
import { 
    GoniaPageShell, 
    Card, 
    CardHeader,
    CardTitle,
    CardContent, 
    Badge, 
    Button,
    LoadingSpinner,
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
    gonia
} from "@/ui";



import { Loader2, ArrowLeft, Calendar, FileText, User, Phone, Mail, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PayVendorDialog } from "@/components/finance/pay-vendor-dialog";
import { cn } from "@/lib/utils";
import { Vendor, VendorTransaction } from "@/core/types";


export default function VendorDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadVendor() {
      setLoading(true);
      try {
        const data = await fetchClient<Vendor>(`/api/v1/vendors/${id}`);
        setVendor(data);
      } catch (error) {
        router.push("/finance/vendors");
      } finally {
        setLoading(false);
      }
    }
    loadVendor();
  }, [id, router, refreshKey]);

  if (loading) {
    return <LoadingSpinner full />;
  }

  if (!vendor) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Vendors
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Sidebar */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">{vendor.name}</div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /> {vendor.contact_person || 'N/A'}</div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {vendor.phone || 'N/A'}</div>
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {vendor.email || 'N/A'}</div>
                        <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5" /> {vendor.address || 'No address provided'}</div>
                    </div>
                </CardContent>
            </Card>

            <Card className={cn(vendor.current_balance > 0 ? "bg-red-50" : "bg-green-50")}>
                <CardHeader>
                    <CardTitle className="text-sm font-medium uppercase">Current Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className={cn(
                        "text-3xl font-bold font-mono",
                        vendor.current_balance > 0 ? "text-red-700" : "text-green-700"
                    )}>
                        ${vendor.current_balance.toFixed(2)}
                    </div>
                    <PayVendorDialog 
                        vendorId={vendor.id} 
                        vendorName={vendor.name} 
                        onPaymentRecorded={() => setRefreshKey(prev => prev + 1)} 
                        trigger={
                            <Button className="w-full bg-green-600 hover:bg-green-700">Make a Payment</Button>
                        }
                    />
                </CardContent>
            </Card>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
            <Card>
                    <div className="bg-primary/5 border-b border-primary/10 py-4 px-6 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary opacity-40" />
                            <h2 className={cn(gonia.text.label, "m-0")}>Record History</h2>
                        </div>
                    </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vendor.transactions?.map((txn) => (
                                <TableRow key={txn.id}>
                                    <TableCell className="text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 opacity-50" /> {format(new Date(txn.created_at), "PP p")}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={txn.transaction_type === "PURCHASE" ? "outline" : "success"}>
                                            {txn.transaction_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "font-mono font-bold",
                                        txn.transaction_type === "PURCHASE" ? "text-red-600" : "text-green-600"
                                    )}>
                                        {txn.transaction_type === "PURCHASE" ? "+" : "-"}${txn.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground italic">
                                        {txn.notes || "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!vendor.transactions || vendor.transactions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No transactions recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
