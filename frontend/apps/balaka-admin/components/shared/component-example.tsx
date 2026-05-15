"use client"

import * as React from "react"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label, LoadingSpinner, Tabs, TabsList, TabsTrigger, TabsContent, gonia, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DatePicker, Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Separator, useNotifications } from "@/ui";






import { 
  Activity, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight,
  Database,
  Globe,
  Lock,
  Search,
  ChevronDown,
  HelpCircle,
  BellRing,
  Settings,
  LogOut,
  ExternalLink,
  Plus,
  ClipboardList,
  Calculator,
  Wallet,
  FileCode
} from "lucide-react"

import { cn } from "@/lib/utils"










export function ComponentExample() {
  const { toast } = useNotifications();
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <div className="space-y-16 pb-20 max-w-6xl mx-auto">
      {/* 00. Color Palette */}
      <section className={gonia.layout.section}>
        <h2 className={gonia.text.h2}>00. Color Palette // Gonia v1.5</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-6 mt-6">
            <PaletteSquare color="bg-[var(--gonia-primary)]" name="Forest" hex="var(--gonia-primary)" usage="Primary" />
            <PaletteSquare color="bg-[var(--gonia-primary-deep)]" name="Forest Deep" hex="var(--gonia-primary-deep)" usage="Text / Density" />
            <PaletteSquare color="bg-[var(--gonia-secondary)]" name="Moss" hex="var(--gonia-secondary)" usage="Secondary" />
            <PaletteSquare color="bg-[var(--gonia-secondary-pale)]" name="Moss Pale" hex="var(--gonia-secondary-pale)" usage="Subtle" />
            <PaletteSquare color="bg-[var(--gonia-warning)]" name="Leaf Gold" hex="var(--gonia-warning)" usage="Highlight" />
            <PaletteSquare color="bg-[var(--gonia-accent-saturated)]" name="Gold Sat." hex="var(--gonia-accent-saturated)" usage="Signal" />
            <PaletteSquare color="bg-[var(--gonia-warm-sand)]" name="Warm Sand" hex="var(--gonia-warm-sand)" usage="Table Highlights" />
            <PaletteSquare color="bg-[var(--gonia-error)]" name="Brick Red" hex="var(--gonia-error)" usage="Error" />
            <PaletteSquare color="bg-[var(--gonia-surface)]" name="Pure White" hex="var(--gonia-surface)" usage="Surface" border />
            <PaletteSquare color="bg-[var(--gonia-limestone)]" name="Limestone" hex="var(--gonia-limestone)" usage="Depth" border />
            <PaletteSquare color="bg-[var(--gonia-canvas)]" name="Warm Paper" hex="var(--gonia-canvas)" usage="Background" border />
        </div>
      </section>

      {/* 01. Typography */}
      <section className={gonia.layout.section}>
        <div className="bg-primary/5 p-6 border-l-4 border-primary border-b border-primary/10 mb-8">
            <h1 className={gonia.text.h1}>01. Typography // Hierarchy</h1>
            <p className={gonia.text.caption}>System font: Inter (English) // Hind Siliguri (Bengali)</p>
        </div>
        
        <div className="grid gap-8">
            <div>
                <Label className={gonia.text.label}>H1 - Page Heading</Label>
                <h1 className={gonia.text.h1}>Executive Dashboard Summary</h1>
            </div>
            <div>
                <Label className={gonia.text.label}>H2 - Section Heading</Label>
                <h2 className={gonia.text.h2}>Transaction History</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <Label className={gonia.text.label}>System Reference (Mono)</Label>
                    <p className={gonia.text.mono}>TXN-2025-9982 // SR 14,250.00 // 2026-01-05</p>
                </div>
                <div>
                    <Label className={gonia.text.label}>Body Text</Label>
                    <p className={gonia.text.body}>Standard paragraph style for descriptions and information blocks within the agency management system.</p>
                </div>
            </div>
        </div>
      </section>

      {/* 02. Buttons */}
      <section className={gonia.layout.section}>
        <h2 className={gonia.text.h2}>02. Interactive // Action Blocks</h2>
        <div className="flex flex-wrap gap-8 items-end p-8 bg-card border border-primary/35 shadow-sm">
            <div className="space-y-3">
                <Label className={gonia.text.label}>Primary // Invert</Label>
                <Button className={cn(gonia.button.base, gonia.button.primary)}>Confirm Action</Button>
            </div>
            <div className="space-y-3">
                <Label className={gonia.text.label}>Secondary // Invert</Label>
                <Button className={cn(gonia.button.base, gonia.button.secondary)}>Save Changes</Button>
            </div>
            <div className="space-y-3">
                <Label className={gonia.text.label}>Muted // Sand</Label>
                <Button className={cn(gonia.button.base, gonia.button.muted)}>Download PDF</Button>
            </div>
            <div className="space-y-3">
                <Label className={gonia.text.label}>Technical Outline</Label>
                <Button variant="outline" className={cn(gonia.button.base, "border-primary/20 shadow-none")}>Abort Flow</Button>
            </div>
            <div className="space-y-3">
                <Label className={gonia.text.label}>Destructive Gate</Label>
                <Button variant="destructive" className={cn(gonia.button.base, gonia.button.destructive, "gap-2")}>
                    <Trash2 className="h-4 w-4" /> Delete Record
                </Button>
            </div>
        </div>
      </section>

      {/* 03. Containers // Cards */}
      <section className={gonia.layout.section}>
        <h2 className={gonia.text.h2}>03. Layout // Gonia Structure</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className={gonia.layout.card}>
                <CardHeader className="bg-primary/5 border-b border-primary/10 py-3 px-6">
                    <CardTitle className={gonia.text.label}>Static Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <p className={gonia.text.mono}>ID: UNIT-001</p>
                    <p className={cn(gonia.text.body, "mt-2")}>Standard container for static operational data. Fixed borders anchor the layout.</p>
                </CardContent>
            </Card>

            <Card className={cn(gonia.layout.cardInteractive, "group relative overflow-hidden p-0")}>
                <div className={gonia.layout.marker} />
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <CardTitle className={gonia.text.label}>Interactive Card</CardTitle>
                        </div>
                        <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="text-2xl font-black text-primary">SR 1,250.00</div>
                    <p className={gonia.text.caption}>Hover to see mechanical lift, technical marker, and arrow signal.</p>
                </div>
            </Card>

            <Card className={cn(gonia.radius, gonia.layout.cardSaturated, "group relative overflow-hidden p-6")}>
                <div className={gonia.layout.marker} />
                <div className="flex justify-between items-center w-full mb-4 relative z-20">
                    <h3 className="text-white/60 text-[10px] font-black uppercase tracking-normal group-hover:text-primary transition-all">Saturated Node</h3>
                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="text-xl font-black text-white group-hover:text-primary transition-colors mb-4 relative z-20">Interactive Flip</div>
                <Badge className="bg-white/20 text-white border-none text-[8px] font-black group-hover:bg-primary/10 group-hover:text-primary uppercase relative z-20 transition-all">Hover to Invert</Badge>
            </Card>
        </div>
      </section>

      {/* 04. Data Grid */}
      <section className={gonia.layout.section}>
        <h2 className={gonia.text.h2}>04. Data Grid // Technical Table</h2>
        <div className="border-2 border-primary/20 bg-card overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-primary/5 border-b-2 border-primary/10">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className={cn(gonia.text.label, "py-4 pl-6")}>Reference</TableHead>
                        <TableHead className={gonia.text.label}>Service / Operation</TableHead>
                        <TableHead className={gonia.text.label}>Status</TableHead>
                        <TableHead className={cn(gonia.text.label, "text-right pr-6")}>Amount (USD)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="group hover:bg-primary/5 transition-colors border-primary/10">
                        <TableCell className={cn(gonia.text.mono, "pl-6 text-primary font-bold")}>REQ-9928-XA</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-primary uppercase">Cargo Shipment</span>
                                <span className={cn(gonia.text.caption, "lowercase tracking-tight")}>KSA to Bangladesh</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge className={gonia.badge.success}>Verified</Badge>
                        </TableCell>
                        <TableCell className={cn(gonia.text.mono, "text-right pr-6 font-black text-emerald-600")}>+SR 1,240.50</TableCell>
                    </TableRow>
                    <TableRow className="group hover:bg-primary/5 transition-colors border-primary/10">
                        <TableCell className={cn(gonia.text.mono, "pl-6 text-primary font-bold")}>REQ-9930-ZB</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-primary uppercase">Internal Trading</span>
                                <span className={cn(gonia.text.caption, "lowercase tracking-tight")}>Sourcing Phase</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge className={gonia.badge.warning}>Pending</Badge>
                        </TableCell>
                        <TableCell className={cn(gonia.text.mono, "text-right pr-6 font-black text-primary")}>SR 0.00</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 05. Forms */}
      <section className={gonia.layout.section}>
        <h2 className={gonia.text.h2}>05. Form Architecture // Gonia Field</h2>
        <Card className="p-8 bg-card border border-primary/35 shadow-none space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>Standard Data Input</Label>
                        <Input placeholder="Enter details..." className={gonia.input.base} />
                    </div>
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>High-Contrast Select</Label>
                        <Select>
                            <SelectTrigger className={gonia.input.base}>
                                <SelectValue placeholder="Choose option..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2">
                                <SelectItem value="1">Standard Delivery</SelectItem>
                                <SelectItem value="2">Express Air Freight</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className={gonia.text.label}>Date & File Selection</Label>
                        <div className="flex flex-col gap-4">
                            <DatePicker date={date} setDate={setDate} className={cn(gonia.input.base, "font-normal")} />
                            <Input type="file" className={gonia.input.base} />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
      </section>

      {/* 06. Notifications */}
      <section className={gonia.layout.section}>
        <h2 className={gonia.text.h2}>06. Intelligence // Feedback Loops</h2>
        <div className="flex flex-wrap gap-6 p-8 bg-card border border-primary/35">
            <Button onClick={() => toast.success("Process successful")} className={cn(gonia.button.base, "bg-emerald-600 border-emerald-600 text-white shadow-none")}>
                Trigger Success
            </Button>
            <Button onClick={() => toast.error("Error encountered")} className={cn(gonia.button.base, gonia.button.destructive)}>
                Trigger Error
            </Button>
            <Button onClick={() => toast.info("Information update")} className={cn(gonia.button.base, gonia.button.primary)}>
                Trigger Info
            </Button>
            <div className="flex items-center gap-3 ml-auto">
                <BellRing className="h-5 w-5 text-primary animate-pulse" />
                <span className={gonia.text.caption}>System Notifications Active</span>
            </div>
        </div>
      </section>
    </div>
  )
}

function PaletteSquare({ color, name, hex, usage, border = false }: any) {
    return (
        <div className="space-y-2">
            <div className={cn("aspect-square w-full rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]", color, border && "border-2 border-primary/10")} />
            <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-tight text-primary leading-tight">{name}</p>
                <p className="text-[9px] font-mono font-bold text-muted-foreground">{hex}</p>
                <p className="text-[8px] italic text-muted-foreground/60 leading-tight">{usage}</p>
            </div>
        </div>
    )
}
