export type UserRole = 'Administrador' | 'Vendedor' | 'Taller' | 'Administrativo' | 'Personalizado';

export interface Permission {
  view: boolean;
  edit: boolean;
}

export interface UserPermissions {
  presupuestos: Permission;
  ventas: Permission;
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
    remitos: { view: true, edit: true },
    fabricacion: { view: true, edit: true },
    finanzas: { view: true, edit: true },
    resumen: { view: true, edit: true },
    usuarios: { view: true, edit: true },
  },
  Vendedor: {
    presupuestos: { view: true, edit: true },
    ventas: { view: true, edit: false },
    remitos: { view: true, edit: false },
    fabricacion: { view: true, edit: false },
    finanzas: { view: false, edit: false },
    resumen: { view: false, edit: false },
    usuarios: { view: false, edit: false },
  },
  Taller: {
    presupuestos: { view: false, edit: false },
    ventas: { view: false, edit: false },
    remitos: { view: false, edit: false },
    fabricacion: { view: true, edit: true },
    finanzas: { view: false, edit: false },
    resumen: { view: false, edit: false },
    usuarios: { view: false, edit: false },
  },
  Administrativo: {
    presupuestos: { view: true, edit: true },
    ventas: { view: true, edit: true },
    remitos: { view: true, edit: true },
    fabricacion: { view: true, edit: false },
    finanzas: { view: true, edit: true },
    resumen: { view: true, edit: false },
    usuarios: { view: false, edit: false },
  },
  Personalizado: {
    presupuestos: { view: false, edit: false },
    ventas: { view: false, edit: false },
    remitos: { view: false, edit: false },
    fabricacion: { view: false, edit: false },
    finanzas: { view: false, edit: false },
    resumen: { view: false, edit: false },
    usuarios: { view: false, edit: false },
  },
};
