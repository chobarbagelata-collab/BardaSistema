import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Building2,
  Calendar,
  ArrowUpRight,
  BarChart2,
  ShoppingBag,
  CreditCard,
  RefreshCw
} from 'lucide-react';

interface ExecutiveDashboardProps {
  fmt: (val: number) => string;
  metrics?: {
    totalQuotes: number;
    totalVentaAcum: number;
    totalProfitAcum: number;
    remainingToCollect: number;
    avgProfitPerOrder: number;
  };
  salesCount?: number;
  resumenYear?: string;
  setResumenYear?: (v: string) => void;
  resumenMonth?: string;
  setResumenMonth?: (v: string) => void;
  yearsList?: string[];
  MONTHS_LIST?: { value: string; label: string }[];
  sales?: any[];
  paymentsLedger?: any[];
  fixedCosts?: any[];
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  fmt,
  resumenYear = 'todos',
  setResumenYear,
  resumenMonth = 'todos',
  setResumenMonth,
  yearsList = ['2026', '2025', '2024'],
  MONTHS_LIST = [
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
  ],
  sales = [],
  paymentsLedger = [],
  fixedCosts = []
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3M' | '6M' | '1Y'>('6M');

  // Active year for evolution chart
  const currentYearStr = new Date().getFullYear().toString();
  const activeYear = resumenYear === 'todos' ? currentYearStr : resumenYear;

  // Filtering for top KPIs based on resumenYear & resumenMonth
  const filteredSales = sales.filter(s => {
    if (!s.date) return false;
    const y = s.date.substring(0, 4);
    const m = s.date.substring(5, 7);
    const matchY = resumenYear === 'todos' || y === resumenYear;
    const matchM = resumenMonth === 'todos' || m === resumenMonth;
    return matchY && matchM;
  });

  const filteredFixedCosts = fixedCosts.filter(c => {
    const dateStr = c.date || (c.month ? `${c.month}-01` : '');
    if (!dateStr) return false;
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(5, 7);
    const matchY = resumenYear === 'todos' || y === resumenYear;
    const matchM = resumenMonth === 'todos' || m === resumenMonth;
    return matchY && matchM;
  });

  // Top KPI calculations (REAL DATA)
  const totalVentas = filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const cantidadVentas = filteredSales.length;
  const ventaPromedio = cantidadVentas > 0 ? Math.round(totalVentas / cantidadVentas) : 0;
  const totalCostoVentas = filteredSales.reduce((acc, s) => acc + (Number(s.totalCost) || 0), 0);
  const totalGastosFijos = filteredFixedCosts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const resultadoNeto = totalVentas - totalCostoVentas - totalGastosFijos;

  // Monthly data series calculation (REAL DATA)
  const ALL_MONTHS_MAP = [
    { code: '01', month: 'Ene' },
    { code: '02', month: 'Feb' },
    { code: '03', month: 'Mar' },
    { code: '04', month: 'Abr' },
    { code: '05', month: 'May' },
    { code: '06', month: 'Jun' },
    { code: '07', month: 'Jul' },
    { code: '08', month: 'Ago' },
    { code: '09', month: 'Sep' },
    { code: '10', month: 'Oct' },
    { code: '11', month: 'Nov' },
    { code: '12', month: 'Dic' }
  ];

