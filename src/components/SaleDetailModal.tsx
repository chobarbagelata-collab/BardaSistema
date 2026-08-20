import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Pencil, 
  Trash2, 
  FileText, 
  Wrench, 
  DollarSign, 
  Copy, 
  Check, 
  Printer, 
  Paperclip, 
  Eye, 
  Truck, 
  MessageCircle, 
  File,
  ChevronRight,
  TrendingUp,
  PackageCheck
} from 'lucide-react';

export interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any | null;
  fmt: (n: number) => string;
  fmtDate: (d: string) => string;
  canEdit?: boolean;
  onEdit?: (sale: any) => void;
  onDelete?: (saleId: number | string) => void;
  onUpdateStatus?: (saleId: number | string, field: 'status' | 'paymentStatus', value: string) => void;
  onGenerateRemito?: (sale: any) => void;
  onSendToTaller?: (sale: any) => void;
  onRegisterPayment?: (sale: any) => void;
  onPreviewImage?: (preview: { url: string; name: string }) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  fmt,
  fmtDate,
  canEdit = true,
  onEdit,
  onDelete,
  onUpdateStatus,
  onGenerateRemito,
  onSendToTaller,
  onRegisterPayment,
  onPreviewImage
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !sale) return null;

  const total = Number(sale.total) || 0;
  const sena = Number(sale.senaAmount) || 0;
  const remainingBalance = Math.max(0, total - sena);
  const profit = Number(sale.profit) || 0;
  const totalCost = Number(sale.totalCost) || Math.max(0, total - profit);
  const items = sale.items || [];
  const client = sale.client || {};
  const attachments = sale.attachments || [];
  const cleanPhone = client.telefono ? client.telefono.replace(/[^0-9]/g, '') : '';
  const isPaid = sale.paymentStatus === 'Pagado';
  const isDelivered = sale.status === 'Entregado';

  const handleCopySummary = () => {
    const itemsText = items.map((it: any) => `• ${it.qty || it.quantity || 1}x ${it.name}${it.detail ? ` (${it.detail})` : ''} - ${fmt(it.totalPrice || (it.unitPrice * (it.qty || 1)))}`).join('\n');
    
    const summary = `
BARDA HOME - PEDIDO DE VENTA #${sale.orderNum}
---------------------------------------------
Cliente: ${client.nombre || 'Consumidor Final'}
${client.telefono ? `Teléfono: ${client.telefono}\n` : ''}${client.direccion ? `Dirección: ${client.direccion} (${client.ciudad || ''})\n` : ''}Fecha Pedido: ${fmtDate(sale.date)}
Fecha Entrega Estimada: ${sale.deliveryDate || 'A coordinar'}

PRODUCTOS:
${itemsText}

RESUMEN FINANCIERO:
Total: ${fmt(total)}
Seña Abonada: ${fmt(sena)}
Saldo Pendiente: ${fmt(remainingBalance)}
Estado Pago: ${sale.paymentStatus || 'Pendiente'}
Estado Entrega: ${sale.status || 'Pendiente'}
Medio de Pago: ${sale.paymentMethod || 'No especificado'}
${sale.notes ? `\nNotas: ${sale.notes}` : ''}
---------------------------------------------
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
        className="bg-white border-2 border-sand rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2C1609] via-[#3D1F0D] to-[#4A2410] text-cream flex items-start justify-between border-b border-terra/30">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-terra/20 text-terra border border-terra/30 shadow-sm shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-terra text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  {sale.orderNum || `PED-${sale.id}`}
                </span>
                
                {/* Badge Estado de Entrega */}
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  sale.status === 'Entregado' ? 'bg-blue-600/30 text-blue-200 border-blue-400/30' :
                  sale.status === 'Listo para Entrega' ? 'bg-emerald-600/30 text-emerald-200 border-emerald-400/30' :
                  sale.status === 'En Producción' ? 'bg-amber-500/30 text-amber-200 border-amber-400/30' :
                  'bg-rose-500/30 text-rose-200 border-rose-400/30'
                }`}>
                  <Truck className="w-3 h-3" />
                  <span>{sale.status || 'Pendiente'}</span>
                </span>

                {/* Badge Estado de Pago */}
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  sale.paymentStatus === 'Pagado' ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30' :
                  sale.paymentStatus === 'Señado' ? 'bg-amber-500/30 text-amber-200 border-amber-400/30' :
                  'bg-stone/30 text-stone-200 border-stone/30'
                }`}>
                  <DollarSign className="w-3 h-3" />
                  <span>{sale.paymentStatus || 'Pendiente'}</span>
                </span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold text-cream">
                {client.nombre || 'Consumidor Final'}
              </h2>
              
              <div className="text-xs text-cream/75 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-terra" />
                  <span>Fecha: <strong>{fmtDate(sale.date)}</strong></span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Entrega Estimada: <strong className="text-amber-200">{sale.deliveryDate || 'A coordinar'}</strong></span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-cream/70 hover:text-cream hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* 1. HERO FINANCIAL METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-light-cream/40 border border-sand p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone block mb-0.5">Venta Total</span>
              <div className="text-xl sm:text-2xl font-serif font-bold text-brown font-mono">
                {fmt(total)}
              </div>
              <span className="text-[10px] text-stone mt-0.5 block">{items.length} producto(s)</span>
            </div>

            <div className="bg-light-cream/40 border border-sand p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone block mb-0.5">Seña Abonada</span>
              <div className="text-xl sm:text-2xl font-serif font-bold text-brown font-mono">
                {fmt(sena)}
              </div>
              <span className="text-[10px] text-stone mt-0.5 block">
                {total > 0 ? `${Math.round((sena / total) * 100)}% del total` : '0%'}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              remainingBalance > 0 
                ? 'bg-amber-50/60 border-amber-300' 
                : 'bg-emerald-50/60 border-emerald-300'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone block mb-0.5">
                {remainingBalance > 0 ? 'Saldo a Cobrar' : 'Saldo Cancelado'}
              </span>
              <div className={`text-xl sm:text-2xl font-serif font-bold font-mono ${
                remainingBalance > 0 ? 'text-terra' : 'text-emerald-700'
              }`}>
                {fmt(remainingBalance)}
              </div>
              <span className="text-[10px] text-stone mt-0.5 block">
                {remainingBalance > 0 ? 'Pendiente de cobro' : '100% abonado'}
              </span>
            </div>

            <div className="bg-emerald-50/40 border border-emerald-200/80 p-3.5 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block mb-0.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-700" />
                Ganancia Est.
              </span>
              <div className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 font-mono">
                {fmt(profit)}
              </div>
              <span className="text-[10px] text-stone mt-0.5 block">
                Costo: {fmt(totalCost)}
              </span>
            </div>
          </div>

          {/* 2. CLIENT & DELIVERY INFO CARD */}
          <div className="bg-light-cream/30 border border-sand/80 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between border-b border-sand/60 pb-2">
              <h4 className="text-xs uppercase font-bold text-brown tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-terra" />
                <span>Datos del Cliente & Entrega</span>
              </h4>
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-stone uppercase font-bold block mb-0.5">Nombre / Razón Social</span>
                <strong className="text-brown font-semibold text-sm">{client.nombre || 'Consumidor Final'}</strong>
                {client.cuit && (
                  <p className="text-[11px] text-stone mt-0.5 font-mono">CUIT/DNI: {client.cuit}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase font-bold block mb-0.5">Contacto</span>
                <p className="text-brown font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone" />
                  {client.telefono || 'Sin teléfono'}
                </p>
                {client.email && (
                  <p className="text-[11px] text-stone mt-0.5 truncate">{client.email}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] text-stone uppercase font-bold block mb-0.5">Dirección de Entrega</span>
                <p className="text-brown font-medium flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone shrink-0 mt-0.5" />
                  <span>{client.direccion || 'Sin dirección registrada'} {client.ciudad ? `(${client.ciudad}${client.provincia ? `, ${client.provincia}` : ''})` : ''}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 3. PRODUCT & ITEMS TABLE */}
          <div className="bg-white border border-sand rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-light-cream/50 border-b border-sand flex items-center justify-between">
              <h4 className="text-xs uppercase font-bold text-brown tracking-wider flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-terra" />
                <span>Detalle de Productos ({items.length})</span>
              </h4>
              <span className="text-[11px] font-bold text-stone">
                Total Ítems: {items.reduce((acc: number, it: any) => acc + (Number(it.qty || it.quantity) || 1), 0)} unidades
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand/20 text-brown font-bold text-[10px] uppercase tracking-wider border-b border-sand">
                    <th className="py-2.5 px-4 w-16 text-center">Cant.</th>
                    <th className="py-2.5 px-4">Producto & Especificaciones</th>
                    <th className="py-2.5 px-4">Categoría</th>
                    <th className="py-2.5 px-4 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/40">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone italic">
                        No hay productos registrados en este pedido.
                      </td>
                    </tr>
                  ) : (
                    items.map((it: any, idx: number) => {
                      const qty = Number(it.qty || it.quantity) || 1;
                      const unitPrice = Number(it.unitPrice) || 0;
                      const subtotalItem = Number(it.totalPrice) || (unitPrice * qty);

                      return (
                        <tr key={idx} className="hover:bg-cream/20 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-brown font-mono">
                            {qty}x
                          </td>
                          <td className="py-3 px-4">
                            <strong className="text-brown font-semibold text-xs block">{it.name}</strong>
                            {it.detail && (
                              <p className="text-[11px] text-stone italic mt-0.5 leading-tight">{it.detail}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-sand/30 text-brown rounded text-[10px] font-bold uppercase">
                              {it.category || 'Otros'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-stone font-semibold">
                            {fmt(unitPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-brown">
                            {fmt(subtotalItem)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-light-cream/40 font-bold border-t border-sand text-xs">
                    <td colSpan={4} className="py-2.5 px-4 text-right text-stone uppercase tracking-wider text-[10px]">
                      Venta Total:
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-brown text-sm">
                      {fmt(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 4. PAYMENT & NOTES & ATTACHMENTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment & Conditions */}
            <div className="bg-light-cream/30 border border-sand/70 p-4 rounded-xl space-y-2.5">
              <h5 className="text-[10px] uppercase font-bold text-stone tracking-wider border-b border-sand pb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-terra" />
                <span>Condiciones de Pago & Cuenta</span>
              </h5>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone">Medio de Pago:</span>
                <strong className="text-brown">{sale.paymentMethod || 'No especificado'}</strong>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-stone">Fecha de Pedido:</span>
                <strong className="text-brown">{fmtDate(sale.date)}</strong>
              </div>

              {sale.notes && (
                <div className="mt-2 pt-2 border-t border-sand/50">
                  <span className="text-[10px] text-stone uppercase font-bold block mb-1">Notas Comerciales / Fabricación:</span>
                  <p className="text-xs text-brown bg-white p-2.5 rounded-lg border border-sand/60 italic leading-relaxed">
                    "{sale.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Quick Status Modifiers */}
            <div className="bg-light-cream/30 border border-sand/70 p-4 rounded-xl space-y-3">
              <h5 className="text-[10px] uppercase font-bold text-stone tracking-wider border-b border-sand pb-1">
                Actualizar Estados del Pedido
              </h5>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-stone">Estado de Entrega</label>
                <select 
                  value={sale.status} 
                  onChange={e => onUpdateStatus && onUpdateStatus(sale.id, 'status', e.target.value)}
                  disabled={!canEdit}
                  className={`text-xs py-1.5 px-2.5 border rounded-lg font-bold focus:outline-none cursor-pointer disabled:opacity-60 ${
                    sale.status === 'Entregado' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                    sale.status === 'Listo para Entrega' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                    sale.status === 'En Producción' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                    'bg-white border-sand text-stone'
                  }`}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Producción">En Producción</option>
                  <option value="Listo para Entrega">Listo para Entrega</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-stone">Estado de Pago</label>
                <select 
                  value={sale.paymentStatus} 
                  onChange={e => onUpdateStatus && onUpdateStatus(sale.id, 'paymentStatus', e.target.value)}
                  disabled={!canEdit}
                  className={`text-xs py-1.5 px-2.5 border rounded-lg font-bold focus:outline-none cursor-pointer disabled:opacity-60 ${
                    sale.paymentStatus === 'Pagado' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                    sale.paymentStatus === 'Señado' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                    'bg-white border-sand text-stone'
                  }`}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Señado">Señado</option>
                  <option value="Pagado">Pagado</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. ATTACHMENTS (PLANOS Y ARCHIVOS) */}
          {attachments.length > 0 && (
            <div className="bg-white border border-sand/80 rounded-xl p-4 shadow-2xs">
              <h5 className="text-[10px] uppercase font-bold text-brown tracking-wider flex items-center gap-1.5 border-b border-sand pb-1.5 mb-2.5">
                <Paperclip className="w-3.5 h-3.5 text-terra" />
                <span>Planos y Documentos Adjuntos ({attachments.length})</span>
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {attachments.map((att: any) => {
                  const isImg = att.type?.startsWith('image/') || att.dataUrl?.startsWith('data:image/');
                  return (
                    <div 
                      key={att.id || att.name} 
                      onClick={() => {
                        if (isImg && onPreviewImage) {
                          onPreviewImage({ url: att.dataUrl, name: att.name });
                        } else {
                          const link = document.createElement('a');
                          link.href = att.dataUrl;
                          link.download = att.name;
                          link.click();
                        }
                      }}
                      className="group bg-light-cream/40 hover:bg-cream border border-sand rounded-xl p-2 flex items-center gap-2 cursor-pointer transition-all overflow-hidden shadow-2xs"
                    >
                      {isImg ? (
                        <img src={att.dataUrl} alt={att.name} className="w-10 h-10 object-cover rounded-lg border border-sand shrink-0 group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-10 h-10 bg-terra/10 text-terra rounded-lg flex items-center justify-center shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-brown truncate">{att.name}</p>
                        <span className="text-[9px] font-bold text-terra flex items-center gap-0.5 mt-0.5">
                          <Eye className="w-2.5 h-2.5" /> {isImg ? 'Ver imagen' : 'Descargar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER WITH ACTIONS */}
        <div className="p-4 sm:p-5 bg-[#FAF6F0] border-t border-sand flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-2 bg-white border border-sand hover:bg-cream rounded-xl text-xs font-bold text-brown transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Copiar resumen del pedido para WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone" />}
              <span>{copied ? 'Copiado' : 'Copiar Resumen'}</span>
            </button>

            {remainingBalance > 0 && onRegisterPayment && canEdit && (
              <button
                type="button"
                onClick={() => {
                  onRegisterPayment(sale);
                  onClose();
                }}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Registrar cobro de saldo en Tesorería"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cobrar Saldo ({fmt(remainingBalance)})</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGenerateRemito && (
              <button
                type="button"
                onClick={() => {
                  onGenerateRemito(sale);
                  onClose();
                }}
                className="px-3 py-2 border border-sand/80 bg-white hover:bg-cream text-brown rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Emitir Remito Oficial X de Entrega"
              >
                <FileText className="w-3.5 h-3.5 text-terra" />
                <span>Remito</span>
              </button>
            )}

            {onSendToTaller && (
              <button
                type="button"
                onClick={() => {
                  onSendToTaller(sale);
                  onClose();
                }}
                className="px-3 py-2 border border-terra/40 bg-terra/10 hover:bg-terra hover:text-white text-terra rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Enviar Orden a Fabricación / Taller"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Taller</span>
              </button>
            )}

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(sale);
                  onClose();
                }}
                className="px-3.5 py-2 bg-brown hover:bg-brown/90 text-cream rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Editar Venta / Precios / Costos"
              >
                <Pencil className="w-3.5 h-3.5 text-terra" />
                <span>Editar</span>
              </button>
            )}

            {canEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(sale.id);
                  onClose();
                }}
                className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Eliminar este pedido"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
