import React from 'react';
import {
  TrendingUp,
  FileText,
  ShoppingBag,
  RefreshCw,
  DollarSign,
  Clock,
  Layers,
  Pencil,
  Trash2,
  Check,
  CheckCircle,
  BarChart2,
  Filter,
  ArrowRight,
  Phone,
  Users,
  Target,
  Award
} from 'lucide-react';

interface CommercialFunnelDashboardProps {
  fmt: (val: number) => string;
  metrics: {
    totalQuotes: number;
    totalVentaAcum: number;
    totalProfitAcum: number;
    remainingToCollect: number;
    avgProfitPerOrder: number;
    conversionRate: number;
    pendingDeliveryCount: number;
    categoryTotals: Record<string, number>;
  };
  dashboardFilteredSales: any[];
  resumenYear: string;
  setResumenYear: (v: string) => void;
  resumenMonth: string;
  setResumenMonth: (v: string) => void;
  yearsList: string[];
  MONTHS_LIST: { value: string; label: string }[];
  canEditResumen: boolean;
  funnelRegYear: string;
  setFunnelRegYear: (v: string) => void;
  funnelRegMonth: string;
  setFunnelRegMonth: (v: string) => void;
  funnelRegPhones: number;
  setFunnelRegPhones: React.Dispatch<React.SetStateAction<number>>;
  funnelRegVisits: number;
  setFunnelRegVisits: React.Dispatch<React.SetStateAction<number>>;
  handleSaveFunnelRegistry: () => void;
  funnelSaveSuccess: boolean;
  funnelOverrides: Record<string, { phones: number; visits: number }>;
  savedFunnelEntries: { key: string; year: string; month: string; monthLabel: string; phones: number; visits: number }[];
  setFunnelOverrides: React.Dispatch<React.SetStateAction<Record<string, { phones: number; visits: number }>>>;
  activeFunnelData: { phones: number; visits: number };
  subproductCategory: string;
  setSubproductCategory: (v: string) => void;
  getTopSubproducts: (cat: string) => any[];
}

