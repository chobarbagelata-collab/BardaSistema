import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Check,
  Copy,
  ExternalLink,
  Bot,
  User,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  X,
  PlusCircle,
  DollarSign,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Sliders,
  CheckCheck
} from 'lucide-react';
import { ParsedWhatsAppMessage } from '../server/whatsappService';

interface WhatsAppIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fmt?: (v: number) => string;
  onApplyTransaction?: (parsed: ParsedWhatsAppMessage) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  parsedData?: ParsedWhatsAppMessage;
}

export const WhatsAppIntegrationModal: React.FC<WhatsAppIntegrationModalProps> = ({
  isOpen,
  onClose,
  fmt = (v: number) => '$ ' + (v || 0).toLocaleString('es-AR'),
  onApplyTransaction
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'guide'>('simulator');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [appliedTxIds, setAppliedTxIds] = useState<Record<string, boolean>>({});

  const [configStatus, setConfigStatus] = useState<{
    configured: boolean;
    hasVerifyToken: boolean;
    hasAccessToken: boolean;
    hasPhoneNumberId: boolean;
    verifyToken: string;
    webhookPath: string;
  }>({
    configured: false,
    hasVerifyToken: true,
    hasAccessToken: false,
    hasPhoneNumberId: false,
    verifyToken: 'barda_erp_webhook_token',
    webhookPath: '/api/whatsapp/webhook'
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '¡Hola Tomás! 👋 Soy el asistente IA de **Barda Muebles**.\n\nPuedes enviarme cualquier gasto, ingreso, cobro de seña o nuevo pedido por WhatsApp tal como hablas y lo interpretaré automáticamente.\n\n_Prueba escribiendo algo o haz clic en los ejemplos rápidos abajo._',
      time: '10:00'
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/whatsapp/config-status')
        .then((res) => res.json())
        .then((data) => setConfigStatus(data))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullWebhookUrl = `${currentOrigin}/api/whatsapp/webhook`;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsgId = Date.now().toString();
    const currentTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      time: currentTime
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: text })
      });

      if (!res.ok) throw new Error('Error al simular mensaje');

      const parsed: ParsedWhatsAppMessage = await res.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: parsed.suggestedReply,
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        parsedData: parsed
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: '⚠️ Ocurrió un error al procesar el mensaje con IA. Por favor, intenta de nuevo.',
          time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSample = (sample: string) => {
    handleSendMessage(sample);
  };

  const handleApplyToERP = (msgId: string, parsed?: ParsedWhatsAppMessage) => {
    if (!parsed) return;
    if (onApplyTransaction) {
      onApplyTransaction(parsed);
    }
    setAppliedTxIds((prev) => ({ ...prev, [msgId]: true }));
  };

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-sand rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-sand/70 bg-light-cream/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-brown">
                  Conexión WhatsApp con IA
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Meta Cloud API + Gemini 3.7
                </span>
              </div>
              <p className="text-xs text-stone mt-0.5">
                Lee mensajes en lenguaje natural y asienta gastos, ingresos y pedidos automáticamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-stone hover:text-brown hover:bg-sand/40 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-sand/70 bg-light-cream/20 px-4 sm:px-6 pt-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone hover:text-brown'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Simulador Interactivo de WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone hover:text-brown'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Guía de Conexión Oficial Meta (Paso a Paso)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f0f2f5]/40">
          {activeTab === 'simulator' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: WhatsApp Phone Interface */}
              <div className="lg:col-span-7 flex flex-col h-[520px] bg-[#EFEAE2] rounded-2xl border border-sand shadow-inner overflow-hidden relative">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#005c4b] text-white p-3 px-4 flex items-center justify-between shadow-xs z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-200 text-[#005c4b] font-bold flex items-center justify-center text-sm shadow-xs">
                      B
                    </div>
                    <div>
                      <div className="font-semibold text-sm leading-tight">Barda ERP Bot (IA)</div>
                      <div className="text-[10px] text-emerald-100/90 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                        en línea • Gemini 3.7 Flash
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded text-white/90 font-mono">
                    Oficial Meta Webhook
                  </span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3 shadow-xs text-xs sm:text-[13px] leading-relaxed relative ${
                          msg.sender === 'user'
                            ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                            : 'bg-white text-[#111b21] rounded-tl-none border border-sand/30'
                        }`}
                      >
                        <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-stone/70">
                          <span>{msg.time}</span>
                          {msg.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                        </div>
                      </div>

                      {/* Structured action card if bot recognized an operation */}
                      {msg.parsedData && msg.parsedData.intent !== 'desconocido' && (
                        <div className="mt-1.5 max-w-[85%] bg-white/95 border border-emerald-200 p-2.5 rounded-xl text-xs shadow-2xs">
                          <div className="flex items-center justify-between gap-2 border-b border-sand/40 pb-1.5 mb-1.5">
                            <span className="font-bold text-[11px] text-emerald-800 uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Operación Detectada: {msg.parsedData.intent.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                              {Math.round(msg.parsedData.confidence * 100)}% confianza
                            </span>
                          </div>

                          <div className="text-[11px] text-stone/90 mb-2">
                            {msg.parsedData.humanReadableSummary}
                          </div>

                          <button
                            onClick={() => handleApplyToERP(msg.id, msg.parsedData)}
                            disabled={appliedTxIds[msg.id]}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              appliedTxIds[msg.id]
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                            }`}
                          >
                            {appliedTxIds[msg.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                <span>¡Asentado en Barda ERP!</span>
                              </>
                            ) : (
                              <>
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Confirmar y Guardar en el Sistema</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-2 bg-white/90 border border-sand/40 p-2 px-3 rounded-xl max-w-[140px] text-xs text-stone shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                      <span className="text-[10px] text-stone/80">Analizando...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-2.5 bg-[#f0f2f5] border-t border-sand/40 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Escribe un gasto, ingreso o pedido..."
                    className="flex-1 px-3.5 py-2 rounded-full bg-white text-xs text-brown border border-sand/60 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="p-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Right Column: Prompt Examples & Operation Cards */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white border border-sand rounded-2xl p-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brown mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Probar Ejemplos Reales de Barda
                  </h4>
                  <p className="text-xs text-stone mb-3">
                    Haz clic en cualquiera de estos mensajes para simular lo que enviarías desde tu WhatsApp personal:
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleQuickSample('Gasté $45.000 en flete con Caja Chica')}
                      className="w-full text-left p-2.5 bg-rose-50/60 hover:bg-rose-50 border border-rose-100 hover:border-rose-300 rounded-xl transition-all text-xs text-rose-950 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>"Gasté $45.000 en flete con Caja Chica"</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      onClick={() => handleQuickSample('Compré tornillos y cola por $18.500 pagado con Santander')}
                      className="w-full text-left p-2.5 bg-rose-50/60 hover:bg-rose-50 border border-rose-100 hover:border-rose-300 rounded-xl transition-all text-xs text-rose-950 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>"Compré tornillos y cola $18.500 con Santander"</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-rose-400 group-hover:text-rose-700 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      onClick={() => handleQuickSample('Cobré seña de $200.000 a Juan Pérez por la Mesa Paraíso en Santander')}
                      className="w-full text-left p-2.5 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-300 rounded-xl transition-all text-xs text-emerald-950 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>"Cobré seña de $200.000 a Juan Pérez en Santander"</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-emerald-400 group-hover:text-emerald-700 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      onClick={() => handleQuickSample('Nuevo pedido para Mariana Gómez: Rack TV 1.80m $420.000 dejó $200.000 de seña cel 1133221100')}
                      className="w-full text-left p-2.5 bg-sky-50/60 hover:bg-sky-50 border border-sky-100 hover:border-sky-300 rounded-xl transition-all text-xs text-sky-950 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>"Nuevo pedido Mariana: Rack TV $420k seña $200k"</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-sky-400 group-hover:text-sky-700 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      onClick={() => handleQuickSample('¿Cuánto tenemos disponible en cajas y bancos?')}
                      className="w-full text-left p-2.5 bg-amber-50/60 hover:bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-xl transition-all text-xs text-amber-950 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>"¿Cuánto tenemos disponible en cajas y bancos?"</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-amber-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-white border border-sand rounded-2xl p-4 text-xs text-stone space-y-2">
                  <div className="font-bold text-brown text-xs flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-600" />
                    ¿Cómo funciona el motor IA?
                  </div>
                  <p className="leading-relaxed">
                    Cada mensaje es analizado en milisegundos por <strong>Gemini 3.7 Flash</strong> en el servidor seguro. La IA extrae montos, cuentas físicas o bancarias, nombres de clientes y categoriza el gasto o pedido.
                  </p>
                  <p className="leading-relaxed">
                    Al conectar el <strong>Webhook de Meta</strong>, recibirás las respuestas directamente en tu aplicación de WhatsApp en tu teléfono.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Meta Cloud API Setup Guide */
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Estado del Webhook en tu Servidor: Activo y Listo para Meta
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Tu servidor de Barda ERP ya tiene el endpoint <code>/api/whatsapp/webhook</code> configurado con handshake de verificación y procesamiento de mensajes mediante Gemini.
                </p>
              </div>

              {/* Step 1: Webhook URL & Verify Token */}
              <div className="bg-white border border-sand rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="font-serif font-bold text-sm text-brown flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-terra text-cream text-[11px] font-mono font-bold flex items-center justify-center">1</span>
                  Datos del Webhook para configurar en Meta for Developers
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone uppercase mb-1">
                      URL de Devolución de Llamada (Callback URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={fullWebhookUrl}
                        className="flex-1 px-3 py-2 bg-light-cream/40 border border-sand rounded-xl text-xs font-mono text-brown select-all"
                      />
                      <button
                        onClick={() => copyToClipboard(fullWebhookUrl, true)}
                        className="px-3.5 py-2 bg-cream text-brown hover:bg-sand/40 border border-sand rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copiado' : 'Copiar URL'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone uppercase mb-1">
                      Token de Verificación (Verify Token)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={configStatus.verifyToken}
                        className="flex-1 px-3 py-2 bg-light-cream/40 border border-sand rounded-xl text-xs font-mono text-brown select-all"
                      />
                      <button
                        onClick={() => copyToClipboard(configStatus.verifyToken, false)}
                        className="px-3.5 py-2 bg-cream text-brown hover:bg-sand/40 border border-sand rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedToken ? 'Copiado' : 'Copiar Token'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Meta developer steps */}
              <div className="bg-white border border-sand rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="font-serif font-bold text-sm text-brown flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-terra text-cream text-[11px] font-mono font-bold flex items-center justify-center">2</span>
                  Pasos en Meta for Developers (developers.facebook.com)
                </h4>

                <ol className="list-decimal list-inside space-y-2.5 text-xs text-brown leading-relaxed font-sans">
                  <li>
                    Ingresa a <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-terra font-bold underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> y crea una App de tipo <strong>"Otro / Negocios"</strong>.
                  </li>
                  <li>
                    En el panel de productos, agrega <strong>WhatsApp</strong> y haz clic en <strong>Configurar</strong>.
                  </li>
                  <li>
                    En el menú lateral de WhatsApp, ve a <strong>Configuración ➔ Webhook</strong> y pega la <strong>Callback URL</strong> y el <strong>Verify Token</strong> que copiaste arriba. Haz clic en <em>"Verificar y Guardar"</em>.
                  </li>
                  <li>
                    En los campos de suscripción del Webhook, activa la casilla <strong>messages</strong> (para que Meta envíe los mensajes entrantes a Barda).
                  </li>
                  <li>
                    En la sección <strong>Primeros Pasos</strong> de WhatsApp, copia tu <code>Phone Number ID</code> y genera tu <code>Access Token</code> permanente para agregarlos a las variables de entorno de tu servidor.
                  </li>
                </ol>
              </div>

              {/* Step 3: Variables Summary */}
              <div className="bg-light-cream/60 border border-sand rounded-2xl p-4 text-xs space-y-2">
                <div className="font-bold text-brown text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-terra" />
                  Variables de Entorno necesarias en el Servidor (.env)
                </div>
                <pre className="bg-[#1f2937] text-[#f9fafb] p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
{`WHATSAPP_VERIFY_TOKEN="barda_erp_webhook_token"
WHATSAPP_ACCESS_TOKEN="tu_token_permanente_de_meta"
WHATSAPP_PHONE_NUMBER_ID="tu_phone_number_id"`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sand/70 bg-light-cream/40 flex items-center justify-between">
          <span className="text-[11px] text-stone">
            Barda ERP • Integración Inteligente de Mensajería
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brown text-cream hover:bg-brown/90 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
