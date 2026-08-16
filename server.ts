import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { parseWhatsAppMessageWithAI, sendWhatsAppMessageViaMeta } from "./src/server/whatsappService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Server-side Gemini AI Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Heuristic fallback calculator if Gemini API key is missing
function calculateHeuristicHealth(data: any) {
  const {
    totalVentas = 0,
    totalCostoVentas = 0,
    totalGastosFijos = 0,
    resultadoNeto = 0,
    totalDisponible = 0,
    totalVentasACobrar = 0,
    totalComprasAPagar = 0,
    agingReceivables = { aVencer: 0, days0_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0 },
    agingPayables = { aVencer: 0, days0_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0 },
    cantidadVentas = 0,
  } = data;

  let score = 70;
  const problems: Array<{ title: string; description: string; severity: "alta" | "media" | "baja" }> = [];
  const solutions: Array<{ title: string; description: string; impact: "alto" | "medio" | "inmediato" }> = [];
  const metricsHighlights: Array<{ metric: string; value: string; assessment: "positivo" | "neutro" | "negativo" }> = [];

  // 1. Margen Operativo / Rentabilidad
  const profitMargin = totalVentas > 0 ? (resultadoNeto / totalVentas) * 100 : 0;
  if (resultadoNeto < 0) {
    score -= 25;
    problems.push({
      title: "Resultado Operativo Negativo",
      description: `El resultado del período arroja una pérdida estimada. Los costos directos ($${Math.round(totalCostoVentas).toLocaleString()}) y gastos fijos ($${Math.round(totalGastosFijos).toLocaleString()}) superan los ingresos generados.`,
      severity: "alta",
    });
    solutions.push({
      title: "Revisión de Márgenes y Gastos Fijos",
      description: "Ajustar precios en productos con menor margen de contribución y renegociar costos de insumos críticos o gastos operativos recurrentes.",
      impact: "alto",
    });
    metricsHighlights.push({ metric: "Margen Neto", value: `${profitMargin.toFixed(1)}%`, assessment: "negativo" });
  } else if (profitMargin < 15) {
    score -= 10;
    problems.push({
      title: "Margen Neto Ajustado",
      description: `El margen de ganancia neta es del ${profitMargin.toFixed(1)}%, lo que deja poco colchón frente a aumentos de costos de materia prima.`,
      severity: "media",
    });
    solutions.push({
      title: "Optimización de Costeo de Materiales",
      description: "Revisar listas de precios y calcular coeficientes de desperdicio de maderas y herrajes para asegurar al menos un 25% de margen neto.",
      impact: "medio",
    });
    metricsHighlights.push({ metric: "Margen Neto", value: `${profitMargin.toFixed(1)}%`, assessment: "neutro" });
  } else {
    score += 5;
    metricsHighlights.push({ metric: "Margen Neto", value: `${profitMargin.toFixed(1)}%`, assessment: "positivo" });
  }

  // 2. Liquidez vs Pasivos a corto plazo
  const overduePayables = (agingPayables.days31_60 || 0) + (agingPayables.days61_90 || 0) + (agingPayables.days90Plus || 0);
  if (totalDisponible < totalComprasAPagar) {
    score -= 15;
    problems.push({
      title: "Liquidez inferior a Deuda Exigible",
      description: `El total disponible en cajas y bancos ($${Math.round(totalDisponible).toLocaleString()}) es menor a las deudas con proveedores ($${Math.round(totalComprasAPagar).toLocaleString()}).`,
      severity: "alta",
    });
    solutions.push({
      title: "Plan de Pagos y Aceleración de Cobros",
      description: "Contactar a clientes con saldos pendientes para exigir cancelaciones de saldo contra entrega y escalonar los pagos a proveedores.",
      impact: "inmediato",
    });
    metricsHighlights.push({ metric: "Cobertura de Deuda", value: `${Math.round((totalDisponible / (totalComprasAPagar || 1)) * 100)}%`, assessment: "negativo" });
  } else {
    score += 10;
    metricsHighlights.push({ metric: "Liquidez Inmediata", value: `$${Math.round(totalDisponible).toLocaleString()}`, assessment: "positivo" });
  }

  // 3. Antigüedad de Cuentas a Cobrar (Morosidad)
  const overdueReceivables = (agingReceivables.days31_60 || 0) + (agingReceivables.days61_90 || 0) + (agingReceivables.days90Plus || 0);
  if (overdueReceivables > 0) {
    score -= 15;
    problems.push({
      title: "Saldos Vencidos en Cuentas por Cobrar",
      description: `Hay $${Math.round(overdueReceivables).toLocaleString()} en cuentas por cobrar con más de 30 días de antigüedad, lo que inmoviliza capital de trabajo.`,
      severity: "alta",
    });
    solutions.push({
      title: "Gestión Activa de Cobranza de Saldos",
      description: "Implementar recordatorios vía WhatsApp con link de pago antes de la fecha de entrega acordada para que ningún pedido salga sin cancelación total.",
      impact: "inmediato",
    });
    metricsHighlights.push({ metric: "Morosidad (+30 días)", value: `$${Math.round(overdueReceivables).toLocaleString()}`, assessment: "negativo" });
  } else if (totalVentasACobrar > 0) {
    metricsHighlights.push({ metric: "Cuentas por Cobrar al Día", value: `$${Math.round(totalVentasACobrar).toLocaleString()}`, assessment: "positivo" });
  }

  // 4. Volumen de ventas
  if (cantidadVentas === 0) {
    score -= 20;
    problems.push({
      title: "Falta de Nuevos Pedidos en el Período",
      description: "No se registran ventas u órdenes en el filtro seleccionado. Es crítico reactivar el flujo comercial.",
      severity: "alta",
    });
    solutions.push({
      title: "Campaña de Reactivación Comercial",
      description: "Enviar catálogo de promociones a presupuestos pasados no cerrados y ofrecer bonificación en flete o facilidades de cuotas.",
      impact: "alto",
    });
  }

  // Normalizar score
  score = Math.max(10, Math.min(98, score));
  let status: "Excelente" | "Buena" | "Alerta Menor" | "Crítica" = "Buena";
  if (score >= 85) status = "Excelente";
  else if (score >= 65) status = "Buena";
  else if (score >= 45) status = "Alerta Menor";
  else status = "Crítica";

  if (solutions.length === 0) {
    solutions.push({
      title: "Mantener Ritmo Comercial y Reservas",
      description: "Conservar la disciplina de cobro de señas del 50% y reinvertir utilidades en compra anticipada de madera para resguardarse de la inflación.",
      impact: "medio",
    });
  }

  const summary = `Tu situación operativa y financiera tiene un puntaje de salud del ${score}%, lo que indica que estás en una posición "${status}". Cuentas con un saldo disponible de $${Math.round(totalDisponible).toLocaleString()} y una facturación registrada de $${Math.round(totalVentas).toLocaleString()}.`;

  return {
    score,
    status,
    summary,
    problems,
    solutions,
    metricsHighlights,
    isAIGenerated: false,
  };
}

