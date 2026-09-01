import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, Plus, Search, Filter, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Trash2, Edit, CheckCircle, RefreshCw, DollarSign, Layers, Wrench, ShoppingBag,
  Info, Check, Sparkles, TrendingUp, MoreVertical, Eye
} from "lucide-react";
import { StockItem, StockMovement } from "../types";
import { StockDetailModal } from "./StockDetailModal";

// FALLBACK PRESET CATALOG FOR OFFLINE / INSTANT LOAD
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

const DEFAULT_COLORS: Record<string, string[]> = {
  Lino: ["Crema", "Avena", "Beige", "Gris Claro", "Gris Topo"],
  Pana: ["Arena", "Rosa Viejo", "Mostaza", "Verde Musgo", "Grafito"],
  Panne: ["Camel", "Habano", "Chocolate", "Negro"]
};

const titleCase = (s: string) => {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const parseNum = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  const num = parseFloat(String(val).replace(",", "."));
  return isNaN(num) ? 0 : num;
};

interface StockManagerProps {
  stockList: StockItem[];
  stockMovements: StockMovement[];
  onAddStockItem: (item: Omit<StockItem, "id" | "createdAt" | "updatedAt">, paymentAccount?: string) => void;
  onUpdateStockItem: (id: string, updates: Partial<StockItem>) => void;
  onDeleteStockItem: (id: string) => void;
  onAdjustStockQty: (id: string, newQty: number, notes?: string) => void;
  fmt: (num: number) => string;
  canEdit: boolean;
  catalog?: {
    chairs: any[];
    chairColors: Record<string, string[]>;
    tables: any[];
    mesaOptions: any;
    circular: any[];
    circularOptions: any;
    ratonas: any[];
  };
  costsCatalog?: {
    chairs: any[];
    tables: any[];
    circular: any[];
    ratonas: any[];
  };
}

