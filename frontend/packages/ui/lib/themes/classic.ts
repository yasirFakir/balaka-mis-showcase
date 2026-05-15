export const goniaClassic = {
  // Geometric Foundation
  radius: "rounded-none",
  border: "border border-primary/35",
  borderBold: "border-2 border-primary/45",
  shadowTechnical: "shadow-[2px_2px_0_0_rgba(0,0,0,0.05)]",

  // Typography & Fonts (I18n)
  fonts: {
    en: "font-sans", 
    bn: "font-bengali", 
    mono: "font-mono", 
  },

  // Color Palette Access (Synced with CSS Vars)
  colors: {
    forest: "var(--gonia-primary)", 
    forestDeep: "var(--gonia-primary-deep)", 
    moss: "var(--gonia-secondary)", 
    mossPale: "var(--gonia-secondary-pale)", 
    gold: "var(--gonia-accent)", 
    goldSaturated: "var(--gonia-accent-saturated)", 
    sand: "var(--gonia-warm-sand)", 
    white: "var(--gonia-surface)", 
    limestone: "var(--gonia-limestone)", 
    success: "var(--gonia-success)",
    warning: "var(--gonia-warning)",
    error: "var(--gonia-error)",
  },
  
  // Layout Helpers
  layout: {
    pageHeader: "flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-primary/5 p-4 md:p-6 border-l-4 border-primary border-b border-primary/10 mb-6 md:mb-8",
    card: "bg-white border border-primary/15 shadow-none rounded-none overflow-hidden",
    cardHeader: "bg-[var(--gonia-limestone)] border-b border-primary/10 py-3 px-4 md:px-6",
    cardInteractive: "bg-white border-2 border-primary/10 shadow-none hover:border-primary/40 hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:translate-x-0 active:translate-y-0",
    cardSaturated: "bg-primary bg-saturated-custom text-white border-2 border-primary shadow-[3px_3px_0_0_var(--gonia-accent)] hover:bg-transparent hover:text-primary transition-all duration-200 cursor-pointer",
    section: "space-y-6 mb-8 md:mb-12",
    marker: "absolute top-0 left-0 w-1 h-0 bg-primary group-hover:h-full transition-all duration-300",
    liveMarker: "h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse",
    container: "px-4 md:px-8 max-w-7xl mx-auto",
  },

  // Typography Scale
  text: {
    h1: "text-2xl md:text-4xl font-black tracking-tighter text-primary leading-tight uppercase",
    h2: "text-lg md:text-2xl font-black tracking-tighter text-primary uppercase",
    label: "text-[11px] md:text-[12px] font-black text-primary uppercase tracking-normal opacity-70",
    body: "text-sm font-medium leading-relaxed md:leading-relaxed text-foreground", 
    mono: "text-[12px] md:text-[14px] font-mono font-medium tracking-tight",
    caption: "text-[11px] md:text-[13px] font-black uppercase text-foreground/60 tracking-normal",
  },

  // Touch Targets
  touch: {
    minHeight: "min-h-[44px]",
    tapArea: "p-3",
  },

  // Buttons
  button: {
    base: "h-10 rounded-none font-black uppercase text-[10px] tracking-normal transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50",
    primary: "bg-primary text-white border-2 border-primary shadow-[3px_3px_0_0_var(--gonia-accent)] hover:bg-transparent hover:text-primary hover:shadow-none",
    secondary: "bg-secondary text-white border-2 border-secondary shadow-[3px_3px_0_0_var(--gonia-primary)] hover:bg-transparent hover:text-secondary hover:shadow-none",
    muted: "bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors",
    outline: "bg-transparent border-2 border-primary/20 text-primary hover:border-primary transition-all",
    ghost: "bg-transparent text-primary/60 hover:bg-primary/5 hover:text-primary transition-all",
    destructive: "bg-destructive text-white border-2 border-destructive shadow-[3px_3px_0_0_rgba(0,0,0,0.1)] hover:bg-transparent hover:text-destructive hover:shadow-none",
  },

  // Inputs
  input: {
    base: "h-11 w-full rounded-none bg-muted/10 border-primary/10 focus-visible:bg-white focus-visible:border-primary focus-visible:ring-0 transition-all text-sm px-3 font-medium",
    file: "file:mr-4 file:h-7 file:border-2 file:border-solid file:border-primary file:bg-transparent file:px-2 file:text-[8px] file:font-black file:uppercase file:text-primary file:cursor-pointer hover:file:bg-primary hover:file:text-white file:transition-all file:rounded-none",
  },

  // Tabs
  tabs: {
    list: "flex h-[3.5rem] items-stretch border-b border-primary/10 bg-transparent w-full gap-0 p-0 overflow-x-auto no-scrollbar flex-nowrap",
    trigger: "px-4 md:px-8 h-full text-[10px] md:text-xs font-black uppercase tracking-normal transition-colors border-none shrink-0",
  },

  badge: {
    base: "rounded-none text-[9px] font-black uppercase px-2 py-0.5 tracking-tighter",
    success: "bg-[var(--gonia-success)] text-white",
    warning: "bg-[var(--gonia-warning)] text-white",
    error: "bg-[var(--gonia-error)] text-white",
  },

  statusTheme: {
    "Pending": { color: "bg-[var(--gonia-accent-saturated)] text-white", label: "Pending", icon: "Pending" },
    "Approved": { color: "bg-[var(--gonia-primary)] text-white", label: "Approved", icon: "Success" },
    "Verifying Information": { color: "bg-[var(--gonia-primary-deep)] text-white", label: "Verifying", icon: "Verify" },
    "Processing": { color: "bg-[var(--gonia-secondary)] text-white", label: "Processing", icon: "Process" },
    "Service on Hold": { color: "bg-[var(--gonia-warning)] text-white", label: "On Hold", icon: "Alert" },
    "In Transit": { color: "bg-[var(--gonia-info)] text-white", label: "In Transit", icon: "Shipping" },
    "Received at Warehouse": { color: "bg-[var(--gonia-primary-deep)] opacity-80 text-white", label: "At Warehouse", icon: "Cargo" },
    "Out for Delivery": { color: "bg-[var(--gonia-accent)] text-white", label: "Delivery", icon: "Shipping" },
    "Completed": { color: "bg-[var(--gonia-success)] text-white", label: "Completed", icon: "Success" },
    "Rejected": { color: "bg-[var(--gonia-error)] text-white", label: "Rejected", icon: "Error" },
    "Cancelled": { color: "bg-[var(--gonia-error)] text-white", label: "Cancelled", icon: "Remove" },
    "Refunded": { color: "bg-[var(--gonia-warm-sand)] text-white", label: "Refunded", icon: "Refund" },
    "Payment Verified": { color: "bg-[var(--gonia-success)] text-white", label: "Paid", icon: "Verify" },
    "Open": { color: "bg-[var(--gonia-info)] text-white", label: "Open", icon: "Pending" },
    "In Progress": { color: "bg-[var(--gonia-secondary)] text-white", label: "In Progress", icon: "Process" },
    "Resolved": { color: "bg-[var(--gonia-success)] text-white", label: "Resolved", icon: "Success" },
    "Closed": { color: "bg-[var(--gonia-primary-deep)] text-white", label: "Closed", icon: "Lock" },
    "Escalated": { color: "bg-[var(--gonia-error)] text-white shadow-[2px_2px_0_0_var(--gonia-accent-saturated)]", label: "Escalated", icon: "Alert" },
  } as Record<string, { color: string; label: string; icon: string }>,

  categoryTheme: {
    "General": "bg-[var(--gonia-limestone)] text-[var(--gonia-primary-deep)]",
    "Information Update": "bg-[var(--gonia-info)] text-white",
    "File Issue": "bg-[var(--gonia-error)] text-white",
    "Technical Support": "bg-[var(--gonia-secondary)] text-white",
    "Billing & Payment": "bg-[var(--gonia-success)] text-white",
    "Cargo": "bg-[var(--gonia-primary)] text-white",
    "Ticketing": "bg-[var(--gonia-accent-saturated)] text-white",
    "Internal": "bg-[var(--gonia-primary-deep)] text-white",
  } as Record<string, string>
};
