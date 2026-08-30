import { useMe, type AppRole } from "@/lib/auth";

export type Perm =
  | "inquiry.create" | "inquiry.edit" | "inquiry.delete"
  | "customer.edit" | "customer.delete"
  | "booking.create" | "booking.edit" | "booking.cancel" | "booking.delete"
  | "stock.add" | "stock.edit" | "stock.delete" | "stock.allocate"
  | "delivery.manage"
  | "subsidy.edit"
  | "passing.edit"
  | "payment.add" | "payment.edit"
  | "service.register" | "service.edit" | "service.close" | "service.delete"
  | "jobcard.manage"
  | "spares.raise" | "spares.fulfill" | "spares.delete"
  | "routes.manage"
  | "hr.view" | "hr.manage" | "payroll.view" | "payroll.manage"
  | "masters.view" | "masters.manage";

const MGMT: AppRole[] = ["ceo", "manager", "sales_manager"];

function capabilities(role: AppRole): Set<Perm> {
  const s = new Set<Perm>();
  const add = (...p: Perm[]) => p.forEach((x) => s.add(x));

  switch (role) {
    case "ceo":
    case "manager":
    case "sales_manager":
      add(
        "inquiry.create", "inquiry.edit", "inquiry.delete",
        "customer.edit", "customer.delete",
        "booking.create", "booking.edit", "booking.cancel", "booking.delete",
        "stock.add", "stock.edit", "stock.delete", "stock.allocate",
        "delivery.manage", "subsidy.edit", "passing.edit",
        "payment.add", "payment.edit",
        "service.register", "service.edit", "service.close", "service.delete",
        "jobcard.manage",
        "spares.raise", "spares.fulfill", "spares.delete",
        "routes.manage",
        "hr.view", "hr.manage", "payroll.view", "payroll.manage",
        "masters.view", "masters.manage",
      );
      break;
    case "salesman":
      add(
        "inquiry.create", "inquiry.edit",
        "customer.edit",
        "booking.create", "booking.edit",
        "stock.allocate",
        "delivery.manage", "subsidy.edit", "passing.edit",
        "service.register",
        "spares.raise",
      );
      break;
    case "mechanic":
      add(
        "service.register", "service.edit", "service.close",
        "jobcard.manage",
        "spares.raise",
        "routes.manage",
      );
      break;
    case "service_manager":
    case "workshop_manager":
      add(
        "service.register", "service.edit", "service.close",
        "jobcard.manage",
        "spares.raise",
        "routes.manage",
      );
      break;
    case "sparepart_manager":
      add(
        "service.register", "service.edit",
        "spares.raise", "spares.fulfill",
      );
      break;
    case "accountant":
      add(
        "stock.add", "stock.edit",
        "delivery.manage", "subsidy.edit", "passing.edit",
        "payment.add", "payment.edit",
      );
      break;
    case "receptionist":
      add("inquiry.create", "service.register");
      break;
  }
  return s;
}

export function usePerms() {
  const { data: me } = useMe();
  const roles = me?.roles ?? [];
  const isManagement = !!me?.isManagement;
  const caps = new Set<Perm>();
  roles.forEach((r) => capabilities(r).forEach((p) => caps.add(p)));

  return {
    roles,
    isManagement,
    can: (p: Perm) => caps.has(p),
    canAny: (...p: Perm[]) => p.some((x) => caps.has(x)),
    hasRole: (r: AppRole) => roles.includes(r),
    isSalesman: roles.includes("salesman") || roles.includes("sales_manager"),
    isWorkshop: roles.includes("mechanic") || roles.includes("service_manager") || roles.includes("workshop_manager"),
    isSparepart: roles.includes("sparepart_manager"),
    isAccountant: roles.includes("accountant"),
    MGMT,
  };
}
