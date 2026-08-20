import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ShoppingCart, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ChevronDown
} from 'lucide-react';

export interface QuoteLogItem {
  id: number;
  quoteNum: string;
  date: string;
  vencimiento?: string;
  client: {
    nombre: string;
    telefono?: string;
    cuit?: string;
    direccion?: string;
    ciudad?: string;
    provincia?: string;
  };
  category?: string;
  subtotal?: number;
  discount?: number;
  totalValue: number;
  status: 'Pendiente' | 'Enviado' | 'Venta' | 'Aceptado' | 'Rechazado' | 'Vencido';
  paymentMethod?: string;
  itemsCount?: number;
  items?: any[];
}

interface PresupuestosEstadosDashboardProps {
  quotes: QuoteLogItem[];
  fmt: (n: number | null | undefined) => string;
  onNewQuoteClick: () => void;
  onUpdateQuoteStatus: (id: number, newStatus: QuoteLogItem['status']) => void;
  onDeleteQuote: (id: number) => void;
  onLoadQuoteToCotizador: (quote: QuoteLogItem) => void;
  onConvertToSale: (quote: QuoteLogItem) => void;
  canEdit: boolean;
}

export const PresupuestosEstadosDashboard: React.FC<PresupuestosEstadosDashboardProps> = ({
  quotes,
  fmt,
  onNewQuoteClick,
  onUpdateQuoteStatus,
  onDeleteQuote,
  onLoadQuoteToCotizador,
  onConvertToSale,
  canEdit
}) => {
  // Local filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>('todos');

  // Categories list derived from quotes
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach(q => {
      if (q.category) set.add(q.category);
    });
    return Array.from(set);
  }, [quotes]);

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      // Search match
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || 
        q.quoteNum.toLowerCase().includes(term) ||
        (q.client?.nombre || '').toLowerCase().includes(term) ||
        (q.client?.cuit || '').toLowerCase().includes(term) ||
        (q.category || '').toLowerCase().includes(term);

      // Status match
      const matchStatus = statusFilter === 'todos' || q.status === statusFilter;

      // Category match
      const matchCat = categoryFilter === 'todos' || q.category === categoryFilter;

      // Date match
      let matchDate = true;
      if (dateFilter === 'este_mes') {
        const nowMonth = new Date().toISOString().substring(0, 7);
        matchDate = q.date.startsWith(nowMonth);
      } else if (dateFilter === 'ultimo_mes') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const lastMonth = d.toISOString().substring(0, 7);
        matchDate = q.date.startsWith(lastMonth);
      }

      return matchSearch && matchStatus && matchCat && matchDate;
    });
  }, [quotes, searchTerm, statusFilter, categoryFilter, dateFilter]);

  // KPI calculations matching Contagram header strip
  const metrics = useMemo(() => {
    let ventasCount = 0;
    let ventasTotal = 0;

    let vencidosRechazadosCount = 0;
    let vencidosRechazadosTotal = 0;

    let pendientesCount = 0;
    let pendientesTotal = 0;

    let aceptadosCount = 0;
    let aceptadosTotal = 0;

    let totalPosiblesCount = 0;
    let totalPosiblesTotal = 0;

    quotes.forEach(q => {
      const val = q.totalValue || 0;
      totalPosiblesCount++;
      totalPosiblesTotal += val;

      if (q.status === 'Venta') {
        ventasCount++;
        ventasTotal += val;
      } else if (q.status === 'Vencido' || q.status === 'Rechazado') {
        vencidosRechazadosCount++;
        vencidosRechazadosTotal += val;
      } else if (q.status === 'Pendiente' || q.status === 'Enviado') {
        pendientesCount++;
        pendientesTotal += val;
      } else if (q.status === 'Aceptado') {
        aceptadosCount++;
        aceptadosTotal += val;
      }
    });

    return {
      ventasCount,
      ventasTotal,
      vencidosRechazadosCount,
      vencidosRechazadosTotal,
      pendientesCount,
      pendientesTotal,
      aceptadosCount,
      aceptadosTotal,
      totalPosiblesCount,
      totalPosiblesTotal
    };
  }, [quotes]);

  // Badge styling helper according to Contagram status types with Barda aesthetics
  const getStatusBadge = (status: QuoteLogItem['status']) => {
    switch (status) {
      case 'Venta':
        return 'bg-blue-600/10 text-blue-700 border-blue-600/30 font-bold';
      case 'Pendiente':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/30 font-bold';
      case 'Enviado':
        return 'bg-amber-600/10 text-amber-800 border-amber-600/30 font-bold';
      case 'Aceptado':
        return 'bg-emerald-600/10 text-emerald-700 border-emerald-600/30 font-bold';
      case 'Vencido':
        return 'bg-rose-600/10 text-rose-700 border-rose-600/30 font-bold';
      case 'Rechazado':
        return 'bg-red-700/10 text-red-800 border-red-700/30 font-bold';
      default:
        return 'bg-stone/10 text-stone border-stone/30 font-bold';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      
      {/* 1. TOP HEADER BANNER & ACTION BAR */}
      <div className="bg-[#3D1F0D] text-cream p-4 sm:p-5 rounded-2xl shadow-md border border-terra/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-terra/20 rounded-xl text-terra border border-terra/30 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2.5 py-0.5 rounded-full">
                Módulo de Presupuestos
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-cream">
                Registro de Presupuestos y Estados
              </h2>
            </div>
            <p className="text-xs text-cream/80 mt-1">
              Seguimiento integral del ciclo de venta, cotizaciones pendientes, aceptadas y convertidas.
            </p>
          </div>
        </div>

        {/* CTA NUEVO PRESUPUESTO BUTTON */}
        <button
          onClick={onNewQuoteClick}
          className="bg-terra hover:bg-terra/90 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Presupuesto
        </button>
      </div>

      {/* 2. FILTERS & SEARCH BAR (ESTILO CONTAGRAM) */}
      <div className="bg-white border border-sand rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* SEARCH INPUT */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Nro, Cliente, CUIT o Categoría..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full text-xs py-2 pl-9 pr-3 border border-sand rounded-lg bg-light-cream/30 text-brown focus:outline-none focus:border-terra font-sans"
          />
        </div>

        {/* DROPDOWN FILTERS */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* ESTADO FILTER */}
          <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] font-bold text-stone">Estado:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
            >
              <option value="todos">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Enviado">Enviado</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Venta">Venta (Convertido)</option>
              <option value="Vencido">Vencido</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>

          {/* CATEGORIA FILTER */}
          {categoriesList.length > 0 && (
            <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
              <span className="text-[11px] font-bold text-stone">Categoría:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
              >
                <option value="todos">Todas</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* EMISION DATE FILTER */}
          <div className="flex items-center gap-1.5 bg-light-cream/60 border border-sand/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] font-bold text-stone">Emisión:</span>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-bold text-brown focus:outline-none focus:border-terra cursor-pointer"
            >
              <option value="todos">Cualquier Fecha</option>
              <option value="este_mes">Este Mes</option>
              <option value="ultimo_mes">Mes Anterior</option>
            </select>
          </div>

          {/* RESET BUTTON */}
          {(searchTerm || statusFilter !== 'todos' || categoryFilter !== 'todos' || dateFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('todos');
                setCategoryFilter('todos');
                setDateFilter('todos');
              }}
              className="p-2 text-stone hover:text-terra border border-sand rounded-lg bg-white hover:bg-cream/40 transition-all cursor-pointer"
              title="Limpiar Filtros"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. KPI SUMMARY BAR (ESTILO CONTAGRAM FOTO DE REFERENCIA) */}
      <div className="bg-white border border-sand rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-sand/50 gap-4 lg:gap-0">
          
          {/* CARD 1: VENTAS */}
          <div className="flex flex-col justify-between px-3 py-1">
            <div className="text-xs font-bold text-stone flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Ventas ({metrics.ventasCount})</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-serif font-bold text-blue-700">
                {fmt(metrics.ventasTotal)}
              </span>
            </div>
          </div>

          {/* CARD 2: VENCIDOS / RECHAZADOS */}
          <div className="flex flex-col justify-between px-3 py-1">
            <div className="text-xs font-bold text-stone flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>Vencidos / Rechazados ({metrics.vencidosRechazadosCount})</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-serif font-bold text-rose-700">
                {fmt(metrics.vencidosRechazadosTotal)}
              </span>
            </div>
          </div>

          {/* CARD 3: PENDIENTES */}
          <div className="flex flex-col justify-between px-3 py-1">
            <div className="text-xs font-bold text-stone flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Pendientes ({metrics.pendientesCount})</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-serif font-bold text-amber-700">
                {fmt(metrics.pendientesTotal)}
              </span>
            </div>
          </div>

          {/* CARD 4: ACEPTADOS */}
          <div className="flex flex-col justify-between px-3 py-1">
            <div className="text-xs font-bold text-stone flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Aceptados ({metrics.aceptadosCount})</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-serif font-bold text-emerald-700">
                {fmt(metrics.aceptadosTotal)}
              </span>
            </div>
          </div>

          {/* CARD 5: TOTAL POSIBLES */}
          <div className="flex flex-col justify-between px-3 py-1 bg-cream/30 rounded-xl lg:rounded-none">
            <div className="text-xs font-bold text-brown flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brown"></span>
              <span>Total Posibles ({metrics.totalPosiblesCount})</span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-serif font-bold text-brown">
                {fmt(metrics.totalPosiblesTotal)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. TABLA DE PRESUPUESTOS (ESTILO CONTAGRAM CON REGISTRO DE ESTADOS) */}
      <div className="bg-white border border-sand rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sand flex items-center justify-between bg-light-cream/40">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-terra" />
            <h3 className="font-serif text-base font-bold text-brown">
              Listado de Presupuestos
            </h3>
            <span className="text-xs font-bold text-stone bg-white px-2.5 py-0.5 rounded-full border border-sand">
              {filteredQuotes.length} resultado(s)
            </span>
          </div>

          <span className="text-[11px] font-bold text-stone hidden sm:inline">
            Hacé clic en el estado para cambiarlo rápidamente
          </span>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-12 h-12 text-sand mx-auto mb-3" />
            <p className="font-serif text-base font-bold text-brown">No se encontraron presupuestos.</p>
            <p className="text-xs text-stone mt-1">Ajustá los filtros o creá un nuevo presupuesto en la solapa "Nuevo Presupuesto".</p>
            <button
              onClick={onNewQuoteClick}
              className="mt-4 bg-brown text-cream text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-terra transition-all cursor-pointer"
            >
              + Crear Nuevo Presupuesto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#3D1F0D] text-cream text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-2 text-center">Id</th>
                  <th className="py-3 px-3">Emisión</th>
                  <th className="py-3 px-3">Vencimiento</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Nro. Presupuesto</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Descuento</th>
                  <th className="py-3 px-3 text-right">Total Final</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/40">
                {filteredQuotes.map((q) => {
                  const subtotalVal = q.subtotal ?? q.totalValue;
                  const discountVal = q.discount ?? 0;
                  const finalVal = q.totalValue;

                  return (
                    <tr key={q.id} className="hover:bg-light-cream/40 transition-colors group">
                      
                      {/* ESTADO SELECTOR BADGE */}
                      <td className="py-2.5 px-3">
                        {canEdit ? (
                          <div className="relative inline-block">
                            <select
                              value={q.status}
                              onChange={(e) => onUpdateQuoteStatus(q.id, e.target.value as QuoteLogItem['status'])}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer appearance-none pr-6 font-bold ${getStatusBadge(q.status)}`}
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Enviado">Enviado</option>
                              <option value="Aceptado">Aceptado</option>
                              <option value="Venta">Venta</option>
                              <option value="Vencido">Vencido</option>
                              <option value="Rechazado">Rechazado</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        ) : (
                          <span className={`inline-block text-[11px] px-2.5 py-1 rounded-lg border ${getStatusBadge(q.status)}`}>
                            {q.status}
                          </span>
                        )}
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-2 text-center font-mono text-stone font-semibold">
                        #{q.id}
                      </td>

                      {/* EMISION */}
                      <td className="py-2.5 px-3 font-medium text-stone">
                        {q.date ? new Date(q.date + 'T12:00:00').toLocaleDateString('es-AR') : '—'}
                      </td>

                      {/* VENCIMIENTO */}
                      <td className="py-2.5 px-3 text-stone font-medium">
                        {q.vencimiento ? new Date(q.vencimiento + 'T12:00:00').toLocaleDateString('es-AR') : '—'}
                      </td>

                      {/* CLIENTE */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-brown">{q.client?.nombre || 'Consumidor Final'}</div>
                        {q.client?.telefono && (
                          <div className="text-[10px] text-stone">{q.client.telefono}</div>
                        )}
                      </td>

                      {/* CATEGORIA */}
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] bg-sand/30 text-brown font-bold px-2 py-0.5 rounded-md">
                          {q.category || 'General'}
                        </span>
                      </td>

                      {/* NRO. PRESUPUESTO */}
                      <td className="py-2.5 px-3 font-mono font-bold text-terra">
                        {q.quoteNum}
                      </td>

                      {/* SUBTOTAL SIN DESCUENTO */}
                      <td className="py-2.5 px-3 text-right font-medium text-stone">
                        {fmt(subtotalVal)}
                      </td>

                      {/* DESCUENTO */}
                      <td className="py-2.5 px-3 text-right font-medium text-rose-700">
                        {discountVal > 0 ? `- ${fmt(discountVal)}` : 'AR$ 0'}
                      </td>

                      {/* SUBTOTAL CON DESCUENTO / TOTAL FINAL */}
                      <td className="py-2.5 px-3 text-right font-bold text-brown font-mono text-xs">
                        {fmt(finalVal)}
                      </td>

                      {/* ACCIONES */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* EDIT / LOAD TO COTIZADOR */}
                          <button
                            onClick={() => onLoadQuoteToCotizador(q)}
                            className="p-1.5 text-stone hover:text-brown hover:bg-sand/40 rounded transition-all cursor-pointer"
                            title="Editar en Cotizador"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* CONVERT TO SALE */}
                          {q.status !== 'Venta' && canEdit && (
                            <button
                              onClick={() => onConvertToSale(q)}
                              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-all cursor-pointer font-bold flex items-center gap-0.5"
                              title="Convertir / Cargar como Venta"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* DELETE */}
                          {canEdit && (
                            <button
                              onClick={() => onDeleteQuote(q.id)}
                              className="p-1.5 text-stone hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="Eliminar Presupuesto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* FOOTER METRICS SUMMARY */}
        <div className="bg-light-cream/40 px-5 py-3 border-t border-sand flex justify-between items-center text-xs text-stone font-medium">
          <div>
            Mostrando <strong className="text-brown">{filteredQuotes.length}</strong> de <strong className="text-brown">{quotes.length}</strong> presupuestos.
          </div>

          <div className="flex items-center gap-2">
            <span>Suma Total Seleccionada:</span>
            <strong className="text-brown font-serif text-sm">
              {fmt(filteredQuotes.reduce((acc, q) => acc + (q.totalValue || 0), 0))}
            </strong>
          </div>
        </div>

      </div>

    </div>
  );
};
