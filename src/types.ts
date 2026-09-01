export interface OrderAttachment {
  id: string;
  name: string;
  type: string;
  size?: number;
  dataUrl: string;
}

export type UserRole = 'Administrador' | 'Vendedor' | 'Taller' | 'Administrativo' | 'Personalizado';

export interface Permission {
  view: boolean;
  edit: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  detail: string;
  qty: number;
  costUnit: number;
  priceSuggested: number;
  minAlertQty?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  stockItemId?: string;
  itemId?: string;
  itemName: string;
  type: 'IN_COMPRA' | 'IN_FABRICACION' | 'OUT_VENTA' | 'AJUSTE';
  qty: number;
  costUnit?: number;
  unitCost?: number;
  totalCost: number;
  relatedOrderId?: string | number;
  relatedOrderNum?: string;
  account?: string; // 'Santander' | 'Uala' | 'Efectivo'
  notes?: string;
  date: string;
  createdBy?: string;
  createdAt?: string;
}

export interface UserPermissions {
  presupuestos: Permission;
  ventas: Permission;
  stock: Permission;
  remitos: Permission;
  fabricacion: Permission;
  finanzas: Permission;
  resumen: Permission;
  usuarios: Permission;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Stored in localStorage for client-side authentication
  role: UserRole;
  permissions: UserPermissions;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  name: string;
  code: string; // e.g., "INV-A1B2"
  role: UserRole;
  permissions: UserPermissions;
  status: 'pendiente' | 'aceptada';
  createdAt: string;
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
  Administrador: {
    presupuestos: { view: true, edit: true },
    ventas: { view: true, edit: true },
    stock: { view: true, edit: true },
    remitos: { view: true, edit: true },
    fabricacion: { view: true, edit: true },
    finanzas: { view: true, edit: true },
    resumen: { view: true, edit: true },
    usuarios: { view: true, edit: true },
  },
  Vendedor: {
    presupuestos: { view: true, edit: true },
    ventas: { view: true, edit: false },
    stock: { view: true, edit: true },
    remitos: { view: true, edit: false },
    fabricacion: { view: true, edit: false },
    finanzas: { view: false, edit: false },
    resumen: { view: false, edit: false },
    usuarios: { view: false, edit: false },
  },
  Taller: {
    presupuestos: { view: false, edit: false },
    ventas: { view: false, edit: false },
    stock: { view: true, edit: true },
    remitos: { view: false, edit: false },
    fabricacion: { view: true, edit: true },
    finanzas: { view: false, edit: false },
    resumen: { view: false, edit: false },
    usuarios: { view: false, edit: false },
  },
  Administrativo: {
    presupuestos: { view: true, edit: true },
    ventas: { view: true, edit: true },
    stock: { view: true, edit: true },
    remitos: { view: true, edit: true },
    fabricacion: { view: true, edit: false },
    finanzas: { view: true, edit: true },
    resumen: { view: true, edit: false },
    usuarios: { view: false, edit: false },
  },
  Personalizado: {
    presupuestos: { view: false, edit: false },
    ventas: { view: false, edit: false },
    stock: { view: false, edit: false },
    remitos: { view: false, edit: false },
    fabricacion: { view: false, edit: false },
    finanzas: { view: false, edit: false },
    resumen: { view: false, edit: false },
    usuarios: { view: false, edit: false },
  },
};

export const formatAbbreviatedName = (name: string): string => {
  if (!name) return '';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
  return initials;
};

export const normalizeUserPermissions = (user: User | null): User | null => {
  if (!user) return null;
  const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[user.role] || DEFAULT_PERMISSIONS_BY_ROLE.Administrador;
  const currentPermissions = user.permissions || ({} as Partial<UserPermissions>);
  return {
    ...user,
    permissions: {
      presupuestos: currentPermissions.presupuestos || roleDefaults.presupuestos,
      ventas: currentPermissions.ventas || roleDefaults.ventas,
      stock: currentPermissions.stock || roleDefaults.stock || { view: true, edit: true },
      remitos: currentPermissions.remitos || roleDefaults.remitos,
      fabricacion: currentPermissions.fabricacion || roleDefaults.fabricacion,
      finanzas: currentPermissions.finanzas || roleDefaults.finanzas,
      resumen: currentPermissions.resumen || roleDefaults.resumen,
      usuarios: currentPermissions.usuarios || roleDefaults.usuarios,
    }
  };
};
