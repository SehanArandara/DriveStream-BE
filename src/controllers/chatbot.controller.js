const OpenAI = require('openai');
const Job       = require('../models/Job.model');
const Booking   = require('../models/Booking.model');

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (_) {}

const SYSTEM_PROMPT = `You are DriveBot, the friendly AI assistant for DriveStream Vehicle Service Center.
You help customers with:
- Checking their vehicle service status
- Understanding service details and costs  
- Answering FAQs about the service center
- Guiding them through the booking process

Always be polite, professional, and concise. If you cannot help, escalate to the admin team.
Service center operates Monday–Saturday, 8 AM – 6 PM.
Contact: +94 11 234 5678 | info@drivestream.lk`;

// POST /api/chatbot/message
const sendMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user._id;

    // Fetch user's active jobs for context
    const activeJobs = await Job.find({ customer: userId, status: { $ne: 'completed' } })
      .populate('vehicle', 'make model licensePlate')
      .limit(3);

    const jobContext = activeJobs.length > 0
      ? `\nCurrent active jobs for this customer:\n${activeJobs.map(j =>
          `- Job #${j.jobNumber}: ${j.vehicle?.make} ${j.vehicle?.model} (${j.vehicle?.licensePlate}) — Status: ${j.status}`
        ).join('\n')}`
      : '\nThis customer has no active service jobs.';

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + jobContext },
      ...conversationHistory.slice(-10),  // keep last 10 messages for context
      { role: 'user', content: message },
    ];

    if (!openai || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
      // Fallback mock responses for development
      const lowerMsg = message.toLowerCase();
      let botReply = "I'm DriveBot! I can help you check your vehicle status, make bookings, or answer questions about our services. How can I assist you today?";

      if (lowerMsg.includes('status') || lowerMsg.includes('vehicle')) {
        botReply = activeJobs.length > 0
          ? `Here's your current service status:\n${activeJobs.map(j => `🔧 ${j.vehicle?.make} ${j.vehicle?.model} — **${j.status.toUpperCase()}**`).join('\n')}`
          : "You don't have any active service jobs right now. Would you like to book a service?";
      } else if (lowerMsg.includes('book') || lowerMsg.includes('appointment')) {
        botReply = "I can help with booking! Please visit the Bookings section in your dashboard to schedule a service, or let me know your preferred date and service type.";
      } else if (lowerMsg.includes('hour') || lowerMsg.includes('open') || lowerMsg.includes('time')) {
        botReply = "Our service center is open Monday–Saturday, 8 AM to 6 PM. We're closed on Sundays.";
      } else if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('charge')) {
        botReply = "Service costs vary by job type. Oil changes start at LKR 3,000, brake service at LKR 8,000. For an exact quote, please bring your vehicle in for an inspection.";
      } else if (lowerMsg.includes('contact') || lowerMsg.includes('phone') || lowerMsg.includes('call')) {
        botReply = "You can reach us at 📞 +94 11 234 5678 or email us at info@drivestream.lk";
      }

      return res.json({ reply: botReply, escalated: false });
    }

    const completion = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages, max_tokens: 500 });
    const reply = completion.choices[0].message.content;

    // Simple escalation detection
    const escalationKeywords = ['urgent', 'emergency', 'complaint', 'refund', 'legal', 'manager'];
    const escalated = escalationKeywords.some(kw => message.toLowerCase().includes(kw));

    res.json({ reply, escalated, usage: completion.usage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendMessage };
