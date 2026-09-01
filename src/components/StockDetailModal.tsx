import React, { useState } from "react";
import {
  X,
  Package,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit,
  Trash2,
  Copy,
  Check,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  History,
  FileText,
  ShieldAlert,
  Tag
} from "lucide-react";
import { StockItem, StockMovement } from "../types";

export interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
  stockMovements: StockMovement[];
  fmt: (num: number) => string;
  canEdit?: boolean;
  onEdit?: (item: StockItem) => void;
  onAdjust?: (item: StockItem) => void;
  onDelete?: (itemId: string) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  stockMovements = [],
  fmt,
  canEdit = true,
  onEdit,
  onAdjust,
  onDelete
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const qty = Number(item.qty) || 0;
  const costUnit = Number(item.costUnit) || 0;
  const priceSuggested = Number(item.priceSuggested) || 0;
  const minAlert = Number(item.minAlertQty) ?? 2;

  const totalCost = qty * costUnit;
  const totalSale = qty * priceSuggested;
  const unitProfit = priceSuggested - costUnit;
  const totalProfit = qty * unitProfit;
  const marginPercent = priceSuggested > 0 ? ((unitProfit / priceSuggested) * 100).toFixed(1) : "0";

  const isLow = qty <= minAlert && qty > 0;
  const isOut = qty <= 0;

  // Filter movements for this specific item
  const itemMovements = stockMovements.filter(
    (mov) =>
      mov.stockItemId === item.id ||
      mov.itemId === item.id ||
      (mov.itemName && mov.itemName.trim().toLowerCase() === item.name.trim().toLowerCase())
  );

  const handleCopySummary = () => {
    const summary = `
BARDA HOME - FICHA TÉCNICA DE STOCK
---------------------------------------------
Producto: ${item.name}
Categoría: ${item.category || "General"}
ID Referencia: #${item.id.slice(0, 8)}
Detalle / Especificaciones: ${item.detail || "Sin especificaciones detalladas"}

INVENTARIO Y VALORIZACIÓN:
• Stock Disponible: ${qty} unidades
• Alerta Mínima: ${minAlert} unidades
• Estado: ${isOut ? "SIN STOCK" : isLow ? "STOCK BAJO" : "DISPONIBLE"}
• Costo Unitario: ${fmt(costUnit)}
• Inversión Total: ${fmt(totalCost)}
• Precio Venta Sugerido: ${fmt(priceSuggested)}
• Ganancia Unitaria: +${fmt(unitProfit)} (${marginPercent}%)
• Ganancia Potencial Total: +{fmt(totalProfit)}
---------------------------------------------
Fecha de Registro: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString("es-AR") : "-"}
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 bg-brown/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white border-2 border-sand rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-sand/15 border-b border-sand flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sand/30 border border-sand/80 flex items-center justify-center text-terra shadow-xs shrink-0 mt-0.5">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-terra uppercase tracking-wider bg-sand/40 px-2 py-0.5 rounded-md">
                  #{item.id.slice(0, 8)}
                </span>
                <span className="px-2 py-0.5 bg-sand/50 text-stone rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {item.category || "General"}
                </span>
                {isOut ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Sin Stock
                  </span>
                ) : isLow ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Stock Bajo ({qty} u.)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> En Stock ({qty} u.)
                  </span>
                )}
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-brown">
                {item.name}
              </h2>
              {item.createdAt && (
                <div className="flex items-center gap-1.5 text-stone text-[11px] mt-1">
                  <Calendar className="w-3 h-3 text-stone/80" />
                  <span>
                    Ingresado el {new Date(item.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                  {item.updatedAt && item.updatedAt !== item.createdAt && (
                    <span className="text-stone/60">
                      • Actualizado el {new Date(item.updatedAt).toLocaleDateString("es-AR")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone hover:text-brown hover:bg-sand/30 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* METRICS BENTO GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Stock Disponible */}
            <div className="bg-sand/15 border border-sand/60 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-stone uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3 h-3 text-terra" /> Stock Disponible
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`font-mono text-2xl font-extrabold ${
                    isOut ? "text-rose-600" : isLow ? "text-amber-800" : "text-brown"
                  }`}
                >
                  {qty}
                </span>
                <span className="text-xs font-bold text-stone">unidades</span>
              </div>
              <span className="text-[10px] text-stone font-medium mt-1">
                Umbral alerta: {minAlert} u.
              </span>
            </div>

            {/* Costo Unitario & Inversión */}
            <div className="bg-sand/15 border border-sand/60 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-stone uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-stone" /> Costo Unitario
              </span>
              <div className="mt-2">
                <span className="font-mono text-lg font-bold text-brown">{fmt(costUnit)}</span>
              </div>
              <span className="text-[10px] text-stone font-medium mt-1">
                Total Invertido: <strong className="text-brown">{fmt(totalCost)}</strong>
              </span>
            </div>

            {/* Precio Venta Sugerido */}
            <div className="bg-sand/15 border border-sand/60 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-700" /> Precio Venta Sug.
              </span>
              <div className="mt-2">
                <span className="font-mono text-lg font-bold text-emerald-800">
                  {fmt(priceSuggested)}
                </span>
              </div>
              <span className="text-[10px] text-stone font-medium mt-1">
                Valor Total: <strong className="text-emerald-900">{fmt(totalSale)}</strong>
              </span>
            </div>

            {/* Ganancia Estimada */}
            <div className="bg-sand/15 border border-sand/60 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-terra uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-terra" /> Margen Estimado
              </span>
              <div className="mt-2">
                <span className="font-mono text-lg font-bold text-terra">+{fmt(unitProfit)}</span>
              </div>
              <span className="text-[10px] text-stone font-medium mt-1">
                Margen: <strong className="text-terra">{marginPercent}%</strong> • Total: +{fmt(totalProfit)}
              </span>
            </div>
          </div>

          {/* DETALLE Y ESPECIFICACIONES */}
          <div className="bg-white border border-sand rounded-xl p-4 sm:p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-brown uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-terra" />
              Especificaciones y Configuración
            </h3>
            {item.detail ? (
              <div className="bg-sand/20 rounded-lg p-3.5 border border-sand/50">
                <p className="text-xs text-brown font-medium leading-relaxed whitespace-pre-line">
                  {item.detail}
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone italic">
                Sin especificaciones adicionales registradas para este artículo.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-sand/40 text-xs">
              <div>
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">
                  Categoría
                </span>
                <span className="font-medium text-brown">{item.category || "General"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">
                  Alerta Stock Mínimo
                </span>
                <span className="font-medium text-brown">{minAlert} unidades</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone uppercase tracking-wider block">
                  ID Interno
                </span>
                <span className="font-mono text-[11px] text-stone">{item.id}</span>
              </div>
            </div>
          </div>

          {/* HISTORIAL DE MOVIMIENTOS */}
          <div className="bg-white border border-sand rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-brown uppercase tracking-wider flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-terra" />
                Historial de Movimientos de este Artículo
              </h3>
              <span className="text-[11px] text-stone font-medium">
                {itemMovements.length} registro(s)
              </span>
            </div>

            {itemMovements.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone bg-sand/10 rounded-lg border border-dashed border-sand">
                No hay movimientos registrados específicamente para este producto aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sand/20 border-b border-sand text-stone text-[9px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-2 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">Costo / Valor</th>
                      <th className="py-2.5 px-3">Detalle / Pedido</th>
                      <th className="py-2.5 px-3">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/40">
                    {itemMovements.map((mov) => {
                      const isIngreso =
                        mov.type === "IN_COMPRA" || mov.type === "IN_FABRICACION";
                      const isEgreso = mov.type === "OUT_VENTA";
                      const isAjuste = mov.type === "AJUSTE";
                      const typeLabel =
                        mov.type === "IN_COMPRA"
                          ? "Compra"
                          : mov.type === "IN_FABRICACION"
                          ? "Fabricación"
                          : mov.type === "OUT_VENTA"
                          ? "Venta"
                          : "Ajuste";
                      const movDate = mov.date || mov.createdAt;

                      return (
                        <tr key={mov.id} className="hover:bg-sand/10 transition-colors">
                          <td className="py-2.5 px-3 text-stone font-mono text-[11px] whitespace-nowrap">
                            {movDate
                              ? new Date(movDate).toLocaleString("es-AR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "-"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                                isIngreso
                                  ? "bg-emerald-100 text-emerald-900"
                                  : isEgreso
                                  ? "bg-rose-100 text-rose-900"
                                  : "bg-indigo-100 text-indigo-900"
                              }`}
                            >
                              {isIngreso && <ArrowUpRight className="w-2.5 h-2.5" />}
                              {isEgreso && <ArrowDownRight className="w-2.5 h-2.5" />}
                              {isAjuste && <RefreshCw className="w-2.5 h-2.5" />}
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold">
                            <span
                              className={
                                isIngreso
                                  ? "text-emerald-700"
                                  : isEgreso
                                  ? "text-rose-600"
                                  : "text-brown"
                              }
                            >
                              {isIngreso ? `+${mov.qty}` : isEgreso ? `-${mov.qty}` : `${mov.qty}`} u.
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone font-semibold">
                            {fmt(mov.totalCost || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-stone max-w-[180px] truncate">
                            {mov.notes ||
                              (mov.relatedOrderNum ? `Pedido #${mov.relatedOrderNum}` : "-")}
                          </td>
                          <td className="py-2.5 px-3 text-stone text-[10px] font-medium">
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
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-sand/20 border-t border-sand flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sand bg-white hover:bg-sand/30 text-brown text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Copiar ficha técnica al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone" />
                  <span>Copiar Ficha</span>
                </>
              )}
            </button>

            {canEdit && onDelete && (
              <button
                onClick={() => {
                  if (
                    confirm(`¿Eliminar definitivamente "${item.name}" del catálogo de stock?`)
                  ) {
                    onDelete(item.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
                title="Eliminar este artículo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onAdjust && (
              <button
                onClick={() => {
                  onAdjust(item);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sand bg-white hover:bg-sand/40 text-brown text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-terra" />
                <span>Ajustar Cantidad</span>
              </button>
            )}

            {canEdit && onEdit && (
              <button
                onClick={() => {
                  onEdit(item);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terra hover:bg-[#A85B24] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Producto</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-sand bg-sand/30 hover:bg-sand/60 text-stone text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
