import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, ClipboardList, Tractor, UserCog, FileSignature, Boxes, Truck, IndianRupee, Package, BadgeCheck, FileCheck2, Wrench, ClipboardCheck, Cog, Route as RouteIcon, MapPin, Server } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePerms } from "@/lib/permissions";

type Perms = ReturnType<typeof usePerms>;

type Item = { title: string; url: string; icon: typeof LayoutDashboard; show: (p: Perms) => boolean };

const SALES_ITEMS: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: () => true },
  { title: "Inquiries", url: "/inquiries", icon: ClipboardList, show: (p) => p.canAny("inquiry.create", "inquiry.edit") || p.isManagement },
  { title: "Customers", url: "/customers", icon: Users, show: (p) => p.canAny("inquiry.create", "inquiry.edit", "customer.edit") || p.isManagement },
  { title: "Bookings", url: "/bookings", icon: FileSignature, show: (p) => p.canAny("booking.create", "booking.edit", "payment.add") || p.isManagement },
];

const OPS_ITEMS: Item[] = [
  { title: "Stock", url: "/stock", icon: Boxes, show: (p) => p.canAny("stock.add", "stock.edit", "stock.allocate") },
  { title: "Delivery", url: "/delivery", icon: Truck, show: (p) => p.can("delivery.manage") },
  { title: "Subsidy", url: "/subsidy", icon: BadgeCheck, show: (p) => p.can("subsidy.edit") },
  { title: "Passing", url: "/passing", icon: FileCheck2, show: (p) => p.can("passing.edit") },
  { title: "Accounting", url: "/accounting", icon: IndianRupee, show: (p) => p.canAny("payment.add", "payment.edit") || p.isManagement },
];

const SERVICE_ITEMS: Item[] = [
  { title: "Service Register", url: "/service", icon: Wrench, show: (p) => p.canAny("service.register", "service.edit") },
  { title: "Job Cards", url: "/service/jobcards", icon: ClipboardCheck, show: (p) => p.can("jobcard.manage") },
  { title: "Route Planner", url: "/service/routes", icon: RouteIcon, show: (p) => p.can("routes.manage") },
  { title: "Spare Parts", url: "/spares", icon: Cog, show: (p) => p.canAny("spares.raise", "spares.fulfill") },
];

const MASTER_ITEMS: Item[] = [
  { title: "Products", url: "/products", icon: Package, show: (p) => p.can("masters.view") },
  { title: "Villages", url: "/villages", icon: MapPin, show: (p) => p.can("masters.view") },
  { title: "Users", url: "/users", icon: UserCog, show: (p) => p.can("masters.view") },
  { title: "Backend status", url: "/system", icon: Server, show: (p) => p.can("masters.view") },
];

function NavGroup({ label, items, isActive }: { label: string; items: Item[]; isActive: (url: string) => boolean }) {
  if (items.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const perms = usePerms();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Tractor className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-sidebar-foreground">KrushiVidhya</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                Mahindra Tractor Dealership
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Sales" items={SALES_ITEMS.filter((i) => i.show(perms))} isActive={isActive} />
        <NavGroup label="Operations" items={OPS_ITEMS.filter((i) => i.show(perms))} isActive={isActive} />
        <NavGroup label="Service" items={SERVICE_ITEMS.filter((i) => i.show(perms))} isActive={isActive} />
        <NavGroup label="Master" items={MASTER_ITEMS.filter((i) => i.show(perms))} isActive={isActive} />

        {perms.isManagement && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/team")} tooltip="Team & Roles">
                    <Link to="/team" className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      <span>Team &amp; Roles</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
