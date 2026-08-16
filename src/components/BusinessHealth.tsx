import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  X,
  Copy,
  Check,
  Zap,
  Activity,
  Layers,
  FileText
} from 'lucide-react';

export interface HealthProblem {
  title: string;
  description: string;
  severity: 'alta' | 'media' | 'baja';
}

export interface HealthSolution {
  title: string;
  description: string;
  impact: 'inmediato' | 'alto' | 'medio';
}

export interface HealthMetricHighlight {
  metric: string;
  value: string;
  assessment: 'positivo' | 'neutro' | 'negativo';
}

export interface BusinessHealthDiagnosis {
  score: number;
  status: 'Excelente' | 'Buena' | 'Alerta Menor' | 'Crítica';
  summary: string;
  problems: HealthProblem[];
  solutions: HealthSolution[];
  metricsHighlights: HealthMetricHighlight[];
  isAIGenerated?: boolean;
  timestamp?: string;
}

interface BusinessHealthProps {
  fmt: (v: number) => string;
  totalVentas: number;
  cantidadVentas: number;
  ventaPromedio: number;
  totalCostoVentas: number;
  totalGastosFijos: number;
  resultadoNeto: number;
  totalDisponible: number;
  cashTotal: number;
  bankTotal: number;
  totalVentasACobrar: number;
  agingReceivables: {
    aVencer: number;
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  totalComprasAPagar: number;
  agingPayables: {
    aVencer: number;
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
  periodLabel?: string;
}

export const BusinessHealth: React.FC<BusinessHealthProps> = ({
  fmt,
  totalVentas,
  cantidadVentas,
  ventaPromedio,
  totalCostoVentas,
  totalGastosFijos,
  resultadoNeto,
  totalDisponible,
  cashTotal,
  bankTotal,
  totalVentasACobrar,
  agingReceivables,
  totalComprasAPagar,
  agingPayables,
  periodLabel = 'Período actual'
}) => {
  const [diagnosis, setDiagnosis] = useState<BusinessHealthDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Compute or fetch diagnosis
  const fetchHealthDiagnosis = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const payload = {
        totalVentas,
        cantidadVentas,
        ventaPromedio,
        totalCostoVentas,
        totalGastosFijos,
        resultadoNeto,
        totalDisponible,
        cashTotal,
        bankTotal,
        totalVentasACobrar,
        agingReceivables,
        totalComprasAPagar,
        agingPayables,
        periodLabel
      };

      const res = await fetch('/api/ai/business-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al consultar diagnóstico');
      }

      const data: BusinessHealthDiagnosis = await res.json();
      setDiagnosis({
        ...data,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.warn('Fallback a cálculo de salud local:', err);
      // Heuristic fallback calculation
      let score = 70;
      const problems: HealthProblem[] = [];
      const solutions: HealthSolution[] = [];
      const metricsHighlights: HealthMetricHighlight[] = [];

      const profitMargin = totalVentas > 0 ? (resultadoNeto / totalVentas) * 100 : 0;
      if (resultadoNeto < 0) {
        score -= 25;
        problems.push({
          title: 'Pérdida Operativa en el Período',
          description: `Los costos de producción (${fmt(totalCostoVentas)}) y gastos fijos (${fmt(totalGastosFijos)}) superan la facturación generada.`,
          severity: 'alta'
        });
        solutions.push({
          title: 'Reestructurar Márgenes de Contribución',
          description: 'Revisar coeficientes de mano de obra y costos de materia prima en presupuestos de pedidos a medida.',
          impact: 'alto'
        });
        metricsHighlights.push({ metric: 'Margen Neto', value: `${profitMargin.toFixed(1)}%`, assessment: 'negativo' });
      } else {
        score += 5;
        metricsHighlights.push({ metric: 'Margen Neto', value: `${profitMargin.toFixed(1)}%`, assessment: 'positivo' });
      }

      const overdueReceivables = (agingReceivables.days31_60 || 0) + (agingReceivables.days61_90 || 0) + (agingReceivables.days90Plus || 0);
      if (overdueReceivables > 0) {
        score -= 15;
        problems.push({
          title: 'Morosidad en Cuentas por Cobrar',
          description: `Existen ${fmt(overdueReceivables)} con más de 30 días de atraso. Afecta el flujo de fondos disponible.`,
          severity: 'alta'
        });
        solutions.push({
          title: 'Activación de Cobranza de Saldos',
          description: 'Condicionar la entrega final de muebles al cobro efectivo del 100% del saldo pendiente.',
          impact: 'inmediato'
        });
        metricsHighlights.push({ metric: 'Morosidad +30d', value: fmt(overdueReceivables), assessment: 'negativo' });
      } else if (totalVentasACobrar > 0) {
        metricsHighlights.push({ metric: 'Cobranzas al Día', value: fmt(totalVentasACobrar), assessment: 'positivo' });
      }

      if (totalDisponible < totalComprasAPagar) {
        score -= 15;
        problems.push({
          title: 'Cobertura de Pasivos Ajustada',
          description: `El saldo disponible (${fmt(totalDisponible)}) es inferior a las compras y cuentas por pagar (${fmt(totalComprasAPagar)}).`,
          severity: 'alta'
        });
        solutions.push({
          title: 'Escalonamiento de Pagos a Proveedores',
          description: 'Negociar plazos de pago a 30 días en compras de maderas y herrajes al por mayor.',
          impact: 'inmediato'
        });
        metricsHighlights.push({ metric: 'Cobertura Pasivos', value: `${Math.round((totalDisponible / (totalComprasAPagar || 1)) * 100)}%`, assessment: 'negativo' });
      } else {
        score += 10;
        metricsHighlights.push({ metric: 'Liquidez Disponible', value: fmt(totalDisponible), assessment: 'positivo' });
      }

      score = Math.max(10, Math.min(98, score));
      let status: 'Excelente' | 'Buena' | 'Alerta Menor' | 'Crítica' = 'Buena';
      if (score >= 85) status = 'Excelente';
      else if (score >= 65) status = 'Buena';
      else if (score >= 45) status = 'Alerta Menor';
      else status = 'Crítica';

      if (solutions.length === 0) {
        solutions.push({
          title: 'Sostener Disciplina de Cobro y Stock',
          description: 'Mantener la política de seña previa del 50% para compra de insumos y asegurar flujo positivo.',
          impact: 'medio'
        });
      }

      setDiagnosis({
        score,
        status,
        summary: `Tu situación financiera y operativa tiene un puntaje de salud del ${score}%, lo que indica que estás en una posición "${status}". Cuentas con un saldo disponible de ${fmt(totalDisponible)} y una facturación registrada de ${fmt(totalVentas)}.`,
        problems,
        solutions,
        metricsHighlights,
        isAIGenerated: false,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthDiagnosis();
  }, [totalVentas, cantidadVentas, resultadoNeto, totalDisponible, totalVentasACobrar, totalComprasAPagar, periodLabel]);

  // Status color styles
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excelente':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          bar: 'from-emerald-500 to-teal-500',
          text: 'text-emerald-700',
          bg: 'bg-emerald-50'
        };
      case 'Buena':
        return {
          badge: 'bg-teal-100 text-teal-800 border-teal-300',
          bar: 'from-teal-500 to-emerald-400',
          text: 'text-teal-700',
          bg: 'bg-teal-50'
        };
      case 'Alerta Menor':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          bar: 'from-amber-400 to-orange-400',
          text: 'text-amber-700',
          bg: 'bg-amber-50'
        };
      case 'Crítica':
      default:
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          bar: 'from-rose-500 to-red-600',
          text: 'text-rose-700',
          bg: 'bg-rose-50'
        };
    }
  };

  const currentStatus = diagnosis?.status || 'Buena';
  const colors = getStatusColor(currentStatus);
  const score = diagnosis?.score ?? 60;

  const handleCopy = () => {
    if (!diagnosis) return;
    const text = `DIAGNÓSTICO DE SALUD DEL NEGOCIO (BARDA MUEBLES)\nPuntaje: ${diagnosis.score}% (${diagnosis.status})\n\n${diagnosis.summary}\n\nPROBLEMAS PRINCIPALES:\n${diagnosis.problems.map((p, i) => `${i + 1}. ${p.title} (${p.severity}): ${p.description}`).join('\n')}\n\nACCIONES CONCRETAS:\n${diagnosis.solutions.map((s, i) => `${i + 1}. ${s.title} [Impacto ${s.impact}]: ${s.description}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* 1. HEALTH BANNER / CARD (Matches screenshot 1) */}
      <div className="bg-white border border-sand rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          {/* Left Title & Status */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>

            <span className="font-serif font-bold text-base text-brown">
              Salud Financiera
            </span>

            {/* Status Badge */}
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${colors.badge}`}>
              {diagnosis?.status || 'Calculando...'}
            </span>

            {/* Ver detalles button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-stone hover:text-terra font-medium px-2 py-0.5 rounded-md hover:bg-sand/30 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ver detalles</span>
            </button>
          </div>

          {/* Right Score & AI Trigger */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-xl sm:text-2xl font-serif font-bold text-brown">
              {score}%
            </div>

            <button
              onClick={() => fetchHealthDiagnosis(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cream/70 hover:bg-cream text-brown border border-sand/70 hover:border-terra/40 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Reanalizar con IA de Gemini"
            >
              <Sparkles className={`w-3.5 h-3.5 text-terra ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Analizar con IA</span>
              {isLoading && <span className="text-[10px] text-stone">...</span>}
            </button>
          </div>
        </div>

        {/* Progress Bar (Matches Screenshot 1) */}
        <div className="w-full bg-sand/30 h-3 sm:h-3.5 rounded-full overflow-hidden p-0.5">
          <div
            style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
            className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-700 ease-out shadow-xs`}
          ></div>
        </div>

        {/* Quick Diagnostic Teaser */}
        {diagnosis && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone/90 pt-2 border-t border-sand/40">
            <div className="line-clamp-1 flex-1">
              <span className="font-semibold text-brown">Diagnóstico IA: </span>
              <span>{diagnosis.summary}</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-terra font-bold hover:underline shrink-0 text-left cursor-pointer flex items-center gap-1"
            >
              <span>Abrir diagnóstico completo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 2. DIAGNOSTIC MODAL POPUP (Matches screenshot 2) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white border border-sand rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-sand/70 bg-light-cream/40 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-terra/10 text-terra rounded-xl border border-terra/20 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-terra" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-brown">
                      Diagnóstico de Salud del Negocio
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cream text-terra border border-sand">
                      IA Gemini
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors.badge}`}>
                      {diagnosis?.status} ({score}%)
                    </span>
                  </div>
                  <p className="text-xs text-stone mt-1">
                    Evaluación estratégica y financiera sobre datos reales de Barda Muebles • {periodLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 text-stone hover:text-brown hover:bg-sand/40 rounded-lg transition-colors cursor-pointer"
                  title="Copiar diagnóstico"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-stone hover:text-brown hover:bg-sand/40 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-sm text-brown">
              {/* Score Meter inside Modal */}
              <div className="p-4 bg-light-cream/30 border border-sand/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-2/3">
                  <div className="flex justify-between items-center text-xs font-bold text-stone mb-1.5">
                    <span>Nivel de Salud General</span>
                    <span className="text-brown font-serif text-base">{score}%</span>
                  </div>
                  <div className="w-full bg-sand/40 h-3 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${score}%` }}
                      className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => fetchHealthDiagnosis(true)}
                    disabled={isLoading}
                    className="px-3.5 py-2 bg-terra text-cream rounded-xl text-xs font-bold hover:bg-terra/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Analizando...' : 'Reanalizar con IA'}</span>
                  </button>
                </div>
              </div>

              {/* Resumen Principal (Matches Screenshot 2 layout) */}
              <div>
                <p className="text-sm leading-relaxed text-brown/90 font-sans">
                  {diagnosis?.summary}
                </p>
              </div>

              {/* Métricas Clave Evaluadas */}
              {diagnosis?.metricsHighlights && diagnosis.metricsHighlights.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-terra" />
                    Métricas Clave Evaluadas
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {diagnosis.metricsHighlights.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${
                          m.assessment === 'positivo'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : m.assessment === 'negativo'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : 'bg-amber-50/70 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">{m.metric}</div>
                        <div className="text-base font-serif font-bold mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ### Problemas principales (Matches screenshot 2) */}
              <div>
                <h4 className="text-sm font-bold text-brown mb-3 flex items-center gap-2 pb-2 border-b border-sand/50">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Problemas principales identificados:</span>
                </h4>
                <div className="space-y-3">
                  {diagnosis?.problems && diagnosis.problems.length > 0 ? (
                    diagnosis.problems.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white border border-sand/80 rounded-xl shadow-2xs flex items-start gap-3 hover:border-sand transition-all"
                      >
                        <span className="font-mono text-xs font-bold text-stone px-2 py-0.5 bg-sand/30 rounded mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-brown">
                              {p.title}
                            </span>
                            <span
                              className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                p.severity === 'alta'
                                  ? 'bg-rose-100 text-rose-800'
                                  : p.severity === 'media'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone/10 text-stone'
                              }`}
                            >
                              Severidad {p.severity}
                            </span>
                          </div>
                          <p className="text-xs text-stone/90 mt-1 leading-relaxed">
                            {p.description}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>No se detectaron problemas críticos en las métricas actuales del período.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ### Acciones concretas y soluciones (Matches screenshot 2) */}
              <div>
                <h4 className="text-sm font-bold text-brown mb-3 flex items-center gap-2 pb-2 border-b border-sand/50">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Acciones concretas y recomendaciones:</span>
                </h4>
                <div className="space-y-3">
                  {diagnosis?.solutions && diagnosis.solutions.length > 0 ? (
                    diagnosis.solutions.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-emerald-50/30 border border-emerald-200/70 rounded-xl shadow-2xs flex items-start gap-3"
                      >
                        <span className="font-mono text-xs font-bold text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-brown">
                              {s.title}
                            </span>
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Impacto {s.impact}
                            </span>
                          </div>
                          <p className="text-xs text-stone/90 mt-1 leading-relaxed">
                            {s.description}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-light-cream border border-sand rounded-xl text-xs text-stone">
                      Mantener el ritmo comercial y el control de inventario actual.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-sand/70 bg-light-cream/40 flex items-center justify-between">
              <span className="text-[11px] text-stone">
                Última actualización: {diagnosis?.timestamp || 'Reciente'}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-brown text-cream hover:bg-brown/90 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
