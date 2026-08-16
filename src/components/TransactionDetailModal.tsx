import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  Tag, 
  CreditCard, 
  DollarSign, 
  User, 
  CheckCircle2, 
  Clock, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  TrendingDown, 
  TrendingUp, 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Receipt,
  Share2,
  Printer
} from 'lucide-react';

export interface TransactionDetailItem {
  id?: string | number;
  originalId?: string | number;
  rawType: 'egreso' | 'ingreso' | 'pedido_saldo';
  codigo?: string;
  fecha?: string;
  entidad?: string;
  operacion?: string;
  descripcion?: string;
  moneda?: string;
  medio?: string;
  cuenta?: string;
  subCategoria?: string;
  categoria?: string;
  monto: number;
  baseMonto?: number;
  ivaPct?: number;
  estado?: 'Pagado' | 'Cobrado' | 'Pendiente' | string;
  nota?: string;
  orderNum?: string;
  orderId?: number;
  clientName?: string;
  isFixedCost?: boolean;
  isLedger?: boolean;
  originalItem?: any;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionDetailItem | null;
  fmt: (n: number) => string;
  canEdit?: boolean;
  onEdit?: (transaction: TransactionDetailItem) => void;
  onDelete?: (transaction: TransactionDetailItem) => void;
  onToggleStatus?: (transaction: TransactionDetailItem) => void;
  onViewOrder?: (orderIdOrNum: string | number) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  fmt,
  canEdit = true,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewOrder
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const isEgreso = transaction.rawType === 'egreso';
  const isPending = transaction.estado === 'Pendiente';
  const category = transaction.subCategoria || transaction.categoria || (isEgreso ? 'Gasto Operativo' : 'Cobro / Ingreso');
  const account = transaction.medio || transaction.cuenta || 'Efectivo';
  const concept = transaction.operacion || transaction.descripcion || 'Sin descripción especificada';
  const entity = transaction.entidad || transaction.clientName || (isEgreso ? 'Proveedor / Taller' : 'Consumidor Final');
  const currency = transaction.moneda || 'ARS';
  const totalAmount = Number(transaction.monto) || 0;
  const baseAmount = Number(transaction.baseMonto) || totalAmount;
  const ivaPct = Number(transaction.ivaPct) || 0;
  const ivaAmount = ivaPct > 0 ? (baseAmount * ivaPct) / 100 : 0;
  const code = transaction.codigo || (isEgreso ? `EGR-${String(transaction.originalId || transaction.id || '').slice(-4)}` : `ING-${String(transaction.originalId || transaction.id || '').slice(-4)}`);

