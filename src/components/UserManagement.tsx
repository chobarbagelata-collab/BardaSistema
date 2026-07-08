import React, { useState, useEffect } from 'react';
import { User, UserRole, UserPermissions, DEFAULT_PERMISSIONS_BY_ROLE, Invitation, Permission } from '../types';
import { 
  Users, Mail, Shield, ShieldAlert, Plus, Trash2, Key, Check, Copy, CheckCircle, 
  Eye, Edit3, X, UserX, UserCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "../firebase";

interface UserManagementProps {
  currentUser: User;
  onLogout: () => void;
}

export default function UserManagement({ currentUser, onLogout }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating a new invitation
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Vendedor');
  const [invitePermissions, setInvitePermissions] = useState<UserPermissions>({
    ...DEFAULT_PERMISSIONS_BY_ROLE.Vendedor
  });

  // Editing existing user states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<UserPermissions | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);

  // Status and messages
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load users and invitations from Firestore
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch users from Firestore
      const usersSnapshot = await getDocs(collection(db, "barda_users"));
      const fetchedUsers: User[] = [];
      usersSnapshot.forEach((docSnap) => {
        fetchedUsers.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsers(fetchedUsers);

      // 2. Fetch invitations from Firestore
      const invitesSnapshot = await getDocs(collection(db, "barda_invitations"));
      const fetchedInvites: Invitation[] = [];
      invitesSnapshot.forEach((docSnap) => {
        fetchedInvites.push({ id: docSnap.id, ...docSnap.data() } as Invitation);
      });
      setInvitations(fetchedInvites);
    } catch (e) {
      console.error('Error loading users/invitations from Firestore', e);
      setErrorMsg('Error al conectar con la base de datos de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  // When inviteRole changes, preset permissions
  const handleRoleChange = (role: UserRole) => {
    setInviteRole(role);
    setInvitePermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE[role] });
  };

  const handleEditRoleChange = (role: UserRole) => {
    setEditRole(role);
    setEditPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE[role] });
  };

  // Toggle permission checkbox
  const togglePermission = (section: keyof UserPermissions, type: 'view' | 'edit') => {
    setInvitePermissions(prev => {
      const updatedSection = { ...prev[section], [type]: !prev[section][type] };
      
      // If edit is true, view must be true
      if (type === 'edit' && updatedSection.edit) {
        updatedSection.view = true;
      }
      // If view is false, edit must be false
      if (type === 'view' && !updatedSection.view) {
        updatedSection.edit = false;
      }

      const nextPerms = { ...prev, [section]: updatedSection };
      
      // Check if it matches any standard role, otherwise label as Personalizado
      determineRoleAndSet(nextPerms, setInviteRole);

      return nextPerms;
    });
  };

  const toggleEditPermission = (section: keyof UserPermissions, type: 'view' | 'edit') => {
    if (!editPermissions) return;
    setEditPermissions(prev => {
      if (!prev) return null;
      const updatedSection = { ...prev[section], [type]: !prev[section][type] };
      
      if (type === 'edit' && updatedSection.edit) {
        updatedSection.view = true;
      }
      if (type === 'view' && !updatedSection.view) {
        updatedSection.edit = false;
      }

      const nextPerms = { ...prev, [section]: updatedSection };
      
      determineRoleAndSet(nextPerms, setEditRole);

      return nextPerms;
    });
  };

  const determineRoleAndSet = (perms: UserPermissions, setRoleFn: (role: UserRole) => void) => {
    let matchedRole: UserRole = 'Personalizado';
    
    // Check match
    const roles: UserRole[] = ['Administrador', 'Vendedor', 'Taller', 'Administrativo'];
    for (const r of roles) {
      const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[r];
      let match = true;
      for (const section of Object.keys(perms) as Array<keyof UserPermissions>) {
        if (perms[section].view !== defaultPerms[section].view || perms[section].edit !== defaultPerms[section].edit) {
          match = false;
          break;
        }
      }
      if (match) {
        matchedRole = r;
        break;
      }
    }
    setRoleFn(matchedRole);
  };

  // Create Invitation
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!inviteName.trim() || !inviteEmail.trim()) {
      setErrorMsg('Por favor complete todos los campos de la invitación.');
      return;
    }

    // Verify if email already registered
    if (users.some(u => u.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      setErrorMsg('Este correo ya está registrado en el sistema.');
      return;
    }

    // Generate custom code: INV-XXXX
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars like 1, 0, I, O
    let code = 'INV-';
    for (let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const newInvite: Invitation = {
      id: 'invite-' + Date.now(),
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      code,
      role: inviteRole,
      permissions: invitePermissions,
      status: 'pendiente',
      createdAt: new Date().toISOString()
    };

    try {
      // Save invitation directly to Firestore
      await setDoc(doc(db, "barda_invitations", newInvite.id), newInvite);
      
      const updatedInvites = [...invitations, newInvite];
      setInvitations(updatedInvites);

      // Clear form
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Vendedor');
      setInvitePermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE.Vendedor });
      setSuccessMsg(`Invitación generada con código ${code}`);
    } catch (err) {
      console.error("Error creating invitation in Firestore:", err);
      setErrorMsg("No se pudo guardar la invitación en la base de datos.");
    }
  };

  // Copy invitation code/details
  const handleCopyCode = (inv: Invitation) => {
    const textToCopy = `Hola ${inv.name}, te invito al sistema Barda.\nRegistrate aquí usando el código de invitación: ${inv.code}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCode(inv.code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Delete/Cancel invitation
  const handleDeleteInvite = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar esta invitación pendiente?')) return;
    try {
      await deleteDoc(doc(db, "barda_invitations", id));
      const updated = invitations.filter(i => i.id !== id);
      setInvitations(updated);
      setSuccessMsg('Invitación cancelada.');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      console.error("Error deleting invitation:", err);
      setErrorMsg("Error al eliminar la invitación.");
    }
  };

  // Save changes to existing user
  const handleSaveUserPermissions = async () => {
    if (!editingUser || !editPermissions || !editRole) return;

    // Admin safety check: Cannot remove own admin role or own user permission
    if (editingUser.id === currentUser.id && editRole !== 'Administrador') {
      alert('Por seguridad, no puedes quitarte el rol de Administrador a ti mismo.');
      return;
    }

    try {
      const updatedUserData = {
        role: editRole,
        permissions: editPermissions
      };

      // Save user permissions to Firestore
      await setDoc(doc(db, "barda_users", editingUser.id), updatedUserData, { merge: true });

      const updatedUsers = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            role: editRole,
            permissions: editPermissions
          };
        }
        return u;
      });

      setUsers(updatedUsers);

      // If we updated ourselves, refresh current user state too
      if (editingUser.id === currentUser.id) {
        const updatedSelf = updatedUsers.find(u => u.id === currentUser.id);
        if (updatedSelf) {
          localStorage.setItem('barda_current_user', JSON.stringify(updatedSelf));
          // Force refresh
          window.location.reload();
        }
      }

      setEditingUser(null);
      setEditPermissions(null);
      setEditRole(null);
      setSuccessMsg('Usuario actualizado con éxito');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Error updating user permissions:", err);
      setErrorMsg("Error al guardar los permisos en la base de datos.");
    }
  };

  // Delete / Revoke user access
  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('No puedes revocar tu propio acceso.');
      return;
    }

    if (!confirm(`¿Estás seguro de revocar permanentemente el acceso a ${user.name}? Se cerrará su sesión de inmediato.`)) return;

    try {
      // Delete user from Firestore
      await deleteDoc(doc(db, "barda_users", user.id));

      const updated = users.filter(u => u.id !== user.id);
      setUsers(updated);
      setSuccessMsg(`Acceso revocado a ${user.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Error revoking user access:", err);
      setErrorMsg("Error al revocar el acceso del usuario.");
    }
  };

  const sectionsList: Array<{ key: keyof UserPermissions; label: string }> = [
    { key: 'presupuestos', label: 'Presupuestos' },
    { key: 'ventas', label: 'Ventas y Pedidos' },
    { key: 'remitos', label: 'Remitos' },
    { key: 'fabricacion', label: 'Fabricación' },
    { key: 'finanzas', label: 'Finanzas' },
    { key: 'resumen', label: 'Resumen (Estadísticas)' },
    { key: 'usuarios', label: 'Usuarios y Permisos' }
  ];

  return (
    <div className="flex flex-col gap-8">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-sand p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="font-serif text-2xl font-bold text-brown flex items-center gap-2">
            <Users className="w-6 h-6 text-terra" />
            Gestión de Usuarios y Permisos
          </h2>
          <p className="text-xs text-stone mt-1">
            Invita a miembros de tu taller o administración, gestiona sus roles y configura accesos de forma modular.
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <div className="text-right">
            <div className="text-xs font-bold text-brown">{currentUser.name}</div>
            <div className="text-[10px] bg-terra/10 text-terra font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-0.5">
              {currentUser.role}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-sand hover:border-error hover:text-error text-stone rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CREATE INVITATION FORM */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-sand pb-3">
              <Plus className="w-5 h-5 text-terra" />
              <h3 className="font-serif text-lg font-bold text-brown">Enviar Nueva Invitación</h3>
            </div>

            <form onSubmit={handleCreateInvite} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Nombre del Invitado</label>
                <input
                  type="text"
                  placeholder="Ej. Martín Tallerista"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-sand rounded-lg focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="martin@barda.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-sand rounded-lg focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Rol de Plantilla</label>
                <select
                  value={inviteRole}
                  onChange={e => handleRoleChange(e.target.value as UserRole)}
                  className="w-full text-xs py-2 px-3 border border-sand rounded-lg focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra"
                >
                  <option value="Vendedor">Vendedor (Sillas/Mesas y Budgets)</option>
                  <option value="Taller">Taller (Solo fabricación de muebles)</option>
                  <option value="Administrativo">Administrativo (Ventas, Remitos y Finanzas)</option>
                  <option value="Administrador">Administrador Completo (Acceso total)</option>
                  <option value="Personalizado">Personalizado...</option>
                </select>
              </div>

              {/* GRANULAR CHECKBOXES */}
              <div className="flex flex-col gap-3 bg-light-cream/40 border border-sand p-4 rounded-xl mt-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-stone border-b border-sand/40 pb-1.5 mb-1">
                  <span>Módulo / Sección</span>
                  <div className="flex gap-6">
                    <span className="w-8 text-center">Ver</span>
                    <span className="w-8 text-center">Edit</span>
                  </div>
                </div>

                {sectionsList.map(sec => (
                  <div key={sec.key} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-brown">{sec.label}</span>
                    <div className="flex gap-6">
                      <div className="w-8 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={invitePermissions[sec.key].view}
                          onChange={() => togglePermission(sec.key, 'view')}
                          className="rounded text-terra focus:ring-terra cursor-pointer"
                        />
                      </div>
                      <div className="w-8 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={invitePermissions[sec.key].edit}
                          onChange={() => togglePermission(sec.key, 'edit')}
                          className="rounded text-terra focus:ring-terra cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brown hover:bg-terra text-cream hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer shadow-sm"
              >
                Generar Código de Invitación
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: USERS LIST & INVITATION CODES */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* USER DIRECTORY */}
          <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-sand pb-3">
              <Users className="w-5 h-5 text-terra" />
              <h3 className="font-serif text-lg font-bold text-brown">Directorio de Usuarios</h3>
            </div>

            <div className="flex flex-col gap-4">
              {users.map(user => {
                const isSelf = user.id === currentUser.id;
                const isEditingThis = editingUser?.id === user.id;

                return (
                  <div 
                    key={user.id} 
                    className={`p-4 border rounded-xl flex flex-col gap-3 transition-all ${isEditingThis ? 'border-terra bg-amber-50/5' : 'border-sand/60 hover:bg-light-cream/20'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brown/5 text-brown font-bold flex items-center justify-center font-serif text-sm border border-sand">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-brown flex items-center gap-1.5">
                            {user.name}
                            {isSelf && (
                              <span className="text-[9px] bg-brown text-cream px-1.5 py-0.5 rounded font-bold font-sans">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone mt-0.5">{user.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isEditingThis ? (
                          <button
                            onClick={handleSaveUserPermissions}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 flex items-center gap-1 transition-all"
                            title="Confirmar cambios"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Guardar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditPermissions({ ...user.permissions });
                              setEditRole(user.role);
                            }}
                            className="p-1.5 border border-sand hover:border-terra hover:text-terra text-stone rounded-lg hover:bg-white flex items-center justify-center transition-all"
                            title="Editar permisos"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          disabled={isSelf}
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 border border-sand hover:border-error hover:text-error text-stone rounded-lg hover:bg-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Revocar acceso"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* DYNAMIC MODULAR PERMISSIONS CARD BLOCK */}
                    {isEditingThis && editPermissions && editRole ? (
                      <div className="mt-2 p-4 bg-white border border-sand/60 rounded-xl flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] uppercase font-bold text-stone">Modificar Rol de Plantilla</label>
                          <select
                            value={editRole}
                            onChange={e => handleEditRoleChange(e.target.value as UserRole)}
                            className="text-xs py-1.5 px-2.5 border border-sand rounded-lg focus:outline-none bg-white"
                          >
                            <option value="Vendedor">Vendedor</option>
                            <option value="Taller">Taller</option>
                            <option value="Administrativo">Administrativo</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Personalizado">Personalizado...</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2 mt-1">
                          <div className="flex justify-between items-center text-[9px] uppercase font-bold text-stone border-b border-sand/40 pb-1 mb-0.5">
                            <span>Módulo</span>
                            <div className="flex gap-6 font-mono">
                              <span className="w-6 text-center">Ver</span>
                              <span className="w-6 text-center">Edit</span>
                            </div>
                          </div>

                          {sectionsList.map(sec => (
                            <div key={sec.key} className="flex justify-between items-center text-[11px]">
                              <span className="font-medium text-brown">{sec.label}</span>
                              <div className="flex gap-6">
                                <div className="w-6 flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={editPermissions[sec.key].view}
                                    onChange={() => toggleEditPermission(sec.key, 'view')}
                                    className="rounded text-terra cursor-pointer"
                                  />
                                </div>
                                <div className="w-6 flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={editPermissions[sec.key].edit}
                                    onChange={() => toggleEditPermission(sec.key, 'edit')}
                                    className="rounded text-terra cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 mt-1 pt-2 border-t border-sand/40">
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              setEditPermissions(null);
                              setEditRole(null);
                            }}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone border border-sand hover:border-stone rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 bg-light-cream/30 p-2.5 rounded-lg border border-sand/20">
                        {sectionsList.map(sec => {
                          const perm = user.permissions[sec.key];
                          if (!perm.view) return null;
                          return (
                            <span 
                              key={sec.key} 
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                perm.edit 
                                  ? 'bg-brown/5 text-brown border-brown/20' 
                                  : 'bg-sand/20 text-stone border-sand/40'
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full ${perm.edit ? 'bg-terra' : 'bg-stone'}`}></span>
                              {sec.label} ({perm.edit ? 'Edit' : 'Ver'})
                            </span>
                          );
                        })}
                        {(Object.values(user.permissions) as Permission[]).every(p => !p.view) && (
                          <span className="text-[10px] text-stone italic">Sin accesos configurados.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE INVITATIONS PANEL */}
          <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-sand pb-3">
              <Sparkles className="w-5 h-5 text-terra" />
              <h3 className="font-serif text-lg font-bold text-brown">Invitaciones Pendientes</h3>
            </div>

            {invitations.filter(i => i.status === 'pendiente').length === 0 ? (
              <div className="text-center py-8 text-stone text-xs italic">
                No hay invitaciones activas pendientes de registro.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {invitations.filter(i => i.status === 'pendiente').map(inv => {
                  const isCopied = copiedCode === inv.code;

                  return (
                    <div key={inv.id} className="p-3.5 border border-sand/55 bg-light-cream/10 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-brown flex items-center gap-2">
                          {inv.name}
                          <span className="text-[8px] bg-terra text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">
                            {inv.code}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone mt-0.5">{inv.email} · Rol: {inv.role}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyCode(inv)}
                          className={`p-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                            isCopied 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-cream/40 border border-sand hover:border-terra text-brown hover:text-terra'
                          }`}
                          title="Copiar código de registro"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(inv.id)}
                          className="p-1.5 border border-sand hover:border-error hover:text-error text-stone rounded-lg hover:bg-white flex items-center justify-center transition-all"
                          title="Cancelar invitación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