  const fullYearData = ALL_MONTHS_MAP.map(mInfo => {
    // Sales in this month & activeYear
    const salesInM = sales.filter(s => s.date && s.date.substring(0, 4) === activeYear && s.date.substring(5, 7) === mInfo.code);
    const ventasM = salesInM.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const costOfGoodsM = salesInM.reduce((acc, s) => acc + (Number(s.totalCost) || 0), 0);

    // Direct Income in this month & activeYear
    const paymentsInM = paymentsLedger.filter(p => p.date && p.date.substring(0, 4) === activeYear && p.date.substring(5, 7) === mInfo.code);
    const otrosIngresosM = paymentsInM
      .filter(p => p.type === 'Ingreso Directo' || p.category === 'Aporte de Capital')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Fixed costs / expenses in this month & activeYear
    const fixedInM = fixedCosts.filter(c => {
      const dateStr = c.date || (c.month ? `${c.month}-01` : '');
      return dateStr.substring(0, 4) === activeYear && dateStr.substring(5, 7) === mInfo.code;
    });

    const comprasInM = fixedInM
      .filter(c => {
        const cat = (c.category || '').toLowerCase();
        return cat.includes('materia') || cat.includes('insumo') || cat.includes('compra') || cat.includes('proveedor');
      })
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0) + costOfGoodsM;

    const gastosInM = fixedInM
      .filter(c => {
        const cat = (c.category || '').toLowerCase();
        return !(cat.includes('materia') || cat.includes('insumo') || cat.includes('compra') || cat.includes('proveedor'));
      })
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    return {
      month: mInfo.month,
      code: mInfo.code,
      ventas: ventasM,
      otros: otrosIngresosM,
      compras: comprasInM,
      gastos: gastosInM
    };
  });

  // Filter display months according to selectedPeriod or resumenMonth
  let displayMonths = fullYearData;
  if (resumenMonth !== 'todos') {
    displayMonths = fullYearData.filter(m => m.code === resumenMonth);
  } else if (selectedPeriod === '3M') {
    const currentM = new Date().getMonth(); // 0..11
    const startM = Math.max(0, currentM - 2);
    displayMonths = fullYearData.slice(startM, currentM + 1);
  } else if (selectedPeriod === '6M') {
    const currentM = new Date().getMonth(); // 0..11
    const startM = Math.max(0, currentM - 5);
    displayMonths = fullYearData.slice(startM, currentM + 1);
  }

  // Period Totals
  const totalVentasPeriodo = displayMonths.reduce((acc, d) => acc + d.ventas, 0);
  const totalOtrosIngresosPeriodo = displayMonths.reduce((acc, d) => acc + d.otros, 0);
  const totalComprasPeriodo = displayMonths.reduce((acc, d) => acc + d.compras, 0);
  const totalGastosPeriodo = displayMonths.reduce((acc, d) => acc + d.gastos, 0);

  const maxVal = Math.max(...displayMonths.map(d => Math.max(d.ventas, d.compras, d.gastos, d.otros)), 1);

  // REAL TESORERÍA & BALANCES (from paymentsLedger)
  const cashTotal = paymentsLedger
    .filter(p => (p.account || 'Efectivo').toLowerCase() === 'efectivo')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const bankTotal = paymentsLedger
    .filter(p => (p.account || '').toLowerCase() !== 'efectivo')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalDisponible = cashTotal + bankTotal;

  // Recent movements
  const recentMovements = [...paymentsLedger]
    .filter(p => p.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // REAL CUENTAS POR COBRAR (from sales with pending balances)
  const salesWithPending = sales.filter(s => {
    const total = Number(s.total) || 0;
    const collected = Number(s.senaAmount) || 0;
    return total - collected > 0;
  });

  const totalVentasACobrar = salesWithPending.reduce((acc, s) => acc + (Number(s.total) - (Number(s.senaAmount) || 0)), 0);

  const now = new Date();
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0;
    const parsed = Date.parse(dateStr);
    if (isNaN(parsed)) return 0;
    const dt = new Date(parsed);
    return Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
  };

  const agingReceivables = {
    aVencer: 0,
    days0_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0
  };

  salesWithPending.forEach(s => {
    const pending = Number(s.total) - (Number(s.senaAmount) || 0);
    const days = getDaysDiff(s.date);
    if (days <= 0) agingReceivables.aVencer += pending;
    else if (days <= 30) agingReceivables.days0_30 += pending;
    else if (days <= 60) agingReceivables.days31_60 += pending;
    else if (days <= 90) agingReceivables.days61_90 += pending;
    else agingReceivables.days90Plus += pending;
  });

  // REAL CUENTAS POR PAGAR (from fixedCosts marked as pendingPayment)
  const pendingFixedCosts = fixedCosts.filter(c => c.pendingPayment === true);
  const totalComprasAPagar = pendingFixedCosts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  const agingPayables = {
    aVencer: 0,
    days0_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0
  };

  pendingFixedCosts.forEach(c => {
    const amt = Number(c.amount) || 0;
    const days = getDaysDiff(c.date || (c.month ? `${c.month}-01` : ''));
    if (days <= 0) agingPayables.aVencer += amt;
    else if (days <= 30) agingPayables.days0_30 += amt;
    else if (days <= 60) agingPayables.days31_60 += amt;
    else if (days <= 90) agingPayables.days61_90 += amt;
    else agingPayables.days90Plus += amt;
  });

  // Max aging value for minigraph bar heights
  const maxAgingRec = Math.max(agingReceivables.aVencer, agingReceivables.days0_30, agingReceivables.days31_60, agingReceivables.days61_90, agingReceivables.days90Plus, 1);
  const maxAgingPay = Math.max(agingPayables.aVencer, agingPayables.days0_30, agingPayables.days31_60, agingPayables.days61_90, agingPayables.days90Plus, 1);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* 1. CONTROLES DE FILTRO TEMPORAL Y PERIODO */}
      <div className="bg-[#3D1F0D] text-cream p-4 rounded-2xl shadow-md border border-terra/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-terra/20 rounded-xl text-terra border border-terra/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded-full">
                Dashboard Ejecutivo
              </span>
              <h2 className="font-serif text-base sm:text-lg font-bold text-cream">
                General de Control
              </h2>
            </div>
            <p className="text-xs text-cream/80 mt-0.5">
              Control en tiempo real de ingresos, ventas, gastos, tesorería y saldos vinculados.
            </p>
          </div>
        </div>

        {/* PILLS PERIODO + SELECTOR DE MES Y AÑO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#2C1609] border border-cream/20 rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium text-cream/80">Periodo:</span>
            <div className="flex items-center gap-1 bg-[#1A0C05] border border-cream/15 rounded-lg p-0.5">
              {(['3M', '6M', '1Y'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPeriod(p);
                    if (setResumenMonth) setResumenMonth('todos');
                  }}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
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

          <div className="flex items-center gap-1.5 bg-[#2C1609] border border-cream/20 rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium text-cream/80">Mes Puntual:</span>
            <select
              value={resumenMonth}
              onChange={e => {
                if (setResumenMonth) setResumenMonth(e.target.value);
              }}
              className="text-xs bg-[#1A0C05] text-cream font-bold rounded-lg py-1 px-2.5 border border-cream/15 focus:outline-none focus:border-terra cursor-pointer"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#2C1609] border border-cream/20 rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium text-cream/80">Año:</span>
            <select
              value={resumenYear}
              onChange={e => {
                if (setResumenYear) setResumenYear(e.target.value);
              }}
              className="text-xs bg-[#1A0C05] text-cream font-bold rounded-lg py-1 px-2.5 border border-cream/15 focus:outline-none focus:border-terra cursor-pointer"
            >
              <option value="todos">Todos</option>
              {yearsList.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {(resumenMonth !== 'todos' || resumenYear !== 'todos' || selectedPeriod !== '6M') && (
            <button
              onClick={() => {
                if (setResumenMonth) setResumenMonth('todos');
                if (setResumenYear) setResumenYear('todos');
                setSelectedPeriod('6M');
              }}
              className="p-2 bg-terra hover:bg-terra/80 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              title="Restablecer Filtros"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. TOP METRICS ROW (KPI CARDS - REAL DATA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VENTAS CREADAS */}
        <div className="bg-white border border-sand p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone uppercase tracking-wider mb-2">
            <span>Ventas Creadas</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-brown">
            {fmt(totalVentas)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mt-2">
            <span>Real acumulado</span>
            <span className="text-stone/70 font-normal">en periodo</span>
          </div>
        </div>

        {/* VENTA PROMEDIO */}
        <div className="bg-white border border-sand p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone uppercase tracking-wider mb-2">
            <span>Venta Promedio</span>
            <span className="p-1.5 bg-terra/10 text-terra rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-brown">
            {fmt(ventaPromedio)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-terra mt-2">
            <span>Ticket medio</span>
            <span className="text-stone/70 font-normal">por pedido</span>
          </div>
        </div>

        {/* CANTIDAD DE VENTAS */}
        <div className="bg-white border border-sand p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone uppercase tracking-wider mb-2">
            <span>Cantidad de Ventas</span>
            <span className="p-1.5 bg-cream text-brown rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-brown">
            {cantidadVentas} <span className="text-xs font-sans font-normal text-stone">pedidos</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mt-2">
            <span>Pedidos reales</span>
            <span className="text-stone/70 font-normal">registrados</span>
          </div>
        </div>

        {/* RESULTADO NETO */}
        <div className="bg-white border border-sand p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone uppercase tracking-wider mb-2">
            <span>Resultado Estimado</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-serif font-bold ${resultadoNeto >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
            {fmt(resultadoNeto)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mt-2">
            <span>Utilidad neta</span>
            <span className="text-stone/70 font-normal">estimada</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN SECTION: EVOLUTION CHART LINKED TO REAL DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-sand p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-sand/60">
              <div>
                <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-terra" />
                  Evolución Mensual de Operaciones (Datos Reales)
                </h3>
                <p className="text-xs text-stone">
                  Graficado en tiempo real según ventas, compras y gastos asentados en el sistema.
                </p>
              </div>

              {/* Leyenda de Colores */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-stone pt-1 sm:pt-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Ventas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Compras
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Gastos
                </span>
              </div>
            </div>

            {/* CHART GRID & SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-6 items-center">
              {/* CATEGORY TOTALS SUMMARY */}
              <div className="sm:col-span-4 flex flex-col gap-3.5 pr-0 sm:pr-4 sm:border-r border-sand/60">
                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Ventas</div>
                  <div className="text-lg font-serif font-bold text-emerald-800">{fmt(totalVentasPeriodo)}</div>
                  <div className="w-full bg-emerald-200 h-1 rounded-full mt-1.5">
                    <div className="bg-emerald-600 h-1 rounded-full w-full"></div>
                  </div>
                </div>

                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Otros Ingresos</div>
                  <div className="text-lg font-serif font-bold text-sky-700">{fmt(totalOtrosIngresosPeriodo)}</div>
                  <div className="w-full bg-sky-200 h-1 rounded-full mt-1.5">
                    <div className="bg-sky-500 h-1 rounded-full w-full"></div>
                  </div>
                </div>

                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Compras</div>
                  <div className="text-lg font-serif font-bold text-rose-700">{fmt(totalComprasPeriodo)}</div>
                  <div className="w-full bg-rose-200 h-1 rounded-full mt-1.5">
                    <div className="bg-rose-500 h-1 rounded-full w-full"></div>
                  </div>
                </div>

                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Gastos</div>
                  <div className="text-lg font-serif font-bold text-amber-700">{fmt(totalGastosPeriodo)}</div>
                  <div className="w-full bg-amber-200 h-1 rounded-full mt-1.5">
                    <div className="bg-amber-500 h-1 rounded-full w-full"></div>
                  </div>
                </div>
              </div>

              {/* BARS CHART WITH HOVER TOOLTIPS */}
              <div className="sm:col-span-8 flex items-end justify-between gap-2 sm:gap-4 h-64 pt-10 px-2 border-b border-sand/60">
                {displayMonths.map((d, i) => {
                  const vHeight = Math.min(100, Math.round((d.ventas / maxVal) * 100));
                  const cHeight = Math.min(100, Math.round((d.compras / maxVal) * 100));
                  const gHeight = Math.min(100, Math.round((d.gastos / maxVal) * 100));

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/col relative">
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                        
                        {/* Ventas Bar */}
                        <div
                          style={{ height: `${Math.max(vHeight, 4)}%` }}
                          className="relative group/bar flex flex-col items-center w-3 sm:w-4 bg-emerald-600 rounded-t-md transition-all hover:bg-emerald-500 cursor-pointer"
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                            <span className="text-[9px] text-cream/70 uppercase">Ventas {d.month}</span>
                            <span className="text-emerald-400 font-extrabold">{fmt(d.ventas)}</span>
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#3D1F0D] -mb-1"></div>
                          </div>
                        </div>

                        {/* Compras Bar */}
                        <div
                          style={{ height: `${Math.max(cHeight, 4)}%` }}
                          className="relative group/bar flex flex-col items-center w-3 sm:w-4 bg-rose-500 rounded-t-md transition-all hover:bg-rose-400 cursor-pointer"
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                            <span className="text-[9px] text-cream/70 uppercase">Compras {d.month}</span>
                            <span className="text-rose-400 font-extrabold">{fmt(d.compras)}</span>
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#3D1F0D] -mb-1"></div>
                          </div>
                        </div>

                        {/* Gastos Bar */}
                        <div
                          style={{ height: `${Math.max(gHeight, 4)}%` }}
                          className="relative group/bar flex flex-col items-center w-2.5 sm:w-3 bg-amber-500 rounded-t-md transition-all hover:bg-amber-400 cursor-pointer"
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                            <span className="text-[9px] text-cream/70 uppercase">Gastos {d.month}</span>
                            <span className="text-amber-400 font-extrabold">{fmt(d.gastos)}</span>
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#3D1F0D] -mb-1"></div>
                          </div>
                        </div>

                      </div>

                      <span className="text-[11px] font-bold text-stone mt-2 group-hover/col:text-brown transition-colors">
                        {d.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: REAL TESORERÍA / CAJAS Y BANCOS */}
        <div className="lg:col-span-4 bg-white border border-sand p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-sand/60 flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                <Wallet className="w-5 h-5 text-terra" />
                Tesorería y Saldos Reales
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                En Vivo
              </span>
            </div>

            {/* THREE BALANCE CARDS */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500 text-white rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">Total Disponible</div>
                    <div className="text-xl font-serif font-bold text-sky-950">{fmt(totalDisponible)}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-lg">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Total Cajas Efectivo</div>
                    <div className="text-lg font-serif font-bold text-amber-950">{fmt(cashTotal)}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500 text-white rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Total Bancos / MP</div>
                    <div className="text-lg font-serif font-bold text-rose-950">{fmt(bankTotal)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT MOVEMENTS MINI TABLE */}
            <div className="mt-5">
              <div className="text-[11px] font-bold text-stone uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Últimos Movimientos</span>
              </div>

              {recentMovements.length === 0 ? (
                <div className="text-xs text-stone italic py-3 text-center border border-sand/40 rounded-xl">
                  Sin movimientos registrados aún.
                </div>
              ) : (
                <div className="border border-sand rounded-xl overflow-hidden text-xs divide-y divide-sand/60">
                  {recentMovements.map((mov, idx) => (
                    <div key={mov.id || idx} className="p-2.5 bg-white flex items-center justify-between font-medium">
                      <div className="truncate mr-2">
                        <span className="text-stone block text-[10px]">
                          {mov.date} • {mov.account || 'Efectivo'}
                        </span>
                        <span className="text-brown font-bold truncate block">
                          {mov.clientName || mov.orderNum || 'Movimiento de caja'}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 shrink-0">
                        + {fmt(mov.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: DEBT & RECEIVABLES BREAKDOWN (REAL DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOTAL VENTAS A COBRAR */}
        <div className="bg-white border border-sand p-5 sm:p-6 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-sand/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Ventas a Cobrar</div>
                <div className="text-2xl font-serif font-bold text-emerald-800">
                  {fmt(totalVentasACobrar)}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              Cuentas por Cobrar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-5 items-center">
            {/* MINI BARS GRAPH WITH TOOLTIPS */}
            <div className="sm:col-span-5 flex items-end justify-between gap-1.5 h-28 bg-light-cream/50 p-3 rounded-xl border border-sand/40 pt-8">
              {[
                { label: 'A Vencer', value: agingReceivables.aVencer },
                { label: '0 a 30 Días', value: agingReceivables.days0_30 },
                { label: '31 a 60 Días', value: agingReceivables.days31_60 },
                { label: '61 a 90 Días', value: agingReceivables.days61_90 },
                { label: '+ de 90 Días', value: agingReceivables.days90Plus }
              ].map((item, idx) => {
                const heightPct = Math.min(100, Math.max(10, Math.round((item.value / maxAgingRec) * 100)));
                return (
                  <div key={idx} className="flex-1 group/aging relative flex items-end h-full">
                    <div className="opacity-0 group-hover/aging:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2 py-1 rounded-md shadow-xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                      <span className="text-[8px] text-cream/70 uppercase">{item.label}</span>
                      <span className="text-emerald-400 font-extrabold">{fmt(item.value)}</span>
                    </div>
                    <div
                      style={{ height: `${item.value > 0 ? heightPct : 6}%` }}
                      className={`w-full rounded-t transition-all cursor-pointer ${item.value > 0 ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sand/40'}`}
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* AGING INTERVALS BREAKDOWN */}
            <div className="sm:col-span-7 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">A VENCER</span>
                <span className="text-emerald-700 font-bold">{fmt(agingReceivables.aVencer)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">0 A 30 DÍAS</span>
                <span className="text-brown font-bold">{fmt(agingReceivables.days0_30)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">31 A 60 DÍAS</span>
                <span className="text-brown font-bold">{fmt(agingReceivables.days31_60)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">61 A 90 DÍAS</span>
                <span className="text-brown font-bold">{fmt(agingReceivables.days61_90)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1">
                <span className="text-stone font-bold">+ DE 90 DÍAS</span>
                <span className="text-rose-600 font-bold">{fmt(agingReceivables.days90Plus)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TOTAL COMPRAS A PAGAR */}
        <div className="bg-white border border-sand p-5 sm:p-6 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-sand/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Compras a Pagar</div>
                <div className="text-2xl font-serif font-bold text-rose-800">
                  {fmt(totalComprasAPagar)}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
              Cuentas por Pagar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-5 items-center">
            <div className="sm:col-span-5 flex items-end justify-between gap-1.5 h-28 bg-light-cream/50 p-3 rounded-xl border border-sand/40 pt-8">
              {[
                { label: 'A Vencer', value: agingPayables.aVencer },
                { label: '0 a 30 Días', value: agingPayables.days0_30 },
                { label: '31 a 60 Días', value: agingPayables.days31_60 },
                { label: '61 a 90 Días', value: agingPayables.days61_90 },
                { label: '+ de 90 Días', value: agingPayables.days90Plus }
              ].map((item, idx) => {
                const heightPct = Math.min(100, Math.max(10, Math.round((item.value / maxAgingPay) * 100)));
                return (
                  <div key={idx} className="flex-1 group/aging relative flex items-end h-full">
                    <div className="opacity-0 group-hover/aging:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2 py-1 rounded-md shadow-xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                      <span className="text-[8px] text-cream/70 uppercase">{item.label}</span>
                      <span className="text-rose-400 font-extrabold">{fmt(item.value)}</span>
                    </div>
                    <div
                      style={{ height: `${item.value > 0 ? heightPct : 6}%` }}
                      className={`w-full rounded-t transition-all cursor-pointer ${item.value > 0 ? 'bg-rose-600 hover:bg-rose-500' : 'bg-sand/40'}`}
                    ></div>
                  </div>
                );
              })}
            </div>

            <div className="sm:col-span-7 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">A VENCER</span>
                <span className="text-emerald-700 font-bold">{fmt(agingPayables.aVencer)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">0 A 30 DÍAS</span>
                <span className="text-brown font-bold">{fmt(agingPayables.days0_30)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">31 A 60 DÍAS</span>
                <span className="text-brown font-bold">{fmt(agingPayables.days31_60)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">61 A 90 DÍAS</span>
                <span className="text-brown font-bold">{fmt(agingPayables.days61_90)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1">
                <span className="text-stone font-bold">+ DE 90 DÍAS</span>
                <span className="text-rose-600 font-bold">{fmt(agingPayables.days90Plus)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
