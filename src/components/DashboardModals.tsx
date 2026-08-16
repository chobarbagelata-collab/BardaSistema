import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ArrowUpRight,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  BarChart2,
  CreditCard,
  Wallet,
  Building2,
  Calendar,
  Filter,
  ArrowDownRight,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  Layers,
  Percent,
  Download
} from 'lucide-react';

export type DashboardModalType =
  | 'ventas_creadas'
  | 'venta_promedio'
  | 'cantidad_ventas'
  | 'resultado_estimado'
  | 'ventas_a_cobrar'
  | 'compras_a_pagar'
  | 'tesoreria_disponible'
  | 'tesoreria_cajas'
  | 'tesoreria_bancos'
  | 'tesoreria_flujo_neto'
  | 'tesoreria_ingresos'
  | 'tesoreria_egresos'
  | 'tesoreria_cuenta_efectivo'
  | 'tesoreria_cuenta_santander'
  | 'tesoreria_cuenta_uala';

interface DashboardModalsProps {
  modalType: DashboardModalType | null;
  onClose: () => void;
  fmt: (val: number) => string;
  filteredSales?: any[];
  allSales?: any[];
  filteredFixedCosts?: any[];
  allFixedCosts?: any[];
  paymentsLedger?: any[];
  resumenYear?: string;
  resumenMonth?: string;
  selectedPeriod?: string;
  totalVentas?: number;
  ventaPromedio?: number;
  cantidadVentas?: number;
  totalCostoVentas?: number;
  totalGastosFijos?: number;
  resultadoNeto?: number;
  totalVentasACobrar?: number;
  totalComprasAPagar?: number;
  agingReceivables?: {
    aVencer: number;
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  agingPayables?: {
    aVencer: number;
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  cashTotal?: number;
  bankTotal?: number;
  totalDisponible?: number;
  flujoNetoDeCaja?: number;
  totalIngresosCobrados?: number;
  totalCostoFijo?: number;
  totalSaldosPendientes?: number;
  accountBalances?: Record<string, number>;
  MONTHS_LIST?: { value: string; label: string }[];
  isOpen?: boolean;
  selectedPeriodDescription?: string;
  ordersWithBalance?: any[];
  fixedCosts?: any[];
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
  modalType,
  onClose,
  fmt,
  filteredSales = [],
  allSales = [],
  filteredFixedCosts = [],
  allFixedCosts = [],
  paymentsLedger = [],
  resumenYear = 'todos',
  resumenMonth = 'todos',
  selectedPeriod = '6M',
  selectedPeriodDescription,
  totalVentas = 0,
  ventaPromedio = 0,
  cantidadVentas = 0,
  totalCostoVentas = 0,
  totalGastosFijos = 0,
  resultadoNeto = 0,
  totalVentasACobrar = 0,
  totalComprasAPagar = 0,
  agingReceivables = { aVencer: 0, days0_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0 },
  agingPayables = { aVencer: 0, days0_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0 },
  cashTotal = 0,
  bankTotal = 0,
  totalDisponible = 0,
  flujoNetoDeCaja = 0,
  totalIngresosCobrados = 0,
  totalCostoFijo = 0,
  totalSaldosPendientes = 0,
  accountBalances = {},
  fixedCosts = [],
  ordersWithBalance = [],
  MONTHS_LIST = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [agingFilter, setAgingFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');

  // Reset filters when modal type changes
  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('todos');
    setAgingFilter('todos');
    setCategoryFilter('todos');
  }, [modalType]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (modalType) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [modalType, onClose]);

  if (!modalType) return null;

  const now = new Date();
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0;
    const parsed = Date.parse(dateStr);
    if (isNaN(parsed)) return 0;
    const dt = new Date(parsed);
    return Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMonthLabel = (mCode: string) => {
    const found = MONTHS_LIST.find(m => m.value === mCode);
    return found ? found.label : mCode;
  };

  const periodDescription =
    resumenMonth !== 'todos'
      ? `${getMonthLabel(resumenMonth)} ${resumenYear === 'todos' ? '' : resumenYear}`
      : resumenYear !== 'todos'
      ? `Año ${resumenYear}`
      : `Últimos ${selectedPeriod}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-sand rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* =========================================================================
            MODAL 1: VENTAS CREADAS
        ========================================================================== */}
        {modalType === 'ventas_creadas' && (
          <VentasCreadasModal
            filteredSales={filteredSales}
            totalVentas={totalVentas}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 2: VENTA PROMEDIO
        ========================================================================== */}
        {modalType === 'venta_promedio' && (
          <VentaPromedioModal
            filteredSales={filteredSales}
            ventaPromedio={ventaPromedio}
            totalVentas={totalVentas}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 3: CANTIDAD DE VENTAS
        ========================================================================== */}
        {modalType === 'cantidad_ventas' && (
          <CantidadVentasModal
            filteredSales={filteredSales}
            cantidadVentas={cantidadVentas}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 4: RESULTADO ESTIMADO (P&L)
        ========================================================================== */}
        {modalType === 'resultado_estimado' && (
          <ResultadoEstimadoModal
            filteredSales={filteredSales}
            filteredFixedCosts={filteredFixedCosts}
            totalVentas={totalVentas}
            totalCostoVentas={totalCostoVentas}
            totalGastosFijos={totalGastosFijos}
            resultadoNeto={resultadoNeto}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 5: VENTAS A COBRAR (CUENTAS POR COBRAR)
        ========================================================================== */}
        {modalType === 'ventas_a_cobrar' && (
          <VentasACobrarModal
            allSales={allSales}
            totalVentasACobrar={totalVentasACobrar}
            agingReceivables={agingReceivables}
            getDaysDiff={getDaysDiff}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 6: COMPRAS A PAGAR (CUENTAS POR PAGAR)
        ========================================================================== */}
        {modalType === 'compras_a_pagar' && (
          <ComprasAPagarModal
            allFixedCosts={allFixedCosts}
            totalComprasAPagar={totalComprasAPagar}
            agingPayables={agingPayables}
            getDaysDiff={getDaysDiff}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 7: TESORERÍA / CAJAS / BANCOS / CUENTAS
        ========================================================================== */}
        {(modalType === 'tesoreria_disponible' ||
          modalType === 'tesoreria_cajas' ||
          modalType === 'tesoreria_bancos' ||
          modalType === 'tesoreria_cuenta_efectivo' ||
          modalType === 'tesoreria_cuenta_santander' ||
          modalType === 'tesoreria_cuenta_uala') && (
          <TesoreriaModal
            paymentsLedger={paymentsLedger}
            fixedCosts={filteredFixedCosts.length > 0 ? filteredFixedCosts : allFixedCosts}
            cashTotal={cashTotal}
            bankTotal={bankTotal}
            totalDisponible={totalDisponible}
            accountBalances={accountBalances}
            initialFilter={
              modalType === 'tesoreria_cajas' || modalType === 'tesoreria_cuenta_efectivo'
                ? 'efectivo'
                : modalType === 'tesoreria_cuenta_santander'
                ? 'santander'
                : modalType === 'tesoreria_cuenta_uala'
                ? 'uala'
                : modalType === 'tesoreria_bancos'
                ? 'bancos'
                : 'todos'
            }
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 8: TESORERÍA • FLUJO NETO DE CAJA (PERCIBIDO)
        ========================================================================== */}
        {modalType === 'tesoreria_flujo_neto' && (
          <TesoreriaFlujoNetoModal
            paymentsLedger={paymentsLedger}
            fixedCosts={filteredFixedCosts.length > 0 ? filteredFixedCosts : allFixedCosts}
            flujoNetoDeCaja={flujoNetoDeCaja ?? (totalIngresosCobrados ?? 0) - (totalCostoFijo ?? 0)}
            totalIngresosCobrados={totalIngresosCobrados ?? paymentsLedger.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)}
            totalCostoFijo={totalCostoFijo ?? (filteredFixedCosts.length > 0 ? filteredFixedCosts : allFixedCosts).reduce((acc, c) => acc + (Number(c.amount) || 0), 0)}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 9: TESORERÍA • INGRESOS COBRADOS (PERCIBIDO)
        ========================================================================== */}
        {modalType === 'tesoreria_ingresos' && (
          <TesoreriaIngresosModal
            paymentsLedger={paymentsLedger}
            allSales={allSales}
            totalIngresosCobrados={totalIngresosCobrados ?? paymentsLedger.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}

        {/* =========================================================================
            MODAL 10: TESORERÍA • EGRESOS Y GASTOS PAGADOS
        ========================================================================== */}
        {modalType === 'tesoreria_egresos' && (
          <TesoreriaEgresosModal
            fixedCosts={filteredFixedCosts.length > 0 ? filteredFixedCosts : allFixedCosts}
            totalCostoFijo={totalCostoFijo ?? (filteredFixedCosts.length > 0 ? filteredFixedCosts : allFixedCosts).reduce((acc, c) => acc + (Number(c.amount) || 0), 0)}
            periodDescription={periodDescription}
            fmt={fmt}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

/* =============================================================================
   SUB-COMPONENT: VENTAS CREADAS MODAL
============================================================================= */
const VentasCreadasModal: React.FC<{
  filteredSales: any[];
  totalVentas: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({ filteredSales, totalVentas, periodDescription, fmt, onClose }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = useMemo(() => {
    return filteredSales.filter(s => {
      const clientName = (s.client?.nombre || s.clientName || s.client || '').toLowerCase();
      const orderNum = (s.orderNum || '').toLowerCase();
      const paymentMethod = (s.paymentMethod || '').toLowerCase();
      const itemsStr = (s.items || []).map((it: any) => it.name || it.product || '').join(' ').toLowerCase();

      const matchSearch =
        !search.trim() ||
        clientName.includes(search.toLowerCase()) ||
        orderNum.includes(search.toLowerCase()) ||
        paymentMethod.includes(search.toLowerCase()) ||
        itemsStr.includes(search.toLowerCase());

      const status = s.status || 'En Proceso';
      const matchStatus = statusFilter === 'todos' || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [filteredSales, search, statusFilter]);

  const totalFiltered = filtered.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const totalCobrado = filtered.reduce((acc, s) => acc + (Number(s.senaAmount) || 0), 0);
  const totalSaldo = totalFiltered - totalCobrado;

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700/80 text-emerald-100 px-2.5 py-0.5 rounded-full">
                Detalle de Ventas
              </span>
              <span className="text-xs text-cream/70">Periodo: {periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Ventas Creadas: {fmt(totalVentas)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-light-cream/40 border-b border-sand text-xs">
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Total Facturado</span>
          <div className="text-base font-serif font-bold text-brown mt-0.5">{fmt(totalFiltered)}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Pedidos Registrados</span>
          <div className="text-base font-serif font-bold text-brown mt-0.5">{filtered.length} órdenes</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Total Cobrado (Señas)</span>
          <div className="text-base font-serif font-bold text-emerald-700 mt-0.5">{fmt(totalCobrado)}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Saldos por Cobrar</span>
          <div className="text-base font-serif font-bold text-terra mt-0.5">{fmt(totalSaldo)}</div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-4 bg-white border-b border-sand flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, pedido, producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {['todos', 'En Proceso', 'En Producción', 'Listo', 'Entregado'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-brown text-cream shadow-xs'
                  : 'bg-light-cream text-stone hover:bg-sand/40 border border-sand/50'
              }`}
            >
              {st === 'todos' ? 'Todos los Estados' : st}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No se encontraron pedidos en este periodo con los filtros actuales.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Orden #</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Cobrado</th>
                  <th className="py-2.5 px-3.5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map(s => {
                  const tot = Number(s.total) || 0;
                  const sen = Number(s.senaAmount) || 0;
                  const bal = tot - sen;
                  const clientName = s.client?.nombre || s.clientName || s.client || 'Consumidor Final';
                  const itemsCount = s.items?.length || 1;