  const handleCopySummary = () => {
    const summary = `
BARDA ERP - DETALLE DE MOVIMIENTO
---------------------------------
Código: ${code}
Tipo: ${isEgreso ? 'Egreso / Gasto' : 'Ingreso / Cobro'}
Fecha: ${transaction.fecha || '—'}
Entidad / Cliente: ${entity}
Concepto: ${concept}
Categoría: ${category}
Cuenta: ${account}
Estado: ${transaction.estado || (isPending ? 'Pendiente' : isEgreso ? 'Pagado' : 'Cobrado')}
Total: ${currency === 'USD' ? 'US$' : '$'}${fmt(totalAmount)}
${ivaPct > 0 ? `Base: $${fmt(baseAmount)} | IVA (${ivaPct}%): $${fmt(ivaAmount)}` : ''}
${transaction.nota ? `Notas: ${transaction.nota}` : ''}
---------------------------------
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-brown/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white border-2 border-sand rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className={`p-5 sm:p-6 text-cream flex items-start justify-between border-b ${
          isEgreso 
            ? 'bg-gradient-to-r from-[#3D1F0D] via-[#4A2410] to-[#5C1D1D] border-rose-900/40' 
            : 'bg-gradient-to-r from-[#3D1F0D] via-[#1E3A2F] to-[#144234] border-emerald-900/40'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl border shadow-sm ${
              isEgreso 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {isEgreso ? (
                <TrendingDown className="w-6 h-6" />
              ) : (
                <TrendingUp className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isEgreso 
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30' 
                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                }`}>
                  {isEgreso ? 'Egreso / Gasto Operativo' : 'Ingreso / Cobranza'}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isPending 
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' 
                    : 'bg-white/15 text-white border border-white/20'
                }`}>
                  {isPending ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {transaction.estado || (isPending ? 'Pendiente' : isEgreso ? 'Pagado' : 'Cobrado')}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream">
                {concept}
              </h2>
              <p className="text-xs text-cream/70 mt-0.5 flex items-center gap-2">
                <span className="font-mono font-bold text-cream/90">{code}</span>
                <span>•</span>
                <span>{transaction.fecha || 'Fecha no registrada'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* HERO AMOUNT BOX */}
          <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isEgreso 
              ? 'bg-rose-50/60 border-rose-200/80' 
              : 'bg-emerald-50/60 border-emerald-200/80'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone block mb-0.5">
                {isEgreso ? 'Monto Total Egresado' : 'Monto Total Percibido'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-serif font-bold ${
                  isEgreso ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {isEgreso ? '-' : '+'}${fmt(totalAmount)}
                </span>
                <span className="text-xs font-mono font-bold text-stone">
                  {currency}
                </span>
              </div>
            </div>

            {/* TAX BREAKDOWN PILLS */}
            <div className="flex flex-wrap items-center gap-2">
              {ivaPct > 0 ? (
                <div className="bg-white/80 border border-sand/80 px-3 py-1.5 rounded-xl text-right">
                  <div className="text-[10px] text-stone">
                    Base: <strong className="text-brown">${fmt(baseAmount)}</strong>
                  </div>
                  <div className="text-[10px] text-stone font-semibold">
                    IVA ({ivaPct}%): <strong className="text-brown">${fmt(ivaAmount)}</strong>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-sand/80 text-stone px-3 py-1.5 rounded-xl">
                  Sin IVA / Exento
                </span>
              )}

              <div className="bg-white/80 border border-sand/80 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-stone block">Cuenta Destino</span>
                <span className="text-xs font-bold text-brown flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3 text-terra" />
                  {account}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN ATTRIBUTES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Categoría */}
            <div className="bg-light-cream/40 border border-sand/70 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-stone text-[10px] font-bold uppercase tracking-wider mb-1">
                <Tag className="w-3 h-3 text-terra" />
                <span>Categoría / Rubro</span>
              </div>
              <strong className="text-sm font-semibold text-brown block">
                {category}
              </strong>
            </div>

            {/* Card 2: Entidad / Cliente / Proveedor */}
            <div className="bg-light-cream/40 border border-sand/70 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-stone text-[10px] font-bold uppercase tracking-wider mb-1">
                <User className="w-3 h-3 text-terra" />
                <span>{isEgreso ? 'Proveedor / Taller / Empleado' : 'Cliente / Pagador'}</span>
              </div>
              <strong className="text-sm font-semibold text-brown block truncate" title={entity}>
                {entity}
              </strong>
            </div>

            {/* Card 3: Fecha & Periodo */}
            <div className="bg-light-cream/40 border border-sand/70 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-stone text-[10px] font-bold uppercase tracking-wider mb-1">
                <Calendar className="w-3 h-3 text-terra" />
                <span>Fecha del Registro</span>
              </div>
              <strong className="text-sm font-semibold text-brown block">
                {transaction.fecha || 'No especificada'}
              </strong>
            </div>

            {/* Card 4: Cuenta & Medio */}
            <div className="bg-light-cream/40 border border-sand/70 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-stone text-[10px] font-bold uppercase tracking-wider mb-1">
                <CreditCard className="w-3 h-3 text-terra" />
                <span>Medio de Pago</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  account.toLowerCase().includes('efectivo') ? 'bg-amber-500' :
                  account.toLowerCase().includes('santander') ? 'bg-orange-600' : 'bg-sky-500'
                }`}></span>
                <strong className="text-sm font-semibold text-brown">
                  {account}
                </strong>
              </div>
            </div>
          </div>

          {/* DETALLES ADICIONALES / NOTAS */}
          {(transaction.nota || transaction.operacion) && (
            <div className="bg-white border border-sand rounded-xl p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 text-stone text-[10px] font-bold uppercase tracking-wider mb-1.5">
                <FileText className="w-3.5 h-3.5 text-terra" />
                <span>Observaciones & Notas Contables</span>
              </div>
              <p className="text-xs text-brown font-medium whitespace-pre-wrap leading-relaxed">
                {transaction.nota || transaction.operacion}
              </p>
            </div>
          )}

          {/* ASOCIACIÓN A PEDIDO (SI EXISTE) */}
          {(transaction.orderNum || transaction.orderId) && (
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">
                    Pedido de Venta Vinculado
                  </span>
                  <strong className="text-xs text-brown font-mono">
                    Orden #{transaction.orderNum || transaction.orderId}
                  </strong>
                </div>
              </div>

              {onViewOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onViewOrder(transaction.orderId || transaction.orderNum || '');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver Pedido</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* ESTADO CONCILIACIÓN & TOGGLE RÁPIDO */}
          {onToggleStatus && canEdit && (
            <div className="bg-light-cream/30 border border-sand/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone block">Estado de Conciliación</span>
                <span className="text-xs font-bold text-brown">
                  Actualmente: <strong className={isPending ? 'text-amber-800' : 'text-emerald-800'}>{transaction.estado || (isPending ? 'Pendiente' : 'Pagado/Cobrado')}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleStatus(transaction)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isPending 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {isPending ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Marcar como {isEgreso ? 'Pagado' : 'Cobrado'}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Marcar como Pendiente</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-[#FAF6F0] border-t border-sand flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-2 bg-white border border-sand hover:bg-cream rounded-xl text-xs font-bold text-brown transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Copiar resumen al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone" />}
              <span>{copied ? 'Copiado' : 'Copiar Resumen'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(transaction);
                  onClose();
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Eliminar este registro"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(transaction);
                  onClose();
                }}
                className="px-3.5 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-terra" />
                <span>Editar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-sand/60 hover:bg-sand text-brown rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
