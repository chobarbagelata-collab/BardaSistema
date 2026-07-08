import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Trash2, Printer, Check, RefreshCw, FileText, 
  DollarSign, TrendingUp, ShoppingBag, Users, Calendar, 
  ChevronDown, ChevronUp, Sliders, Edit, Tag, Eye, EyeOff, 
  CheckCircle, Clock, Package, AlertCircle, Pencil, Wrench, Layers,
  Download
} from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import UserManagement from './components/UserManagement';
import { User, UserPermissions } from './types';
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
  microBrillos: ["Mate", "Satinado", "Brillante"]
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
          console.error("Error fetching user on auth change:", err);
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('barda_current_user');
      }
    });
    return () => unsubscribe();
  }, []);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'presupuestos' | 'ventas' | 'remitos' | 'fabricacion' | 'resumen' | 'finanzas' | 'usuarios'>('presupuestos');
  const [addTab, setAddTab] = useState<'silla' | 'mesa' | 'circular' | 'ratona' | 'otro'>('silla');

  // Financial States
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [paymentsLedger, setPaymentsLedger] = useState<any[]>([]);
  const [newFixedCost, setNewFixedCost] = useState({ category: 'Alquiler', description: '', amount: '', month: new Date().toISOString().substring(0, 7) });
  const [finanzasMonth, setFinanzasMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [finanzasYear, setFinanzasYear] = useState<string>(String(new Date().getFullYear()));
  const [paymentRegisterForm, setPaymentRegisterForm] = useState<{orderId: number | null, amount: string, account: string, date: string, note: string}>({
    orderId: null,
    amount: '',
    account: 'Efectivo',
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
  const [fabList, setFabList] = useState<any[]>([]);
  const [fabSubTab, setFabSubTab] = useState<'lista' | 'diseñador'>('lista');
  const [fabStatusFilter, setFabStatusFilter] = useState<string>('Todos');
  const [fabSearch, setFabSearch] = useState('');

  // Remitos states
  const [remitoCliente, setRemitoCliente] = useState({ nombre: '', telefono: '', cuit: '', direccion: '', cp: '', ciudad: '', provincia: '' });
  const [remitoNumero, setRemitoNumero] = useState('');
  const [remitoFecha, setRemitoFecha] = useState(new Date().toISOString().split('T')[0]);
  const [remitoBultos, setRemitoBultos] = useState('');
  const [remitoDeliveryDate, setRemitoDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [remitoItems, setRemitoItems] = useState<any[]>([]);
  const [remitoAddTab, setRemitoAddTab] = useState<'silla' | 'mesa' | 'circular' | 'ratona' | 'otro'>('silla');

  // Remito Builder forms
  const [remitoSillaForm, setRemitoSillaForm] = useState({ model: '', wood: '', fabric: '', color: '' });
  const [remitoMesaForm, setMesaFormRemito] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
  const [remitoCircularForm, setCircularFormRemito] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
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
  const [mesaForm, setMesaForm] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
  const [circularForm, setCircularForm] = useState({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
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
  const [orderForm, setOrderForm] = useState({
    senaPercent: 50,
    senaCustom: 0,
    isSenaCustom: false,
    status: 'Pendiente',
    paymentStatus: 'Señado',
    notes: ''
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
    if (localQuotes) setQuotesLog(JSON.parse(localQuotes));

    const localFunnel = localStorage.getItem('barda_funnel_overrides');
    if (localFunnel) {
      try {
        setFunnelOverrides(JSON.parse(localFunnel));
      } catch (e) {
        console.warn('Failed to parse funnel overrides', e);
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
    if (isMicro) detail += ` · Color: ${f.color} · Vet: ${f.veteado} · Brillo: ${f.brillo}`;

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
      setMesaFormRemito({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
    } else {
      setCircularFormRemito({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
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
    const baseTypes: string[] = [], microColores: string[] = [], microVeteados: string[] = [], microBrillos: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const c = rows[i].map((v: any) => String(v == null ? '' : v).trim());
      if (c[4] && !/^Tipo/i.test(c[4])) baseTypes.push(c[4]);
      if (c[6] && !/^Colores/i.test(c[6])) microColores.push(c[6]);
      if (c[8] && !/^Veteados/i.test(c[8])) microVeteados.push(c[8]);
      if (c[10] && !/^Brillos/i.test(c[10])) microBrillos.push(c[10]);
    }
    return { baseTypes, microColores, microVeteados, microBrillos };
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
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
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
    if (isMicro) detail += ` · Color: ${f.color} · Vet: ${f.veteado} · Brillo: ${f.brillo}`;

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
      setMesaForm({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
    } else {
      setCircularForm({ wood: '', w: '', h: '', base: '', color: '', veteado: '', brillo: '' });
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
    alert('¡Presupuesto Guardado con éxito!');
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
      notes: ''
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
      notes: orderForm.notes
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
      totalCost: totalCostValue
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
    if (!confirm('¿Está seguro de que desea eliminar esta orden de pedido?')) return;
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    localStorage.setItem('barda_sales_orders', JSON.stringify(updated));
  };

  const deleteFixedCost = (id: number) => {
    if (!confirm('¿Desea eliminar este costo fijo?')) return;
    const updated = fixedCosts.filter(c => c.id !== id);
    setFixedCosts(updated);
    localStorage.setItem('barda_fixed_costs', JSON.stringify(updated));
  };

  const addFixedCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFixedCost.description.trim() || !newFixedCost.amount) {
      alert('Por favor complete la descripción y el monto.');
      return;
    }
    const cost = {
      id: Date.now(),
      category: newFixedCost.category,
      description: newFixedCost.description,
      amount: parseFloat(newFixedCost.amount),
      month: newFixedCost.month
    };
    const updated = [...fixedCosts, cost];
    setFixedCosts(updated);
    localStorage.setItem('barda_fixed_costs', JSON.stringify(updated));
    setNewFixedCost({ ...newFixedCost, description: '', amount: '' });
  };

  const recordBalancePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentRegisterForm.orderId === null) return;
    const order = sales.find(s => s.id === paymentRegisterForm.orderId);
    if (!order) return;
    const payAmount = parseFloat(paymentRegisterForm.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    // Add payment receipt to paymentsLedger
    const newPay = {
      id: `balance-${order.id}-${Date.now()}`,
      orderId: order.id,
      orderNum: order.orderNum,
      clientName: order.client?.nombre || 'Consumidor Final',
      date: paymentRegisterForm.date,
      amount: payAmount,
      type: 'Saldo',
      account: paymentRegisterForm.account,
      paymentMethod: order.paymentMethod,
      note: paymentRegisterForm.note
    };

    const updatedLedger = [...paymentsLedger, newPay];
    setPaymentsLedger(updatedLedger);
    localStorage.setItem('barda_payments_ledger', JSON.stringify(updatedLedger));

    // Update sale order
    const updatedSales = sales.map(s => {
      if (s.id === order.id) {
        const newSena = (s.senaAmount || 0) + payAmount;
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
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    alert('¡Cobro registrado con éxito en el libro de caja!');
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
    const months: { [key: string]: number } = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    const parts = dateStr.toLowerCase().split(' ');
    // Expected formats: "26 de julio de 2026" or "YYYY-MM-DD"
    if (parts.length >= 5) { // "dd de month de yyyy"
      const day = parseInt(parts[0]);
      const monthName = parts[2];
      const year = parseInt(parts[4]);
      const month = months[monthName] ?? 0;
      if (!isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return new Date(parsed);
    return new Date();
  };

  const getWeekRangeString = (date: Date): { label: string, weekId: string, sortKey: number } => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const fmtDateStr = (dt: Date) => {
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}`;
    };

    const getWeekNumber = (dt: Date) => {
      const oneJan = new Date(dt.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((dt.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      return Math.ceil((dt.getDay() + 1 + numberOfDays) / 7);
    };

    const weekNum = getWeekNumber(monday);
    const label = `Semana ${weekNum} (del ${fmtDateStr(monday)} al ${fmtDateStr(sunday)})`;
    const weekId = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    
    // Year-week sort key, e.g. 202625
    const sortKey = monday.getFullYear() * 100 + weekNum;

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
      totalCost: totalCost
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
      <header className="bg-white border-b-2 border-sand px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          {/* Minimalism Logo */}
          <div className="flex items-center gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-brown">Barda</span>
            <span className="font-sans text-xs tracking-widest text-terra font-semibold uppercase">Home</span>
          </div>
          <div className="w-[1.5px] h-8 bg-sand hidden sm:block"></div>
          <div className="text-stone text-xs font-medium tracking-wide flex items-center gap-1.5">
            {connStatus === 'connected' && <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full" title="Sincronizado con Planilla de Google Sheets"></span>}
            {connStatus === 'cached' && <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full" title="Catálogo cargado desde caché local offline"></span>}
            {connStatus === 'fallback' && <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full" title="Sheets inaccesible. Usando catálogo integrado de emergencia"></span>}
            <span className="uppercase text-[10px] tracking-wider font-semibold">
              {connStatus === 'connected' ? 'Google Sheets' : connStatus === 'cached' ? 'Caché Offline' : 'Catálogo Local'}
            </span>
          </div>
          <div className="w-[1.5px] h-8 bg-sand hidden md:block"></div>
          <div className="text-stone text-xs font-medium tracking-wide flex items-center gap-2">
            <span className="font-bold text-brown">{currentUser.name}</span>
            <span className="text-[9px] bg-terra/10 text-terra px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{currentUser.role}</span>
            <button
              onClick={() => {
                signOut(auth).then(() => {
                  localStorage.removeItem('barda_current_user');
                  setCurrentUser(null);
                });
              }}
              className="text-[10px] text-stone hover:text-rose-600 underline ml-1 cursor-pointer font-bold"
            >
              (Cerrar Sesión)
            </button>
          </div>
        </div>

        {/* Global tab navigation */}
        <div className="flex flex-wrap sm:flex-nowrap bg-light-cream border border-sand rounded-lg p-1 gap-0.5 sm:gap-1">
          {currentUser.permissions.presupuestos.view && (
            <button 
              onClick={() => setActiveTab('presupuestos')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'presupuestos' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Presupuestos
            </button>
          )}
          {currentUser.permissions.ventas.view && (
            <button 
              onClick={() => setActiveTab('ventas')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'ventas' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Ventas
            </button>
          )}
          {currentUser.permissions.remitos.view && (
            <button 
              onClick={() => setActiveTab('remitos')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'remitos' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Remitos
            </button>
          )}
          {currentUser.permissions.fabricacion.view && (
            <button 
              onClick={() => setActiveTab('fabricacion')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'fabricacion' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Fabricación
            </button>
          )}
          {currentUser.permissions.finanzas.view && (
            <button 
              onClick={() => setActiveTab('finanzas')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'finanzas' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Finanzas
            </button>
          )}
          {currentUser.permissions.resumen.view && (
            <button 
              onClick={() => setActiveTab('resumen')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'resumen' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Resumen
            </button>
          )}
          {currentUser.permissions.usuarios.view && (
            <button 
              onClick={() => setActiveTab('usuarios')}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide sm:tracking-wider uppercase transition-all duration-150 ${activeTab === 'usuarios' ? 'bg-brown text-cream shadow-sm' : 'text-stone hover:bg-cream/40'}`}
            >
              Usuarios
            </button>
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
                          <input type="number" id="s-qty" min="1" defaultValue="1" className="text-center w-full" />
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
                          onChange={e => setMesaForm({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '' })}
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
                        >
                          <option value="">Seleccionar base...</option>
                          {catalog.mesaOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Microcemento specific fields */}
                    {mesaForm.wood === 'Microcemento' && (
                      <div className="bg-cream/20 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                        <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                            <select value={mesaForm.color} onChange={e => setMesaForm({ ...mesaForm, color: e.target.value })}>
                              <option value="">Seleccionar color...</option>
                              {catalog.mesaOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                            <select value={mesaForm.veteado} onChange={e => setMesaForm({ ...mesaForm, veteado: e.target.value })}>
                              <option value="">Seleccionar veteado...</option>
                              {catalog.mesaOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                            <select value={mesaForm.brillo} onChange={e => setMesaForm({ ...mesaForm, brillo: e.target.value })}>
                              <option value="">Seleccionar brillo...</option>
                              {catalog.mesaOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={mesaForm.w} onChange={e => setMesaForm({ ...mesaForm, w: e.target.value })} className="w-24 text-center" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={mesaForm.h} onChange={e => setMesaForm({ ...mesaForm, h: e.target.value })} className="w-24 text-center" />
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
                          <input type="number" id="m-qty" min="1" defaultValue="1" className="text-center w-full" />
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
                              onChange={e => setCircularForm({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '' })}
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
                            >
                              <option value="">Seleccionar base...</option>
                              {catalog.circularOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Circular Microcemento specific fields */}
                        {circularForm.wood === 'Microcemento' && (
                          <div className="bg-cream/20 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                            <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                                <select value={circularForm.color} onChange={e => setCircularForm({ ...circularForm, color: e.target.value })}>
                                  <option value="">Seleccionar color...</option>
                                  {catalog.circularOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                                <select value={circularForm.veteado} onChange={e => setCircularForm({ ...circularForm, veteado: e.target.value })}>
                                  <option value="">Seleccionar veteado...</option>
                                  {catalog.circularOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                                <select value={circularForm.brillo} onChange={e => setCircularForm({ ...circularForm, brillo: e.target.value })}>
                                  <option value="">Seleccionar brillo...</option>
                                  {catalog.circularOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Diámetro x Diámetro)</label>
                            <div className="flex items-center gap-2">
                              <input type="text" placeholder="Ancho" value={circularForm.w} onChange={e => setCircularForm({ ...circularForm, w: e.target.value })} className="w-24 text-center" />
                              <span className="text-stone">×</span>
                              <input type="text" placeholder="Largo" value={circularForm.h} onChange={e => setCircularForm({ ...circularForm, h: e.target.value })} className="w-24 text-center" />
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
                              <input type="number" id="c-qty" min="1" defaultValue="1" className="text-center w-full" />
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
                        >
                          <option value="">Seleccionar madera...</option>
                          {catalog.ratonas.map(t => <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={ratonaForm.w} onChange={e => setRatonaForm({ ...ratonaForm, w: e.target.value })} className="w-24 text-center" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={ratonaForm.h} onChange={e => setRatonaForm({ ...ratonaForm, h: e.target.value })} className="w-24 text-center" />
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
                          <input type="number" id="r-qty" min="1" defaultValue="1" className="text-center w-full" />
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
                        <input type="text" placeholder="Ej. Reposera premium" value={otroForm.nombre} onChange={e => setOtroForm({ ...otroForm, nombre: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Detalle</label>
                        <input type="text" placeholder="Ej. Madera de petiribí, tela impermeable" value={otroForm.detalle} onChange={e => setOtroForm({ ...otroForm, detalle: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-sand">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Precio Unitario ($)</label>
                        <input type="text" placeholder="Ej. 150000" value={otroForm.precio} onChange={e => setOtroForm({ ...otroForm, precio: e.target.value })} className="w-44" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <label className="text-[10px] tracking-wider uppercase text-stone font-bold mb-1 block">Cantidad</label>
                          <input type="number" id="o-qty" min="1" defaultValue="1" className="text-center w-full" />
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
                <div className="flex justify-between items-start border-b border-sand pb-4">
                  <div>
                    <h1 className="font-serif text-3xl font-bold tracking-tight text-brown">Barda</h1>
                    <p className="font-sans text-[10px] tracking-widest text-terra font-bold uppercase">Presupuesto</p>
                  </div>
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
                  <h3 className="font-serif text-lg font-bold text-brown mb-4 border-b border-sand pb-2">Fecha de Entrega</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Fecha del Presupuesto</label>
                      <input 
                        type="date" 
                        value={budgetDate} 
                        onChange={e => setBudgetDate(e.target.value)}
                        className="w-full text-xs py-2 px-3 border border-sand rounded-lg bg-white focus:outline-none focus:border-terra font-sans"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Días de Plazo</label>
                      <input 
                        type="number" 
                        placeholder="ej. 30" 
                        value={deliveryDays || ''} 
                        onChange={e => setDeliveryDays(parseInt(e.target.value) || 0)}
                        className="w-full text-xs py-2 px-3 border border-sand rounded-lg bg-white focus:outline-none focus:border-terra font-sans"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Fecha Estimada de Entrega</label>
                      <div className="w-full text-xs py-2 px-3 border border-sand rounded-lg bg-cream/30 font-sans text-brown font-bold flex items-center min-h-[38px]">
                        {calcDeliveryDate()}
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
                        setActiveTab('remitos');
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
        )}

        {/* ======================================================== */}
        {/* SALES ORDERS BOARD SCREEN                                 */}
        {/* ======================================================== */}
        {activeTab === 'ventas' && (
          <div className="flex flex-col gap-6">
            {!canEditVentas && (
              <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para cambiar estados de pedidos, registrar pagos o eliminar ventas.</span>
              </div>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-sand p-4 rounded-xl shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente o nro de pedido..." 
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  className="pl-9 w-full font-sans"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-[9px] uppercase font-bold text-stone">Estado Entrega</label>
                  <select value={salesStatusFilter} onChange={e => setSalesStatusFilter(e.target.value)} className="py-1.5 text-xs">
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Producción">En Producción</option>
                    <option value="Listo para Entrega">Listo para Entrega</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-[9px] uppercase font-bold text-stone">Estado Pago</label>
                  <select value={salesPayFilter} onChange={e => setSalesPayFilter(e.target.value)} className="py-1.5 text-xs">
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Señado">Señado</option>
                    <option value="Pagado">Pagado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[110px]">
                  <label className="text-[9px] uppercase font-bold text-stone">Mes</label>
                  <select value={salesMonthFilter} onChange={e => setSalesMonthFilter(e.target.value)} className="py-1.5 text-xs">
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
                <div className="flex flex-col gap-1 min-w-[90px]">
                  <label className="text-[9px] uppercase font-bold text-stone">Año</label>
                  <select value={salesYearFilter} onChange={e => setSalesYearFilter(e.target.value)} className="py-1.5 text-xs">
                    <option value="Todos">Todos</option>
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="bg-white border border-sand rounded-xl p-12 text-center text-stone italic font-serif">
                No se encontraron órdenes de pedido guardadas.
              </div>
            ) : (
              <div className="bg-white border border-sand rounded-xl shadow-sm overflow-hidden">
                {/* Desktop/Tablet Table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-light-cream/50 border-b border-sand text-[10px] uppercase tracking-wider font-bold text-stone">
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
                    <tbody>
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
                                <div className="font-serif text-xs font-bold text-brown">{order.client?.nombre || 'Consumidor Final'}</div>
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
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    order.status === 'Entregado' ? 'bg-emerald-100 text-emerald-800' :
                                    order.status === 'Listo para Entrega' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'En Producción' ? 'bg-amber-100 text-amber-800' :
                                    'bg-stone/10 text-stone'
                                  }`}>
                                    {order.status}
                                  </span>
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    order.paymentStatus === 'Pagado' ? 'bg-emerald-100 text-emerald-800' :
                                    order.paymentStatus === 'Señado' ? 'bg-amber-100 text-amber-800' :
                                    'bg-stone/10 text-stone'
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
                                    </div>

                                    {/* Column 3: Actions & Status Selects */}
                                    <div className="w-full md:w-64 flex flex-col gap-4">
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
                                            setActiveTab('remitos');
                                          }}
                                          className="py-2 border border-stone/40 hover:bg-stone/5 text-stone rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                                        >
                                          <FileText className="w-3.5 h-3.5" /> Remito
                                        </button>

                                        <button
                                          onClick={() => {
                                            const exists = fabList.some(f => f.orderNum === order.orderNum);
                                            if (!exists) {
                                              const newFabOrder = {
                                                id: Date.now(),
                                                orderNum: order.orderNum,
                                                date: new Date().toISOString().split('T')[0],
                                                client: { ...order.client },
                                                deliveryDate: order.deliveryDate,
                                                notes: order.notes || '',
                                                items: order.items.map((it: any) => ({
                                                  id: Date.now() + Math.random(),
                                                  name: it.name,
                                                  detail: it.detail || '',
                                                  cost: it.cost || 0,
                                                  qty: it.qty,
                                                  category: it.category
                                                })),
                                                status: 'Pendiente',
                                                totalCost: order.items.reduce((acc: number, it: any) => acc + ((it.cost || 0) * it.qty), 0)
                                              };
                                              const updatedFabList = [newFabOrder, ...fabList];
                                              setFabList(updatedFabList);
                                              localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFabList));
                                            }

                                            setFabCliente({
                                              nombre: order.client.nombre || '',
                                              telefono: order.client.telefono || '',
                                              cuit: order.client.cuit || '',
                                              direccion: order.client.direccion || '',
                                              cp: order.client.cp || '',
                                              ciudad: order.client.ciudad || '',
                                              provincia: order.client.provincia || ''
                                            });
                                            setFabNumero(order.orderNum || '');
                                            setFabFecha(new Date().toISOString().split('T')[0]);
                                            setFabDeliveryDate(order.deliveryDate || new Date().toISOString().split('T')[0]);
                                            setFabNotes(order.notes || '');
                                            setFabItems(order.items.map((it: any) => ({
                                              id: Date.now() + Math.random(),
                                              name: it.name,
                                              detail: it.detail || '',
                                              cost: it.cost || 0,
                                              qty: it.qty,
                                              category: it.category
                                            })));
                                            setFabSubTab('diseñador');
                                            setActiveTab('fabricacion');
                                          }}
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
                            <span className="text-[10px] font-mono text-terra font-bold">{order.orderNum}</span>
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
                                  setActiveTab('remitos');
                                }}
                                className="py-2 border border-stone/40 hover:bg-stone/5 text-stone rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-150"
                              >
                                <FileText className="w-3.5 h-3.5" /> Remito
                              </button>

                              <button
                                onClick={() => {
                                  const exists = fabList.some(f => f.orderNum === order.orderNum);
                                  if (!exists) {
                                    const newFabOrder = {
                                      id: Date.now(),
                                      orderNum: order.orderNum,
                                      date: new Date().toISOString().split('T')[0],
                                      client: { ...order.client },
                                      deliveryDate: order.deliveryDate,
                                      notes: order.notes || '',
                                      items: order.items.map((it: any) => ({
                                        id: Date.now() + Math.random(),
                                        name: it.name,
                                        detail: it.detail || '',
                                        cost: it.cost || 0,
                                        qty: it.qty,
                                        category: it.category
                                      })),
                                      status: 'Pendiente',
                                      totalCost: order.items.reduce((acc: number, it: any) => acc + ((it.cost || 0) * it.qty), 0)
                                    };
                                    const updatedFabList = [newFabOrder, ...fabList];
                                    setFabList(updatedFabList);
                                    localStorage.setItem('barda_fabricacion_list', JSON.stringify(updatedFabList));
                                  }

                                  setFabCliente({
                                    nombre: order.client.nombre || '',
                                    telefono: order.client.telefono || '',
                                    cuit: order.client.cuit || '',
                                    direccion: order.client.direccion || '',
                                    cp: order.client.cp || '',
                                    ciudad: order.client.ciudad || '',
                                    provincia: order.client.provincia || ''
                                  });
                                  setFabNumero(order.orderNum || '');
                                  setFabFecha(new Date().toISOString().split('T')[0]);
                                  setFabDeliveryDate(order.deliveryDate || new Date().toISOString().split('T')[0]);
                                  setFabNotes(order.notes || '');
                                  setFabItems(order.items.map((it: any) => ({
                                    id: Date.now() + Math.random(),
                                    name: it.name,
                                    detail: it.detail || '',
                                    cost: it.cost || 0,
                                    qty: it.qty,
                                    category: it.category
                                  })));
                                  setFabSubTab('diseñador');
                                  setActiveTab('fabricacion');
                                }}
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
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* REMITOS (DELIVERY NOTES) SCREEN                          */}
        {/* ======================================================== */}
        {activeTab === 'remitos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* BUILD PANEL (LEFT SIDE) - HIDE ON PRINT */}
            <div className={`lg:col-span-7 flex flex-col gap-6 print:hidden ${!canEditRemitos ? 'pointer-events-none opacity-85 select-none' : ''}`}>
              
              {!canEditRemitos && (
                <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                  <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                  <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para redactar remitos, agregar productos o modificar datos del cliente de entrega.</span>
                </div>
              )}
              
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
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
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
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra disabled:opacity-40 font-sans"
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
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra disabled:opacity-40 font-sans"
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
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
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
                          onChange={e => setMesaFormRemito({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '' })}
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra font-sans"
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
                          className="text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none focus:border-terra disabled:opacity-40 font-sans"
                        >
                          <option value="">Seleccionar base...</option>
                          {catalog.mesaOptions.baseTypes.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Microcemento specific fields */}
                    {remitoMesaForm.wood === 'Microcemento' && (
                      <div className="bg-cream/20 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                        <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                            <select 
                              value={remitoMesaForm.color} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, color: e.target.value })}
                              className="text-xs py-1.5 px-2.5 border border-sand rounded bg-white font-sans"
                            >
                              <option value="">Seleccionar color...</option>
                              {catalog.mesaOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                            <select 
                              value={remitoMesaForm.veteado} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, veteado: e.target.value })}
                              className="text-xs py-1.5 px-2.5 border border-sand rounded bg-white font-sans"
                            >
                              <option value="">Seleccionar veteado...</option>
                              {catalog.mesaOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                            <select 
                              value={remitoMesaForm.brillo} 
                              onChange={e => setMesaFormRemito({ ...remitoMesaForm, brillo: e.target.value })}
                              className="text-xs py-1.5 px-2.5 border border-sand rounded bg-white font-sans"
                            >
                              <option value="">Seleccionar brillo...</option>
                              {catalog.mesaOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Ancho" value={remitoMesaForm.w} onChange={e => setMesaFormRemito({ ...remitoMesaForm, w: e.target.value })} className="w-24 text-center text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none font-sans" />
                          <span className="text-stone">×</span>
                          <input type="text" placeholder="Largo" value={remitoMesaForm.h} onChange={e => setMesaFormRemito({ ...remitoMesaForm, h: e.target.value })} className="w-24 text-center text-xs py-2 px-3 border border-sand rounded-md bg-white focus:outline-none font-sans" />
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
                              onChange={e => setCircularFormRemito({ wood: e.target.value, w: '', h: '', base: '', color: '', veteado: '', brillo: '' })}
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
                          <div className="bg-cream/20 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                            <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Color</label>
                                <select 
                                  value={remitoCircularForm.color} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, color: e.target.value })}
                                  className="text-xs py-1.5 px-2.5 border border-sand rounded bg-white font-sans"
                                >
                                  <option value="">Seleccionar color...</option>
                                  {catalog.circularOptions.microColores.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Veteado</label>
                                <select 
                                  value={remitoCircularForm.veteado} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, veteado: e.target.value })}
                                  className="text-xs py-1.5 px-2.5 border border-sand rounded bg-white font-sans"
                                >
                                  <option value="">Seleccionar veteado...</option>
                                  {catalog.circularOptions.microVeteados.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-stone font-semibold">Brillo</label>
                                <select 
                                  value={remitoCircularForm.brillo} 
                                  onChange={e => setCircularFormRemito({ ...remitoCircularForm, brillo: e.target.value })}
                                  className="text-xs py-1.5 px-2.5 border border-sand rounded bg-white font-sans"
                                >
                                  <option value="">Seleccionar brillo...</option>
                                  {catalog.circularOptions.microBrillos.map(b => <option key={b} value={b}>{b}</option>)}
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
                <div className="flex justify-between items-start border-b-2 border-sand/60 pb-4">
                  <div>
                    <h1 className="font-serif text-3xl font-bold tracking-tight text-brown">Barda</h1>
                    <p className="font-sans text-[11px] tracking-widest text-terra font-bold uppercase">Remito de Entrega</p>
                  </div>
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

                {/* Cliente / Destinatario Box */}
                <div className="bg-light-cream/40 border border-sand/40 rounded-xl p-4 text-xs flex flex-col gap-2 font-sans">
                  <div className="text-[9px] font-bold text-stone uppercase tracking-widest border-b border-sand/20 pb-1">Destinatario / Lugar de Entrega</div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="col-span-2">
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
                      <div className="col-span-2 border-t border-sand/20 pt-1.5 mt-0.5">
                        <span className="text-stone font-semibold mr-1">Dirección:</span> 
                        <strong className="text-brown">{remitoCliente.direccion}</strong>
                        {remitoCliente.cp && <span className="text-stone ml-1"> (C.P. {remitoCliente.cp})</span>}
                        {(remitoCliente.ciudad || remitoCliente.provincia) && (
                          <span className="text-stone ml-1"> - {[remitoCliente.ciudad, remitoCliente.provincia].filter(Boolean).join(', ')}</span>
                        )}
                      </div>
                    )}
                    {!remitoCliente.direccion && (remitoCliente.cp || remitoCliente.ciudad || remitoCliente.provincia) && (
                      <div className="col-span-2 border-t border-sand/20 pt-1.5 mt-0.5">
                        <span className="text-stone font-semibold mr-1">Localidad:</span>
                        <strong className="text-brown">
                          {[remitoCliente.ciudad, remitoCliente.provincia].filter(Boolean).join(', ')}
                        </strong>
                        {remitoCliente.cp && <span className="text-stone ml-1"> (C.P. {remitoCliente.cp})</span>}
                      </div>
                    )}
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
                      <p className="font-semibold text-brown">Entregado por Barda Home</p>
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

        {/* ======================================================== */}
        {/* FABRICACION (MANUFACTURING ORDERS) SCREEN                */}
        {/* ======================================================== */}
        {activeTab === 'fabricacion' && (
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
                                      <span>Plazo: {ord.deliveryDate?.replace(' de 2026', '')}</span>
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
                                        setFabList(fabList.filter(item => item.id !== order.id));
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
                    <div className="flex justify-between items-start border-b border-sand pb-4">
                      <div>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-brown">Barda</h1>
                        <p className="font-sans text-[11px] tracking-widest text-terra font-bold uppercase">Orden de Fabricación</p>
                      </div>
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
            
            {/* FILTERS CONTROL BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-sand p-4 rounded-xl shadow-sm">
              <div>
                <h2 className="font-serif text-lg font-bold text-brown">Resumen de Indicadores</h2>
                <p className="text-[11px] text-stone">Filtrá el desglose de métricas, conversión y variantes por mes y año.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Year Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-stone">Año</label>
                  <select
                    value={resumenYear}
                    onChange={e => setResumenYear(e.target.value)}
                    className="text-xs bg-white border border-sand rounded-lg py-1.5 px-3 focus:outline-none focus:border-terra font-semibold text-brown min-w-[100px]"
                  >
                    <option value="todos">Todos</option>
                    {yearsList.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Month Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-stone">Mes</label>
                  <select
                    value={resumenMonth}
                    onChange={e => setResumenMonth(e.target.value)}
                    className="text-xs bg-white border border-sand rounded-lg py-1.5 px-3 focus:outline-none focus:border-terra font-semibold text-brown min-w-[130px]"
                  >
                    {MONTHS_LIST.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                {(resumenYear !== 'todos' || resumenMonth !== 'todos') && (
                  <button
                    onClick={() => {
                      setResumenYear('todos');
                      setResumenMonth('todos');
                    }}
                    className="self-end p-2 bg-cream/30 hover:bg-cream text-terra rounded-lg text-xs font-bold flex items-center gap-1 transition-all mt-4 md:mt-0"
                    title="Restablecer Filtros"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restablecer</span>
                  </button>
                )}
              </div>
            </div>

            {/* STAT CARDS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              
              {/* Presupuestos count */}
              <div className="bg-white border border-sand p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-cream/50 rounded-lg text-brown"><FileText className="w-6 h-6" /></div>
                <div>
                  <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Presupuestos</div>
                  <div className="text-2xl font-serif font-bold text-brown">{metrics.totalQuotes}</div>
                  <div className="text-[9px] text-stone mt-0.5">Guardados o Impresos</div>
                </div>
              </div>

              {/* Pedidos count */}
              <div className="bg-white border border-sand p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-terra/10 rounded-lg text-terra"><ShoppingBag className="w-6 h-6" /></div>
                <div>
                  <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Pedidos</div>
                  <div className="text-2xl font-serif font-bold text-brown">{dashboardFilteredSales.length}</div>
                  <div className="text-[11px] text-terra font-bold mt-0.5">Total: {fmt(metrics.totalVentaAcum)}</div>
                </div>
              </div>

              {/* Tasa de Conversión */}
              <div className="bg-white border border-sand p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-brown/5 rounded-lg text-brown"><RefreshCw className="w-6 h-6" /></div>
                <div>
                  <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Conversión</div>
                  <div className="text-2xl font-serif font-bold text-brown">
                    {metrics.conversionRate ? `${metrics.conversionRate.toFixed(1)}%` : '0.0%'}
                  </div>
                  <div className="text-[9px] text-stone mt-0.5">Pedidos / Presupuestos</div>
                </div>
              </div>

              {/* Por Cobrar */}
              <div className="bg-white border border-sand p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700"><DollarSign className="w-6 h-6" /></div>
                <div>
                  <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Por Cobrar</div>
                  <div className="text-2xl font-serif font-bold text-emerald-800">{fmt(metrics.remainingToCollect)}</div>
                  <div className="text-[9px] text-stone mt-0.5">Saldos pendientes</div>
                </div>
              </div>

              {/* Pendientes de Entrega */}
              <div className="bg-white border border-sand p-5 rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-lg text-amber-700"><Clock className="w-6 h-6" /></div>
                <div>
                  <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Pendientes Entrega</div>
                  <div className="text-2xl font-serif font-bold text-amber-800">{metrics.pendingDeliveryCount}</div>
                  <div className="text-[9px] text-stone mt-0.5">Pedidos sin entregar</div>
                </div>
              </div>

              {/* Ganancia Acumulada + Promedio por pedido */}
              <div className="card p-5 border-sand" style={{ background: 'var(--cream)', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <TrendingUp className="text-terra" size={24} />
                  <div>
                    <div className="text-[10px] text-stone font-bold uppercase tracking-wider">Ganancia Acumulada</div>
                    <div className="text-2xl font-serif font-bold text-emerald-800">{fmt(metrics.totalProfitAcum)}</div>
                    <div className="text-[10px] text-stone mt-0.5">
                      Prom. por pedido: <strong className="text-emerald-800">{fmt(Math.round(metrics.avgProfitPerOrder))}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EMBUDO DE VENTAS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PANEL DE REGISTRO Y CONVERSIÓN */}
              <div className={`lg:col-span-4 bg-white border border-sand rounded-xl p-6 shadow-sm flex flex-col justify-between ${!canEditResumen ? 'pointer-events-none opacity-80 select-none' : ''}`}>
                <div>
                  <h3 className="font-serif text-lg font-bold text-brown mb-2 border-b border-sand pb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-terra" />
                    Registro de Embudo
                  </h3>
                  <p className="text-[11px] text-stone mb-4">
                    Seleccioná el mes que querés registrar, ingresá los números de teléfonos y visitas coordinadas, y guardá los cambios.
                  </p>

                  {/* Period Selection Inside Panel */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-light-cream/30 border border-sand/40 rounded-xl mb-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold text-stone">Año a registrar</span>
                      <select
                        value={funnelRegYear}
                        onChange={e => setFunnelRegYear(e.target.value)}
                        className="text-xs bg-white border border-sand rounded-lg py-1 px-2 focus:outline-none focus:border-terra font-semibold text-brown cursor-pointer"
                      >
                        {yearsList.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold text-stone">Mes a registrar</span>
                      <select
                        value={funnelRegMonth}
                        onChange={e => setFunnelRegMonth(e.target.value)}
                        className="text-xs bg-white border border-sand rounded-lg py-1 px-2 focus:outline-none focus:border-terra font-semibold text-brown cursor-pointer"
                      >
                        {MONTHS_LIST.filter(m => m.value !== 'todos').map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CONTROLES */}
                  <div className="flex flex-col gap-4">
                    {/* Teléfonos Obtenidos */}
                    <div className="flex flex-col gap-1.5 p-3.5 bg-light-cream/40 border border-sand/50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-brown flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-terra"></span>
                          Teléfonos Obtenidos
                        </label>
                        {funnelOverrides[`${funnelRegYear}-${funnelRegMonth}`] && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">Guardado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFunnelRegPhones(prev => Math.max(0, prev - 1))}
                          className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold font-mono transition-all animate-none"
                        >-</button>
                        <input
                          type="number"
                          value={funnelRegPhones || ''}
                          onChange={e => setFunnelRegPhones(Math.max(0, parseInt(e.target.value) || 0))}
                          className="flex-1 text-center font-bold font-mono text-xs py-1 bg-white border border-sand rounded-lg focus:outline-none focus:ring-1 focus:ring-terra"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => setFunnelRegPhones(prev => prev + 1)}
                          className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold font-mono transition-all animate-none"
                        >+</button>
                      </div>
                    </div>

                    {/* Visitas Obtenidas */}
                    <div className="flex flex-col gap-1.5 p-3.5 bg-light-cream/40 border border-sand/50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-brown flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brown"></span>
                          Visitas Coordinadas
                        </label>
                        {funnelOverrides[`${funnelRegYear}-${funnelRegMonth}`] && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">Guardado</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFunnelRegVisits(prev => Math.max(0, prev - 1))}
                          className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold font-mono transition-all animate-none"
                        >-</button>
                        <input
                          type="number"
                          value={funnelRegVisits || ''}
                          onChange={e => setFunnelRegVisits(Math.max(0, parseInt(e.target.value) || 0))}
                          className="flex-1 text-center font-bold font-mono text-xs py-1 bg-white border border-sand rounded-lg focus:outline-none focus:ring-1 focus:ring-terra"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => setFunnelRegVisits(prev => prev + 1)}
                          className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold font-mono transition-all animate-none"
                        >+</button>
                      </div>
                    </div>

                    {/* Botón de Guardar */}
                    <button
                      type="button"
                      onClick={handleSaveFunnelRegistry}
                      className={`w-full py-2 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm ${
                        funnelSaveSuccess 
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                          : 'bg-terra hover:bg-brown text-white'
                      }`}
                    >
                      {funnelSaveSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-white animate-bounce" />
                          <span>¡Registro Guardado!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-white" />
                          <span>Guardar {MONTHS_LIST.find(m => m.value === funnelRegMonth)?.label} {funnelRegYear}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Historial de Registros */}
                  {savedFunnelEntries.length > 0 && (
                    <div className="mt-5 pt-3.5 border-t border-sand/40">
                      <span className="text-[10px] font-bold text-stone uppercase tracking-wider block mb-2">Registros Guardados</span>
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {savedFunnelEntries.map(entry => (
                          <div key={entry.key} className="flex justify-between items-center p-2 bg-light-cream/40 border border-sand/30 rounded-lg text-xs">
                            <div className="flex flex-col">
                              <span className="font-bold text-brown">{entry.monthLabel} {entry.year}</span>
                              <span className="text-[10px] text-stone font-mono">
                                {entry.phones} Tels · {entry.visits} Visitas
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFunnelRegMonth(entry.month);
                                  setFunnelRegYear(entry.year);
                                }}
                                className="p-1 text-stone hover:text-terra hover:bg-cream/50 rounded transition-all cursor-pointer"
                                title="Editar registro"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Estás seguro de eliminar el registro de ${entry.monthLabel} ${entry.year}?`)) {
                                    setFunnelOverrides(prev => {
                                      const next = { ...prev };
                                      delete next[entry.key];
                                      return next;
                                    });
                                  }
                                }}
                                className="p-1 text-stone hover:text-error hover:bg-cream/50 rounded transition-all cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* TASAS DE CONVERSIÓN REQUERIDAS */}
                <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-sand">
                  <div className="flex justify-between items-center p-3 bg-terra/5 border border-terra/20 rounded-xl">
                    <div>
                      <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">Conversión Pedidos / Teléfonos</span>
                      <span className="text-[9px] text-stone block">Pedidos / Teléfonos Obtenidos</span>
                    </div>
                    <strong className="text-xl font-serif font-bold text-terra">
                      {activeFunnelData.phones > 0 ? `${((dashboardFilteredSales.length / activeFunnelData.phones) * 100).toFixed(1)}%` : '0.0%'}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-brown/5 border border-brown/20 rounded-xl">
                    <div>
                      <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">Conversión Pedidos / Visitas</span>
                      <span className="text-[9px] text-stone block">Pedidos / Visitas Obtenidas</span>
                    </div>
                    <strong className="text-xl font-serif font-bold text-brown">
                      {activeFunnelData.visits > 0 ? `${((dashboardFilteredSales.length / activeFunnelData.visits) * 100).toFixed(1)}%` : '0.0%'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* EMBUDO VISUAL DE VENTAS (8 cols, Horizontal layout, Equal squares) */}
              <div className="lg:col-span-8 bg-white border border-sand rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-brown mb-2 border-b border-sand pb-2 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-terra" />
                    Embudo de Conversión Comercial
                  </h3>
                  <p className="text-[11px] text-stone mb-6">
                    Visualización horizontal del flujo comercial de Barda. Cuadrados de igual tamaño que representan cada etapa, con las métricas de conversión (CVR) indicadas por debajo entre cada paso.
                  </p>

                  <div className="flex flex-col gap-6">
                    {/* ROW OF 4 EQUAL SQUARES */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      
                      {/* SQUARE 1: PRESUPUESTOS */}
                      <div className="aspect-square bg-brown text-cream rounded-xl p-4 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold tracking-wider uppercase opacity-85">Paso 1</span>
                          <span className="text-[10px] font-bold font-mono bg-cream/10 px-1.5 py-0.5 rounded">1°</span>
                        </div>
                        <div className="my-auto text-center">
                          <span className="text-3xl sm:text-4xl font-serif font-bold block">{metrics.totalQuotes}</span>
                          <span className="text-xs font-semibold opacity-90 block mt-1">Presupuestos</span>
                        </div>
                        <div className="text-[9px] opacity-65 text-center uppercase tracking-wider">Guardados</div>
                      </div>

                      {/* SQUARE 2: TELÉFONOS OBTENIDOS */}
                      <div className="aspect-square bg-terra text-white rounded-xl p-4 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold tracking-wider uppercase opacity-85">Paso 2</span>
                          <span className="text-[10px] font-bold font-mono bg-white/10 px-1.5 py-0.5 rounded">2°</span>
                        </div>
                        <div className="my-auto text-center">
                          <span className="text-3xl sm:text-4xl font-serif font-bold block">{activeFunnelData.phones}</span>
                          <span className="text-xs font-semibold opacity-90 block mt-1">Teléfonos</span>
                        </div>
                        <div className="text-[9px] opacity-65 text-center uppercase tracking-wider">Obtenidos</div>
                      </div>

                      {/* SQUARE 3: VISITAS OBTENIDAS */}
                      <div className="aspect-square bg-light-cream border border-sand text-brown rounded-xl p-4 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-stone">Paso 3</span>
                          <span className="text-[10px] font-bold font-mono bg-sand/30 px-1.5 py-0.5 rounded">3°</span>
                        </div>
                        <div className="my-auto text-center">
                          <span className="text-3xl sm:text-4xl font-serif font-bold block text-brown">{activeFunnelData.visits}</span>
                          <span className="text-xs font-semibold text-brown/95 block mt-1">Visitas</span>
                        </div>
                        <div className="text-[9px] text-stone text-center uppercase tracking-wider">Showroom</div>
                      </div>

                      {/* SQUARE 4: PEDIDOS CONFIRMADOS */}
                      <div className="aspect-square bg-emerald-800 text-white rounded-xl p-4 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold tracking-wider uppercase opacity-85">Resultado</span>
                          <span className="text-[10px] font-bold font-mono bg-white/10 px-1.5 py-0.5 rounded">✓</span>
                        </div>
                        <div className="my-auto text-center">
                          <span className="text-3xl sm:text-4xl font-serif font-bold block">{dashboardFilteredSales.length}</span>
                          <span className="text-xs font-semibold opacity-90 block mt-1">Pedidos</span>
                        </div>
                        <div className="text-[9px] opacity-65 text-center uppercase tracking-wider">Confirmados</div>
                      </div>

                    </div>

                    {/* METRICAS DE CONVERSIÓN (CVR) ENTRE CUADRADOS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-sand/40">
                      
                      {/* CVR 1 -> 2 */}
                      <div className="flex flex-col items-center p-3 bg-terra/5 border border-terra/10 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-stone uppercase tracking-wider block mb-1">
                          Tasa de Contacto (1 → 2)
                        </span>
                        <strong className="text-lg font-serif text-terra font-bold">
                          {metrics.totalQuotes > 0 ? `${((activeFunnelData.phones / metrics.totalQuotes) * 100).toFixed(1)}%` : '0.0%'}
                        </strong>
                        <span className="text-[9px] text-stone mt-0.5">Presupuestos con teléfono</span>
                      </div>

                      {/* CVR 2 -> 3 */}
                      <div className="flex flex-col items-center p-3 bg-brown/5 border border-brown/10 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-stone uppercase tracking-wider block mb-1">
                          Agendamiento Showroom (2 → 3)
                        </span>
                        <strong className="text-lg font-serif text-brown font-bold">
                          {activeFunnelData.phones > 0 ? `${((activeFunnelData.visits / activeFunnelData.phones) * 100).toFixed(1)}%` : '0.0%'}
                        </strong>
                        <span className="text-[9px] text-stone mt-0.5">Teléfonos que coordinaron visita</span>
                      </div>

                      {/* CVR 3 -> 4 */}
                      <div className="flex flex-col items-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                          Cierre de Venta (3 → 4)
                        </span>
                        <strong className="text-lg font-serif text-emerald-700 font-bold">
                          {activeFunnelData.visits > 0 ? `${((dashboardFilteredSales.length / activeFunnelData.visits) * 100).toFixed(1)}%` : '0.0%'}
                        </strong>
                        <span className="text-[9px] text-emerald-600 mt-0.5">Visitas que confirmaron compra</span>
                      </div>

                    </div>

                  </div>
                </div>
              </div>

            </div>

            {/* CHARTS & LEADERBOARDS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Product category sales (Custom SVG progress graphs) */}
              <div className="bg-white border border-sand rounded-xl p-6 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-brown mb-4 border-b border-sand pb-2">Ventas por Categoría de Producto</h3>
                <div className="flex flex-col gap-4">
                  {Object.entries(metrics.categoryTotals).map(([cat, total]) => {
                    const totalSales = metrics.totalVentaAcum || 1;
                    const percent = Math.round((total / totalSales) * 100);
                    return (
                      <div key={cat} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-brown">{cat}</span>
                          <span className="text-stone">{fmt(total)} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-light-cream rounded-full h-2.5 overflow-hidden border border-sand/40">
                          <div 
                            className="bg-terra h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best Selling Subproducts / Variants */}
              <div className="bg-white border border-sand rounded-xl p-6 shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand pb-3 mb-4">
                  <h3 className="font-serif text-lg font-bold text-brown">Variantes más Vendidas</h3>
                  {/* Category select inside the variant card */}
                  <select
                    value={subproductCategory}
                    onChange={e => setSubproductCategory(e.target.value)}
                    className="text-xs bg-cream/40 border border-sand rounded-lg py-1 px-2.5 focus:outline-none focus:border-terra font-bold text-brown cursor-pointer"
                  >
                    <option value="Sillas">Sillas</option>
                    <option value="Mesas">Mesas</option>
                    <option value="Mesas Circulares">Mesas Circulares</option>
                    <option value="Ratonas">Ratonas</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                {(() => {
                  const topSubs = getTopSubproducts(subproductCategory);
                  if (topSubs.length === 0) {
                    return (
                      <div className="text-center py-12 text-stone italic font-serif text-sm flex-1 flex items-center justify-center">
                        No hay ventas registradas para {subproductCategory} en el período seleccionado.
                      </div>
                    );
                  }
                  
                  // Find the maximum sold quantity for relative percentage bars
                  const maxQty = Math.max(...topSubs.map(s => s.qty), 1);

                  return (
                    <div className="flex flex-col gap-3">
                      {topSubs.map((sub, idx) => {
                        const percent = Math.round((sub.qty / maxQty) * 100);
                        return (
                          <div key={idx} className="flex flex-col gap-1 bg-light-cream/30 border border-sand/20 rounded-lg p-2.5 hover:bg-light-cream/60 transition-all">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="text-xs font-bold text-brown flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-brown/10 text-[10px] text-brown font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  {sub.name}
                                </div>
                                <div className="text-[10px] text-stone ml-6 font-medium">{sub.details}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-terra">{sub.qty} {sub.qty === 1 ? 'u.' : 'u.'}</div>
                                <div className="text-[10px] text-stone mt-0.5">{fmt(sub.revenue)}</div>
                              </div>
                            </div>
                            
                            {/* Mini visual indicator for relative volume */}
                            <div className="w-full bg-sand/30 rounded-full h-1 mt-1 overflow-hidden ml-6 max-w-[calc(100%-24px)]">
                              <div 
                                className="bg-terra/70 h-full rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

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

            // Payments in this month & year
            const paymentsInMonth = paymentsLedger.filter(p => p.date && p.date.substring(0, 4) === evolutionYear && p.date.substring(5, 7) === mNum);
            const totalCobrosM = paymentsInMonth.reduce((acc, p) => acc + p.amount, 0);

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
              costoVar: totalCostoVarM,
              costoFijo: totalFijoM,
              utilidad: utilidadDevengadaM,
              flujo: flujoCajaM
            };
          });

          const maxVal = Math.max(...monthlyData.map(d => Math.max(d.ventas, d.cobros)), 1);

          return (
            <div className="flex flex-col gap-6">
              
              {!canEditFinanzas && (
                <div className="p-4 bg-amber-50/50 border border-terra/20 text-brown rounded-xl flex items-center gap-2.5 text-xs font-medium shadow-sm">
                  <AlertCircle className="w-5 h-5 text-terra shrink-0" />
                  <span><strong>Modo de Solo Lectura:</strong> No tienes permisos de edición para registrar costos fijos, cobrar saldos, asentar transacciones o modificar el libro contable de la empresa.</span>
                </div>
              )}
              
              {/* FINANCE BANNER */}
              <div className="bg-white border-2 border-sand p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-6 -mr-6 opacity-5 pointer-events-none">
                  <TrendingUp className="w-48 h-48 text-brown" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-terra mb-1 font-bold text-xs uppercase tracking-widest">
                    <span>★ Dirección Financiera</span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-brown">Control Financiero & Rendimiento</h2>
                  <p className="text-xs text-stone max-w-xl mt-1">
                    Análisis detallado del flujo monetario de Barda. Distinguí entre ventas pactadas y cobranzas reales, gestioná tus costos fijos y proyectá la facturación futura.
                  </p>
                </div>

                {/* Date Selectors specifically for Finance Dashboard */}
                <div className="flex items-center gap-3 bg-light-cream/55 border border-sand/60 p-3 rounded-xl relative z-10">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-stone">Año</label>
                    <select
                      value={finanzasYear}
                      onChange={e => setFinanzasYear(e.target.value)}
                      className="text-xs bg-white border border-sand rounded-lg py-1 px-2.5 focus:outline-none focus:border-terra font-semibold text-brown min-w-[80px]"
                    >
                      <option value="todos">Todos</option>
                      {yearsList.map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase font-bold text-stone">Mes</label>
                    <select
                      value={finanzasMonth}
                      onChange={e => setFinanzasMonth(e.target.value)}
                      className="text-xs bg-white border border-sand rounded-lg py-1 px-2.5 focus:outline-none focus:border-terra font-semibold text-brown min-w-[110px]"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* MONTHLY EVOLUTION SECTION */}
              <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-sand pb-3 mb-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-terra" />
                      Evolución Mensual del Año {evolutionYear}
                    </h3>
                    <p className="text-[11px] text-stone">Comparativa histórica de Ventas Pactadas (Devengado) vs. Cobros Reales (Caja Percibida) para detectar tendencias.</p>
                  </div>
                  {finanzasYear === 'todos' && (
                    <span className="text-[10px] text-terra bg-terra/5 px-2.5 py-1 rounded-full font-bold">
                      Mostrando año actual por defecto
                    </span>
                  )}
                </div>

                {/* GRAPH */}
                <div className="w-full overflow-x-auto pb-4">
                  <div className="min-w-[760px] h-64 flex items-end gap-6 pt-6 px-4">
                    {monthlyData.map(d => {
                      const vHeight = (d.ventas / maxVal) * 100;
                      const cHeight = (d.cobros / maxVal) * 100;
                      const isFilteredMonth = finanzasMonth === d.num;

                      return (
                        <div 
                          key={d.num} 
                          className={`flex-1 flex flex-col items-center group cursor-pointer transition-all p-2 rounded-xl ${isFilteredMonth ? 'bg-terra/5 ring-2 ring-terra/30' : 'hover:bg-light-cream/30'}`}
                          onClick={() => setFinanzasMonth(isFilteredMonth ? 'todos' : d.num)}
                        >
                          {/* Bars container */}
                          <div className="w-full h-40 flex items-end justify-center gap-1.5 relative">
                            {/* Ventas Bar (Terra) */}
                            <div className="w-4 bg-terra rounded-t-md relative group/bar" style={{ height: `${Math.max(vHeight, 2)}%` }}>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-brown text-cream text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-30 font-mono shadow-md">
                                Ventas: {fmt(d.ventas)}
                              </div>
                            </div>
                            {/* Cobros Bar (Brown) */}
                            <div className="w-4 bg-brown rounded-t-md relative group/bar" style={{ height: `${Math.max(cHeight, 2)}%` }}>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-brown text-cream text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-30 font-mono shadow-md">
                                Cobros: {fmt(d.cobros)}
                              </div>
                            </div>
                          </div>

                          {/* Divider line */}
                          <div className="w-full border-t border-sand my-2"></div>

                          {/* Label */}
                          <span className="text-[11px] font-bold text-brown truncate max-w-full text-center">
                            {d.label.substring(0, 3)}
                          </span>

                          {/* Quick Stats below label */}
                          <span className="text-[9px] text-stone font-mono mt-0.5 block">
                            {d.ventas > 0 || d.cobros > 0 ? (
                              <span className="text-terra font-bold">{fmt(d.ventas).split(',')[0]}</span>
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LEGEND & QUICK FILTER INSTRUCTION */}
                <div className="flex flex-wrap justify-between items-center gap-4 mt-2 pt-4 border-t border-sand text-[10.5px] text-stone">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-terra rounded-sm"></span>
                      <span>Ventas Pactadas (Devengado)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-brown rounded-sm"></span>
                      <span>Cobros Reales (Caja Percibida)</span>
                    </div>
                  </div>
                  <div className="italic text-right">
                    💡 Hacé clic en cualquier columna para alternar el filtro de detalle de abajo por ese mes.
                  </div>
                </div>

                {/* COMPARATIVE DATAGRID TABLE */}
                <div className="mt-6 overflow-hidden border border-sand/60 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-light-cream/60 text-brown font-serif border-b border-sand">
                        <th className="py-2.5 px-4 font-bold">Mes</th>
                        <th className="py-2.5 px-3 font-bold text-right">Ventas Pactadas</th>
                        <th className="py-2.5 px-3 font-bold text-right">Cobros Reales</th>
                        <th className="py-2.5 px-3 font-bold text-right">Costos Fijos</th>
                        <th className="py-2.5 px-3 font-bold text-right">Costo Var.</th>
                        <th className="py-2.5 px-3 font-bold text-right">Utilidad Econ.</th>
                        <th className="py-2.5 px-4 font-bold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/40">
                      {monthlyData.map(d => {
                        const isFilteredMonth = finanzasMonth === d.num;
                        const hasActivity = d.ventas > 0 || d.cobros > 0 || d.costoFijo > 0;
                        if (!hasActivity) return null; // Only show active months to avoid cluttering

                        return (
                          <tr 
                            key={d.num} 
                            className={`transition-colors text-[11px] ${isFilteredMonth ? 'bg-terra/5 font-semibold text-brown' : 'hover:bg-light-cream/15 text-stone'}`}
                          >
                            <td className="py-2 px-4 font-serif font-bold text-brown">{d.label}</td>
                            <td className="py-2 px-3 text-right font-mono text-brown">{fmt(d.ventas)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">{fmt(d.cobros)}</td>
                            <td className="py-2 px-3 text-right font-mono text-brown/80">-{fmt(d.costoFijo)}</td>
                            <td className="py-2 px-3 text-right font-mono text-brown/70">-{fmt(d.costoVar)}</td>
                            <td className={`py-2 px-3 text-right font-mono font-bold ${d.utilidad >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                              {fmt(d.utilidad)}
                            </td>
                            <td className="py-2 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setFinanzasMonth(isFilteredMonth ? 'todos' : d.num)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${isFilteredMonth ? 'bg-terra text-white' : 'bg-brown/5 text-brown hover:bg-brown hover:text-cream'}`}
                              >
                                {isFilteredMonth ? 'Quitar Filtro' : 'Filtrar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Check if there are no active months */}
                      {monthlyData.filter(d => d.ventas > 0 || d.cobros > 0 || d.costoFijo > 0).length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-stone italic">
                            No hay actividad financiera registrada en el año {evolutionYear}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* TWO RENTABILITY ENGINE MODULES: ECONOMIC VS FINANCIAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ECONOMIC BASIS: ACCRUAL P&L */}
                <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-sand pb-3 mb-4">
                      <div>
                        <h3 className="font-serif text-base font-bold text-brown">Rendimiento Económico (Devengado)</h3>
                        <p className="text-[10px] text-stone">Rentabilidad real en base a pedidos creados en el período.</p>
                      </div>
                      <span className="text-[9px] bg-brown/5 text-brown font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">P&L Estándar</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs">
                        <span className="text-stone">Ventas Pactadas Totales (+)</span>
                        <strong className="text-brown">{fmt(totalVentas)}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs">
                        <span className="text-stone">Costo de Producción / Variable (-)</span>
                        <strong className="text-brown/90">-{fmt(totalCostoVariable)}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs font-bold text-brown/90">
                        <span>Margen de Contribución</span>
                        <strong>{fmt(totalVentas - totalCostoVariable)}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs">
                        <span className="text-stone">Costos Fijos Operativos (-)</span>
                        <strong className="text-brown/90">-{fmt(totalCostoFijo)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-sand flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">Utilidad Económica Neta</span>
                      <strong className={`text-xl font-serif font-bold ${utilidadOperativaDevengada >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {fmt(utilidadOperativaDevengada)}
                      </strong>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${utilidadOperativaDevengada >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                      {totalVentas > 0 ? `${((utilidadOperativaDevengada / totalVentas) * 100).toFixed(1)}% Margen` : '0.0% Margen'}
                    </div>
                  </div>
                </div>

                {/* FINANCIAL BASIS: CASHFLOW */}
                <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between" style={{ background: 'rgba(242, 232, 217, 0.2)' }}>
                  <div>
                    <div className="flex justify-between items-center border-b border-sand pb-3 mb-4">
                      <div>
                        <h3 className="font-serif text-base font-bold text-brown">Flujo Financiero (Caja Percibida)</h3>
                        <p className="text-[10px] text-stone">Efectivo real ingresado por señas y cobros de saldos.</p>
                      </div>
                      <span className="text-[9px] bg-terra/10 text-terra font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Cash Flow</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs">
                        <span className="text-stone">Efectivo Ingresado Real (+)</span>
                        <strong className="text-emerald-700 font-bold">{fmt(totalIngresosCobrados)}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs">
                        <span className="text-stone">Costos Fijos Pagados (-)</span>
                        <strong className="text-brown/90">-{fmt(totalCostoFijo)}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-sand/40 text-xs text-stone italic">
                        <span>* Los costos variables de maderas/taller se pagan conforme avanzan los pedidos.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-sand flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">Flujo Neto de Caja Disponible</span>
                      <strong className={`text-xl font-serif font-bold ${flujoNetoDeCaja >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {fmt(flujoNetoDeCaja)}
                      </strong>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${flujoNetoDeCaja >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      Caja Disponible
                    </div>
                  </div>
                </div>

              </div>

              {/* DESTINATION ACCOUNTS BREAKDOWN */}
              <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm">
                <h3 className="font-serif text-base font-bold text-brown mb-4 border-b border-sand pb-2">Dinero Disponible</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* EFECTIVO */}
                  <div className="bg-light-cream/45 border border-sand/50 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-stone">Efectivo</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      </div>
                      <p className="text-[11px] text-stone">Cobros recibidos físicamente en showroom, efectivo o seña directa.</p>
                    </div>
                    <div className="text-right mt-4">
                      <span className="text-[10px] text-stone block">Total ingresado</span>
                      <strong className="text-lg font-serif font-bold text-brown">{fmt(accountBalances['Efectivo'])}</strong>
                    </div>
                  </div>

                  {/* SANTANDER */}
                  <div className="bg-light-cream/45 border border-sand/50 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-stone">Santander</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                      </div>
                      <p className="text-[11px] text-stone">Transferencias bancarias a cuenta corporativa o depósitos directos.</p>
                    </div>
                    <div className="text-right mt-4">
                      <span className="text-[10px] text-stone block">Total ingresado</span>
                      <strong className="text-lg font-serif font-bold text-brown">{fmt(accountBalances['Santander'])}</strong>
                    </div>
                  </div>

                  {/* UALA */}
                  <div className="bg-light-cream/45 border border-sand/50 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-stone">Uala</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                      </div>
                      <p className="text-[11px] text-stone">Pagos online, link de pago, tarjetas de crédito o cuotas sin interés.</p>
                    </div>
                    <div className="text-right mt-4">
                      <span className="text-[10px] text-stone block">Total ingresado</span>
                      <strong className="text-lg font-serif font-bold text-brown">{fmt(accountBalances['Uala'])}</strong>
                    </div>
                  </div>

                </div>
              </div>

              {/* COBROS DE SALDOS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ACTIVE BALANCES TO COLLECT */}
                <div className="lg:col-span-7 bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-brown mb-2 border-b border-sand pb-2 flex items-center gap-2">
                      <Clock className="w-4.5 h-4.5 text-terra" />
                      Saldos Pendientes de Cobro ({ordersWithBalance.length})
                    </h3>
                    <p className="text-[11px] text-stone mb-4">
                      Pedidos con saldos parciales. Hacé clic en "Cobrar Saldo" para asentar el cobro de la diferencia en la cuenta correspondiente.
                    </p>

                    <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {ordersWithBalance.length === 0 ? (
                        <div className="text-center py-12 text-stone text-xs italic">
                          No hay pedidos con saldos pendientes. ¡Excelente salud crediticia!
                        </div>
                      ) : (
                        ordersWithBalance.map(s => {
                          const outstanding = s.total - (s.senaAmount || 0);
                          const isSelected = paymentRegisterForm.orderId === s.id;
                          return (
                            <div key={s.id} className={`p-3 border rounded-xl flex items-center justify-between text-xs transition-all ${isSelected ? 'border-terra bg-terra/5 shadow-xs' : 'border-sand/50 hover:bg-light-cream/30 bg-white'}`}>
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-brown">{s.orderNum}</strong>
                                  <span className="text-[10px] bg-sand/40 px-1.5 py-0.5 rounded text-stone font-semibold">{s.client?.nombre || 'Consumidor Final'}</span>
                                </div>
                                <div className="text-[10px] text-stone mt-1">
                                  Total: <strong className="text-brown">{fmt(s.total)}</strong> · Seña: <span className="text-emerald-700 font-semibold">{fmt(s.senaAmount || 0)}</span>
                                </div>
                                <div className="text-[9px] text-stone mt-0.5">Entrega Proyectada: {s.deliveryDate}</div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="text-[9px] text-stone block">Saldo</span>
                                  <strong className="text-sm text-terra font-bold">{fmt(outstanding)}</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPaymentRegisterForm({
                                    orderId: s.id,
                                    amount: String(outstanding),
                                    account: s.paymentMethod?.toLowerCase().includes('cuotas') ? 'Uala' : s.paymentMethod?.toLowerCase().includes('transferencia') ? 'Santander' : 'Efectivo',
                                    date: new Date().toISOString().split('T')[0],
                                    note: `Cobro saldo pedido ${s.orderNum}`
                                  })}
                                  disabled={!canEditFinanzas}
                                  className="px-2.5 py-1.5 bg-brown text-cream hover:bg-terra hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Cobrar Saldo
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* RECORD PAYMENT PANEL */}
                <div className="lg:col-span-5 bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  {paymentRegisterForm.orderId === null ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-sand rounded-xl bg-light-cream/10">
                      <div className="p-3 bg-cream/50 rounded-full text-stone mb-3">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif text-sm font-bold text-brown">Registrar Recaudación de Saldos</h4>
                      <p className="text-[10px] text-stone max-w-xs mt-1">
                        Seleccioná un pedido con saldo de la lista de la izquierda para abrir el asentamiento de caja.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={recordBalancePayment} className={`flex flex-col gap-4 ${!canEditFinanzas ? 'pointer-events-none opacity-80 select-none' : ''}`}>
                      <div>
                        <h3 className="font-serif text-base font-bold text-brown mb-1">Registrar Cobro de Saldo</h3>
                        <p className="text-[10px] text-stone">Ingresar cobro para el pedido <strong className="text-brown">{sales.find(s => s.id === paymentRegisterForm.orderId)?.orderNum}</strong>.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Amount */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-stone">Monto Recaudado ($)</label>
                          <input
                            type="number"
                            required
                            value={paymentRegisterForm.amount}
                            onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, amount: e.target.value })}
                            className="text-xs bg-white border border-sand rounded-lg py-2 px-3 focus:outline-none focus:border-terra font-mono font-bold"
                          />
                        </div>

                        {/* Destination Account */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-stone">Cuenta de Destino</label>
                          <select
                            value={paymentRegisterForm.account}
                            onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, account: e.target.value })}
                            className="text-xs bg-white border border-sand rounded-lg py-2 px-3 focus:outline-none focus:border-terra font-semibold text-brown"
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Santander">Santander</option>
                            <option value="Uala">Uala</option>
                          </select>
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-stone">Fecha del Cobro</label>
                          <input
                            type="date"
                            required
                            value={paymentRegisterForm.date}
                            onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, date: e.target.value })}
                            className="text-xs bg-white border border-sand rounded-lg py-2 px-3 focus:outline-none"
                          />
                        </div>

                        {/* Note */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-stone">Notas del Cobro</label>
                          <input
                            type="text"
                            placeholder="Ej. Pagado por transferencia contra entrega"
                            value={paymentRegisterForm.note}
                            onChange={e => setPaymentRegisterForm({ ...paymentRegisterForm, note: e.target.value })}
                            className="text-xs bg-white border border-sand rounded-lg py-2 px-3 focus:outline-none focus:border-terra"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-4 border-t border-sand">
                        <button
                          type="button"
                          onClick={() => setPaymentRegisterForm({ ...paymentRegisterForm, orderId: null })}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone border border-sand hover:border-stone rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-terra text-white hover:bg-brown rounded-lg transition-all"
                        >
                          Confirmar Cobro
                        </button>
                      </div>
                    </form>
                  )}
                </div>

              </div>

              {/* FIXED COSTS REGISTER & CASH COLLECTION PROJECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* FIXED COSTS MANAGER */}
                <div className="lg:col-span-6 bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-brown mb-2 border-b border-sand pb-2">Asignación de Costos Fijos</h3>
                    <p className="text-[11px] text-stone mb-4">Asentá aquí los gastos corrientes de la fábrica y el local comercial para calcular la utilidad económica devengada de Barda.</p>

                    {/* Cost entry form */}
                    <form onSubmit={addFixedCost} className={`grid grid-cols-2 gap-3 mb-5 p-3.5 bg-light-cream/40 border border-sand/40 rounded-xl ${!canEditFinanzas ? 'pointer-events-none opacity-80 select-none' : ''}`}>
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] uppercase font-bold text-stone">Descripción del Gasto</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Alquiler Showroom, Luz, Monotributo, etc."
                          value={newFixedCost.description}
                          onChange={e => setNewFixedCost({ ...newFixedCost, description: e.target.value })}
                          className="text-xs bg-white border border-sand rounded-lg py-1.5 px-3 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-stone">Categoría</label>
                        <select
                          value={newFixedCost.category}
                          onChange={e => setNewFixedCost({ ...newFixedCost, category: e.target.value })}
                          className="text-xs bg-white border border-sand rounded-lg py-1.5 px-3 focus:outline-none text-brown font-semibold"
                        >
                          <option value="Alquiler">Alquiler</option>
                          <option value="Sueldos">Sueldos</option>
                          <option value="Publicidad">Publicidad</option>
                          <option value="Servicios">Servicios</option>
                          <option value="Impuestos">Impuestos</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-stone">Monto ($)</label>
                        <input
                          type="number"
                          required
                          placeholder="0"
                          value={newFixedCost.amount}
                          onChange={e => setNewFixedCost({ ...newFixedCost, amount: e.target.value })}
                          className="text-xs bg-white border border-sand rounded-lg py-1.5 px-3 focus:outline-none font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-stone">Mes de Período</label>
                        <input
                          type="month"
                          required
                          value={newFixedCost.month}
                          onChange={e => setNewFixedCost({ ...newFixedCost, month: e.target.value })}
                          className="text-xs bg-white border border-sand rounded-lg py-1.5 px-3 focus:outline-none text-brown font-semibold"
                        />
                      </div>
                      <button
                        type="submit"
                        className="self-end h-8 bg-brown text-cream hover:bg-terra hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Registrar
                      </button>
                    </form>

                    {/* Cost list */}
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredFixedCosts.length === 0 ? (
                        <div className="text-center py-6 text-stone text-xs italic">
                          No hay costos fijos registrados para este período.
                        </div>
                      ) : (
                        filteredFixedCosts.map(c => (
                          <div key={c.id} className="p-2.5 bg-light-cream/20 border border-sand/40 rounded-xl flex items-center justify-between text-xs hover:bg-light-cream/45 transition-all">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-brown/10 text-brown rounded-md text-[9px] font-bold uppercase tracking-wider">{c.category}</span>
                                <strong className="text-brown">{c.description}</strong>
                              </div>
                              <span className="text-[10px] text-stone mt-1 block">Mes: {c.month}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <strong className="text-brown font-mono font-bold">{fmt(c.amount)}</strong>
                              <button
                                type="button"
                                onClick={() => deleteFixedCost(c.id)}
                                disabled={!canEditFinanzas}
                                className="p-1 text-stone hover:text-rose-600 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Eliminar costo fijo"
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

                {/* CASH COLLECTION PROJECTION HORIZON */}
                <div className="lg:col-span-6 bg-white border border-sand rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-brown mb-2 border-b border-sand pb-2">Proyección de Ingresos Futuros</h3>
                    <p className="text-[11px] text-stone mb-4">
                      Calendario proyectado de recaudación en base a los saldos pendientes agrupados por el mes de entrega estimado de los productos.
                    </p>

                    <div className="flex flex-col gap-3">
                      {Object.keys(projectionsMap).length === 0 ? (
                        <div className="text-center py-12 text-stone text-xs italic">
                          No hay proyecciones de cobros pendientes. ¡Todas las cuentas están cerradas!
                        </div>
                      ) : (
                        Object.entries(projectionsMap).map(([monthStr, amount]) => {
                          const totalSaldos = Object.values(projectionsMap).reduce((acc, v) => acc + v, 0) || 1;
                          const percent = Math.round((amount / totalSaldos) * 100);
                          return (
                            <div key={monthStr} className="flex flex-col gap-1.5 p-3.5 bg-light-cream/30 border border-sand/30 rounded-xl">
                              <div className="flex justify-between text-xs">
                                <span className="font-serif font-bold text-brown">{monthStr}</span>
                                <span className="text-terra font-bold font-mono">{fmt(amount)} ({percent}%)</span>
                              </div>
                              <div className="w-full bg-sand/30 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-terra h-full rounded-full transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-brown/5 rounded-xl border border-brown/10 mt-6 text-[10.5px] text-stone leading-relaxed flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-terra shrink-0 mt-0.5" />
                    <span>
                      <strong>Recomendación del Asesor Financiero:</strong> Programá llamadas de recordatorio de pago de saldos a tus clientes 5 días antes de la fecha de entrega estimada de su pedido, coordinando la cuenta preferida de destino para acelerar la entrada de caja.
                    </span>
                  </div>
                </div>

              </div>

              {/* EXPORT CENTER CARD */}
              <div className="bg-white border-2 border-sand rounded-2xl p-6 shadow-sm">
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

            </div>
          );
        })()}
      </main>

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
                  rows={3} 
                  placeholder="Detalles de lustre de maderas, combinaciones de telas, observaciones de envío..." 
                  value={orderForm.notes} 
                  onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-sand rounded-lg text-xs"
                />
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
