import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Trash2, Printer, Check, RefreshCw, FileText, 
  DollarSign, TrendingUp, ShoppingBag, Users, Calendar, 
  ChevronDown, ChevronUp, Sliders, Edit, Edit2, Tag, Eye, EyeOff, 
  CheckCircle, Clock, Package, AlertCircle, Pencil, Wrench, Layers,
  Download, BarChart2, Paperclip, Image as ImageIcon, Upload, X, File, ExternalLink, Wallet,
  User as UserIcon, LogOut, ShieldCheck
} from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import UserManagement from './components/UserManagement';
import { BardaLogo, BardaLogoIcon } from './components/BardaLogo';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { CommercialFunnelDashboard } from './components/CommercialFunnelDashboard';
import { PresupuestosEstadosDashboard, QuoteLogItem } from './components/PresupuestosEstadosDashboard';
import { User, UserPermissions, DEFAULT_PERMISSIONS_BY_ROLE, formatAbbreviatedName } from './types';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { fetchFirestoreCollection, saveCollectionBatch } from './firebaseSync';

// BRAND COLORS & ESTHETICS PRE-CONFIGURED VIA INDEX.CSS:
// --brown: #3D1F0D, --terra: #C47A3A, --cream: #F2E8D9, --light-cream: #FAF6F0
// --sand: #E8DDD0, --stone: #9E8878, --white: #FFFDF9, --error: #B94040

const API_URL = 'https://script.google.com/macros/s/AKfycbxJZBAhXO_D-tJjy6Wnp40Tl0ZZdJuDYfMhQIKopaSWGPZ8olLW1IDuoUsPSfM78-FM/exec';
const FABRIC_NAMES = ['Lienzo', 'Lino', 'Pana', 'Funda Tusor', 'Sin Tela'];

