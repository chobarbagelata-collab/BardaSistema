import React, { useState, useEffect } from 'react';
import { User, UserRole, UserPermissions, DEFAULT_PERMISSIONS_BY_ROLE, Invitation } from '../types';
import { Key, Mail, User as UserIcon, LogIn, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { auth, db } from "../firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs 
} from "firebase/firestore";
import { migrateAllLocalStorageToFirestore } from '../firebaseSync';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);

  // Form toggle: 'login' | 'register'
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Error/Success messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if system has any registered users in Firestore
  useEffect(() => {
    const checkUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "barda_users"));
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedUsers.push({ id: docSnap.id, ...docSnap.data() } as User);
        });
        if (fetchedUsers.length === 0) {
          setIsFirstRun(true);
          setFormMode('register');
        } else {
          setIsFirstRun(false);
          setFormMode('login');
        }
      } catch (err) {
        // If query fails (e.g. Missing/insufficient permissions because collection is protected),
        // we assume the system is already configured and secure. Default to login.
        console.warn("Firestore connection secured/cached. Defaulting to login screen.");
        setIsFirstRun(false);
        setFormMode('login');
      } finally {
        setLoading(false);
      }
    };
    checkUsers();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      // 1. FIRST RUN: CREATE ADMIN ACCOUNT DIRECTLY
      if (isFirstRun) {
        if (!name.trim()) {
          setError('Por favor ingrese su nombre para el perfil de Administrador.');
          return;
        }

        setSuccess('Creando cuenta de administrador en el servidor...');
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const fbUser = userCredential.user;

        const adminUser: User = {
          id: fbUser.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: '',
          role: 'Administrador',
          permissions: DEFAULT_PERMISSIONS_BY_ROLE.Administrador,
          createdAt: new Date().toISOString(),
        };

        // Save admin user in Firestore
        await setDoc(doc(db, "barda_users", fbUser.uid), adminUser);
        
        // Migrate legacy localStorage data to Firestore if it exists
        await migrateAllLocalStorageToFirestore();

        localStorage.setItem('barda_current_user', JSON.stringify(adminUser));
        
        setSuccess('¡Cuenta de Administrador creada con éxito!');
        setTimeout(() => {
          onLoginSuccess(adminUser);
        }, 1200);
        return;
      }

      // 2. REGISTER MODE (WITH INVITATION)
      if (formMode === 'register') {
        if (!name.trim()) {
          setError('Por favor ingrese su nombre.');
          return;
        }
        if (!inviteCode.trim()) {
          setError('Por favor ingrese el código de invitación provisto por el Administrador.');
          return;
        }

        setSuccess('Verificando código de invitación...');
        // Read the exact invitation from Firestore using inviteCode as document ID
        const inviteDocRef = doc(db, "barda_invitations", inviteCode.trim().toUpperCase());
        const inviteSnap = await getDoc(inviteDocRef);

        if (!inviteSnap.exists()) {
          setError('Código de invitación inválido, expirado o ya utilizado.');
          return;
        }

        const invitation = { id: inviteSnap.id, ...inviteSnap.data() } as Invitation;

        if (invitation.status !== 'pendiente') {
          setError('Esta invitación ya ha sido utilizada o no está activa.');
          return;
        }

        // Register in Firebase Auth
        setSuccess('Registrando cuenta en el servidor...');
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const fbUser = userCredential.user;

        // Create new user using invitation permissions and role
        const newUser: User = {
          id: fbUser.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: '',
          role: invitation.role,
          permissions: invitation.permissions,
          createdAt: new Date().toISOString(),
        };

        // Save new user to Firestore
        await setDoc(doc(db, "barda_users", fbUser.uid), newUser);

        // Mark invitation as accepted in Firestore
        await setDoc(doc(db, "barda_invitations", invitation.id), { status: 'aceptada' }, { merge: true });

        localStorage.setItem('barda_current_user', JSON.stringify(newUser));

        setSuccess(`¡Registro completado con éxito con rol de ${invitation.role}!`);
        setTimeout(() => {
          onLoginSuccess(newUser);
        }, 1200);
        return;
      }

      // 3. LOGIN MODE
      if (formMode === 'login') {
        setSuccess('Iniciando sesión en el servidor...');
        const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const fbUser = userCredential.user;

        // Fetch profile from Firestore
        const userDoc = await getDoc(doc(db, "barda_users", fbUser.uid));
        if (!userDoc.exists()) {
          setError('No se encontró el perfil de usuario en la base de datos de Barda.');
          return;
        }

        const matchedUser = userDoc.data() as User;
        
        // Migrate legacy localStorage data to Firestore if they are administrator logging in
        if (matchedUser.role === 'Administrador') {
          await migrateAllLocalStorageToFirestore();
        }

        localStorage.setItem('barda_current_user', JSON.stringify(matchedUser));
        setSuccess('Sesión iniciada con éxito. Cargando...');
        setTimeout(() => {
          onLoginSuccess(matchedUser);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya se encuentra registrado.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Correo electrónico o contraseña incorrectos.');
      } else {
        setError(err.message || 'Ocurrió un error inesperado durante la autenticación.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-cream p-4">
        <div className="text-center flex flex-col gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown mx-auto"></div>
          <div className="text-stone text-xs font-mono">Conectando con Firebase...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-cream p-4">
      <div className="w-full max-w-md bg-white border border-sand rounded-2xl shadow-md p-8 flex flex-col gap-6">
        
        {/* LOGO & HERO */}
        <div className="text-center flex flex-col gap-2">
          <div className="font-serif text-4xl font-bold tracking-tight text-brown">Barda</div>
          <div className="font-sans text-xs tracking-widest text-terra font-semibold uppercase">Presupuestos y Ventas</div>
          
          {isFirstRun ? (
            <div className="mt-4 p-3 bg-amber-50 border border-terra/20 rounded-xl flex items-start gap-2.5 text-left">
              <ShieldAlert className="w-5 h-5 text-terra shrink-0 mt-0.5" />
              <div className="text-[11px] text-brown leading-relaxed">
                <strong>Configuración Inicial del Sistema:</strong> No se detectan usuarios registrados. Por favor cree la cuenta del <strong>Administrador Principal</strong>.
              </div>
            </div>
          ) : (
            <p className="text-stone text-xs mt-1">
              {formMode === 'login' ? 'Inicie sesión para acceder a las planillas.' : 'Regístrese usando su código de invitación.'}
            </p>
          )}
        </div>

        {/* ALERTS */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* AUTH FORM */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {/* NAME FIELD (ONLY FOR REGISTRATION/FIRST-RUN) */}
          {(formMode === 'register' || isFirstRun) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Nombre Completo</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone/60">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs py-2.5 pl-10 pr-4 border border-sand bg-white text-brown rounded-lg focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra/30"
                  required
                />
              </div>
            </div>
          )}

          {/* EMAIL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Correo Electrónico</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-stone/60">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 border border-sand bg-white text-brown rounded-lg focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra/30"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-stone/60">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 border border-sand bg-white text-brown rounded-lg focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra/30"
                required
              />
            </div>
          </div>

          {/* INVITATION CODE (ONLY FOR REGISTRATION, EXCLUDING FIRST RUN) */}
          {formMode === 'register' && !isFirstRun && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-wider uppercase font-bold text-stone">Código de Invitación</label>
              <input
                type="text"
                placeholder="Ej. INV-8A4F"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full text-xs py-2.5 px-3 border border-terra/40 bg-amber-50/10 text-brown rounded-lg uppercase font-mono tracking-widest text-center focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra/30"
                required
              />
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full py-3 bg-brown text-cream hover:bg-terra hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 mt-2 cursor-pointer shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            {isFirstRun ? 'Crear Administrador Principal' : formMode === 'login' ? 'Iniciar Sesión' : 'Registrarme'}
          </button>
        </form>

        {/* TOGGLE FORM MODE */}
        {!isFirstRun && (
          <div className="border-t border-sand pt-4 text-center flex flex-col gap-2">
            {formMode === 'login' ? (
              <p className="text-xs text-stone">
                ¿Fuiste invitado al sistema?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('register');
                    setError('');
                  }}
                  className="text-terra font-bold hover:underline cursor-pointer"
                >
                  Regístrate aquí
                </button>
              </p>
            ) : (
              <p className="text-xs text-stone">
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('login');
                    setError('');
                  }}
                  className="text-terra font-bold hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            )}

            <div className="text-[11px] text-stone/70 pt-1 border-t border-dashed border-sand/60">
              ¿Eres el Administrador/Dueño y es tu primer ingreso?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsFirstRun(true);
                  setFormMode('register');
                  setError('');
                }}
                className="text-brown font-bold hover:underline cursor-pointer"
              >
                Configurar Administrador Principal
              </button>
            </div>
          </div>
        )}

        {isFirstRun && (
          <div className="border-t border-sand pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsFirstRun(false);
                setFormMode('login');
                setError('');
              }}
              className="text-xs text-stone hover:text-brown font-bold hover:underline cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
