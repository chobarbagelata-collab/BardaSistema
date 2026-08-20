import { GoogleGenAI, Type } from "@google/genai";

export interface ParsedWhatsAppMessage {
  intent: "gasto" | "ingreso" | "cobro_pedido" | "pedido" | "consulta" | "desconocido";
  confidence: number;
  extractedData: {
    amount?: number;
    concept?: string;
    category?: string;
    account?: string;
    clientName?: string;
    clientPhone?: string;
    orderNumber?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
    total?: number;
    sena?: number;
    paymentMethod?: string;
    notes?: string;
    date?: string;
  };
  humanReadableSummary: string;
  suggestedReply: string;
}

// System instruction for Gemini AI WhatsApp parser
const WHATSAPP_AI_SYSTEM_INSTRUCTION = `Eres el asistente inteligente de Barda ERP (fábrica de muebles Barda Muebles).
Tu trabajo es interpretar los mensajes de WhatsApp que envía el dueño o administrador (Tomás / equipo) y clasificar la intención con precisión para asentar la operación en el sistema.

Tipos de intenciones (intent):
1. 'gasto': Registrar un gasto o compra de insumos (ej: "Gasté 35.000 en flete en efectivo", "Compré tornillos $12.000 con Santander", "Pagué la luz $45.000 MP").
   - Extraer: amount, concept, category (Materia Prima | Insumos | Flete | Servicios | Herramientas | Comisiones | Varios), account (Caja Efectivo | Santander | Mercado Pago | Galicia | BBVA), date.

2. 'ingreso': Registrar un ingreso directo o cobro libre a tesorería (ej: "Entraron 150.000 a MP por venta de retazos", "Ingreso de 80.000 en efectivo").
   - Extraer: amount, concept, account, date.

3. 'cobro_pedido': Registrar el cobro de una seña o saldo de un pedido existente (ej: "Cobré seña de 120.000 a Juan Pérez en Santander", "Pedro pagó saldo $80.000 orden 1045 en efectivo").
   - Extraer: amount, clientName, orderNumber, account, paymentMethod, sena (si es seña o saldo).

4. 'pedido': Crear un nuevo pedido de venta (ej: "Nuevo pedido para María López: Mesa Paraíso 1.80m $650.000 dejó seña $300.000 en Galicia cel 1144332211").
   - Extraer: clientName, clientPhone, items (array de {name, qty, price}), total, sena, account/paymentMethod, notes.

5. 'consulta': El usuario pregunta por saldos o estado (ej: "¿Cuánto hay disponible en cajas?", "¿Cuánto tenemos por cobrar?", "Resumen del mes").
   - Extraer: concept / consulta topic.

6. 'desconocido': Si el mensaje no contiene datos operativos claros.

Siempre responde en formato JSON válido con la estructura solicitada, generando un 'suggestedReply' redactado en español rioplatense (con emojis, claro, profesional y conciso).`;

// Parse message using Gemini or fallback
export async function parseWhatsAppMessageWithAI(
  messageText: string,
  geminiClient: GoogleGenAI | null,
  contextData?: any
): Promise<ParsedWhatsAppMessage> {
  const currentDate = new Date().toISOString().split("T")[0];

  if (!geminiClient) {
    return parseMessageHeuristically(messageText, currentDate);
  }

  try {
    const prompt = `Fecha de hoy: ${currentDate}.
Mensaje recibido por WhatsApp: "${messageText}"

Analiza e interpreta este mensaje para Barda ERP.`;

    const response = await geminiClient.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: WHATSAPP_AI_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: "gasto | ingreso | cobro_pedido | pedido | consulta | desconocido",
            },
            confidence: { type: Type.NUMBER, description: "Nivel de confianza de 0 a 1" },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                concept: { type: Type.STRING },
                category: { type: Type.STRING },
                account: { type: Type.STRING },
                clientName: { type: Type.STRING },
                clientPhone: { type: Type.STRING },
                orderNumber: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      qty: { type: Type.NUMBER },
                      price: { type: Type.NUMBER },
                    },
                    required: ["name", "qty", "price"],
                  },
                },
                total: { type: Type.NUMBER },
                sena: { type: Type.NUMBER },
                paymentMethod: { type: Type.STRING },
                notes: { type: Type.STRING },
                date: { type: Type.STRING },
              },
            },
            humanReadableSummary: { type: Type.STRING, description: "Resumen claro de la operación interpretada" },
            suggestedReply: { type: Type.STRING, description: "Mensaje de respuesta para enviar por WhatsApp al usuario" },
          },
          required: ["intent", "confidence", "extractedData", "humanReadableSummary", "suggestedReply"],
        },
      },
    });

    const parsedJson = JSON.parse(response.text?.trim() || "{}");
    return parsedJson as ParsedWhatsAppMessage;
  } catch (error) {
    console.error("Error calling Gemini for WhatsApp parsing:", error);
    return parseMessageHeuristically(messageText, currentDate);
  }
}

