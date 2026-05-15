export const goniaCandy = {
  // Geometric Foundation (Softer & More Dynamic)
  radius: "rounded-xl",
  border: "border border-primary/10",
  borderBold: "border-2 border-primary/20",
  shadowTechnical: "shadow-[0_8px_30px_rgb(0,0,0,0.04)]",

  // Typography & Fonts
  fonts: {
    en: "font-sans", 
    bn: "font-bengali", 
    mono: "font-mono", 
  },

  // Color Palette Access
  colors: {
    forest: "#6366F1", // Indigo
    forestDeep: "#4338CA",
    moss: "#10B981", // Emerald
    mossPale: "#D1FAE5",
    gold: "#F59E0B", // Amber
    goldSaturated: "#D97706",
    sand: "#FDE68A",
    white: "#FFFFFF",
    limestone: "#F8FAFC",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  
  // Layout Helpers (Vibrant & Airy)
  layout: {
    pageHeader: "flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-2xl border border-primary/5 mb-8 shadow-sm",
    card: "bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-indigo-500/5 rounded-2xl overflow-hidden",
    cardHeader: "bg-indigo-50/30 border-b border-indigo-100/50 py-4 px-6",
    cardInteractive: "bg-white border border-primary/5 shadow-md hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer",
    cardSaturated: "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-2xl",
    section: "space-y-8 mb-12",
    marker: "absolute top-0 left-0 w-1.5 h-0 bg-indigo-500 group-hover:h-full transition-all duration-500",
    liveMarker: "h-2 w-2 rounded-full bg-indigo-500 animate-ping",
    container: "px-6 md:px-12 max-w-7xl mx-auto",
  },

  // Typography Scale (Softer tracking)
  text: {
    h1: "text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight",
    h2: "text-xl md:text-3xl font-bold tracking-tight text-slate-800",
    label: "text-[12px] font-bold text-slate-500 uppercase tracking-wider",
    body: "text-base font-medium leading-relaxed text-slate-600", 
    mono: "text-[13px] md:text-[15px] font-mono font-semibold tracking-tight text-indigo-600",
    caption: "text-[12px] md:text-[14px] font-bold uppercase text-slate-400 tracking-widest",
  },

  // Touch Targets
  touch: {
    minHeight: "min-h-[48px]",
    tapArea: "p-4",
  },

  // Buttons (Pill-like or rounded)
  button: {
    base: "h-11 rounded-xl font-bold uppercase text-[11px] tracking-widest transition-all active:scale-95 disabled:opacity-50",
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/40",
    secondary: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600",
    muted: "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200",
    outline: "bg-transparent border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600",
  },

  // Inputs
  input: {
    base: "h-12 w-full rounded-xl bg-slate-50 border border-slate-200 focus-visible:bg-white focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all text-base px-4 font-medium",
    file: "file:mr-4 file:h-8 file:border-none file:bg-indigo-50 file:px-3 file:text-[10px] file:font-bold file:uppercase file:text-indigo-600 file:cursor-pointer hover:file:bg-indigo-100 file:transition-all file:rounded-lg",
  },

  // Tabs (Rounded containers)
  tabs: {
    list: "flex h-[4rem] items-stretch border-b border-slate-100 bg-transparent w-full gap-2 p-1",
    trigger: "px-6 md:px-10 h-full text-[11px] md:text-sm font-bold uppercase tracking-wider transition-all rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md",
  },

  badge: {
    base: "rounded-full text-[10px] font-bold uppercase px-3 py-1 tracking-tight",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-rose-100 text-rose-700",
  },

  statusTheme: {
    "Pending": { color: "bg-amber-100 text-amber-700", label: "Pending", icon: "Pending" },
    "Approved": { color: "bg-indigo-100 text-indigo-700", label: "Approved", icon: "Success" },
    "Verifying Information": { color: "bg-violet-100 text-violet-700", label: "Verifying", icon: "Verify" },
    "Processing": { color: "bg-blue-100 text-blue-700", label: "Processing", icon: "Process" },
    "Service on Hold": { color: "bg-slate-100 text-slate-700", label: "On Hold", icon: "Alert" },
    "In Transit": { color: "bg-cyan-100 text-cyan-700", label: "In Transit", icon: "Shipping" },
    "Received at Warehouse": { color: "bg-sky-100 text-blue-700", label: "At Warehouse", icon: "Cargo" },
    "Out for Delivery": { color: "bg-emerald-100 text-emerald-700", label: "Delivery", icon: "Shipping" },
    "Completed": { color: "bg-green-100 text-green-700", label: "Completed", icon: "Success" },
    "Rejected": { color: "bg-rose-100 text-rose-700", label: "Rejected", icon: "Error" },
    "Cancelled": { color: "bg-slate-100 text-slate-400", label: "Cancelled", icon: "Remove" },
    "Refunded": { color: "bg-pink-100 text-pink-700", label: "Refunded", icon: "Refund" },
    "Payment Verified": { color: "bg-emerald-500 text-white shadow-md shadow-emerald-500/20", label: "Paid", icon: "Verify" },
    "Open": { color: "bg-sky-100 text-sky-700", label: "Open", icon: "Pending" },
    "In Progress": { color: "bg-indigo-100 text-indigo-700", label: "In Progress", icon: "Process" },
    "Resolved": { color: "bg-emerald-100 text-emerald-700", label: "Resolved", icon: "Success" },
    "Closed": { color: "bg-slate-100 text-slate-500", label: "Closed", icon: "Lock" },
    "Escalated": { color: "bg-rose-500 text-white shadow-lg", label: "Escalated", icon: "Alert" },
  } as Record<string, { color: string; label: string; icon: string }>,

  categoryTheme: {
    "General": "bg-slate-100 text-slate-700",
    "Information Update": "bg-sky-100 text-sky-700",
    "File Issue": "bg-rose-100 text-rose-700",
    "Technical Support": "bg-indigo-100 text-indigo-700",
    "Billing & Payment": "bg-emerald-100 text-emerald-700",
    "Cargo": "bg-blue-100 text-blue-700",
    "Ticketing": "bg-violet-100 text-violet-700",
    "Internal": "bg-slate-800 text-white",
  } as Record<string, string>
};