export const CommercialFunnelDashboard: React.FC<CommercialFunnelDashboardProps> = ({
  fmt,
  metrics,
  dashboardFilteredSales,
  resumenYear,
  setResumenYear,
  resumenMonth,
  setResumenMonth,
  yearsList,
  MONTHS_LIST,
  canEditResumen,
  funnelRegYear,
  setFunnelRegYear,
  funnelRegMonth,
  setFunnelRegMonth,
  funnelRegPhones,
  setFunnelRegPhones,
  funnelRegVisits,
  setFunnelRegVisits,
  handleSaveFunnelRegistry,
  funnelSaveSuccess,
  funnelOverrides,
  savedFunnelEntries,
  setFunnelOverrides,
  activeFunnelData,
  subproductCategory,
  setSubproductCategory,
  getTopSubproducts
}) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<'3M' | '6M' | '1Y'>('6M');

  // Conversion calculations
  const totalQuotes = metrics.totalQuotes || 0;
  const phones = activeFunnelData.phones || 0;
  const visits = activeFunnelData.visits || 0;
  const orders = dashboardFilteredSales.length || 0;

  const cvrQuotesToPhones = totalQuotes > 0 ? ((phones / totalQuotes) * 100).toFixed(1) : '0.0';
  const cvrPhonesToVisits = phones > 0 ? ((visits / phones) * 100).toFixed(1) : '0.0';
  const cvrVisitsToOrders = visits > 0 ? ((orders / visits) * 100).toFixed(1) : '0.0';
  const cvrOrdersToPhones = phones > 0 ? ((orders / phones) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* 1. HEADER BANNER + CONTROLES DE FILTRO TEMPORAL Y PERIODO (ESTILO CONTAGRAM) */}
      <div className="bg-[#3D1F0D] text-cream p-4 rounded-2xl shadow-md border border-terra/30 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-terra/20 rounded-xl text-terra border border-terra/30 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded-full">
                Dashboard de Conversión
              </span>
              <h2 className="font-serif text-base sm:text-lg font-bold text-cream">
                Embudo Comercial e Indicadores
              </h2>
            </div>
            <p className="text-xs text-cream/80 mt-0.5">
              Análisis de conversión: Presupuestos → Teléfonos → Visitas → Pedidos.
            </p>
          </div>
        </div>

        {/* CONTROLES DE FILTRO TEMPORAL DE PERIODO (ESTILO CONTAGRAM) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          {/* PILLS 3M / 6M / 1Y */}
          <div className="flex items-center gap-2 bg-[#2C1609] border border-cream/20 rounded-xl px-2.5 py-1.5">
            <span className="text-xs font-medium text-cream/80 whitespace-nowrap">Periodo:</span>
            <div className="flex items-center gap-0.5 bg-[#1A0C05] border border-cream/15 rounded-lg p-0.5">
              {(['3M', '6M', '1Y'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPeriod(p);
                    setResumenMonth('todos');
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                    selectedPeriod === p && resumenMonth === 'todos'
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
          <div className="flex items-center gap-1.5 bg-[#2C1609] border border-cream/20 rounded-xl px-2.5 py-1.5">
            <span className="text-xs font-medium text-cream/80 whitespace-nowrap">Mes Puntual:</span>
            <select
              value={resumenMonth}
              onChange={e => setResumenMonth(e.target.value)}
              className="text-xs bg-[#1A0C05] text-cream font-bold rounded-lg py-1 px-2 border border-cream/15 focus:outline-none focus:border-terra cursor-pointer"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* AÑO DROPDOWN */}
          <div className="flex items-center gap-1.5 bg-[#2C1609] border border-cream/20 rounded-xl px-2.5 py-1.5">
            <span className="text-xs font-medium text-cream/80 whitespace-nowrap">Año:</span>
            <select
              value={resumenYear}
              onChange={e => setResumenYear(e.target.value)}
              className="text-xs bg-[#1A0C05] text-cream font-bold rounded-lg py-1 px-2 border border-cream/15 focus:outline-none focus:border-terra cursor-pointer"
            >
              <option value="todos">Todos</option>
              {yearsList.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {(resumenYear !== 'todos' || resumenMonth !== 'todos' || selectedPeriod !== '6M') && (
            <button
              onClick={() => {
                setResumenYear('todos');
                setResumenMonth('todos');
                setSelectedPeriod('6M');
              }}
              className="p-2 bg-terra hover:bg-terra/80 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
              title="Restablecer Filtros"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. TOP METRICS ROW (6 KPI CARDS ESTILO CONTAGRAM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Presupuestos */}
        <div className="bg-white border border-sand p-4 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">
            <span>Presupuestos</span>
            <span className="p-1.5 bg-cream/70 text-brown rounded-lg">
              <FileText className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-serif font-bold text-brown">{metrics.totalQuotes}</div>
          <div className="text-[10px] text-stone mt-1">Guardados / Impresos</div>
        </div>

        {/* Pedidos */}
        <div className="bg-white border border-sand p-4 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">
            <span>Pedidos</span>
            <span className="p-1.5 bg-terra/10 text-terra rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-serif font-bold text-brown">{orders}</div>
          <div className="text-[11px] text-terra font-bold mt-1">{fmt(metrics.totalVentaAcum)}</div>
        </div>

        {/* Tasa de Conversión Global */}
        <div className="bg-white border border-sand p-4 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">
            <span>Conversión Global</span>
            <span className="p-1.5 bg-brown/10 text-brown rounded-lg">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-serif font-bold text-brown">
            {metrics.conversionRate ? `${metrics.conversionRate.toFixed(1)}%` : '0.0%'}
          </div>
          <div className="text-[10px] text-stone mt-1">Pedidos / Presupuestos</div>
        </div>

        {/* Por Cobrar */}
        <div className="bg-white border border-sand p-4 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">
            <span>Por Cobrar</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-800">{fmt(metrics.remainingToCollect)}</div>
          <div className="text-[10px] text-stone mt-1">Saldos pendientes</div>
        </div>

        {/* Pendientes Entrega */}
        <div className="bg-white border border-sand p-4 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">
            <span>Pendientes Entrega</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-serif font-bold text-amber-800">{metrics.pendingDeliveryCount}</div>
          <div className="text-[10px] text-stone mt-1">En taller / producción</div>
        </div>

        {/* Ganancia Acumulada */}
        <div className="bg-white border border-sand p-4 rounded-2xl shadow-xs hover:shadow-sm transition-all bg-gradient-to-br from-white to-light-cream">
          <div className="flex items-center justify-between text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">
            <span>Ganancia Acumulada</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-800">{fmt(metrics.totalProfitAcum)}</div>
          <div className="text-[10px] text-stone mt-1">
            Prom.: <strong className="text-emerald-800">{fmt(Math.round(metrics.avgProfitPerOrder))}</strong>
          </div>
        </div>
      </div>

      {/* 3. EMBUDO PRINCIPAL + PANEL DE REGISTRO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PANEL DE REGISTRO INTERACTIVO (4 COLS) */}
        <div className={`lg:col-span-4 bg-white border border-sand rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between ${!canEditResumen ? 'pointer-events-none opacity-80 select-none' : ''}`}>
          <div>
            <div className="pb-3 border-b border-sand/60 flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                <Pencil className="w-4 h-4 text-terra" />
                Registro Manual de Embudo
              </h3>
              <span className="text-[10px] bg-terra/10 text-terra font-bold px-2 py-0.5 rounded">
                Ingreso Mensual
              </span>
            </div>

            <p className="text-xs text-stone my-3">
              Cargá los contactos obtenidos (teléfonos) y las visitas agendadas al showroom para este periodo.
            </p>

            {/* SELECCIÓN DE PERIODO DENTRO DEL PANEL */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-light-cream/60 border border-sand/50 rounded-xl mb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase font-bold text-stone">Año a registrar</span>
                <select
                  value={funnelRegYear}
                  onChange={e => setFunnelRegYear(e.target.value)}
                  className="text-xs bg-white border border-sand rounded-lg py-1 px-2 font-semibold text-brown cursor-pointer"
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
                  className="text-xs bg-white border border-sand rounded-lg py-1 px-2 font-semibold text-brown cursor-pointer"
                >
                  {MONTHS_LIST.filter(m => m.value !== 'todos').map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CAMPOS CON BOTONES + Y - */}
            <div className="flex flex-col gap-3">
              {/* Teléfonos Obtenidos */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-light-cream/40 border border-sand/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-brown flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-terra" />
                    Teléfonos Obtenidos
                  </label>
                  {funnelOverrides[`${funnelRegYear}-${funnelRegMonth}`] && (
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">
                      Guardado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFunnelRegPhones(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold transition-all cursor-pointer"
                  >-</button>
                  <input
                    type="number"
                    value={funnelRegPhones || ''}
                    onChange={e => setFunnelRegPhones(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-bold font-mono text-sm py-1 bg-white border border-sand rounded-lg focus:outline-none focus:border-terra"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setFunnelRegPhones(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold transition-all cursor-pointer"
                  >+</button>
                </div>
              </div>

              {/* Visitas Coordinadas */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-light-cream/40 border border-sand/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-brown flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brown" />
                    Visitas Coordinadas
                  </label>
                  {funnelOverrides[`${funnelRegYear}-${funnelRegMonth}`] && (
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">
                      Guardado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFunnelRegVisits(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold transition-all cursor-pointer"
                  >-</button>
                  <input
                    type="number"
                    value={funnelRegVisits || ''}
                    onChange={e => setFunnelRegVisits(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-bold font-mono text-sm py-1 bg-white border border-sand rounded-lg focus:outline-none focus:border-terra"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => setFunnelRegVisits(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-sand/30 hover:bg-sand/60 text-xs font-bold transition-all cursor-pointer"
                  >+</button>
                </div>
              </div>

              {/* Botón de Guardar */}
              <button
                type="button"
                onClick={handleSaveFunnelRegistry}
                className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
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

            {/* HISTORIAL DE REGISTROS ALMACENADOS */}
            {savedFunnelEntries.length > 0 && (
              <div className="mt-5 pt-3.5 border-t border-sand/60">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block mb-2">Registros Almacenados</span>
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
                          className="p-1 text-stone hover:text-rose-600 hover:bg-cream/50 rounded transition-all cursor-pointer"
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

          {/* TASAS RESUMEN DE CONVERSIÓN */}
          <div className="flex flex-col gap-2.5 mt-5 pt-4 border-t border-sand">
            <div className="flex justify-between items-center p-3 bg-terra/5 border border-terra/20 rounded-xl">
              <div>
                <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">Conversión Pedidos / Teléfonos</span>
                <span className="text-[9px] text-stone block">Efectividad comercial directa</span>
              </div>
              <strong className="text-xl font-serif font-bold text-terra">{cvrOrdersToPhones}%</strong>
            </div>

            <div className="flex justify-between items-center p-3 bg-brown/5 border border-brown/20 rounded-xl">
              <div>
                <span className="text-[10px] text-stone font-bold uppercase tracking-wider block">Conversión Pedidos / Visitas</span>
                <span className="text-[9px] text-stone block">Cierre de ventas en Showroom</span>
              </div>
              <strong className="text-xl font-serif font-bold text-brown">{cvrVisitsToOrders}%</strong>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: VISUAL CONVERSION FUNNEL (8 COLS) */}
        <div className="lg:col-span-8 bg-white border border-sand rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-sand/60 flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                <Layers className="w-5 h-5 text-terra" />
                Embudo de Conversión de Pasos Iguales
              </h3>
              <span className="text-[11px] font-bold text-stone">
                Filtro actual: <strong className="text-brown">{resumenMonth === 'todos' ? 'Todo el Año' : MONTHS_LIST.find(m => m.value === resumenMonth)?.label} {resumenYear}</strong>
              </span>
            </div>

            {/* 4 EQUAL SQUARE CARDS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              
              {/* STEP 1: PRESUPUESTOS */}
              <div className="aspect-square bg-brown text-cream rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">Paso 1</span>
                  <span className="text-[10px] font-bold font-mono bg-cream/15 px-2 py-0.5 rounded-full">1°</span>
                </div>
                <div className="my-auto text-center">
                  <span className="text-3xl sm:text-4xl font-serif font-bold block">{totalQuotes}</span>
                  <span className="text-xs font-semibold opacity-90 block mt-1">Presupuestos</span>
                </div>
                <div className="text-[9px] opacity-70 text-center uppercase tracking-wider">Emitidos</div>
              </div>

              {/* STEP 2: TELÉFONOS */}
              <div className="aspect-square bg-terra text-white rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">Paso 2</span>
                  <span className="text-[10px] font-bold font-mono bg-white/15 px-2 py-0.5 rounded-full">2°</span>
                </div>
                <div className="my-auto text-center">
                  <span className="text-3xl sm:text-4xl font-serif font-bold block">{phones}</span>
                  <span className="text-xs font-semibold opacity-90 block mt-1">Teléfonos</span>
                </div>
                <div className="text-[9px] opacity-70 text-center uppercase tracking-wider">Contactos</div>
              </div>

              {/* STEP 3: VISITAS */}
              <div className="aspect-square bg-light-cream border border-sand text-brown rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-stone">Paso 3</span>
                  <span className="text-[10px] font-bold font-mono bg-sand/40 px-2 py-0.5 rounded-full text-brown">3°</span>
                </div>
                <div className="my-auto text-center">
                  <span className="text-3xl sm:text-4xl font-serif font-bold block text-brown">{visits}</span>
                  <span className="text-xs font-semibold text-brown/95 block mt-1">Visitas</span>
                </div>
                <div className="text-[9px] text-stone text-center uppercase tracking-wider">Showroom</div>
              </div>

              {/* STEP 4: PEDIDOS */}
              <div className="aspect-square bg-emerald-800 text-white rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">Resultado</span>
                  <span className="text-[10px] font-bold font-mono bg-white/15 px-2 py-0.5 rounded-full">✓</span>
                </div>
                <div className="my-auto text-center">
                  <span className="text-3xl sm:text-4xl font-serif font-bold block">{orders}</span>
                  <span className="text-xs font-semibold opacity-90 block mt-1">Pedidos</span>
                </div>
                <div className="text-[9px] opacity-70 text-center uppercase tracking-wider">Confirmados</div>
              </div>

            </div>

            {/* CVR CONNECTORS BETWEEN STEPS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-sand/60">
              
              {/* CVR 1 -> 2 */}
              <div className="flex flex-col items-center p-3.5 bg-terra/5 border border-terra/20 rounded-xl text-center">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block mb-1">
                  1 → 2: Tasa de Contacto
                </span>
                <strong className="text-xl font-serif text-terra font-bold">
                  {cvrQuotesToPhones}%
                </strong>
                <span className="text-[10px] text-stone mt-0.5">Presupuestos que brindan teléfono</span>
              </div>

              {/* CVR 2 -> 3 */}
              <div className="flex flex-col items-center p-3.5 bg-brown/5 border border-brown/20 rounded-xl text-center">
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block mb-1">
                  2 → 3: Agendamiento Showroom
                </span>
                <strong className="text-xl font-serif text-brown font-bold">
                  {cvrPhonesToVisits}%
                </strong>
                <span className="text-[10px] text-stone mt-0.5">Contactos que coordinaron visita</span>
              </div>

              {/* CVR 3 -> 4 */}
              <div className="flex flex-col items-center p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  3 → 4: Cierre de Venta
                </span>
                <strong className="text-xl font-serif text-emerald-700 font-bold">
                  {cvrVisitsToOrders}%
                </strong>
                <span className="text-[10px] text-emerald-700 mt-0.5">Visitas que confirmaron pedido</span>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* 4. BOTTOM SECTION: CATEGORY SALES & LEADERBOARD VARIANTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* VENTAS POR CATEGORÍA DE PRODUCTO */}
        <div className="bg-white border border-sand rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="pb-3 border-b border-sand/60 mb-4 flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-terra" />
              Ventas por Categoría de Producto
            </h3>
            <span className="text-[10px] font-bold text-stone uppercase">Participación</span>
          </div>

          <div className="flex flex-col gap-4">
            {Object.entries(metrics.categoryTotals || {}).map(([cat, total]) => {
              const numTotal = Number(total) || 0;
              const totalSales = metrics.totalVentaAcum || 1;
              const percent = Math.round((numTotal / totalSales) * 100);
              return (
                <div key={cat} className="flex flex-col gap-1.5 group/cat relative">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-brown">{cat}</span>
                    <span className="text-stone font-semibold">{fmt(numTotal)} ({percent}%)</span>
                  </div>
                  <div className="relative w-full bg-light-cream rounded-full h-3 overflow-hidden border border-sand/40 cursor-pointer">
                    {/* HOVER TOOLTIP */}
                    <div className="opacity-0 group-hover/cat:opacity-100 pointer-events-none absolute -top-8 right-2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md shadow-xl whitespace-nowrap z-20 border border-sand/30">
                      {cat}: <span className="text-terra font-extrabold">{fmt(numTotal)}</span> ({percent}%)
                    </div>
                    <div 
                      className="bg-terra h-full rounded-full transition-all duration-300 group-hover/cat:bg-terra/80"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VARIANTES MÁS VENDIDAS LEADERBOARD */}
        <div className="bg-white border border-sand rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand/60 pb-3 mb-4">
            <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
              <Award className="w-5 h-5 text-terra" />
              Variantes más Vendidas
            </h3>
            
            {/* CATEGORY SELECTOR */}
            <select
              value={subproductCategory}
              onChange={e => setSubproductCategory(e.target.value)}
              className="text-xs bg-light-cream border border-sand rounded-lg py-1 px-2.5 focus:outline-none focus:border-terra font-bold text-brown cursor-pointer"
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
                <div className="text-center py-12 text-stone italic font-serif text-xs flex-1 flex items-center justify-center">
                  No hay ventas registradas para {subproductCategory} en el período seleccionado.
                </div>
              );
            }
            
            const maxQty = Math.max(...topSubs.map(s => s.qty), 1);

            return (
              <div className="flex flex-col gap-2.5">
                {topSubs.map((sub, idx) => {
                  const percent = Math.round((sub.qty / maxQty) * 100);
                  return (
                    <div key={idx} className="flex flex-col gap-1 bg-light-cream/40 border border-sand/30 rounded-xl p-3 hover:bg-light-cream/80 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-xs font-bold text-brown flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-brown text-cream text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {sub.name}
                          </div>
                          <div className="text-[10px] text-stone ml-6 font-medium">{sub.details}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-terra">{sub.qty} unidades</div>
                          <div className="text-[10px] text-stone font-semibold mt-0.5">{fmt(sub.revenue)}</div>
                        </div>
                      </div>
                      
                      {/* MINI BAR INDICATOR */}
                      <div className="w-full bg-sand/30 rounded-full h-1.5 mt-1 overflow-hidden ml-6 max-w-[calc(100%-24px)]">
                        <div 
                          className="bg-terra h-full rounded-full transition-all duration-300"
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
    </div>
  );
};
