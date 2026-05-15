import { GoniaIcons } from "@/ui";
import { 
  Plane, 
  Truck, 
  Landmark, 
  FileText, 
  Lock,
  LayoutDashboard,
  Settings,
  Plus
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  permission: string | null;
  exact?: boolean;
}

export interface NavGroup {
  name: string;
  icon: any;
  items?: NavItem[];
  href?: string;
  permission?: string | null;
  exact?: boolean;
}

export const navigationGroups: NavGroup[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    exact: true,
    permission: null
  },
  {
    name: "Ticket",
    icon: Plane,
    href: "/workspaces/ticket",
    permission: "requests.view_all"
  },
  {
    name: "Cargo",
    icon: Truck,
    href: "/workspaces/cargo",
    permission: "requests.view_all"
  },
  {
    name: "Hajj Umrah",
    icon: Landmark,
    href: "/workspaces/hajj-umrah",
    permission: "requests.view_all"
  },
  {
    name: "General",
    icon: FileText,
    href: "/workspaces/general",
    permission: "requests.view_all"
  },
  {
    name: "Private",
    icon: Lock,
    href: "/workspaces/private",
    permission: "requests.view_all"
  },
  {
    name: "Settings",
    icon: Settings,
    href: "/services", 
    permission: null,
    items: [
        { title: "Service List", href: "/services", icon: GoniaIcons.Services, permission: "services.view" },
        { title: "Role Builder", href: "/roles", icon: GoniaIcons.Role, permission: "roles.view" },
        { title: "Staff List", href: "/staff", icon: GoniaIcons.Staff, permission: "users.view" },
        { title: "Client List", href: "/users", icon: GoniaIcons.User, permission: "users.view" },
        { title: "Ledger", href: "/finance/records", icon: GoniaIcons.Ledger, permission: "finance.view_ledger" },
        { title: "Vendors", href: "/finance/vendors", icon: GoniaIcons.Vendor, permission: "finance.view_ledger" },
        { title: "Maintenance", href: "/system/maintenance", icon: GoniaIcons.Database, permission: "users.view" },
    ]
  }
];
