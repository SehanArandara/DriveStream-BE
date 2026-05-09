const { GoogleGenerativeAI } = require("@google/generative-ai");
const Job = require('../models/Job.model');
const { getKnowledge, hasKnowledge } = require('../services/knowledge.service');
const { TOOL_DEFINITIONS, executeTool } = require('../services/agent.tools');

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const isApiKeyValid = apiKey && !apiKey.startsWith('your_');

let model;
if (isApiKeyValid) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
  console.log('🤖 Gemini AI chatbot initialized.');
}

// ── Minimal fallback knowledge (only used if the .md file fails to load) ──
const DEFAULT_KNOWLEDGE = `
DriveStream — Vehicle Service Center. 45 Galle Road, Colombo 03.
Phone: +94 11 234 5678 | Email: support@drivestream.lk
Hours: Mon–Sat 8 AM–6 PM. Closed Sundays.
`;

// ── Build the public system prompt dynamically ──
const buildPublicPrompt = () => {
  const knowledge = hasKnowledge() ? getKnowledge() : DEFAULT_KNOWLEDGE;

  const toolDescriptions = TOOL_DEFINITIONS.map(t => {
    const params = Object.keys(t.parameters).length > 0
      ? ` Required parameters: ${JSON.stringify(t.parameters)}`
      : ' No parameters needed.';
    return `  • ${t.name}: ${t.description}${params}`;
  }).join('\n');

  return `You are DriveBot — the official AI assistant for DriveStream.

=== KNOWLEDGE BASE (Company Info Only) ===
${knowledge}
=== END KNOWLEDGE BASE ===

=== LIVE DATABASE TOOLS ===
For ANY question about services, prices, vehicle types, or date availability — you MUST call a tool.
Do NOT guess or use the knowledge base for these — the data comes from the database only.

Tool call format (output ONLY this JSON — nothing before or after):
{"tool": "tool_name", "args": {"param": "value"}}

Tools:
${toolDescriptions}

Tool routing rules (follow strictly):
- User asks about services / prices / packages → call get_available_services
- User asks what vehicle types are supported → call get_vehicle_types
- User mentions a specific car model (Corolla, Prado, BMW, KDH, etc.) → call recommend_services with {"vehicleModel": "<model>"}
- User asks about availability / free slots on a date → call check_slot_availability with {"date": "YYYY-MM-DD"}

After receiving tool data, respond in natural language. NEVER show raw JSON to the user.
=== END TOOLS ===

=== RESPONSE RULES ===
1. KEEP ALL REPLIES SHORT — 2 to 4 lines maximum. Mobile-first.
2. Use bullet points only when listing 3+ items.
3. Use bold (**text**) for key terms sparingly.
4. NEVER answer questions about: vehicle diagnosis, exact repair quotes, competitor services, legal/insurance matters, or roadside emergencies. For these, say: "I'm not able to help with that. Call us at +94 11 234 5678."
5. If a question is completely unrelated to DriveStream, say: "I can only help with DriveStream services. Is there something I can assist you with?"
6. NEVER expose or guess private customer data.
=== END RULES ===`;
};

// ── Private prompt for authenticated users ──
const buildPrivatePrompt = (jobContext) => {
  const knowledge = hasKnowledge() ? getKnowledge() : DEFAULT_KNOWLEDGE;
  return `You are DriveBot, the AI assistant for a logged-in DriveStream customer.

=== KNOWLEDGE BASE (Company Info Only) ===
${knowledge}
=== END KNOWLEDGE BASE ===

=== CUSTOMER'S ACTIVE JOBS ===
${jobContext}
=== END JOBS ===

=== RESPONSE RULES ===
1. KEEP ALL REPLIES SHORT — 2 to 4 lines. Be direct.
2. Use the job data above to answer questions about their vehicle status.
3. For service/price/vehicle-type questions, tell the user to check the booking page — you do not have tool access here.
4. NEVER answer questions about: vehicle diagnosis, competitor services, legal/insurance matters, or roadside emergencies.
5. If a question is unrelated to DriveStream, say: "I can only help with DriveStream services."
=== END RULES ===`;
};