                  return (
                    <tr key={s.id || s.orderNum} className="hover:bg-cream/20 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-terra whitespace-nowrap">
                        {s.orderNum || 'S/N'}
                      </td>
                      <td className="py-3 px-3 text-stone whitespace-nowrap">{s.date || '—'}</td>
                      <td className="py-3 px-3">
                        <strong className="text-brown block truncate max-w-[180px]">{clientName}</strong>
                        {s.client?.telefono && (
                          <span className="text-[10px] text-stone font-normal flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" /> {s.client.telefono}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone text-[11px]">
                        <span className="font-semibold text-brown">{itemsCount}</span>{' '}
                        {itemsCount === 1 ? 'producto' : 'productos'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'Entregado'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : s.status === 'Listo'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : s.status === 'En Producción'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-cream text-brown border border-sand'
                          }`}
                        >
                          {s.status || 'En Proceso'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-brown whitespace-nowrap">
                        {fmt(tot)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {fmt(sen)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {bal > 0 ? (
                          <span className="text-rose-700">{fmt(bal)}</span>
                        ) : (
                          <span className="text-emerald-700 text-[10px]">Saldado ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">
          Mostrando <strong>{filtered.length}</strong> de <strong>{filteredSales.length}</strong> ventas
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: VENTA PROMEDIO MODAL
============================================================================= */
const VentaPromedioModal: React.FC<{
  filteredSales: any[];
  ventaPromedio: number;
  totalVentas: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({ filteredSales, ventaPromedio, totalVentas, periodDescription, fmt, onClose }) => {
  const [sortBy, setSortBy] = useState<'desc' | 'asc'>('desc');

  const totalsArray = filteredSales.map(s => Number(s.total) || 0).filter(t => t > 0);
  const maxSale = totalsArray.length > 0 ? Math.max(...totalsArray) : 0;
  const minSale = totalsArray.length > 0 ? Math.min(...totalsArray) : 0;

  // Calculate median
  const sortedTotals = [...totalsArray].sort((a, b) => a - b);
  const medianSale =
    sortedTotals.length > 0
      ? sortedTotals.length % 2 === 0
        ? Math.round((sortedTotals[sortedTotals.length / 2 - 1] + sortedTotals[sortedTotals.length / 2]) / 2)
        : sortedTotals[Math.floor(sortedTotals.length / 2)]
      : 0;

  // Price brackets distribution
  const brackets = useMemo(() => {
    const tier1 = filteredSales.filter(s => (Number(s.total) || 0) < 200000);
    const tier2 = filteredSales.filter(s => (Number(s.total) || 0) >= 200000 && (Number(s.total) || 0) < 500000);
    const tier3 = filteredSales.filter(s => (Number(s.total) || 0) >= 500000 && (Number(s.total) || 0) < 1000000);
    const tier4 = filteredSales.filter(s => (Number(s.total) || 0) >= 1000000);

    return [
      { label: '< $200.000', count: tier1.length, total: tier1.reduce((a, b) => a + (Number(b.total) || 0), 0) },
      { label: '$200k - $500k', count: tier2.length, total: tier2.reduce((a, b) => a + (Number(b.total) || 0), 0) },
      { label: '$500k - $1M', count: tier3.length, total: tier3.reduce((a, b) => a + (Number(b.total) || 0), 0) },
      { label: '> $1.000.000', count: tier4.length, total: tier4.reduce((a, b) => a + (Number(b.total) || 0), 0) }
    ];
  }, [filteredSales]);

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const totA = Number(a.total) || 0;
      const totB = Number(b.total) || 0;
      return sortBy === 'desc' ? totB - totA : totA - totB;
    });
  }, [filteredSales, sortBy]);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-terra/20 text-terra rounded-xl border border-terra/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2.5 py-0.5 rounded-full">
                Análisis de Ticket
              </span>
              <span className="text-xs text-cream/70">Periodo: {periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Venta Promedio: {fmt(ventaPromedio)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* SUMMARY 4-KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-light-cream/40 border-b border-sand text-xs">
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Ticket Promedio</span>
          <div className="text-base font-serif font-bold text-terra mt-0.5">{fmt(ventaPromedio)}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Ticket Mediano</span>
          <div className="text-base font-serif font-bold text-brown mt-0.5">{fmt(medianSale)}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Mayor Venta</span>
          <div className="text-base font-serif font-bold text-emerald-700 mt-0.5">{fmt(maxSale)}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">Menor Venta</span>
          <div className="text-base font-serif font-bold text-stone mt-0.5">{fmt(minSale)}</div>
        </div>
      </div>

      {/* DISTRIBUTION BARS */}
      <div className="p-4 bg-white border-b border-sand">
        <h4 className="text-xs font-bold text-brown uppercase tracking-wider mb-3">
          Distribución de Pedidos por Rango de Importe
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {brackets.map((b, i) => {
            const pct = filteredSales.length > 0 ? Math.round((b.count / filteredSales.length) * 100) : 0;
            return (
              <div key={i} className="bg-light-cream/60 p-3 rounded-xl border border-sand/60 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-brown">{b.label}</span>
                  <span className="font-mono font-extrabold text-terra">{b.count} ped.</span>
                </div>
                <div className="w-full bg-sand/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-terra h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-stone">
                  <span>{pct}% del total</span>
                  <span className="font-mono font-semibold">{fmt(b.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RANKED LIST OF ORDERS */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between pb-3">
          <h4 className="text-xs font-bold text-brown uppercase tracking-wider">
            Ranking de Pedidos por Importe
          </h4>
          <button
            onClick={() => setSortBy(sortBy === 'desc' ? 'asc' : 'desc')}
            className="text-xs text-terra hover:underline font-bold cursor-pointer"
          >
            Ordenar: {sortBy === 'desc' ? 'Mayor a menor ↓' : 'Menor a mayor ↑'}
          </button>
        </div>

        <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Orden</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3 text-right">Importe Venta</th>
                <th className="py-2.5 px-3.5 text-right">% s/ Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/50 bg-white">
              {sortedSales.map((s, idx) => {
                const tot = Number(s.total) || 0;
                const ratio = ventaPromedio > 0 ? Math.round((tot / ventaPromedio) * 100) : 100;
                const clientName = s.client?.nombre || s.clientName || s.client || 'Consumidor Final';

                return (
                  <tr key={s.id || idx} className="hover:bg-cream/20 transition-colors">
                    <td className="py-2.5 px-3 text-stone font-bold text-[10px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-terra">{s.orderNum || 'S/N'}</td>
                    <td className="py-2.5 px-3 font-semibold text-brown">{clientName}</td>
                    <td className="py-2.5 px-3 text-stone">{s.date || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-brown">{fmt(tot)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[11px]">
                      <span
                        className={`font-bold ${
                          ratio >= 100 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {ratio}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">
          Total de órdenes analizadas: <strong>{filteredSales.length}</strong>
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: CANTIDAD DE VENTAS MODAL
============================================================================= */
const CantidadVentasModal: React.FC<{
  filteredSales: any[];
  cantidadVentas: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({ filteredSales, cantidadVentas, periodDescription, fmt, onClose }) => {
  const [search, setSearch] = useState('');

  // Status counters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'En Proceso': 0,
      'En Producción': 0,
      'Listo': 0,
      'Entregado': 0
    };
    filteredSales.forEach(s => {
      const st = s.status || 'En Proceso';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [filteredSales]);

  // Payment methods breakdown
  const paymentMethods = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredSales.forEach(s => {
      const m = s.paymentMethod || 'No especificado';
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count += 1;
      map[m].total += Number(s.total) || 0;
    });
    return Object.entries(map);
  }, [filteredSales]);

  const filtered = useMemo(() => {
    return filteredSales.filter(s => {
      const clientName = (s.client?.nombre || s.clientName || s.client || '').toLowerCase();
      const orderNum = (s.orderNum || '').toLowerCase();
      return (
        !search.trim() ||
        clientName.includes(search.toLowerCase()) ||
        orderNum.includes(search.toLowerCase())
      );
    });
  }, [filteredSales, search]);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cream/20 text-cream rounded-xl border border-cream/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-cream text-brown px-2.5 py-0.5 rounded-full font-bold">
                Volumen y Operaciones
              </span>
              <span className="text-xs text-cream/70">Periodo: {periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Cantidad de Ventas: {cantidadVentas} pedidos
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* STATUS BREAKDOWN CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-light-cream/40 border-b border-sand text-xs">
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-stone">En Proceso</span>
          <div className="text-base font-serif font-bold text-brown mt-0.5">
            {statusCounts['En Proceso'] || 0} pedidos
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-amber-800">En Producción / Taller</span>
          <div className="text-base font-serif font-bold text-amber-900 mt-0.5">
            {statusCounts['En Producción'] || 0} pedidos
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-sky-800">Listo para Entrega</span>
          <div className="text-base font-serif font-bold text-sky-900 mt-0.5">
            {statusCounts['Listo'] || 0} pedidos
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand/60">
          <span className="text-[10px] uppercase font-bold text-emerald-800">Entregados</span>
          <div className="text-base font-serif font-bold text-emerald-900 mt-0.5">
            {statusCounts['Entregado'] || 0} pedidos
          </div>
        </div>
      </div>

      {/* PAYMENT METHODS PILLS */}
      <div className="p-4 bg-white border-b border-sand">
        <h4 className="text-xs font-bold text-brown uppercase tracking-wider mb-2.5">
          Canales y Formas de Pago
        </h4>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map(([method, data]) => (
            <div
              key={method}
              className="bg-light-cream/60 border border-sand/60 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs"
            >
              <span className="font-bold text-brown">{method}:</span>
              <span className="font-mono text-terra font-extrabold">{data.count} ped.</span>
              <span className="text-stone text-[10px]">({fmt(data.total)})</span>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH AND LIST */}
      <div className="p-4 bg-white border-b border-sand flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente o nro de pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
        <span className="text-xs text-stone font-semibold">
          {filtered.length} órdenes listadas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                <th className="py-2.5 px-3.5">Orden #</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Forma de Pago</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/50 bg-white">
              {filtered.map(s => {
                const clientName = s.client?.nombre || s.clientName || s.client || 'Consumidor Final';
                return (
                  <tr key={s.id || s.orderNum} className="hover:bg-cream/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-terra">{s.orderNum || 'S/N'}</td>
                    <td className="py-2.5 px-3 text-stone">{s.date || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-brown">{clientName}</td>
                    <td className="py-2.5 px-3 text-stone">{s.paymentMethod || 'Efectivo'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Entregado'
                            ? 'bg-emerald-50 text-emerald-800'
                            : s.status === 'Listo'
                            ? 'bg-sky-50 text-sky-800'
                            : s.status === 'En Producción'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-stone/10 text-stone'
                        }`}
                      >
                        {s.status || 'En Proceso'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-brown">
                      {fmt(Number(s.total) || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">Total de pedidos: <strong>{filteredSales.length}</strong></span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: RESULTADO ESTIMADO (P&L) MODAL
============================================================================= */
const ResultadoEstimadoModal: React.FC<{
  filteredSales: any[];
  filteredFixedCosts: any[];
  totalVentas: number;
  totalCostoVentas: number;
  totalGastosFijos: number;
  resultadoNeto: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({
  filteredSales,
  filteredFixedCosts,
  totalVentas,
  totalCostoVentas,
  totalGastosFijos,
  resultadoNeto,
  periodDescription,
  fmt,
  onClose
}) => {
  const [tab, setTab] = useState<'resumen' | 'gastos' | 'margenes'>('resumen');

  const margenBruto = totalVentas - totalCostoVentas;
  const margenBrutoPct = totalVentas > 0 ? Math.round((margenBruto / totalVentas) * 100) : 0;
  const margenNetoPct = totalVentas > 0 ? Math.round((resultadoNeto / totalVentas) * 100) : 0;

  // Group fixed costs by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredFixedCosts.forEach(c => {
      const cat = c.category || 'Otros Gastos';
      map[cat] = (map[cat] || 0) + (Number(c.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredFixedCosts]);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-xl border ${
              resultadoNeto >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white px-2.5 py-0.5 rounded-full">
                Estado de Resultados (P&L)
              </span>
              <span className="text-xs text-cream/70">Periodo: {periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Utilidad Neta: {fmt(resultadoNeto)}{' '}
              <span className="text-xs font-sans font-normal text-cream/80">({margenNetoPct}%)</span>
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* TABS */}
      <div className="px-5 bg-white border-b border-sand flex items-center gap-2 pt-3">
        {[
          { key: 'resumen', label: 'Estructura Financiera' },
          { key: 'gastos', label: `Desglose de Gastos (${filteredFixedCosts.length})` },
          { key: 'margenes', label: `Rentabilidad por Venta (${filteredSales.length})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === t.key
                ? 'border-terra text-brown'
                : 'border-transparent text-stone hover:text-brown'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'resumen' && (
          <div className="flex flex-col gap-5">
            {/* WATERFALL FINANCIAL CARD */}
            <div className="bg-light-cream/40 border border-sand rounded-2xl p-5 flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-brown uppercase tracking-wider border-b border-sand pb-2">
                Cascada de Ingresos, Costos y Margen Operativo
              </h4>

              {/* 1. Ingresos */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span className="font-bold text-xs text-emerald-950">(+) Ingresos por Ventas Facturadas</span>
                </div>
                <span className="font-mono font-bold text-emerald-900 text-sm">{fmt(totalVentas)}</span>
              </div>

              {/* 2. Costo Directo */}
              <div className="flex items-center justify-between p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                  <span className="font-bold text-xs text-rose-950">(-) Costo Directo de Materiales / Fabricación</span>
                </div>
                <span className="font-mono font-bold text-rose-900 text-sm">- {fmt(totalCostoVentas)}</span>
              </div>

              {/* 3. Margen Bruto */}
              <div className="flex items-center justify-between p-3 bg-white border border-sand rounded-xl shadow-2xs font-semibold">
                <span className="text-xs text-brown">(=) Margen Bruto de Contribución</span>
                <span className="font-mono font-bold text-brown text-sm">
                  {fmt(margenBruto)} <span className="text-xs text-stone font-normal">({margenBrutoPct}%)</span>
                </span>
              </div>

              {/* 4. Gastos Fijos */}
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                  <span className="font-bold text-xs text-amber-950">(-) Gastos Fijos y Operativos Asentados</span>
                </div>
                <span className="font-mono font-bold text-amber-900 text-sm">- {fmt(totalGastosFijos)}</span>
              </div>

              {/* 5. Utilidad Neta */}
              <div
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  resultadoNeto >= 0
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-rose-700 text-white border-rose-800 shadow-sm'
                }`}
              >
                <div>
                  <span className="font-bold text-sm block">(=) Resultado Neto Estimado</span>
                  <span className="text-[11px] opacity-80">Margen neto operativo sobre ventas</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-lg block">{fmt(resultadoNeto)}</span>
                  <span className="text-xs opacity-90">{margenNetoPct}% de rentabilidad</span>
                </div>
              </div>
            </div>

            {/* EXPENSES BY CATEGORY STRIP */}
            <div>
              <h4 className="text-xs font-bold text-brown uppercase tracking-wider mb-3">
                Composición de Gastos por Categoría
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {expensesByCategory.map(([cat, amt]) => {
                  const pct = totalGastosFijos > 0 ? Math.round((amt / totalGastosFijos) * 100) : 0;
                  return (
                    <div key={cat} className="p-3 bg-white border border-sand rounded-xl shadow-2xs">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-brown truncate">{cat}</span>
                        <span className="font-mono font-bold text-rose-700">{fmt(amt)}</span>
                      </div>
                      <div className="w-full bg-sand/40 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-[10px] text-stone mt-1 block">{pct}% de los gastos fijos</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'gastos' && (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3">Fecha / Mes</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Cuenta</th>
                  <th className="py-2.5 px-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filteredFixedCosts.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-cream/20 transition-colors">
                    <td className="py-2.5 px-3 text-stone">{c.date || c.month || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-brown">{c.concept || c.description || 'Gasto'}</td>
                    <td className="py-2.5 px-3 text-stone">{c.category || 'General'}</td>
                    <td className="py-2.5 px-3 text-stone">{c.account || c.paymentAccount || 'Efectivo'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      - {fmt(Number(c.amount) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'margenes' && (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3">Orden #</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3 text-right">Precio Venta</th>
                  <th className="py-2.5 px-3 text-right">Costo Material</th>
                  <th className="py-2.5 px-3 text-right">Margen ($)</th>
                  <th className="py-2.5 px-3.5 text-right">% Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filteredSales.map(s => {
                  const p = Number(s.total) || 0;
                  const c = Number(s.totalCost) || 0;
                  const m = p - c;
                  const pct = p > 0 ? Math.round((m / p) * 100) : 0;
                  const clientName = s.client?.nombre || s.clientName || s.client || 'Consumidor Final';

                  return (
                    <tr key={s.id || s.orderNum} className="hover:bg-cream/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-terra">{s.orderNum || 'S/N'}</td>
                      <td className="py-2.5 px-3 font-semibold text-brown">{clientName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-brown">{fmt(p)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone">{fmt(c)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{fmt(m)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                        <span className={pct >= 35 ? 'text-emerald-700' : 'text-amber-700'}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">
          Resultado calculado sobre <strong>{filteredSales.length}</strong> ventas y{' '}
          <strong>{filteredFixedCosts.length}</strong> partidas de gasto
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: VENTAS A COBRAR (CUENTAS POR COBRAR) MODAL
============================================================================= */
const VentasACobrarModal: React.FC<{
  allSales: any[];
  totalVentasACobrar: number;
  agingReceivables: {
    aVencer: number;
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  getDaysDiff: (dateStr?: string) => number;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({ allSales, totalVentasACobrar, agingReceivables, getDaysDiff, fmt, onClose }) => {
  const [search, setSearch] = useState('');
  const [agingTab, setAgingTab] = useState<string>('todos');

  const pendingSales = useMemo(() => {
    return allSales.filter(s => {
      const tot = Number(s.total) || 0;
      const sen = Number(s.senaAmount) || 0;
      return tot - sen > 0;
    });
  }, [allSales]);

  const filtered = useMemo(() => {
    return pendingSales.filter(s => {
      const clientName = (s.client?.nombre || s.clientName || s.client || '').toLowerCase();
      const orderNum = (s.orderNum || '').toLowerCase();
      const phone = (s.client?.telefono || s.phone || '').toLowerCase();

      const matchSearch =
        !search.trim() ||
        clientName.includes(search.toLowerCase()) ||
        orderNum.includes(search.toLowerCase()) ||
        phone.includes(search.toLowerCase());

      const days = getDaysDiff(s.date);
      let matchAging = true;
      if (agingTab === 'aVencer') matchAging = days <= 0;
      else if (agingTab === '0_30') matchAging = days > 0 && days <= 30;
      else if (agingTab === '31_60') matchAging = days > 30 && days <= 60;
      else if (agingTab === '61_90') matchAging = days > 60 && days <= 90;
      else if (agingTab === '90plus') matchAging = days > 90;

      return matchSearch && matchAging;
    });
  }, [pendingSales, search, agingTab, getDaysDiff]);

  const totalFilteredPending = filtered.reduce(
    (acc, s) => acc + (Number(s.total) || 0) - (Number(s.senaAmount) || 0),
    0
  );

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-full">
                Cuentas por Cobrar & Deudores
              </span>
              <span className="text-xs text-cream/70">{pendingSales.length} clientes con saldo pendiente</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Total por Cobrar: {fmt(totalVentasACobrar)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* AGING INTERVALS TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3.5 bg-light-cream/40 border-b border-sand text-xs">
        {[
          { key: 'todos', label: 'Todos', amt: totalVentasACobrar },
          { key: 'aVencer', label: 'A Vencer', amt: agingReceivables.aVencer },
          { key: '0_30', label: '0 a 30 Días', amt: agingReceivables.days0_30 },
          { key: '31_60', label: '31 a 60 Días', amt: agingReceivables.days31_60 },
          { key: '61_90', label: '61 a 90 Días', amt: agingReceivables.days61_90 },
          { key: '90plus', label: '+ de 90 Días', amt: agingReceivables.days90Plus }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setAgingTab(item.key)}
            className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
              agingTab === item.key
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                : 'bg-white text-brown border-sand hover:bg-cream/40'
            }`}
          >
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 block">{item.label}</span>
            <span className="font-mono font-bold text-xs mt-0.5 block">{fmt(item.amt)}</span>
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="p-4 bg-white border-b border-sand flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente, teléfono, pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs font-semibold text-emerald-800">
          Subtotal filtrado: <span className="font-mono font-bold">{fmt(totalFilteredPending)}</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No hay saldos pendientes en este intervalo de antigüedad.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Orden #</th>
                  <th className="py-2.5 px-3">Fecha Venta</th>
                  <th className="py-2.5 px-3">Cliente / Contacto</th>
                  <th className="py-2.5 px-3">Antigüedad</th>
                  <th className="py-2.5 px-3 text-right">Total Pedido</th>
                  <th className="py-2.5 px-3 text-right">Cobrado</th>
                  <th className="py-2.5 px-3.5 text-right">Saldo por Cobrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map(s => {
                  const tot = Number(s.total) || 0;
                  const sen = Number(s.senaAmount) || 0;
                  const bal = tot - sen;
                  const days = getDaysDiff(s.date);
                  const clientName = s.client?.nombre || s.clientName || s.client || 'Consumidor Final';

                  return (
                    <tr key={s.id || s.orderNum} className="hover:bg-cream/20 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-terra whitespace-nowrap">
                        {s.orderNum || 'S/N'}
                      </td>
                      <td className="py-3 px-3 text-stone whitespace-nowrap">{s.date || '—'}</td>
                      <td className="py-3 px-3">
                        <strong className="text-brown block">{clientName}</strong>
                        {s.client?.telefono && (
                          <span className="text-[10px] text-stone font-normal flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" /> {s.client.telefono}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            days <= 0
                              ? 'bg-emerald-50 text-emerald-800'
                              : days <= 30
                              ? 'bg-amber-50 text-amber-800'
                              : days <= 60
                              ? 'bg-orange-50 text-orange-800'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {days <= 0 ? 'A vencer' : `${days} días`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-brown whitespace-nowrap">
                        {fmt(tot)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {fmt(sen)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-rose-700 text-sm whitespace-nowrap">
                        {fmt(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">
          Mostrando <strong>{filtered.length}</strong> de <strong>{pendingSales.length}</strong> deudores
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: COMPRAS A PAGAR (CUENTAS POR PAGAR) MODAL
============================================================================= */
const ComprasAPagarModal: React.FC<{
  allFixedCosts: any[];
  totalComprasAPagar: number;
  agingPayables: {
    aVencer: number;
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  getDaysDiff: (dateStr?: string) => number;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({ allFixedCosts, totalComprasAPagar, agingPayables, getDaysDiff, fmt, onClose }) => {
  const [search, setSearch] = useState('');
  const [agingTab, setAgingTab] = useState<string>('todos');

  const pendingCosts = useMemo(() => {
    return allFixedCosts.filter(c => c.pendingPayment === true);
  }, [allFixedCosts]);

  const filtered = useMemo(() => {
    return pendingCosts.filter(c => {
      const concept = (c.concept || c.description || c.name || '').toLowerCase();
      const category = (c.category || '').toLowerCase();
      const provider = (c.provider || '').toLowerCase();

      const matchSearch =
        !search.trim() ||
        concept.includes(search.toLowerCase()) ||
        category.includes(search.toLowerCase()) ||
        provider.includes(search.toLowerCase());

      const dateStr = c.date || (c.month ? `${c.month}-01` : '');
      const days = getDaysDiff(dateStr);
      let matchAging = true;
      if (agingTab === 'aVencer') matchAging = days <= 0;
      else if (agingTab === '0_30') matchAging = days > 0 && days <= 30;
      else if (agingTab === '31_60') matchAging = days > 30 && days <= 60;
      else if (agingTab === '61_90') matchAging = days > 60 && days <= 90;
      else if (agingTab === '90plus') matchAging = days > 90;

      return matchSearch && matchAging;
    });
  }, [pendingCosts, search, agingTab, getDaysDiff]);

  const totalFilteredPending = filtered.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-700 text-rose-100 px-2.5 py-0.5 rounded-full">
                Cuentas por Pagar & Gastos Pendientes
              </span>
              <span className="text-xs text-cream/70">{pendingCosts.length} compromisos pendientes</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Total por Pagar: {fmt(totalComprasAPagar)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* AGING INTERVALS TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3.5 bg-light-cream/40 border-b border-sand text-xs">
        {[
          { key: 'todos', label: 'Todos', amt: totalComprasAPagar },
          { key: 'aVencer', label: 'A Vencer', amt: agingPayables.aVencer },
          { key: '0_30', label: '0 a 30 Días', amt: agingPayables.days0_30 },
          { key: '31_60', label: '31 a 60 Días', amt: agingPayables.days31_60 },
          { key: '61_90', label: '61 a 90 Días', amt: agingPayables.days61_90 },
          { key: '90plus', label: '+ de 90 Días', amt: agingPayables.days90Plus }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setAgingTab(item.key)}
            className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
              agingTab === item.key
                ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                : 'bg-white text-brown border-sand hover:bg-cream/40'
            }`}
          >
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 block">{item.label}</span>
            <span className="font-mono font-bold text-xs mt-0.5 block">{fmt(item.amt)}</span>
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="p-4 bg-white border-b border-sand flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto, categoría, proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs font-semibold text-rose-800">
          Subtotal filtrado: <span className="font-mono font-bold">{fmt(totalFilteredPending)}</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No hay pagos pendientes en este intervalo de antigüedad.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Fecha / Mes</th>
                  <th className="py-2.5 px-3">Concepto / Partida</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Cuenta Destino</th>
                  <th className="py-2.5 px-3">Antigüedad</th>
                  <th className="py-2.5 px-3.5 text-right">Monto a Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map((c, i) => {
                  const dateStr = c.date || (c.month ? `${c.month}-01` : '');
                  const days = getDaysDiff(dateStr);
                  const amt = Number(c.amount) || 0;

                  return (
                    <tr key={c.id || i} className="hover:bg-cream/20 transition-colors">
                      <td className="py-3 px-3.5 text-stone whitespace-nowrap">{dateStr || '—'}</td>
                      <td className="py-3 px-3">
                        <strong className="text-brown block">{c.concept || c.description || 'Gasto'}</strong>
                        {c.provider && (
                          <span className="text-[10px] text-stone">Prov: {c.provider}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone whitespace-nowrap">{c.category || 'General'}</td>
                      <td className="py-3 px-3 text-stone whitespace-nowrap">{c.account || c.paymentAccount || 'Efectivo'}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            days <= 0
                              ? 'bg-emerald-50 text-emerald-800'
                              : days <= 30
                              ? 'bg-amber-50 text-amber-800'
                              : days <= 60
                              ? 'bg-orange-50 text-orange-800'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {days <= 0 ? 'A vencer' : `${days} días`}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-rose-700 text-sm whitespace-nowrap">
                        {fmt(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">
          Mostrando <strong>{filtered.length}</strong> de <strong>{pendingCosts.length}</strong> partidas pendientes
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: TESORERÍA / CAJAS / BANCOS / CUENTAS MODAL
============================================================================= */
const TesoreriaModal: React.FC<{
  paymentsLedger: any[];
  fixedCosts?: any[];
  cashTotal: number;
  bankTotal: number;
  totalDisponible: number;
  accountBalances?: Record<string, number>;
  initialFilter: 'todos' | 'efectivo' | 'bancos' | 'santander' | 'uala';
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({
  paymentsLedger,
  fixedCosts = [],
  cashTotal,
  bankTotal,
  totalDisponible,
  accountBalances = {},
  initialFilter,
  fmt,
  onClose
}) => {
  const [accountFilter, setAccountFilter] = useState<'todos' | 'efectivo' | 'bancos' | 'santander' | 'uala'>(initialFilter);
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ingresos' | 'egresos'>('todos');
  const [search, setSearch] = useState('');

  // Combine income movements from paymentsLedger and expense movements from fixedCosts
  const combinedMovements = useMemo(() => {
    const list: any[] = [];
    
    // Incomes
    paymentsLedger.forEach((p, idx) => {
      list.push({
        id: p.id || `in-${idx}`,
        date: p.date || '',
        account: p.account || 'Efectivo',
        type: p.type || 'Ingreso / Cobro',
        concept: p.clientName || p.orderNum || 'Cobro de Venta',
        clientOrProvider: p.clientName || (p.client ? (p.client.nombre || p.client) : 'Cliente'),
        amount: Number(p.amount) || 0,
        isExpense: false,
        orderNum: p.orderNum
      });
    });

    // Expenses
    fixedCosts.forEach((c, idx) => {
      const dateStr = c.date || (c.month ? `${c.month}-01` : '');
      list.push({
        id: c.id || `out-${idx}`,
        date: dateStr,
        account: c.account || c.paymentAccount || 'Efectivo',
        type: c.category || 'Gasto / Costo',
        concept: c.concept || c.description || 'Gasto Operativo',
        clientOrProvider: c.provider || c.responsible || 'Proveedor',
        amount: Number(c.amount) || 0,
        isExpense: true
      });
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [paymentsLedger, fixedCosts]);

  const filtered = useMemo(() => {
    return combinedMovements.filter(m => {
      const acc = (m.account || 'Efectivo').toLowerCase();
      
      let matchAccount = true;
      if (accountFilter === 'efectivo') {
        matchAccount = acc === 'efectivo';
      } else if (accountFilter === 'santander') {
        matchAccount = acc.includes('santander');
      } else if (accountFilter === 'uala') {
        matchAccount = acc.includes('uala') || acc.includes('ualá');
      } else if (accountFilter === 'bancos') {
        matchAccount = acc !== 'efectivo';
      }

      let matchType = true;
      if (typeFilter === 'ingresos') matchType = !m.isExpense;
      if (typeFilter === 'egresos') matchType = m.isExpense;

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (m.concept || '').toLowerCase().includes(q) ||
        (m.clientOrProvider || '').toLowerCase().includes(q) ||
        (m.account || '').toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        (m.orderNum || '').toLowerCase().includes(q);

      return matchAccount && matchType && matchSearch;
    });
  }, [combinedMovements, accountFilter, typeFilter, search]);

  const currentBal =
    accountFilter === 'efectivo'
      ? (accountBalances['Efectivo'] ?? cashTotal)
      : accountFilter === 'santander'
      ? (accountBalances['Santander'] ?? 0)
      : accountFilter === 'uala'
      ? (accountBalances['Uala'] ?? 0)
      : accountFilter === 'bancos'
      ? bankTotal
      : totalDisponible;

  const getAccountTitle = () => {
    switch (accountFilter) {
      case 'efectivo': return 'Efectivo • Arqueo Caja Chica Showroom';
      case 'santander': return 'Banco Santander • Cuenta Bancaria';
      case 'uala': return 'Ualá • Cobros Online y Tarjetas';
      case 'bancos': return 'Bancos & Cuentas Online (Santander + Ualá)';
      default: return 'Tesorería • Arqueo y Disponibilidad Total';
    }
  };

  const totalInflows = filtered.filter(f => !f.isExpense).reduce((acc, f) => acc + f.amount, 0);
  const totalOutflows = filtered.filter(f => f.isExpense).reduce((acc, f) => acc + f.amount, 0);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-500/30">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-700 text-sky-100 px-2.5 py-0.5 rounded-full">
                Tesorería y Arqueo
              </span>
              <span className="text-xs text-cream/70">Movimientos en Tiempo Real</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              {getAccountTitle()}: {fmt(currentBal)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* ACCOUNT TABS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-light-cream/40 border-b border-sand text-xs">
        <button
          onClick={() => setAccountFilter('todos')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            accountFilter === 'todos'
              ? 'bg-sky-700 text-white border-sky-800 shadow-sm'
              : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <span className="text-[9px] uppercase font-bold opacity-80 block">Disponibilidad Total</span>
          <span className="text-base font-serif font-bold block mt-0.5">{fmt(totalDisponible)}</span>
        </button>

        <button
          onClick={() => setAccountFilter('efectivo')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            accountFilter === 'efectivo'
              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
              : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold opacity-80 block">Efectivo (Caja)</span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          </div>
          <span className="text-base font-serif font-bold block mt-0.5">{fmt(accountBalances['Efectivo'] ?? cashTotal)}</span>
        </button>

        <button
          onClick={() => setAccountFilter('santander')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            accountFilter === 'santander'
              ? 'bg-orange-700 text-white border-orange-800 shadow-sm'
              : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold opacity-80 block">Santander</span>
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
          </div>
          <span className="text-base font-serif font-bold block mt-0.5">{fmt(accountBalances['Santander'] ?? 0)}</span>
        </button>

        <button
          onClick={() => setAccountFilter('uala')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            accountFilter === 'uala'
              ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
              : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold opacity-80 block">Ualá (Cobros)</span>
            <span className="w-2 h-2 rounded-full bg-sky-300"></span>
          </div>
          <span className="text-base font-serif font-bold block mt-0.5">{fmt(accountBalances['Uala'] ?? 0)}</span>
        </button>
      </div>

      {/* FILTER BUTTONS & SEARCH BAR */}
      <div className="p-3.5 bg-white border-b border-sand flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              typeFilter === 'todos' ? 'bg-brown text-cream border-brown' : 'bg-light-cream text-stone border-sand hover:text-brown'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('ingresos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              typeFilter === 'ingresos' ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-light-cream text-emerald-800 border-sand hover:bg-emerald-50'
            }`}
          >
            Ingresos (+{fmt(totalInflows)})
          </button>
          <button
            onClick={() => setTypeFilter('egresos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              typeFilter === 'egresos' ? 'bg-rose-700 text-white border-rose-800' : 'bg-light-cream text-rose-800 border-sand hover:bg-rose-50'
            }`}
          >
            Egresos (-{fmt(totalOutflows)})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar concepto, cliente, cuenta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* MOVEMENTS TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No hay movimientos registrados para la cuenta y filtros seleccionados.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Fecha</th>
                  <th className="py-2.5 px-3">Cuenta</th>
                  <th className="py-2.5 px-3">Tipo / Concepto</th>
                  <th className="py-2.5 px-3">Referencia / Cliente / Proveedor</th>
                  <th className="py-2.5 px-3.5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-cream/20 transition-colors">
                    <td className="py-2.5 px-3.5 text-stone whitespace-nowrap">{m.date || '—'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (m.account || '').toLowerCase().includes('efectivo')
                          ? 'bg-amber-100 text-amber-900'
                          : (m.account || '').toLowerCase().includes('santander')
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}>
                        {m.account || 'Efectivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone whitespace-nowrap">
                      <span className="font-semibold text-brown">{m.type}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <strong className="text-brown block">{m.concept}</strong>
                      {m.clientOrProvider && m.clientOrProvider !== m.concept && (
                        <span className="text-[10px] text-stone block">{m.clientOrProvider}</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        m.isExpense ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {m.isExpense ? '-' : '+'} {fmt(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <span className="text-stone">
          Mostrando <strong>{filtered.length}</strong> de <strong>{combinedMovements.length}</strong> movimientos
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: TESORERÍA • FLUJO NETO DE CAJA (PERCIBIDO) MODAL
============================================================================= */
const TesoreriaFlujoNetoModal: React.FC<{
  paymentsLedger: any[];
  fixedCosts: any[];
  flujoNetoDeCaja: number;
  totalIngresosCobrados: number;
  totalCostoFijo: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({
  paymentsLedger,
  fixedCosts,
  flujoNetoDeCaja,
  totalIngresosCobrados,
  totalCostoFijo,
  periodDescription,
  fmt,
  onClose
}) => {
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ingresos' | 'egresos'>('todos');
  const [accountFilter, setAccountFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');

  // Merge movements
  const allMovements = useMemo(() => {
    const list: any[] = [];
    
    // Incomes
    paymentsLedger.forEach((p, idx) => {
      list.push({
        id: p.id || `fl-in-${idx}`,
        date: p.date || '',
        account: p.account || 'Efectivo',
        type: p.type || 'Cobro Venta',
        concept: p.clientName || p.orderNum || 'Ingreso Percibido',
        clientOrProvider: p.clientName || 'Cliente',
        amount: Number(p.amount) || 0,
        isExpense: false,
        orderNum: p.orderNum
      });
    });

    // Expenses
    fixedCosts.forEach((c, idx) => {
      const dateStr = c.date || (c.month ? `${c.month}-01` : '');
      list.push({
        id: c.id || `fl-out-${idx}`,
        date: dateStr,
        account: c.account || c.paymentAccount || 'Efectivo',
        type: c.category || 'Costo Fijo / Gasto',
        concept: c.concept || c.description || 'Gasto de Fábrica',
        clientOrProvider: c.provider || 'Proveedor',
        amount: Number(c.amount) || 0,
        isExpense: true
      });
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [paymentsLedger, fixedCosts]);

  const filtered = useMemo(() => {
    return allMovements.filter(m => {
      if (typeFilter === 'ingresos' && m.isExpense) return false;
      if (typeFilter === 'egresos' && !m.isExpense) return false;

      if (accountFilter !== 'todos') {
        const acc = (m.account || '').toLowerCase();
        if (accountFilter === 'efectivo' && acc !== 'efectivo') return false;
        if (accountFilter === 'santander' && !acc.includes('santander')) return false;
        if (accountFilter === 'uala' && !acc.includes('uala') && !acc.includes('ualá')) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (m.concept || '').toLowerCase().includes(q) ||
          (m.clientOrProvider || '').toLowerCase().includes(q) ||
          (m.account || '').toLowerCase().includes(q) ||
          (m.type || '').toLowerCase().includes(q) ||
          (m.orderNum || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allMovements, typeFilter, accountFilter, search]);

  const filteredIngresos = filtered.filter(m => !m.isExpense).reduce((acc, m) => acc + m.amount, 0);
  const filteredEgresos = filtered.filter(m => m.isExpense).reduce((acc, m) => acc + m.amount, 0);
  const filteredNeto = filteredIngresos - filteredEgresos;

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-500/30">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-full">
                Percibido Real
              </span>
              <span className="text-xs text-cream/70">{periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Caja / Flujo Neto: {fmt(flujoNetoDeCaja)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 3 SUMMARY CARDS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-light-cream/40 border-b border-sand text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-sand shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-stone block">Total Ingresos Cobrados (+)</span>
          <span className="text-lg font-serif font-bold text-emerald-700 block mt-0.5">{fmt(totalIngresosCobrados)}</span>
          <span className="text-[10px] text-stone mt-1 block">Señas + Saldos + Directos</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sand shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-stone block">Total Egresos Pagados (-)</span>
          <span className="text-lg font-serif font-bold text-rose-700 block mt-0.5">-{fmt(totalCostoFijo)}</span>
          <span className="text-[10px] text-stone mt-1 block">Costos fijos y gastos de fábrica</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border-2 border-sky-300 shadow-2xs bg-sky-50/40">
          <span className="text-[10px] uppercase font-bold text-sky-900 block">Flujo Neto en Caja (=)</span>
          <span className="text-lg font-serif font-bold text-sky-900 block mt-0.5">{fmt(flujoNetoDeCaja)}</span>
          <span className="text-[10px] text-stone mt-1 block">Superávit / Saldo de período</span>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="p-3.5 bg-white border-b border-sand flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 bg-cream/40 p-1 rounded-xl border border-sand/70">
            <button
              onClick={() => setTypeFilter('todos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'todos' ? 'bg-brown text-cream shadow-xs' : 'text-stone hover:text-brown'
              }`}
            >
              Todos ({allMovements.length})
            </button>
            <button
              onClick={() => setTypeFilter('ingresos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'ingresos' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Solo Ingresos (+)
            </button>
            <button
              onClick={() => setTypeFilter('egresos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'egresos' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              Solo Egresos (-)
            </button>
          </div>

          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="text-xs bg-cream/30 text-brown border border-sand rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-terra/30 cursor-pointer"
          >
            <option value="todos">Todas las Cuentas</option>
            <option value="efectivo">Efectivo (Caja Chica)</option>
            <option value="santander">Banco Santander</option>
            <option value="uala">Ualá (Cobros Online)</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, concepto, orden..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No se encontraron movimientos para los filtros seleccionados.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Fecha</th>
                  <th className="py-2.5 px-3">Cuenta</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Concepto / Referencia</th>
                  <th className="py-2.5 px-3.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-cream/20 transition-colors">
                    <td className="py-2.5 px-3.5 text-stone whitespace-nowrap">{m.date || '—'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (m.account || '').toLowerCase().includes('efectivo')
                          ? 'bg-amber-100 text-amber-900'
                          : (m.account || '').toLowerCase().includes('santander')
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}>
                        {m.account || 'Efectivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.isExpense ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {m.isExpense ? 'Egreso' : 'Ingreso'} • {m.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <strong className="text-brown block">{m.concept}</strong>
                      {m.clientOrProvider && m.clientOrProvider !== m.concept && (
                        <span className="text-[10px] text-stone block">{m.clientOrProvider}</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        m.isExpense ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {m.isExpense ? '-' : '+'} {fmt(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <div className="text-stone">
          Subtotal filtrado: <span className="font-mono font-bold text-brown">{fmt(filteredNeto)}</span>
          <span className="text-[11px] ml-2 text-stone/80">({filtered.length} movimientos)</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: TESORERÍA • INGRESOS PERCIBIDOS MODAL
============================================================================= */
const TesoreriaIngresosModal: React.FC<{
  paymentsLedger: any[];
  allSales: any[];
  totalIngresosCobrados: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({
  paymentsLedger,
  allSales,
  totalIngresosCobrados,
  periodDescription,
  fmt,
  onClose
}) => {
  const [subTypeFilter, setSubTypeFilter] = useState<'todos' | 'sena' | 'saldo' | 'directo'>('todos');
  const [accountFilter, setAccountFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');

  // Classify payments
  const classifiedPayments = useMemo(() => {
    return paymentsLedger.map((p, idx) => {
      const typeStr = (p.type || '').toLowerCase();
      let kind: 'sena' | 'saldo' | 'directo' = 'directo';
      if (typeStr.includes('seña') || typeStr.includes('sena') || typeStr.includes('anticipo')) {
        kind = 'sena';
      } else if (typeStr.includes('saldo') || typeStr.includes('entrega')) {
        kind = 'saldo';
      }

      return {
        id: p.id || `ing-${idx}`,
        date: p.date || '',
        account: p.account || 'Efectivo',
        type: p.type || 'Cobro Venta',
        kind,
        concept: p.clientName || p.orderNum || 'Ingreso',
        clientName: p.clientName || (p.client ? (p.client.nombre || p.client) : 'Cliente'),
        orderNum: p.orderNum || '',
        note: p.note || p.description || '',
        amount: Number(p.amount) || 0
      };
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [paymentsLedger]);

  const senasTotal = classifiedPayments.filter(p => p.kind === 'sena').reduce((acc, p) => acc + p.amount, 0);
  const saldosTotal = classifiedPayments.filter(p => p.kind === 'saldo').reduce((acc, p) => acc + p.amount, 0);
  const directosTotal = classifiedPayments.filter(p => p.kind === 'directo').reduce((acc, p) => acc + p.amount, 0);

  const filtered = useMemo(() => {
    return classifiedPayments.filter(p => {
      if (subTypeFilter !== 'todos' && p.kind !== subTypeFilter) return false;

      if (accountFilter !== 'todos') {
        const acc = p.account.toLowerCase();
        if (accountFilter === 'efectivo' && acc !== 'efectivo') return false;
        if (accountFilter === 'santander' && !acc.includes('santander')) return false;
        if (accountFilter === 'uala' && !acc.includes('uala') && !acc.includes('ualá')) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.concept.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.account.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.orderNum.toLowerCase().includes(q) ||
          p.note.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [classifiedPayments, subTypeFilter, accountFilter, search]);

  const filteredSum = filtered.reduce((acc, p) => acc + p.amount, 0);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-full">
                Cobranzas & Ingresos
              </span>
              <span className="text-xs text-cream/70">{periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Total Ingresos: {fmt(totalIngresosCobrados)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 3 SUMMARY CARDS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-light-cream/40 border-b border-sand text-xs">
        <button
          onClick={() => setSubTypeFilter('sena')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            subTypeFilter === 'sena' ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm' : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold opacity-80 block">Señas de Pedidos (50%)</span>
          <span className="text-lg font-serif font-bold block mt-0.5">{fmt(senasTotal)}</span>
          <span className="text-[10px] opacity-70 block mt-0.5">Anticipos de ventas</span>
        </button>

        <button
          onClick={() => setSubTypeFilter('saldo')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            subTypeFilter === 'saldo' ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm' : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold opacity-80 block">Saldos de Pedidos</span>
          <span className="text-lg font-serif font-bold block mt-0.5">{fmt(saldosTotal)}</span>
          <span className="text-[10px] opacity-70 block mt-0.5">Cobro contra entrega</span>
        </button>

        <button
          onClick={() => setSubTypeFilter('directo')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            subTypeFilter === 'directo' ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm' : 'bg-white text-brown border-sand hover:bg-cream/30'
          }`}
        >
          <span className="text-[10px] uppercase font-bold opacity-80 block">Ingresos Directos / Otros</span>
          <span className="text-lg font-serif font-bold block mt-0.5">{fmt(directosTotal)}</span>
          <span className="text-[10px] opacity-70 block mt-0.5">Cobros y ventas directas</span>
        </button>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="p-3.5 bg-white border-b border-sand flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSubTypeFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              subTypeFilter === 'todos' ? 'bg-brown text-cream border-brown' : 'bg-light-cream text-stone border-sand hover:text-brown'
            }`}
          >
            Todos ({classifiedPayments.length})
          </button>

          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="text-xs bg-cream/30 text-brown border border-sand rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-terra/30 cursor-pointer"
          >
            <option value="todos">Todas las Cuentas</option>
            <option value="efectivo">Efectivo</option>
            <option value="santander">Banco Santander</option>
            <option value="uala">Ualá</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, pedido, detalle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No se encontraron ingresos para los filtros seleccionados.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Fecha</th>
                  <th className="py-2.5 px-3">Cuenta</th>
                  <th className="py-2.5 px-3">Tipo de Ingreso</th>
                  <th className="py-2.5 px-3">Cliente / Detalle</th>
                  <th className="py-2.5 px-3.5 text-right">Importe Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-cream/20 transition-colors">
                    <td className="py-2.5 px-3.5 text-stone whitespace-nowrap">{p.date || '—'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.account.toLowerCase().includes('efectivo')
                          ? 'bg-amber-100 text-amber-900'
                          : p.account.toLowerCase().includes('santander')
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}>
                        {p.account}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                        {p.kind === 'sena' ? 'Seña (50%)' : p.kind === 'saldo' ? 'Saldo Pedido' : 'Ingreso Directo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <strong className="text-brown block">{p.clientName}</strong>
                      {p.orderNum && (
                        <span className="text-[10px] text-stone font-mono block">Orden #{p.orderNum}</span>
                      )}
                      {p.note && (
                        <span className="text-[10px] text-stone italic block">{p.note}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      +{fmt(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <div className="text-stone">
          Subtotal filtrado: <span className="font-mono font-bold text-emerald-800">{fmt(filteredSum)}</span>
          <span className="text-[11px] ml-2 text-stone/80">({filtered.length} cobros)</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};

/* =============================================================================
   SUB-COMPONENT: TESORERÍA • EGRESOS Y GASTOS PAGADOS MODAL
============================================================================= */
const TesoreriaEgresosModal: React.FC<{
  fixedCosts: any[];
  totalCostoFijo: number;
  periodDescription: string;
  fmt: (val: number) => string;
  onClose: () => void;
}> = ({
  fixedCosts,
  totalCostoFijo,
  periodDescription,
  fmt,
  onClose
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [accountFilter, setAccountFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    fixedCosts.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort();
  }, [fixedCosts]);

  const filtered = useMemo(() => {
    return fixedCosts.filter(c => {
      if (categoryFilter !== 'todos' && c.category !== categoryFilter) return false;

      if (accountFilter !== 'todos') {
        const acc = (c.account || c.paymentAccount || 'Efectivo').toLowerCase();
        if (accountFilter === 'efectivo' && acc !== 'efectivo') return false;
        if (accountFilter === 'santander' && !acc.includes('santander')) return false;
        if (accountFilter === 'uala' && !acc.includes('uala') && !acc.includes('ualá')) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (c.concept || c.description || '').toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q) ||
          (c.provider || '').toLowerCase().includes(q) ||
          (c.account || c.paymentAccount || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [fixedCosts, categoryFilter, accountFilter, search]);

  const filteredSum = filtered.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  return (
    <>
      {/* HEADER */}
      <div className="bg-[#3D1F0D] text-cream p-5 sm:p-6 flex items-center justify-between border-b border-terra/30">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-700 text-rose-100 px-2.5 py-0.5 rounded-full">
                Costos & Egresos Pagados
              </span>
              <span className="text-xs text-cream/70">{periodDescription}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream mt-0.5">
              Total Egresos: -{fmt(totalCostoFijo)}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-light-cream/40 border-b border-sand text-xs">
        <div className="bg-white p-3 rounded-xl border border-sand">
          <span className="text-[10px] uppercase font-bold text-stone block">Total Egresos</span>
          <span className="text-base font-serif font-bold text-rose-700 block mt-0.5">-{fmt(totalCostoFijo)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand">
          <span className="text-[10px] uppercase font-bold text-stone block">Partidas Registradas</span>
          <span className="text-base font-serif font-bold text-brown block mt-0.5">{fixedCosts.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand">
          <span className="text-[10px] uppercase font-bold text-stone block">Categorías</span>
          <span className="text-base font-serif font-bold text-brown block mt-0.5">{categories.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-sand">
          <span className="text-[10px] uppercase font-bold text-stone block">Promedio x Partida</span>
          <span className="text-base font-serif font-bold text-brown block mt-0.5">
            {fmt(fixedCosts.length > 0 ? totalCostoFijo / fixedCosts.length : 0)}
          </span>
        </div>
      </div>

      {/* CATEGORY & ACCOUNT FILTERS */}
      <div className="p-3.5 bg-white border-b border-sand flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                categoryFilter === 'todos' ? 'bg-brown text-cream border-brown' : 'bg-light-cream text-stone border-sand hover:text-brown'
              }`}
            >
              Todas ({fixedCosts.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  categoryFilter === cat ? 'bg-rose-700 text-white border-rose-800' : 'bg-light-cream text-stone border-sand hover:text-brown'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar concepto, proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-cream/30 border border-sand rounded-xl text-xs text-brown focus:outline-none focus:ring-2 focus:ring-terra/30 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone text-xs italic font-serif">
            No se encontraron egresos para los filtros seleccionados.
          </div>
        ) : (
          <div className="border border-sand rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand/30 text-stone uppercase text-[10px] font-bold tracking-wider border-b border-sand">
                  <th className="py-2.5 px-3.5">Fecha</th>
                  <th className="py-2.5 px-3">Cuenta Pago</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Concepto / Partida</th>
                  <th className="py-2.5 px-3.5 text-right">Monto Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50 bg-white">
                {filtered.map((c, idx) => {
                  const dateStr = c.date || (c.month ? `${c.month}-01` : '—');
                  const acc = c.account || c.paymentAccount || 'Efectivo';
                  const amt = Number(c.amount) || 0;

                  return (
                    <tr key={c.id || idx} className="hover:bg-cream/20 transition-colors">
                      <td className="py-2.5 px-3.5 text-stone whitespace-nowrap">{dateStr}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.toLowerCase().includes('efectivo')
                            ? 'bg-amber-100 text-amber-900'
                            : acc.toLowerCase().includes('santander')
                            ? 'bg-orange-100 text-orange-900'
                            : 'bg-sky-100 text-sky-900'
                        }`}>
                          {acc}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-100">
                          {c.category || 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <strong className="text-brown block">{c.concept || c.description || 'Gasto'}</strong>
                        {c.provider && (
                          <span className="text-[10px] text-stone block">Proveedor: {c.provider}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        -{fmt(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-light-cream/50 border-t border-sand flex items-center justify-between text-xs">
        <div className="text-stone">
          Subtotal filtrado: <span className="font-mono font-bold text-rose-800">-{fmt(filteredSum)}</span>
          <span className="text-[11px] ml-2 text-stone/80">({filtered.length} partidas)</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl font-bold cursor-pointer transition-all"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};