// AI Diagnostic API Route
app.post("/api/ai/business-health", async (req, res) => {
  try {
    const data = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return smart heuristic diagnostic if Gemini API key not present
      const heuristicResult = calculateHeuristicHealth(data);
      return res.json(heuristicResult);
    }

    const {
      totalVentas = 0,
      totalCostoVentas = 0,
      totalGastosFijos = 0,
      resultadoNeto = 0,
      totalDisponible = 0,
      cashTotal = 0,
      bankTotal = 0,
      totalVentasACobrar = 0,
      agingReceivables = {},
      totalComprasAPagar = 0,
      agingPayables = {},
      cantidadVentas = 0,
      ventaPromedio = 0,
      periodLabel = "Periodo actual",
    } = data;

    const prompt = `Analiza exhaustivamente el estado de salud financiero y operativo del negocio de fabricación y venta de muebles (Barda Muebles).
Contexto y Métricas Actuales del Negocio:
- Período analizado: ${periodLabel}
- Facturación Total (Ventas Creadas): $${totalVentas} (${cantidadVentas} pedidos, Ticket promedio: $${ventaPromedio})
- Costo Directo de Materiales/Producción: $${totalCostoVentas}
- Gastos Fijos Operativos: $${totalGastosFijos}
- Resultado Estimado Neto (P&L): $${resultadoNeto}
- Tesorería Disponible: $${totalDisponible} (Efectivo: $${cashTotal}, Bancos/MP: $${bankTotal})
- Cuentas por Cobrar a Clientes: $${totalVentasACobrar}
  Desglose Antigüedad Cobranzas: A vencer: $${agingReceivables.aVencer || 0}, 0-30 días: $${agingReceivables.days0_30 || 0}, 31-60 días: $${agingReceivables.days31_60 || 0}, 61-90 días: $${agingReceivables.days61_90 || 0}, +90 días: $${agingReceivables.days90Plus || 0}
- Cuentas por Pagar (Proveedores/Gastos): $${totalComprasAPagar}
  Desglose Antigüedad Pagos: A vencer: $${agingPayables.aVencer || 0}, 0-30 días: $${agingPayables.days0_30 || 0}, 31-60 días: $${agingPayables.days31_60 || 0}, 61-90 días: $${agingPayables.days61_90 || 0}, +90 días: $${agingPayables.days90Plus || 0}

Instrucciones:
1. Evalúa el puntaje de salud financiera (score del 0 al 100).
2. Determina el estado: "Excelente" (85-100), "Buena" (65-84), "Alerta Menor" (45-64), "Crítica" (0-44).
3. Redacta un resumen ejecutivo claro y directo (similar a un CFO experto asesorando al dueño de fábrica).
4. Identifica con precisión los 2 a 4 problemas principales con su severidad (alta, media, baja).
5. Brinda de 2 a 4 soluciones concretas y accionables con su impacto (inmediato, alto, medio).
6. Resalta 3 a 5 métricas clave evaluadas con valoración positivo/neutro/negativo.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "Eres un Director Financiero (CFO) y Consultor Estratégico experto en PYMES y fábricas de muebles a medida. Tu diagnóstico debe ser lúcido, riguroso, empático y orientado a la acción inmediata para maximizar liquidez, rentabilidad y control de riesgos.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Puntaje general de 0 a 100" },
            status: {
              type: Type.STRING,
              description: "Excelente | Buena | Alerta Menor | Crítica",
            },
            summary: {
              type: Type.STRING,
              description: "Párrafo introductorio de diagnóstico financiero",
            },
            problems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, description: "alta | media | baja" },
                },
                required: ["title", "description", "severity"],
              },
            },
            solutions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, description: "inmediato | alto | medio" },
                },
                required: ["title", "description", "impact"],
              },
            },
            metricsHighlights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING },
                  value: { type: Type.STRING },
                  assessment: { type: Type.STRING, description: "positivo | neutro | negativo" },
                },
                required: ["metric", "value", "assessment"],
              },
            },
          },
          required: ["score", "status", "summary", "problems", "solutions", "metricsHighlights"],
        },
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      const fallback = calculateHeuristicHealth(data);
      return res.json(fallback);
    }

    const parsed = JSON.parse(responseText);
    return res.json({
      ...parsed,
      isAIGenerated: true,
    });
  } catch (error) {
    console.error("Error generating AI business health diagnosis:", error);
    const fallback = calculateHeuristicHealth(req.body);
    return res.json(fallback);
  }
});

// ==========================================
// WHATSAPP CLOUD API (META) & AI WEBHOOKS
// ==========================================

// 1. Meta Webhook Verification (Handshake)
app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "barda_erp_webhook_token";

  if (mode && token) {
    if (mode === "subscribe" && token === expectedVerifyToken) {
      console.log("[WhatsApp Webhook] Webhook verificado correctamente por Meta.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[WhatsApp Webhook] Token de verificación inválido:", token);
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// 2. Incoming WhatsApp Message Webhook
app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("[WhatsApp Webhook] Evento recibido de Meta:", JSON.stringify(body, null, 2));

    // Check if this is an event from a WhatsApp Business Account
    if (body.object === "whatsapp_business_account" || body.entry) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const senderPhone = message.from; // e.g. "5491155443322"
        const messageType = message.type;
        let messageText = "";

        if (messageType === "text") {
          messageText = message.text?.body || "";
        } else if (messageType === "audio" || messageType === "voice") {
          messageText = "Nota de voz recibida (Procesando audio)";
        } else if (messageType === "image") {
          messageText = message.image?.caption || "Foto / Comprobante recibido";
        }

        console.log(`[WhatsApp Webhook] Mensaje de ${senderPhone}: "${messageText}"`);

        if (messageText) {
          const ai = getGeminiClient();
          const parsed = await parseWhatsAppMessageWithAI(messageText, ai);
          console.log("[WhatsApp Webhook] Intención extraída por Gemini:", parsed);

          // If configured, send WhatsApp reply back to the user via Meta Cloud API
          if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
            await sendWhatsAppMessageViaMeta(senderPhone, parsed.suggestedReply);
          }
        }
      }

      // Meta requires a 200 OK fast response to acknowledge receipt
      return res.status(200).json({ status: "received" });
    }

    return res.status(200).json({ status: "ignored" });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]:", error);
    return res.status(200).json({ status: "error_handled" });
  }
});

// 3. WhatsApp Message Simulator (Direct test from Barda ERP UI)
app.post("/api/whatsapp/simulate", async (req, res) => {
  try {
    const { messageText } = req.body;
    if (!messageText || typeof messageText !== "string") {
      return res.status(400).json({ error: "El campo messageText es requerido." });
    }

    const ai = getGeminiClient();
    const result = await parseWhatsAppMessageWithAI(messageText, ai);
    return res.json(result);
  } catch (error) {
    console.error("[WhatsApp Simulator Error]:", error);
    return res.status(500).json({ error: "Error al procesar el mensaje con IA." });
  }
});

// 4. WhatsApp Configuration Status Endpoint
app.get("/api/whatsapp/config-status", (_req, res) => {
  const hasVerifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
  const hasAccessToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const hasPhoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "barda_erp_webhook_token";

  res.json({
    configured: hasAccessToken && hasPhoneNumberId,
    hasVerifyToken,
    hasAccessToken,
    hasPhoneNumberId,
    verifyToken,
    webhookPath: "/api/whatsapp/webhook",
  });
});

// API health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
