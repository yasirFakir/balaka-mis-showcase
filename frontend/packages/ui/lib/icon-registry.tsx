import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Briefcase,
  DollarSign,
  UserCircle,
  ShieldCheck,
  UserPlus,
  TicketIcon,
  Store,
  Box,
  Lock,
  BarChart3,
  ChevronDown,
  Database,
  PieChart,
  Clock,
  Settings2,
  Cog,
  Briefcase as WorkIcon,
  ShieldCheck as SecurityIcon,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ClipboardCheck,
  Receipt,
  Calculator,
  History,
  Bell,
  Ticket,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Edit2,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Camera,
  FileCode,
  Building2,
  TrendingUp,
  AlertTriangle,
  ListPlus,
  Truck,
  RefreshCcw
} from "lucide-react";

/**
 * Gonia Icon Registry
 * Mapping semantic business terms to Lucide icons for system-wide consistency.
 * Use these instead of importing Lucide icons directly where possible.
 */
export const GoniaIcons = {
  // Navigation
  Dashboard: LayoutDashboard,
  Operations: FileText,
  Financials: DollarSign,
  Ledger: Receipt,
  Directory: Users,
  System: Settings,
  Services: Briefcase,
  Support: Ticket,
  Analytics: BarChart3,
  
  // Entities
  User: UserCircle,
  Staff: UserPlus,
  Vendor: Store,
  Cargo: Box,
  Role: ShieldCheck,
  Wallet: Wallet,
  Bank: Building2,
  
  // Actions
  Add: Plus,
  Search: Search,
  Filter: Filter,
  Download: Download,
  Upload: Upload,
  Edit: Edit2,
  EditAlt: Settings2,
  View: FileText,
  Delete: Trash2,
  Remove: XCircle,
  More: MoreVertical,
  Close: XCircle,
  Back: ArrowLeft,
  Next: ArrowRight,
  ChevronLeft: ChevronLeft,
  ChevronRight: ChevronRight,
  ChevronDown: ChevronDown,
  First: ChevronsLeft,
  Last: ChevronsRight,
  Confirm: Check,
  Grip: GripVertical,
  Capture: Camera,
  Code: FileCode,
  
  // Status & Feedback
  Success: CheckCircle2,
  Warning: AlertTriangle,
  Error: XCircle,
  Pending: Clock,
  Process: Cog,
  Verify: ClipboardCheck,
  Secure: Lock,
  History: History,
  Notification: Bell,
  Info: Info,
  Alert: AlertCircle,
  Shipping: Truck,
  Refund: RefreshCcw,
  
  // Financial Specific
  Income: ArrowUpCircle,
  Expense: ArrowDownCircle,
  Yield: TrendingUp,
  Summary: ListPlus,
  
  // Details
  Date: Calendar,
  Phone: Phone,
  Email: Mail,
  Location: MapPin,
  Money: DollarSign,
  Riyal: (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M12 2v20M17 5H9.5a4.5 4.5 0 0 0 0 9H12s4.5 0 4.5 4.5A4.5 4.5 0 0 1 12 23H7" />
    </svg>
  ),
  Calculate: Calculator,
  Chart: PieChart,
  Dropdown: ChevronDown,
  Database: Database,
  WhatsApp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      stroke="none" 
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.328-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.87 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.406.015 12.042c0 2.123.554 4.197 1.602 6.06L0 24l6.304-1.655A11.77 11.77 0 0012.048 24c6.634 0 12.032-5.403 12.035-12.042a11.764 11.764 0 00-3.517-8.482z" />
    </svg>
  )
} as const;

export type GoniaIconName = keyof typeof GoniaIcons;