// Smart heuristic fallback
function parseMessageHeuristically(text: string, currentDate: string): ParsedWhatsAppMessage {
  const lower = text.toLowerCase();
  
  // Extract number (e.g. 45000, 45.000, $45000)
  const amountMatch = text.match(/\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{3,7})/);
  let amount = 0;
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/\./g, ""), 10);
  }

  // Detect account
  let account = "Caja Efectivo";
  if (lower.includes("santander")) account = "Santander";
  else if (lower.includes("mercado pago") || lower.includes("mp")) account = "Mercado Pago";
  else if (lower.includes("galicia")) account = "Galicia";
  else if (lower.includes("bbva")) account = "BBVA";
  else if (lower.includes("banco") || lower.includes("transferencia")) account = "Banco";
  else if (lower.includes("efectivo") || lower.includes("caja")) account = "Caja Efectivo";

  // Check intent
  if (lower.includes("gast") || lower.includes("pagu") || lower.includes("compr")) {
    const concept = text.replace(/gast[eé]|pagu[eé]|compr[eé]|\$?\s*[0-9.]+|en|con|de|por/gi, "").trim() || "Gasto Operativo";
    return {
      intent: "gasto",
      confidence: 0.85,
      extractedData: {
        amount: amount || 0,
        concept: concept.slice(0, 50),
        category: lower.includes("flete") ? "Flete" : lower.includes("madera") ? "Materia Prima" : "Insumos",
        account,
        date: currentDate,
      },
      humanReadableSummary: `Gasto de AR$ ${amount.toLocaleString('es-AR')} en "${concept}" pagado con ${account}`,
      suggestedReply: `✅ *Gasto Registrado en Barda ERP*\n• *Concepto:* ${concept}\n• *Monto:* AR$ ${amount.toLocaleString('es-AR')}\n• *Cuenta:* ${account}\n• *Fecha:* ${currentDate}`,
    };
  }

  if (lower.includes("cobro") || lower.includes("seña") || lower.includes("sena") || lower.includes("saldo")) {
    return {
      intent: "cobro_pedido",
      confidence: 0.85,
      extractedData: {
        amount: amount || 0,
        concept: "Cobro de pedido",
        account,
        paymentMethod: account,
        sena: amount || 0,
        date: currentDate,
      },
      humanReadableSummary: `Cobro / Seña de AR$ ${amount.toLocaleString('es-AR')} recibido en ${account}`,
      suggestedReply: `✅ *Cobro Registrado en Barda ERP*\n• *Monto:* AR$ ${amount.toLocaleString('es-AR')}\n• *Cuenta:* ${account}\n• *Fecha:* ${currentDate}`,
    };
  }

  if (lower.includes("nuevo pedido") || lower.includes("pedido para")) {
    return {
      intent: "pedido",
      confidence: 0.85,
      extractedData: {
        total: amount || 0,
        sena: Math.round((amount || 0) * 0.5),
        account,
        date: currentDate,
      },
      humanReadableSummary: `Nuevo pedido de venta por total AR$ ${amount.toLocaleString('es-AR')}`,
      suggestedReply: `🛋️ *Nuevo Pedido Creado*\n• *Total:* AR$ ${amount.toLocaleString('es-AR')}\n• *Cuenta:* ${account}\n• *Fecha:* ${currentDate}`,
    };
  }

  return {
    intent: "desconocido",
    confidence: 0.4,
    extractedData: { date: currentDate },
    humanReadableSummary: "No se reconoció un comando financiero directo",
    suggestedReply: `🤖 *Asistente Barda ERP*\nRecibí tu mensaje: "${text}".\nPuedes enviarme gastos, ingresos, señas o pedidos. Por ejemplo:\n• _"Gasté 45.000 en flete con Caja Chica"_\n• _"Cobré seña de 150.000 a Juan Pérez en Santander"_\n• _"Nuevo pedido para Ana: Mesa 1.60m $500.000 seña $250.000"_\n• _"¿Cuánto tenemos disponible?"_`,
  };
}

// Send message via Meta WhatsApp Cloud API
export async function sendWhatsAppMessageViaMeta(
  toPhoneNumber: string,
  text: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return {
      success: false,
      error: "Credenciales de WhatsApp Cloud API (WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID) no configuradas en el servidor.",
    };
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhoneNumber,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error from Meta WhatsApp API:", data);
      return { success: false, error: data?.error?.message || "Error al enviar mensaje a WhatsApp" };
    }

    return { success: true, response: data };
  } catch (err: any) {
    console.error("Network error sending WhatsApp message:", err);
    return { success: false, error: err?.message || "Error de red al conectar con Meta" };
  }
}