const MONTHS_LIST = [
  { value: 'todos', label: 'Todos los Meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

const COSTS_SHEET_ID = '1ngLIZRzbQfNT1nGowP1eQOXaZnYSXUSIXRdGlkHWq5M';
const COSTS_GIDS = {
  chairs: '0',
  tables: '140221064',
  circular: '1524091639',
  ratonas: '925128248'
};

const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split(/\r?\n/);
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
};

const parsePagosCSV = (csvRows: string[][]) => {
  const list: any[] = [];
  for (let i = 0; i < csvRows.length; i++) {
    const cols = csvRows[i];
    if (cols.length >= 3) {
      const name = cols[1]?.trim();
      const recargoRaw = cols[2]?.trim();
      if (name && recargoRaw && !recargoRaw.toLowerCase().includes('recargo')) {
        const isPercent = recargoRaw.endsWith('%');
        let recargo = 0;
        if (isPercent) {
          recargo = parseFloat(recargoRaw.replace('%', '').trim()) / 100;
        } else {
          recargo = parseFloat(recargoRaw) || 0;
        }
        list.push({ name, recargo });
      }
    }
  }
  return list;
};

const generateFallbackCostsCatalog = (priceCat: any) => {
  const defaultCostFactor = 0.55;

  const estimateChairs = (priceCat.chairs || []).map((chair: any) => {
    const estimatedPrices: any = {};
    Object.entries(chair.prices || {}).forEach(([wood, fabricPrices]: [string, any]) => {
      estimatedPrices[wood] = {};
      Object.entries(fabricPrices || {}).forEach(([fabric, price]: [string, any]) => {
        estimatedPrices[wood][fabric] = Math.round(price * defaultCostFactor);
      });
    });
    return { name: chair.name, prices: estimatedPrices };
  });

  const estimateTables = (priceCat.tables || []).map((t: any) => ({
    name: t.name,
    pricePerM2: Math.round(t.pricePerM2 * defaultCostFactor)
  }));

  const estimateCircular = (priceCat.circular || []).map((t: any) => ({
    name: t.name,
    pricePerM2: Math.round(t.pricePerM2 * defaultCostFactor)
  }));

  const estimateRatonas = (priceCat.ratonas || []).map((r: any) => ({
    name: r.name,
    pricePerM2: Math.round(r.pricePerM2 * defaultCostFactor)
  }));

  return {
    chairs: estimateChairs,
    tables: estimateTables,
    circular: estimateCircular,
    ratonas: estimateRatonas
  };
};

// FALLBACK PRESET CATALOG FOR OFFLINE / SANDBOX INSTANT LOAD
const DEFAULT_CHAIRS = [
  {
    name: "Silla Escandinava",
    prices: {
      PETIRIBI: { Lienzo: 120000, Lino: 135000, Pana: 145000, "Funda Tusor": 155000, "Sin Tela": 105000 },
      PARAISO: { Lienzo: 95000, Lino: 110000, Pana: 118000, "Funda Tusor": 125000, "Sin Tela": 85000 }
    }
  },
  {
    name: "Silla Wishbone",
    prices: {
      PETIRIBI: { Lienzo: 145000, Lino: 160000, Pana: 170000, "Funda Tusor": 180000, "Sin Tela": 130000 },
      PARAISO: { Lienzo: 115000, Lino: 130000, Pana: 138000, "Funda Tusor": 145000, "Sin Tela": 105000 }
    }
  },
  {
    name: "Silla Thonet",
    prices: {
      PETIRIBI: { Lienzo: 130000, Lino: 145000, Pana: 155000, "Funda Tusor": 165000, "Sin Tela": 115000 },
      PARAISO: { Lienzo: 100000, Lino: 115000, Pana: 123000, "Funda Tusor": 130000, "Sin Tela": 90000 }
    }
  }
];

const DEFAULT_TABLES = [
  { name: "Mesa Comedor Maciza", pricePerM2: 240000 },
  { name: "Mesa Comedor Enchapada", pricePerM2: 180000 },
  { name: "Microcemento", pricePerM2: 260000 }
];

const DEFAULT_CIRCULAR_TABLES = [
  { name: "Mesa Redonda Petiribí", pricePerM2: 280000 },
  { name: "Mesa Redonda Paraíso", pricePerM2: 220000 },
  { name: "Microcemento", pricePerM2: 290000 }
];

const DEFAULT_RATONAS = [
  { name: "Mesa Ratona Petiribí", pricePerM2: 190000 },
  { name: "Mesa Ratona Paraíso", pricePerM2: 150000 }
];

const DEFAULT_OPTIONS = {
  baseTypes: ["Base Madera Central", "Base Madera 4 Patas", "Base Hierro Central", "Base Hierro H", "Base Cruzada"],
  microColores: ["Gris Cemento", "Gris Plata", "Arena", "Charcoal (Gris Oscuro)", "Blanco Crudo"],
  microVeteados: ["Suave", "Medio", "Intenso"],
  microBrillos: ["Mate", "Satinado", "Brillante"],
  baseMaderaTypes: ["Base Madera Petiribí", "Base Madera Paraíso", "Base Madera Guatambú", "Base Cónica Madera", "Base Cruzada Madera"]
};

const DEFAULT_COLORS = {
  Lino: ["Crema", "Avena", "Beige", "Gris Claro", "Gris Topo"],
  Pana: ["Arena", "Rosa Viejo", "Mostaza", "Verde Musgo", "Grafito"],
  Panne: ["Camel", "Habano", "Chocolate", "Negro"]
};

const DEFAULT_PAGOS_DATA = [
  { name: 'Efectivo o Transferencia', recargo: -0.10 },
  { name: '3 cuotas sin interés', recargo: 0 },
  { name: '6 cuotas sin interés', recargo: 0.10 }
];

// Helper to safely format currency
const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '$ ' + Math.round(n).toLocaleString('es-AR');
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const titleCase = (s: string) => {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const generateDefaultFixedCosts = () => {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const dateObj = new Date();
  dateObj.setMonth(dateObj.getMonth() - 1);
  const prevMonthStr = dateObj.toISOString().substring(0, 7);

  const defaultCategories = [
    { category: 'Alquiler', description: 'Alquiler de Showroom y Depósito', amount: 450000 },
    { category: 'Sueldos', description: 'Sueldo personal de atención y administración', amount: 800000 },
    { category: 'Publicidad', description: 'Campaña Meta Ads & Google', amount: 250000 },
    { category: 'Servicios', description: 'Luz, Internet, Gas y Teléfono', amount: 80000 },
    { category: 'Impuestos', description: 'Monotributo e Ingresos Brutos', amount: 120000 }
  ];

  const list: any[] = [];
  defaultCategories.forEach((item, idx) => {
    list.push({
      id: Date.now() + idx,
      category: item.category,
      description: item.description,
      amount: item.amount,
      month: currentMonthStr
    });
    list.push({
      id: Date.now() + idx + 100,
      category: item.category,
      description: item.description,
      amount: item.amount,
      month: prevMonthStr
    });
  });
  return list;
};

const generateDefaultLedger = (loadedSales: any[]) => {
  const ledger: any[] = [];
  loadedSales.forEach((s, idx) => {
    const defaultAccount = s.paymentMethod?.toLowerCase().includes('cuotas') 
      ? 'Uala' 
      : s.paymentMethod?.toLowerCase().includes('transferencia') 
        ? 'Santander' 
        : 'Efectivo';
    
    const date = s.date || new Date().toISOString().split('T')[0];
    
    // Add Seña payment
    if (s.senaAmount > 0) {
      ledger.push({
        id: `sena-${s.id}-${idx}`,
        orderId: s.id,
        orderNum: s.orderNum,
        clientName: s.client?.nombre || 'Consumidor Final',
        date: date,
        amount: s.senaAmount,
        type: 'Seña',
        account: defaultAccount,
        paymentMethod: s.paymentMethod
      });
    }

    // Add Balance payment if status is 'Pagado'
    if (s.paymentStatus === 'Pagado') {
      const balanceAmount = s.total - (s.senaAmount || 0);
      if (balanceAmount > 0) {
        ledger.push({
          id: `balance-${s.id}-${idx}`,
          orderId: s.id,
          orderNum: s.orderNum,
          clientName: s.client?.nombre || 'Consumidor Final',
          date: date,
          amount: balanceAmount,
          type: 'Saldo',
          account: defaultAccount,
          paymentMethod: s.paymentMethod
        });
      }
    }
  });
  return ledger;
};

const DEFAULT_SAMPLE_QUOTES: QuoteLogItem[] = [
  {
    id: 10,
    quoteNum: '00000010',
    date: '2026-08-01',
    vencimiento: '2026-08-31',
    client: { nombre: 'Agustín Gómez', telefono: '11 4589 1234', cuit: '20-38491029-4', ciudad: 'CABA', provincia: 'Buenos Aires' },
    category: 'Online',
    subtotal: 1500000,
    discount: 0,
    totalValue: 1500000,
    status: 'Pendiente',
    paymentMethod: '3 cuotas sin interés',
    itemsCount: 6,
    items: [
      { id: 1, name: 'Silla Windsor Petiribí', qty: 6, unitPrice: 250000, detail: 'Madera Petiribí · Tapizado Lino Crema' }
    ]
  },
  {
    id: 9,
    quoteNum: '00000009',
    date: '2026-07-28',
    vencimiento: '2026-08-28',
    client: { nombre: 'María Emilia López', telefono: '11 5920 3847', cuit: '27-33920194-3', ciudad: 'San Isidro', provincia: 'Buenos Aires' },
    category: 'Showroom',
    subtotal: 3200000,
    discount: 320000,
    totalValue: 2880000,
    status: 'Venta',
    paymentMethod: 'Efectivo o Transferencia (-10%)',
    itemsCount: 1,
    items: [
      { id: 2, name: 'Mesa Franca Guatambú', qty: 1, unitPrice: 3200000, detail: '2.40m × 1.10m · Base Maciza' }
    ]
  },
  {
    id: 8,
    quoteNum: '00000008',
    date: '2026-07-25',
    vencimiento: '2026-08-25',
    client: { nombre: 'Ropa Online S.A.', telefono: '11 3829 1048', cuit: '30-71839201-9', ciudad: 'Vicente López', provincia: 'Buenos Aires' },
    category: 'Promoción',
    subtotal: 1850000,
    discount: 185000,
    totalValue: 1665000,
    status: 'Pendiente',
    paymentMethod: '3 cuotas sin interés',
    itemsCount: 4,
    items: [
      { id: 3, name: 'Silla Tulip Tapizada', qty: 4, unitPrice: 462500, detail: 'Madera Paraíso · Pana Mostaza' }
    ]
  },
  {
    id: 7,
    quoteNum: '00000007',
    date: '2026-07-20',
    vencimiento: '2026-08-20',
    client: { nombre: 'Consultoría M&M', telefono: '11 6729 4012', cuit: '30-68910293-8', ciudad: 'Palermo', provincia: 'CABA' },
    category: 'Consultoría',
    subtotal: 4100000,
    discount: 0,
    totalValue: 4100000,
    status: 'Enviado',
    paymentMethod: '6 cuotas sin interés (+10%)',
    itemsCount: 2,
    items: [
      { id: 4, name: 'Mesa Circular Microcemento', qty: 1, unitPrice: 2500000, detail: '1.40m Diámetro · Base Cónica' },
      { id: 5, name: 'Mesa Ratona Guatambú', qty: 1, unitPrice: 1600000, detail: '1.20m × 0.70m' }
    ]
  },
  {
    id: 6,
    quoteNum: '00000006',
    date: '2026-07-15',
    vencimiento: '2026-08-15',
    client: { nombre: 'Aquarella SRL', telefono: '11 2891 0482', cuit: '30-70928172-5', ciudad: 'Tigre', provincia: 'Buenos Aires' },
    category: 'Mayorista',
    subtotal: 5800000,
    discount: 580000,
    totalValue: 5220000,
    status: 'Aceptado',
    paymentMethod: 'Efectivo o Transferencia (-10%)',
    itemsCount: 12,
    items: [
      { id: 6, name: 'Silla Windsor Petiribí', qty: 12, unitPrice: 483333, detail: 'Madera Petiribí · Lino Gris Topo' }
    ]
  },
  {
    id: 5,
    quoteNum: '00000005',
    date: '2026-06-28',
    vencimiento: '2026-07-28',
    client: { nombre: 'Federico Rossi', telefono: '11 9201 4829', cuit: '20-31029384-2', ciudad: 'Belgrano', provincia: 'CABA' },
    category: 'Local',
    subtotal: 980000,
    discount: 0,
    totalValue: 980000,
    status: 'Vencido',
    paymentMethod: '3 cuotas sin interés',
    itemsCount: 2,
    items: [
      { id: 7, name: 'Silla Matera Paraíso', qty: 2, unitPrice: 490000, detail: 'Madera Paraíso · Panne Chocolate' }
    ]
  },
  {
    id: 4,
    quoteNum: '00000004',
    date: '2026-06-20',
    vencimiento: '2026-07-20',
    client: { nombre: 'Estudio Arquitectura Ruiz', telefono: '11 4819 2039', cuit: '30-71029384-1', ciudad: 'Recoleta', provincia: 'CABA' },
    category: 'Consultoría',
    subtotal: 2400000,
    discount: 240000,
    totalValue: 2160000,
    status: 'Rechazado',
    paymentMethod: 'Efectivo o Transferencia (-10%)',
    itemsCount: 1,
    items: [
      { id: 8, name: 'Mesa Franca Petiribí', qty: 1, unitPrice: 2400000, detail: '2.00m × 1.00m' }
    ]
  }
];

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('barda_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isFirebaseLoaded = useRef(false);

  // Monitor Firebase Authentication status dynamically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("./firebase");
          const userDoc = await getDoc(doc(db, "barda_users", fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setCurrentUser(userData);
            localStorage.setItem('barda_current_user', JSON.stringify(userData));
          }
        } catch (err) {
          console.warn("Offline or network issue fetching Firestore user, keeping cached local user session:", err);
          const stored = localStorage.getItem('barda_current_user');
          if (!stored && fbUser.email) {
            const fallbackUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              email: fbUser.email,
              passwordHash: '',
              role: 'Vendedor',
              permissions: DEFAULT_PERMISSIONS_BY_ROLE.Vendedor,
              createdAt: new Date().toISOString()
            };
            setCurrentUser(fallbackUser);
            localStorage.setItem('barda_current_user', JSON.stringify(fallbackUser));
          }
        }
      } else {
        // If explicitly signed out or no fbUser, keep local session if available or cleared
        const stored = localStorage.getItem('barda_current_user');
        if (!stored) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'presupuestos' | 'ventas' | 'resumen' | 'finanzas' | 'usuarios'>('presupuestos');
  const [ventasSubTab, setVentasSubTab] = useState<'ventas' | 'remitos' | 'fabricacion'>('ventas');
  const [presupuestosSubTab, setPresupuestosSubTab] = useState<'nuevo' | 'estados'>('nuevo');
  const [resumenViewMode, setResumenViewMode] = useState<'dashboard' | 'conversion'>('dashboard');
  const [addTab, setAddTab] = useState<'silla' | 'mesa' | 'circular' | 'ratona' | 'otro'>('silla');

  // User Dropdown and Profile states
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Financial States
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [paymentsLedger, setPaymentsLedger] = useState<any[]>([]);
  const [newFixedCost, setNewFixedCost] = useState({
    category: 'Alquiler',
    description: '',
    amount: '',
    month: new Date().toISOString().substring(0, 7),
    date: new Date().toISOString().split('T')[0],
    currency: 'ARS',
    account: 'Efectivo',
    iva: '0',
    pendingPayment: false
  });
  const [finanzasMonth, setFinanzasMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [finanzasYear, setFinanzasYear] = useState<string>(String(new Date().getFullYear()));
  const [finanzasPeriod, setFinanzasPeriod] = useState<'3M' | '6M' | '1Y'>('6M');
  const [paymentRegisterForm, setPaymentRegisterForm] = useState<{
    orderId: number | null;
    amount: string;
    account: string;
    currency: string;
    iva: string;
    pendingPayment: boolean;
    date: string;
    note: string;
  }>({
    orderId: null,
    amount: '',
    account: 'Efectivo',
    currency: 'ARS',
    iva: '0',
    pendingPayment: false,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [tesoreriaSubTab, setTesoreriaSubTab] = useState<'resumen' | 'ingresos' | 'egresos' | 'movimientos'>('resumen');
  const [movimientosSearch, setMovimientosSearch] = useState<string>('');
  const [movimientosTypeFilter, setMovimientosTypeFilter] = useState<'todos' | 'ingresos' | 'egresos' | 'pendientes'>('todos');
  const [editingMovement, setEditingMovement] = useState<any | null>(null);
  const [editMovementForm, setEditMovementForm] = useState({
    id: '',
    isFixedCost: false,
    isLedger: false,
    description: '',
    category: '',
    amount: '',
    baseAmount: '',
    iva: '0',
    currency: 'ARS',
    account: 'Efectivo',
    date: '',
    pendingPayment: false,
    clientName: '',
    note: ''
  });
  const [customIncomeForm, setCustomIncomeForm] = useState({
    concept: '',
    category: 'Aporte de Capital',
    amount: '',
    currency: 'ARS',
    account: 'Efectivo',
    iva: '0',
    pendingPayment: false,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Fabrication states
  const [fabCliente, setFabCliente] = useState({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
  const [fabNumero, setFabNumero] = useState('');
  const [fabFecha, setFabFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fabDeliveryDate, setFabDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [fabItems, setFabItems] = useState<any[]>([]);
  const [fabNotes, setFabNotes] = useState('');
  const [fabAttachments, setFabAttachments] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Helper function to process FileList or File[] into base64 attachments
  const processFilesToAttachments = (
    files: FileList | File[] | null,
    currentAttachments: any[],
    callback: (updated: any[]) => void
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const newItems: any[] = [];
    let processed = 0;

    fileArray.forEach(file => {
      if (file.size > 8 * 1024 * 1024) {
        alert(`El archivo ${file.name} es demasiado grande. Tamaño máximo permitido: 8MB.`);
        processed++;
        if (processed === fileArray.length && newItems.length > 0) {
          callback([...currentAttachments, ...newItems]);
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        newItems.push({
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl
        });
        processed++;
        if (processed === fileArray.length) {
          callback([...currentAttachments, ...newItems]);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === fileArray.length && newItems.length > 0) {
          callback([...currentAttachments, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });
  };
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [fabList, setFabList] = useState<any[]>([]);
  const [fabSubTab, setFabSubTab] = useState<'lista' | 'diseñador'>('lista');
  const [fabStatusFilter, setFabStatusFilter] = useState<string>('Todos');
  const [fabSearch, setFabSearch] = useState('');

  // Remitos states
  const [remitentesList, setRemitentesList] = useState<Array<{ id: string; nombre: string; cuit: string; telefono: string }>>([
    { id: 'rem-1', nombre: 'Barda Home', cuit: '30-71654321-9', telefono: '+54 9 11 1234-5678' }
  ]);
  const [remitoRemitente, setRemitoRemitente] = useState<{ id: string; nombre: string; cuit: string; telefono: string }>({
    id: 'rem-1',
    nombre: 'Barda Home',
    cuit: '30-71654321-9',
    telefono: '+54 9 11 1234-5678'
  });
  const [showManageRemitentesModal, setShowManageRemitentesModal] = useState(false);
  const [remitenteForm, setRemitenteForm] = useState({ nombre: '', cuit: '', telefono: '' });
  const [editingRemitenteId, setEditingRemitenteId] = useState<string | null>(null);

  const [remitoCliente, setRemitoCliente] = useState({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
  const [remitoNumero, setRemitoNumero] = useState('');
  const [remitoFecha, setRemitoFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remitoBultos, setRemitoBultos] = useState('');
  const [remitoDeliveryDate, setRemitoDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [remitoItems, setRemitoItems] = useState<any[]>([]);
  const [remitoAddTab, setRemitoAddTab] = useState<'silla' | 'mesa' | 'circular' | 'ratona' | 'otro'>('silla');

  // Remito Builder forms
  const [remitoSillaForm, setRemitoSillaForm] = useState({ model: '', wood: '', fabric: '', color: '' });
  const [remitoMesaForm, setMesaFormRemito] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
  const [remitoCircularForm, setCircularFormRemito] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
  const [remitoRatonaForm, setRatonaFormRemito] = useState({ wood: '', w: '', h: '' });
  const [remitoOtroForm, setOtroFormRemito] = useState({ nombre: '', detalle: '', precio: '' });

  // Price overrides inside Remitos builders
  const [remitoSillaOverride, setRemitoSillaOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });
  const [remitoMesaOverride, setRemitoMesaOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });
  const [remitoCircularOverride, setRemitoCircularOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });
  const [remitoRatonaOverride, setRemitoRatonaOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });

  // Price overrides inside Budget builders
  const [budgetSillaOverride, setBudgetSillaOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });
  const [budgetMesaOverride, setBudgetMesaOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });
  const [budgetCircularOverride, setBudgetCircularOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });
  const [budgetRatonaOverride, setBudgetRatonaOverride] = useState<{ value: number | null, editing: boolean }>({ value: null, editing: false });

  // Resumen (Dashboard) filter and categorization states
  const [resumenMonth, setResumenMonth] = useState<string>('todos');
  const [resumenYear, setResumenYear] = useState<string>('todos');
  const [subproductCategory, setSubproductCategory] = useState<string>('Sillas');

  // Local state for recording funnel entries (Registro de Embudo)
  const [funnelRegMonth, setFunnelRegMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [funnelRegYear, setFunnelRegYear] = useState<string>(String(new Date().getFullYear()));
  const [funnelRegPhones, setFunnelRegPhones] = useState<number>(0);
  const [funnelRegVisits, setFunnelRegVisits] = useState<number>(0);
  const [funnelSaveSuccess, setFunnelSaveSuccess] = useState<boolean>(false);

  // Sheet data loading state
  const [loading, setLoading] = useState(true);
  const [connStatus, setConnStatus] = useState<'connected' | 'cached' | 'fallback'>('connected');
  const [catalog, setCatalog] = useState({
    chairs: DEFAULT_CHAIRS,
    chairColors: DEFAULT_COLORS,
    tables: DEFAULT_TABLES,
    mesaOptions: DEFAULT_OPTIONS,
    circular: DEFAULT_CIRCULAR_TABLES,
    circularOptions: DEFAULT_OPTIONS,
    ratonas: DEFAULT_RATONAS
  });

  const [costsCatalog, setCostsCatalog] = useState<any>({
    chairs: [],
    tables: [],
    circular: [],
    ratonas: []
  });

  // Client Info State
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
  const [budgetDate, setBudgetDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDays, setDeliveryDays] = useState<number>(30);

  // Active Quote Builders State
  const [sillaForm, setSillaForm] = useState({ model: '', wood: '', fabric: '', color: '' });
  const [mesaForm, setMesaForm] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
  const [circularForm, setCircularForm] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
  const [ratonaForm, setRatonaForm] = useState({ wood: '', w: '', h: '' });
  const [otroForm, setOtroForm] = useState({ nombre: '', detalle: '', precio: '' });

  // Quote items & calculations
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [selectedPago, setSelectedPago] = useState<number>(0);
  const [pagosData, setPagosData] = useState<any[]>(DEFAULT_PAGOS_DATA);
  const [discountType, setDiscountType] = useState<'%' | '$'>('%');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  // Persistent margins & cost sheet state (Google Sheet Costing mechanism)
  const [viewCosts, setViewCosts] = useState<boolean>(false);
  const [defaultMarginPercent, setDefaultMarginPercent] = useState<number>(55); // Default Cost % (Profit = 45%)
  const [customCosts, setCustomCosts] = useState<{ [id: number]: number }>({}); // Overrides for item unit cost

  // Sales Orders & Budget Logs (State persistent in LocalStorage)
  const [sales, setSales] = useState<any[]>([]);
  const [quotesLog, setQuotesLog] = useState<any[]>([]); // To track saved budgets
  const [funnelOverrides, setFunnelOverrides] = useState<{ [key: string]: { phones: number; visits: number } }>({});

  // Order modal states
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderForm, setOrderForm] = useState<{
    senaPercent: number;
    senaCustom: number;
    isSenaCustom: boolean;
    status: string;
    paymentStatus: string;
    notes: string;
    attachments: any[];
  }>({
    senaPercent: 50,
    senaCustom: 0,
    isSenaCustom: false,
    status: 'Pendiente',
    paymentStatus: 'Señado',
    notes: '',
    attachments: []
  });
  const [orderValidationAttempted, setOrderValidationAttempted] = useState<boolean>(false);

  // Load from Sheet & Local Storage Cache
  useEffect(() => {
    const fetchCatalog = async () => {
      let finalPriceCat = null;
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Network response not ok');
        const data = await res.json();

        const parsedChairs = parseChairsRows(data.chairs || []);
        const parsedColors = parseChairColorLists(data.chairs || []);
        const parsedTables = parseTablesRows(data.tables || []);
        const parsedMesaOptions = parseMesaOptions(data.tables || []);
        const parsedRatonas = parseTablesRows(data.ratonas || []);
        
        let parsedCircular = [];
        let parsedCircularOptions = parsedMesaOptions;
        if (data.circularTables && data.circularTables.length) {
          parsedCircular = parseTablesRows(data.circularTables);
          const cOpts = parseMesaOptions(data.circularTables);
          parsedCircularOptions = cOpts.baseTypes.length > 0 ? cOpts : parsedMesaOptions;
        }

        const loadedCatalog = {
          chairs: parsedChairs.length ? parsedChairs : DEFAULT_CHAIRS,
          chairColors: parsedColors.Lino.length ? parsedColors : DEFAULT_COLORS,
          tables: parsedTables.length ? parsedTables : DEFAULT_TABLES,
          mesaOptions: parsedMesaOptions.baseTypes.length ? parsedMesaOptions : DEFAULT_OPTIONS,
          circular: parsedCircular.length ? parsedCircular : DEFAULT_CIRCULAR_TABLES,
          circularOptions: parsedCircularOptions,
          ratonas: parsedRatonas.length ? parsedRatonas : DEFAULT_RATONAS
        };

        setCatalog(loadedCatalog);
        finalPriceCat = loadedCatalog;
        localStorage.setItem('barda_catalog_cache', JSON.stringify(loadedCatalog));
        setConnStatus('connected');
      } catch (err) {
        console.warn('Sheets fetch failed, trying local cache...', err);
        const cached = localStorage.getItem('barda_catalog_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setCatalog(parsed);
          finalPriceCat = parsed;
          setConnStatus('cached');
        } else {
          finalPriceCat = {
            chairs: DEFAULT_CHAIRS,
            chairColors: DEFAULT_COLORS,
            tables: DEFAULT_TABLES,
            mesaOptions: DEFAULT_OPTIONS,
            circular: DEFAULT_CIRCULAR_TABLES,
            circularOptions: DEFAULT_OPTIONS,
            ratonas: DEFAULT_RATONAS
          };
          setConnStatus('fallback');
        }
      }

      // Now fetch / estimate costs catalog
      try {
        const fetchCSV = async (gid: string) => {
          const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${COSTS_SHEET_ID}/export?format=csv&gid=${gid}`);
          if (!csvRes.ok) throw new Error(`Failed to fetch cost gid ${gid}`);
          const csvText = await csvRes.text();
          return parseCSV(csvText);
        };

        const [chairsCSV, tablesCSV, circularCSV, ratonasCSV, pagosCSV] = await Promise.all([
          fetchCSV(COSTS_GIDS.chairs),
          fetchCSV(COSTS_GIDS.tables),
          fetchCSV(COSTS_GIDS.circular),
          fetchCSV(COSTS_GIDS.ratonas),
          fetchCSV('1312088898')
        ]);

        const loadedCostsCatalog = {
          chairs: parseChairsRows(chairsCSV),
          tables: parseTablesRows(tablesCSV),
          circular: parseTablesRows(circularCSV),
          ratonas: parseTablesRows(ratonasCSV)
        };

        setCostsCatalog(loadedCostsCatalog);
        localStorage.setItem('barda_costs_catalog_cache', JSON.stringify(loadedCostsCatalog));

        const fetchedPagos = parsePagosCSV(pagosCSV);
        if (fetchedPagos && fetchedPagos.length > 0) {
          setPagosData(fetchedPagos);
          localStorage.setItem('barda_pagos_cache', JSON.stringify(fetchedPagos));
        }
      } catch (costsErr) {
        console.warn('Failed to fetch costs from Google Sheet, trying cache...', costsErr);
        const cachedCosts = localStorage.getItem('barda_costs_catalog_cache');
        if (cachedCosts) {
          setCostsCatalog(JSON.parse(cachedCosts));
        } else if (finalPriceCat) {
          console.log('No costs cache found, generating estimate from prices...');
          setCostsCatalog(generateFallbackCostsCatalog(finalPriceCat));
        }
      } finally {
        setLoading(false);
      }
    };

    // Load Sales & Logs
    const localSales = localStorage.getItem('barda_sales_orders');
    let loadedSales: any[] = [];
    if (localSales) {
      try {
        loadedSales = JSON.parse(localSales);
        setSales(loadedSales);
      } catch (e) {
        console.warn('Failed to parse sales orders', e);
      }
    }

    const localFixedCosts = localStorage.getItem('barda_fixed_costs');
    if (localFixedCosts) {
      try {
        setFixedCosts(JSON.parse(localFixedCosts));
      } catch (e) {
        console.warn('Failed to parse fixed costs', e);
      }
    } else {
      const defaultCosts = generateDefaultFixedCosts();
      setFixedCosts(defaultCosts);
      localStorage.setItem('barda_fixed_costs', JSON.stringify(defaultCosts));
    }

    const localLedger = localStorage.getItem('barda_payments_ledger');
    if (localLedger) {
      try {
        setPaymentsLedger(JSON.parse(localLedger));
      } catch (e) {
        console.warn('Failed to parse payments ledger', e);
      }
    } else {
      const autoLedger = generateDefaultLedger(loadedSales);
      setPaymentsLedger(autoLedger);
      localStorage.setItem('barda_payments_ledger', JSON.stringify(autoLedger));
    }

    const localPagos = localStorage.getItem('barda_pagos_cache');
    if (localPagos) {
      try {
        setPagosData(JSON.parse(localPagos));
      } catch (e) {
        console.warn('Failed to parse pagos cache', e);
      }
    }

    const localQuotes = localStorage.getItem('barda_quotes_log');
    if (localQuotes) {
      try {
        const parsed = JSON.parse(localQuotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuotesLog(parsed);
        } else {
          setQuotesLog(DEFAULT_SAMPLE_QUOTES);
          localStorage.setItem('barda_quotes_log', JSON.stringify(DEFAULT_SAMPLE_QUOTES));
        }
      } catch (e) {
        setQuotesLog(DEFAULT_SAMPLE_QUOTES);
      }
    } else {
      setQuotesLog(DEFAULT_SAMPLE_QUOTES);
      localStorage.setItem('barda_quotes_log', JSON.stringify(DEFAULT_SAMPLE_QUOTES));
    }

    const localFunnel = localStorage.getItem('barda_funnel_overrides');
    if (localFunnel) {
      try {
        setFunnelOverrides(JSON.parse(localFunnel));
      } catch (e) {
        console.warn('Failed to parse funnel overrides', e);
      }
    }

    const localRemitentes = localStorage.getItem('barda_remitentes');
    if (localRemitentes) {
      try {
        const parsed = JSON.parse(localRemitentes);
        if (Array.isArray(parsed) && parsed.length > 0) setRemitentesList(parsed);
      } catch (e) {
        console.warn('Failed to parse remitentes', e);
      }
    }

    const localRemitoRemitente = localStorage.getItem('barda_remito_remitente');
    if (localRemitoRemitente) {
      try {
        setRemitoRemitente(JSON.parse(localRemitoRemitente));
      } catch (e) {
        console.warn('Failed to parse remito remitente', e);
      }
    }

    const localRemitoCliente = localStorage.getItem('barda_remito_cliente');
    if (localRemitoCliente) setRemitoCliente(JSON.parse(localRemitoCliente));

    const localRemitoItems = localStorage.getItem('barda_remito_items');
    if (localRemitoItems) setRemitoItems(JSON.parse(localRemitoItems));

    const localRemitoNum = localStorage.getItem('barda_remito_numero');
    if (localRemitoNum) setRemitoNumero(localRemitoNum);

    const localRemitoBultos = localStorage.getItem('barda_remito_bultos');
    if (localRemitoBultos) setRemitoBultos(localRemitoBultos);

    const localRemitoFecha = localStorage.getItem('barda_remito_fecha');
    if (localRemitoFecha) setRemitoFecha(localRemitoFecha);

    const localRemitoDelivery = localStorage.getItem('barda_remito_delivery');
    if (localRemitoDelivery) setRemitoDeliveryDate(localRemitoDelivery);

    const localFabList = localStorage.getItem('barda_fabricacion_list');
    if (localFabList) {
      try {
        setFabList(JSON.parse(localFabList));
      } catch (e) {
        console.warn('Failed to parse fabrication list', e);
      }
    }

    fetchCatalog();
  }, []);

  // Redirect to first permitted tab if activeTab is not permitted
  useEffect(() => {
    if (currentUser) {
      const currentTab = activeTab === 'usuarios' ? 'usuarios' : (activeTab as keyof UserPermissions);
      const perm = currentUser.permissions[currentTab];
      if (!perm || !perm.view) {
        const sections: Array<keyof UserPermissions> = ['presupuestos', 'ventas', 'remitos', 'fabricacion', 'finanzas', 'resumen', 'usuarios'];
        const firstAllowed = sections.find(sec => currentUser.permissions[sec]?.view);
        if (firstAllowed) {
          setActiveTab(firstAllowed === 'usuarios' ? 'usuarios' : firstAllowed as any);
        }
      }
    }
  }, [currentUser, activeTab]);

  // Load Barda collections from Firestore when an authenticated user logs in
  useEffect(() => {
    if (!currentUser) {
      isFirebaseLoaded.current = false;
      return;
    }

    const loadFirestoreData = async () => {
      try {
        setConnStatus('connected');
        
        // 1. Load Sales Orders
        const salesData = await fetchFirestoreCollection('barda_sales_orders');
        if (salesData.length > 0) {
          setSales(salesData);
          localStorage.setItem('barda_sales_orders', JSON.stringify(salesData));
        }

        // 2. Load Fixed Costs
        const fixedCostsData = await fetchFirestoreCollection('barda_fixed_costs');
        if (fixedCostsData.length > 0) {
          setFixedCosts(fixedCostsData);
          localStorage.setItem('barda_fixed_costs', JSON.stringify(fixedCostsData));
        }

        // 3. Load Payments Ledger
        const ledgerData = await fetchFirestoreCollection('barda_payments_ledger');
        if (ledgerData.length > 0) {
          setPaymentsLedger(ledgerData);
          localStorage.setItem('barda_payments_ledger', JSON.stringify(ledgerData));
        }

        // 4. Load Saved Quotes Log
        const quotesData = await fetchFirestoreCollection('barda_quotes_log');
        if (quotesData.length > 0) {
          setQuotesLog(quotesData);
          localStorage.setItem('barda_quotes_log', JSON.stringify(quotesData));
        }

        // 5. Load Fabrication List
        const fabricationData = await fetchFirestoreCollection('barda_fabricacion_list');
        if (fabricationData.length > 0) {
          setFabList(fabricationData);
          localStorage.setItem('barda_fabricacion_list', JSON.stringify(fabricationData));
        }

        // 6. Load Funnel Overrides
        const funnelData = await fetchFirestoreCollection('barda_funnel_overrides');
        if (funnelData.length > 0) {
          const funnelMap: any = {};
          funnelData.forEach(item => {
            const { id, ...rest } = item;
            funnelMap[id] = rest;
          });
          setFunnelOverrides(funnelMap);
          localStorage.setItem('barda_funnel_overrides', JSON.stringify(funnelMap));
        }

        isFirebaseLoaded.current = true;
        console.log("All Barda Firestore collections successfully loaded and synced.");
      } catch (err) {
        console.warn("Failed to load from Firestore, using offline storage cache:", err);
        setConnStatus('cached');
        // Mark as loaded so any new operations can still trigger writes
        isFirebaseLoaded.current = true;
      }
    };

    loadFirestoreData();
  }, [currentUser]);

  // Synchronize state changes to Firestore & local storage
  useEffect(() => {
    localStorage.setItem('barda_sales_orders', JSON.stringify(sales));
    if (currentUser && isFirebaseLoaded.current && connStatus === 'connected') {
      saveCollectionBatch('barda_sales_orders', sales);
    }
  }, [sales, currentUser, connStatus]);

  useEffect(() => {
    localStorage.setItem('barda_fixed_costs', JSON.stringify(fixedCosts));
    if (currentUser && isFirebaseLoaded.current && connStatus === 'connected') {
      saveCollectionBatch('barda_fixed_costs', fixedCosts);
    }
  }, [fixedCosts, currentUser, connStatus]);

  useEffect(() => {
    localStorage.setItem('barda_payments_ledger', JSON.stringify(paymentsLedger));
    if (currentUser && isFirebaseLoaded.current && connStatus === 'connected') {
      saveCollectionBatch('barda_payments_ledger', paymentsLedger);
    }
  }, [paymentsLedger, currentUser, connStatus]);

  useEffect(() => {
    localStorage.setItem('barda_quotes_log', JSON.stringify(quotesLog));
    if (currentUser && isFirebaseLoaded.current && connStatus === 'connected') {
      saveCollectionBatch('barda_quotes_log', quotesLog);
    }
  }, [quotesLog, currentUser, connStatus]);

  // Save Fabrication list on changes
  useEffect(() => {
    localStorage.setItem('barda_fabricacion_list', JSON.stringify(fabList));
    if (currentUser && isFirebaseLoaded.current && connStatus === 'connected') {
      saveCollectionBatch('barda_fabricacion_list', fabList);
    }
  }, [fabList, currentUser, connStatus]);

  // Save Funnel Overrides on changes
  useEffect(() => {
    localStorage.setItem('barda_funnel_overrides', JSON.stringify(funnelOverrides));
    if (currentUser && isFirebaseLoaded.current && connStatus === 'connected') {
      const funnelList = Object.entries(funnelOverrides).map(([key, val]: [string, any]) => ({
        id: key,
        ...val
      }));
      saveCollectionBatch('barda_funnel_overrides', funnelList);
    }
  }, [funnelOverrides, currentUser, connStatus]);

  // Load existing funnel data when selected month/year changes
  useEffect(() => {
    const key = `${funnelRegYear}-${funnelRegMonth}`;
    const existing = funnelOverrides[key];
    if (existing) {
      setFunnelRegPhones(existing.phones || 0);
      setFunnelRegVisits(existing.visits || 0);
    } else {
      setFunnelRegPhones(0);
      setFunnelRegVisits(0);
    }
  }, [funnelRegMonth, funnelRegYear, funnelOverrides]);

  const savedFunnelEntries = useMemo(() => {
    const entries: Array<{ key: string; year: string; month: string; monthLabel: string; phones: number; visits: number }> = [];
    Object.entries(funnelOverrides).forEach(([key, val]: [string, any]) => {
      if (key.match(/^\d{4}-\d{2}$/)) {
        const [yr, mo] = key.split('-');
        const monthObj = MONTHS_LIST.find(m => m.value === mo);
        entries.push({
          key,
          year: yr,
          month: mo,
          monthLabel: monthObj ? monthObj.label : mo,
          phones: val.phones || 0,
          visits: val.visits || 0
        });
      }
    });
    return entries.sort((a, b) => b.key.localeCompare(a.key));
  }, [funnelOverrides]);

  const handleSaveFunnelRegistry = () => {
    const key = `${funnelRegYear}-${funnelRegMonth}`;
    setFunnelOverrides(prev => ({
      ...prev,
      [key]: {
        phones: funnelRegPhones,
        visits: funnelRegVisits
      }
    }));
    setFunnelSaveSuccess(true);
    setTimeout(() => setFunnelSaveSuccess(false), 2000);
  };

  // Save Remitos states on changes
  useEffect(() => {
    localStorage.setItem('barda_remitentes', JSON.stringify(remitentesList));
  }, [remitentesList]);

  useEffect(() => {
    localStorage.setItem('barda_remito_remitente', JSON.stringify(remitoRemitente));
  }, [remitoRemitente]);

  useEffect(() => {
    localStorage.setItem('barda_remito_cliente', JSON.stringify(remitoCliente));
  }, [remitoCliente]);

  useEffect(() => {
    localStorage.setItem('barda_remito_items', JSON.stringify(remitoItems));
  }, [remitoItems]);

  useEffect(() => {
    localStorage.setItem('barda_remito_numero', remitoNumero);
  }, [remitoNumero]);

  useEffect(() => {
    localStorage.setItem('barda_remito_bultos', remitoBultos);
  }, [remitoBultos]);

  useEffect(() => {
    localStorage.setItem('barda_remito_fecha', remitoFecha);
  }, [remitoFecha]);

  useEffect(() => {
    localStorage.setItem('barda_remito_delivery', remitoDeliveryDate);
  }, [remitoDeliveryDate]);

  // Reset budget overrides when selection changes
  useEffect(() => {
    setBudgetSillaOverride({ value: null, editing: false });
  }, [sillaForm.model, sillaForm.wood, sillaForm.fabric, sillaForm.color]);

  useEffect(() => {
    setBudgetMesaOverride({ value: null, editing: false });
  }, [mesaForm.wood, mesaForm.w, mesaForm.h]);

  useEffect(() => {
    setBudgetCircularOverride({ value: null, editing: false });
  }, [circularForm.wood, circularForm.w, circularForm.h]);

  useEffect(() => {
    setBudgetRatonaOverride({ value: null, editing: false });
  }, [ratonaForm.wood, ratonaForm.w, ratonaForm.h]);

  useEffect(() => {
    setBudgetSillaOverride({ value: null, editing: false });
    setBudgetMesaOverride({ value: null, editing: false });
    setBudgetCircularOverride({ value: null, editing: false });
    setBudgetRatonaOverride({ value: null, editing: false });
  }, [addTab]);

  const renderBudgetEditablePrice = (
    calcPrice: number | null,
    overrideState: { value: number | null, editing: boolean },
    setOverrideState: React.Dispatch<React.SetStateAction<{ value: number | null, editing: boolean }>>
  ) => {
    const hasOverride = overrideState.value !== null;
    const originalPrice = hasOverride ? overrideState.value : calcPrice;
    const canEdit = calcPrice !== null || hasOverride;

    const displayPrice = originalPrice;

    if (overrideState.editing) {
      return (
        <div className="flex items-center gap-1.5 font-sans mt-1">
          <input
            type="number"
            className="w-28 text-right py-1.5 px-2.5 border border-terra rounded-lg focus:outline-none focus:ring-1 focus:ring-terra font-bold text-terra text-xs bg-amber-50/20"
            placeholder="Ej. 150000"
            defaultValue={overrideState.value ?? calcPrice ?? ''}
            onBlur={(e) => {
              const val = parsePrice(e.target.value);
              if (val !== null && val > 0 && val !== calcPrice) {
                setOverrideState({ value: val, editing: false });
              } else {
                setOverrideState({ value: null, editing: false });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parsePrice((e.target as HTMLInputElement).value);
                if (val !== null && val > 0 && val !== calcPrice) {
                  setOverrideState({ value: val, editing: false });
                } else {
                  setOverrideState({ value: null, editing: false });
                }
              }
              if (e.key === 'Escape') {
                setOverrideState(prev => ({ ...prev, editing: false }));
              }
            }}
            autoFocus
          />
          <button
            onClick={() => setOverrideState(prev => ({ ...prev, editing: false }))}
            className="w-8 h-8 rounded-md bg-terra text-white flex items-center justify-center hover:bg-brown transition-all"
            title="Confirmar precio"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 font-sans mt-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <div className={`px-3 py-1.5 bg-cream/30 border rounded-lg font-bold text-sm text-terra ${hasOverride ? 'border-terra bg-amber-50/30' : 'border-sand'}`}>
            {displayPrice ? fmt(displayPrice) : '—'}
          </div>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setOverrideState(prev => ({ ...prev, editing: true }))}
          className="w-8 h-8 border border-sand rounded-md bg-white hover:border-terra hover:text-terra flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Editar precio"
        >
          <Pencil className="w-3.5 h-3.5 text-stone/80 hover:text-terra" />
        </button>
        {hasOverride && (
          <button
            type="button"
            onClick={() => setOverrideState({ value: null, editing: false })}
            className="text-[10px] text-terra underline hover:text-brown ml-1"
            title="Restaurar precio calculado"
          >
            Restaurar
          </button>
        )}
      </div>
    );
  };

  // Remitos Helpers & Builders
  const renderRemitoEditablePrice = (
    calcPrice: number | null,
    overrideState: { value: number | null, editing: boolean },
    setOverrideState: React.Dispatch<React.SetStateAction<{ value: number | null, editing: boolean }>>
  ) => {
    const hasOverride = overrideState.value !== null;
    const displayPrice = hasOverride ? overrideState.value : calcPrice;
    const canEdit = calcPrice !== null || hasOverride;

    if (overrideState.editing) {
      return (
        <div className="flex items-center gap-1.5 font-sans">
          <input
            type="number"
            className="w-28 text-right py-1 px-2 border border-terra rounded focus:outline-none focus:ring-1 focus:ring-terra font-bold text-terra text-sm bg-amber-50/20"
            placeholder="Ej. 150000"
            defaultValue={overrideState.value ?? calcPrice ?? ''}
            onBlur={(e) => {
              const val = parsePrice(e.target.value);
              if (val !== null && val > 0 && val !== calcPrice) {
                setOverrideState({ value: val, editing: false });
              } else {
                setOverrideState({ value: null, editing: false });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parsePrice((e.target as HTMLInputElement).value);
                if (val !== null && val > 0 && val !== calcPrice) {
                  setOverrideState({ value: val, editing: false });
                } else {
                  setOverrideState({ value: null, editing: false });
                }
              }
              if (e.key === 'Escape') {
                setOverrideState(prev => ({ ...prev, editing: false }));
              }
            }}
            autoFocus
          />
          <button
            onClick={() => setOverrideState(prev => ({ ...prev, editing: false }))}
            className="w-8 h-8 rounded-md bg-terra text-white flex items-center justify-center hover:bg-brown transition-all"
            title="Confirmar precio"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 font-sans">
        <div className={`px-3 py-1.5 bg-cream/30 border rounded-lg font-bold text-sm text-terra ${hasOverride ? 'border-terra bg-amber-50/30' : 'border-sand'}`}>
          {displayPrice ? fmt(displayPrice) : '—'}
        </div>
        <button
          disabled={!canEdit}
          onClick={() => setOverrideState(prev => ({ ...prev, editing: true }))}
          className="w-8 h-8 border border-sand rounded-md bg-white hover:border-terra hover:text-terra flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Editar precio"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        {hasOverride && (
          <button
            onClick={() => setOverrideState({ value: null, editing: false })}
            className="text-[10px] text-terra underline hover:text-brown ml-1"
            title="Restaurar precio calculado"
          >
            Restaurar
          </button>
        )}
      </div>
    );
  };

  const addSillaRemito = () => {
    const f = remitoSillaForm;
    const product = catalog.chairs.find(c => c.name === f.model);
    const calcPrice = product?.prices[f.wood]?.[f.fabric] ?? null;
    const price = remitoSillaOverride.value !== null ? remitoSillaOverride.value : calcPrice;
    if (!price) return;
    const isCustomFabric = f.fabric === 'Lino' || f.fabric === 'Pana';
    const qty = parseInt((document.getElementById('rs-qty') as HTMLInputElement)?.value) || 1;
    
    let detail = `${titleCase(f.wood)} · ${f.fabric}`;
    if (isCustomFabric && f.color) detail += ` · Color: ${f.color}`;

    const newItem = {
      id: Date.now() + Math.random(),
      name: f.model,
      detail,
      unitPrice: price,
      qty,
      category: 'Sillas'
    };

    setRemitoItems([...remitoItems, newItem]);
    setRemitoSillaForm({ model: '', wood: '', fabric: '', color: '' });
    setRemitoSillaOverride({ value: null, editing: false });
  };

  const addMesaRemito = (type: 'mesa' | 'circular') => {
    const f = type === 'mesa' ? remitoMesaForm : remitoCircularForm;
    const dataList = type === 'mesa' ? catalog.tables : catalog.circular;
    const overrideState = type === 'mesa' ? remitoMesaOverride : remitoCircularOverride;
    const setOverrideState = type === 'mesa' ? setRemitoMesaOverride : setRemitoCircularOverride;
    const product = dataList.find(t => t.name === f.wood);
    const wn = parseNum(f.w);
    const hn = parseNum(f.h);
    if (!product || isNaN(wn) || !hn) return;

    const m2 = wn * hn;
    const minM2 = type === 'mesa' ? 1.6 : null;
    const billableM2 = minM2 && m2 < minM2 ? minM2 : m2;
    const calcPrice = product.pricePerM2 * billableM2;
    const price = overrideState.value !== null ? overrideState.value : calcPrice;
    if (!price) return;
    
    const isMicro = f.wood === 'Microcemento';
    const qty = parseInt((document.getElementById(`r${type === 'mesa' ? 'm' : 'c'}-qty`) as HTMLInputElement)?.value) || 1;

    let detail = `${wn}m × ${hn}m = ${m2.toFixed(2)}m² · Base: ${f.base}`;
    if (minM2 && m2 < minM2) detail += ` (Minimo facturado ${minM2}m²)`;
    if (isMicro) {
      detail += ` · Color: ${f.color} · Vet: ${f.veteado} · Brillo: ${f.brillo}`;
      if (f.baseMadera) detail += ` · Base Madera: ${f.baseMadera}`;
    }

    const newItem = {
      id: Date.now() + Math.random(),
      name: `${type === 'mesa' ? 'Mesa' : 'Mesa Circular'} ${f.wood}`,
      detail,
      unitPrice: price,
      qty,
      category: type === 'mesa' ? 'Mesas' : 'Mesas Circulares'
    };

    setRemitoItems([...remitoItems, newItem]);
    if (type === 'mesa') {
      setMesaFormRemito({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
    } else {
      setCircularFormRemito({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
    }
    setOverrideState({ value: null, editing: false });
  };

  const addRatonaRemito = () => {
    const f = remitoRatonaForm;
    const product = catalog.ratonas.find(r => r.name === f.wood);
    const wn = parseNum(f.w);
    const hn = parseNum(f.h);
    if (!product || isNaN(wn) || !hn) return;

    const m2 = wn * hn;
    const minM2 = 1.4;
    const billableM2 = m2 < minM2 ? minM2 : m2;
    const calcPrice = product.pricePerM2 * billableM2;
    const price = remitoRatonaOverride.value !== null ? remitoRatonaOverride.value : calcPrice;
    if (!price) return;
    const qty = parseInt((document.getElementById('rr-qty') as HTMLInputElement)?.value) || 1;

    let detail = `${wn}m × ${hn}m = ${m2.toFixed(2)}m²`;
    if (m2 < minM2) detail += ` (Minimo facturado ${minM2}m²)`;

    const newItem = {
      id: Date.now() + Math.random(),
      name: `Mesa Ratona ${f.wood}`,
      detail,
      unitPrice: price,
      qty,
      category: 'Ratonas'
    };

    setRemitoItems([...remitoItems, newItem]);
    setRatonaFormRemito({ wood: '', w: '', h: '' });
    setRemitoRatonaOverride({ value: null, editing: false });
  };

  const addOtroRemito = () => {
    const f = remitoOtroForm;
    const price = parsePrice(f.precio);
    if (!f.nombre || !price) return;
    const qty = parseInt((document.getElementById('ro-qty') as HTMLInputElement)?.value) || 1;

    const newItem = {
      id: Date.now() + Math.random(),
      name: f.nombre.trim(),
      detail: f.detalle.trim(),
      unitPrice: price,
      qty,
      category: 'Otros'
    };

    setRemitoItems([...remitoItems, newItem]);
    setOtroFormRemito({ nombre: '', detalle: '', precio: '' });
  };

  // Parser utilities
  const parsePrice = (str: string) => {
    if (!str || !String(str).trim()) return null;
    const n = parseFloat(String(str).replace(/[$\s.]/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  const parseChairsRows = (rows: any[]) => {
    const products: any[] = [];
    let current: any = null;
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].map((v: any) => String(v == null ? '' : v));
      const col0 = cols[0].trim().toUpperCase();
      if (!col0) continue;
      if (col0 === 'PETIRIBI' || col0 === 'PARAISO') {
        if (!current) continue;
        const prices: any = {};
        FABRIC_NAMES.forEach((fab, idx) => {
          const p = parsePrice(cols[idx + 1]);
          if (p !== null) prices[fab] = p;
        });
        if (Object.keys(prices).length) current.prices[col0] = prices;
      } else {
        current = { name: titleCase(cols[0].trim()), prices: {} };
        products.push(current);
      }
    }
    return products.filter(p => Object.values(p.prices).some((fp: any) => Object.keys(fp).length > 0));
  };

  const parseChairColorLists = (rows: any[]) => {
    const colors: { Lino: string[]; Pana: string[]; Panne: string[] } = { Lino: [], Pana: [], Panne: [] };
    for (let i = 0; i < rows.length; i++) {
      const c = rows[i].map((v: any) => String(v == null ? '' : v).trim());
      if (c[8] === 'Colores Lino') continue;
      if (c[8] && !/^Colores/i.test(c[8])) colors.Lino.push(c[8]);
      if (c[10] && !/^Colores/i.test(c[10])) colors.Pana.push(c[10]);
      if (c[11] && !/^Colores/i.test(c[11])) colors.Panne.push(c[11]);
    }
    return colors;
  };

  const parseTablesRows = (rows: any[]) => {
    const tables: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].map((v: any) => String(v == null ? '' : v));
      const name = (cols[1] || '').trim();
      const price = parsePrice(cols[2]);
      if (name && price) tables.push({ name: name, pricePerM2: price });
    }
    return tables;
  };

  const parseMesaOptions = (rows: any[]) => {
    const baseTypes: string[] = [], microColores: string[] = [], microVeteados: string[] = [], microBrillos: string[] = [], baseMaderaTypes: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const c = rows[i].map((v: any) => String(v == null ? '' : v).trim());
      if (c[4] && !/^Tipo/i.test(c[4])) baseTypes.push(c[4]);
      if (c[6] && !/^Colores/i.test(c[6])) microColores.push(c[6]);
      if (c[8] && !/^Veteados/i.test(c[8])) microVeteados.push(c[8]);
      if (c[10] && !/^Brillos/i.test(c[10])) microBrillos.push(c[10]);
      if (c[12] && !/^Tipo|^Base|^Columna/i.test(c[12])) baseMaderaTypes.push(c[12]);
    }
    return {
      baseTypes,
      microColores,
      microVeteados,
      microBrillos,
      baseMaderaTypes: baseMaderaTypes.length > 0 ? baseMaderaTypes : DEFAULT_OPTIONS.baseMaderaTypes
    };
  };

  // Pricing & Budget Calculations
  const parseNum = (v: any) => {
    if (v === null || v === undefined) return NaN;
    return parseFloat(String(v).trim().replace(',', '.'));
  };

  const calcSubtotal = () => quoteItems.reduce((acc, it) => acc + (it.unitPrice * it.qty), 0);
  const calcDiscount = (sub: number) => {
    if (!discountValue) return 0;
    return discountType === '%' ? sub * (discountValue / 100) : discountValue;
  };

  const subtotalPrice = calcSubtotal();
  const discountAmount = calcDiscount(subtotalPrice);
  const suggestedPrice = Math.max(0, subtotalPrice - discountAmount);

  // Totals for general checkout
  const finalBudgetValue = finalPrice !== null ? finalPrice : suggestedPrice;

  // Real-time Costing calculations
  const calculateDefaultCost = (salePrice: number) => {
    return Math.round(salePrice * (defaultMarginPercent / 100));
  };

  const getUnitCost = (item: any) => {
    if (customCosts[item.id] !== undefined) return customCosts[item.id];

    // Try finding exact cost in costsCatalog
    const cat = item.category;
    if (cat === 'Sillas') {
      const wood = item.wood || item.detail?.split(' · ')[0]?.toUpperCase();
      const fabric = item.fabric || item.detail?.split(' · ')[1];
      const normWood = wood === 'PETIRIBI' ? 'PETIRIBI' : wood === 'PARAISO' ? 'PARAISO' : null;
      if (normWood && fabric) {
        const costProduct = costsCatalog.chairs?.find((c: any) => c.name.toUpperCase() === item.name.toUpperCase());
        const cost = costProduct?.prices?.[normWood]?.[fabric];
        if (cost) return cost;
      }
    } else if (cat === 'Mesas' || cat === 'Mesas Circulares' || cat === 'Ratonas') {
      const wood = item.wood || item.name.replace(/^(Mesa Circular |Mesa Ratona |Mesa )/, '');
      const list = cat === 'Mesas' ? costsCatalog.tables : cat === 'Mesas Circulares' ? costsCatalog.circular : costsCatalog.ratonas;
      const costProduct = list?.find((t: any) => t.name.toLowerCase() === wood.toLowerCase());
      const costPerM2 = costProduct?.pricePerM2;
      if (costPerM2) {
        let w = item.w;
        let h = item.h;
        if (w === undefined || h === undefined) {
          // Parse from detail string
          const match = item.detail?.match(/([\d.,]+)m\s*×\s*([\d.,]+)m/);
          w = match ? parseFloat(match[1].replace(',', '.')) : 0;
          h = match ? parseFloat(match[2].replace(',', '.')) : 0;
        }
        if (w && h) {
          const m2 = w * h;
          const minM2 = cat === 'Mesas' ? 1.6 : cat === 'Ratonas' ? 1.4 : null;
          const billableM2 = minM2 && m2 < minM2 ? minM2 : m2;
          return Math.round(costPerM2 * billableM2);
        }
      }
    }

    // Default fallback
    return calculateDefaultCost(item.unitPrice);
  };

  const totalCostValue = quoteItems.reduce((acc, it) => acc + (getUnitCost(it) * it.qty), 0);
  const totalProfitValue = Math.max(0, finalBudgetValue - totalCostValue);
  const profitMarginPercent = finalBudgetValue > 0 ? (totalProfitValue / finalBudgetValue) * 100 : 0;

  // Estimated Delivery date calculation
  const calcDeliveryDate = () => {
    if (!budgetDate || !deliveryDays) return '—';
    const date = new Date(budgetDate + 'T12:00:00');
    date.setDate(date.getDate() + parseInt(String(deliveryDays)));
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const monthShort = date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
    const monthCap = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);
    return `${dd}/${mm}/${yyyy} (${monthCap})`;
  };

  // Add Item actions
  const addSilla = () => {
    const f = sillaForm;
    const product = catalog.chairs.find(c => c.name === f.model);
    const calcPrice = product?.prices[f.wood]?.[f.fabric] ?? null;
    const price = budgetSillaOverride.value !== null ? budgetSillaOverride.value : calcPrice;
    if (!price) return;
    const isCustomFabric = f.fabric === 'Lino' || f.fabric === 'Pana';
    const qty = parseInt((document.getElementById('s-qty') as HTMLInputElement)?.value) || 1;
    
    let detail = `${titleCase(f.wood)} · ${f.fabric}`;
    if (isCustomFabric && f.color) detail += ` · Color: ${f.color}`;

    const newItem = {
      id: Date.now(),
      name: f.model,
      detail,
      unitPrice: price,
      qty,
      category: 'Sillas',
      wood: f.wood,
      fabric: f.fabric
    };

    setQuoteItems([...quoteItems, newItem]);
    setSillaForm({ model: '', wood: '', fabric: '', color: '' });
  };

  const addMesa = (type: 'mesa' | 'circular') => {
    const f = type === 'mesa' ? mesaForm : circularForm;
    const dataList = type === 'mesa' ? catalog.tables : catalog.circular;
    const product = dataList.find(t => t.name === f.wood);
    const wn = parseNum(f.w);
    const hn = parseNum(f.h);
    if (!product || isNaN(wn) || !hn) return;

    const m2 = wn * hn;
    const minM2 = type === 'mesa' ? 1.6 : null;
    const billableM2 = minM2 && m2 < minM2 ? minM2 : m2;
    
    const calcPrice = type === 'mesa' 
      ? product.pricePerM2 * billableM2 
      : product.pricePerM2 * m2;
    
    const overrideVal = type === 'mesa' ? budgetMesaOverride.value : budgetCircularOverride.value;
    const price = overrideVal !== null ? overrideVal : calcPrice;
    if (!price) return;

    const isMicro = f.wood === 'Microcemento';
    const qty = parseInt((document.getElementById(`${type === 'mesa' ? 'm' : 'c'}-qty`) as HTMLInputElement)?.value) || 1;

    let detail = `${wn}m × ${hn}m = ${m2.toFixed(2)}m² · Base: ${f.base}`;
    if (minM2 && m2 < minM2) detail += ` (Minimo facturado ${minM2}m²)`;
    if (isMicro) {
      detail += ` · Color: ${f.color} · Vet: ${f.veteado} · Brillo: ${f.brillo}`;
      if (f.baseMadera) detail += ` · Base Madera: ${f.baseMadera}`;
    }

    const newItem = {
      id: Date.now(),
      name: `${type === 'mesa' ? 'Mesa' : 'Mesa Circular'} ${f.wood}`,
      detail,
      unitPrice: price,
      qty,
      category: type === 'mesa' ? 'Mesas' : 'Mesas Circulares',
      wood: f.wood,
      w: wn,
      h: hn
    };

    setQuoteItems([...quoteItems, newItem]);
    if (type === 'mesa') {
      setMesaForm({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
    } else {
      setCircularForm({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' });
    }
  };

  const addRatona = () => {
    const f = ratonaForm;
    const product = catalog.ratonas.find(r => r.name === f.wood);
    const wn = parseNum(f.w);
    const hn = parseNum(f.h);
    if (!product || isNaN(wn) || !hn) return;

    const m2 = wn * hn;
    const minM2 = 1.4;
    const billableM2 = m2 < minM2 ? minM2 : m2;
    
    const calcPrice = product.pricePerM2 * billableM2;
    const price = budgetRatonaOverride.value !== null ? budgetRatonaOverride.value : calcPrice;
    if (!price) return;

    const qty = parseInt((document.getElementById('r-qty') as HTMLInputElement)?.value) || 1;

    let detail = `${wn}m × ${hn}m = ${m2.toFixed(2)}m²`;
    if (m2 < minM2) detail += ` (Minimo facturado ${minM2}m²)`;

    const newItem = {
      id: Date.now(),
      name: `Mesa Ratona ${f.wood}`,
      detail,
      unitPrice: price,
      qty,
      category: 'Ratonas',
      wood: f.wood,
      w: wn,
      h: hn
    };

    setQuoteItems([...quoteItems, newItem]);
    setRatonaForm({ wood: '', w: '', h: '' });
  };

  const addOtro = () => {
    const f = otroForm;
    const price = parsePrice(f.precio);
    if (!f.nombre || !price) return;
    const qty = parseInt((document.getElementById('o-qty') as HTMLInputElement)?.value) || 1;

    const newItem = {
      id: Date.now(),
      name: f.nombre.trim(),
      detail: f.detalle.trim(),
      unitPrice: price,
      qty,
      category: 'Otros'
    };

    setQuoteItems([...quoteItems, newItem]);
    setOtroForm({ nombre: '', detalle: '', precio: '' });
  };

  // Budget Logging and Printing
  const handleSaveBudget = () => {
    if (!quoteItems.length) return;
    const num = String(quotesLog.length + 1).padStart(8, '0');
    const vencDate = new Date(budgetDate || Date.now());
    vencDate.setDate(vencDate.getDate() + 30);

    const newLog: QuoteLogItem = {
      id: Date.now(),
      quoteNum: num,
      date: budgetDate || new Date().toISOString().split('T')[0],
      vencimiento: vencDate.toISOString().split('T')[0],
      client: { ...cliente },
      category: 'Showroom',
      subtotal: subtotalPrice,
      discount: discountAmount,
      totalValue: finalBudgetValue,
      status: 'Pendiente',
      paymentMethod: pagosData[selectedPago]?.name || '',
      itemsCount: quoteItems.reduce((acc, it) => acc + it.qty, 0),
      items: [...quoteItems]
    };
    const updated = [newLog, ...quotesLog];
    setQuotesLog(updated);
    localStorage.setItem('barda_quotes_log', JSON.stringify(updated));
    alert('¡Presupuesto Guardado con éxito en el Registro de Presupuestos!');
  };

  const handleUpdateQuoteStatus = (id: number, newStatus: QuoteLogItem['status']) => {
    const updated = quotesLog.map(q => q.id === id ? { ...q, status: newStatus } : q);
    setQuotesLog(updated);
    localStorage.setItem('barda_quotes_log', JSON.stringify(updated));
  };

  const handleDeleteQuote = (id: number) => {
    if (!confirm('¿Desea eliminar este presupuesto del registro?')) return;
    const updated = quotesLog.filter(q => q.id !== id);
    setQuotesLog(updated);
    localStorage.setItem('barda_quotes_log', JSON.stringify(updated));
  };

  const handleLoadQuoteToCotizador = (quote: QuoteLogItem) => {
    if (quote.client) {
      setCliente({
        nombre: quote.client.nombre || '',
        telefono: quote.client.telefono || '',
        cuit: quote.client.cuit || '',
        direccion: quote.client.direccion || '',
        cp: (quote.client as any).cp || (quote.client as any).codPostal || '',
        ciudad: quote.client.ciudad || '',
        provincia: quote.client.provincia || ''
      });
    }
    if (quote.items && quote.items.length) {
      setQuoteItems(quote.items);
    }
    if (quote.date) {
      setBudgetDate(quote.date);
    }
    setPresupuestosSubTab('nuevo');
  };

  const handleConvertToSale = (quote: QuoteLogItem) => {
    if (quote.client) {
      setCliente({
        nombre: quote.client.nombre || '',
        telefono: quote.client.telefono || '',
        cuit: quote.client.cuit || '',
        direccion: quote.client.direccion || '',
        cp: (quote.client as any).cp || (quote.client as any).codPostal || '',
        ciudad: quote.client.ciudad || '',
        provincia: quote.client.provincia || ''
      });
    }
    if (quote.items && quote.items.length) {
      setQuoteItems(quote.items);
    }
    if (quote.date) {
      setBudgetDate(quote.date);
    }

    const updated = quotesLog.map(q => q.id === quote.id ? { ...q, status: 'Venta' as const } : q);
    setQuotesLog(updated);
    localStorage.setItem('barda_quotes_log', JSON.stringify(updated));

    setPresupuestosSubTab('nuevo');
    setTimeout(() => {
      handleGenerateOrder();
    }, 100);
  };

  const handlePrint = () => {
    if (!quoteItems.length) return;
    // Log as a printed budget too
    const newLog = {
      id: Date.now(),
      date: budgetDate,
      client: { ...cliente },
      itemsCount: quoteItems.reduce((acc, it) => acc + it.qty, 0),
      totalValue: finalBudgetValue,
      paymentMethod: pagosData[selectedPago]?.name || ''
    };
    const updated = [newLog, ...quotesLog];
    setQuotesLog(updated);
    localStorage.setItem('barda_quotes_log', JSON.stringify(updated));
    window.print();
  };

  // Convert Quote to Sale Order
  const handleGenerateOrder = () => {
    if (!quoteItems.length) return;

    // Check if any client field is empty
    const isClientValid = 
      cliente.nombre.trim() !== '' &&
      cliente.telefono.trim() !== '' &&
      cliente.cuit.trim() !== '' &&
      cliente.cp.trim() !== '' &&
      cliente.direccion.trim() !== '' &&
      cliente.ciudad.trim() !== '' &&
      cliente.provincia.trim() !== '';

    if (!isClientValid) {
      setOrderValidationAttempted(true);
      // Focus and scroll to first empty field
      const fields = [
        { val: cliente.nombre, placeholder: 'Nombre y Apellido' },
        { val: cliente.telefono, placeholder: 'Teléfono' },
        { val: cliente.cuit, placeholder: 'CUIT / CUIL' },
        { val: cliente.cp, placeholder: 'Código Postal' },
        { val: cliente.direccion, placeholder: 'Dirección' },
        { val: cliente.ciudad, placeholder: 'Ciudad' },
        { val: cliente.provincia, placeholder: 'Provincia' }
      ];
      const firstEmpty = fields.find(f => !f.val.trim());
      if (firstEmpty) {
        const element = document.querySelector(`input[placeholder="${firstEmpty.placeholder}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLInputElement).focus();
        }
      }
      return;
    }

    setOrderValidationAttempted(false);
    // Open dialog with default seña as 50% of the actual paid total with payment surcharge/discount
    const recargo = pagosData[selectedPago]?.recargo ?? 0;
    const finalTotalWithRecargo = Math.round(finalBudgetValue * (1 + recargo));
    setOrderForm({
      senaPercent: 50,
      senaCustom: Math.round(finalTotalWithRecargo * 0.5),
      isSenaCustom: false,
      status: 'Pendiente',
      paymentStatus: 'Señado',
      notes: '',
      attachments: []
    });
    setShowOrderModal(true);
  };

  const confirmOrder = () => {
    const orderNum = `PE-${String(sales.length + 1001).padStart(4, '0')}`;
    const recargo = pagosData[selectedPago]?.recargo ?? 0;
    const actualTotal = Math.round(finalBudgetValue * (1 + recargo));
    const actualProfit = Math.max(0, actualTotal - totalCostValue);
    const senaVal = orderForm.isSenaCustom ? orderForm.senaCustom : Math.round(actualTotal * (orderForm.senaPercent / 100));
    
    const newOrder = {
      id: Date.now(),
      orderNum,
      date: budgetDate,
      client: { ...cliente },
      items: quoteItems.map(it => ({
        ...it,
        cost: getUnitCost(it)
      })),
      subtotal: subtotalPrice,
      discount: discountAmount,
      total: actualTotal,
      totalCost: totalCostValue,
      profit: actualProfit,
      paymentMethod: pagosData[selectedPago]?.name || '',
      status: orderForm.status,
      paymentStatus: orderForm.paymentStatus,
      senaAmount: senaVal,
      deliveryDate: calcDeliveryDate(),
      notes: orderForm.notes,
      attachments: orderForm.attachments || []
    };

    const updatedSales = [newOrder, ...sales];
    setSales(updatedSales);
    localStorage.setItem('barda_sales_orders', JSON.stringify(updatedSales));

    // Sync to paymentsLedger
    const defaultAccount = newOrder.paymentMethod?.toLowerCase().includes('cuotas') 
      ? 'Uala' 
      : newOrder.paymentMethod?.toLowerCase().includes('transferencia') 
        ? 'Santander' 
        : 'Efectivo';
    
    const newPayments = [...paymentsLedger];
    if (senaVal > 0) {
      newPayments.push({
        id: `sena-${newOrder.id}-${Date.now()}`,
        orderId: newOrder.id,
        orderNum: newOrder.orderNum,
        clientName: newOrder.client?.nombre || 'Consumidor Final',
        date: newOrder.date || new Date().toISOString().split('T')[0],
        amount: senaVal,
        type: 'Seña',
        account: defaultAccount,
        paymentMethod: newOrder.paymentMethod
      });
    }
    if (newOrder.paymentStatus === 'Pagado') {
      const balanceVal = actualTotal - senaVal;
      if (balanceVal > 0) {
        newPayments.push({
          id: `balance-${newOrder.id}-${Date.now()}`,
          orderId: newOrder.id,
          orderNum: newOrder.orderNum,
          clientName: newOrder.client?.nombre || 'Consumidor Final',
          date: newOrder.date || new Date().toISOString().split('T')[0],
          amount: balanceVal,
          type: 'Saldo',
          account: defaultAccount,
          paymentMethod: newOrder.paymentMethod
        });
      }
    }
    setPaymentsLedger(newPayments);
    localStorage.setItem('barda_payments_ledger', JSON.stringify(newPayments));

    // Also automatically generate and save a manufacturing order in fabList
    const autoFabOrder = {
      id: Date.now() + 1,
      orderNum,
      date: budgetDate || new Date().toISOString().split('T')[0],
      client: { ...cliente },
      deliveryDate: calcDeliveryDate(),
      notes: orderForm.notes || '',
      items: quoteItems.map(it => ({
        id: it.id + Math.random(),
        name: it.name,
        detail: it.detail || '',
        cost: getUnitCost(it),
        qty: it.qty,
        category: it.category
      })),
      status: 'Pendiente',
      totalCost: totalCostValue,
      attachments: orderForm.attachments || []
    };
    const updatedFabList = [autoFabOrder, ...fabList];
    setFabList(updatedFabList);
    localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFabList));

    // Clear active budget
    setQuoteItems([]);
    setCliente({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
    setSelectedPago(0);
    setDiscountValue(0);
    setFinalPrice(null);
    setCustomCosts({});
    setShowOrderModal(false);

    // Switch to Ventas tab
    setActiveTab('ventas');
  };

  // Order List Interactions
  const updateOrderStatus = (id: number, field: 'status' | 'paymentStatus', val: string) => {
    let balanceCollected = 0;
    let orderToUpdate: any = null;

    const updated = sales.map(s => {
      if (s.id === id) {
        orderToUpdate = s;
        const next = { ...s, [field]: val };
        // If paid complete, update seña
        if (field === 'paymentStatus' && val === 'Pagado') {
          next.senaAmount = s.total;
          if (s.paymentStatus !== 'Pagado') {
            balanceCollected = s.total - (s.senaAmount || 0);
          }
        }
        return next;
      }
      return s;
    });

    setSales(updated);
    localStorage.setItem('barda_sales_orders', JSON.stringify(updated));

    if (balanceCollected > 0 && orderToUpdate) {
      const defaultAccount = orderToUpdate.paymentMethod?.toLowerCase().includes('cuotas') 
        ? 'Uala' 
        : orderToUpdate.paymentMethod?.toLowerCase().includes('transferencia') 
          ? 'Santander' 
          : 'Efectivo';
      
      const newPayment = {
        id: `balance-${id}-${Date.now()}`,
        orderId: id,
        orderNum: orderToUpdate.orderNum,
        clientName: orderToUpdate.client?.nombre || 'Consumidor Final',
        date: new Date().toISOString().split('T')[0],
        amount: balanceCollected,
        type: 'Saldo',
        account: defaultAccount,
        paymentMethod: orderToUpdate.paymentMethod
      };
      const updatedLedger = [...paymentsLedger, newPayment];
      setPaymentsLedger(updatedLedger);
      localStorage.setItem('barda_payments_ledger', JSON.stringify(updatedLedger));
    }
  };

  const deleteOrder = (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta orden de pedido y toda su información vinculada (taller, cobros)?')) return;
    const orderToDelete = sales.find(s => s.id === id);

    // 1. Delete from sales list
    const updatedSales = sales.filter(s => s.id !== id);
    setSales(updatedSales);
    localStorage.setItem('barda_sales_orders', JSON.stringify(updatedSales));

    if (orderToDelete) {
      // 2. Delete from fabrication list (fabList)
      const updatedFabList = fabList.filter(f => f.orderNum !== orderToDelete.orderNum && f.id !== orderToDelete.id);
      setFabList(updatedFabList);
      localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFabList));

      // 3. Delete from payments ledger (paymentsLedger)
      const updatedLedger = paymentsLedger.filter(p => p.orderId !== orderToDelete.id && p.orderNum !== orderToDelete.orderNum);
      setPaymentsLedger(updatedLedger);
      localStorage.setItem('barda_payments_ledger', JSON.stringify(updatedLedger));
    }
  };

  const handleSaveEditedSale = () => {
    if (!editingSale) return;

    const total = Number(editingSale.total) || 0;
    const totalCost = Number(editingSale.totalCost) || 0;
    const senaAmount = Number(editingSale.senaAmount) || 0;
    const profit = Math.max(0, total - totalCost);

    const updatedOrder = {
      ...editingSale,
      total,
      totalCost,
      senaAmount,
      profit,
      items: editingSale.items || [],
      attachments: editingSale.attachments || []
    };

    // Update sales list
    const updatedSales = sales.map(s => s.id === updatedOrder.id ? updatedOrder : s);
    setSales(updatedSales);
    localStorage.setItem('barda_sales_orders', JSON.stringify(updatedSales));

    // Sync with fabList if order exists there
    const fabIdx = fabList.findIndex(f => f.orderNum === updatedOrder.orderNum);
    if (fabIdx >= 0) {
      const updatedFabList = [...fabList];
      updatedFabList[fabIdx] = {
        ...updatedFabList[fabIdx],
        deliveryDate: updatedOrder.deliveryDate || updatedFabList[fabIdx].deliveryDate,
        notes: updatedOrder.notes || updatedFabList[fabIdx].notes,
        totalCost: totalCost,
        attachments: updatedOrder.attachments ? [...updatedOrder.attachments] : []
      };
      setFabList(updatedFabList);
      localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFabList));
    }

    setEditingSale(null);
  };

  const deleteFixedCost = (id: number) => {
    if (!confirm('¿Desea eliminar este costo fijo?')) return;
    const updated = fixedCosts.filter(c => c.id !== id);
    setFixedCosts(updated);
    localStorage.setItem('barda_fixed_costs', JSON.stringify(updated));
  };

  const openEditMovement = (item: any) => {
    setEditingMovement(item);
    setEditMovementForm({
      id: String(item.originalId),
      isFixedCost: !!item.isFixedCost,
      isLedger: !!item.isLedger,
      description: item.operacion || '',
      category: item.subCategoria || item.entidad || 'Gastos',
      amount: String(item.monto || ''),
      baseAmount: String(item.baseMonto || item.monto || ''),
      iva: String(item.ivaPct || '0'),
      currency: item.moneda || 'ARS',
      account: item.medio || 'Efectivo',
      date: item.fecha !== '—' ? item.fecha : new Date().toISOString().split('T')[0],
      pendingPayment: item.estado === 'Pendiente',
      clientName: item.entidad || '',
      note: item.operacion || ''
    });
  };

  const saveEditedMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMovementForm.id) return;

    const baseAmt = parseFloat(editMovementForm.baseAmount) || parseFloat(editMovementForm.amount) || 0;
    const ivaPct = parseFloat(editMovementForm.iva) || 0;
    const totalAmount = baseAmt * (1 + ivaPct / 100);

    if (editMovementForm.isFixedCost) {
      const updatedCosts = fixedCosts.map(c => {
        if (String(c.id) === String(editMovementForm.id)) {
          return {
            ...c,
            category: editMovementForm.category,
            description: editMovementForm.description,
            amount: totalAmount,
            baseAmount: baseAmt,
            ivaPct: ivaPct,
            currency: editMovementForm.currency,
            account: editMovementForm.account,
            date: editMovementForm.date,
            pendingPayment: editMovementForm.pendingPayment,
            month: editMovementForm.date.substring(0, 7)
          };
        }
        return c;
      });
      setFixedCosts(updatedCosts);
      localStorage.setItem('barda_fixed_costs', JSON.stringify(updatedCosts));
    } else if (editMovementForm.isLedger) {
      const updatedLedger = paymentsLedger.map(p => {
        if (String(p.id) === String(editMovementForm.id)) {
          return {
            ...p,
            clientName: editMovementForm.clientName || editMovementForm.description,
            orderNum: editMovementForm.category || p.orderNum,
            amount: totalAmount,
            baseAmount: baseAmt,
            ivaPct: ivaPct,
            currency: editMovementForm.currency,
            account: editMovementForm.account,
            paymentMethod: editMovementForm.account,
            date: editMovementForm.date,
            pendingPayment: editMovementForm.pendingPayment,
            note: editMovementForm.note || editMovementForm.description
          };
        }
        return p;
      });
      setPaymentsLedger(updatedLedger);
      localStorage.setItem('barda_payments_ledger', JSON.stringify(updatedLedger));
    }

    setEditingMovement(null);
    alert('¡Movimiento actualizado con éxito!');
  };

  const deleteMovementItem = (item: any) => {
    if (!confirm(`¿Desea eliminar el asiento "${item.codigo} - ${item.operacion}"?`)) return;

    if (item.isFixedCost) {
      deleteFixedCost(item.originalId);
    } else if (item.isLedger) {
      const updated = paymentsLedger.filter(p => String(p.id) !== String(item.originalId));
      setPaymentsLedger(updated);
      localStorage.setItem('barda_payments_ledger', JSON.stringify(updated));
    }
  };

  const addFixedCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFixedCost.description.trim() || !newFixedCost.amount) {
      alert('Por favor complete la descripción y el monto.');
      return;
    }
    const baseAmt = parseFloat(newFixedCost.amount) || 0;
    const ivaPct = parseFloat(newFixedCost.iva) || 0;
    const totalAmount = baseAmt * (1 + ivaPct / 100);

    const cost = {
      id: Date.now(),
      category: newFixedCost.category,
      description: newFixedCost.description,
      amount: totalAmount,
      baseAmount: baseAmt,
      ivaPct: ivaPct,
      currency: newFixedCost.currency,
      account: newFixedCost.account,
      date: newFixedCost.date,
      pendingPayment: newFixedCost.pendingPayment,
      month: newFixedCost.month || newFixedCost.date.substring(0, 7)
    };
    const updated = [...fixedCosts, cost];
    setFixedCosts(updated);
    localStorage.setItem('barda_fixed_costs', JSON.stringify(updated));
    setNewFixedCost({
      category: 'Alquiler',
      description: '',
      amount: '',
      month: new Date().toISOString().substring(0, 7),
      date: new Date().toISOString().split('T')[0],
      currency: 'ARS',
      account: 'Efectivo',
      iva: '0',
      pendingPayment: false
    });
    alert('¡Gasto / Egreso registrado con éxito en Tesorería!');
  };

  const recordBalancePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentRegisterForm.orderId === null) return;
    const order = sales.find(s => s.id === paymentRegisterForm.orderId);
    if (!order) return;
    const baseAmt = parseFloat(paymentRegisterForm.amount);
    if (isNaN(baseAmt) || baseAmt <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }
    const ivaPct = parseFloat(paymentRegisterForm.iva || '0') || 0;
    const totalAmount = baseAmt * (1 + ivaPct / 100);

    // Add payment receipt to paymentsLedger
    const newPay = {
      id: `balance-${order.id}-${Date.now()}`,
      orderId: order.id,
      orderNum: order.orderNum,
      clientName: order.client?.nombre || 'Consumidor Final',
      date: paymentRegisterForm.date,
      amount: totalAmount,
      baseAmount: baseAmt,
      ivaPct: ivaPct,
      currency: paymentRegisterForm.currency || 'ARS',
      type: 'Saldo',
      account: paymentRegisterForm.account,
      paymentMethod: order.paymentMethod,
      pendingPayment: paymentRegisterForm.pendingPayment || false,
      note: paymentRegisterForm.note
    };

    const updatedLedger = [...paymentsLedger, newPay];
    setPaymentsLedger(updatedLedger);
    localStorage.setItem('barda_payments_ledger', JSON.stringify(updatedLedger));

    // Update sale order
    const updatedSales = sales.map(s => {
      if (s.id === order.id) {
        const newSena = (s.senaAmount || 0) + totalAmount;
        const newPayStatus = newSena >= s.total ? 'Pagado' : 'Señado';
        return {
          ...s,
          senaAmount: Math.min(s.total, newSena),
          paymentStatus: newPayStatus
        };
      }
      return s;
    });
    setSales(updatedSales);
    localStorage.setItem('barda_sales_orders', JSON.stringify(updatedSales));

    // Clear payment register form
    setPaymentRegisterForm({
      orderId: null,
      amount: '',
      account: 'Efectivo',
      currency: 'ARS',
      iva: '0',
      pendingPayment: false,
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    alert('¡Cobro de saldo registrado con éxito en el libro de caja!');
  };

  const recordCustomIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const baseAmt = parseFloat(customIncomeForm.amount);
    if (isNaN(baseAmt) || baseAmt <= 0 || !customIncomeForm.concept.trim()) {
      alert('Por favor ingrese un concepto y monto válido.');
      return;
    }
    const ivaPct = parseFloat(customIncomeForm.iva || '0') || 0;
    const totalAmount = baseAmt * (1 + ivaPct / 100);

    const newIncome = {
      id: `direct-inc-${Date.now()}`,
      orderId: null,
      orderNum: (customIncomeForm.category || 'INGRESO DIRECTO').toUpperCase(),
      clientName: customIncomeForm.concept,
      date: customIncomeForm.date,
      amount: totalAmount,
      baseAmount: baseAmt,
      ivaPct: ivaPct,
      currency: customIncomeForm.currency,
      type: 'Ingreso Directo',
      account: customIncomeForm.account,
      paymentMethod: customIncomeForm.account,
      pendingPayment: customIncomeForm.pendingPayment,
      note: customIncomeForm.note
    };
    const updatedLedger = [...paymentsLedger, newIncome];
    setPaymentsLedger(updatedLedger);
    localStorage.setItem('barda_payments_ledger', JSON.stringify(updatedLedger));
    setCustomIncomeForm({
      concept: '',
      category: 'Aporte de Capital',
      amount: '',
      currency: 'ARS',
      account: 'Efectivo',
      iva: '0',
      pendingPayment: false,
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    alert('¡Ingreso registrado con éxito en Tesorería!');
  };

  const exportToCSV = (type: 'pl' | 'payments' | 'outstanding', filteredPaymentsList: any[], filteredFixedCostsList: any[], totalVentasVal: number, totalCostoVariableVal: number, totalCostoFijoVal: number) => {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    let filename = '';

    if (type === 'pl') {
      filename = `Barda_Reporte_Ganancias_${finanzasYear}_${finanzasMonth}.csv`;
      csvContent += 'Barda Home - Reporte de Pérdidas y Ganancias (P&L)\n';
      csvContent += `Período:;Año: ${finanzasYear} - Mes: ${finanzasMonth}\n\n`;
      csvContent += 'Métrica;Monto ($)\n';
      csvContent += `Ventas Pactadas Totales;${totalVentasVal}\n`;
      csvContent += `Costo de Fabricación (Variable);-${totalCostoVariableVal}\n`;
      csvContent += `Margen de Contribución Económica;${totalVentasVal - totalCostoVariableVal}\n`;
      csvContent += `Costos Fijos Operativos;-${totalCostoFijoVal}\n`;
      csvContent += `Ganancia Operativa (Accrual);${totalVentasVal - totalCostoVariableVal - totalCostoFijoVal}\n\n`;
      
      csvContent += 'Desglose de Costos Fijos:\n';
      csvContent += 'Categoría;Descripción;Monto ($)\n';
      filteredFixedCostsList.forEach(c => {
        csvContent += `"${c.category}";"${c.description || ''}";${c.amount}\n`;
      });
    } 
    else if (type === 'payments') {
      filename = `Barda_Registro_Caja_Cobros_${finanzasYear}_${finanzasMonth}.csv`;
      csvContent += 'Barda Home - Libro de Caja (Cobros Registrados)\n';
      csvContent += `Período:;Año: ${finanzasYear} - Mes: ${finanzasMonth}\n\n`;
      csvContent += 'Fecha;Pedido;Cliente;Monto;Concepto;Cuenta Destino;Medio de Pago;Nota\n';
      filteredPaymentsList.forEach(p => {
        csvContent += `${p.date || ''};${p.orderNum || ''};"${p.clientName || 'Consumidor Final'}";${p.amount};${p.type || ''};${p.account || ''};"${p.paymentMethod || ''}";"${p.note || ''}"\n`;
      });
    } 
    else if (type === 'outstanding') {
      filename = 'Barda_Saldos_Pendientes_Cobro.csv';
      csvContent += 'Barda Home - Saldos Pendientes de Cobro\n\n';
      csvContent += 'Pedido;Fecha;Cliente;Teléfono;Total;Surgido (Señado);Saldo Pendiente;Fecha Entrega Proyectada;Estado Pedido\n';
      
      const ordersWithBalance = sales.filter(s => s.total - (s.senaAmount || 0) > 0);
      ordersWithBalance.forEach(s => {
        const remaining = s.total - (s.senaAmount || 0);
        csvContent += `${s.orderNum};${s.date || ''};"${s.client?.nombre || 'Consumidor Final'}";"${s.client?.telefono || ''}";${s.total};${s.senaAmount || 0};${remaining};"${s.deliveryDate || ''}";"${s.status || ''}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // HELPER FUNCTIONS FOR WEEKLY HORIZON & FABRICATION ACTIONS
  const parseSpanishDate = (dateStr: string): Date => {
    if (!dateStr || dateStr === '—') return new Date();
    const str = dateStr.trim().toLowerCase();

    // 1. Format: DD/MM/YYYY or DD/MM/YY (e.g. "25/08/2026 (Ago)", "25/08/2026", "25/8/2026")
    const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      let year = parseInt(ddmmyyyy[3], 10);
      if (year < 100) year += 2000;
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }

    // 2. Format: YYYY-MM-DD (e.g. "2026-08-25")
    const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }

    // 3. Format: "26 de julio de 2026" or "26 de julio" or "26 de jul"
    const months: { [key: string]: number } = {
      enero: 0, ene: 0,
      febrero: 1, feb: 1,
      marzo: 2, mar: 2,
      abril: 3, abr: 3,
      mayo: 4, may: 4,
      junio: 5, jun: 5,
      julio: 6, jul: 6,
      agosto: 7, ago: 7,
      septiembre: 8, sep: 8,
      octubre: 9, oct: 9,
      noviembre: 10, nov: 10,
      diciembre: 11, dic: 11
    };

    const textMatch = str.match(/(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?/i);
    if (textMatch) {
      const day = parseInt(textMatch[1], 10);
      const monthName = textMatch[2].toLowerCase();
      const month = months[monthName];
      const year = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }

    // 4. Fallback to JS standard Date parse
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      const dt = new Date(parsed);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0);
    }

    return new Date();
  };

  const getWeekRangeString = (date: Date): { label: string, weekId: string, sortKey: number } => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday... 6 is Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.getFullYear(), d.getMonth(), diff, 12, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const fmtDateStr = (dt: Date) => {
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}`;
    };

    // Calculate ISO week number accurately
    const target = new Date(monday.valueOf());
    const dayNr = (monday.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNum = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);

    const label = `Semana ${weekNum} (del ${fmtDateStr(monday)} al ${fmtDateStr(sunday)})`;
    const weekId = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    
    // Sort key using Monday timestamp for perfect chronological ordering
    const sortKey = monday.getTime();

    return { label, weekId, sortKey };
  };

  const getWeeklyCommitments = () => {
    const weeksMap: { [weekId: string]: { weekId: string, label: string, sortKey: number, orders: any[] } } = {};
    
    sales.forEach(order => {
      if (order.status === 'Entregado' || order.status === 'Cancelado') return;

      const dateObj = parseSpanishDate(order.deliveryDate);
      const { label, weekId, sortKey } = getWeekRangeString(dateObj);
      
      if (!weeksMap[weekId]) {
        weeksMap[weekId] = { weekId, label, sortKey, orders: [] };
      }
      weeksMap[weekId].orders.push(order);
    });
    
    return Object.values(weeksMap).sort((a, b) => a.sortKey - b.sortKey);
  };

  const handleSaveFabricationOrder = () => {
    if (fabItems.length === 0) {
      alert('La orden de fabricación está vacía.');
      return;
    }
    
    const existingIndex = fabList.findIndex(f => f.orderNum === fabNumero && fabNumero !== '');
    const totalCost = fabItems.reduce((acc, it) => acc + (it.cost * it.qty), 0);
    
    const orderData = {
      id: existingIndex >= 0 ? fabList[existingIndex].id : Date.now(),
      orderNum: fabNumero,
      date: fabFecha,
      client: { ...fabCliente },
      deliveryDate: fabDeliveryDate,
      notes: fabNotes,
      items: [...fabItems],
      status: existingIndex >= 0 ? fabList[existingIndex].status : 'Pendiente',
      totalCost: totalCost,
      attachments: [...fabAttachments]
    };
    
    let updated;
    if (existingIndex >= 0) {
      updated = [...fabList];
      updated[existingIndex] = orderData;
      alert(`Orden de fabricación ${fabNumero} actualizada con éxito.`);
    } else {
      updated = [orderData, ...fabList];
      alert(`Orden de fabricación ${fabNumero} registrada con éxito.`);
    }
    
    setFabList(updated);
    localStorage.setItem('barda_fabricacion_list', JSON.stringify(updated));
  };

  const downloadFabricationOrderAndAttachments = (data: {
    orderNum: string;
    date: string;
    client: any;
    deliveryDate: string;
    notes: string;
    items: any[];
    attachments?: any[];
  }) => {
    const attachList = data.attachments || [];

    const customLogoUrl = localStorage.getItem('barda_custom_logo') || `${window.location.origin}/barda_logo.jpg`;

    // 1. Download HTML document for the order with embedded attachments section
    const orderHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Orden de Pedido ${data.orderNum || 'S/N'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #3D1F0D; padding: 30px; max-width: 800px; margin: 0 auto; background: #FAF6F0; }
    .card { background: #ffffff; border: 2px solid #D8C8B8; padding: 25px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C47A3A; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 26px; color: #3D1F0D; font-family: Georgia, serif; }
    .sub { font-size: 11px; color: #C47A3A; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .ref { font-family: monospace; font-weight: bold; font-size: 18px; color: #C47A3A; text-align: right; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #F2E8D9; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { text-align: left; border-bottom: 2px solid #D8C8B8; padding: 8px; font-size: 10px; text-transform: uppercase; color: #786858; letter-spacing: 0.5px; }
    td { border-bottom: 1px solid #EAE0D5; padding: 10px 8px; font-size: 12px; }
    .qty { font-weight: bold; font-family: monospace; text-align: center; }
    .notes { background: #FFF9F2; border-left: 4px solid #C47A3A; padding: 12px; margin-top: 15px; font-size: 12px; font-style: italic; border-radius: 4px; }
    .attachments-sec { margin-top: 25px; border-top: 2px solid #D8C8B8; padding-top: 15px; page-break-before: auto; }
    .attach-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px; }
    .attach-card { border: 1px solid #D8C8B8; background: #ffffff; padding: 10px; border-radius: 8px; text-align: center; }
    .footer { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; font-size: 11px; color: #786858; border-top: 1px dashed #D8C8B8; padding-top: 25px; }
    .sig-line { width: 140px; border-bottom: 1px solid #3D1F0D; margin: 0 auto 5px auto; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${customLogoUrl}" alt="Barda Home Logo" style="height: 52px; width: auto; object-fit: contain; border-radius: 6px;" />
        <div>
          <h1>Barda</h1>
          <div class="sub">Orden de Pedido y Fabricación</div>
        </div>
      </div>
      <div>
        <div class="ref">${data.orderNum || 'S/N'}</div>
        <div style="font-size: 11px; color: #786858; margin-top: 4px; text-align: right;">Fecha: ${data.date || new Date().toISOString().split('T')[0]}</div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <strong>Cliente / Trabajo:</strong> ${data.client?.nombre || 'Consumidor Final'}<br/>
        <strong>Teléfono:</strong> ${data.client?.telefono || '—'}<br/>
        <strong>CUIT/CUIL:</strong> ${data.client?.cuit || '—'}
      </div>
      <div>
        <strong>Dirección:</strong> ${data.client?.direccion || '—'}<br/>
        <strong>Ciudad/Provincia:</strong> ${data.client?.ciudad || '—'}, ${data.client?.provincia || '—'}<br/>
        <strong>Entrega Prometida:</strong> <span style="color:#C47A3A; font-weight:bold;">${data.deliveryDate || '—'}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%; text-align: center;">Cant</th>
          <th style="width: 45%;">Producto</th>
          <th style="width: 45%;">Detalle / Especificaciones</th>
        </tr>
      </thead>
      <tbody>
        ${(data.items || []).map((it: any) => `
          <tr>
            <td class="qty">${it.qty}</td>
            <td><strong>${it.name}</strong></td>
            <td style="color: #555;">${it.detail || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${data.notes ? `<div class="notes"><strong>Notas / Observaciones para taller:</strong> "${data.notes}"</div>` : ''}

    ${attachList.length > 0 ? `
      <div class="attachments-sec">
        <h3 style="font-size: 14px; color: #3D1F0D; margin-bottom: 5px; font-family: Georgia, serif;">Anexo de Adjuntos y Planos (${attachList.length})</h3>
        <div class="attach-grid">
          ${attachList.map((att: any, i: number) => {
            const url = att.dataUrl || att.url;
            const isImg = att.type?.startsWith('image/') || (url && url.startsWith('data:image/'));
            return `
              <div class="attach-card">
                ${isImg && url ? `<img src="${url}" style="max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 4px;" alt="${att.name || 'Adjunto'}"/>` : `<div style="padding: 20px; background: #F2E8D9; border-radius: 4px; font-size: 12px; font-weight: bold; color: #C47A3A;">📄 ${att.name || 'Archivo Adjunto'}</div>`}
                <div style="font-size: 10px; font-weight: bold; margin-top: 6px; color: #3D1F0D;">${att.name || `Adjunto ${i+1}`}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <div class="footer">
      <div>
        <div class="sig-line"></div>
        <strong>Autorizado Barda</strong>
      </div>
      <div>
        <div class="sig-line"></div>
        <strong>Recibido Taller</strong>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([orderHtml], { type: 'text/html;charset=utf-8' });
    const orderUrl = URL.createObjectURL(blob);
    const linkOrder = document.createElement('a');
    linkOrder.href = orderUrl;
    linkOrder.download = `Orden_de_Pedido_${data.orderNum || 'SN'}.html`;
    document.body.appendChild(linkOrder);
    linkOrder.click();
    document.body.removeChild(linkOrder);

    // 2. Download raw attachment files if available
    if (attachList.length > 0) {
      attachList.forEach((att: any, idx: number) => {
        const fileUrl = att.dataUrl || att.url;
        if (fileUrl) {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = att.name || `Adjunto_${data.orderNum || 'SN'}_${idx + 1}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, (idx + 1) * 300);
        }
      });
    }
  };

  const handleSendToTaller = (order: any) => {
    // 1. Sync / Save in Fabrication List
    const existsIndex = fabList.findIndex(f => f.orderNum === order.orderNum);
    const fabOrder = fabList.find(f => f.orderNum === order.orderNum);
    const orderAttachments = (order.attachments && order.attachments.length > 0) 
      ? [...order.attachments] 
      : (fabOrder?.attachments ? [...fabOrder.attachments] : []);

    const newFabOrder = {
      id: existsIndex >= 0 ? fabList[existsIndex].id : Date.now(),
      orderNum: order.orderNum,
      date: new Date().toISOString().split('T')[0],
      client: { ...order.client },
      deliveryDate: order.deliveryDate,
      notes: order.notes || '',
      items: order.items ? order.items.map((it: any) => ({
        id: Date.now() + Math.random(),
        name: it.name,
        detail: it.detail || '',
        cost: it.cost || 0,
        qty: it.qty,
        category: it.category
      })) : [],
      status: existsIndex >= 0 ? fabList[existsIndex].status : 'Pendiente',
      totalCost: order.items ? order.items.reduce((acc: number, it: any) => acc + ((it.cost || 0) * it.qty), 0) : 0,
      attachments: orderAttachments
    };

    let updatedFabList;
    if (existsIndex >= 0) {
      updatedFabList = [...fabList];
      updatedFabList[existsIndex] = newFabOrder;
    } else {
      updatedFabList = [newFabOrder, ...fabList];
    }
    setFabList(updatedFabList);
    localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFabList));

    // 2. Set active fabrication state for designer
    setFabCliente({
      nombre: order.client?.nombre || '',
      telefono: order.client?.telefono || '',
      cuit: order.client?.cuit || '',
      direccion: order.client?.direccion || '',
      cp: order.client?.cp || '',
      ciudad: order.client?.ciudad || '',
      provincia: order.client?.provincia || ''
    });
    setFabNumero(order.orderNum || '');
    setFabFecha(new Date().toISOString().split('T')[0]);
    setFabDeliveryDate(order.deliveryDate || new Date().toISOString().split('T')[0]);
    setFabNotes(order.notes || '');
    setFabItems(order.items ? order.items.map((it: any) => ({
      id: Date.now() + Math.random(),
      name: it.name,
      detail: it.detail || '',
      cost: it.cost || 0,
      qty: it.qty,
      category: it.category
    })) : []);
    setFabAttachments(orderAttachments);
    setFabSubTab('diseñador');
    setActiveTab('ventas');
    setVentasSubTab('fabricacion');

    // 3. Trigger automatic download of order and attachments
    downloadFabricationOrderAndAttachments({
      orderNum: order.orderNum,
      date: order.date || new Date().toISOString().split('T')[0],
      client: order.client,
      deliveryDate: order.deliveryDate,
      notes: order.notes,
      items: order.items,
      attachments: orderAttachments
    });
  };

  // FILTERING FOR ACTIVE ORDERS
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('Todos');
  const [salesPayFilter, setSalesPayFilter] = useState('Todos');
  const [salesMonthFilter, setSalesMonthFilter] = useState('Todos');
  const [salesYearFilter, setSalesYearFilter] = useState('Todos');
  const [expandedOrders, setExpandedOrders] = useState<{[orderId: number]: boolean}>({});

  const filteredSales = sales.filter(s => {
    const matchName = s.client.nombre?.toLowerCase().includes(salesSearch.toLowerCase()) || 
                      s.orderNum?.toLowerCase().includes(salesSearch.toLowerCase());
    const matchStatus = salesStatusFilter === 'Todos' || s.status === salesStatusFilter;
    const matchPay = salesPayFilter === 'Todos' || s.paymentStatus === salesPayFilter;
    
    const orderYear = s.date ? s.date.substring(0, 4) : '';
    const orderMonth = s.date ? s.date.substring(5, 7) : '';
    const matchYear = salesYearFilter === 'Todos' || orderYear === salesYearFilter;
    const matchMonth = salesMonthFilter === 'Todos' || orderMonth === salesMonthFilter;

    return matchName && matchStatus && matchPay && matchYear && matchMonth;
  });

  const salesMetrics = useMemo(() => {
    let entregadosCount = 0, entregadosTotal = 0;
    let listosCount = 0, listosTotal = 0;
    let produccionCount = 0, produccionTotal = 0;
    let pendientesCount = 0, pendientesTotal = 0;
    let totalCount = 0, totalMonto = 0;

    sales.forEach(s => {
      const val = s.total || 0;
      totalCount++;
      totalMonto += val;

      if (s.status === 'Entregado') {
        entregadosCount++;
        entregadosTotal += val;
      } else if (s.status === 'Listo para Entrega') {
        listosCount++;
        listosTotal += val;
      } else if (s.status === 'En Producción') {
        produccionCount++;
        produccionTotal += val;
      } else {
        pendientesCount++;
        pendientesTotal += val;
      }
    });

    return {
      entregadosCount, entregadosTotal,
      listosCount, listosTotal,
      produccionCount, produccionTotal,
      pendientesCount, pendientesTotal,
      totalCount, totalMonto
    };
  }, [sales]);

  // METRICS & ANALYTICS COMPUTATION
  const currentPeriodKey = useMemo(() => {
    if (resumenYear === 'todos') {
      return 'todos';
    }
    if (resumenMonth === 'todos') {
      return resumenYear;
    }
    return `${resumenYear}-${resumenMonth}`;
  }, [resumenYear, resumenMonth]);

  const activeFunnelData = useMemo(() => {
    // If we are looking at a specific month
    if (resumenYear !== 'todos' && resumenMonth !== 'todos') {
      const key = `${resumenYear}-${resumenMonth}`;
      return funnelOverrides[key] || { phones: 0, visits: 0, isAggregated: false };
    }
    
    // If we are looking at a specific year, sum all months of that year
    if (resumenYear !== 'todos' && resumenMonth === 'todos') {
      let sumPhones = 0;
      let sumVisits = 0;
      let hasSubData = false;
      (Object.entries(funnelOverrides) as Array<[string, { phones: number; visits: number }]>).forEach(([k, val]) => {
        if (k.startsWith(`${resumenYear}-`)) {
          sumPhones += val.phones || 0;
          sumVisits += val.visits || 0;
          hasSubData = true;
        }
      });
      if (hasSubData) {
        return { phones: sumPhones, visits: sumVisits, isAggregated: true };
      }
      // Fallback to year-level override if no month data exists
      const fallback = funnelOverrides[resumenYear] || { phones: 0, visits: 0 };
      return { ...fallback, isAggregated: false };
    }

    // If we are looking at 'todos' years
    if (resumenYear === 'todos') {
      let sumPhones = 0;
      let sumVisits = 0;
      let hasSubData = false;
      (Object.entries(funnelOverrides) as Array<[string, { phones: number; visits: number }]>).forEach(([k, val]) => {
        // It's a month key if it has a hyphen and isn't 'todos'
        if (k.includes('-') && k !== 'todos') {
          sumPhones += val.phones || 0;
          sumVisits += val.visits || 0;
          hasSubData = true;
        }
      });
      if (hasSubData) {
        return { phones: sumPhones, visits: sumVisits, isAggregated: true };
      }
      const fallback = funnelOverrides['todos'] || { phones: 0, visits: 0 };
      return { ...fallback, isAggregated: false };
    }

    return { phones: 0, visits: 0, isAggregated: false };
  }, [funnelOverrides, resumenYear, resumenMonth]);

  const dashboardFilteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const year = s.date.substring(0, 4);
      const month = s.date.substring(5, 7);
      const yearMatch = resumenYear === 'todos' || year === resumenYear;
      const monthMatch = resumenMonth === 'todos' || month === resumenMonth;
      return yearMatch && monthMatch;
    });
  }, [sales, resumenYear, resumenMonth]);

  const dashboardFilteredQuotes = useMemo(() => {
    return quotesLog.filter(q => {
      if (!q.date) return false;
      const year = q.date.substring(0, 4);
      const month = q.date.substring(5, 7);
      const yearMatch = resumenYear === 'todos' || year === resumenYear;
      const monthMatch = resumenMonth === 'todos' || month === resumenMonth;
      return yearMatch && monthMatch;
    });
  }, [quotesLog, resumenYear, resumenMonth]);

  const yearsList = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(new Date().getFullYear().toString());
    sales.forEach(s => {
      if (s.date) {
        const yr = s.date.substring(0, 4);
        if (yr && yr.length === 4) yearsSet.add(yr);
      }
    });
    quotesLog.forEach(q => {
      if (q.date) {
        const yr = q.date.substring(0, 4);
        if (yr && yr.length === 4) yearsSet.add(yr);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [sales, quotesLog]);

  const getTopSubproducts = (selectedCat: string) => {
    const counts: { [key: string]: { name: string; details: string; qty: number; revenue: number } } = {};
    
    dashboardFilteredSales.forEach(s => {
      s.items.forEach((it: any) => {
        const itemCat = it.category || 'Otros';
        if (itemCat !== selectedCat) return;

        let key = '';
        let variantName = it.name || 'Sin nombre';
        let details = it.detail || '';

        if (itemCat === 'Sillas') {
          const woodStr = it.wood ? titleCase(it.wood) : 'Petiribí';
          const fabricStr = it.fabric || 'Pana';
          key = `${variantName} (${woodStr} · ${fabricStr})`;
          details = `${woodStr} · ${fabricStr}`;
        } else if (itemCat === 'Mesas' || itemCat === 'Mesas Circulares' || itemCat === 'Ratonas') {
          let dims = '';
          if (it.w && it.h) {
            dims = `${it.w}m × ${it.h}m`;
          } else {
            const match = it.detail?.match(/([\d.,]+m\s*×\s*[\d.,]+m)/);
            dims = match ? match[1] : '';
          }
          
          let baseStr = '';
          const baseMatch = it.detail?.match(/Base:\s*([^·\n]+)/i);
          if (baseMatch) {
            baseStr = ` · Base: ${baseMatch[1].trim()}`;
          }
          
          const dimsAndBase = [dims, baseStr ? baseStr.replace(' · ', '') : ''].filter(Boolean).join(' · ');
          key = `${variantName} (${dimsAndBase || 'Estándar'})`;
          details = dimsAndBase || 'Estándar';
        } else {
          key = `${variantName} (${details || 'General'})`;
          details = details || 'General';
        }

        if (!counts[key]) {
          counts[key] = {
            name: variantName,
            details: details,
            qty: 0,
            revenue: 0
          };
        }
        counts[key].qty += it.qty;
        counts[key].revenue += it.qty * it.unitPrice;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 10);
  };

  const getDashboardMetrics = () => {
    const totalQuotes = dashboardFilteredQuotes.length;

    const totalVentaAcum = dashboardFilteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalCostoAcum = dashboardFilteredSales.reduce((acc, s) => acc + s.totalCost, 0);
    const totalProfitAcum = totalVentaAcum - totalCostoAcum;
    const marginAcum = totalVentaAcum > 0 ? (totalProfitAcum / totalVentaAcum) * 100 : 0;

    const avgProfitPerOrder = dashboardFilteredSales.length > 0 ? totalProfitAcum / dashboardFilteredSales.length : 0;
    const conversionRate = dashboardFilteredQuotes.length > 0 
      ? (dashboardFilteredSales.length / dashboardFilteredQuotes.length) * 100 
      : 0;

    const pendingDeliveryCount = dashboardFilteredSales.filter(s => s.status !== 'Entregado').length;

    const remainingToCollect = dashboardFilteredSales.reduce((acc, s) => {
      if (s.paymentStatus === 'Pagado') {
        return acc;
      } else if (s.paymentStatus === 'Señado') {
        return acc + Math.max(0, s.total - (s.senaAmount || 0));
      } else {
        return acc + s.total;
      }
    }, 0);

    // Category Sales breakdown using filtered sales
    const categoryTotals: { [cat: string]: number } = { Sillas: 0, Mesas: 0, "Mesas Circulares": 0, Ratonas: 0, Otros: 0 };
    dashboardFilteredSales.forEach(s => {
      s.items.forEach((it: any) => {
        const cat = it.category || 'Otros';
        if (categoryTotals[cat] !== undefined) {
          categoryTotals[cat] += it.unitPrice * it.qty;
        } else {
          categoryTotals['Otros'] += it.unitPrice * it.qty;
        }
      });
    });

    return {
      totalQuotes,
      totalVentaAcum,
      totalCostoAcum,
      totalProfitAcum,
      marginAcum,
      avgProfitPerOrder,
      conversionRate,
      pendingDeliveryCount,
      remainingToCollect,
      categoryTotals
    };
  };

  const metrics = getDashboardMetrics();

  const handleUpdateFunnel = (field: 'phones' | 'visits', value: number) => {
    setFunnelOverrides(prev => {
      const key = currentPeriodKey;
      const current = prev[key] || { phones: 0, visits: 0 };
      const nextVal = Math.max(0, value);
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: nextVal
        }
      };
    });
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(u) => { setCurrentUser(u); }} />;
  }

  const canEditPresupuestos = currentUser.permissions.presupuestos.edit;
  const canEditVentas = currentUser.permissions.ventas.edit;
  const canEditRemitos = currentUser.permissions.remitos.edit;
  const canEditFabricacion = currentUser.permissions.fabricacion.edit;
  const canEditFinanzas = currentUser.permissions.finanzas.edit;
  const canEditResumen = currentUser.permissions.resumen.edit;

  return (
    <div className="min-h-screen flex flex-col font-sans text-brown bg-light-cream">
      
      {/* HEADER SECTION - NO PRINT */}
      <header className="bg-white border-b-2 border-sand px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
        {/* Left side: Logo + Navigation Sections */}
        <div className="flex flex-wrap items-center gap-4">
          <BardaLogo size="md" />
          <div className="w-[1.5px] h-8 bg-sand hidden sm:block"></div>

          {/* Global tab navigation */}
          <nav className="flex flex-wrap sm:flex-nowrap bg-light-cream border border-sand rounded-lg p-1 gap-0.5 sm:gap-1">
            {currentUser.permissions.presupuestos.view && (
              <button 
                onClick={() => setActiveTab('presupuestos')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 cursor-pointer ${activeTab === 'presupuestos' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
              >
                Presupuestos
              </button>
            )}
            {(currentUser.permissions.ventas.view || currentUser.permissions.remitos.view || currentUser.permissions.fabricacion.view) && (
              <button 
                onClick={() => setActiveTab('ventas')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 cursor-pointer ${activeTab === 'ventas' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
              >
                Ventas
              </button>
            )}
            {currentUser.permissions.finanzas.view && (
              <button 
                onClick={() => setActiveTab('finanzas')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 cursor-pointer ${activeTab === 'finanzas' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
              >
                Tesorería
              </button>
            )}
            {currentUser.permissions.resumen.view && (
              <button 
                onClick={() => setActiveTab('resumen')}
                className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 cursor-pointer ${activeTab === 'resumen' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
              >
                Resumen
              </button>
            )}
          </nav>
        </div>

        {/* Right side: User Dropdown Button with Avatar */}
        <div className="relative shrink-0" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-sand hover:border-terra bg-cream/30 hover:bg-white transition-all cursor-pointer shadow-2xs group"
            title="Mi Cuenta"
          >
            <div className="w-8 h-8 rounded-full bg-brown text-cream flex items-center justify-center font-bold text-xs shadow-2xs group-hover:bg-terra transition-colors shrink-0">
              {formatAbbreviatedName(currentUser.name)}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-stone transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-brown' : ''}`} />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-sand rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 bg-light-cream/60 border-b border-sand flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brown text-cream flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {formatAbbreviatedName(currentUser.name)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-brown text-sm truncate">{currentUser.name}</span>
                  <span className="text-[11px] text-stone truncate">{currentUser.email}</span>
                </div>
              </div>

              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-brown hover:bg-cream/50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <UserIcon className="w-4 h-4 text-terra" />
                  <span>Mi perfil</span>
                </button>

                {currentUser.permissions.usuarios.view && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('usuarios');
                    }}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                      activeTab === 'usuarios' ? 'bg-brown text-cream font-bold' : 'text-brown hover:bg-cream/50'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${activeTab === 'usuarios' ? 'text-cream' : 'text-terra'}`} />
                    <span>Gestión de usuarios</span>
                  </button>
                )}

                <div className="h-px bg-sand/60 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut(auth).then(() => {
                      localStorage.removeItem('barda_current_user');
                      setCurrentUser(null);
                    });
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* RENDER ACTIVE SCREEN */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        {activeTab === 'usuarios' && currentUser.permissions.usuarios.view && (
          <UserManagement 
            currentUser={currentUser} 
            onLogout={() => {
              signOut(auth).then(() => {
                localStorage.removeItem('barda_current_user');
                setCurrentUser(null);
              });
            }} 
          />
        )}
        
        {/* ======================================================== */}
        {/* PREVIEW CONTAINER FOR WEB & PRINT FORMAT                  */}
        {/* ======================================================== */}
        {activeTab === 'presupuestos' && (
          <div className="flex flex-col gap-6">
            {/* SUB-VIEW TOGGLE FOR PRESUPUESTOS (NUEVO PRESUPUESTO / PRESUPUESTOS ESTADOS) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-sand p-2 sm:p-2.5 rounded-2xl shadow-xs print:hidden">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setPresupuestosSubTab('nuevo')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    presupuestosSubTab === 'nuevo'
                      ? 'bg-brown text-cream shadow-sm'
                      : 'text-stone hover:bg-cream/40'
                  }`}
                >
                  <Plus className="w-4 h-4 text-terra" />
                  <span>Nuevo Presupuesto</span>
                </button>
                <button
                  onClick={() => setPresupuestosSubTab('estados')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    presupuestosSubTab === 'estados'
                      ? 'bg-brown text-cream shadow-sm'
                      : 'text-stone hover:bg-cream/40'
                  }`}
                >
                  <FileText className="w-4 h-4 text-terra" />
                  <span>Presupuestos Estados</span>
                </button>
              </div>

              <span className="text-[11px] font-bold text-stone/80 hidden lg:inline mr-2">
                BARDA ERP • Módulo de Presupuestos
              </span>
            </div>

            {presupuestosSubTab === 'nuevo' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* BUILD PANEL (LEFT SIDE) - HIDE ON PRINT */}
            <div className={`lg:col-span-7 flex flex-col gap-6 print:hidden ${!canEditPresupuestos ? 'pointer-events-none opacity-85 select-none' : ''}`}>
              
              {!canEditPresupuestos && (
                <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                  <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                  <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para agregar productos, modificar precios o registrar nuevas órdenes de venta.</span>
                </div>
              )}
              
              {/* CLIENT CARD */}
              <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-brown mb-4 border-b border-sand pb-2">Datos del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.nombre.trim() ? 'text-error' : 'text-stone'}`}>Cliente</label>
                     <input 
                       type="text" 
                       placeholder="Nombre y Apellido" 
                       value={cliente.nombre} 
                       onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.nombre.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.telefono.trim() ? 'text-error' : 'text-stone'}`}>Teléfono</label>
                     <input 
                       type="text" 
                       placeholder="Teléfono" 
                       value={cliente.telefono} 
                       onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.telefono.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.cuit.trim() ? 'text-error' : 'text-stone'}`}>CUIT / CUIL</label>
                     <input 
                       type="text" 
                       placeholder="CUIT / CUIL" 
                       value={cliente.cuit} 
                       onChange={e => setCliente({ ...cliente, cuit: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.cuit.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.cp.trim() ? 'text-error' : 'text-stone'}`}>Código Postal</label>
                     <input 
                       type="text" 
                       placeholder="Código Postal" 
                       value={cliente.cp} 
                       onChange={e => setCliente({ ...cliente, cp: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.cp.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.direccion.trim() ? 'text-error' : 'text-stone'}`}>Dirección de entrega</label>
                     <input 
                       type="text" 
                       placeholder="Dirección" 
                       value={cliente.direccion} 
                       onChange={e => setCliente({ ...cliente, direccion: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.direccion.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.ciudad.trim() ? 'text-error' : 'text-stone'}`}>Ciudad</label>
                     <input 
                       type="text" 
                       placeholder="Ciudad" 
                       value={cliente.ciudad} 
                       onChange={e => setCliente({ ...cliente, ciudad: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.ciudad.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className={`text-[10px] tracking-wider uppercase font-bold transition-all duration-150 ${orderValidationAttempted && !cliente.provincia.trim() ? 'text-error' : 'text-stone'}`}>Provincia</label>
                     <input 
                       type="text" 
                       placeholder="Provincia" 
                       value={cliente.provincia} 
                       onChange={e => setCliente({ ...cliente, provincia: e.target.value })}
                       className={`w-full text-xs py-2 px-3 border rounded-lg focus:outline-none transition-all duration-150 ${orderValidationAttempted && !cliente.provincia.trim() ? 'border-error bg-error/5 text-error placeholder-error/60 focus:border-error focus:ring-1 focus:ring-error' : 'border-sand bg-white text-brown focus:border-terra focus:ring-1 focus:ring-terra/30'}`}
                     />
                  </div>
                </div>
              </div>

              {/* PRODUCT ADDER CARD */}
              <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-brown mb-3 border-b border-sand pb-2">Agregar Producto</h3>
                
                {/* Catalog type tabs */}
                <div className="flex bg-light-cream border border-sand rounded-lg p-0.5 gap-0.5 mb-5 overflow-x-auto">
                  {(['silla', 'mesa', 'circular', 'ratona', 'otro'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAddTab(tab)}
                      className={`flex-1 min-w-[70px] text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${addTab === tab ? 'bg-brown text-cream' : 'text-stone hover:bg-cream/40'}`}
                    >
                      {tab === 'silla' ? 'Sillas' : tab === 'mesa' ? 'Mesas' : tab === 'circular' ? 'Mesas Circ.' : tab === 'ratona' ? 'Ratonas' : 'Otros'}
                    </button>
                  ))}
                </div>

                {/* SILLAS BUILDER */}
                {addTab === 'silla' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Modelo</label>
                        <select 
                          value={sillaForm.model} 
                          onChange={e => setSillaForm({ model: e.target.value, wood: '', fabric: '', color: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar modelo...</option>
                          {catalog.chairs.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Madera</label>
                        <select 
                          disabled={!sillaForm.model}
                          value={sillaForm.wood} 
                          onChange={e => setSillaForm({ ...sillaForm, wood: e.target.value, fabric: '', color: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar madera...</option>
                          {sillaForm.model && Object.keys(catalog.chairs.find(c => c.name === sillaForm.model)?.prices || {}).map(w => (
                            <option key={w} value={w}>{titleCase(w)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tela</label>
                        <select 
                          disabled={!sillaForm.wood}
                          value={sillaForm.fabric} 
                          onChange={e => setSillaForm({ ...sillaForm, fabric: e.target.value, color: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar tela...</option>
                          {sillaForm.wood && Object.keys(catalog.chairs.find(c => c.name === sillaForm.model)?.prices[sillaForm.wood] || {}).map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Conditional Fabric Colors */}
                    {sillaForm.fabric && (sillaForm.fabric === 'Lino' || sillaForm.fabric === 'Pana') && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Color de {sillaForm.fabric}</label>
                        <select 
                          value={sillaForm.color} 
                          onChange={e => setSillaForm({ ...sillaForm, color: e.target.value })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar color...</option>
                          {(catalog.chairColors[sillaForm.fabric] || []).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Pricing & Add buttons */}
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div>
                        <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                        {renderBudgetEditablePrice(
                          catalog.chairs.find(c => c.name === sillaForm.model)?.prices[sillaForm.wood]?.[sillaForm.fabric] ?? null,
                          budgetSillaOverride,
                          setBudgetSillaOverride
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="s-qty" min="1" defaultValue="1" className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none text-center w-full font-medium shadow-xs" />
                        </div>
                        <button 
                          onClick={addSilla}
                          disabled={!sillaForm.model || !sillaForm.wood || !sillaForm.fabric || ((sillaForm.fabric === 'Lino' || sillaForm.fabric === 'Pana') && !sillaForm.color)}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MESAS BUILDER */}
                {addTab === 'mesa' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                        <select 
                          value={mesaForm.wood} 
                          onChange={e => setMesaForm({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar madera...</option>
                          {catalog.tables.map(t => <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de Base *</label>
                        <select 
                          disabled={!mesaForm.wood}
                          value={mesaForm.base} 
                          onChange={e => setMesaForm({ ...mesaForm, base: e.target.value })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar base...</option>
                          {catalog.mesaOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Microcemento specific fields */}
                    {mesaForm.wood === 'Microcemento' && (
                      <div className="bg-cream/20 border border-sand/60 rounded-xl p-3.5 flex flex-col gap-2.5">
                        <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                            <select 
                              value={mesaForm.color} 
                              onChange={e => setMesaForm({ ...mesaForm, color: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                            >
                              <option value="">Color...</option>
                              {catalog.mesaOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                            <select 
                              value={mesaForm.veteado} 
                              onChange={e => setMesaForm({ ...mesaForm, veteado: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                            >
                              <option value="">Veteado...</option>
                              {catalog.mesaOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                            <select 
                              value={mesaForm.brillo} 
                              onChange={e => setMesaForm({ ...mesaForm, brillo: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                            >
                              <option value="">Brillo...</option>
                              {catalog.mesaOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Base de Madera</label>
                            <select 
                              value={mesaForm.baseMadera} 
                              onChange={e => setMesaForm({ ...mesaForm, baseMadera: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                            >
                              <option value="">Base madera...</option>
                              {(catalog.mesaOptions.baseMaderaTypes || DEFAULT_OPTIONS.baseMaderaTypes).map(bm => <option key={bm} value={bm}>{bm}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={mesaForm.w} onChange={e => setMesaForm({ ...mesaForm, w: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={mesaForm.h} onChange={e => setMesaForm({ ...mesaForm, h: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                          {parseNum(mesaForm.w) > 0 && parseNum(mesaForm.h) > 0 && (
                            <span className="text-xs text-terra font-bold ml-2">
                              {(parseNum(mesaForm.w) * parseNum(mesaForm.h)).toFixed(2)} m²
                              {(parseNum(mesaForm.w) * parseNum(mesaForm.h)) < 1.6 && ' (Mín: 1.6m²)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div>
                        <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                        {(() => {
                          const product = catalog.tables.find(t => t.name === mesaForm.wood);
                          const wVal = parseNum(mesaForm.w);
                          const hVal = parseNum(mesaForm.h);
                          if (!product || isNaN(wVal) || isNaN(hVal)) {
                            return <div className="text-xl font-serif font-bold text-terra">—</div>;
                          }
                          const m2 = wVal * hVal;
                          const billable = m2 < 1.6 ? 1.6 : m2;
                          const calcPrice = product.pricePerM2 * billable;
                          return renderBudgetEditablePrice(calcPrice, budgetMesaOverride, setBudgetMesaOverride);
                        })()}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="m-qty" min="1" defaultValue="1" className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none text-center w-full font-medium shadow-xs" />
                        </div>
                        <button 
                          onClick={() => addMesa('mesa')}
                          disabled={!mesaForm.wood || !mesaForm.base || isNaN(parseNum(mesaForm.w)) || isNaN(parseNum(mesaForm.h)) || (mesaForm.wood === 'Microcemento' && (!mesaForm.color || !mesaForm.veteado || !mesaForm.brillo))}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MESAS CIRCULARES BUILDER */}
                {addTab === 'circular' && (
                  <div className="flex flex-col gap-4">
                    {catalog.circular.length === 0 ? (
                      <div className="text-center p-6 text-stone italic text-sm">
                        No hay catálogo de mesas circulares cargado en la planilla.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                            <select 
                              value={circularForm.wood} 
                              onChange={e => setCircularForm({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                            >
                              <option value="">Seleccionar madera...</option>
                              {catalog.circular.map(t => <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>)}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de Base *</label>
                            <select 
                              disabled={!circularForm.wood}
                              value={circularForm.base} 
                              onChange={e => setCircularForm({ ...circularForm, base: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                            >
                              <option value="">Seleccionar base...</option>
                              {catalog.circularOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Circular Microcemento specific fields */}
                        {circularForm.wood === 'Microcemento' && (
                          <div className="bg-cream/20 border border-sand/60 rounded-xl p-3.5 flex flex-col gap-2.5">
                            <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                                <select 
                                  value={circularForm.color} 
                                  onChange={e => setCircularForm({ ...circularForm, color: e.target.value })}
                                  className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                                >
                                  <option value="">Color...</option>
                                  {catalog.circularOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                                <select 
                                  value={circularForm.veteado} 
                                  onChange={e => setCircularForm({ ...circularForm, veteado: e.target.value })}
                                  className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                                >
                                  <option value="">Veteado...</option>
                                  {catalog.circularOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                                <select 
                                  value={circularForm.brillo} 
                                  onChange={e => setCircularForm({ ...circularForm, brillo: e.target.value })}
                                  className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                                >
                                  <option value="">Brillo...</option>
                                  {catalog.circularOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Base de Madera</label>
                                <select 
                                  value={circularForm.baseMadera} 
                                  onChange={e => setCircularForm({ ...circularForm, baseMadera: e.target.value })}
                                  className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs cursor-pointer"
                                >
                                  <option value="">Base madera...</option>
                                  {(catalog.circularOptions.baseMaderaTypes || DEFAULT_OPTIONS.baseMaderaTypes).map(bm => <option key={bm} value={bm}>{bm}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Diámetro x Diámetro)</label>
                            <div className="flex items-center gap-2">
                              <input type="text" placeholder="Ancho" value={circularForm.w} onChange={e => setCircularForm({ ...circularForm, w: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                              <span className="text-stone">×</span>
                              <input type="text" placeholder="Largo" value={circularForm.h} onChange={e => setCircularForm({ ...circularForm, h: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                              {parseNum(circularForm.w) > 0 && parseNum(circularForm.h) > 0 && (
                                <span className="text-xs text-terra font-bold ml-2">
                                  {(parseNum(circularForm.w) * parseNum(circularForm.h)).toFixed(2)} m²
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                          <div>
                            <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                            {(() => {
                              const product = catalog.circular.find(t => t.name === circularForm.wood);
                              const wVal = parseNum(circularForm.w);
                              const hVal = parseNum(circularForm.h);
                              if (!product || isNaN(wVal) || isNaN(hVal)) {
                                return <div className="text-xl font-serif font-bold text-terra">—</div>;
                              }
                              const calcPrice = product.pricePerM2 * wVal * hVal;
                              return renderBudgetEditablePrice(calcPrice, budgetCircularOverride, setBudgetCircularOverride);
                            })()}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20">
                              <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                              <input type="number" id="c-qty" min="1" defaultValue="1" className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none text-center w-full font-medium shadow-xs" />
                            </div>
                            <button 
                              onClick={() => addMesa('circular')}
                              disabled={!circularForm.wood || !circularForm.base || isNaN(parseNum(circularForm.w)) || isNaN(parseNum(circularForm.h)) || (circularForm.wood === 'Microcemento' && (!circularForm.color || !circularForm.veteado || !circularForm.brillo))}
                              className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                            >
                              + Agregar
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* RATONAS BUILDER */}
                {addTab === 'ratona' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                        <select 
                          value={ratonaForm.wood} 
                          onChange={e => setRatonaForm({ wood: e.target.value, w: '', h: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar madera...</option>
                          {catalog.ratonas.map(t => <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={ratonaForm.w} onChange={e => setRatonaForm({ ...ratonaForm, w: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={ratonaForm.h} onChange={e => setRatonaForm({ ...ratonaForm, h: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                          {parseNum(ratonaForm.w) > 0 && parseNum(ratonaForm.h) > 0 && (
                            <span className="text-xs text-terra font-bold ml-2">
                              {(parseNum(ratonaForm.w) * parseNum(ratonaForm.h)).toFixed(2)} m²
                              {(parseNum(ratonaForm.w) * parseNum(ratonaForm.h)) < 1.4 && ' (Mín: 1.4m²)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div>
                        <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                        {(() => {
                          const product = catalog.ratonas.find(t => t.name === ratonaForm.wood);
                          const wVal = parseNum(ratonaForm.w);
                          const hVal = parseNum(ratonaForm.h);
                          if (!product || isNaN(wVal) || isNaN(hVal)) {
                            return <div className="text-xl font-serif font-bold text-terra">—</div>;
                          }
                          const m2 = wVal * hVal;
                          const billable = m2 < 1.4 ? 1.4 : m2;
                          const calcPrice = product.pricePerM2 * billable;
                          return renderBudgetEditablePrice(calcPrice, budgetRatonaOverride, setBudgetRatonaOverride);
                        })()}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="r-qty" min="1" defaultValue="1" className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none text-center w-full font-medium shadow-xs" />
                        </div>
                        <button 
                          onClick={addRatona}
                          disabled={!ratonaForm.wood || isNaN(parseNum(ratonaForm.w)) || isNaN(parseNum(ratonaForm.h))}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* OTROS BUILDER */}
                {addTab === 'otro' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Nombre Producto</label>
                        <input type="text" placeholder="Ej. Reposera premium" value={otroForm.nombre} onChange={e => setOtroForm({ ...otroForm, nombre: e.target.value })} className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none w-full font-medium shadow-xs" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Detalle</label>
                        <input type="text" placeholder="Ej. Madera de petiribí, tela impermeable" value={otroForm.detalle} onChange={e => setOtroForm({ ...otroForm, detalle: e.target.value })} className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none w-full font-medium shadow-xs" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Precio Unitario ($)</label>
                        <input type="text" placeholder="Ej. 150000" value={otroForm.precio} onChange={e => setOtroForm({ ...otroForm, precio: e.target.value })} className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none w-44 font-medium shadow-xs" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="o-qty" min="1" defaultValue="1" className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none text-center w-full font-medium shadow-xs" />
                        </div>
                        <button 
                          onClick={addOtro}
                          disabled={!otroForm.nombre.trim() || !parsePrice(otroForm.precio)}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FORMA DE PAGO CARD */}
              <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-brown mb-4 border-b border-sand pb-2">Forma de Pago</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {pagosData.map((pago, index) => {
                    const isSelected = selectedPago === index;
                    return (
                      <button
                        key={pago.name}
                        type="button"
                        onClick={() => setSelectedPago(index)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-brown bg-cream/40 shadow-sm ring-1 ring-brown'
                            : 'border-sand/60 hover:border-sand hover:bg-cream/10'
                        }`}
                      >
                        <div className="text-xs font-bold text-brown">{pago.name}</div>
                        <div className="text-[10px] text-stone mt-1.5 font-medium">
                          {pago.recargo < 0 
                            ? `${Math.abs(Math.round(pago.recargo * 100))}% de Descuento` 
                            : pago.recargo > 0 
                              ? `${Math.round(pago.recargo * 100)}% de Recargo` 
                              : 'Sin Recargo'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* PREVIEW & SUMMARY SHEET (RIGHT SIDE - INCLUDES THE SECRET COST SHEET) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* PRIMARY VISUAL QUOTE CARD (WHAT THE CLIENT SEES) */}
              <div className="bg-white border border-sand rounded-xl p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden" id="printable-quote">
                
                {/* Brand watermarks & header */}
                <div className="flex justify-between items-center border-b border-sand pb-4">
                  <BardaLogo size="lg" subtitleText="PRESUPUESTO" />
                  <div className="text-right">
                    <p className="text-xs text-stone font-medium">{fmtDate(budgetDate)}</p>
                    <p className="text-[10px] text-stone tracking-wide uppercase mt-1">Validez: 15 días</p>
                  </div>
                </div>

                {/* Client detail list */}
                {cliente.nombre && (
                  <div className="bg-light-cream/40 border border-sand/40 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                    <div><span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">Cliente:</span> <strong className="text-brown">{cliente.nombre}</strong></div>
                    {cliente.telefono && <div><span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">Teléfono:</span> {cliente.telefono}</div>}
                    {cliente.cuit && <div><span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">CUIT/CUIL:</span> {cliente.cuit}</div>}
                    {cliente.direccion && (
                      <div>
                        <span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">Dirección:</span> 
                        {cliente.direccion}
                        {cliente.cp && <span className="text-stone ml-1"> (C.P. {cliente.cp})</span>}
                      </div>
                    )}
                    {!cliente.direccion && cliente.cp && (
                      <div>
                        <span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">C.P.:</span> 
                        {cliente.cp}
                      </div>
                    )}
                    {(cliente.ciudad || cliente.provincia) && (
                      <div>
                        <span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">Ciudad / Prov:</span> 
                        {[cliente.ciudad, cliente.provincia].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Line Items Table */}
                <div className="flex-1">
                  {quoteItems.length === 0 ? (
                    <div className="text-center py-12 text-stone italic font-serif text-sm">
                      Presupuesto vacío. Agregue productos para comenzar.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      <div className="border-b border-sand pb-1 text-[10px] tracking-wider text-stone uppercase font-bold flex justify-between">
                        <span>Detalle de Productos</span>
                        <span>Total</span>
                      </div>
                      
                      {quoteItems.map(it => {
                        const recargo = pagosData[selectedPago]?.recargo ?? 0;
                        const isDiscount = recargo < 0; // only show individual line discount modification if recargo is negative (discount)
                        const origUnitPrice = it.unitPrice;
                        const finalUnitPrice = Math.round(origUnitPrice * (1 + recargo));
                        const origRowTotal = origUnitPrice * it.qty;
                        const finalRowTotal = Math.round(finalUnitPrice * it.qty);

                        return (
                          <div key={it.id} className="border-b border-sand/30 pb-3 flex flex-col gap-1.5">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="font-semibold text-xs text-brown">{it.name}</div>
                                <div className="text-[10px] text-stone mt-0.5">{it.detail}</div>
                              </div>
                            </div>
                            
                            {/* Quantity and unit price on left, total on right */}
                            <div className="flex justify-between items-end text-[11px] text-stone mt-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>Cant: <strong className="text-brown">{it.qty}</strong></span>
                                <span className="text-sand/50">•</span>
                                <span>
                                  Precio unitario: {' '}
                                  {isDiscount ? (
                                    <>
                                      <span className="line-through text-stone/40 mr-1.5 font-normal">{fmt(origUnitPrice)}</span>
                                      <strong className="text-terra font-bold">{fmt(finalUnitPrice)}</strong>
                                    </>
                                  ) : (
                                    <strong className="text-brown">{fmt(origUnitPrice)}</strong>
                                  )}
                                </span>
                              </div>
                              
                              <div className="text-right">
                                <strong className="text-xs text-brown font-mono">
                                  {isDiscount ? (
                                    <>
                                      <span className="line-through text-stone/40 text-[10px] mr-1.5 font-normal">{fmt(origRowTotal)}</span>
                                      <span className="text-terra font-bold">{fmt(finalRowTotal)}</span>
                                    </>
                                  ) : (
                                    fmt(origRowTotal)
                                  )}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Standard Client Totals Box */}
                {quoteItems.length > 0 && (
                  <div className="border-t border-sand pt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-stone">
                      <span>Subtotal</span>
                      <span>{fmt(subtotalPrice)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-error font-medium">
                          <span>Descuento aplicado</span>
                          <span>- {fmt(discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-stone line-through">
                          <span>Precio de Lista Sugerido</span>
                          <span>{fmt(suggestedPrice)}</span>
                        </div>
                      </>
                    )}

                    {/* Delivery Plazo Date */}
                    {calcDeliveryDate() && (
                      <div className="flex justify-between text-[11px] text-stone mt-2">
                        <span>Plazo de entrega estimado</span>
                        <strong className="text-brown">{calcDeliveryDate()}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Payment option values (Forma de Pago) - MOVED HERE, BELOW THE BUDGET */}
                {quoteItems.length > 0 && (
                  <div className="bg-cream/40 border border-sand rounded-xl p-4 flex flex-col gap-2 mt-2">
                    {(() => {
                      const recargo = pagosData[selectedPago]?.recargo ?? 0;
                      const name = pagosData[selectedPago]?.name || '';
                      const parts = name.split(' ');
                      const cuotasCount = parseInt(parts[0]);
                      const hasCuotas = name.toLowerCase().includes('cuotas') && !isNaN(cuotasCount) && cuotasCount > 0;

                      if (recargo > 0) {
                        const recargoValue = Math.round(finalBudgetValue * recargo);
                        const finalTotal = Math.round(finalBudgetValue * (1 + recargo));
                        return (
                          <div className="flex flex-col gap-2">
                            <div className="font-serif text-sm font-bold text-brown border-b border-sand/40 pb-1 mb-1">
                              {name}
                            </div>
                            <div className="flex justify-between text-xs text-stone">
                              <span>Total de Productos</span>
                              <span>{fmt(finalBudgetValue)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-stone">
                              <span>Recargo ({Math.round(recargo * 100)}%)</span>
                              <span>{fmt(recargoValue)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-brown border-t border-sand/40 pt-1.5 mt-0.5">
                              <span>Total Final</span>
                              <span className="text-terra text-sm">{fmt(finalTotal)}</span>
                            </div>
                            {hasCuotas && (
                              <div className="flex justify-between text-[11px] text-stone border-t border-dashed border-sand/50 pt-1.5 mt-1">
                                <span>{cuotasCount} cuotas mensuales de</span>
                                <strong className="text-terra">{fmt(Math.round(finalTotal / cuotasCount))}</strong>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="font-serif text-sm font-bold text-brown">{name}</span>
                                {recargo < 0 && (
                                  <span className="text-[10px] text-stone font-medium">({Math.abs(Math.round(recargo * 100))}% de Descuento)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {recargo !== 0 && (
                                  <span className="line-through text-stone/50 text-xs font-semibold">
                                    {fmt(finalBudgetValue)}
                                  </span>
                                )}
                                <span className="font-serif text-lg font-bold text-terra">
                                  {fmt(Math.round(finalBudgetValue * (1 + recargo)))}
                                </span>
                              </div>
                            </div>
                            
                            {/* Instalment helper if applicable */}
                            {hasCuotas && (
                              <div className="flex justify-between text-[11px] text-stone border-t border-sand/50 pt-1.5 mt-1">
                                <span>{cuotasCount} cuotas mensuales de</span>
                                <strong className="text-terra">
                                  {fmt(Math.round((finalBudgetValue * (1 + recargo)) / cuotasCount))}
                                </strong>
                              </div>
                            )}
                          </>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>

              {/* PRIVATE COST SHEET & PROFITABILITY SPREADSHEET (NEVER PRINTED) */}
              {quoteItems.length > 0 && (
                <div className="bg-white border border-sand rounded-xl p-5 shadow-sm print:hidden">
                  <div className="flex justify-between items-center border-b border-sand pb-3 mb-4">
                    <button 
                      onClick={() => setViewCosts(!viewCosts)}
                      className="flex items-center gap-2 text-brown hover:text-terra font-serif text-base font-bold outline-none"
                    >
                      {viewCosts ? <ChevronUp className="w-4 h-4 text-terra" /> : <ChevronDown className="w-4 h-4 text-terra" />}
                      Costos y Rentabilidad 📊
                    </button>
                    <span className="text-[10px] bg-terra/10 text-terra font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Privado
                    </span>
                  </div>

                  {viewCosts && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-light-cream/50 rounded-lg p-3 border border-sand/60 flex flex-col gap-2">
                        <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Márgenes de Costo Predeterminados</div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="20" 
                            max="80" 
                            value={defaultMarginPercent} 
                            onChange={e => {
                              setDefaultMarginPercent(parseInt(e.target.value));
                              setCustomCosts({}); // reset overrides on global change
                            }}
                            className="flex-1 accent-terra cursor-pointer"
                          />
                          <span className="text-xs font-bold text-terra w-12 text-right">
                            {defaultMarginPercent}% Costo
                          </span>
                        </div>
                        <p className="text-[10px] text-stone italic">
                          Por defecto se estima que el costo del producto es el {defaultMarginPercent}% del precio de venta (ganancia del {100 - defaultMarginPercent}%). Podés editar el costo de cada ítem de forma independiente en la planilla de abajo.
                        </p>
                      </div>

                      {/* Google Sheet lookalike table */}
                      <div className="overflow-x-auto border border-sand rounded-lg">
                        <table className="w-full text-xs text-left bg-white">
                          <thead>
                            <tr className="bg-light-cream border-b border-sand">
                              <th className="p-2 label">Item</th>
                              <th className="p-2 label">Venta Unit</th>
                              <th className="p-2 label text-center">Costo Unit (Editable)</th>
                              <th className="p-2 label text-right">Ganancia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quoteItems.map(it => {
                              const recargo = pagosData[selectedPago]?.recargo ?? 0;
                              const finalUnitPrice = Math.round(it.unitPrice * (1 + recargo));
                              const uCost = getUnitCost(it);
                              const profit = (finalUnitPrice - uCost) * it.qty;
                              const margin = finalUnitPrice > 0 ? ((finalUnitPrice - uCost) / finalUnitPrice) * 100 : 0;
                              return (
                                <tr key={it.id} className="border-b border-sand/40 hover:bg-light-cream/30">
                                  <td className="p-2 font-semibold">
                                    {it.name} <span className="text-stone">x{it.qty}</span>
                                  </td>
                                  <td className="p-2 text-stone">
                                    {fmt(finalUnitPrice)}
                                    {recargo !== 0 && (
                                      <div className="text-[9px] text-stone/40 line-through font-normal">
                                        {fmt(it.unitPrice)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-stone text-[10px]">$</span>
                                      <input 
                                        type="number" 
                                        value={uCost} 
                                        onChange={e => setCustomCosts({ ...customCosts, [it.id]: Math.round(parseFloat(e.target.value)) || 0 })}
                                        className="w-20 text-center py-1 px-1.5 border border-sand rounded focus:border-terra bg-white text-xs font-semibold outline-none"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="font-bold text-emerald-700">{fmt(profit)}</div>
                                    <div className="text-[9px] text-stone">{margin.toFixed(0)}% marg.</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Private metrics summary card */}
                      {(() => {
                        const recargo = pagosData[selectedPago]?.recargo ?? 0;
                        const actualVentaTotal = Math.round(finalBudgetValue * (1 + recargo));
                        const actualCostoTotal = totalCostValue;
                        const actualProfitValue = Math.max(0, actualVentaTotal - actualCostoTotal);
                        const actualMarginPercent = actualVentaTotal > 0 ? (actualProfitValue / actualVentaTotal) * 100 : 0;

                        return (
                          <div className="bg-emerald-50/50 border border-emerald-600/25 rounded-xl p-4 flex flex-col gap-2.5">
                            <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                              Rentabilidad de este presupuesto
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-emerald-600/10">
                              <div>
                                <div className="text-[9px] uppercase text-stone font-semibold mb-0.5">Venta total</div>
                                <div className="font-serif font-bold text-brown text-sm">
                                  {fmt(actualVentaTotal)}
                                  {recargo !== 0 && (
                                    <div className="text-[8px] text-stone/60 font-sans font-normal">
                                      Base: {fmt(finalBudgetValue)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] uppercase text-stone font-semibold mb-0.5">Costo total</div>
                                <div className="font-serif font-bold text-brown text-sm">{fmt(actualCostoTotal)}</div>
                              </div>
                              <div>
                                <div className="text-[9px] uppercase text-stone font-semibold mb-0.5">Ganancia neta</div>
                                <div className="font-serif font-bold text-emerald-700 text-sm">{fmt(actualProfitValue)}</div>
                                <div className="text-[9px] text-emerald-800 font-semibold">{actualMarginPercent.toFixed(0)}% marg.</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* FECHA DE ENTREGA CARD (MOVED HERE JUST ABOVE CTA GENERAR PEDIDO) */}
              {quoteItems.length > 0 && (
                <div className="bg-white border border-sand rounded-xl p-5 shadow-sm print:hidden">
                  <h3 className="font-serif text-lg font-bold text-brown mb-4 border-b border-sand pb-2">Plazos y Fecha de Entrega</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold h-6 flex items-center">Fecha Presupuesto</label>
                      <input 
                        type="date" 
                        value={budgetDate} 
                        onChange={e => setBudgetDate(e.target.value)}
                        className="w-full h-10 text-xs px-3 border border-sand rounded-lg bg-white focus:outline-none focus:border-terra font-sans"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold h-6 flex items-center">Plazo (Días)</label>
                      <input 
                        type="number" 
                        placeholder="ej. 30" 
                        value={deliveryDays || ''} 
                        onChange={e => setDeliveryDays(parseInt(e.target.value) || 0)}
                        className="w-full h-10 text-xs px-3 border border-sand rounded-lg bg-white focus:outline-none focus:border-terra font-sans"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold h-6 flex items-center truncate">Fecha Estimada</label>
                      <div className="w-full h-10 text-xs px-3 border border-sand rounded-lg bg-cream/30 font-sans text-brown font-bold flex items-center justify-between min-w-0">
                        <span className="truncate">{calcDeliveryDate()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION CALLS (CLEAR, PRINT, AND NEW GENERATE PURCHASE ORDER) */}
              <div className="flex flex-col gap-3 print:hidden">
                {quoteItems.length > 0 && (
                  <>
                    {orderValidationAttempted && (
                      <div className="text-error bg-error/5 border border-error/20 py-2.5 px-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 font-sans animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Por favor, complete todos los campos de "Datos del Cliente" antes de generar el pedido.</span>
                      </div>
                    )}
                    <button 
                      onClick={handleGenerateOrder}
                      disabled={!canEditPresupuestos}
                      className="w-full bg-brown text-cream border border-brown rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:bg-brown/95 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brown disabled:hover:text-cream"
                    >
                      Generar Orden de Pedido 📋
                    </button>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleSaveBudget}
                        disabled={!canEditPresupuestos}
                        className="flex-1 bg-white text-stone border border-sand rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:border-stone hover:text-brown transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Guardar Presupuesto
                      </button>
                      <button 
                        onClick={handlePrint}
                        className="flex-1 bg-terra text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:bg-brown transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir / PDF
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setRemitoCliente({
                          nombre: cliente.nombre || '',
                          telefono: cliente.telefono || '',
                          cuit: cliente.cuit || '',
                          direccion: cliente.direccion || '',
                          cp: cliente.cp || '',
                          ciudad: cliente.ciudad || '',
                          provincia: cliente.provincia || ''
                        });
                        setRemitoFecha(new Date().toISOString().split('T')[0]);
                        setRemitoDeliveryDate(calcDeliveryDate() !== '—' ? budgetDate : new Date().toISOString().split('T')[0]);
                        setRemitoItems(quoteItems.map((it: any) => ({
                          id: Date.now() + Math.random(),
                          name: it.name,
                          detail: it.detail,
                          unitPrice: it.unitPrice,
                          qty: it.qty,
                          category: it.category
                        })));
                        setActiveTab('ventas');
                        setVentasSubTab('remitos');
                      }}
                      className="w-full bg-transparent border border-brown text-brown hover:bg-brown hover:text-cream rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      Copiar a Remito 📄
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <PresupuestosEstadosDashboard
            quotes={quotesLog}
            fmt={fmt}
            onNewQuoteClick={() => setPresupuestosSubTab('nuevo')}
            onUpdateQuoteStatus={handleUpdateQuoteStatus}
            onDeleteQuote={handleDeleteQuote}
            onLoadQuoteToCotizador={handleLoadQuoteToCotizador}
            onConvertToSale={handleConvertToSale}
            canEdit={canEditPresupuestos}
          />
        )}
      </div>
    )}

        {/* ======================================================== */}
        {/* VENTAS, REMITOS & FABRICACIÓN MODULE                     */}
        {/* ======================================================== */}
        {activeTab === 'ventas' && (
          <div className="flex flex-col gap-6">

            {/* SUBTABS DE VENTAS (LISTADO / REMITOS / FABRICACIÓN) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-sand p-2 sm:p-2.5 rounded-2xl shadow-xs print:hidden">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {currentUser.permissions.ventas.view && (
                  <button
                    onClick={() => setVentasSubTab('ventas')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      ventasSubTab === 'ventas'
                        ? 'bg-brown text-cream shadow-sm'
                        : 'text-stone hover:bg-cream/40'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-terra" />
                    <span>Listado de Ventas</span>
                  </button>
                )}
                {currentUser.permissions.remitos.view && (
                  <button
                    onClick={() => setVentasSubTab('remitos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      ventasSubTab === 'remitos'
                        ? 'bg-brown text-cream shadow-sm'
                        : 'text-stone hover:bg-cream/40'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-terra" />
                    <span>Remitos & Entregas</span>
                  </button>
                )}
                {currentUser.permissions.fabricacion.view && (
                  <button
                    onClick={() => setVentasSubTab('fabricacion')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      ventasSubTab === 'fabricacion'
                        ? 'bg-brown text-cream shadow-sm'
                        : 'text-stone hover:bg-cream/40'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-terra" />
                    <span>Fabricación & Taller</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] font-bold text-stone/80 hidden lg:inline mr-2">
                BARDA ERP • Módulo Comercial & Ventas
              </span>
            </div>

            {/* BANNER DE VENTAS (HEADER LEAN Y COMPACTO) */}
            <div className="bg-[#3D1F0D] text-cream p-3.5 sm:p-4 rounded-xl shadow-sm border border-terra/30 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-terra/20 rounded-lg text-terra border border-terra/30 shrink-0">
                  {ventasSubTab === 'remitos' ? (
                    <FileText className="w-4 h-4 text-terra" />
                  ) : ventasSubTab === 'fabricacion' ? (
                    <Wrench className="w-4 h-4 text-terra" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-terra" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded-full shadow-xs">
                      ★ DIRECCIÓN COMERCIAL
                    </span>
                    <h2 className="font-serif text-sm sm:text-base font-bold text-cream">
                      {ventasSubTab === 'remitos' 
                        ? 'Remitos & Logística de Entrega' 
                        : ventasSubTab === 'fabricacion' 
                        ? 'Órdenes de Fabricación & Taller' 
                        : 'Gestión de Ventas & Pedidos'}
                    </h2>
                  </div>
                  <p className="text-[11px] text-cream/75 mt-0.5">
                    {ventasSubTab === 'remitos'
                      ? 'Emisión de remitos oficiales X, control de despachos y logística de entregas.'
                      : ventasSubTab === 'fabricacion'
                      ? 'Seguimiento de órdenes de taller, estado de confección y preparado de materiales.'
                      : 'Control de cotizaciones, pedidos confirmados, cobros parciales y seguimiento comercial.'}
                  </p>
                </div>
              </div>

              {/* CONTEO DE PEDIDOS (RESUMEN LEAN) */}
              <div className="flex items-center gap-2 bg-[#2C1609] border border-cream/15 rounded-lg px-3 py-1.5 shrink-0">
                <span className="text-xs font-medium text-cream/70">
                  {ventasSubTab === 'remitos'
                    ? 'Remitos:'
                    : ventasSubTab === 'fabricacion'
                    ? 'Órdenes:'
                    : 'Registros:'}
                </span>
                <span className="text-xs font-mono font-bold text-terra bg-[#1A0C05] px-2 py-0.5 rounded-md border border-cream/10">
                  {filteredSales.length} {filteredSales.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
            </div>

            {/* SUBTAB 1: LISTADO DE VENTAS */}
            {ventasSubTab === 'ventas' && currentUser.permissions.ventas.view && (
              <div className="flex flex-col gap-6">
                {!canEditVentas && (
              <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para cambiar estados de pedidos, registrar pagos o eliminar ventas.</span>
              </div>
            )}
            {/* 1. FILTERS & SEARCH BAR (ESTILO CONTAGRAM / PRESUPUESTOS) */}
            <div className="bg-white border border-sand rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* SEARCH INPUT */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente o nro de pedido..." 
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  className="w-full text-xs py-2 pl-9 pr-3 border border-sand rounded-lg bg-light-cream/30 text-brown focus:outline-none focus:border-terra font-sans"
                />
              </div>

              {/* DROPDOWN FILTERS */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* ESTADO ENTREGA */}
                <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
                  <span className="text-[11px] font-bold text-stone">Entrega:</span>
                  <select 
                    value={salesStatusFilter} 
                    onChange={e => setSalesStatusFilter(e.target.value)} 
                    className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Producción">En Producción</option>
                    <option value="Listo para Entrega">Listo para Entrega</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>

                {/* ESTADO PAGO */}
                <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
                  <span className="text-[11px] font-bold text-stone">Pago:</span>
                  <select 
                    value={salesPayFilter} 
                    onChange={e => setSalesPayFilter(e.target.value)} 
                    className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Señado">Señado</option>
                    <option value="Pagado">Pagado</option>
                  </select>
                </div>

                {/* MES */}
                <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
                  <span className="text-[11px] font-bold text-stone">Mes:</span>
                  <select 
                    value={salesMonthFilter} 
                    onChange={e => setSalesMonthFilter(e.target.value)} 
                    className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
                  >
                    <option value="Todos">Todos</option>
                    <option value="01">Enero</option>
                    <option value="02">Febrero</option>
                    <option value="03">Marzo</option>
                    <option value="04">Abril</option>
                    <option value="05">Mayo</option>
                    <option value="06">Junio</option>
                    <option value="07">Julio</option>
                    <option value="08">Agosto</option>
                    <option value="09">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>

                {/* AÑO */}
                <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
                  <span className="text-[11px] font-bold text-stone">Año:</span>
                  <select 
                    value={salesYearFilter} 
                    onChange={e => setSalesYearFilter(e.target.value)} 
                    className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
                  >
                    <option value="Todos">Todos</option>
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* RESET BUTTON */}
                {(salesSearch || salesStatusFilter !== 'Todos' || salesPayFilter !== 'Todos' || salesMonthFilter !== 'Todos' || salesYearFilter !== 'Todos') && (
                  <button
                    onClick={() => {
                      setSalesSearch('');
                      setSalesStatusFilter('Todos');
                      setSalesPayFilter('Todos');
                      setSalesMonthFilter('Todos');
                      setSalesYearFilter('Todos');
                    }}
                    className="p-2 text-stone hover:text-terra border border-sand rounded-lg bg-white hover:bg-cream/40 transition-all cursor-pointer"
                    title="Limpiar Filtros"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. KPI SUMMARY BAR (ESTILO CONTAGRAM / PRESUPUESTOS) */}
            <div className="bg-white border border-sand rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-sand/50 gap-4 lg:gap-0">
                
                {/* CARD 1: ENTREGADOS */}
                <div className="flex flex-col justify-between px-3 py-1">
                  <div className="text-xs font-bold text-stone flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Entregados ({salesMetrics.entregadosCount})</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-serif font-bold text-blue-700">
                      {fmt(salesMetrics.entregadosTotal)}
                    </span>
                  </div>
                </div>

                {/* CARD 2: LISTO PARA ENTREGA */}
                <div className="flex flex-col justify-between px-3 py-1">
                  <div className="text-xs font-bold text-stone flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>Listos p/ Entrega ({salesMetrics.listosCount})</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-serif font-bold text-emerald-700">
                      {fmt(salesMetrics.listosTotal)}
                    </span>
                  </div>
                </div>

                {/* CARD 3: EN PRODUCCION */}
                <div className="flex flex-col justify-between px-3 py-1">
                  <div className="text-xs font-bold text-stone flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>En Producción ({salesMetrics.produccionCount})</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-serif font-bold text-amber-700">
                      {fmt(salesMetrics.produccionTotal)}
                    </span>
                  </div>
                </div>

                {/* CARD 4: PENDIENTES */}
                <div className="flex flex-col justify-between px-3 py-1">
                  <div className="text-xs font-bold text-stone flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    <span>Pendientes ({salesMetrics.pendientesCount})</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-serif font-bold text-rose-700">
                      {fmt(salesMetrics.pendientesTotal)}
                    </span>
                  </div>
                </div>

                {/* CARD 5: TOTAL VENTAS */}
                <div className="flex flex-col justify-between px-3 py-1 bg-cream/30 rounded-xl lg:rounded-none">
                  <div className="text-xs font-bold text-brown flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brown"></span>
                    <span>Total Ventas ({salesMetrics.totalCount})</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-serif font-bold text-brown">
                      {fmt(salesMetrics.totalMonto)}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="bg-white border border-sand rounded-xl p-12 text-center text-stone italic font-serif">
                No se encontraron órdenes de pedido guardadas.
              </div>
            ) : (
              <div className="bg-white border border-sand rounded-2xl shadow-sm overflow-hidden">
                {/* TITLE BAR ABOVE TABLE */}
                <div className="px-5 py-4 border-b border-sand flex items-center justify-between bg-light-cream/40">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-terra" />
                    <h3 className="font-serif text-base font-bold text-brown">
                      Listado de Ventas
                    </h3>
                    <span className="text-xs font-bold text-stone bg-white px-2.5 py-0.5 rounded-full border border-sand">
                      {filteredSales.length} resultado(s)
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-stone hidden sm:inline">
                    Hacé clic en la fila para desplegar el detalle del pedido
                  </span>
                </div>

                {/* Desktop/Tablet Table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#3D1F0D] text-cream text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Cliente / Ref.</th>
                        <th className="py-3 px-4">Fecha Pedido</th>
                        <th className="py-3 px-4">Fecha Entrega</th>
                        <th className="py-3 px-4">Categorías</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-right">Saldo Restante</th>
                        <th className="py-3 px-4 text-center">Estados</th>
                        <th className="py-3 px-4 text-center">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/40">
                      {filteredSales.map(order => {
                        const isExpanded = !!expandedOrders[order.id];
                        const orderCategories = Array.from(new Set(order.items?.map((it: any) => it.category || 'Otros') || [])).join(', ');
                        const remainingBalance = order.total - (order.senaAmount || 0);
                        
                        return (
                          <React.Fragment key={order.id}>
                            <tr 
                              onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                              className={`border-b border-sand/40 hover:bg-cream/20 transition-all cursor-pointer ${isExpanded ? 'bg-cream/10' : ''}`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-serif text-xs font-bold text-brown flex items-center gap-1.5">
                                  <span>{order.client?.nombre || 'Consumidor Final'}</span>
                                  {order.attachments && order.attachments.length > 0 && (
                                    <span 
                                      className="inline-flex items-center gap-1 bg-amber-100 text-brown border border-sand px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shadow-2xs"
                                      title={`${order.attachments.length} archivo(s) / plano(s) adjunto(s)`}
                                    >
                                      <Paperclip className="w-2.5 h-2.5 text-terra" />
                                      <span>{order.attachments.length}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[9px] text-terra mt-0.5 font-bold">{order.orderNum}</div>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-stone font-mono">
                                {fmtDate(order.date)}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-stone font-semibold">
                                {order.deliveryDate || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-stone">
                                <span className="px-2 py-0.5 bg-sand/30 rounded text-[10px] font-bold text-brown">
                                  {orderCategories || 'Otros'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-xs font-bold text-brown font-mono">
                                {fmt(order.total)}
                              </td>
                              <td className="py-3.5 px-4 text-right text-xs font-bold text-terra font-mono">
                                {fmt(remainingBalance)}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1 items-center">
                                  <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-lg border font-bold uppercase tracking-wider ${
                                    order.status === 'Entregado' ? 'bg-blue-600/10 text-blue-700 border-blue-600/30' :
                                    order.status === 'Listo para Entrega' ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/30' :
                                    order.status === 'En Producción' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
                                    'bg-rose-600/10 text-rose-700 border-rose-600/30'
                                  }`}>
                                    {order.status}
                                  </span>
                                  <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-lg border font-bold uppercase tracking-wider ${
                                    order.paymentStatus === 'Pagado' ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/30' :
                                    order.paymentStatus === 'Señado' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
                                    'bg-stone/10 text-stone border-stone/30'
                                  }`}>
                                    {order.paymentStatus}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button className="text-stone hover:text-terra transition-all">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Panel for Desktop */}
                            {isExpanded && (
                              <tr onClick={e => e.stopPropagation()}>
                                <td colSpan={8} className="p-0 bg-light-cream/10 border-b border-sand">
                                  <div className="p-5 flex flex-col md:flex-row gap-6">
                                    {/* Column 1: Product detail list */}
                                    <div className="flex-1 min-w-[250px] bg-white border border-sand/60 rounded-xl p-4 shadow-2xs">
                                      <h5 className="text-[10px] uppercase font-bold text-stone tracking-wider border-b border-sand pb-1.5 mb-2.5">Detalle de Productos</h5>
                                      <ul className="divide-y divide-sand/30 flex flex-col gap-1.5">
                                        {order.items?.map((it: any, index: number) => (
                                          <li key={index} className="pt-1.5 first:pt-0 flex justify-between items-start text-xs">
                                            <div>
                                              <span className="font-bold text-brown">{it.qty}x</span> <span className="font-medium text-stone">{it.name}</span>
                                              <p className="text-[10px] text-stone italic mt-0.5">{it.detail}</p>
                                            </div>
                                            <span className="text-[9px] uppercase font-bold text-stone px-1.5 py-0.5 bg-sand/20 rounded shrink-0">{it.category}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Column 2: Financial summary and Notes */}
                                    <div className="flex-1 min-w-[250px] flex flex-col gap-4">
                                      <div className="bg-white border border-sand/60 rounded-xl p-4 shadow-2xs">
                                        <h5 className="text-[10px] uppercase font-bold text-stone tracking-wider border-b border-sand pb-1.5 mb-2.5">Resumen Financiero</h5>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <div className="text-[9px] uppercase text-stone font-semibold mb-0.5">Venta Total</div>
                                            <div className="font-bold text-brown text-sm font-mono">{fmt(order.total)}</div>
                                          </div>
                                          <div>
                                            <div className="text-[9px] uppercase text-stone font-semibold mb-0.5">Ganancia Est.</div>
                                            <div className="font-bold text-emerald-700 text-sm font-mono">{fmt(order.profit)}</div>
                                          </div>
                                          <div className="col-span-2 bg-light-cream/40 border border-sand/40 rounded p-2.5 mt-1 flex flex-col gap-1.5">
                                            <div className="flex justify-between text-xs">
                                              <span className="text-stone">Seña abonada:</span>
                                              <span className="font-bold text-brown font-mono">{fmt(order.senaAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs border-t border-sand/40 pt-1.5 mt-0.5 font-bold">
                                              <span className="text-stone">Saldo Restante:</span>
                                              <span className="text-terra font-mono">{fmt(remainingBalance)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Notes */}
                                      {order.notes && (
                                        <div className="bg-amber-50/15 border border-sand rounded-xl p-3 text-xs italic text-stone">
                                          <span className="block not-italic font-bold text-[9px] uppercase tracking-wider text-stone mb-1">Notas especiales:</span>
                                          "{order.notes}"
                                        </div>
                                      )}

                                      {/* Attachments Display */}
                                      {order.attachments && order.attachments.length > 0 && (
                                        <div className="bg-white border border-sand/60 rounded-xl p-3 shadow-2xs flex flex-col gap-2">
                                          <div className="flex items-center justify-between border-b border-sand pb-1.5">
                                            <h5 className="text-[10px] uppercase font-bold text-brown tracking-wider flex items-center gap-1">
                                              <Paperclip className="w-3.5 h-3.5 text-terra" />
                                              Adjuntos y Planos ({order.attachments.length})
                                            </h5>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            {order.attachments.map((att: any) => {
                                              const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                                              return (
                                                <div 
                                                  key={att.id} 
                                                  onClick={() => {
                                                    if (isImg) {
                                                      setPreviewImage({ url: att.dataUrl, name: att.name });
                                                    } else {
                                                      const link = document.createElement('a');
                                                      link.href = att.dataUrl;
                                                      link.download = att.name;
                                                      link.click();
                                                    }
                                                  }}
                                                  className="group bg-light-cream/40 hover:bg-cream/60 border border-sand/80 rounded-lg p-1.5 flex items-center gap-2 cursor-pointer transition-all overflow-hidden"
                                                >
                                                  {isImg ? (
                                                    <img src={att.dataUrl} alt={att.name} className="w-10 h-10 object-cover rounded border border-sand shrink-0 group-hover:scale-105 transition-transform" />
                                                  ) : (
                                                    <div className="w-10 h-10 bg-terra/10 text-terra rounded flex items-center justify-center shrink-0">
                                                      <File className="w-5 h-5" />
                                                    </div>
                                                  )}
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-brown truncate">{att.name}</p>
                                                    <span className="text-[8px] font-bold text-terra flex items-center gap-0.5 mt-0.5">
                                                      <Eye className="w-2.5 h-2.5" /> {isImg ? 'Ver foto' : 'Descargar'}
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Column 3: Actions & Status Selects */}
                                    <div className="w-full md:w-64 flex flex-col gap-4">
                                      <button
                                        onClick={() => {
                                          setEditingSale({
                                            ...order,
                                            items: order.items ? order.items.map((it: any) => ({ ...it })) : [],
                                            client: { ...order.client },
                                            attachments: order.attachments ? [...order.attachments] : []
                                          });
                                        }}
                                        disabled={!canEditVentas}
                                        className="w-full py-2.5 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500 hover:text-white text-brown rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs group"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-terra group-hover:text-white" />
                                        <span>Editar Venta / Precio / Costo</span>
                                      </button>

                                      <div className="bg-white border border-sand/60 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
                                        <h5 className="text-[10px] uppercase font-bold text-stone tracking-wider border-b border-sand pb-1.5">Actualizar Estados</h5>
                                        
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] uppercase font-bold text-stone">Entrega</label>
                                          <select 
                                            value={order.status} 
                                            onChange={e => updateOrderStatus(order.id, 'status', e.target.value)}
                                            disabled={!canEditVentas}
                                            className={`text-xs py-1 px-2 border rounded font-semibold focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                              order.status === 'Entregado' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                                              order.status === 'Listo para Entrega' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                                              order.status === 'En Producción' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                                              'bg-stone/5 border-sand text-stone'
                                            }`}
                                          >
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="En Producción">En Producción</option>
                                            <option value="Listo para Entrega">Listo para Entrega</option>
                                            <option value="Entregado">Entregado</option>
                                          </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] uppercase font-bold text-stone">Pago</label>
                                          <select 
                                            value={order.paymentStatus} 
                                            onChange={e => updateOrderStatus(order.id, 'paymentStatus', e.target.value)}
                                            disabled={!canEditVentas}
                                            className={`text-xs py-1 px-2 border rounded font-semibold focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                              order.paymentStatus === 'Pagado' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                                              order.paymentStatus === 'Señado' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                                              'bg-stone/5 border-sand text-stone'
                                            }`}
                                          >
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Señado">Señado</option>
                                            <option value="Pagado">Pagado</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          onClick={() => {
                                            setRemitoCliente({
                                              nombre: order.client.nombre || '',
                                              telefono: order.client.telefono || '',
                                              cuit: order.client.cuit || '',
                                              direccion: order.client.direccion || '',
                                              cp: order.client.cp || '',
                                              ciudad: order.client.ciudad || '',
                                              provincia: order.client.provincia || ''
                                            });
                                            setRemitoNumero(order.orderNum ? order.orderNum.replace('PE-', '') : '');
                                            setRemitoFecha(new Date().toISOString().split('T')[0]);
                                            setRemitoDeliveryDate(order.deliveryDate || new Date().toISOString().split('T')[0]);
                                            setRemitoItems(order.items.map((it: any) => ({
                                              id: Date.now() + Math.random(),
                                              name: it.name,
                                              detail: it.detail,
                                              unitPrice: it.unitPrice,
                                              qty: it.qty,
                                              category: it.category
                                            })));
                                            setActiveTab('ventas');
                                            setVentasSubTab('remitos');
                                          }}
                                          className="py-2 border border-stone/40 hover:bg-stone/5 text-stone rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                                        >
                                          <FileText className="w-3.5 h-3.5" /> Remito
                                        </button>

                                        <button
                                          onClick={() => handleSendToTaller(order)}
                                          className="py-2 border border-terra hover:bg-terra hover:text-white text-terra rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                                        >
                                          <Wrench className="w-3.5 h-3.5" /> Taller
                                        </button>
                                      </div>

                                      <button 
                                        onClick={() => deleteOrder(order.id)}
                                        disabled={!canEditVentas}
                                        className="w-full py-2 border border-rose-200 hover:bg-rose-50 hover:text-error text-stone rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar Pedido
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list view */}
                <div className="block md:hidden divide-y divide-sand/40">
                  {filteredSales.map(order => {
                    const isExpanded = !!expandedOrders[order.id];
                    const orderCategories = Array.from(new Set(order.items?.map((it: any) => it.category || 'Otros') || [])).join(', ');
                    const remainingBalance = order.total - (order.senaAmount || 0);

                    return (
                      <div key={order.id} className="p-4 flex flex-col gap-2 bg-white">
                        <div 
                          className="flex justify-between items-start gap-2 cursor-pointer"
                          onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-terra font-bold">{order.orderNum}</span>
                              {order.attachments && order.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-brown border border-sand px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">
                                  <Paperclip className="w-2.5 h-2.5 text-terra" />
                                  <span>{order.attachments.length}</span>
                                </span>
                              )}
                            </div>
                            <h4 className="font-serif text-sm font-bold text-brown truncate">{order.client?.nombre || 'Consumidor Final'}</h4>
                            <div className="flex flex-wrap gap-2 text-[10px] text-stone mt-1">
                              <span>Pedido: {fmtDate(order.date)}</span>
                              <span>•</span>
                              <span className="font-semibold text-terra">Entrega: {order.deliveryDate || '—'}</span>
                            </div>
                            <div className="mt-1.5">
                              <span className="px-1.5 py-0.5 bg-sand/30 rounded text-[9px] font-bold text-brown">
                                {orderCategories || 'Otros'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="font-mono text-xs font-bold text-brown">{fmt(order.total)}</div>
                            <div className="text-[10px] text-stone">Saldo: <span className="font-bold text-terra font-mono">{fmt(remainingBalance)}</span></div>
                            <span className="text-[10px] text-stone mt-1">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline text-terra" /> : <ChevronDown className="w-3.5 h-3.5 inline text-stone" />}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details for Mobile */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-dashed border-sand flex flex-col gap-4 bg-light-cream/10 p-3 rounded-lg animate-fadeIn">
                            {/* Products details */}
                            <div className="text-xs bg-white border border-sand/40 rounded-lg p-2.5">
                              <div className="font-bold text-brown mb-1.5 uppercase text-[9px] tracking-wider">Productos:</div>
                              <ul className="flex flex-col gap-1.5">
                                {order.items?.map((it: any, index: number) => (
                                  <li key={index} className="flex justify-between items-start text-[11px]">
                                    <div>
                                      <strong className="text-brown">{it.qty}x</strong> {it.name}
                                      <span className="block text-[10px] text-stone">{it.detail}</span>
                                    </div>
                                    <span className="text-[8px] bg-sand/20 font-bold px-1.5 py-0.5 rounded text-stone uppercase">{it.category}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Financial */}
                            <div className="text-xs bg-white border border-sand/40 rounded-lg p-2.5 flex flex-col gap-1">
                              <div className="flex justify-between">
                                <span className="text-stone">Ganancia Est.:</span>
                                <span className="font-bold text-emerald-700 font-mono">{fmt(order.profit)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone">Seña abonada:</span>
                                <span className="font-bold text-brown font-mono">{fmt(order.senaAmount)}</span>
                              </div>
                            </div>

                            {order.notes && (
                              <div className="text-[11px] text-stone bg-white p-2.5 rounded-lg border border-sand/40 italic">
                                "{order.notes}"
                              </div>
                            )}

                            {/* Attachments Display Mobile */}
                            {order.attachments && order.attachments.length > 0 && (
                              <div className="bg-white border border-sand/60 rounded-xl p-2.5 shadow-2xs flex flex-col gap-2">
                                <div className="flex items-center justify-between border-b border-sand pb-1 text-[10px] uppercase font-bold text-brown">
                                  <span className="flex items-center gap-1">
                                    <Paperclip className="w-3 h-3 text-terra" />
                                    Adjuntos ({order.attachments.length})
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {order.attachments.map((att: any) => {
                                    const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                                    return (
                                      <div 
                                        key={att.id} 
                                        onClick={() => {
                                          if (isImg) setPreviewImage({ url: att.dataUrl, name: att.name });
                                          else {
                                            const link = document.createElement('a');
                                            link.href = att.dataUrl;
                                            link.download = att.name;
                                            link.click();
                                          }
                                        }}
                                        className="bg-light-cream/40 border border-sand/80 rounded p-1 flex items-center gap-1.5 cursor-pointer"
                                      >
                                        {isImg ? (
                                          <img src={att.dataUrl} alt={att.name} className="w-8 h-8 object-cover rounded border border-sand shrink-0" />
                                        ) : (
                                          <div className="w-8 h-8 bg-terra/10 text-terra rounded flex items-center justify-center shrink-0">
                                            <File className="w-4 h-4" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[9px] font-bold text-brown truncate">{att.name}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Edit Sale Button Mobile */}
                            <button
                              onClick={() => {
                                setEditingSale({
                                  ...order,
                                  items: order.items ? order.items.map((it: any) => ({ ...it })) : [],
                                  client: { ...order.client },
                                  attachments: order.attachments ? [...order.attachments] : []
                                });
                              }}
                              disabled={!canEditVentas}
                              className="w-full py-2 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500 hover:text-white text-brown rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                            >
                              <Pencil className="w-3.5 h-3.5 text-terra" />
                              <span>Editar Venta / Precio / Costo</span>
                            </button>

                            {/* States selects */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] uppercase font-bold text-stone">Entrega</label>
                                <select 
                                  value={order.status} 
                                  onChange={e => updateOrderStatus(order.id, 'status', e.target.value)}
                                  className="text-xs py-1 px-2 border rounded font-semibold focus:outline-none"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="En Producción">En Producción</option>
                                  <option value="Listo para Entrega">Listo para Entrega</option>
                                  <option value="Entregado">Entregado</option>
                                </select>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] uppercase font-bold text-stone">Pago</label>
                                <select 
                                  value={order.paymentStatus} 
                                  onChange={e => updateOrderStatus(order.id, 'paymentStatus', e.target.value)}
                                  className="text-xs py-1 px-2 border rounded font-semibold focus:outline-none"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Señado">Señado</option>
                                  <option value="Pagado">Pagado</option>
                                </select>
                              </div>
                            </div>

                            {/* Actions Buttons */}
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button
                                onClick={() => {
                                  setRemitoCliente({
                                    nombre: order.client.nombre || '',
                                    telefono: order.client.telefono || '',
                                    cuit: order.client.cuit || '',
                                    direccion: order.client.direccion || '',
                                    cp: order.client.cp || '',
                                    ciudad: order.client.ciudad || '',
                                    provincia: order.client.provincia || ''
                                  });
                                  setRemitoNumero(order.orderNum ? order.orderNum.replace('PE-', '') : '');
                                  setRemitoFecha(new Date().toISOString().split('T')[0]);
                                  setRemitoDeliveryDate(order.deliveryDate || new Date().toISOString().split('T')[0]);
                                  setRemitoItems(order.items.map((it: any) => ({
                                    id: Date.now() + Math.random(),
                                    name: it.name,
                                    detail: it.detail,
                                    unitPrice: it.unitPrice,
                                    qty: it.qty,
                                    category: it.category
                                  })));
                                  setActiveTab('ventas');
                                  setVentasSubTab('remitos');
                                }}
                                className="py-2 border border-stone/40 hover:bg-stone/5 text-stone rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                              >
                                <FileText className="w-3.5 h-3.5" /> Remito
                              </button>

                              <button
                                onClick={() => handleSendToTaller(order)}
                                className="py-2 border border-terra hover:bg-terra hover:text-white text-terra rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                              >
                                <Wrench className="w-3.5 h-3.5" /> Taller
                              </button>
                            </div>

                            <button 
                              onClick={() => deleteOrder(order.id)}
                              className="w-full py-2 border border-rose-200 text-stone hover:text-error hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar Pedido
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* FOOTER METRICS SUMMARY */}
                <div className="bg-light-cream/40 px-5 py-3 border-t border-sand flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-stone font-medium">
                  <div>
                    Mostrando <strong className="text-brown">{filteredSales.length}</strong> de <strong className="text-brown">{sales.length}</strong> ventas.
                  </div>

                  <div className="flex items-center gap-2">
                    <span>Suma Total Seleccionada:</span>
                    <strong className="text-brown font-serif text-sm">
                      {fmt(filteredSales.reduce((acc, s) => acc + (s.total || 0), 0))}
                    </strong>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}

            {/* SUBTAB 2: REMITOS (DELIVERY NOTES) */}
            {ventasSubTab === 'remitos' && currentUser.permissions.remitos.view && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* BUILD PANEL (LEFT SIDE) - HIDE ON PRINT */}
            <div className={`lg:col-span-7 flex flex-col gap-6 print:hidden ${!canEditRemitos ? 'pointer-events-none opacity-85 select-none' : ''}`}>
              
              {!canEditRemitos && (
                <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                  <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                  <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para redactar remitos, agregar productos o modificar datos del cliente de entrega.</span>
                </div>
              )}
              
              {/* REMITENTE CARD */}
              <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-sand pb-3 mb-4 gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-brown">Información del Remitente</h3>
                    <p className="text-[11px] text-stone">Seleccioná o configurá quién emite el remito de entrega</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={remitoRemitente.id || 'custom'}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setRemitoRemitente({ ...remitoRemitente, id: 'custom' });
                        } else {
                          const found = remitentesList.find(r => r.id === val);
                          if (found) setRemitoRemitente({ ...found });
                        }
                      }}
                      className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-light-cream/60 text-brown font-bold focus:outline-none focus:border-terra cursor-pointer flex-1 sm:flex-initial"
                    >
                      {remitentesList.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} {r.cuit ? `(${r.cuit})` : ''}
                        </option>
                      ))}
                      <option value="custom">Otro / Personalizado</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setRemitenteForm({ nombre: '', cuit: '', telefono: '' });
                        setEditingRemitenteId(null);
                        setShowManageRemitentesModal(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold text-terra border border-terra/30 rounded-lg bg-terra/5 hover:bg-terra hover:text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Gestionar remitentes guardados"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Gestionar</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Nombre y Apellido / Razón Social</label>
                    <input 
                      type="text" 
                      placeholder="Nombre del Remitente" 
                      value={remitoRemitente.nombre} 
                      onChange={e => setRemitoRemitente({ ...remitoRemitente, nombre: e.target.value, id: 'custom' })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">CUIT / CUIL</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 30-71654321-9" 
                      value={remitoRemitente.cuit} 
                      onChange={e => setRemitoRemitente({ ...remitoRemitente, cuit: e.target.value, id: 'custom' })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Teléfono</label>
                    <input 
                      type="text" 
                      placeholder="Ej. +54 9 11 1234-5678" 
                      value={remitoRemitente.telefono} 
                      onChange={e => setRemitoRemitente({ ...remitoRemitente, telefono: e.target.value, id: 'custom' })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* CLIENT CARD */}
              <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-sand pb-3 mb-4 gap-2">
                  <h3 className="font-serif text-lg font-bold text-brown">Datos de Entrega (Remito)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setRemitoCliente({
                          nombre: cliente.nombre || '',
                          telefono: cliente.telefono || '',
                          cuit: cliente.cuit || '',
                          direccion: cliente.direccion || '',
                          cp: cliente.cp || '',
                          ciudad: cliente.ciudad || '',
                          provincia: cliente.provincia || ''
                        });
                        const estimateDate = calcDeliveryDate();
                        setRemitoDeliveryDate(estimateDate !== '—' ? budgetDate : new Date().toISOString().split('T')[0]);
                        setRemitoItems(quoteItems.map((it: any) => ({
                          id: Date.now() + Math.random(),
                          name: it.name,
                          detail: it.detail,
                          unitPrice: it.unitPrice,
                          qty: it.qty,
                          category: it.category
                        })));
                      }}
                      className="px-2.5 py-1 text-[9px] font-bold text-brown border border-sand rounded bg-light-cream hover:bg-cream transition-all uppercase"
                      title="Copiar datos y productos del presupuesto activo"
                    >
                      Copiar Presupuesto Activo
                    </button>
                    <button
                      onClick={() => {
                        if (sales.length > 0) {
                          const lastOrder = sales[0];
                          setRemitoCliente({
                            nombre: lastOrder.client.nombre || '',
                            telefono: lastOrder.client.telefono || '',
                            cuit: lastOrder.client.cuit || '',
                            direccion: lastOrder.client.direccion || '',
                            cp: lastOrder.client.cp || '',
                            ciudad: lastOrder.client.ciudad || '',
                            provincia: lastOrder.client.provincia || ''
                          });
                          setRemitoNumero(lastOrder.orderNum ? lastOrder.orderNum.replace('PE-', '') : '');
                          setRemitoDeliveryDate(lastOrder.deliveryDate || new Date().toISOString().split('T')[0]);
                          setRemitoItems(lastOrder.items.map((it: any) => ({
                            id: Date.now() + Math.random(),
                            name: it.name,
                            detail: it.detail,
                            unitPrice: it.unitPrice,
                            qty: it.qty,
                            category: it.category
                          })));
                        } else {
                          alert('No hay pedidos registrados aún.');
                        }
                      }}
                      className="px-2.5 py-1 text-[9px] font-bold text-brown border border-sand rounded bg-light-cream hover:bg-cream transition-all uppercase"
                      title="Copiar datos y productos del último pedido"
                    >
                      Copiar Último Pedido
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Cliente</label>
                    <input 
                      type="text" 
                      placeholder="Nombre y Apellido" 
                      value={remitoCliente.nombre} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, nombre: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Teléfono</label>
                    <input 
                      type="text" 
                      placeholder="Teléfono" 
                      value={remitoCliente.telefono} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, telefono: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">CUIT / CUIL</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 20-12345678-9" 
                      value={remitoCliente.cuit} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, cuit: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Código Postal (C.P.)</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 1425" 
                      value={remitoCliente.cp} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, cp: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Dirección de entrega</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Av. Cabildo 1234, CABA" 
                      value={remitoCliente.direccion} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, direccion: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Ciudad</label>
                    <input 
                      type="text" 
                      placeholder="Ciudad" 
                      value={remitoCliente.ciudad} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, ciudad: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Provincia</label>
                    <input 
                      type="text" 
                      placeholder="Provincia" 
                      value={remitoCliente.provincia} 
                      onChange={e => setRemitoCliente({ ...remitoCliente, provincia: e.target.value })}
                      className="w-full text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* PRODUCT ADDER CARD */}
              <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-brown mb-3 border-b border-sand pb-2">Agregar Producto al Remito</h3>
                
                {/* Catalog type tabs */}
                <div className="flex bg-light-cream border border-sand rounded-lg p-0.5 gap-0.5 mb-5 overflow-x-auto">
                  {(['silla', 'mesa', 'circular', 'ratona', 'otro'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setRemitoAddTab(tab)}
                      className={`flex-1 min-w-[70px] text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${remitoAddTab === tab ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
                    >
                      {tab === 'silla' ? 'Sillas' : tab === 'mesa' ? 'Mesas' : tab === 'circular' ? 'Mesas Circ.' : tab === 'ratona' ? 'Ratonas' : 'Otros'}
                    </button>
                  ))}
                </div>

                {/* SILLAS BUILDER */}
                {remitoAddTab === 'silla' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Modelo</label>
                        <select 
                          value={remitoSillaForm.model} 
                          onChange={e => setRemitoSillaForm({ model: e.target.value, wood: '', fabric: '', color: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar modelo...</option>
                          {catalog.chairs.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Madera</label>
                        <select 
                          disabled={!remitoSillaForm.model}
                          value={remitoSillaForm.wood} 
                          onChange={e => setRemitoSillaForm({ ...remitoSillaForm, wood: e.target.value, fabric: '', color: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar madera...</option>
                          {remitoSillaForm.model && Object.keys(catalog.chairs.find(c => c.name === remitoSillaForm.model)?.prices || {}).map(w => (
                            <option key={w} value={w}>{titleCase(w)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tela</label>
                        <select 
                          disabled={!remitoSillaForm.wood}
                          value={remitoSillaForm.fabric} 
                          onChange={e => setRemitoSillaForm({ ...remitoSillaForm, fabric: e.target.value, color: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar tela...</option>
                          {remitoSillaForm.wood && Object.keys(catalog.chairs.find(c => c.name === remitoSillaForm.model)?.prices[remitoSillaForm.wood] || {}).map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Conditional Fabric Colors */}
                    {remitoSillaForm.fabric && (remitoSillaForm.fabric === 'Lino' || remitoSillaForm.fabric === 'Pana') && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Color de {remitoSillaForm.fabric}</label>
                        <select 
                          value={remitoSillaForm.color} 
                          onChange={e => setRemitoSillaForm({ ...remitoSillaForm, color: e.target.value })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar color...</option>
                          {(catalog.chairColors[remitoSillaForm.fabric] || []).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Pricing & Add buttons */}
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div>
                        <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                        {renderRemitoEditablePrice(
                          catalog.chairs.find(c => c.name === remitoSillaForm.model)?.prices[remitoSillaForm.wood]?.[remitoSillaForm.fabric] ?? null,
                          remitoSillaOverride,
                          setRemitoSillaOverride
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="rs-qty" min="1" defaultValue="1" className="text-center w-full text-xs py-2 px-3 border border-sand rounded-md font-sans" />
                        </div>
                        <button 
                          onClick={addSillaRemito}
                          disabled={!remitoSillaForm.model || !remitoSillaForm.wood || !remitoSillaForm.fabric || ((remitoSillaForm.fabric === 'Lino' || remitoSillaForm.fabric === 'Pana') && !remitoSillaForm.color)}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MESAS BUILDER */}
                {remitoAddTab === 'mesa' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                        <select 
                          value={remitoMesaForm.wood} 
                          onChange={e => setMesaFormRemito({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar madera...</option>
                          {catalog.tables.map(t => <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de Base *</label>
                        <select 
                          disabled={!remitoMesaForm.wood}
                          value={remitoMesaForm.base} 
                          onChange={e => setMesaFormRemito({ ...remitoMesaForm, base: e.target.value })}
                          className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          <option value="">Seleccionar base...</option>
                          {catalog.mesaOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Microcemento specific fields */}
                    {remitoMesaForm.wood === 'Microcemento' && (
                      <div className="bg-cream/20 border border-sand/60 rounded-xl p-3.5 flex flex-col gap-2.5">
                        <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                            <select 
                              value={remitoMesaForm.color} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, color: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                            >
                              <option value="">Color...</option>
                              {catalog.mesaOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                            <select 
                              value={remitoMesaForm.veteado} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, veteado: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                            >
                              <option value="">Veteado...</option>
                              {catalog.mesaOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                            <select 
                              value={remitoMesaForm.brillo} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, brillo: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                            >
                              <option value="">Brillo...</option>
                              {catalog.mesaOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Base de Madera</label>
                            <select 
                              value={remitoMesaForm.baseMadera} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, baseMadera: e.target.value })}
                              className="text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                            >
                              <option value="">Base madera...</option>
                              {(catalog.mesaOptions.baseMaderaTypes || DEFAULT_OPTIONS.baseMaderaTypes).map(bm => <option key={bm} value={bm}>{bm}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={remitoMesaForm.w} onChange={e => setMesaFormRemito({ ...remitoMesaForm, w: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={remitoMesaForm.h} onChange={e => setMesaFormRemito({ ...remitoMesaForm, h: e.target.value })} className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" />
                          {parseNum(remitoMesaForm.w) > 0 && parseNum(remitoMesaForm.h) > 0 && (
                            <span className="text-xs text-terra font-bold ml-2">
                              {(parseNum(remitoMesaForm.w) * parseNum(remitoMesaForm.h)).toFixed(2)} m²
                              {(parseNum(remitoMesaForm.w) * parseNum(remitoMesaForm.h)) < 1.6 && ' (Mín: 1.6m²)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div>
                        <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                        {(() => {
                          const product = catalog.tables.find(t => t.name === remitoMesaForm.wood);
                          const wVal = parseNum(remitoMesaForm.w);
                          const hVal = parseNum(remitoMesaForm.h);
                          const m2 = wVal * hVal;
                          const billable = m2 < 1.6 ? 1.6 : m2;
                          const calcPrice = product && !isNaN(m2) ? product.pricePerM2 * billable : null;
                          return renderRemitoEditablePrice(calcPrice, remitoMesaOverride, setRemitoMesaOverride);
                        })()}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="rm-qty" min="1" defaultValue="1" className="text-center w-full text-xs py-2 px-3 border border-sand rounded-md font-sans" />
                        </div>
                        <button 
                          onClick={() => addMesaRemito('mesa')}
                          disabled={!remitoMesaForm.wood || !remitoMesaForm.base || isNaN(parseNum(remitoMesaForm.w)) || isNaN(parseNum(remitoMesaForm.h)) || (remitoMesaForm.wood === 'Microcemento' && (!remitoMesaForm.color || !remitoMesaForm.veteado || !remitoMesaForm.brillo))}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MESAS CIRCULARES BUILDER */}
                {remitoAddTab === 'circular' && (
                  <div className="flex flex-col gap-4">
                    {catalog.circular.length === 0 ? (
                      <div className="text-center p-6 text-stone italic text-sm">
                        No hay catálogo de mesas circulares cargado en la planilla.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                            <select 
                              value={remitoCircularForm.wood} 
                              onChange={e => setCircularFormRemito({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '', baseMadera: '' })}
                              className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                            >
                              <option value="">Seleccionar madera...</option>
                              {catalog.circular.map(t => <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>)}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de Base *</label>
                            <select 
                              disabled={!remitoCircularForm.wood}
                              value={remitoCircularForm.base} 
                              onChange={e => setCircularFormRemito({ ...remitoCircularForm, base: e.target.value })}
                              className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra disabled:opacity-40 font-sans"
                            >
                              <option value="">Seleccionar base...</option>
                              {catalog.circularOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Microcemento specific fields */}
                        {remitoCircularForm.wood === 'Microcemento' && (
                          <div className="bg-cream/20 border border-sand/60 rounded-xl p-3.5 flex flex-col gap-2.5">
                            <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                                <select 
                                  value={remitoCircularForm.color} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, color: e.target.value })}
                                  className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none"
                                >
                                  <option value="">Color...</option>
                                  {catalog.circularOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                                <select 
                                  value={remitoCircularForm.veteado} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, veteado: e.target.value })}
                                  className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none"
                                >
                                  <option value="">Veteado...</option>
                                  {catalog.circularOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                                <select 
                                  value={remitoCircularForm.brillo} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, brillo: e.target.value })}
                                  className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none"
                                >
                                  <option value="">Brillo...</option>
                                  {catalog.circularOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Base de Madera</label>
                                <select 
                                  value={remitoCircularForm.baseMadera} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, baseMadera: e.target.value })}
                                  className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown font-sans truncate focus:ring-1 focus:ring-terra focus:outline-none"
                                >
                                  <option value="">Base madera...</option>
                                  {(catalog.circularOptions.baseMaderaTypes || DEFAULT_OPTIONS.baseMaderaTypes).map(bm => <option key={bm} value={bm}>{bm}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                            <div className="flex items-center gap-2">
                              <input type="text" placeholder="Ancho" value={remitoCircularForm.w} onChange={e => setCircularFormRemito({ ...remitoCircularForm, w: e.target.value })} className="w-24 text-center text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none font-sans" />
                              <span className="text-stone">×</span>
                              <input type="text" placeholder="Largo" value={remitoCircularForm.h} onChange={e => setCircularFormRemito({ ...remitoCircularForm, h: e.target.value })} className="w-24 text-center text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none font-sans" />
                              {parseNum(remitoCircularForm.w) > 0 && parseNum(remitoCircularForm.h) > 0 && (
                                <span className="text-xs text-terra font-bold ml-2">
                                  {(parseNum(remitoCircularForm.w) * parseNum(remitoCircularForm.h)).toFixed(2)} m²
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                          <div>
                            <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                            {(() => {
                              const product = catalog.circular.find(t => t.name === remitoCircularForm.wood);
                              const wVal = parseNum(remitoCircularForm.w);
                              const hVal = parseNum(remitoCircularForm.h);
                              const m2 = wVal * hVal;
                              const calcPrice = product && !isNaN(m2) ? product.pricePerM2 * m2 : null;
                              return renderRemitoEditablePrice(calcPrice, remitoCircularOverride, setRemitoCircularOverride);
                            })()}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20">
                              <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                              <input type="number" id="rc-qty" min="1" defaultValue="1" className="text-center w-full text-xs py-2 px-3 border border-sand rounded-md font-sans" />
                            </div>
                            <button 
                              onClick={() => addMesaRemito('circular')}
                              disabled={!remitoCircularForm.wood || !remitoCircularForm.base || isNaN(parseNum(remitoCircularForm.w)) || isNaN(parseNum(remitoCircularForm.h)) || (remitoCircularForm.wood === 'Microcemento' && (!remitoCircularForm.color || !remitoCircularForm.veteado || !remitoCircularForm.brillo))}
                              className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                            >
                              + Agregar
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* RATONAS BUILDER */}
                {remitoAddTab === 'ratona' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                        <select 
                          value={remitoRatonaForm.wood} 
                          onChange={e => setRatonaFormRemito({ wood: e.target.value, w: '', h: '' })}
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none font-sans"
                        >
                          <option value="">Seleccionar madera...</option>
                          {catalog.ratonas.map(r => <option key={r.name} value={r.name}>{r.name} &mdash; {fmt(r.pricePerM2)}/m²</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={remitoRatonaForm.w} onChange={e => setRatonaFormRemito({ ...remitoRatonaForm, w: e.target.value })} className="w-24 text-center text-xs py-2 px-3 border border-sand rounded-md focus:outline-none font-sans" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={remitoRatonaForm.h} onChange={e => setRatonaFormRemito({ ...remitoRatonaForm, h: e.target.value })} className="w-24 text-center text-xs py-2 px-3 border border-sand rounded-md focus:outline-none font-sans" />
                          {parseNum(remitoRatonaForm.w) > 0 && parseNum(remitoRatonaForm.h) > 0 && (
                            <span className="text-xs text-terra font-bold ml-2">
                              {(parseNum(remitoRatonaForm.w) * parseNum(remitoRatonaForm.h)).toFixed(2)} m²
                              {(parseNum(remitoRatonaForm.w) * parseNum(remitoRatonaForm.h)) < 1.4 && ' (Mín: 1.4m²)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div>
                        <div className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1">Precio Unitario</div>
                        {(() => {
                          const product = catalog.ratonas.find(r => r.name === remitoRatonaForm.wood);
                          const wVal = parseNum(remitoRatonaForm.w);
                          const hVal = parseNum(remitoRatonaForm.h);
                          const m2 = wVal * hVal;
                          const billable = m2 < 1.4 ? 1.4 : m2;
                          const calcPrice = product && !isNaN(m2) ? product.pricePerM2 * billable : null;
                          return renderRemitoEditablePrice(calcPrice, remitoRatonaOverride, setRemitoRatonaOverride);
                        })()}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="rr-qty" min="1" defaultValue="1" className="text-center w-full text-xs py-2 px-3 border border-sand rounded-md font-sans" />
                        </div>
                        <button 
                          onClick={addRatonaRemito}
                          disabled={!remitoRatonaForm.wood || isNaN(parseNum(remitoRatonaForm.w)) || isNaN(parseNum(remitoRatonaForm.h))}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* OTROS BUILDER */}
                {remitoAddTab === 'otro' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Nombre Producto</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Reposera reclinable" 
                          value={remitoOtroForm.nombre} 
                          onChange={e => setOtroFormRemito({ ...remitoOtroForm, nombre: e.target.value })}
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Detalle</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Madera de pino, tela impermeable" 
                          value={remitoOtroForm.detalle} 
                          onChange={e => setOtroFormRemito({ ...remitoOtroForm, detalle: e.target.value })}
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Precio Unitario ($)</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 150000" 
                          value={remitoOtroForm.precio} 
                          onChange={e => setOtroFormRemito({ ...remitoOtroForm, precio: e.target.value })}
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra w-44 font-sans"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="ro-qty" min="1" defaultValue="1" className="text-center w-full text-xs py-2 px-3 border border-sand rounded-md font-sans" />
                        </div>
                        <button 
                          onClick={addOtroRemito}
                          disabled={!remitoOtroForm.nombre.trim() || !parsePrice(remitoOtroForm.precio)}
                          className="bg-brown text-cream px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed mt-4"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PREVIEW PANEL (RIGHT SIDE) - ALIGNED WITH PRINT VIEW */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* BRANDED REAL TIME REMITO DOCUMENT DISPLAY */}
              <div className="bg-white border-2 border-sand rounded-2xl p-6 shadow-md flex flex-col gap-5 relative overflow-hidden" id="printable-remito">
                
                {/* Remito Header Block */}
                <div className="flex justify-between items-center border-b-2 border-sand/60 pb-4">
                  <BardaLogo size="lg" subtitleText="REMITO DE ENTREGA" />
                  <div className="flex flex-col gap-2 text-right font-sans">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[9px] uppercase font-bold text-stone print:inline hidden">Remito Nro: </span>
                      <span className="text-[10px] font-bold text-stone print:hidden">Nro:</span>
                      <input 
                        type="text" 
                        placeholder="0000" 
                        value={remitoNumero} 
                        onChange={e => setRemitoNumero(e.target.value)}
                        className="w-24 text-center text-xs py-1 px-1.5 border border-sand rounded font-bold text-brown focus:outline-none focus:border-terra print:border-none print:p-0 print:text-right print:w-auto"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[9px] uppercase font-bold text-stone print:inline hidden">Fecha: </span>
                      <span className="text-[10px] font-bold text-stone print:hidden">Fecha:</span>
                      <input 
                        type="date" 
                        value={remitoFecha} 
                        onChange={e => setRemitoFecha(e.target.value)}
                        className="text-xs py-1 px-1.5 border border-sand rounded text-stone focus:outline-none print:border-none print:p-0 print:text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Remitente & Destinatario Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                  {/* Remitente (Emisor) Box */}
                  <div className="bg-light-cream/40 border border-sand/40 rounded-xl p-3.5 text-xs flex flex-col gap-1.5">
                    <div className="text-[9px] font-bold text-stone uppercase tracking-widest border-b border-sand/20 pb-1">
                      Remitente (Emisor)
                    </div>
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div>
                        <span className="text-stone font-semibold mr-1">Nombre:</span>
                        <strong className="text-brown">{remitoRemitente.nombre || 'Barda Home'}</strong>
                      </div>
                      {remitoRemitente.cuit && (
                        <div>
                          <span className="text-stone font-semibold mr-1">CUIT:</span>
                          <span className="text-brown">{remitoRemitente.cuit}</span>
                        </div>
                      )}
                      {remitoRemitente.telefono && (
                        <div>
                          <span className="text-stone font-semibold mr-1">Teléfono:</span>
                          <span className="text-brown">{remitoRemitente.telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cliente / Destinatario Box */}
                  <div className="bg-light-cream/40 border border-sand/40 rounded-xl p-3.5 text-xs flex flex-col gap-1.5">
                    <div className="text-[9px] font-bold text-stone uppercase tracking-widest border-b border-sand/20 pb-1">
                      Destinatario / Entrega
                    </div>
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div>
                        <span className="text-stone font-semibold mr-1">Cliente:</span>
                        <strong className="text-brown">{remitoCliente.nombre || 'Consumidor Final'}</strong>
                      </div>
                      {remitoCliente.telefono && (
                        <div>
                          <span className="text-stone font-semibold mr-1">Teléfono:</span>
                          <span className="text-brown">{remitoCliente.telefono}</span>
                        </div>
                      )}
                      {remitoCliente.cuit && (
                        <div>
                          <span className="text-stone font-semibold mr-1">CUIT/CUIL:</span>
                          <span className="text-brown">{remitoCliente.cuit}</span>
                        </div>
                      )}
                      {remitoCliente.direccion && (
                        <div className="border-t border-sand/20 pt-1 mt-0.5">
                          <span className="text-stone font-semibold mr-1">Dirección:</span>
                          <strong className="text-brown">{remitoCliente.direccion}</strong>
                          {remitoCliente.cp && <span className="text-stone ml-1"> (C.P. {remitoCliente.cp})</span>}
                          {(remitoCliente.ciudad || remitoCliente.provincia) && (
                            <span className="text-stone ml-1"> - {[remitoCliente.ciudad, remitoCliente.provincia].filter(Boolean).join(', ')}</span>
                          )}
                        </div>
                      )}
                      {!remitoCliente.direccion && (remitoCliente.cp || remitoCliente.ciudad || remitoCliente.provincia) && (
                        <div className="border-t border-sand/20 pt-1 mt-0.5">
                          <span className="text-stone font-semibold mr-1">Localidad:</span>
                          <strong className="text-brown">
                            {[remitoCliente.ciudad, remitoCliente.provincia].filter(Boolean).join(', ')}
                          </strong>
                          {remitoCliente.cp && <span className="text-stone ml-1"> (C.P. {remitoCliente.cp})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remito Line Items Table */}
                <div className="flex-1 min-h-[150px]">
                  {remitoItems.length === 0 ? (
                    <div className="text-center py-12 text-stone italic font-serif text-sm">
                      El remito no contiene ningún ítem aún. Agregue productos para comenzar.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 font-sans">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-sand/60 text-stone font-bold">
                            <th className="pb-2">Producto</th>
                            <th className="pb-2 text-center w-16">Cant</th>
                            <th className="pb-2 text-right w-24">Precio Unit</th>
                            <th className="pb-2 text-right w-24">Total</th>
                            <th className="pb-2 text-center w-8 print:hidden"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {remitoItems.map((it: any) => (
                            <tr key={it.id} className="border-b border-sand/20 hover:bg-light-cream/20">
                              <td className="py-2.5">
                                <div className="font-bold text-brown">{it.name}</div>
                                <div className="text-[10px] text-stone mt-0.5">{it.detail}</div>
                              </td>
                              <td className="py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1 print:hidden">
                                  <button 
                                    onClick={() => {
                                      setRemitoItems(remitoItems.map(ri => ri.id === it.id && ri.qty > 1 ? { ...ri, qty: ri.qty - 1 } : ri));
                                    }}
                                    className="w-5 h-5 border border-sand rounded bg-white hover:bg-cream flex items-center justify-center text-xs text-brown"
                                  >
                                    &minus;
                                  </button>
                                  <span className="font-bold w-6">{it.qty}</span>
                                  <button 
                                    onClick={() => {
                                      setRemitoItems(remitoItems.map(ri => ri.id === it.id ? { ...ri, qty: ri.qty + 1 } : ri));
                                    }}
                                    className="w-5 h-5 border border-sand rounded bg-white hover:bg-cream flex items-center justify-center text-xs text-brown"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="font-bold print:inline hidden">{it.qty}</span>
                              </td>
                              <td className="py-2.5 text-right font-medium text-stone">
                                {fmt(it.unitPrice)}
                              </td>
                              <td className="py-2.5 text-right font-bold text-brown">
                                {fmt(it.unitPrice * it.qty)}
                              </td>
                              <td className="py-2.5 text-center print:hidden">
                                <button
                                  onClick={() => setRemitoItems(remitoItems.filter(ri => ri.id !== it.id))}
                                  className="text-stone hover:text-error hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Subtotals & Bultos Section */}
                <div className="border-t border-sand/60 pt-4 flex flex-col gap-3 font-sans">
                  <div className="flex justify-between items-center bg-cream/30 border border-sand rounded-xl p-3">
                    <span className="font-serif text-base font-bold text-brown">Valor Declarado Total</span>
                    <strong className="font-serif text-lg text-terra">{fmt(remitoItems.reduce((acc, it) => acc + (it.unitPrice * it.qty), 0))}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-light-cream/30 border border-sand/40 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-[10px] text-stone uppercase font-bold tracking-wider">Cantidad de Bultos</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          placeholder="0" 
                          min="0"
                          value={remitoBultos} 
                          onChange={e => setRemitoBultos(e.target.value)}
                          className="w-16 py-1 px-1.5 text-center text-xs font-bold text-brown border border-sand rounded focus:outline-none focus:border-terra print:border-none print:p-0 print:text-left font-sans"
                        />
                        <span className="text-[10px] text-stone font-semibold">bulto(s)</span>
                      </div>
                    </div>

                    <div className="bg-light-cream/30 border border-sand/40 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-[10px] text-stone uppercase font-bold tracking-wider">Fecha de Entrega</span>
                      <input 
                        type="date" 
                        value={remitoDeliveryDate} 
                        onChange={e => setRemitoDeliveryDate(e.target.value)}
                        className="text-xs py-1 px-1.5 text-stone border border-sand rounded focus:outline-none focus:border-terra print:border-none print:p-0 print:text-left"
                      />
                    </div>
                  </div>
                </div>

                {/* SIGNATURE BLOCK FOR PRINT ONLY */}
                <div className="hidden print:grid grid-cols-2 gap-8 border-t-2 border-dashed border-sand/60 pt-16 mt-8 text-xs text-stone font-sans">
                  <div className="flex flex-col gap-12 text-center">
                    <div className="w-48 border-b border-sand mx-auto"></div>
                    <div>
                      <p className="font-semibold text-brown">Firma de Conformidad</p>
                      <p className="text-[10px] mt-1">Aclaración y DNI del Receptor</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-12 text-center">
                    <div className="w-48 border-b border-sand mx-auto"></div>
                    <div>
                      <p className="font-semibold text-brown">Entregado por {remitoRemitente.nombre || 'Barda Home'}</p>
                      <p className="text-[10px] mt-1">Sello / Firma Responsable</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION CALLS (CLEAR & PRINT REMITO) */}
              <div className="flex gap-3 print:hidden">
                <button 
                  onClick={() => {
                    if (remitoItems.length === 0) return;
                    if (confirm('¿Está seguro de que desea vaciar el remito actual?')) {
                      setRemitoItems([]);
                      setRemitoCliente({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
                      setRemitoNumero('');
                      setRemitoBultos('');
                    }
                  }}
                  disabled={remitoItems.length === 0 || !canEditRemitos}
                  className="flex-1 bg-white text-stone border border-sand rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:border-error hover:text-error transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Limpiar Remito
                </button>
                <button 
                  onClick={() => {
                    if (remitoItems.length === 0) {
                      alert('El remito está vacío.');
                      return;
                    }
                    window.print();
                  }}
                  disabled={remitoItems.length === 0}
                  className="flex-1 bg-terra text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:bg-brown transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Remito
                </button>
              </div>

            </div>
            </div>

            )}

            {/* SUBTAB 3: FABRICACIÓN & TALLER */}
            {ventasSubTab === 'fabricacion' && currentUser.permissions.fabricacion.view && (
              <div className="flex flex-col gap-6">
            {!canEditFabricacion && (
              <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para actualizar el estado de las tareas de fabricación, cambiar prioridades o crear órdenes manuales.</span>
              </div>
            )}
            
            {/* SUB-TAB BAR (HIDE ON PRINT) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-sand rounded-xl p-3 shadow-sm print:hidden gap-3">
              <div className="flex bg-light-cream border border-sand rounded-lg overflow-hidden p-1 gap-1">
                <button
                  onClick={() => setFabSubTab('lista')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all duration-150 ${fabSubTab === 'lista' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
                >
                  Lista de Fabricación ({fabList.length})
                </button>
                <button
                  onClick={() => setFabSubTab('diseñador')}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all duration-150 ${fabSubTab === 'diseñador' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
                >
                  Diseñador / Impresión
                </button>
              </div>
              <div className="text-[10px] text-stone font-bold uppercase tracking-widest flex items-center gap-1.5 self-end sm:self-auto">
                <Wrench className="w-3.5 h-3.5 text-terra" />
                Control de Fabricación
              </div>
            </div>

            {/* SUB-TAB CONTENTS */}
            {fabSubTab === 'lista' ? (
              <div className="flex flex-col gap-6 animate-fadeIn print:hidden">
                
                {/* HORIZONTE SEMANAL DE PEDIDOS COMPROMETIDOS */}
                <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-sand pb-3 mb-4">
                    <div>
                      <h3 className="font-serif text-base font-bold text-brown flex items-center gap-1.5">
                        <Calendar className="w-4.5 h-4.5 text-terra" />
                        Horizonte de Pedidos Comprometidos (Semanal)
                      </h3>
                      <p className="text-[11px] text-stone font-medium">Visualizá cuántas entregas tenés programadas para cada semana en base a los pedidos activos.</p>
                    </div>
                  </div>
                  
                  {getWeeklyCommitments().length === 0 ? (
                    <div className="text-center py-8 text-stone italic text-xs font-serif">
                      No hay pedidos activos con fecha de entrega comprometida en el sistema.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-1">
                      {getWeeklyCommitments().map((week, wIdx) => {
                        const totalOrdersInWeek = week.orders.length;
                        let loadColor = "bg-white border-sand text-brown";
                        let pillColor = "bg-brown text-white";
                        
                        if (totalOrdersInWeek >= 5) {
                          loadColor = "bg-rose-50/50 border-rose-200 text-rose-900";
                          pillColor = "bg-error text-white";
                        } else if (totalOrdersInWeek >= 3) {
                          loadColor = "bg-amber-50/50 border-amber-200 text-amber-900";
                          pillColor = "bg-terra text-white";
                        } else if (totalOrdersInWeek > 0) {
                          loadColor = "bg-sky-50/30 border-blue-200 text-blue-950";
                          pillColor = "bg-stone text-white";
                        }
                        
                        return (
                          <div key={week.weekId || wIdx} className={`border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all ${loadColor}`}>
                            <div>
                              <div className="flex justify-between items-start gap-1 border-b border-sand/40 pb-2 mb-2">
                                <div className="flex flex-col">
                                  <span className="text-xs font-extrabold tracking-tight">
                                    {week.label.split(' (')[0]}
                                  </span>
                                  <span className="text-[9px] text-stone font-semibold uppercase mt-0.5">
                                    ({week.label.substring(week.label.indexOf('(') + 1, week.label.indexOf(')'))})
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${pillColor}`}>
                                  {totalOrdersInWeek} {totalOrdersInWeek === 1 ? 'pedido' : 'pedidos'}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-2 mt-2">
                                {week.orders.map((ord: any) => (
                                  <div key={ord.id} className="bg-white border border-sand/30 rounded-lg p-2.5 text-[10px] text-brown flex flex-col gap-1.5 shadow-2xs hover:border-terra/40 transition-all">
                                    <div className="flex justify-between items-center font-bold gap-2">
                                      <span className="truncate">{ord.client.nombre}</span>
                                      <span className="text-terra shrink-0 font-mono text-[9px]">{ord.orderNum}</span>
                                    </div>
                                    <div className="text-[9px] text-stone leading-relaxed">
                                      {ord.items.map((it: any) => `${it.qty}x ${it.name}`).join(', ')}
                                    </div>
                                    <div className="flex justify-between items-center border-t border-sand/30 pt-1.5 mt-0.5 text-[8px] text-stone font-semibold">
                                      <span>Plazo: {ord.deliveryDate || 'Sin fecha'}</span>
                                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[7px] tracking-wider ${
                                        ord.status === 'Listo' ? 'bg-emerald-100 text-emerald-800' :
                                        ord.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                                        'bg-stone/10 text-stone'
                                      }`}>
                                        {ord.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* LISTA DE ORDENES DE FABRICACION */}
                <div className="bg-white border border-sand rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand pb-3">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-brown">Pedidos en Fabricación / Taller</h3>
                      <p className="text-[11px] text-stone font-medium">Controlá el estado de los trabajos que se están fabricando actualmente.</p>
                    </div>
                    <button
                      onClick={() => {
                        setFabCliente({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
                        setFabNumero(`FAB-${Date.now().toString().substring(8)}`);
                        setFabFecha(new Date().toISOString().split('T')[0]);
                        setFabDeliveryDate(new Date().toISOString().split('T')[0]);
                        setFabNotes('');
                        setFabItems([]);
                        setFabSubTab('diseñador');
                      }}
                      disabled={!canEditFabricacion}
                      className="px-3.5 py-2 bg-terra hover:bg-brown text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Nueva Orden Manual
                    </button>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por cliente, nro de pedido, producto..."
                        value={fabSearch}
                        onChange={e => setFabSearch(e.target.value)}
                        className="w-full pl-9 text-xs py-2"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto py-0.5">
                      {['Todos', 'Pendiente', 'En Taller', 'Listo'].map(status => (
                        <button
                          key={status}
                          onClick={() => setFabStatusFilter(status)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            fabStatusFilter === status
                              ? 'bg-brown text-cream shadow-sm'
                              : 'bg-light-cream text-stone hover:bg-sand/40 border border-sand/40'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orders List Grid */}
                  {(() => {
                    const filtered = fabList.filter(f => {
                      const matchesSearch = 
                        f.client?.nombre?.toLowerCase().includes(fabSearch.toLowerCase()) || 
                        f.orderNum?.toLowerCase().includes(fabSearch.toLowerCase()) || 
                        f.items?.some((it: any) => it.name.toLowerCase().includes(fabSearch.toLowerCase()));
                      const matchesStatus = fabStatusFilter === 'Todos' || f.status === fabStatusFilter;
                      return matchesSearch && matchesStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 text-stone italic text-xs font-serif border border-dashed border-sand/50 rounded-xl bg-light-cream/10">
                          No se encontraron órdenes de fabricación con el filtro actual.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(order => {
                          const itemsCount = order.items?.reduce((acc: number, it: any) => acc + it.qty, 0) || 0;
                          return (
                            <div key={order.id} className="bg-white border border-sand rounded-xl p-4 flex flex-col justify-between gap-4 hover:border-terra/40 hover:shadow-xs transition-all duration-150">
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-1">
                                  <div className="flex flex-col">
                                    <span className="font-mono text-[9px] font-extrabold text-terra uppercase tracking-wider">
                                      {order.orderNum}
                                    </span>
                                    <strong className="font-serif text-sm text-brown mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                                      {order.client?.nombre || 'Cliente sin nombre'}
                                    </strong>
                                  </div>
                                  <select
                                    value={order.status || 'Pendiente'}
                                    onChange={e => {
                                      const newStatus = e.target.value;
                                      setFabList(fabList.map(item => item.id === order.id ? { ...item, status: newStatus } : item));
                                    }}
                                    disabled={!canEditFabricacion}
                                    className={`text-[9px] font-bold uppercase tracking-wider py-1 px-2 border rounded-md focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                      order.status === 'Listo' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
                                      order.status === 'En Taller' ? 'bg-sky-100 border-sky-300 text-sky-800' :
                                      'bg-amber-100 border-amber-300 text-amber-800'
                                    }`}
                                  >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En Taller">En Taller</option>
                                    <option value="Listo">Listo</option>
                                  </select>
                                </div>

                                <div className="text-[10px] text-stone font-semibold flex items-center gap-2 mt-1">
                                  <span>Registrado: {fmtDate(order.date)}</span>
                                  <span>•</span>
                                  <span className="text-terra">Prometido: {order.deliveryDate || '—'}</span>
                                </div>

                                {/* Items list */}
                                <div className="border-t border-b border-sand/40 py-2.5 mt-1.5 flex flex-col gap-1.5 text-[11px] text-brown">
                                  {order.items?.map((it: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start">
                                      <span className="truncate pr-4">
                                        <strong className="font-bold">{it.name}</strong> 
                                        <span className="text-[10px] text-stone font-medium block">{it.detail}</span>
                                      </span>
                                      <span className="font-mono font-bold text-stone shrink-0">x{it.qty}</span>
                                    </div>
                                  ))}
                                  {order.notes && (
                                    <div className="text-[10px] text-stone italic border-l-2 border-terra pl-2 mt-1.5 py-0.5 bg-amber-50/10">
                                      "{order.notes}"
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-between items-center border-t border-sand/20 pt-3 mt-1 text-xs">
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-stone uppercase font-bold tracking-wider">Costo Taller</span>
                                  <strong className="text-terra font-serif text-sm">{fmt(order.totalCost || 0)}</strong>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      setFabCliente({ ...order.client });
                                      setFabNumero(order.orderNum);
                                      setFabFecha(order.date);
                                      setFabDeliveryDate(order.deliveryDate);
                                      setFabNotes(order.notes);
                                      setFabItems([...order.items]);
                                      setFabAttachments(order.attachments ? [...order.attachments] : []);
                                      setFabSubTab('diseñador');
                                    }}
                                    className="px-2.5 py-1.5 border border-terra text-terra rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-terra hover:text-white transition-all flex items-center gap-1 shadow-2xs"
                                    title="Cargar orden en diseñador para imprimir o editar"
                                  >
                                    <Edit className="w-3 h-3" /> Cargar
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('¿Está seguro de que desea eliminar esta orden de fabricación del registro?')) {
                                        const updatedFab = fabList.filter(item => item.id !== order.id);
                                        setFabList(updatedFab);
                                        localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFab));
                                      }
                                    }}
                                    className="p-1.5 border border-sand text-stone hover:border-error hover:text-error hover:bg-error/5 rounded-lg transition-all"
                                    title="Eliminar orden"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
                
                {/* BUILD PANEL (LEFT SIDE) - HIDE ON PRINT */}
                <div className="lg:col-span-7 flex flex-col gap-6 print:hidden">
                  
                  {/* SELECT ORDER CARD */}
                  <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-sand pb-3 mb-4 gap-2">
                      <h3 className="font-serif text-lg font-bold text-brown">Seleccionar Pedido para Fabricar</h3>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            if (sales.length > 0) {
                              const lastOrder = sales[0];
                              setFabCliente({
                                nombre: lastOrder.client.nombre || '',
                                telefono: lastOrder.client.telefono || '',
                                cuit: lastOrder.client.cuit || '',
                                direccion: lastOrder.client.direccion || '',
                                cp: lastOrder.client.cp || '',
                                ciudad: lastOrder.client.ciudad || '',
                                provincia: lastOrder.client.provincia || ''
                              });
                              setFabNumero(lastOrder.orderNum || '');
                              setFabDeliveryDate(lastOrder.deliveryDate || new Date().toISOString().split('T')[0]);
                              setFabNotes(lastOrder.notes || '');
                              setFabItems(lastOrder.items.map((it: any) => ({
                                id: Date.now() + Math.random(),
                                name: it.name,
                                detail: it.detail || `${it.wood || ''} · ${it.fabric || ''} · ${it.color || ''}`,
                                cost: it.cost || 0,
                                qty: it.qty,
                                category: it.category
                              })));
                            } else {
                              alert('No hay pedidos registrados aún.');
                            }
                          }}
                          className="px-2.5 py-1 text-[9px] font-bold text-brown border border-sand rounded bg-light-cream hover:bg-cream transition-all uppercase"
                          title="Copiar datos y productos del último pedido"
                        >
                          Copiar Último Pedido
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Cliente de Referencia</label>
                        <input 
                          type="text" 
                          placeholder="Nombre del Cliente" 
                          value={fabCliente.nombre} 
                          onChange={e => setFabCliente({ ...fabCliente, nombre: e.target.value })}
                          className="w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Número de Pedido (Ref.)</label>
                        <input 
                          type="text" 
                          placeholder="Ej. PE-1002" 
                          value={fabNumero} 
                          onChange={e => setFabNumero(e.target.value)}
                          className="w-full font-mono text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Fecha de Orden</label>
                        <input 
                          type="date" 
                          value={fabFecha} 
                          onChange={e => setFabFecha(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Plazo Prometido de Entrega</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 26 de Julio de 2026" 
                          value={fabDeliveryDate} 
                          onChange={e => setFabDeliveryDate(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-4">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Notas Especiales / Observaciones de Fabricación</label>
                      <textarea
                        placeholder="Instrucciones para el taller o proveedor..."
                        value={fabNotes}
                        onChange={e => setFabNotes(e.target.value)}
                        rows={2}
                        className="w-full p-2 text-xs border border-sand rounded-xl bg-amber-50/5 focus:outline-none focus:ring-1 focus:ring-terra"
                      />
                    </div>

                    {/* Attachments Manager for Fabrication */}
                    <div className="flex flex-col gap-1.5 mt-4 pt-3 border-t border-sand/60">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold flex items-center justify-between">
                        <span>Adjuntar Imágenes / Planos para Taller</span>
                        <span className="text-[9px] font-normal text-stone">({fabAttachments.length} adjuntos)</span>
                      </label>
                      
                      <div className="border border-dashed border-sand hover:border-terra bg-light-cream/30 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={(e) => {
                            processFilesToAttachments(
                              e.target.files,
                              fabAttachments,
                              (updated) => setFabAttachments(updated)
                            );
                            e.target.value = '';
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex items-center gap-1.5 text-terra font-bold text-xs">
                          <Upload className="w-4 h-4" />
                          <span>Subir fotos, renders o planos</span>
                        </div>
                        <span className="text-[9px] text-stone">Se incluirán automáticamente en la orden de producción impresa / PDF</span>
                      </div>

                      {fabAttachments.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {fabAttachments.map((att: any) => {
                            const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                            return (
                              <div key={att.id} className="relative group bg-white border border-sand rounded-lg p-1.5 flex items-center gap-2 overflow-hidden shadow-2xs">
                                {isImg ? (
                                  <img
                                    src={att.dataUrl}
                                    alt={att.name}
                                    onClick={() => setPreviewImage({ url: att.dataUrl, name: att.name })}
                                    className="w-10 h-10 object-cover rounded shrink-0 border border-sand/40 cursor-pointer hover:opacity-80"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-terra/10 rounded flex items-center justify-center text-terra shrink-0">
                                    <File className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold text-brown truncate">{att.name}</p>
                                  {isImg && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage({ url: att.dataUrl, name: att.name })}
                                      className="text-[8px] font-bold text-terra hover:underline"
                                    >
                                      Ver foto
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFabAttachments(fabAttachments.filter(a => a.id !== att.id))}
                                  className="p-1 text-stone hover:text-rose-600 transition-colors"
                                  title="Eliminar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LIST AND COST ADJUSTMENT CARD */}
                  <div className="bg-white border border-sand rounded-xl p-5 shadow-sm">
                    <h3 className="font-serif text-lg font-bold text-brown mb-3 border-b border-sand pb-2">Productos a Fabricar y Costos</h3>
                    {fabItems.length === 0 ? (
                      <div className="text-center py-8 text-stone italic text-xs font-serif">
                        No hay productos cargados en esta orden de fabricación. Seleccione un pedido o presione "Copiar Último Pedido".
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {fabItems.map((it, idx) => (
                          <div key={it.id || idx} className="flex flex-col gap-2 p-3 bg-cream/10 border border-sand/40 rounded-xl">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-stone px-1.5 py-0.5 bg-sand/30 rounded mr-1.5">{it.category}</span>
                                <strong className="text-xs text-brown">{it.name}</strong>
                                <p className="text-[10px] text-stone mt-0.5">{it.detail}</p>
                              </div>
                              <button 
                                onClick={() => setFabItems(fabItems.filter(item => item.id !== it.id))}
                                className="text-stone hover:text-error text-xs"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 border-t border-sand/30 pt-2 mt-1">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-stone font-semibold">CANTIDAD</span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => {
                                      setFabItems(fabItems.map(ri => ri.id === it.id && ri.qty > 1 ? { ...ri, qty: ri.qty - 1 } : ri));
                                    }}
                                    className="w-5 h-5 rounded bg-sand/30 hover:bg-sand/60 text-xs flex items-center justify-center font-bold font-mono"
                                  >-</button>
                                  <span className="text-xs font-bold w-6 text-center font-mono">{it.qty}</span>
                                  <button 
                                    onClick={() => {
                                      setFabItems(fabItems.map(ri => ri.id === it.id ? { ...ri, qty: ri.qty + 1 } : ri));
                                    }}
                                    className="w-5 h-5 rounded bg-sand/30 hover:bg-sand/60 text-xs flex items-center justify-center font-bold font-mono"
                                  >+</button>
                                </div>
                              </div>
                              <div className="col-span-2 flex flex-col gap-0.5">
                                <span className="text-[9px] text-stone font-semibold">COSTO DE FABRICACIÓN unitario (Taller)</span>
                                <div className="flex items-center gap-1 bg-white border border-sand rounded px-1.5 py-0.5">
                                  <span className="text-stone text-[10px] font-bold font-mono">$</span>
                                  <input 
                                    type="number" 
                                    className="w-full text-right bg-transparent text-xs font-bold text-terra focus:outline-none p-0 border-none font-mono"
                                    value={it.cost} 
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setFabItems(fabItems.map(ri => ri.id === it.id ? { ...ri, cost: val } : ri));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="flex justify-between items-center bg-cream/20 p-3 rounded-xl border border-sand mt-2">
                          <span className="text-xs font-bold text-brown uppercase">Costo Total de Orden:</span>
                          <strong className="text-base text-terra font-serif">{fmt(fabItems.reduce((acc, it) => acc + (it.cost * it.qty), 0))}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PREVIEW CONTAINER FOR PRINT FORMAT (RIGHT SIDE) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* PRIMARY VISUAL FABRICATION SHEET (WHAT IS PRINTED) */}
                  <div className="bg-white border-2 border-sand rounded-2xl p-6 shadow-md flex flex-col gap-6 relative overflow-hidden" id="printable-fabricacion">
                    
                    {/* Brand watermarks & header */}
                    <div className="flex justify-between items-center border-b border-sand pb-4">
                      <BardaLogo size="lg" subtitleText="ORDEN DE FABRICACIÓN" />
                      <div className="text-right">
                        <p className="text-xs text-stone font-medium font-mono">{fmtDate(fabFecha)}</p>
                        <p className="text-[10px] text-stone tracking-wide uppercase mt-1 font-mono">Ref: <span className="font-bold text-terra">{fabNumero || 'S/N'}</span></p>
                      </div>
                    </div>

                    {/* Fabrication details block */}
                    <div className="bg-light-cream/40 border border-sand/40 rounded-xl p-4 text-xs flex flex-col gap-2">
                      {fabCliente.nombre && (
                        <div><span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">Cliente / Trabajo:</span> <strong className="text-brown">{fabCliente.nombre}</strong></div>
                      )}
                      {fabDeliveryDate && (
                        <div><span className="text-stone font-bold uppercase text-[9px] tracking-wider mr-2">Fecha Prometida:</span> <strong className="text-terra">{fabDeliveryDate}</strong></div>
                      )}
                    </div>

                    {/* Fabrication Items list */}
                    <div className="flex-1">
                      {fabItems.length === 0 ? (
                        <div className="text-center py-12 text-stone italic font-serif text-sm">
                          Orden de fabricación vacía.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-sand">
                                <th className="text-left text-[10px] tracking-wider text-stone uppercase pb-2">Detalle de Producto</th>
                                <th className="text-center text-[10px] tracking-wider text-stone uppercase pb-2">Cant</th>
                                <th className="text-right text-[10px] tracking-wider text-stone uppercase pb-2">Costo U.</th>
                                <th className="text-right text-[10px] tracking-wider text-stone uppercase pb-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fabItems.map((it, idx) => (
                                <tr key={it.id || idx} className="border-b border-sand/40">
                                  <td className="py-2.5">
                                    <div className="font-semibold text-xs text-brown">{it.name}</div>
                                    <div className="text-[10px] text-stone mt-0.5">{it.detail}</div>
                                  </td>
                                  <td className="text-center text-xs py-2.5 font-bold font-mono">
                                    {it.qty}
                                  </td>
                                  <td className="text-right text-xs py-2.5 font-semibold text-stone font-mono">
                                    {fmt(it.cost)}
                                  </td>
                                  <td className="text-right text-xs py-2.5 font-bold text-brown font-mono">
                                    {fmt(it.cost * it.qty)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Summary & Signatures at bottom */}
                    {fabItems.length > 0 && (
                      <div className="border-t border-sand pt-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-stone uppercase">Costo Total de Orden</span>
                          <strong className="text-lg font-serif text-terra">{fmt(fabItems.reduce((acc, it) => acc + (it.cost * it.qty), 0))}</strong>
                        </div>

                        {fabNotes && (
                          <div className="text-xs text-stone bg-light-cream/40 p-3 rounded-lg border-l-2 border-terra">
                            <span className="block font-bold text-[9px] uppercase tracking-wider text-stone mb-1">Notas especiales para taller:</span>
                            <p className="italic">"{fabNotes}"</p>
                          </div>
                        )}

                        {fabAttachments && fabAttachments.length > 0 && (
                          <div className="text-xs text-stone bg-light-cream/40 p-3 rounded-lg border border-sand/60 flex flex-col gap-2">
                            <span className="block font-bold text-[9px] uppercase tracking-wider text-brown flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-terra" />
                              <span>Imágenes y Planos Adjuntos ({fabAttachments.length}):</span>
                            </span>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                              {fabAttachments.map((att: any) => {
                                const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                                return (
                                  <div key={att.id} className="border border-sand bg-white rounded-lg p-1.5 flex flex-col gap-1 items-center justify-center overflow-hidden">
                                    {isImg ? (
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="w-full h-36 object-contain rounded border border-sand/30 bg-stone/5"
                                      />
                                    ) : (
                                      <div className="w-full h-16 bg-terra/10 rounded flex items-center justify-center text-terra font-bold text-xs gap-1.5">
                                        <File className="w-5 h-5" />
                                        <span className="text-[10px] truncate max-w-[120px]">{att.name}</span>
                                      </div>
                                    )}
                                    <span className="text-[9px] font-bold text-brown truncate w-full text-center mt-0.5">{att.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Double Signature physical blocks */}
                        <div className="grid grid-cols-2 gap-8 border-t border-dashed border-sand/60 pt-12 mt-8 text-xs text-stone font-sans">
                          <div className="flex flex-col gap-1 text-center">
                            <div className="w-32 border-b border-sand mx-auto"></div>
                            <p className="font-semibold text-brown text-[10px] mt-1">Autorizado Barda</p>
                            <p className="text-[9px]">Firma / Aprobado</p>
                          </div>
                          <div className="flex flex-col gap-1 text-center">
                            <div className="w-32 border-b border-sand mx-auto"></div>
                            <p className="font-semibold text-brown text-[10px] mt-1">Recibido Taller</p>
                            <p className="text-[9px]">Firma / Recepción</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTION CALLS (PRINT, SAVE OR RESET) */}
                  <div className="flex flex-col sm:flex-row gap-3 print:hidden">
                    <button 
                      onClick={() => {
                        if (fabItems.length === 0) return;
                        if (confirm('¿Está seguro de que desea vaciar la orden de fabricación?')) {
                          setFabItems([]);
                          setFabCliente({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
                          setFabNumero('');
                          setFabNotes('');
                          setFabAttachments([]);
                        }
                      }}
                      disabled={fabItems.length === 0}
                      className="flex-1 bg-white text-stone border border-sand rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:border-error hover:text-error transition-all active:scale-[0.98] disabled:opacity-40"
                    >
                      Vaciar Orden
                    </button>
                    <button 
                      onClick={handleSaveFabricationOrder}
                      disabled={fabItems.length === 0}
                      className="flex-1 bg-white text-brown border border-brown hover:bg-brown/5 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40"
                    >
                      Guardar Orden
                    </button>
                    <button 
                      onClick={() => {
                        if (fabItems.length === 0) {
                          alert('La orden de fabricación está vacía.');
                          return;
                        }
                        downloadFabricationOrderAndAttachments({
                          orderNum: fabNumero,
                          date: fabFecha,
                          client: fabCliente,
                          deliveryDate: fabDeliveryDate,
                          notes: fabNotes,
                          items: fabItems,
                          attachments: fabAttachments
                        });
                      }}
                      disabled={fabItems.length === 0}
                      className="flex-1 bg-amber-500/10 text-brown border border-amber-500/40 hover:bg-amber-500 hover:text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Orden y Adjuntos
                    </button>
                    <button 
                      onClick={() => {
                        if (fabItems.length === 0) {
                          alert('La orden de fabricación está vacía.');
                          return;
                        }
                        window.print();
                      }}
                      disabled={fabItems.length === 0}
                      className="flex-1 bg-terra text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider hover:bg-brown transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Orden
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}
        {/* ======================================================== */}
        {/* RESUMEN (ANALYTICS DASHBOARD) SCREEN                      */}
        {/* ======================================================== */}
        {activeTab === 'resumen' && (
          <div className="flex flex-col gap-6">
            {!canEditResumen && (
              <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para registrar datos en el embudo de conversión comercial (teléfonos/visitas). Puedes visualizar todas las métricas de rendimiento y estadísticas de ventas libremente.</span>
              </div>
            )}

            {/* SUB-VIEW TOGGLE */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-sand p-2 sm:p-2.5 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setResumenViewMode('dashboard')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    resumenViewMode === 'dashboard'
                      ? 'bg-brown text-cream shadow-sm'
                      : 'text-stone hover:bg-cream/40'
                  }`}
                >
                  <BarChart2 className="w-4 h-4 text-terra" />
                  <span>Dashboard General</span>
                </button>
                <button
                  onClick={() => setResumenViewMode('conversion')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    resumenViewMode === 'conversion'
                      ? 'bg-brown text-cream shadow-sm'
                      : 'text-stone hover:bg-cream/40'
                  }`}
                >
                  <FileText className="w-4 h-4 text-terra" />
                  <span>Embudo Comercial e Indicadores</span>
                </button>
              </div>

              <span className="text-[11px] font-bold text-stone/80 hidden lg:inline mr-2">
                BARDA ERP • Módulo Ejecutivo
              </span>
            </div>

            {resumenViewMode === 'dashboard' ? (
              <ExecutiveDashboard
                fmt={fmt}
                metrics={metrics}
                salesCount={dashboardFilteredSales.length}
                resumenYear={resumenYear}
                setResumenYear={setResumenYear}
                resumenMonth={resumenMonth}
                setResumenMonth={setResumenMonth}
                yearsList={yearsList}
                MONTHS_LIST={MONTHS_LIST}
              />
            ) : (
              <CommercialFunnelDashboard
                fmt={fmt}
                metrics={metrics}
                dashboardFilteredSales={dashboardFilteredSales}
                resumenYear={resumenYear}
                setResumenYear={setResumenYear}
                resumenMonth={resumenMonth}
                setResumenMonth={setResumenMonth}
                yearsList={yearsList}
                MONTHS_LIST={MONTHS_LIST}
                canEditResumen={canEditResumen}
                funnelRegYear={funnelRegYear}
                setFunnelRegYear={setFunnelRegYear}
                funnelRegMonth={funnelRegMonth}
                setFunnelRegMonth={setFunnelRegMonth}
                funnelRegPhones={funnelRegPhones}
                setFunnelRegPhones={setFunnelRegPhones}
                funnelRegVisits={funnelRegVisits}
                setFunnelRegVisits={setFunnelRegVisits}
                handleSaveFunnelRegistry={handleSaveFunnelRegistry}
                funnelSaveSuccess={funnelSaveSuccess}
                funnelOverrides={funnelOverrides}
                savedFunnelEntries={savedFunnelEntries}
                setFunnelOverrides={setFunnelOverrides}
                activeFunnelData={activeFunnelData}
                subproductCategory={subproductCategory}
                setSubproductCategory={setSubproductCategory}
                getTopSubproducts={getTopSubproducts}
              />
            )}

            {/* SALES AND BUDGET HISTORIC TIMELINES */}
            <div className="bg-white border border-sand rounded-xl p-6 shadow-sm">
              <h3 className="font-serif text-lg font-bold text-brown mb-4 border-b border-sand pb-2">Últimos Pedidos Generados</h3>
              {sales.length === 0 ? (
                <div className="text-center py-6 text-stone italic text-sm">
                  Ningún pedido registrado aún.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sales.slice(0, 5).map(s => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-sand/40 last:border-b-0 text-xs">
                      <div>
                        <strong className="text-brown">{s.client.nombre || 'Consumidor Final'}</strong> 
                        <span className="text-stone ml-2">({s.orderNum})</span>
                        <div className="text-[10px] text-stone mt-1">{s.items.length} {s.items.length === 1 ? 'producto' : 'productos'} · Pago: {s.paymentMethod}</div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 sm:mt-0 justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="font-bold text-terra">{fmt(s.total)}</div>
                          <div className="text-[10px] text-stone mt-0.5">Fecha: {fmtDate(s.date)}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Entregado' ? 'bg-emerald-50 text-emerald-800' :
                          s.status === 'En Producción' ? 'bg-amber-50 text-amber-800' :
                          'bg-stone/5 text-stone'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* FINANZAS (FINANCIAL MANAGEMENT) SCREEN                   */}
        {/* ======================================================== */}
        {activeTab === 'finanzas' && (() => {
          // Inner calculations
          const filteredPayments = paymentsLedger.filter(p => {
            if (!p.date) return false;
            const year = p.date.substring(0, 4);
            const month = p.date.substring(5, 7);
            const yearMatch = finanzasYear === 'todos' || year === finanzasYear;
            const monthMatch = finanzasMonth === 'todos' || month === finanzasMonth;
            return yearMatch && monthMatch;
          });

          const filteredFixedCosts = fixedCosts.filter(c => {
            if (!c.month) return false;
            const year = c.month.substring(0, 4);
            const month = c.month.substring(5, 7);
            const yearMatch = finanzasYear === 'todos' || year === finanzasYear;
            const monthMatch = finanzasMonth === 'todos' || month === finanzasMonth;
            return yearMatch && monthMatch;
          });

          const filteredSalesForFinances = sales.filter(s => {
            if (!s.date) return false;
            const year = s.date.substring(0, 4);
            const month = s.date.substring(5, 7);
            const yearMatch = finanzasYear === 'todos' || year === finanzasYear;
            const monthMatch = finanzasMonth === 'todos' || month === finanzasMonth;
            return yearMatch && monthMatch;
          });

          // Metrics (Accrual & Cash Basis)
          const totalVentas = filteredSalesForFinances.reduce((acc, s) => acc + s.total, 0);
          const totalCostoVariable = filteredSalesForFinances.reduce((acc, s) => acc + s.totalCost, 0);
          const totalCostoFijo = filteredFixedCosts.reduce((acc, c) => acc + c.amount, 0);
          const totalIngresosCobrados = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

          const utilidadOperativaDevengada = totalVentas - totalCostoVariable - totalCostoFijo;
          const flujoNetoDeCaja = totalIngresosCobrados - totalCostoFijo;

          // Account Distribution
          const accountBalances = {
            'Efectivo': filteredPayments.filter(p => p.account === 'Efectivo').reduce((acc, p) => acc + p.amount, 0),
            'Santander': filteredPayments.filter(p => p.account === 'Santander').reduce((acc, p) => acc + p.amount, 0),
            'Uala': filteredPayments.filter(p => p.account === 'Uala').reduce((acc, p) => acc + p.amount, 0)
          };

          // Orders with Outstanding Balances
          const ordersWithBalance = sales.filter(s => {
            const collected = s.senaAmount || 0;
            const remaining = s.total - collected;
            return remaining > 0;
          });

          const totalSaldosPendientes = ordersWithBalance.reduce((acc, s) => acc + (s.total - (s.senaAmount || 0)), 0);

          // Projections grouped by deliveryDate month
          const projectionsMap: { [monthStr: string]: number } = {};
          sales.forEach(s => {
            const collected = s.senaAmount || 0;
            const remaining = s.total - collected;
            if (remaining <= 0) return;
            
            // Try to extract month name
            let key = 'Futuro';
            if (s.deliveryDate) {
              const parts = s.deliveryDate.toLowerCase().split(' de ');
              if (parts.length >= 3) {
                key = titleCase(parts[1]) + ' ' + parts[2];
              } else {
                const parsed = Date.parse(s.deliveryDate);
                if (!isNaN(parsed)) {
                  const dObj = new Date(parsed);
                  const mLabel = MONTHS_LIST.find(m => m.value === String(dObj.getMonth() + 1).padStart(2, '0'))?.label || 'Futuro';
                  key = mLabel + ' ' + dObj.getFullYear();
                }
              }
            }
            projectionsMap[key] = (projectionsMap[key] || 0) + remaining;
          });

          const evolutionYear = finanzasYear === 'todos' ? new Date().getFullYear().toString() : finanzasYear;

          // Compute 12 months data for evolution
          const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const mNum = String(i + 1).padStart(2, '0');
            const mLabel = MONTHS_LIST.find(m => m.value === mNum)?.label || '';

            // Sales in this month & year
            const salesInMonth = sales.filter(s => s.date && s.date.substring(0, 4) === evolutionYear && s.date.substring(5, 7) === mNum);
            const totalVentasM = salesInMonth.reduce((acc, s) => acc + s.total, 0);
            const totalCostoVarM = salesInMonth.reduce((acc, s) => acc + s.totalCost, 0);
            const porCobrarM = salesInMonth.reduce((acc, s) => acc + Math.max(0, s.total - (s.senaAmount || 0)), 0);

            // Payments in this month & year
            const paymentsInMonth = paymentsLedger.filter(p => p.date && p.date.substring(0, 4) === evolutionYear && p.date.substring(5, 7) === mNum);
            const totalCobrosM = paymentsInMonth.reduce((acc, p) => acc + p.amount, 0);
            const otrosIngresosM = paymentsInMonth.filter(p => p.type === 'Ingreso Directo').reduce((acc, p) => acc + p.amount, 0);

            // Fixed costs in this month & year
            const fixedCostsInMonth = fixedCosts.filter(c => c.month && c.month.substring(0, 4) === evolutionYear && c.month.substring(5, 7) === mNum);
            const totalFijoM = fixedCostsInMonth.reduce((acc, c) => acc + c.amount, 0);

            const utilidadDevengadaM = totalVentasM - totalCostoVarM - totalFijoM;
            const flujoCajaM = totalCobrosM - totalFijoM;

            return {
              num: mNum,
              label: mLabel,
              ventas: totalVentasM,
              cobros: totalCobrosM,
              otrosIngresos: otrosIngresosM,
              costoVar: totalCostoVarM,
              costoFijo: totalFijoM,
              utilidad: utilidadDevengadaM,
              flujo: flujoCajaM,
              porCobrar: porCobrarM
            };
          });

          const maxVal = Math.max(...monthlyData.map(d => Math.max(d.cobros, d.costoFijo, Math.max(0, d.flujo), d.porCobrar)), 1);

          const totalVentasEvol = monthlyData.reduce((acc, d) => acc + d.ventas, 0);
          const totalOtrosIngresosEvol = monthlyData.reduce((acc, d) => acc + d.otrosIngresos, 0);
          const totalCostoVarEvol = monthlyData.reduce((acc, d) => acc + d.costoVar, 0);
          const totalCostoFijoEvol = monthlyData.reduce((acc, d) => acc + d.costoFijo, 0);
          const totalCobrosEvol = monthlyData.reduce((acc, d) => acc + d.cobros, 0);
          const totalPorCobrarEvol = monthlyData.reduce((acc, d) => acc + d.porCobrar, 0);
          const totalFlujoEvol = totalCobrosEvol - totalCostoFijoEvol;

          return (
            <div className="flex flex-col gap-6">
              
              {!canEditFinanzas && (
                <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                  <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                  <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para registrar costos fijos, cobrar saldos, asentar transacciones o modificar el libro contable de la empresa.</span>
                </div>
              )}
              
              {/* 1. TABS DE SECCIONES DE TESORERÍA (ARRIBA DE TODO) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-sand p-2 sm:p-2.5 rounded-2xl shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setTesoreriaSubTab('resumen')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      tesoreriaSubTab === 'resumen'
                        ? 'bg-brown text-cream shadow-sm'
                        : 'text-stone hover:bg-cream/40'
                    }`}
                  >
                    <BarChart2 className="w-4 h-4 text-terra" />
                    <span>Vista General & Evolución</span>
                  </button>
                  <button
                    onClick={() => setTesoreriaSubTab('egresos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      tesoreriaSubTab === 'egresos'
                        ? 'bg-rose-800 text-white shadow-md ring-2 ring-rose-300'
                        : 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>- Ingresar Gasto / Egreso</span>
                  </button>
                  <button
                    onClick={() => setTesoreriaSubTab('ingresos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      tesoreriaSubTab === 'ingresos'
                        ? 'bg-brown text-cream shadow-sm'
                        : 'text-stone hover:bg-cream/40'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-emerald-500" />
                    <span>+ Cobrar / Agregar Ingreso</span>
                  </button>
                  <button
                    onClick={() => setTesoreriaSubTab('movimientos')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      tesoreriaSubTab === 'movimientos'
                        ? 'bg-brown text-cream shadow-sm'
                        : 'text-stone hover:bg-cream/40'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-terra" />
                    <span>Libro de Movimientos</span>
                  </button>
                </div>

                <span className="text-[11px] font-bold text-stone/80 hidden lg:inline mr-2">
                  BARDA ERP • Módulo de Tesorería
                </span>
              </div>

              {tesoreriaSubTab === 'resumen' && (
              <>
              {/* 2. BANNER DE TESORERÍA (MISMO ESTILO QUE OTRAS SECCIONES Y MISMOS FILTROS) */}
              <div className="bg-[#3D1F0D] text-cream p-4 sm:p-5 rounded-2xl shadow-md border border-terra/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-terra/20 rounded-xl text-terra border border-terra/30">
                    <Wallet className="w-5 h-5 text-terra" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded-full">
                        ★ DIRECCIÓN DE TESORERÍA
                      </span>
                      <h2 className="font-serif text-base sm:text-lg font-bold text-cream">
                        Tesorería & Gestión de Caja
                      </h2>
                    </div>
                    <p className="text-xs text-cream/80 mt-0.5">
                      Control de dinero en efectivo, cuentas bancarias, ingresos, egresos y saldos.
                    </p>
                  </div>
                </div>

                {/* FILTROS (PERIODO + MES PUNTUAL + AÑO) */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* PILLS PERIODO 3M / 6M / 1Y */}
                  <div className="flex items-center gap-2 bg-[#2C1609] border border-cream/20 rounded-xl px-3 py-1.5">
                    <span className="text-xs font-medium text-cream/80">Periodo:</span>
                    <div className="flex items-center gap-1 bg-[#1A0C05] border border-cream/15 rounded-lg p-0.5">
                      {(['3M', '6M', '1Y'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setFinanzasPeriod(p);
                            setFinanzasMonth('todos');
                          }}
                          className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                            finanzasPeriod === p && finanzasMonth === 'todos'
                              ? 'bg-[#C47A3A] text-white shadow-sm'
                              : 'text-cream/70 hover:text-cream hover:bg-white/5'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MES PUNTUAL DROPDOWN */}
                  <div className="flex items-center gap-1.5 bg-[#2C1609] border border-cream/20 rounded-xl px-3 py-1.5">
                    <span className="text-xs font-medium text-cream/80">Mes Puntual:</span>
                    <select
                      value={finanzasMonth}
                      onChange={e => setFinanzasMonth(e.target.value)}
                      className="text-xs bg-[#1A0C05] text-cream border border-cream/15 rounded-lg py-1 px-2.5 focus:outline-none focus:border-terra font-semibold cursor-pointer"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m.value} value={m.value} className="bg-[#1A0C05] text-cream">
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AÑO DROPDOWN */}
                  <div className="flex items-center gap-1.5 bg-[#2C1609] border border-cream/20 rounded-xl px-3 py-1.5">
                    <span className="text-xs font-medium text-cream/80">Año:</span>
                    <select
                      value={finanzasYear}
                      onChange={e => setFinanzasYear(e.target.value)}
                      className="text-xs bg-[#1A0C05] text-cream border border-cream/15 rounded-lg py-1 px-2.5 focus:outline-none focus:border-terra font-semibold cursor-pointer min-w-[80px]"
                    >
                      <option value="todos" className="bg-[#1A0C05] text-cream">Todos</option>
                      {yearsList.map(yr => (
                        <option key={yr} value={yr} className="bg-[#1A0C05] text-cream">{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* PARTE SUPERIOR: TARJETAS KPI DE TESORERÍA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Flujo Neto / Disponible */}
                <div className="bg-white border-2 border-sand p-4 rounded-xl shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone">Caja / Flujo Neto</span>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Percibido</span>
                  </div>
                  <div className="text-2xl font-serif font-bold text-brown my-1">
                    {fmt(flujoNetoDeCaja)}
                  </div>
                  <span className="text-[10px] text-stone">Ingresos cobrados - Egresos pagados</span>
                </div>

                {/* Card 2: Total Ingresos Cobrados */}
                <div className="bg-white border border-sand p-4 rounded-xl shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Ingresos</span>
                    <span className="p-1 bg-emerald-50 rounded text-emerald-700"><TrendingUp className="w-3.5 h-3.5" /></span>
                  </div>
                  <div className="text-2xl font-serif font-bold text-emerald-700 my-1">
                    {fmt(totalIngresosCobrados)}
                  </div>
                  <span className="text-[10px] text-stone">Señas + Saldos + Ingresos Directos</span>
                </div>

                {/* Card 3: Total Egresos */}
                <div className="bg-white border border-sand p-4 rounded-xl shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Egresos</span>
                    <span className="p-1 bg-rose-50 rounded text-rose-700"><ShoppingBag className="w-3.5 h-3.5" /></span>
                  </div>
                  <div className="text-2xl font-serif font-bold text-rose-700 my-1">
                    -{fmt(totalCostoFijo)}
                  </div>
                  <span className="text-[10px] text-stone">Costos fijos y gastos de fábrica</span>
                </div>

                {/* Card 4: Saldos por Cobrar */}
                <div className="bg-white border border-sand p-4 rounded-xl shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone">Por Cobrar</span>
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{ordersWithBalance.length} Pedidos</span>
                  </div>
                  <div className="text-2xl font-serif font-bold text-terra my-1">
                    {fmt(totalSaldosPendientes)}
                  </div>
                  <span className="text-[10px] text-stone">Saldos pendientes a la entrega</span>
                </div>
              </div>

              {/* TARJETAS DE DISPONIBILIDAD POR CUENTA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-sand/70 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></div>
                    <div>
                      <span className="text-xs font-bold text-brown block">Efectivo (Caja Chica)</span>
                      <span className="text-[10px] text-stone">Recaudación física showroom</span>
                    </div>
                  </div>
                  <strong className="text-base font-serif font-bold text-brown">{fmt(accountBalances['Efectivo'])}</strong>
                </div>

                <div className="bg-white border border-sand/70 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-600 shrink-0"></div>
                    <div>
                      <span className="text-xs font-bold text-brown block">Banco Santander</span>
                      <span className="text-[10px] text-stone">Transferencias y depósitos</span>
                    </div>
                  </div>
                  <strong className="text-base font-serif font-bold text-brown">{fmt(accountBalances['Santander'])}</strong>
                </div>

                <div className="bg-white border border-sand/70 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-sky-500 shrink-0"></div>
                    <div>
                      <span className="text-xs font-bold text-brown block">Ualá (Cobros Online)</span>
                      <span className="text-[10px] text-stone">Tarjetas y links de pago</span>
                    </div>
                  </div>
                  <strong className="text-base font-serif font-bold text-brown">{fmt(accountBalances['Uala'])}</strong>
                </div>
              </div>
              </>
              )}

              {/* SUBTAB: INGRESOS */}
              {tesoreriaSubTab === 'ingresos' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* FORMULARIO DE NUEVO INGRESO / COBRO (PRIORIDAD ALTA - 7 COLUMNAS) */}
                  <div className="lg:col-span-7 bg-white border-2 border-emerald-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      {paymentRegisterForm.orderId !== null ? (
                        /* MODO: COBRO DE SALDO DE PEDIDO SELECCIONADO */
                        <>
                          <div className="flex items-center justify-between border-b border-sand pb-3 mb-4">
                            <div>
                              <h3 className="font-serif text-lg font-bold text-brown flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                                Confirmar Cobro de Saldo ({sales.find(s => s.id === paymentRegisterForm.orderId)?.orderNum})
                              </h3>
                              <p className="text-xs text-stone mt-0.5">
                                Cliente: <strong className="text-brown">{sales.find(s => s.id === paymentRegisterForm.orderId)?.client?.nombre || 'Consumidor Final'}</strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPaymentRegisterForm({ ...paymentRegisterForm, orderId: null })}
                              className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-sand/40 hover:bg-sand text-brown border border-sand transition-all cursor-pointer"
                            >
                              Cancelar / Directo
                            </button>
                          </div>

                          <form onSubmit={recordBalancePayment} className={`flex flex-col gap-4 ${!canEditFinanzas ? 'pointer-events-none opacity-80 select-none' : ''}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Fecha del Cobro *</label>
                                <input
                                  type="date"
                                  required
                                  value={paymentRegisterForm.date}
                                  onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, date: e.target.value })}
                                  className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Origen / Tipo</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={`Cobro Saldo Pedido ${sales.find(s => s.id === paymentRegisterForm.orderId)?.orderNum}`}
                                  className="text-xs bg-sand/30 border border-sand rounded-xl p-2.5 font-bold text-brown cursor-not-allowed"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Notas del Cobro</label>
                                <span className="text-[10px] text-stone">{paymentRegisterForm.note.length}/256 caracteres</span>
                              </div>
                              <textarea
                                rows={2}
                                maxLength={256}
                                placeholder="Ej. Pago contra entrega en efectivo, comprobante de transferencia..."
                                value={paymentRegisterForm.note}
                                onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, note: e.target.value })}
                                className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 resize-none"
                              />
                            </div>

                            <div className="pt-2 border-t border-sand">
                              <h4 className="font-serif text-sm font-bold text-brown mb-2.5">Detalle del Cobro</h4>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Moneda *</label>
                                  <select
                                    value={paymentRegisterForm.currency}
                                    onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, currency: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-bold"
                                  >
                                    <option value="ARS">ARS ($)</option>
                                    <option value="USD">USD (US$)</option>
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Cuenta de Tesorería *</label>
                                  <select
                                    value={paymentRegisterForm.account}
                                    onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, account: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 text-brown font-semibold"
                                  >
                                    <option value="Efectivo">Efectivo (Caja Chica)</option>
                                    <option value="Santander">Banco Santander</option>
                                    <option value="Uala">Ualá / Mercado Pago</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-2 pb-2.5">
                                  <input
                                    type="checkbox"
                                    id="pendingPaymentInc"
                                    checked={paymentRegisterForm.pendingPayment}
                                    onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, pendingPayment: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                                  />
                                  <label htmlFor="pendingPaymentInc" className="text-xs text-stone font-medium cursor-pointer select-none">
                                    Pendiente de cobro
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 bg-light-cream/30 p-3 rounded-xl border border-sand/60">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Monto Base ($)</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="0"
                                    value={paymentRegisterForm.amount}
                                    onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, amount: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-lg p-2 focus:outline-none font-mono font-bold text-emerald-800"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">IVA</label>
                                  <select
                                    value={paymentRegisterForm.iva}
                                    onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, iva: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-lg p-2 focus:outline-none font-semibold text-brown"
                                  >
                                    <option value="0">Sin IVA (0%)</option>
                                    <option value="10.5">10.5%</option>
                                    <option value="21">21%</option>
                                    <option value="27">27%</option>
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Calculado ($)</label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={fmt((parseFloat(paymentRegisterForm.amount) || 0) * (1 + (parseFloat(paymentRegisterForm.iva) || 0) / 100))}
                                    className="text-xs bg-sand/30 border border-sand rounded-lg p-2 font-mono font-bold text-brown cursor-not-allowed"
                                  />
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="mt-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                              <Plus className="w-4 h-4" /> Asentar Cobro de Pedido
                            </button>
                          </form>
                        </>
                      ) : (
                        /* MODO: INGRESO DIRECTO / EXTRAORDINARIO */
                        <>
                          <div className="flex items-center justify-between border-b border-sand pb-3 mb-4">
                            <div>
                              <h3 className="font-serif text-lg font-bold text-brown flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-600" />
                                Ingresar Ingreso Directo / Extraordinario
                              </h3>
                              <p className="text-xs text-stone mt-0.5">Asentamiento de aportes de capital, ventas extraordinarias u otros cobros.</p>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Prioridad
                            </span>
                          </div>

                          <form onSubmit={recordCustomIncome} className={`flex flex-col gap-4 ${!canEditFinanzas ? 'pointer-events-none opacity-80 select-none' : ''}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Fecha *</label>
                                <input
                                  type="date"
                                  required
                                  value={customIncomeForm.date}
                                  onChange={e => setCustomIncomeForm({ ...customIncomeForm, date: e.target.value })}
                                  className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Categoría *</label>
                                <select
                                  value={customIncomeForm.category}
                                  onChange={e => setCustomIncomeForm({ ...customIncomeForm, category: e.target.value })}
                                  className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 text-brown font-semibold"
                                >
                                  <option value="Aporte de Capital">Aporte de Capital</option>
                                  <option value="Venta Showroom">Venta Showroom Directa</option>
                                  <option value="Cobro Extraordinario">Cobro Extraordinario</option>
                                  <option value="Reembolso">Reembolso / Devolución</option>
                                  <option value="Otros">Otros Ingresos</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Concepto / Descripción *</label>
                                <span className="text-[10px] text-stone">{customIncomeForm.concept.length}/256 caracteres</span>
                              </div>
                              <textarea
                                rows={2}
                                maxLength={256}
                                required
                                placeholder="Escribí la descripción del ingreso, cliente o motivo..."
                                value={customIncomeForm.concept}
                                onChange={e => setCustomIncomeForm({ ...customIncomeForm, concept: e.target.value })}
                                className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 resize-none"
                              />
                            </div>

                            <div className="pt-2 border-t border-sand">
                              <h4 className="font-serif text-sm font-bold text-brown mb-2.5">Detalle del Ingreso</h4>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Moneda *</label>
                                  <select
                                    value={customIncomeForm.currency}
                                    onChange={e => setCustomIncomeForm({ ...customIncomeForm, currency: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-bold"
                                  >
                                    <option value="ARS">ARS ($)</option>
                                    <option value="USD">USD (US$)</option>
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Cuenta de Tesorería *</label>
                                  <select
                                    value={customIncomeForm.account}
                                    onChange={e => setCustomIncomeForm({ ...customIncomeForm, account: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 text-brown font-semibold"
                                  >
                                    <option value="Efectivo">Efectivo (Caja Chica)</option>
                                    <option value="Santander">Banco Santander</option>
                                    <option value="Uala">Ualá / Mercado Pago</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-2 pb-2.5">
                                  <input
                                    type="checkbox"
                                    id="pendingPaymentIncDir"
                                    checked={customIncomeForm.pendingPayment}
                                    onChange={e => setCustomIncomeForm({ ...customIncomeForm, pendingPayment: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                                  />
                                  <label htmlFor="pendingPaymentIncDir" className="text-xs text-stone font-medium cursor-pointer select-none">
                                    Pendiente de cobro
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 bg-light-cream/30 p-3 rounded-xl border border-sand/60">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Monto Base ($)</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="0"
                                    value={customIncomeForm.amount}
                                    onChange={e => setCustomIncomeForm({ ...customIncomeForm, amount: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-lg p-2 focus:outline-none font-mono font-bold text-emerald-800"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">IVA</label>
                                  <select
                                    value={customIncomeForm.iva}
                                    onChange={e => setCustomIncomeForm({ ...customIncomeForm, iva: e.target.value })}
                                    className="text-xs bg-white border border-sand rounded-lg p-2 focus:outline-none font-semibold text-brown"
                                  >
                                    <option value="0">Sin IVA (0%)</option>
                                    <option value="10.5">10.5%</option>
                                    <option value="21">21%</option>
                                    <option value="27">27%</option>
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Calculado ($)</label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={fmt((parseFloat(customIncomeForm.amount) || 0) * (1 + (parseFloat(customIncomeForm.iva) || 0) / 100))}
                                    className="text-xs bg-sand/30 border border-sand rounded-lg p-2 font-mono font-bold text-brown cursor-not-allowed"
                                  />
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="mt-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                              <Plus className="w-4 h-4" /> Registrar Ingreso Directo
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>

                  {/* COBRO DE SALDOS DE PEDIDOS DE VENTA (5 COLUMNAS - REFERENCIA) */}
                  <div className="lg:col-span-5 bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3 border-b border-sand pb-2">
                        <div>
                          <h3 className="font-serif text-base font-bold text-brown">Pedidos Con Saldo Pendiente</h3>
                          <p className="text-[10px] text-stone mt-0.5">Seleccioná un pedido para cargar sus datos al formulario.</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          {ordersWithBalance.length} pendientes
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {ordersWithBalance.length === 0 ? (
                          <div className="text-center py-12 text-stone text-xs italic">
                            ¡Excelente! No hay pedidos con saldos pendientes.
                          </div>
                        ) : (
                          ordersWithBalance.map(s => {
                            const collected = s.senaAmount || 0;
                            const outstanding = s.total - collected;
                            const isSelected = paymentRegisterForm.orderId === s.id;
                            return (
                              <div
                                key={s.id}
                                className={`p-3.5 border rounded-xl flex items-center justify-between text-xs transition-all ${
                                  isSelected
                                    ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-300'
                                    : 'bg-light-cream/20 border-sand/60 hover:bg-light-cream/50'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-brown font-mono font-bold text-sm">{s.orderNum}</strong>
                                    <span className="text-stone">&bull;</span>
                                    <strong className="text-brown">{s.client?.nombre || 'Consumidor Final'}</strong>
                                  </div>
                                  <div className="text-[10px] text-stone mt-1 flex flex-wrap gap-2">
                                    <span>Total: <strong>{fmt(s.total)}</strong></span>
                                    <span>&bull; Señado: <strong>{fmt(collected)}</strong></span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className="text-[9px] uppercase font-bold text-stone block">Saldo</span>
                                    <strong className="text-xs text-emerald-800 font-mono font-bold">{fmt(outstanding)}</strong>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentRegisterForm({
                                      orderId: s.id,
                                      amount: String(outstanding),
                                      account: s.paymentMethod?.toLowerCase().includes('cuotas') ? 'Uala' : s.paymentMethod?.toLowerCase().includes('transferencia') ? 'Santander' : 'Efectivo',
                                      currency: 'ARS',
                                      iva: '0',
                                      pendingPayment: false,
                                      date: new Date().toISOString().split('T')[0],
                                      note: `Cobro saldo pedido ${s.orderNum}`
                                    })}
                                    disabled={!canEditFinanzas}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 ${
                                      isSelected
                                        ? 'bg-emerald-700 text-white shadow-xs'
                                        : 'bg-brown text-cream hover:bg-emerald-700'
                                    }`}
                                  >
                                    {isSelected ? 'Cargado' : 'Cobrar Saldo'}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: EGRESOS */}
              {tesoreriaSubTab === 'egresos' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* FORMULARIO DE NUEVO EGRESO / GASTO (PRIORIDAD ALTA - 7 COLUMNAS) */}
                  <div className="lg:col-span-7 bg-white border-2 border-rose-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-sand pb-3 mb-4">
                        <div>
                          <h3 className="font-serif text-lg font-bold text-brown flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-rose-600" />
                            Ingresar Gasto / Egreso de Tesorería
                          </h3>
                          <p className="text-xs text-stone mt-0.5">Asentamiento prioritario de gastos operativos, insumos, impuestos y servicios.</p>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          Prioridad
                        </span>
                      </div>

                      <form onSubmit={addFixedCost} className={`flex flex-col gap-4 ${!canEditFinanzas ? 'pointer-events-none opacity-80 select-none' : ''}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Fecha *</label>
                            <input
                              type="date"
                              required
                              value={newFixedCost.date}
                              onChange={e => setNewFixedCost({ ...newFixedCost, date: e.target.value, month: e.target.value.substring(0, 7) })}
                              className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-rose-500 font-medium"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Categoría *</label>
                            <select
                              value={newFixedCost.category}
                              onChange={e => setNewFixedCost({ ...newFixedCost, category: e.target.value })}
                              className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-rose-500 text-brown font-semibold"
                            >
                              <option value="Alquiler">Alquiler Showroom / Depósito</option>
                              <option value="Sueldos">Sueldos & Honorarios</option>
                              <option value="Insumos">Insumos & Materia Prima</option>
                              <option value="Publicidad">Publicidad & Marketing</option>
                              <option value="Servicios">Servicios (Luz, Gas, Internet)</option>
                              <option value="Impuestos">Impuestos & Monotributo</option>
                              <option value="Fletes">Fletes & Envíos</option>
                              <option value="Mantenimiento">Mantenimiento & Taller</option>
                              <option value="Otros">Otros Egresos</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Descripción del Gasto *</label>
                            <span className="text-[10px] text-stone">{newFixedCost.description.length}/256 caracteres</span>
                          </div>
                          <textarea
                            rows={2}
                            maxLength={256}
                            required
                            placeholder="Escribí la descripción del gasto, detalle de factura o proveedor..."
                            value={newFixedCost.description}
                            onChange={e => setNewFixedCost({ ...newFixedCost, description: e.target.value })}
                            className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-rose-500 resize-none"
                          />
                        </div>

                        <div className="pt-2 border-t border-sand">
                          <h4 className="font-serif text-sm font-bold text-brown mb-2.5">Detalle del Pago</h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Moneda *</label>
                              <select
                                value={newFixedCost.currency}
                                onChange={e => setNewFixedCost({ ...newFixedCost, currency: e.target.value })}
                                className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-rose-500 font-bold"
                              >
                                <option value="ARS">ARS ($)</option>
                                <option value="USD">USD (US$)</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Cuenta de Tesorería *</label>
                              <select
                                value={newFixedCost.account}
                                onChange={e => setNewFixedCost({ ...newFixedCost, account: e.target.value })}
                                className="text-xs bg-white border border-sand rounded-xl p-2.5 focus:outline-none focus:border-rose-500 text-brown font-semibold"
                              >
                                <option value="Efectivo">Efectivo (Caja Chica)</option>
                                <option value="Santander">Banco Santander</option>
                                <option value="Uala">Ualá / Mercado Pago</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2 pb-2.5">
                              <input
                                type="checkbox"
                                id="pendingPayment"
                                checked={newFixedCost.pendingPayment}
                                onChange={e => setNewFixedCost({ ...newFixedCost, pendingPayment: e.target.checked })}
                                className="w-4 h-4 accent-rose-700 rounded cursor-pointer"
                              />
                              <label htmlFor="pendingPayment" className="text-xs text-stone font-medium cursor-pointer select-none">
                                Pendiente de pago
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 bg-light-cream/30 p-3 rounded-xl border border-sand/60">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Monto Base ($)</label>
                              <input
                                type="number"
                                required
                                placeholder="0"
                                value={newFixedCost.amount}
                                onChange={e => setNewFixedCost({ ...newFixedCost, amount: e.target.value })}
                                className="text-xs bg-white border border-sand rounded-lg p-2 focus:outline-none font-mono font-bold text-rose-800"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone">IVA</label>
                              <select
                                value={newFixedCost.iva}
                                onChange={e => setNewFixedCost({ ...newFixedCost, iva: e.target.value })}
                                className="text-xs bg-white border border-sand rounded-lg p-2 focus:outline-none font-semibold text-brown"
                              >
                                <option value="0">Sin IVA (0%)</option>
                                <option value="10.5">10.5%</option>
                                <option value="21">21%</option>
                                <option value="27">27%</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Calculado ($)</label>
                              <input
                                type="text"
                                readOnly
                                value={fmt((parseFloat(newFixedCost.amount) || 0) * (1 + (parseFloat(newFixedCost.iva) || 0) / 100))}
                                className="text-xs bg-sand/30 border border-sand rounded-lg p-2 font-mono font-bold text-brown cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="mt-2 py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Registrar Egreso / Gasto
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* LISTA DE EGRESOS REGISTRADOS (5 COLUMNAS) */}
                  <div className="lg:col-span-5 bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3 border-b border-sand pb-2">
                        <div>
                          <h3 className="font-serif text-base font-bold text-brown">Egresos Registrados</h3>
                          <p className="text-[10px] text-stone mt-0.5">Gastos e imputaciones del período.</p>
                        </div>
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          Total: {fmt(totalCostoFijo)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                        {filteredFixedCosts.length === 0 ? (
                          <div className="text-center py-12 text-stone text-xs italic">
                            No hay egresos registrados para este período.
                          </div>
                        ) : (
                          filteredFixedCosts.map(c => (
                            <div key={c.id} className="p-3 bg-light-cream/20 border border-sand/40 rounded-xl flex items-center justify-between text-xs hover:bg-light-cream/45 transition-all">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[9px] font-bold uppercase tracking-wider">{c.category}</span>
                                  <strong className="text-brown">{c.description}</strong>
                                </div>
                                <div className="text-[10px] text-stone mt-1 flex items-center gap-2">
                                  <span>Fecha: {c.date || c.month}</span>
                                  {c.account && <span>&bull; {c.account}</span>}
                                  {c.pendingPayment && <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">Pendiente</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <strong className="text-rose-700 font-mono font-bold text-xs">-{fmt(c.amount)}</strong>
                                <button
                                  type="button"
                                  onClick={() => deleteFixedCost(c.id)}
                                  disabled={!canEditFinanzas}
                                  className="p-1 text-stone/60 hover:text-rose-600 transition-colors disabled:opacity-40"
                                  title="Eliminar egreso"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: RESUMEN */}
              {tesoreriaSubTab === 'resumen' && (
                <>
              {/* MONTHLY EVOLUTION SECTION (TESORERÍA OPERATIONAL CHART) */}
              <div className="bg-[#FAF6F0] border border-[#E8DCC9] rounded-2xl p-5 sm:p-6 shadow-sm">
                {/* HEADER & LEGEND */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E0D2C0]">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-terra" />
                      <h3 className="font-serif text-lg font-bold text-[#3D1F0D]">
                        Evolución Mensual de Tesorería
                      </h3>
                    </div>
                    <p className="text-xs text-stone mt-1">
                      Pasa el cursor por arriba de las barras para ver el valor exacto formateado.
                    </p>
                  </div>

                  {/* LEGEND DOTS */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#3D1F0D]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#0284C7]"></span>
                      <span>Flujo Neto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#059669]"></span>
                      <span>Ingresos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#E11D48]"></span>
                      <span>Egresos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#D97706]"></span>
                      <span>Por Cobrar</span>
                    </div>
                  </div>
                </div>

                {/* MAIN CONTENT: 4 SUMMARY CARDS LEFT + BAR CHART RIGHT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-5">
                  {/* LEFT COLUMN: 4 STACKED SUMMARY CARDS */}
                  <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                    {/* Card 1: CAJA / FLUJO NETO */}
                    <div className="bg-[#F6F0E6] border border-[#E5D8C5] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone/90">
                          CAJA / FLUJO NETO
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          Percibido
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-[#3D1F0D] my-1">
                        {fmt(flujoNetoDeCaja)}
                      </div>
                      <p className="text-[10px] text-stone">Ingresos cobrados - Egresos pagados</p>
                      <div className="w-full h-1 bg-[#0284C7] rounded-full mt-1.5"></div>
                    </div>

                    {/* Card 2: TOTAL INGRESOS */}
                    <div className="bg-[#F6F0E6] border border-[#E5D8C5] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone/90">
                          TOTAL INGRESOS
                        </span>
                        <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-[#047857] my-1">
                        {fmt(totalIngresosCobrados)}
                      </div>
                      <p className="text-[10px] text-stone">Señas + Saldos + Ingresos Directos</p>
                      <div className="w-full h-1 bg-[#059669] rounded-full mt-1.5"></div>
                    </div>

                    {/* Card 3: TOTAL EGRESOS */}
                    <div className="bg-[#F6F0E6] border border-[#E5D8C5] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone/90">
                          TOTAL EGRESOS
                        </span>
                        <div className="p-1 bg-rose-100 text-rose-700 rounded-full">
                          <Trash2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-[#E11D48] my-1">
                        -${fmt(totalCostoFijo)}
                      </div>
                      <p className="text-[10px] text-stone">Costos fijos y gastos de fábrica</p>
                      <div className="w-full h-1 bg-[#E11D48] rounded-full mt-1.5"></div>
                    </div>

                    {/* Card 4: POR COBRAR */}
                    <div className="bg-[#F6F0E6] border border-[#E5D8C5] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone/90">
                          POR COBRAR
                        </span>
                        <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {ordersWithBalance.length} Pedidos
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-[#D97706] my-1">
                        {fmt(totalSaldosPendientes)}
                      </div>
                      <p className="text-[10px] text-stone">Saldos pendientes a la entrega</p>
                      <div className="w-full h-1 bg-[#D97706] rounded-full mt-1.5"></div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: VERTICAL GROUPED BAR CHART */}
                  <div className="lg:col-span-8 flex flex-col justify-end pl-0 lg:pl-4 border-l-0 lg:border-l border-[#E2D4C2]">
                    <div className="w-full overflow-x-auto pb-2">
                      <div className="min-w-[580px] h-64 flex items-end justify-between gap-3 pt-6 pb-1 px-2">
                        {monthlyData.map(d => {
                          const iHeight = (d.cobros / maxVal) * 100;
                          const eHeight = (d.costoFijo / maxVal) * 100;
                          const fHeight = (Math.max(0, d.flujo) / maxVal) * 100;
                          const pcHeight = (d.porCobrar / maxVal) * 100;
                          const isFilteredMonth = finanzasMonth === d.num;

                          return (
                            <div 
                              key={d.num} 
                              className={`flex-1 flex flex-col items-center group cursor-pointer transition-all p-1.5 rounded-xl ${
                                isFilteredMonth ? 'bg-terra/10 ring-2 ring-terra/40' : 'hover:bg-[#EAE0D2]/50'
                              }`}
                              onClick={() => setFinanzasMonth(isFilteredMonth ? 'todos' : d.num)}
                            >
                              {/* Grouped Bars Container */}
                              <div className="w-full h-44 flex items-end justify-center gap-1 relative">
                                {/* Blue Bar: Flujo Neto */}
                                <div 
                                  className="w-2.5 sm:w-3 bg-[#0284C7] rounded-t-full relative group/bar transition-all hover:brightness-110" 
                                  style={{ height: `${Math.max(fHeight, 3)}%` }}
                                >
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#3D1F0D] text-cream text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 font-mono shadow-lg border border-terra/30">
                                    Flujo Neto ({d.label}): <strong>{fmt(d.flujo)}</strong>
                                  </div>
                                </div>

                                {/* Green Bar: Ingresos */}
                                <div 
                                  className="w-2.5 sm:w-3 bg-[#059669] rounded-t-full relative group/bar transition-all hover:brightness-110" 
                                  style={{ height: `${Math.max(iHeight, 3)}%` }}
                                >
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#3D1F0D] text-cream text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 font-mono shadow-lg border border-terra/30">
                                    Ingresos ({d.label}): <strong>{fmt(d.cobros)}</strong>
                                  </div>
                                </div>

                                {/* Red Bar: Egresos */}
                                <div 
                                  className="w-2.5 sm:w-3 bg-[#E11D48] rounded-t-full relative group/bar transition-all hover:brightness-110" 
                                  style={{ height: `${Math.max(eHeight, 3)}%` }}
                                >
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#3D1F0D] text-cream text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 font-mono shadow-lg border border-terra/30">
                                    Egresos ({d.label}): <strong>{fmt(d.costoFijo)}</strong>
                                  </div>
                                </div>

                                {/* Amber Bar: Por Cobrar */}
                                <div 
                                  className="w-2.5 sm:w-3 bg-[#D97706] rounded-t-full relative group/bar transition-all hover:brightness-110" 
                                  style={{ height: `${Math.max(pcHeight, 3)}%` }}
                                >
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#3D1F0D] text-cream text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 font-mono shadow-lg border border-terra/30">
                                    Por Cobrar ({d.label}): <strong>{fmt(d.porCobrar)}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Baseline */}
                              <div className="w-full border-b-2 border-[#D8C8B8] my-2"></div>

                              {/* Month Label */}
                              <span className="text-xs font-bold text-[#3D1F0D]">
                                {d.label.substring(0, 3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* EXPORT CENTER CARD */}
              <div className="bg-white border-2 border-sand rounded-2xl p-6 shadow-sm mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand pb-4 mb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-brown flex items-center gap-2">
                      <FileText className="w-5 h-5 text-terra" />
                      Centro de Exportación de Reportes
                    </h3>
                    <p className="text-xs text-stone">Descargá tus datos financieros limpios e importalos con un clic en Google Sheets o Excel.</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Listo para planilla
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Export P&L */}
                  <button
                    type="button"
                    onClick={() => exportToCSV('pl', filteredPayments, filteredFixedCosts, totalVentas, totalCostoVariable, totalCostoFijo)}
                    className="p-4 bg-light-cream/40 hover:bg-cream border border-sand/60 rounded-xl text-left flex flex-col justify-between transition-all group"
                  >
                    <div className="flex justify-between items-start w-full mb-3">
                      <div className="p-2 bg-brown/5 rounded-lg text-brown group-hover:bg-brown group-hover:text-cream transition-all font-bold">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <Download className="w-4 h-4 text-stone group-hover:text-terra transition-all font-bold" />
                    </div>
                    <div>
                      <strong className="text-xs text-brown block">Reporte de Pérdidas y Ganancias (P&L)</strong>
                      <span className="text-[10px] text-stone block mt-1">Margen operativo, ingresos devengados y desglose de costos fijos del mes.</span>
                    </div>
                  </button>

                  {/* Export payments */}
                  <button
                    type="button"
                    onClick={() => exportToCSV('payments', filteredPayments, filteredFixedCosts, totalVentas, totalCostoVariable, totalCostoFijo)}
                    className="p-4 bg-light-cream/40 hover:bg-cream border border-sand/60 rounded-xl text-left flex flex-col justify-between transition-all group"
                  >
                    <div className="flex justify-between items-start w-full mb-3">
                      <div className="p-2 bg-brown/5 rounded-lg text-brown group-hover:bg-brown group-hover:text-cream transition-all font-bold">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <Download className="w-4 h-4 text-stone group-hover:text-terra transition-all font-bold" />
                    </div>
                    <div>
                      <strong className="text-xs text-brown block">Libro de Caja y Cobranza Real</strong>
                      <span className="text-[10px] text-stone block mt-1">Historial de entradas (señas y cobro de saldos) con cuentas de destino asimiladas.</span>
                    </div>
                  </button>

                  {/* Export outstanding balances */}
                  <button
                    type="button"
                    onClick={() => exportToCSV('outstanding', filteredPayments, filteredFixedCosts, totalVentas, totalCostoVariable, totalCostoFijo)}
                    className="p-4 bg-light-cream/40 hover:bg-cream border border-sand/60 rounded-xl text-left flex flex-col justify-between transition-all group"
                  >
                    <div className="flex justify-between items-start w-full mb-3">
                      <div className="p-2 bg-brown/5 rounded-lg text-brown group-hover:bg-brown group-hover:text-cream transition-all font-bold">
                        <Clock className="w-5 h-5" />
                      </div>
                      <Download className="w-4 h-4 text-stone group-hover:text-terra transition-all font-bold" />
                    </div>
                    <div>
                      <strong className="text-xs text-brown block">Libro de Cuentas a Cobrar (Saldos)</strong>
                      <span className="text-[10px] text-stone block mt-1">Saldos pendientes de cobro ordenados por pedido con fechas de entrega proyectadas.</span>
                    </div>
                  </button>

                </div>

                <div className="mt-5 p-3.5 bg-light-cream/30 border border-sand/30 rounded-xl text-[10px] text-stone leading-relaxed">
                  💡 <strong>¿Cómo importarlo en Google Sheets?</strong> Creá una nueva hoja en Google Sheets, seleccioná <strong>Archivo &gt; Importar &gt; Subir</strong>, seleccioná el archivo descargado y elegí "Detectar automáticamente" o "Semicolon" como separador. Todo se organizará al instante en columnas limpias con formato numérico.
                </div>
              </div>
              </>
              )}

              {/* SUBTAB: LIBRO DE MOVIMIENTOS */}
              {tesoreriaSubTab === 'movimientos' && (() => {
                const allMovements = [
                  ...filteredPayments.map(p => ({
                    rawType: 'ingreso',
                    isLedger: true,
                    isFixedCost: false,
                    originalId: p.id,
                    codigo: p.orderNum ? `ING-${p.orderNum}` : `ING-${String(p.id).slice(-4)}`,
                    fecha: p.date || '—',
                    entidad: p.clientName || 'Consumidor Final',
                    operacion: p.note || (p.type === 'Saldo' ? `Cobro Saldo Pedido #${p.orderNum}` : p.orderNum ? `Seña / Anticipo Pedido #${p.orderNum}` : 'Ingreso Directo'),
                    moneda: p.currency || 'ARS',
                    medio: p.account || p.paymentMethod || 'Efectivo',
                    subCategoria: p.type || 'Cobro',
                    monto: p.amount || 0,
                    baseMonto: p.baseAmount || p.amount || 0,
                    ivaPct: p.ivaPct || 0,
                    estado: p.pendingPayment ? 'Pendiente' : 'Cobrado',
                    originalItem: p
                  })),
                  ...filteredFixedCosts.map(c => ({
                    rawType: 'egreso',
                    isLedger: false,
                    isFixedCost: true,
                    originalId: c.id,
                    codigo: `EGR-${String(c.id).slice(-4)}`,
                    fecha: c.date || c.month || '—',
                    entidad: c.description || c.category || 'Gasto General',
                    operacion: c.description || 'Gasto / Egreso de Operación',
                    moneda: c.currency || 'ARS',
                    medio: c.account || 'Efectivo',
                    subCategoria: c.category || 'Gasto Fijo',
                    monto: c.amount || 0,
                    baseMonto: c.baseAmount || c.amount || 0,
                    ivaPct: c.ivaPct || 0,
                    estado: c.pendingPayment ? 'Pendiente' : 'Pagado',
                    originalItem: c
                  }))
                ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                const filteredMovements = allMovements.filter(m => {
                  if (movimientosTypeFilter === 'ingresos' && m.rawType !== 'ingreso') return false;
                  if (movimientosTypeFilter === 'egresos' && m.rawType !== 'egreso') return false;
                  if (movimientosTypeFilter === 'pendientes' && m.estado !== 'Pendiente') return false;

                  if (!movimientosSearch.trim()) return true;
                  const q = movimientosSearch.toLowerCase();
                  return (
                    m.codigo.toLowerCase().includes(q) ||
                    m.fecha.toLowerCase().includes(q) ||
                    m.entidad.toLowerCase().includes(q) ||
                    m.operacion.toLowerCase().includes(q) ||
                    m.moneda.toLowerCase().includes(q) ||
                    m.medio.toLowerCase().includes(q) ||
                    m.subCategoria.toLowerCase().includes(q) ||
                    m.estado.toLowerCase().includes(q) ||
                    String(m.monto).includes(q)
                  );
                });

                const totalMovIngresos = filteredMovements.filter(m => m.rawType === 'ingreso').reduce((a, b) => a + b.monto, 0);
                const totalMovEgresos = filteredMovements.filter(m => m.rawType === 'egreso').reduce((a, b) => a + b.monto, 0);
                const balanceMov = totalMovIngresos - totalMovEgresos;

                return (
                  <div className="space-y-5">
                    {/* HEADER & FILTERS BAR */}
                    <div className="bg-white border border-sand rounded-2xl p-4 sm:p-5 shadow-xs">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-terra" />
                            <h3 className="font-serif text-lg font-bold text-brown">
                              Libro Diario de Movimientos & Asientos
                            </h3>
                          </div>
                          <p className="text-xs text-stone mt-0.5">
                            Registro contable centralizado de todos los cobros, ingresos directos y gastos/egresos.
                          </p>
                        </div>

                        {/* SEARCH & TYPE FILTER PILLS */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {/* Buscador */}
                          <div className="relative flex-1 min-w-[200px] sm:w-64">
                            <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Buscar por ID, cliente, concepto..."
                              value={movimientosSearch}
                              onChange={(e) => setMovimientosSearch(e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all outline-none"
                            />
                            {movimientosSearch && (
                              <button
                                onClick={() => setMovimientosSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone hover:text-brown cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Filter Pills */}
                          <div className="flex items-center bg-cream/50 p-1 rounded-xl border border-sand/60 text-xs font-bold">
                            <button
                              onClick={() => setMovimientosTypeFilter('todos')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                movimientosTypeFilter === 'todos' ? 'bg-brown text-cream shadow-xs' : 'text-stone hover:text-brown'
                              }`}
                            >
                              Todos ({allMovements.length})
                            </button>
                            <button
                              onClick={() => setMovimientosTypeFilter('ingresos')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                movimientosTypeFilter === 'ingresos' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              Ingresos
                            </button>
                            <button
                              onClick={() => setMovimientosTypeFilter('egresos')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                movimientosTypeFilter === 'egresos' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-50'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                              Egresos
                            </button>
                            <button
                              onClick={() => setMovimientosTypeFilter('pendientes')}
                              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                movimientosTypeFilter === 'pendientes' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
                              }`}
                            >
                              Pendientes
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SUMMARY STATS STRIP */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-sand/60">
                        <div className="bg-light-cream p-3 rounded-xl border border-sand/50">
                          <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">Asientos Filtrados</span>
                          <span className="text-lg font-serif font-bold text-brown">{filteredMovements.length}</span>
                        </div>
                        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/60">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Total Ingresos</span>
                          <span className="text-lg font-serif font-bold text-emerald-700">+{fmt(totalMovIngresos)}</span>
                        </div>
                        <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200/60">
                          <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider block">Total Egresos</span>
                          <span className="text-lg font-serif font-bold text-rose-700">-{fmt(totalMovEgresos)}</span>
                        </div>
                        <div className={`p-3 rounded-xl border ${balanceMov >= 0 ? 'bg-sky-50/60 border-sky-200/60' : 'bg-amber-50/60 border-amber-200/60'}`}>
                          <span className="text-[10px] uppercase font-bold text-stone tracking-wider block">Balance de Selección</span>
                          <span className={`text-lg font-serif font-bold ${balanceMov >= 0 ? 'text-sky-800' : 'text-amber-800'}`}>
                            {balanceMov >= 0 ? '+' : ''}{fmt(balanceMov)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DATAGRID TABLE */}
                    <div className="bg-white border border-sand rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead>
                            <tr className="bg-brown text-cream text-[11px] font-bold uppercase tracking-wider border-b border-sand/30">
                              <th className="py-3 px-3 w-10 text-center">Tipo</th>
                              <th className="py-3 px-3">ID</th>
                              <th className="py-3 px-3">Fecha</th>
                              <th className="py-3 px-3">Cliente / Entidad</th>
                              <th className="py-3 px-3">Operación / Concepto</th>
                              <th className="py-3 px-3">Moneda</th>
                              <th className="py-3 px-3">Medio de Pago / Cuenta</th>
                              <th className="py-3 px-3">Sub-Categoría</th>
                              <th className="py-3 px-3">Estado</th>
                              <th className="py-3 px-3 text-right">Total ARS</th>
                              <th className="py-3 px-3 text-center w-20">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand/40 text-xs">
                            {filteredMovements.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="py-12 text-center text-stone">
                                  <FileText className="w-8 h-8 text-stone/40 mx-auto mb-2" />
                                  <p className="font-bold">No se encontraron asientos contables</p>
                                  <p className="text-[11px] text-stone/80 mt-1">Probá cambiando el texto de búsqueda o los filtros superiores.</p>
                                </td>
                              </tr>
                            ) : (
                              filteredMovements.map((m) => {
                                const isIngreso = m.rawType === 'ingreso';
                                return (
                                  <tr key={`${m.codigo}-${m.originalId}`} className="hover:bg-cream/20 transition-colors group">
                                    <td className="py-3 px-3 text-center">
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                        isIngreso ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {isIngreso ? '+' : '-'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-brown whitespace-nowrap">
                                      {m.codigo}
                                    </td>
                                    <td className="py-3 px-3 text-stone whitespace-nowrap">
                                      {fmtDate(m.fecha)}
                                    </td>
                                    <td className="py-3 px-3 font-semibold text-brown max-w-[180px] truncate">
                                      {m.entidad}
                                    </td>
                                    <td className="py-3 px-3 text-stone max-w-[220px] truncate" title={m.operacion}>
                                      {m.operacion}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-semibold text-stone">
                                      {m.moneda}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="inline-block px-2 py-0.5 bg-sand/30 text-brown rounded-md font-medium text-[11px]">
                                        {m.medio}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-stone">
                                      {m.subCategoria}
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        m.estado === 'Pendiente'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : isIngreso
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-stone-100 text-stone-700'
                                      }`}>
                                        {m.estado}
                                      </span>
                                    </td>
                                    <td className={`py-3 px-3 text-right font-mono font-bold text-sm whitespace-nowrap ${
                                      isIngreso ? 'text-emerald-700' : 'text-rose-700'
                                    }`}>
                                      {isIngreso ? '+' : '-'}${fmt(m.monto)}
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                                        {canEditFinanzas ? (
                                          <>
                                            <button
                                              onClick={() => openEditMovement(m)}
                                              title="Editar gasto / movimiento"
                                              className="p-1.5 text-stone hover:text-terra hover:bg-terra/10 rounded-lg transition-colors cursor-pointer"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => deleteMovementItem(m)}
                                              title="Eliminar asiento"
                                              className="p-1.5 text-stone hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-stone/50 italic">Lectura</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          );
        })()}
      </main>

      {/* EDIT SALE MODAL OVERLAY */}
      {editingSale && (
        <div className="fixed inset-0 bg-brown/50 backdrop-blur-xs flex items-center justify-center z-30 p-4 animate-fadeIn">
          <div className="bg-white border-2 border-sand rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            
            <div className="border-b border-sand pb-3 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-lg font-bold text-brown flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-terra" />
                  <span>Editar Venta</span>
                  <span className="font-mono text-xs text-terra bg-amber-50 px-2 py-0.5 rounded-full border border-sand">
                    {editingSale.orderNum}
                  </span>
                </h2>
                <p className="text-xs text-stone mt-0.5">
                  Cliente: <strong>{editingSale.client?.nombre || 'Consumidor Final'}</strong>
                </p>
              </div>
              <button 
                onClick={() => setEditingSale(null)}
                className="p-1 rounded-lg hover:bg-sand/40 text-stone hover:text-brown transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Main Financial Inputs */}
              <div className="bg-amber-50/20 border border-sand/80 rounded-xl p-4 flex flex-col gap-3">
                <h4 className="text-[10px] uppercase font-bold text-stone tracking-wider border-b border-sand pb-1">
                  Valores Financieros
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-brown">Precio Venta Total ($)</label>
                    <input
                      type="number"
                      value={editingSale.total ?? 0}
                      onChange={(e) => setEditingSale({ ...editingSale, total: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-brown bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-amber-900">Costo Total ($)</label>
                    <input
                      type="number"
                      value={editingSale.totalCost ?? 0}
                      onChange={(e) => setEditingSale({ ...editingSale, totalCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-amber-900 bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-stone">Seña Abonada ($)</label>
                    <input
                      type="number"
                      value={editingSale.senaAmount ?? 0}
                      onChange={(e) => setEditingSale({ ...editingSale, senaAmount: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-stone bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-sand/40">
                  <span className="text-stone">Ganancia Estimada:</span>
                  <span className="text-emerald-700 font-mono text-sm">
                    {fmt((editingSale.total || 0) - (editingSale.totalCost || 0))}
                  </span>
                </div>
              </div>

              {/* Items Cost/Price Breakdown if available */}
              {editingSale.items && editingSale.items.length > 0 && (
                <div className="bg-white border border-sand rounded-xl p-3.5 flex flex-col gap-2">
                  <h4 className="text-[10px] uppercase font-bold text-stone tracking-wider">
                    Desglose de Productos ({editingSale.items.length})
                  </h4>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {editingSale.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-light-cream/30 border border-sand/50 rounded-lg text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-brown truncate">{item.cant || 1}x {item.nombre}</p>
                          <p className="text-[9px] text-stone">{item.madera} · {item.cat}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase font-bold text-stone">Precio U.</span>
                            <input
                              type="number"
                              value={item.precioUnitario ?? 0}
                              onChange={(e) => {
                                const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                const updatedItems = [...editingSale.items];
                                updatedItems[idx] = { ...item, precioUnitario: newPrice, precioTotal: newPrice * (item.cant || 1) };
                                const newSumTotal = updatedItems.reduce((acc, it) => acc + (it.precioTotal || 0), 0);
                                setEditingSale({ ...editingSale, items: updatedItems, total: newSumTotal });
                              }}
                              className="w-20 p-1 text-[10px] border border-sand rounded text-right font-mono bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase font-bold text-stone">Costo U.</span>
                            <input
                              type="number"
                              value={item.costoUnitario ?? 0}
                              onChange={(e) => {
                                const newCost = Math.max(0, parseFloat(e.target.value) || 0);
                                const updatedItems = [...editingSale.items];
                                updatedItems[idx] = { ...item, costoUnitario: newCost, costoTotal: newCost * (item.cant || 1) };
                                const newSumCost = updatedItems.reduce((acc, it) => acc + (it.costoTotal || 0), 0);
                                setEditingSale({ ...editingSale, items: updatedItems, totalCost: newSumCost });
                              }}
                              className="w-20 p-1 text-[10px] border border-sand rounded text-right font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-stone">Fecha de Entrega Estimada</label>
                  <input
                    type="text"
                    value={editingSale.deliveryDate || ''}
                    onChange={(e) => setEditingSale({ ...editingSale, deliveryDate: e.target.value })}
                    placeholder="ej. 15 de Septiembre de 2026"
                    className="p-2 border border-sand rounded-lg text-xs bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-stone">Estado de Pago</label>
                  <select
                    value={editingSale.paymentStatus || 'Señado'}
                    onChange={(e) => setEditingSale({ ...editingSale, paymentStatus: e.target.value })}
                    className="p-2 border border-sand rounded-lg text-xs bg-white"
                  >
                    <option value="Señado">Señado (Seña pagada)</option>
                    <option value="Pagado">Pagado Completo</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-stone">Notas Especiales / Observaciones</label>
                <textarea
                  rows={2}
                  value={editingSale.notes || ''}
                  onChange={(e) => setEditingSale({ ...editingSale, notes: e.target.value })}
                  placeholder="Instrucciones especiales de lustre, telas, envío..."
                  className="w-full p-2 border border-sand rounded-lg text-xs bg-white"
                />
              </div>

              {/* Attachments Section in Edit Modal */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-sand/60">
                <label className="text-[10px] uppercase font-bold text-stone flex items-center justify-between">
                  <span>Adjuntar / Editar Fotos y Planos</span>
                  <span className="text-[9px] font-normal text-stone">({editingSale.attachments?.length || 0} adjuntos)</span>
                </label>
                
                <div className="border border-dashed border-sand hover:border-terra bg-light-cream/30 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      processFilesToAttachments(
                        e.target.files,
                        editingSale.attachments || [],
                        (updated) => setEditingSale((prev: any) => ({ ...prev, attachments: updated }))
                      );
                      e.target.value = '';
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center gap-1.5 text-terra font-bold text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Subir o reemplazar fotos / planos</span>
                  </div>
                </div>

                {editingSale.attachments && editingSale.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {editingSale.attachments.map((att: any) => {
                      const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                      return (
                        <div key={att.id} className="relative group bg-white border border-sand rounded-lg p-1.5 flex items-center gap-2 overflow-hidden shadow-2xs">
                          {isImg ? (
                            <img
                              src={att.dataUrl}
                              alt={att.name}
                              onClick={() => setPreviewImage({ url: att.dataUrl, name: att.name })}
                              className="w-10 h-10 object-cover rounded shrink-0 border border-sand/40 cursor-pointer hover:opacity-80"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-terra/10 rounded flex items-center justify-center text-terra shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-brown truncate">{att.name}</p>
                            {isImg && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: att.dataUrl, name: att.name })}
                                className="text-[8px] font-bold text-terra hover:underline"
                              >
                                Ver foto
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSale((prev: any) => ({
                                ...prev,
                                attachments: (prev.attachments || []).filter((a: any) => a.id !== att.id)
                              }));
                            }}
                            className="p-1 text-stone hover:text-rose-600 transition-colors"
                            title="Eliminar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-sand">
              <button 
                onClick={() => setEditingSale(null)}
                className="bg-transparent text-stone border border-sand hover:border-stone px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEditedSale}
                className="bg-brown text-cream px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra hover:text-white transition-all shadow-md"
              >
                Guardar Cambios
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GENERATE PURCHASE ORDER MODAL OVERLAY */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-brown/40 backdrop-blur-xs flex items-center justify-center z-20 p-4">
          <div className="bg-white border-2 border-sand rounded-xl max-w-lg w-full p-6 shadow-lg flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            
            <div className="border-b border-sand pb-3 flex justify-between items-center">
              <h2 className="font-serif text-xl font-bold text-brown">Nueva Orden de Pedido</h2>
              <span className="text-xs text-stone font-bold">Barda Home</span>
            </div>

            {/* Client summary info */}
            <div className="bg-light-cream/60 border border-sand/40 rounded-lg p-3 text-xs">
              <div><span className="text-stone font-semibold uppercase text-[9px] mr-2">Cliente:</span> <strong>{cliente.nombre || 'Consumidor Final'}</strong></div>
              <div><span className="text-stone font-semibold uppercase text-[9px] mr-2">Fecha Entrega:</span> <strong>{calcDeliveryDate()}</strong></div>
              <div className="border-t border-sand/40 pt-1.5 mt-1.5 flex justify-between text-brown font-bold">
                <span>Total del Pedido:</span>
                <span className="text-terra">{fmt(finalBudgetValue)}</span>
              </div>
            </div>

            {/* Order spec forms */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-stone">Monto de Seña</label>
                <div className="flex items-center gap-3 bg-light-cream/40 border border-sand p-2 rounded-lg">
                  <div className="flex gap-1.5">
                    {[30, 50, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setOrderForm({ ...orderForm, senaPercent: pct, isSenaCustom: false })}
                        className={`px-3 py-1 text-xs font-bold rounded ${!orderForm.isSenaCustom && orderForm.senaPercent === pct ? 'bg-brown text-cream' : 'bg-white text-stone border border-sand/60'}`}
                      >
                        {pct}%
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, isSenaCustom: true })}
                      className={`px-3 py-1 text-xs font-bold rounded ${orderForm.isSenaCustom ? 'bg-brown text-cream' : 'bg-white text-stone border border-sand/60'}`}
                    >
                      Personalizado
                    </button>
                  </div>
                  
                  {orderForm.isSenaCustom ? (
                    <div className="flex-1 flex items-center justify-end gap-1">
                      <span className="text-stone text-xs">$</span>
                      <input 
                        type="number" 
                        value={orderForm.senaCustom} 
                        onChange={e => setOrderForm({ ...orderForm, senaCustom: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-24 text-right py-1 px-1.5 border border-sand rounded text-xs"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 text-right font-bold text-brown text-xs">
                      {fmt(finalBudgetValue * (orderForm.senaPercent / 100))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-stone">Estado de Entrega</label>
                  <select 
                    value={orderForm.status} 
                    onChange={e => setOrderForm({ ...orderForm, status: e.target.value })}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Producción">En Producción</option>
                    <option value="Listo para Entrega">Listo para Entrega</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-stone">Estado del Pago</label>
                  <select 
                    value={orderForm.paymentStatus} 
                    onChange={e => setOrderForm({ ...orderForm, paymentStatus: e.target.value })}
                  >
                    <option value="Señado">Señado (Seña pagada)</option>
                    <option value="Pagado">Pagado Completo</option>
                    <option value="Pendiente">Pendiente (Sin pagar)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-stone">Notas o Especificaciones</label>
                <textarea 
                  rows={2} 
                  placeholder="Detalles de lustre de maderas, combinaciones de telas, observaciones de envío..." 
                  value={orderForm.notes} 
                  onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-sand rounded-lg text-xs"
                />
              </div>

              {/* File Attachments */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-stone flex items-center justify-between">
                  <span>Adjuntar Imágenes / Planos / Archivos</span>
                  <span className="text-[9px] font-normal text-stone/80">(Fotos, renders, planos en PDF)</span>
                </label>
                
                <div className="border border-dashed border-sand hover:border-terra bg-light-cream/30 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      processFilesToAttachments(
                        e.target.files,
                        orderForm.attachments || [],
                        (updated) => setOrderForm(prev => ({ ...prev, attachments: updated }))
                      );
                      e.target.value = '';
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center gap-2 text-terra font-bold text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Seleccionar o arrastrar archivos</span>
                  </div>
                  <span className="text-[10px] text-stone">Formatos: JPG, PNG, WEBP, PDF (Máx. 8MB)</span>
                </div>

                {orderForm.attachments && orderForm.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {orderForm.attachments.map((att: any) => {
                      const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                      return (
                        <div key={att.id} className="relative group bg-white border border-sand rounded-lg p-1.5 flex items-center gap-2 overflow-hidden shadow-2xs">
                          {isImg ? (
                            <img src={att.dataUrl} alt={att.name} className="w-10 h-10 object-cover rounded shrink-0 border border-sand/40" />
                          ) : (
                            <div className="w-10 h-10 bg-terra/10 rounded flex items-center justify-center text-terra shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-brown truncate">{att.name}</p>
                            <p className="text-[8px] text-stone">
                              {att.size ? `${(att.size / 1024).toFixed(0)} KB` : 'Archivo'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOrderForm(prev => ({
                                ...prev,
                                attachments: prev.attachments.filter(a => a.id !== att.id)
                              }));
                            }}
                            className="p-1 text-stone hover:text-rose-600 transition-colors"
                            title="Eliminar archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex gap-3 justify-end pt-3 border-t border-sand">
              <button 
                onClick={() => setShowOrderModal(false)}
                className="bg-transparent text-stone border border-sand hover:border-stone px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmOrder}
                className="bg-brown text-cream px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-terra hover:text-white transition-all duration-150"
              >
                Confirmar Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-brown/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white border-2 border-sand rounded-2xl p-3 shadow-2xl flex flex-col items-center overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center px-2 pb-2 border-b border-sand text-xs font-bold text-brown">
              <span className="truncate max-w-md">{previewImage.name}</span>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded hover:bg-sand/40 text-stone hover:text-brown transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[75vh] flex items-center justify-center">
              <img src={previewImage.url} alt={previewImage.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
            <div className="w-full pt-2 border-t border-sand/40 flex justify-end">
              <a 
                href={previewImage.url} 
                download={previewImage.name} 
                className="px-4 py-1.5 bg-terra text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-brown transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Imagen</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MOVEMENT MODAL */}
      {editingMovement && (
        <div className="fixed inset-0 bg-brown/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-sand rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-sand">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-terra" />
                <h3 className="font-serif font-bold text-lg text-brown">
                  Editar {editMovementForm.isFixedCost ? 'Gasto / Egreso' : 'Movimiento de Ingreso'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMovement(null)}
                className="text-stone hover:text-brown p-1 rounded-lg hover:bg-cream cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveEditedMovement} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">Fecha</label>
                  <input
                    type="date"
                    value={editMovementForm.date}
                    onChange={e => setEditMovementForm({ ...editMovementForm, date: e.target.value })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">
                    {editMovementForm.isFixedCost ? 'Categoría' : 'Orden / Tipo'}
                  </label>
                  <input
                    type="text"
                    value={editMovementForm.category}
                    onChange={e => setEditMovementForm({ ...editMovementForm, category: e.target.value })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone mb-1">
                  {editMovementForm.isFixedCost ? 'Descripción / Concepto' : 'Cliente / Pagador'}
                </label>
                <input
                  type="text"
                  value={editMovementForm.isFixedCost ? editMovementForm.description : editMovementForm.clientName}
                  onChange={e => {
                    if (editMovementForm.isFixedCost) {
                      setEditMovementForm({ ...editMovementForm, description: e.target.value });
                    } else {
                      setEditMovementForm({ ...editMovementForm, clientName: e.target.value });
                    }
                  }}
                  className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">Monto Base ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={editMovementForm.baseAmount}
                    onChange={e => setEditMovementForm({ ...editMovementForm, baseAmount: e.target.value })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">IVA (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={editMovementForm.iva}
                    onChange={e => setEditMovementForm({ ...editMovementForm, iva: e.target.value })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">Moneda</label>
                  <select
                    value={editMovementForm.currency}
                    onChange={e => setEditMovementForm({ ...editMovementForm, currency: e.target.value })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">Cuenta Tesorería</label>
                  <select
                    value={editMovementForm.account}
                    onChange={e => setEditMovementForm({ ...editMovementForm, account: e.target.value })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Santander">Santander</option>
                    <option value="Uala">Ualá</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone mb-1">Estado</label>
                  <select
                    value={editMovementForm.pendingPayment ? 'pendiente' : 'realizado'}
                    onChange={e => setEditMovementForm({ ...editMovementForm, pendingPayment: e.target.value === 'pendiente' })}
                    className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                  >
                    <option value="realizado">{editMovementForm.isFixedCost ? 'Pagado' : 'Cobrado'}</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone mb-1">Notas / Detalle adicional</label>
                <input
                  type="text"
                  value={editMovementForm.note}
                  onChange={e => setEditMovementForm({ ...editMovementForm, note: e.target.value })}
                  className="w-full p-2.5 bg-cream/30 border border-sand rounded-xl text-xs font-bold text-brown"
                  placeholder="Observaciones..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setEditingMovement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-sand text-stone hover:bg-cream cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brown text-cream hover:bg-terra transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE REMITENTES MODAL */}
      {showManageRemitentesModal && (
        <div className="fixed inset-0 bg-brown/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-sand rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-sand">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-terra" />
                <h3 className="font-serif font-bold text-lg text-brown">
                  Gestión de Remitentes (Emisores)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageRemitentesModal(false);
                  setEditingRemitenteId(null);
                  setRemitenteForm({ nombre: '', cuit: '', telefono: '' });
                }}
                className="text-stone hover:text-brown p-1 rounded-lg hover:bg-cream cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto my-4 space-y-5 pr-1">
              {/* FORM TO ADD / EDIT */}
              <div className="bg-light-cream/50 border border-sand rounded-xl p-4">
                <h4 className="text-xs font-bold text-brown uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-terra" />
                  <span>{editingRemitenteId ? 'Editar Remitente' : 'Agregar Nuevo Remitente'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone uppercase mb-1">Nombre / Razón Social *</label>
                    <input
                      type="text"
                      placeholder="Ej. Barda Home / Juan Pérez"
                      value={remitenteForm.nombre}
                      onChange={e => setRemitenteForm({ ...remitenteForm, nombre: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-sand rounded-lg text-brown focus:outline-none focus:border-terra"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone uppercase mb-1">CUIT / CUIL</label>
                    <input
                      type="text"
                      placeholder="Ej. 30-71654321-9"
                      value={remitenteForm.cuit}
                      onChange={e => setRemitenteForm({ ...remitenteForm, cuit: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-sand rounded-lg text-brown focus:outline-none focus:border-terra"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone uppercase mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="Ej. +54 9 11 1234-5678"
                      value={remitenteForm.telefono}
                      onChange={e => setRemitenteForm({ ...remitenteForm, telefono: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-sand rounded-lg text-brown focus:outline-none focus:border-terra"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  {editingRemitenteId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRemitenteId(null);
                        setRemitenteForm({ nombre: '', cuit: '', telefono: '' });
                      }}
                      className="px-3 py-1.5 text-xs font-bold border border-sand text-stone rounded-lg hover:bg-cream cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!remitenteForm.nombre.trim()) {
                        alert('Ingresá al menos el Nombre o Razón Social del remitente.');
                        return;
                      }
                      if (editingRemitenteId) {
                        setRemitentesList(remitentesList.map(r => r.id === editingRemitenteId ? { ...r, ...remitenteForm } : r));
                        if (remitoRemitente.id === editingRemitenteId) {
                          setRemitoRemitente({ id: editingRemitenteId, ...remitenteForm });
                        }
                        setEditingRemitenteId(null);
                      } else {
                        const newR = { id: 'rem-' + Date.now(), ...remitenteForm };
                        setRemitentesList([...remitentesList, newR]);
                        setRemitoRemitente(newR);
                      }
                      setRemitenteForm({ nombre: '', cuit: '', telefono: '' });
                    }}
                    className="px-4 py-1.5 text-xs font-bold bg-terra text-white rounded-lg hover:bg-brown transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingRemitenteId ? 'Guardar Cambios' : 'Agregar Remitente'}</span>
                  </button>
                </div>
              </div>

              {/* LIST OF SAVED REMITENTES */}
              <div>
                <h4 className="text-xs font-bold text-stone uppercase tracking-wider mb-2">
                  Remitentes Guardados ({remitentesList.length})
                </h4>
                <div className="divide-y divide-sand border border-sand rounded-xl overflow-hidden bg-white text-xs">
                  {remitentesList.map(rem => {
                    const isSelected = remitoRemitente.id === rem.id;
                    return (
                      <div key={rem.id} className={`p-3 flex items-center justify-between gap-3 ${isSelected ? 'bg-cream/40' : 'hover:bg-light-cream/30'}`}>
                        <div className="flex flex-col gap-0.5">
                          <div className="font-bold text-brown flex items-center gap-2">
                            <span>{rem.nombre}</span>
                            {isSelected && (
                              <span className="text-[9px] bg-terra/10 text-terra border border-terra/30 font-bold px-2 py-0.5 rounded-full uppercase">
                                Activo en Remito
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone flex flex-wrap gap-x-4">
                            {rem.cuit && <span>CUIT: <strong className="text-brown">{rem.cuit}</strong></span>}
                            {rem.telefono && <span>Tel: <strong className="text-brown">{rem.telefono}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRemitoRemitente({ ...rem });
                              setShowManageRemitentesModal(false);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isSelected ? 'bg-brown text-cream border-brown' : 'bg-white text-stone border-sand hover:border-terra hover:text-terra'
                            }`}
                          >
                            {isSelected ? 'Seleccionado' : 'Usar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRemitenteId(rem.id);
                              setRemitenteForm({ nombre: rem.nombre, cuit: rem.cuit, telefono: rem.telefono });
                            }}
                            className="p-1.5 text-stone hover:text-terra border border-sand rounded-lg bg-white hover:bg-cream transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {remitentesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Eliminar al remitente "${rem.nombre}"?`)) {
                                  const updated = remitentesList.filter(r => r.id !== rem.id);
                                  setRemitentesList(updated);
                                  if (remitoRemitente.id === rem.id && updated.length > 0) {
                                    setRemitoRemitente(updated[0]);
                                  }
                                }
                              }}
                              className="p-1.5 text-stone hover:text-error border border-sand rounded-lg bg-white hover:bg-cream transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-sand">
              <button
                type="button"
                onClick={() => setShowManageRemitentesModal(false)}
                className="px-5 py-2 bg-brown text-cream text-xs font-bold rounded-xl hover:bg-terra transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MI PERFIL MODAL */}
      {showProfileModal && currentUser && (
        <div 
          className="fixed inset-0 bg-brown/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="bg-white border-2 border-sand rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sand pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-terra/10 rounded-xl text-terra">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-brown text-lg leading-tight">Mi Perfil</h3>
                  <p className="text-xs text-stone">Detalles de la cuenta actual</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowProfileModal(false)}
                className="text-stone hover:text-brown p-1.5 rounded-lg hover:bg-cream transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-light-cream border border-sand rounded-xl">
              <div className="w-14 h-14 rounded-full bg-brown text-cream flex items-center justify-center font-serif font-bold text-lg shadow-sm shrink-0">
                {formatAbbreviatedName(currentUser.name)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-brown text-base truncate">{currentUser.name}</span>
                <span className="text-xs text-stone truncate">{currentUser.email}</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-terra/10 text-terra font-bold text-[10px] uppercase rounded-md tracking-wider w-fit">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone">Módulos habilitados</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(currentUser.permissions).map(([key, perm]) => {
                  const hasView = Boolean((perm as any)?.view);
                  return (
                    <div key={key} className={`p-2.5 rounded-lg border flex items-center gap-2 ${hasView ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}>
                      <ShieldCheck className={`w-4 h-4 ${hasView ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className="font-bold capitalize">{key}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-full py-2.5 bg-brown hover:bg-terra text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER WITH LOGO */}
      <footer className="bg-white border-t border-sand py-4 px-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone print:hidden">
        <BardaLogo size="sm" />
        <div className="text-[11px] text-stone">
          Sistema de Gestión Interna • Presupuestos, Ventas y Remitos
        </div>
      </footer>

    </div>
  );
}

// METRICS HELPERS
const metricsHelpers = {
  currentMonthCount: (sales: any[]) => {
    const thisMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    return sales.filter(s => s.date?.substring(0, 7) === thisMonthStr).length;
  },
  currentMonthAmount: (sales: any[]) => {
    const thisMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    return sales
      .filter(s => s.date?.substring(0, 7) === thisMonthStr)
      .reduce((acc, s) => acc + s.total, 0);
  }
};