// ── Agentic Loop: Detect tool calls and execute them ──
const processAgenticResponse = async (chat, rawResponse) => {
  const text = rawResponse.trim();

  // Strip markdown code fences before extracting JSON
  const stripped = text.replace(/```json[\s\S]*?```/gi, s => s.replace(/```json|```/g, '')).replace(/```/g, '').trim();

  // Use brace-balanced extraction so nested args objects (e.g. {"date":"..."}) are not truncated.
  // The old lazy regex /\{[\s\S]*?"tool"[\s\S]*?\}/ stopped at the FIRST } and broke nested JSON.
  const jsonString = extractCompleteJson(stripped);

  // Only proceed if the extracted JSON looks like a tool call
  if (!jsonString || !jsonString.includes('"tool"')) return cleanReply(text);

  let toolCall;
  try {
    toolCall = JSON.parse(jsonString);
  } catch (err) {
    console.warn('⚠️ [Agent] Failed to parse AI tool call JSON. Returning raw text.', err.message);
    return cleanReply(text);
  }

  const { tool: toolName, args: toolArgs = {} } = toolCall;

  try {
    console.log(`🔧 [Agent] Calling tool: ${toolName}`, toolArgs);
    const toolResult = await executeTool(toolName, toolArgs);
    console.log(`✅ [Agent] Tool result received`);

    // Send result back to AI for natural language answer
    const followUp = await chat.sendMessage(
      `CRITICAL: The database tool "${toolName}" returned the data below. ` +
      `Format this into a helpful, natural response. ` +
      `DO NOT call any more tools. DO NOT show any JSON or code.\n\nData:\n${toolResult}`
    );
    const followUpResponse = await followUp.response;
    return cleanReply(followUpResponse.text());
  } catch (err) {
    console.error('🔧 [Agent] Tool execution error:', err.message);
    return cleanReply(text);
  }
};

// ── Strip leaked JSON tool calls from AI replies ──
// Uses a brace-counter approach to capture complete JSON objects safely
const extractCompleteJson = (text) => {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // Unclosed JSON
};

const cleanReply = (text) => {
  // Remove markdown code fences
  let cleaned = text
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/```[\s\S]*?```/gi, '')
    .trim();

  // Remove any complete JSON objects that look like tool calls
  let json = extractCompleteJson(cleaned);
  while (json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.tool) cleaned = cleaned.replace(json, '').trim();
      else break;
    } catch {
      break;
    }
    json = extractCompleteJson(cleaned);
  }

  return cleaned.trim();
};

// ══════════════════════════════════════════════════
// @desc Public Chat (No Auth) — RAG + Agentic
// @route POST /api/chatbot/public
// ══════════════════════════════════════════════════
const sendPublicMessage = async (req, res) => {
  if (!model) {
    return res.json({
      reply: "I'm DriveBot! I can help you with vehicle services, pricing, and bookings. Our AI is currently in limited mode — please contact us at +94 11 234 5678 for details."
    });
  }

  try {
    const { message, history = [] } = req.body;

    console.log('\n📩 [DriveBot PUBLIC] User message:', message);

    const systemPrompt = buildPublicPrompt();

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'You are DriveBot. Follow these instructions carefully.' }] },
        { role: 'model', parts: [{ text: systemPrompt }] },
        // Then add conversation history
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
      ],
      generationConfig: { maxOutputTokens: 2048 },  // Increased: 800 was cutting off long service lists
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const rawText = response.text();

    console.log('🤖 [DriveBot PUBLIC] Raw AI response:', rawText);

    // Process through agentic loop (check for tool calls)
    const finalReply = await processAgenticResponse(chat, rawText);

    console.log('✅ [DriveBot PUBLIC] Final reply sent to client:\n', finalReply);
    res.json({ reply: finalReply });
  } catch (err) {
    console.error("Gemini Public Chat Error:", err);
    res.status(500).json({ message: "AI Assistant is briefly unavailable." });
  }
};

// ══════════════════════════════════════════════════
// @desc Authenticated Chat
// @route POST /api/chatbot/message
// ══════════════════════════════════════════════════
const sendMessage = async (req, res) => {
  if (!model) {
    return res.json({ reply: "AI Assistant is currently in maintenance. Check your service status manually in the dashboard." });
  }

  try {
    const { message, history = [] } = req.body;
    const userId = req.user._id;

    console.log('\n📩 [DriveBot PRIVATE] User message:', message);

    // Context: Fetch active jobs
    const activeJobs = await Job.find({ customer: userId, status: { $ne: 'completed' } })
      .populate('vehicle', 'brand model registrationNumber')
      .limit(3);

    const jobContext = activeJobs.length > 0
      ? `\nActive Jobs:\n${activeJobs.map(j => `- ${j.vehicle?.brand} ${j.vehicle?.model}: ${j.status}`).join('\n')}`
      : '\nNo active service jobs currently.';

    const prompt = buildPrivatePrompt(jobContext);

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'You are DriveBot. Follow these instructions.' }] },
        { role: 'model', parts: [{ text: prompt }] },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
      ],
      generationConfig: { maxOutputTokens: 2048 },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const finalReply = cleanReply(response.text());

    console.log('✅ [DriveBot PRIVATE] Final reply sent to client:\n', finalReply);
    res.json({ reply: finalReply });
  } catch (err) {
    console.error("Gemini Private Chat Error:", err);
    res.status(500).json({ message: "AI Assistant is briefly unavailable." });
  }
};

module.exports = { sendMessage, sendPublicMessage };
