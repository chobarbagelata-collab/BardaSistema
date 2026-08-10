import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Building2,
  Calendar,
  ArrowUpRight,
  BarChart2,
  FileText,
  ShoppingBag,
  CreditCard,
  Layers,
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
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  fmt,
  metrics = {
    totalQuotes: 12,
    totalVentaAcum: 1852000,
    totalProfitAcum: 620000,
    remainingToCollect: 380000,
    avgProfitPerOrder: 155000
  },
  salesCount = 8,
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
  ]
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3M' | '6M' | '1Y'>('6M');

  // Calculation or realistic mock values aligned with Contagram layout
  const totalVentas = metrics.totalVentaAcum || 1852000;
  const cantidadVentas = salesCount || 8;
  const ventaPromedio = cantidadVentas > 0 ? Math.round(totalVentas / cantidadVentas) : 0;
  const resultadoNeto = metrics.totalProfitAcum || 620000;

  // Monthly data series
  const monthsData = [
    { month: 'Ene', code: '01', ventas: 110000, otros: 10000, compras: 45000, gastos: 20000 },
    { month: 'Feb', code: '02', ventas: 140000, otros: 15000, compras: 50000, gastos: 22000 },
    { month: 'Mar', code: '03', ventas: 185000, otros: 12000, compras: 65000, gastos: 25000 },
    { month: 'Abr', code: '04', ventas: 210000, otros: 20000, compras: 70000, gastos: 28000 },
    { month: 'May', code: '05', ventas: 162510, otros: 10000, compras: 25926, gastos: 15000 },
    { month: 'Jun', code: '06', ventas: 240000, otros: 25000, compras: 85000, gastos: 30000 }
  ];

  // Filter months data based on selectedPeriod or resumenMonth
  const visibleMonthsData = resumenMonth !== 'todos'
    ? monthsData.filter(m => m.code === resumenMonth || m.month.toLowerCase() === resumenMonth.toLowerCase())
    : selectedPeriod === '3M'
    ? monthsData.slice(-3)
    : selectedPeriod === '6M'
    ? monthsData.slice(-6)
    : monthsData;

  const displayMonths = visibleMonthsData.length > 0 ? visibleMonthsData : monthsData;
  const maxVal = Math.max(...displayMonths.map(d => Math.max(d.ventas, d.compras, d.gastos, 10000)));

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* 1. CONTROLES DE FILTRO TEMPORAL Y PERIODO (ESTILO CONTAGRAM DE LA FOTO) */}
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
              Control de ingresos, compras, tesorería y saldos a cobrar / pagar.
            </p>
          </div>
        </div>

        {/* PILLS PERIODO + SELECTOR DE MES PUNTUAL */}
        <div className="flex flex-wrap items-center gap-3">
          {/* PILLS 3M / 6M / 1Y (IDÉNTICO A LA SEGUNDA FOTO) */}
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

          {/* MES PUNTUAL DROPDOWN */}
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

          {/* AÑO DROPDOWN */}
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

          {/* BOTÓN RESTABLECER */}
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

      {/* 2. TOP METRICS ROW (KPI CARDS) */}
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
            <span>↑ +12.4%</span>
            <span className="text-stone/70 font-normal">vs periodo anterior</span>
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
            <span>↑ +5.8%</span>
            <span className="text-stone/70 font-normal">vs periodo anterior</span>
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
            <span>↑ +30.0%</span>
            <span className="text-stone/70 font-normal">vs periodo anterior</span>
          </div>
        </div>

        {/* RESULTADO (GANANCIA NETA) */}
        <div className="bg-white border border-sand p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone uppercase tracking-wider mb-2">
            <span>Resultado Estimado</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-800">
            {fmt(resultadoNeto)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mt-2">
            <span>↑ +18.2%</span>
            <span className="text-stone/70 font-normal">margen operativo</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN SECTION: EVOLUTION CHART WITH INTERACTIVE HOVER TOOLTIPS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT/CENTER: EVOLUCIÓN MENSUAL (BARS & TOTALS) */}
        <div className="lg:col-span-8 bg-white border border-sand p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-sand/60">
              <div>
                <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-terra" />
                  Evolución Mensual de Operaciones
                </h3>
                <p className="text-xs text-stone">
                  Pasa el cursor por arriba de las barras para ver el valor exacto formateado.
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
                  <div className="text-lg font-serif font-bold text-emerald-800">{fmt(totalVentas)}</div>
                  <div className="w-full bg-emerald-200 h-1 rounded-full mt-1.5">
                    <div className="bg-emerald-600 h-1 rounded-full w-full"></div>
                  </div>
                </div>

                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Otros Ingresos</div>
                  <div className="text-lg font-serif font-bold text-sky-700">{fmt(92000)}</div>
                  <div className="w-full bg-sky-200 h-1 rounded-full mt-1.5">
                    <div className="bg-sky-500 h-1 rounded-full w-[40%]"></div>
                  </div>
                </div>

                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Compras</div>
                  <div className="text-lg font-serif font-bold text-rose-700">{fmt(340926)}</div>
                  <div className="w-full bg-rose-200 h-1 rounded-full mt-1.5">
                    <div className="bg-rose-500 h-1 rounded-full w-[65%]"></div>
                  </div>
                </div>

                <div className="bg-light-cream/80 p-3 rounded-xl border border-sand/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone">Total Gastos</div>
                  <div className="text-lg font-serif font-bold text-amber-700">{fmt(135000)}</div>
                  <div className="w-full bg-amber-200 h-1 rounded-full mt-1.5">
                    <div className="bg-amber-500 h-1 rounded-full w-[35%]"></div>
                  </div>
                </div>
              </div>

              {/* BARS CHART WITH RICH TOOLTIPS ON HOVER */}
              <div className="sm:col-span-8 flex items-end justify-between gap-2 sm:gap-4 h-64 pt-10 px-2 border-b border-sand/60">
                {displayMonths.map((d, i) => {
                  const vHeight = Math.round((d.ventas / maxVal) * 100);
                  const cHeight = Math.round((d.compras / maxVal) * 100);
                  const gHeight = Math.round((d.gastos / maxVal) * 100);

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/col relative">
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                        
                        {/* Ventas Bar */}
                        <div
                          style={{ height: `${vHeight}%` }}
                          className="relative group/bar flex flex-col items-center w-3 sm:w-4 bg-emerald-600 rounded-t-md transition-all hover:bg-emerald-500 cursor-pointer"
                        >
                          {/* HOVER TOOLTIP */}
                          <div className="opacity-0 group-hover/bar:opacity-100 pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                            <span className="text-[9px] text-cream/70 uppercase">Ventas {d.month}</span>
                            <span className="text-emerald-400 font-extrabold">{fmt(d.ventas)}</span>
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#3D1F0D] -mb-1"></div>
                          </div>
                        </div>

                        {/* Compras Bar */}
                        <div
                          style={{ height: `${cHeight}%` }}
                          className="relative group/bar flex flex-col items-center w-3 sm:w-4 bg-rose-500 rounded-t-md transition-all hover:bg-rose-400 cursor-pointer"
                        >
                          {/* HOVER TOOLTIP */}
                          <div className="opacity-0 group-hover/bar:opacity-100 pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                            <span className="text-[9px] text-cream/70 uppercase">Compras {d.month}</span>
                            <span className="text-rose-400 font-extrabold">{fmt(d.compras)}</span>
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#3D1F0D] -mb-1"></div>
                          </div>
                        </div>

                        {/* Gastos Bar */}
                        <div
                          style={{ height: `${gHeight}%` }}
                          className="relative group/bar flex flex-col items-center w-2.5 sm:w-3 bg-amber-500 rounded-t-md transition-all hover:bg-amber-400 cursor-pointer"
                        >
                          {/* HOVER TOOLTIP */}
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

        {/* RIGHT SIDEBAR: TESORERÍA / CAJAS Y BANCOS */}
        <div className="lg:col-span-4 bg-white border border-sand p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-sand/60 flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-brown flex items-center gap-2">
                <Wallet className="w-5 h-5 text-terra" />
                Tesorería y Saldos
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                En Vivo
              </span>
            </div>

            {/* THREE BALANCE CARDS */}
            <div className="flex flex-col gap-3 mt-4">
              {/* TOTAL DISPONIBLE */}
              <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500 text-white rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">Total Disponible</div>
                    <div className="text-xl font-serif font-bold text-sky-950">{fmt(825200)}</div>
                  </div>
                </div>
              </div>

              {/* TOTAL CAJAS */}
              <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-lg">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Total Cajas Efectivo</div>
                    <div className="text-lg font-serif font-bold text-amber-950">{fmt(430779)}</div>
                  </div>
                </div>
              </div>

              {/* TOTAL BANCOS */}
              <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500 text-white rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Total Bancos / MP</div>
                    <div className="text-lg font-serif font-bold text-rose-950">{fmt(394421)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT MOVEMENTS MINI TABLE */}
            <div className="mt-5">
              <div className="text-[11px] font-bold text-stone uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Últimos Movimientos</span>
                <span className="text-[10px] text-terra hover:underline cursor-pointer">Ver todos</span>
              </div>

              <div className="border border-sand rounded-xl overflow-hidden text-xs divide-y divide-sand/60">
                <div className="p-2.5 bg-light-cream/60 flex items-center justify-between font-medium">
                  <span className="text-stone">05/04/24 • Banco Galicia</span>
                  <span className="font-bold text-emerald-700">+ $45.000</span>
                </div>
                <div className="p-2.5 bg-white flex items-center justify-between font-medium">
                  <span className="text-stone">05/04/24 • Banco Galicia</span>
                  <span className="font-bold text-rose-600">- $15.000</span>
                </div>
                <div className="p-2.5 bg-light-cream/60 flex items-center justify-between font-medium">
                  <span className="text-stone">05/04/24 • Caja Efectivo</span>
                  <span className="font-bold text-emerald-700">+ $10.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: DEBT & RECEIVABLES AGING BREAKDOWN WITH TOOLTIPS */}
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
                  {fmt(metrics.remainingToCollect || 139153)}
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
                { label: 'A Vencer', value: 0, height: 15 },
                { label: '0 a 30 Días', value: 117510, height: 80 },
                { label: '31 a 60 Días', value: 12100, height: 30 },
                { label: '61 a 90 Días', value: 115690, height: 75 },
                { label: '+ de 90 Días', value: 125233.40, height: 95 }
              ].map((item, idx) => (
                <div key={idx} className="flex-1 group/aging relative flex items-end h-full">
                  {/* HOVER TOOLTIP */}
                  <div className="opacity-0 group-hover/aging:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2 py-1 rounded-md shadow-xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                    <span className="text-[8px] text-cream/70 uppercase">{item.label}</span>
                    <span className="text-emerald-400 font-extrabold">{fmt(item.value)}</span>
                  </div>
                  <div
                    style={{ height: `${item.height}%` }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-t transition-all cursor-pointer"
                  ></div>
                </div>
              ))}
            </div>

            {/* AGING INTERVALS BREAKDOWN */}
            <div className="sm:col-span-7 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">A VENCER</span>
                <span className="text-emerald-700 font-bold">$0,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">0 A 30 DÍAS</span>
                <span className="text-brown font-bold">$117.510,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">31 A 60 DÍAS</span>
                <span className="text-brown font-bold">$12.100,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">61 A 90 DÍAS</span>
                <span className="text-brown font-bold">$115.690,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1">
                <span className="text-stone font-bold">+ DE 90 DÍAS</span>
                <span className="text-rose-600 font-bold">$125.233,40</span>
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
                  {fmt(661609)}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
              Cuentas por Pagar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-5 items-center">
            {/* MINI BARS GRAPH WITH TOOLTIPS */}
            <div className="sm:col-span-5 flex items-end justify-between gap-1.5 h-28 bg-light-cream/50 p-3 rounded-xl border border-sand/40 pt-8">
              {[
                { label: 'A Vencer', value: 0, height: 15 },
                { label: '0 a 30 Días', value: 25926, height: 45 },
                { label: '31 a 60 Días', value: 8000, height: 25 },
                { label: '61 a 90 Días', value: 0, height: 15 },
                { label: '+ de 90 Días', value: 627683.35, height: 95 }
              ].map((item, idx) => (
                <div key={idx} className="flex-1 group/aging relative flex items-end h-full">
                  {/* HOVER TOOLTIP */}
                  <div className="opacity-0 group-hover/aging:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-[#3D1F0D] text-cream text-[10px] font-bold font-mono px-2 py-1 rounded-md shadow-xl whitespace-nowrap z-30 transition-all border border-sand/30 flex flex-col items-center">
                    <span className="text-[8px] text-cream/70 uppercase">{item.label}</span>
                    <span className="text-rose-400 font-extrabold">{fmt(item.value)}</span>
                  </div>
                  <div
                    style={{ height: `${item.height}%` }}
                    className="w-full bg-rose-600 hover:bg-rose-500 rounded-t transition-all cursor-pointer"
                  ></div>
                </div>
              ))}
            </div>

            {/* AGING INTERVALS BREAKDOWN */}
            <div className="sm:col-span-7 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">A VENCER</span>
                <span className="text-emerald-700 font-bold">$0,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">0 A 30 DÍAS</span>
                <span className="text-brown font-bold">$25.926,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">31 A 60 DÍAS</span>
                <span className="text-brown font-bold">$8.000,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1 border-b border-sand/30">
                <span className="text-stone">61 A 90 DÍAS</span>
                <span className="text-brown font-bold">$0,00</span>
              </div>
              <div className="flex items-center justify-between font-semibold py-1">
                <span className="text-stone font-bold">+ DE 90 DÍAS</span>
                <span className="text-rose-600 font-bold">$627.683,35</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
