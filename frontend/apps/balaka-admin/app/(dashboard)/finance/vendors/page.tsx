"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/core/api";
import { ExternalLink, User, Phone, Search, TrendingDown, Store, Wallet, Plus, Building2, ArrowRight } from "lucide-react";
import { CreateVendorDialog } from "@/components/finance/create-vendor-dialog";
import { PayVendorDialog } from "@/components/finance/pay-vendor-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger, GoniaCard, GoniaCardHeader, H2, GoniaDataTable, Column, Button, Badge, Card, gonia, LoadingSpinner } from "@/ui";





import Link from "next/link";
import { cn } from "@/lib/utils";


import { Vendor } from "@/core/types";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadVendors() {
      setLoading(true);
      try {
        const response = await fetchClient<any>("/api/v1/vendors/");
        const data = Array.isArray(response) ? response : (response.items || []);
        setVendors(data);
      } catch (error) {
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, [refreshKey]);

  if (loading) {
    return <LoadingSpinner size="lg" full />;
  }

  const list = Array.isArray(vendors) ? vendors : [];
  const externalVendors = list.filter(v => v.type !== 'INTERNAL');
  const internalAccounts = list.filter(v => v.type === 'INTERNAL');
  const totalDebt = list.reduce((acc, v) => acc + (v.current_balance ?? 0), 0);

  const getColumns = (onPaymentRecorded: () => void): Column<Vendor>[] => [
    {
      id: "name",
      header: "Account Name",
      accessorKey: "name",
      className: "pl-8 py-4",
      cell: (vendor: Vendor) => <span className="font-bold text-sm text-primary uppercase">{vendor.name}</span>
    },
    {
      id: "poc",
      header: "Point of Contact",
      cell: (vendor: Vendor) => (
        <div className="flex flex-col gap-1">
          {vendor.contact_person && <div className="flex items-center gap-2 text-xs font-bold text-primary/80 uppercase"><User className="h-3 w-3 text-primary/40" /> {vendor.contact_person}</div>}
          {vendor.phone && <div className="flex items-center gap-2 text-[11px] font-mono text-primary/40"><Phone className="h-3 w-3" /> {vendor.phone}</div>}
        </div>
      )
    },
    {
      id: "balance",
      header: "Current Balance",
      className: "text-right",
      cell: (vendor: Vendor) => (
        <span className={cn(
          gonia.text.mono, "text-lg font-bold",
          (vendor.current_balance ?? 0) > 0 ? "text-destructive" : "text-emerald-600"
        )}>
          ${(vendor.current_balance ?? 0).toFixed(2)}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right pr-8",
      cell: (vendor: Vendor) => (
        <div className="flex justify-end gap-3">
          <PayVendorDialog 
            vendorId={vendor.id} 
            vendorName={vendor.name} 
            onPaymentRecorded={onPaymentRecorded} 
            trigger={
              <Button variant="outline" className={cn(gonia.button.base, gonia.button.outline, "h-8 px-3 shadow-none")}>
                <Wallet className="h-3.5 w-3.5 mr-2" /> Record Payment
              </Button>
            }
          />
          <Link href={`/finance/vendors/${vendor.id}`}>
            <Button className={cn(gonia.button.base, gonia.button.primary, "h-8 w-8 p-0 shadow-none")}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-10">
      {/* Gonia v1.5 Header */}
      <div className={gonia.layout.pageHeader}>
        <div className="space-y-1">
          <h1 className={cn(gonia.text.h1, "flex items-center gap-3")}>
            <Building2 className="h-8 w-8" /> Accounts & Vendors
          </h1>
          <p className={gonia.text.caption}>Manage external suppliers, airlines, and internal cost centers.</p>
        </div>
        <CreateVendorDialog 
            onVendorCreated={() => setRefreshKey(prev => prev + 1)} 
            trigger={
                <Button className={cn(gonia.button.base, gonia.button.primary, "gap-2")}>
                    <Plus className="h-4 w-4" /> Add New Account
                </Button>
            }
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className={cn(gonia.layout.cardSaturated, "bg-[var(--gonia-error)] border-[var(--gonia-error)] p-6 relative overflow-hidden flex flex-col justify-between group h-full transition-all")}>
              <div className="absolute top-0 left-0 w-1 h-0 bg-[var(--gonia-error)] group-hover:h-full transition-all duration-300" />
              <div className="relative z-20 space-y-4">
                  <div className="flex justify-between items-center w-full">
                      <h3 className="text-white/60 text-[10px] font-black uppercase tracking-normal group-hover:text-[var(--gonia-error)] group-hover:opacity-100 transition-all">Outstanding Payables</h3>
                      <ArrowRight className="h-4 w-4 text-[var(--gonia-error)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className={cn(gonia.text.mono, "text-7xl text-white group-hover:text-[var(--gonia-error)] transition-colors")}>${totalDebt.toLocaleString()}</div>
              </div>
              <div className="relative z-20 mt-6">
                  <Badge className="bg-black/20 text-white border-none text-[10px] font-black group-hover:bg-[var(--gonia-error)]/10 group-hover:text-[var(--gonia-error)] transition-all uppercase px-3 py-1">Payables Due</Badge>
              </div>
          </Card>
          
          <Card className={cn(gonia.layout.cardSaturated, "p-6 relative overflow-hidden flex flex-col justify-between group h-full transition-all")}>
              <div className={gonia.layout.marker} />
              <div className="relative z-20 space-y-4">
                  <div className="flex justify-between items-center w-full">
                      <h3 className="text-white/60 text-[10px] font-black uppercase tracking-normal group-hover:text-primary group-hover:opacity-100 transition-all">External Suppliers</h3>
                      <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className={cn(gonia.text.mono, "text-7xl text-white group-hover:text-primary transition-colors")}>{externalVendors.length}</div>
              </div>
              <div className="relative z-20 mt-6">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-black group-hover:bg-primary/10 group-hover:text-primary transition-all uppercase px-3 py-1">Active Partners</Badge>
              </div>
          </Card>

          <Card className={cn(gonia.layout.cardSaturated, "bg-[var(--gonia-secondary)] border-[var(--gonia-secondary)] p-6 relative overflow-hidden flex flex-col justify-between group h-full transition-all")}>
              <div className="absolute top-0 left-0 w-1 h-0 bg-[var(--gonia-secondary)] group-hover:h-full transition-all duration-300" />
              <div className="relative z-20 space-y-4">
                  <div className="flex justify-between items-center w-full">
                      <h3 className="text-white/60 text-[10px] font-black uppercase tracking-normal group-hover:text-[var(--gonia-secondary)] group-hover:opacity-100 transition-all">Internal Accounts</h3>
                      <ArrowRight className="h-4 w-4 text-[var(--gonia-secondary)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className={cn(gonia.text.mono, "text-7xl text-white group-hover:text-[var(--gonia-secondary)] transition-colors")}>{internalAccounts.length}</div>
              </div>
              <div className="relative z-20 mt-6">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-black group-hover:bg-[var(--gonia-secondary)]/10 group-hover:text-[var(--gonia-secondary)] transition-all uppercase px-3 py-1">Office Nodes</Badge>
              </div>
          </Card>
      </div>

      <Tabs defaultValue="EXTERNAL" className="w-full">
        <TabsList className="mb-8">
            <TabsTrigger value="EXTERNAL" className="gap-2">External Suppliers</TabsTrigger>
            <TabsTrigger value="INTERNAL" className="gap-2">Internal Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="EXTERNAL" className="outline-none">
            <GoniaCard>
              <GoniaCardHeader>
                <H2>External Supplier Directory</H2>
              </GoniaCardHeader>
              <div className="p-0">
                <GoniaDataTable 
                  data={externalVendors} 
                  columns={getColumns(() => setRefreshKey(prev => prev + 1))}
                  searchKey="name"
                  searchPlaceholder="Filter external accounts..."
                  emptyMessage="No external vendors detected in current details."
                  isLoading={loading}
                />
              </div>
            </GoniaCard>
        </TabsContent>
        <TabsContent value="INTERNAL" className="outline-none">
            <GoniaCard>
              <GoniaCardHeader>
                <H2>Internal Cost Centers</H2>
              </GoniaCardHeader>
              <div className="p-0">
                <GoniaDataTable 
                  data={internalAccounts} 
                  columns={getColumns(() => setRefreshKey(prev => prev + 1))}
                  searchKey="name"
                  searchPlaceholder="Filter internal accounts..."
                  emptyMessage="No internal accounts found."
                  isLoading={loading}
                />
              </div>
            </GoniaCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