export const StockManager: React.FC<StockManagerProps> = ({
  stockList,
  stockMovements,
  onAddStockItem,
  onUpdateStockItem,
  onDeleteStockItem,
  onAdjustStockQty,
  fmt,
  canEdit,
  catalog,
  costsCatalog
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedStockDetail, setSelectedStockDetail] = useState<StockItem | null>(null);
  const [activeStockRowMenuId, setActiveStockRowMenuId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"inventory" | "movements">("inventory");

  // Resolved Catalogs
  const cat = useMemo(() => ({
    chairs: catalog?.chairs && catalog.chairs.length > 0 ? catalog.chairs : DEFAULT_CHAIRS,
    chairColors: catalog?.chairColors || DEFAULT_COLORS,
    tables: catalog?.tables && catalog.tables.length > 0 ? catalog.tables : DEFAULT_TABLES,
    mesaOptions: catalog?.mesaOptions || DEFAULT_OPTIONS,
    circular: catalog?.circular && catalog.circular.length > 0 ? catalog.circular : DEFAULT_CIRCULAR_TABLES,
    circularOptions: catalog?.circularOptions || DEFAULT_OPTIONS,
    ratonas: catalog?.ratonas && catalog.ratonas.length > 0 ? catalog.ratonas : DEFAULT_RATONAS
  }), [catalog]);

  const costsCat = useMemo(() => ({
    chairs: costsCatalog?.chairs || [],
    tables: costsCatalog?.tables || [],
    circular: costsCatalog?.circular || [],
    ratonas: costsCatalog?.ratonas || []
  }), [costsCatalog]);

  // ========================================================
  // BUILDER STATES FOR ADDING STOCK PRODUCT (LIKE PRESUPUESTOS)
  // ========================================================
  const [activeAddTab, setActiveAddTab] = useState<"silla" | "mesa" | "circular" | "ratona" | "otro">("silla");
  
  // Sillas Form - identical to Presupuestos
  const [sillaForm, setSillaForm] = useState({
    model: "",
    wood: "",
    fabric: "",
    color: ""
  });

  // Mesas Form - identical to Presupuestos
  const [mesaForm, setMesaForm] = useState({
    wood: "",
    w: "1.80",
    h: "0.90",
    base: "",
    color: "",
    veteado: "",
    brillo: "",
    baseMadera: ""
  });

  // Mesas Circulares Form - identical to Presupuestos
  const [circularForm, setCircularForm] = useState({
    wood: "",
    diam: "1.20",
    base: "",
    color: "",
    veteado: "",
    brillo: "",
    baseMadera: ""
  });

  // Ratonas Form - identical to Presupuestos
  const [ratonaForm, setRatonaForm] = useState({
    wood: "",
    w: "1.20",
    h: "0.60"
  });

  // Otros Form - identical to Presupuestos
  const [otroForm, setOtroForm] = useState({
    name: "",
    category: "Sillones",
    detail: ""
  });

  // Common values
  const [addQty, setAddQty] = useState<number>(1);
  const [addMinAlert, setAddMinAlert] = useState<number>(2);
  const [customCostUnit, setCustomCostUnit] = useState<string>("");
  const [customPriceSuggested, setCustomPriceSuggested] = useState<string>("");
  const [formAccount, setFormAccount] = useState<"Santander" | "Uala" | "Efectivo">("Santander");
  const [formRegisterPayment, setFormRegisterPayment] = useState(true);

  // Derive calculated current item parameters
  const calculatedStockItem = useMemo(() => {
    let name = "";
    let category = "Otros";
    let detail = "";
    let calculatedPrice = 0;
    let calculatedCost = 0;

    if (activeAddTab === "silla") {
      const model = sillaForm.model;
      const wood = sillaForm.wood;
      const fabric = sillaForm.fabric;
      const color = sillaForm.color;

      name = model || "Silla";
      category = "Sillas";
      
      const detailParts: string[] = [];
      if (wood) detailParts.push(titleCase(wood));
      if (fabric) detailParts.push(fabric);
      if (color) detailParts.push(`Color: ${color}`);
      detail = detailParts.join(" · ");

      if (model && wood && fabric) {
        const chairObj = cat.chairs.find(c => c.name === model);
        calculatedPrice = chairObj?.prices?.[wood]?.[fabric] || 0;

        const costChair = costsCat.chairs?.find((c: any) => c.name?.toUpperCase() === model?.toUpperCase());
        const rawCost = costChair?.prices?.[wood]?.[fabric];
        calculatedCost = rawCost || Math.round(calculatedPrice * 0.55);
      }
    } else if (activeAddTab === "mesa") {
      const wood = mesaForm.wood;
      const wn = parseNum(mesaForm.w) || 1.8;
      const hn = parseNum(mesaForm.h) || 0.9;
      const m2 = wn * hn;
      const minM2 = 1.6;
      const billableM2 = m2 < minM2 ? minM2 : m2;

      name = wood ? `Mesa ${wood}` : "Mesa";
      category = "Mesas";
      detail = `${wn}m × ${hn}m = ${m2.toFixed(2)}m² · Base: ${mesaForm.base || "Estándar"}${m2 < minM2 ? " (Mín. 1.6m²)" : ""}`;

      if (wood === "Microcemento") {
        if (mesaForm.color) detail += ` · Color: ${mesaForm.color}`;
        if (mesaForm.veteado) detail += ` · Vet: ${mesaForm.veteado}`;
        if (mesaForm.brillo) detail += ` · Brillo: ${mesaForm.brillo}`;
        if (mesaForm.baseMadera) detail += ` · Base Madera: ${mesaForm.baseMadera}`;
      }

      if (wood) {
        const tableObj = cat.tables.find(t => t.name === wood);
        calculatedPrice = tableObj ? Math.round(tableObj.pricePerM2 * billableM2) : 0;

        const costTable = costsCat.tables?.find((t: any) => t.name?.toLowerCase() === wood?.toLowerCase());
        const costPerM2 = costTable?.pricePerM2;
        calculatedCost = costPerM2 ? Math.round(costPerM2 * billableM2) : Math.round(calculatedPrice * 0.55);
      }
    } else if (activeAddTab === "circular") {
      const wood = circularForm.wood;
      const diam = parseNum(circularForm.diam) || 1.2;

      name = wood ? `Mesa Circular ${wood}` : "Mesa Circular";
      category = "Mesas Circulares";
      detail = `Diámetro: ${diam.toFixed(2)}m · Base: ${circularForm.base || "Estándar"}`;

      if (wood === "Microcemento") {
        if (circularForm.color) detail += ` · Color: ${circularForm.color}`;
        if (circularForm.veteado) detail += ` · Vet: ${circularForm.veteado}`;
        if (circularForm.brillo) detail += ` · Brillo: ${circularForm.brillo}`;
        if (circularForm.baseMadera) detail += ` · Base Madera: ${circularForm.baseMadera}`;
      }

      if (wood) {
        const circObj = cat.circular.find(t => t.name === wood);
        calculatedPrice = circObj ? Math.round(circObj.pricePerM2 * diam) : 0;

        const costCirc = costsCat.circular?.find((t: any) => t.name?.toLowerCase() === wood?.toLowerCase());
        const costPerM2 = costCirc?.pricePerM2;
        calculatedCost = costPerM2 ? Math.round(costPerM2 * diam) : Math.round(calculatedPrice * 0.55);
      }
    } else if (activeAddTab === "ratona") {
      const wood = ratonaForm.wood;
      const wn = parseNum(ratonaForm.w) || 1.2;
      const hn = parseNum(ratonaForm.h) || 0.6;
      const m2 = wn * hn;
      const minM2 = 1.4;
      const billableM2 = m2 < minM2 ? minM2 : m2;

      name = wood ? `Mesa Ratona ${wood}` : "Mesa Ratona";
      category = "Ratonas";
      detail = `${wn}m × ${hn}m = ${m2.toFixed(2)}m²${m2 < minM2 ? " (Mín. 1.4m²)" : ""}`;

      if (wood) {
        const ratonaObj = cat.ratonas.find(r => r.name === wood);
        calculatedPrice = ratonaObj ? Math.round(ratonaObj.pricePerM2 * billableM2) : 0;

        const costRatona = costsCat.ratonas?.find((t: any) => t.name?.toLowerCase() === wood?.toLowerCase());
        const costPerM2 = costRatona?.pricePerM2;
        calculatedCost = costPerM2 ? Math.round(costPerM2 * billableM2) : Math.round(calculatedPrice * 0.55);
      }
    } else {
      name = otroForm.name.trim() || "Producto Personalizado";
      category = otroForm.category || "Otros";
      detail = otroForm.detail.trim();
      calculatedPrice = 0;
      calculatedCost = 0;
    }

    const finalPrice = customPriceSuggested !== "" 
      ? Math.max(0, parseFloat(customPriceSuggested) || 0)
      : calculatedPrice;

    const finalCost = customCostUnit !== ""
      ? Math.max(0, parseFloat(customCostUnit) || 0)
      : calculatedCost;

    return {
      name,
      category,
      detail,
      defaultPrice: calculatedPrice,
      defaultCost: calculatedCost,
      finalPrice,
      finalCost
    };
  }, [
    activeAddTab,
    sillaForm,
    mesaForm,
    circularForm,
    ratonaForm,
    otroForm,
    customPriceSuggested,
    customCostUnit,
    cat,
    costsCat
  ]);

  // Form validity check matching Cotizador de Presupuestos
  const isFormValid = useMemo(() => {
    if (activeAddTab === "silla") {
      if (!sillaForm.model || !sillaForm.wood || !sillaForm.fabric) return false;
      if ((sillaForm.fabric === "Lino" || sillaForm.fabric === "Pana" || sillaForm.fabric === "Panne") && !sillaForm.color) return false;
      return true;
    }
    if (activeAddTab === "mesa") {
      if (!mesaForm.wood || !mesaForm.base) return false;
      const wVal = parseNum(mesaForm.w);
      const hVal = parseNum(mesaForm.h);
      if (wVal <= 0 || hVal <= 0) return false;
      if (mesaForm.wood === "Microcemento" && (!mesaForm.color || !mesaForm.veteado || !mesaForm.brillo)) return false;
      return true;
    }
    if (activeAddTab === "circular") {
      if (!circularForm.wood || !circularForm.base) return false;
      const diamVal = parseNum(circularForm.diam);
      if (diamVal <= 0) return false;
      if (circularForm.wood === "Microcemento" && (!circularForm.color || !circularForm.veteado || !circularForm.brillo)) return false;
      return true;
    }
    if (activeAddTab === "ratona") {
      if (!ratonaForm.wood) return false;
      const wVal = parseNum(ratonaForm.w);
      const hVal = parseNum(ratonaForm.h);
      if (wVal <= 0 || hVal <= 0) return false;
      return true;
    }
    if (activeAddTab === "otro") {
      return !!otroForm.name.trim();
    }
    return false;
  }, [activeAddTab, sillaForm, mesaForm, circularForm, ratonaForm, otroForm]);

  // Quick adjustment modal
  const [adjustingItem, setAdjustingItem] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState<string>("");

  const categories = [
    "todos",
    "Sillas",
    "Mesas",
    "Mesas Circulares",
    "Ratonas",
    "Sillones",
    "Banquetas",
    "Camas",
    "Escritorios",
    "Muebles de TV",
    "Vajilleros",
    "Espejos",
    "Otros"
  ];

  // Filtering
  const filteredStock = useMemo(() => {
    return stockList.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.detail && item.detail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === "todos" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [stockList, searchTerm, categoryFilter]);

  // Overall statistics
  const totalUnits = stockList.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
  const totalInvestedCost = stockList.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.costUnit) || 0)), 0);
  const totalPotentialSale = stockList.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.priceSuggested) || 0)), 0);
  const lowStockCount = stockList.filter(it => (Number(it.qty) || 0) <= (Number(it.minAlertQty) || 2)).length;

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !calculatedStockItem.name.trim()) return;

    onAddStockItem(
      {
        name: calculatedStockItem.name.trim(),
        category: calculatedStockItem.category,
        detail: calculatedStockItem.detail.trim(),
        qty: Math.max(0, Number(addQty) || 1),
        costUnit: Math.max(0, Number(calculatedStockItem.finalCost) || 0),
        priceSuggested: Math.max(0, Number(calculatedStockItem.finalPrice) || 0),
        minAlertQty: Math.max(0, Number(addMinAlert) || 2)
      },
      formRegisterPayment ? formAccount : undefined
    );

    // Reset overrides and close
    setCustomCostUnit("");
    setCustomPriceSuggested("");
    setAddQty(1);
    setOtroForm({ name: "", category: "Sillones", detail: "" });
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    onUpdateStockItem(editingItem.id, {
      name: editingItem.name.trim(),
      category: editingItem.category,
      detail: editingItem.detail.trim(),
      qty: Math.max(0, Number(editingItem.qty) || 0),
      costUnit: Math.max(0, Number(editingItem.costUnit) || 0),
      priceSuggested: Math.max(0, Number(editingItem.priceSuggested) || 0),
      minAlertQty: Math.max(0, Number(editingItem.minAlertQty) || 2),
      updatedAt: new Date().toISOString()
    });

    setEditingItem(null);
  };

  const handleConfirmAdjust = () => {
    if (!adjustingItem) return;
    onAdjustStockQty(adjustingItem.id, adjustQty, adjustNotes);
    setAdjustingItem(null);
    setAdjustNotes("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Capital Invertido */}
        <div className="bg-white border border-sand rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone text-xs font-bold uppercase tracking-wider">
            <span>Capital en Stock (Costo)</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-brown">
              {fmt(totalInvestedCost)}
            </div>
            <div className="text-[11px] text-stone font-medium mt-0.5">
              Valor de reposición / compra
            </div>
          </div>
        </div>

        {/* Card 2: Valor Estimado de Venta */}
        <div className="bg-white border border-sand rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone text-xs font-bold uppercase tracking-wider">
            <span>Valor de Venta Sugerido</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-emerald-800">
              {fmt(totalPotentialSale)}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
              Margen potencial: +{fmt(totalPotentialSale - totalInvestedCost)}
            </div>
          </div>
        </div>

        {/* Card 3: Total Unidades */}
        <div className="bg-white border border-sand rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone text-xs font-bold uppercase tracking-wider">
            <span>Unidades Físicas</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-serif font-bold text-brown">
              {totalUnits} <span className="text-sm font-sans font-normal text-stone">unidades</span>
            </div>
            <div className="text-[11px] text-stone font-medium mt-0.5">
              En {stockList.length} productos registrados
            </div>
          </div>
        </div>

        {/* Card 4: Alertas de Stock Bajo */}
        <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between ${
          lowStockCount > 0 ? "border-amber-300 bg-amber-50/20" : "border-sand"
        }`}>
          <div className="flex items-center justify-between text-stone text-xs font-bold uppercase tracking-wider">
            <span>Alertas de Reposición</span>
            <div className={`p-2 rounded-xl ${lowStockCount > 0 ? "bg-amber-100 text-amber-800" : "bg-sand/30 text-stone"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-serif font-bold ${lowStockCount > 0 ? "text-amber-900" : "text-brown"}`}>
              {lowStockCount} <span className="text-sm font-sans font-normal text-stone">artículos</span>
            </div>
            <div className="text-[11px] text-stone font-medium mt-0.5">
              {lowStockCount > 0 ? "Por debajo del stock mínimo" : "Todos los niveles óptimos"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS & ACTIONS HEADER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-sand rounded-2xl p-3 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex bg-light-cream border border-sand rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("inventory")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              activeSubTab === "inventory"
                ? "bg-brown text-cream shadow-xs"
                : "text-stone hover:bg-cream/40"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventario de Stock</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {stockList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("movements")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              activeSubTab === "movements"
                ? "bg-brown text-cream shadow-xs"
                : "text-stone hover:bg-cream/40"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Historial de Movimientos</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {stockMovements.length}
            </span>
          </button>
        </div>

        {/* Add Product Button */}
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setCustomCostUnit("");
              setCustomPriceSuggested("");
              setShowAddModal(true);
            }}
            className="bg-brown hover:bg-terra text-cream px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ingresar Mercadería a Stock</span>
          </button>
        )}
      </div>

      {/* 3. SUB-VIEW: INVENTORY LIST */}
      {activeSubTab === "inventory" && (
        <div className="flex flex-col gap-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone/60" />
              <input
                type="text"
                placeholder="Buscar por modelo, madera, color, tapizado..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-sand rounded-xl bg-white text-xs text-brown focus:ring-1 focus:ring-terra focus:outline-none placeholder-stone/50 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-stone shrink-0" />
              <div className="flex gap-1.5">
                {categories.map(catItem => (
                  <button
                    key={catItem}
                    type="button"
                    onClick={() => setCategoryFilter(catItem)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                      categoryFilter === catItem
                        ? "bg-brown text-cream shadow-xs"
                        : "bg-white border border-sand text-stone hover:bg-sand/20"
                    }`}
                  >
                    {catItem === "todos" ? "Todos" : catItem}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table of Inventory */}
          <div className="bg-white border border-sand rounded-2xl shadow-sm overflow-hidden">
            {filteredStock.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sand/20 flex items-center justify-center text-stone">
                  <Package className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-brown">No hay productos en stock con los filtros actuales</div>
                <p className="text-xs text-stone max-w-sm">
                  {stockList.length === 0 
                    ? "Aún no se han ingresado productos a stock físico. Utilizá el botón superior para cargar el primer producto."
                    : "Probá cambiando el término de búsqueda o la categoría seleccionada."
                  }
                </p>
                {canEdit && stockList.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCostUnit("");
                      setCustomPriceSuggested("");
                      setShowAddModal(true);
                    }}
                    className="mt-2 text-terra hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cargar primer producto al stock</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sand/20 border-b border-sand text-stone text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Producto & Detalle</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3 text-center">Disponible</th>
                      <th className="py-3 px-3 text-right">Costo Unit.</th>
                      <th className="py-3 px-3 text-right">Inversión Total</th>
                      <th className="py-3 px-3 text-right">Precio Venta Sug.</th>
                      <th className="py-3 px-3 text-right">Ganancia Est.</th>
                      <th className="py-3 px-4 text-center w-12">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/50">
                    {filteredStock.map(item => {
                      const isLow = (item.qty || 0) <= (item.minAlertQty || 2);
                      const isOut = (item.qty || 0) <= 0;
                      const totalCost = (item.qty || 0) * (item.costUnit || 0);
                      const totalSale = (item.qty || 0) * (item.priceSuggested || 0);
                      const lineProfit = totalSale - totalCost;
                      const isMenuOpen = activeStockRowMenuId === item.id;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedStockDetail(item)}
                          className="hover:bg-cream/40 transition-colors cursor-pointer group"
                        >
                          {/* Product & Detail */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-brown text-xs flex items-center gap-2">
                              <span className="group-hover:text-terra transition-colors">{item.name}</span>
                              {isOut ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                  Sin Stock
                                </span>
                              ) : isLow ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Stock Bajo
                                </span>
                              ) : null}
                            </div>
                            {item.detail && (
                              <div className="text-[11px] text-stone mt-0.5 leading-relaxed font-medium">
                                {item.detail}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-1 bg-sand/30 text-stone rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {item.category || "General"}
                            </span>
                          </td>

                          {/* Available Qty */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg ${
                                isOut 
                                  ? "bg-rose-50 text-rose-700 border border-rose-200" 
                                  : isLow 
                                  ? "bg-amber-50 text-amber-900 border border-amber-200" 
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}>
                                {item.qty} u.
                              </span>
                            </div>
                          </td>

                          {/* Cost Unit */}
                          <td className="py-3.5 px-3 text-right font-mono text-stone">
                            {fmt(item.costUnit || 0)}
                          </td>

                          {/* Total Cost */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-brown">
                            {fmt(totalCost)}
                          </td>

                          {/* Suggested Price */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-800">
                            {fmt(item.priceSuggested || 0)}
                          </td>

                          {/* Profit */}
                          <td className="py-3.5 px-3 text-right font-mono text-[11px] font-bold text-terra">
                            +{fmt(lineProfit)}
                          </td>

                          {/* Actions - 3 dots menu like Ventas */}
                          <td className="py-3.5 px-4 text-center relative" onClick={e => e.stopPropagation()}>
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStockRowMenuId(isMenuOpen ? null : item.id);
                                }}
                                className="p-1.5 text-stone hover:text-brown hover:bg-sand/50 rounded-lg transition-colors cursor-pointer"
                                title="Opciones del producto"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveStockRowMenuId(null);
                                    }}
                                  />
                                  <div className="absolute right-0 mt-1 w-52 bg-white border border-sand rounded-xl shadow-xl z-30 py-1.5 text-xs text-brown divide-y divide-sand/40 animate-fadeIn font-sans text-left">
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-stone uppercase tracking-wider bg-light-cream/40 truncate">
                                      {item.name}
                                    </div>
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveStockRowMenuId(null);
                                          setSelectedStockDetail(item);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-cream/40 flex items-center gap-2 text-brown font-semibold transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-4 h-4 text-terra" />
                                        <span>Ver Ficha Completa</span>
                                      </button>

                                      {canEdit && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveStockRowMenuId(null);
                                              setAdjustingItem(item);
                                              setAdjustQty(item.qty);
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-cream/40 flex items-center gap-2 text-brown font-semibold transition-colors cursor-pointer"
                                          >
                                            <RefreshCw className="w-4 h-4 text-emerald-600" />
                                            <span>Ajustar Stock (+/-)</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveStockRowMenuId(null);
                                              setEditingItem(item);
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-cream/40 flex items-center gap-2 text-brown font-semibold transition-colors cursor-pointer"
                                          >
                                            <Edit className="w-4 h-4 text-amber-700" />
                                            <span>Editar Producto</span>
                                          </button>
                                        </>
                                      )}
                                    </div>

                                    {canEdit && (
                                      <div className="py-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveStockRowMenuId(null);
                                            if (confirm(`¿Eliminar definitivamente "${item.name}" del catálogo de stock?`)) {
                                              onDeleteStockItem(item.id);
                                              if (selectedStockDetail?.id === item.id) {
                                                setSelectedStockDetail(null);
                                              }
                                            }
                                          }}
                                          className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-700 font-semibold transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4 text-rose-600" />
                                          <span>Eliminar Producto</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: MOVEMENTS HISTORY */}
      {activeSubTab === "movements" && (
        <div className="bg-white border border-sand rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-sand/10 border-b border-sand flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-terra" />
              <span className="font-bold text-xs uppercase tracking-wider text-brown">
                Registro de Auditoría de Stock
              </span>
            </div>
            <span className="text-[11px] text-stone font-medium">
              Últimos {stockMovements.length} movimientos
            </span>
          </div>

          {stockMovements.length === 0 ? (
            <div className="p-12 text-center text-stone text-xs">
              Aún no se han registrado movimientos de stock (ingresos, ventas o ajustes).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand/20 border-b border-sand text-stone text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-3 text-center">Variación</th>
                    <th className="py-3 px-3 text-center">Stock Final</th>
                    <th className="py-3 px-4">Motivo / Pedido</th>
                    <th className="py-3 px-4">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/50">
                  {stockMovements.map(mov => {
                    const isIngreso = mov.type === "IN_COMPRA" || mov.type === "IN_FABRICACION";
                    const isEgreso = mov.type === "OUT_VENTA";
                    const isAjuste = mov.type === "AJUSTE";
                    const typeLabel = mov.type === "IN_COMPRA" ? "Compra" : mov.type === "IN_FABRICACION" ? "Fabricación" : mov.type === "OUT_VENTA" ? "Venta" : "Ajuste";
                    const movDate = mov.date || mov.createdAt;

                    return (
                      <tr key={mov.id} className="hover:bg-sand/10 transition-colors">
                        <td className="py-3 px-4 text-stone font-mono text-[11px]">
                          {movDate ? new Date(movDate).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                            isIngreso 
                              ? "bg-emerald-100 text-emerald-900" 
                              : isEgreso 
                              ? "bg-rose-100 text-rose-900" 
                              : "bg-indigo-100 text-indigo-900"
                          }`}>
                            {isIngreso && <ArrowUpRight className="w-3 h-3" />}
                            {isEgreso && <ArrowDownRight className="w-3 h-3" />}
                            {isAjuste && <RefreshCw className="w-3 h-3" />}
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-brown">
                          {mov.itemName}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={isIngreso ? "text-emerald-700" : isEgreso ? "text-rose-600" : "text-brown"}>
                            {isIngreso ? `+${mov.qty}` : isEgreso ? `-${mov.qty}` : `${mov.qty}`} u.
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-stone font-semibold">
                          {fmt(mov.totalCost || 0)}
                        </td>
                        <td className="py-3 px-4 text-stone">
                          {mov.notes || (mov.relatedOrderNum ? `Pedido #${mov.relatedOrderNum}` : "-")}
                        </td>
                        <td className="py-3 px-4 text-stone text-[11px] font-medium">
                          {mov.createdBy || "Sistema"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: INGRESAR MERCADERÍA A STOCK (IDÉNTICO A PRESUPUESTOS) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-sand rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-brown text-cream p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-terra" />
                <div>
                  <h3 className="font-serif font-bold text-base text-cream">Ingreso de Mercadería a Stock</h3>
                  <p className="text-[11px] text-cream/70">Configurador con especificaciones y costos de catálogo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-cream/70 hover:text-cream text-lg font-bold p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
              {/* Product Category Selector Tabs (same as Presupuestos) */}
              <div className="flex bg-light-cream border border-sand rounded-xl p-1 gap-1 overflow-x-auto">
                {(["silla", "mesa", "circular", "ratona", "otro"] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveAddTab(tab);
                      setCustomCostUnit("");
                      setCustomPriceSuggested("");
                    }}
                    className={`flex-1 min-w-[85px] text-center py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      activeAddTab === tab 
                        ? "bg-brown text-cream shadow-xs" 
                        : "text-stone hover:bg-cream/40"
                    }`}
                  >
                    {tab === "silla" ? "Sillas" : tab === "mesa" ? "Mesas" : tab === "circular" ? "Mesas Circ." : tab === "ratona" ? "Ratonas" : "Otros"}
                  </button>
                ))}
              </div>

              {/* ---------------- SILLAS BUILDER ---------------- */}
              {activeAddTab === "silla" && (
                <div className="bg-sand/10 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Modelo</label>
                      <select 
                        value={sillaForm.model} 
                        onChange={e => {
                          const m = e.target.value;
                          setSillaForm({ model: m, wood: "", fabric: "", color: "" });
                          setCustomCostUnit("");
                          setCustomPriceSuggested("");
                        }}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar modelo...</option>
                        {cat.chairs.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Madera</label>
                      <select 
                        disabled={!sillaForm.model}
                        value={sillaForm.wood} 
                        onChange={e => {
                          const w = e.target.value;
                          setSillaForm({ ...sillaForm, wood: w, fabric: "", color: "" });
                          setCustomCostUnit("");
                          setCustomPriceSuggested("");
                        }}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar madera...</option>
                        {sillaForm.model && Object.keys(cat.chairs.find(c => c.name === sillaForm.model)?.prices || {}).map(w => (
                          <option key={w} value={w}>{titleCase(w)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tela</label>
                      <select 
                        disabled={!sillaForm.wood}
                        value={sillaForm.fabric} 
                        onChange={e => {
                          const f = e.target.value;
                          setSillaForm({ ...sillaForm, fabric: f, color: "" });
                          setCustomCostUnit("");
                          setCustomPriceSuggested("");
                        }}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar tela...</option>
                        {sillaForm.wood && Object.keys(cat.chairs.find(c => c.name === sillaForm.model)?.prices?.[sillaForm.wood] || {}).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fabric Colors */}
                  {sillaForm.fabric && (sillaForm.fabric === "Lino" || sillaForm.fabric === "Pana" || sillaForm.fabric === "Panne") && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Color de {sillaForm.fabric}</label>
                      <select 
                        value={sillaForm.color} 
                        onChange={e => setSillaForm({ ...sillaForm, color: e.target.value })}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar color...</option>
                        {(cat.chairColors[sillaForm.fabric] || []).map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- MESAS BUILDER ---------------- */}
              {activeAddTab === "mesa" && (
                <div className="bg-sand/10 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                      <select 
                        value={mesaForm.wood} 
                        onChange={e => {
                          setMesaForm({ ...mesaForm, wood: e.target.value, base: "", color: "", veteado: "", brillo: "", baseMadera: "" });
                          setCustomCostUnit("");
                          setCustomPriceSuggested("");
                        }}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar madera...</option>
                        {cat.tables.map(t => (
                          <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de Base *</label>
                      <select 
                        disabled={!mesaForm.wood}
                        value={mesaForm.base} 
                        onChange={e => setMesaForm({ ...mesaForm, base: e.target.value })}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar base...</option>
                        {cat.mesaOptions.baseTypes.map((b: string) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Microcemento specific fields */}
                  {mesaForm.wood === "Microcemento" && (
                    <div className="bg-cream/30 border border-sand/80 rounded-xl p-3 flex flex-col gap-2.5">
                      <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Color</label>
                          <select 
                            value={mesaForm.color} 
                            onChange={e => setMesaForm({ ...mesaForm, color: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Color...</option>
                            {cat.mesaOptions.microColores.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Veteado</label>
                          <select 
                            value={mesaForm.veteado} 
                            onChange={e => setMesaForm({ ...mesaForm, veteado: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Veteado...</option>
                            {cat.mesaOptions.microVeteados.map((v: string) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Brillo</label>
                          <select 
                            value={mesaForm.brillo} 
                            onChange={e => setMesaForm({ ...mesaForm, brillo: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Brillo...</option>
                            {cat.mesaOptions.microBrillos.map((b: string) => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Base Madera</label>
                          <select 
                            value={mesaForm.baseMadera} 
                            onChange={e => setMesaForm({ ...mesaForm, baseMadera: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Base madera...</option>
                            {(cat.mesaOptions.baseMaderaTypes || DEFAULT_OPTIONS.baseMaderaTypes).map((bm: string) => <option key={bm} value={bm}>{bm}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dimensions: W x H */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sand/40 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Ancho" 
                          value={mesaForm.w} 
                          onChange={e => {
                            setMesaForm({ ...mesaForm, w: e.target.value });
                            setCustomCostUnit("");
                            setCustomPriceSuggested("");
                          }} 
                          className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" 
                        />
                        <span className="text-stone">×</span>
                        <input 
                          type="text" 
                          placeholder="Largo" 
                          value={mesaForm.h} 
                          onChange={e => {
                            setMesaForm({ ...mesaForm, h: e.target.value });
                            setCustomCostUnit("");
                            setCustomPriceSuggested("");
                          }} 
                          className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" 
                        />
                        {parseNum(mesaForm.w) > 0 && parseNum(mesaForm.h) > 0 && (
                          <span className="text-xs text-terra font-bold ml-2">
                            {(parseNum(mesaForm.w) * parseNum(mesaForm.h)).toFixed(2)} m²
                            {(parseNum(mesaForm.w) * parseNum(mesaForm.h)) < 1.6 && " (Mín: 1.6m²)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- MESAS CIRCULARES BUILDER ---------------- */}
              {activeAddTab === "circular" && (
                <div className="bg-sand/10 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                      <select 
                        value={circularForm.wood} 
                        onChange={e => {
                          setCircularForm({ ...circularForm, wood: e.target.value, base: "", color: "", veteado: "", brillo: "", baseMadera: "" });
                          setCustomCostUnit("");
                          setCustomPriceSuggested("");
                        }}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar madera...</option>
                        {cat.circular.map(t => (
                          <option key={t.name} value={t.name}>{t.name} &mdash; {fmt(t.pricePerM2)}/m²</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de Base *</label>
                      <select 
                        disabled={!circularForm.wood}
                        value={circularForm.base} 
                        onChange={e => setCircularForm({ ...circularForm, base: e.target.value })}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar base...</option>
                        {cat.circularOptions.baseTypes.map((b: string) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Microcemento specific fields */}
                  {circularForm.wood === "Microcemento" && (
                    <div className="bg-cream/30 border border-sand/80 rounded-xl p-3 flex flex-col gap-2.5">
                      <div className="text-[10px] font-bold text-terra uppercase tracking-wider">Especificaciones Microcemento</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Color</label>
                          <select 
                            value={circularForm.color} 
                            onChange={e => setCircularForm({ ...circularForm, color: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Color...</option>
                            {cat.circularOptions.microColores.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Veteado</label>
                          <select 
                            value={circularForm.veteado} 
                            onChange={e => setCircularForm({ ...circularForm, veteado: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Veteado...</option>
                            {cat.circularOptions.microVeteados.map((v: string) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Brillo</label>
                          <select 
                            value={circularForm.brillo} 
                            onChange={e => setCircularForm({ ...circularForm, brillo: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Brillo...</option>
                            {cat.circularOptions.microBrillos.map((b: string) => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] uppercase text-stone font-bold">Base Madera</label>
                          <select 
                            value={circularForm.baseMadera} 
                            onChange={e => setCircularForm({ ...circularForm, baseMadera: e.target.value })}
                            className="text-xs py-1.5 px-2 border border-sand rounded-lg bg-white text-brown focus:outline-none"
                          >
                            <option value="">Base madera...</option>
                            {(cat.circularOptions.baseMaderaTypes || DEFAULT_OPTIONS.baseMaderaTypes).map((bm: string) => <option key={bm} value={bm}>{bm}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diameter */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sand/40 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Diámetro (Metros)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Ej: 1.20" 
                          value={circularForm.diam} 
                          onChange={e => {
                            setCircularForm({ ...circularForm, diam: e.target.value });
                            setCustomCostUnit("");
                            setCustomPriceSuggested("");
                          }} 
                          className="w-32 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" 
                        />
                        <span className="text-xs text-stone font-medium">m</span>
                        {parseNum(circularForm.diam) > 0 && (
                          <span className="text-xs text-terra font-bold ml-1">
                            {parseNum(circularForm.diam).toFixed(2)} m de diámetro
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- RATONAS BUILDER ---------------- */}
              {activeAddTab === "ratona" && (
                <div className="bg-sand/10 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Tipo de madera</label>
                      <select 
                        value={ratonaForm.wood} 
                        onChange={e => {
                          setRatonaForm({ ...ratonaForm, wood: e.target.value });
                          setCustomCostUnit("");
                          setCustomPriceSuggested("");
                        }}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none disabled:bg-sand/20 disabled:text-stone/50 disabled:cursor-not-allowed w-full font-medium shadow-xs transition-colors cursor-pointer"
                      >
                        <option value="">Seleccionar madera...</option>
                        {cat.ratonas.map(r => (
                          <option key={r.name} value={r.name}>{r.name} &mdash; {fmt(r.pricePerM2)}/m²</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Medidas (Metros)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Ancho" 
                          value={ratonaForm.w} 
                          onChange={e => {
                            setRatonaForm({ ...ratonaForm, w: e.target.value });
                            setCustomCostUnit("");
                            setCustomPriceSuggested("");
                          }} 
                          className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" 
                        />
                        <span className="text-stone">×</span>
                        <input 
                          type="text" 
                          placeholder="Largo" 
                          value={ratonaForm.h} 
                          onChange={e => {
                            setRatonaForm({ ...ratonaForm, h: e.target.value });
                            setCustomCostUnit("");
                            setCustomPriceSuggested("");
                          }} 
                          className="w-24 text-center text-xs py-1.5 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none font-medium shadow-xs" 
                        />
                        {parseNum(ratonaForm.w) > 0 && parseNum(ratonaForm.h) > 0 && (
                          <span className="text-xs text-terra font-bold ml-2">
                            {(parseNum(ratonaForm.w) * parseNum(ratonaForm.h)).toFixed(2)} m²
                            {(parseNum(ratonaForm.w) * parseNum(ratonaForm.h)) < 1.4 && " (Mín: 1.4m²)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- OTROS / PERSONALIZADO BUILDER ---------------- */}
              {activeAddTab === "otro" && (
                <div className="bg-sand/10 border border-sand/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Nombre / Modelo *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Banqueta Island Petiribí / Espejo Vestidor"
                        value={otroForm.name} 
                        onChange={e => setOtroForm({ ...otroForm, name: e.target.value })}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-medium focus:ring-1 focus:ring-terra focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Categoría</label>
                      <select 
                        value={otroForm.category} 
                        onChange={e => setOtroForm({ ...otroForm, category: e.target.value })}
                        className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-sans focus:ring-1 focus:ring-terra focus:outline-none w-full font-medium shadow-xs cursor-pointer"
                      >
                        {categories.filter(c => c !== "todos").map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-wider uppercase text-stone font-bold">Detalle / Especificaciones Técnicas</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Altura 75cm · Madera Maciza Petiribí · Tapizado Cuero Negro"
                      value={otroForm.detail} 
                      onChange={e => setOtroForm({ ...otroForm, detail: e.target.value })}
                      className="text-xs py-2 px-3 border border-sand rounded-lg bg-white text-brown font-medium focus:ring-1 focus:ring-terra focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ---------------- LIVE PREVIEW SUMMARY BOX ---------------- */}
              <div className="bg-light-cream/70 border border-terra/30 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brown">
                    <Sparkles className="w-3.5 h-3.5 text-terra" />
                    <span>Resumen del Producto a Ingresar:</span>
                  </div>
                  <span className="px-2 py-0.5 bg-brown text-cream rounded-md text-[10px] font-bold">
                    {calculatedStockItem.category}
                  </span>
                </div>
                
                <div className="text-sm font-bold text-brown">
                  {calculatedStockItem.name || "Sin selección de modelo"}
                </div>
                {calculatedStockItem.detail && (
                  <div className="text-xs text-stone font-medium">
                    {calculatedStockItem.detail}
                  </div>
                )}
              </div>

              {/* ---------------- QUANTITY, COSTS & SUGGESTED PRICE ---------------- */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white border border-sand rounded-xl p-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Cantidad *</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={addQty}
                    onChange={e => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="p-2 border border-sand rounded-lg text-xs font-bold text-center text-brown bg-light-cream/30 focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Alerta Mínima</label>
                  <input 
                    type="number"
                    min={0}
                    value={addMinAlert}
                    onChange={e => setAddMinAlert(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="p-2 border border-sand rounded-lg text-xs font-bold text-center text-brown bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-stone">Costo Unitario ($)</label>
                    {calculatedStockItem.defaultCost > 0 && customCostUnit === "" && (
                      <span className="text-[9px] text-terra font-bold">Catálogo</span>
                    )}
                  </div>
                  <input 
                    type="number"
                    min={0}
                    placeholder={calculatedStockItem.defaultCost > 0 ? String(calculatedStockItem.defaultCost) : "0"}
                    value={customCostUnit !== "" ? customCostUnit : (calculatedStockItem.defaultCost || "")}
                    onChange={e => setCustomCostUnit(e.target.value)}
                    className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-right text-brown bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-stone">Precio Venta Sug. ($)</label>
                    {calculatedStockItem.defaultPrice > 0 && customPriceSuggested === "" && (
                      <span className="text-[9px] text-emerald-700 font-bold">Catálogo</span>
                    )}
                  </div>
                  <input 
                    type="number"
                    min={0}
                    placeholder={calculatedStockItem.defaultPrice > 0 ? String(calculatedStockItem.defaultPrice) : "0"}
                    value={customPriceSuggested !== "" ? customPriceSuggested : (calculatedStockItem.defaultPrice || "")}
                    onChange={e => setCustomPriceSuggested(e.target.value)}
                    className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-right text-brown bg-white focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>
              </div>

              {/* ---------------- TESORERÍA INTEGRATION ---------------- */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formRegisterPayment}
                      onChange={e => setFormRegisterPayment(e.target.checked)}
                      className="rounded text-terra focus:ring-terra cursor-pointer"
                    />
                    <span className="text-xs font-bold text-indigo-950">Registrar egreso de compra en Tesorería</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-900 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-200">
                    Total: {fmt(addQty * (calculatedStockItem.finalCost || 0))}
                  </span>
                </div>

                {formRegisterPayment && (
                  <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                    <span className="text-[11px] text-indigo-900 font-semibold">Descontar de:</span>
                    <select 
                      value={formAccount} 
                      onChange={e => setFormAccount(e.target.value as any)}
                      className="text-xs font-bold bg-white text-brown border border-sand rounded-lg py-1 px-3 focus:outline-none cursor-pointer"
                    >
                      <option value="Santander">Banco Santander</option>
                      <option value="Uala">Ualá / MP</option>
                      <option value="Efectivo">Caja Efectivo</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-sand rounded-xl text-xs font-bold text-stone hover:bg-cream/40 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="px-5 py-2 bg-terra hover:bg-[#A85B24] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  Guardar en Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: EDITAR PRODUCTO EN STOCK */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-sand rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brown text-cream p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-terra" />
                <h3 className="font-serif font-bold text-base text-cream">Editar Producto en Stock</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-cream/70 hover:text-cream text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-stone">Producto / Modelo *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="p-2 border border-sand rounded-lg text-xs font-bold text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-stone">Detalle / Acabado</label>
                  <input
                    type="text"
                    value={editingItem.detail || ""}
                    onChange={e => setEditingItem({ ...editingItem, detail: e.target.value })}
                    className="p-2 border border-sand rounded-lg text-xs text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Categoría</label>
                  <select
                    value={editingItem.category}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="p-2 border border-sand rounded-lg text-xs text-brown focus:ring-1 focus:ring-terra focus:outline-none cursor-pointer"
                  >
                    {categories.filter(c => c !== "todos").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Cantidad Actual</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.qty}
                    onChange={e => setEditingItem({ ...editingItem, qty: parseInt(e.target.value, 10) || 0 })}
                    className="p-2 border border-sand rounded-lg text-xs font-bold text-center text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Costo Unitario ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.costUnit}
                    onChange={e => setEditingItem({ ...editingItem, costUnit: parseFloat(e.target.value) || 0 })}
                    className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-right text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Precio Venta Sugerido ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.priceSuggested}
                    onChange={e => setEditingItem({ ...editingItem, priceSuggested: parseFloat(e.target.value) || 0 })}
                    className="p-2 border border-sand rounded-lg text-xs font-bold font-mono text-right text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-stone">Alerta Stock Mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.minAlertQty || 2}
                    onChange={e => setEditingItem({ ...editingItem, minAlertQty: parseInt(e.target.value, 10) || 0 })}
                    className="p-2 border border-sand rounded-lg text-xs text-center text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-sand rounded-xl text-xs font-bold text-stone hover:bg-cream/40 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-terra hover:bg-[#A85B24] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: AJUSTE RÁPIDO DE STOCK */}
      {/* ========================================================================= */}
      {adjustingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-sand rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-brown text-cream p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-terra" />
                <div>
                  <h3 className="font-serif font-bold text-base text-cream">Ajuste de Stock Físico</h3>
                  <p className="text-[11px] text-cream/70">{adjustingItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="text-cream/70 hover:text-cream text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="bg-sand/15 rounded-xl p-3 text-xs flex justify-between items-center">
                <span className="text-stone">Stock actual en sistema:</span>
                <span className="font-bold font-mono text-brown text-sm">{adjustingItem.qty} u.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-stone">Nueva Cantidad Disponible *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustQty(Math.max(0, adjustQty - 1))}
                    className="w-10 h-10 border border-sand rounded-xl bg-light-cream text-brown font-bold text-lg hover:bg-sand/30 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={adjustQty}
                    onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="flex-1 p-2 border border-sand rounded-xl text-center text-lg font-bold font-mono text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQty(adjustQty + 1)}
                    className="w-10 h-10 border border-sand rounded-xl bg-light-cream text-brown font-bold text-lg hover:bg-sand/30 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="text-[11px] text-stone text-center mt-1">
                  Variación: <strong className={adjustQty > adjustingItem.qty ? "text-emerald-700" : adjustQty < adjustingItem.qty ? "text-rose-600" : "text-stone"}>
                    {adjustQty - adjustingItem.qty > 0 ? `+${adjustQty - adjustingItem.qty}` : adjustQty - adjustingItem.qty} unidades
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-stone">Motivo del Ajuste</label>
                <input
                  type="text"
                  placeholder="ej. Rotura, conteo físico mensual, devolución..."
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  className="p-2 border border-sand rounded-xl text-xs text-brown focus:ring-1 focus:ring-terra focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 border border-sand rounded-xl text-xs font-bold text-stone hover:bg-cream/40 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdjust}
                  className="px-5 py-2 bg-terra hover:bg-[#A85B24] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 8. MODAL: DETALLE COMPLETO DE STOCK (FICHA DEL PRODUCTO) */}
      {/* ========================================================================= */}
      {selectedStockDetail && (
        <StockDetailModal
          isOpen={Boolean(selectedStockDetail)}
          onClose={() => setSelectedStockDetail(null)}
          item={stockList.find(s => s.id === selectedStockDetail.id) || selectedStockDetail}
          stockMovements={stockMovements}
          fmt={fmt}
          canEdit={canEdit}
          onEdit={(it) => {
            setEditingItem(it);
            setSelectedStockDetail(null);
          }}
          onAdjust={(it) => {
            setAdjustingItem(it);
            setAdjustQty(it.qty);
            setSelectedStockDetail(null);
          }}
          onDelete={(id) => {
            onDeleteStockItem(id);
            setSelectedStockDetail(null);
          }}
        />
      )}
    </div>
  );
};
