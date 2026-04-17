const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chat = async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ message: 'Message required' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.3-flash' });
    const systemPrompt = `You are NagarBot Assistant, a helpful civic AI for Indian citizens. You help users:
- Understand how to report civic issues (potholes, garbage, streetlights, water leaks, illegal construction)
- Know which government department handles which issue
- Understand RTI (Right to Information) rights
- Track their complaint status
- Know escalation procedures
Keep answers concise, friendly, and relevant to Indian municipal governance. Respond in the same language the user writes in.`;

    const chatHistory = history.map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

    const chatSession = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood! I am NagarBot Assistant, ready to help Indian citizens with civic issues.' }] },
        ...chatHistory,
      ],
    });

    const result = await chatSession.sendMessage(message);
    res.json({ reply: result.response.text() });
  } catch (e) {
    res.status(500).json({ reply: 'Sorry, I am unable to respond right now. Please try again.' });
  }
};

module.exports = { chat };
