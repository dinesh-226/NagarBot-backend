const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeIssue = async (description) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are a civic issue classifier for Indian municipalities. Analyze this complaint and return ONLY valid JSON with no markdown:
{
  "category": one of ["Pothole","Streetlight","Garbage","Water","Construction","Other"],
  "urgency": integer 1-10 based on public safety risk,
  "department": one of ["PWD","Electricity Board","Sanitation","Water Works","Municipal Corporation","Other"],
  "estimated_resolution_days": integer (realistic SLA in working days),
  "summary": "one sentence summary of the issue",
  "action_required": "specific action the department must take"
}

Urgency guide: 9-10 = accident/injury risk, 7-8 = major inconvenience, 5-6 = moderate, 1-4 = minor.

Complaint: "${description}"`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  // strip markdown code fences if present
  text = text.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
};

const generateComplaintLetter = async (issue) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const prompt = `Generate a formal RTI-style complaint letter in English for the following civic issue.
Include: reference number, citizen name, legal obligation clause for the department, SLA demand, and formal closing.
Return ONLY the letter text, no commentary.

Reference Number: ${issue.refNumber}
Citizen Name: ${issue.reporterName}
Issue Title: ${issue.title}
Description: ${issue.description}
Category: ${issue.category}
Department: ${issue.department}
Location: ${issue.location.address || `${issue.location.lat}, ${issue.location.lng}`}
Urgency: ${issue.urgency}/10
Estimated Resolution: ${issue.estimatedDays} working days
Action Required: ${issue.actionRequired || 'Immediate remedial action'}
Date: ${date}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

const generateWeeklyDigest = async (stats) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `You are an AI city governance analyst for Indian municipalities.
Based on this week's civic complaint data, write a professional digest for department heads.
Include: top problem zones, category spikes vs last week, average resolution times per department, and 3 specific actionable recommendations.
Write in clear natural language, like a real analyst's report.

Data: ${JSON.stringify(stats)}

Return only the digest text.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

module.exports = { analyzeIssue, generateComplaintLetter, generateWeeklyDigest };
