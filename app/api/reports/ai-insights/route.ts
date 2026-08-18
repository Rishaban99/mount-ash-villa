/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requirePermission } from '@/lib/api-auth';

interface AIInsightRequest {
  month?: string;
  rangeDays?: number;
  periodSummary?: {
    totalRevenue: number;
    roomRevenue: number;
    foodRevenue: number;
    serviceCharge: number;
    totalExpenses: number;
    netProfit: number;
    totalBills: number;
    avgDailyRevenue: number;
    peakDay?: { date: string; amount: number } | null;
  };
  dailyData?: Array<{
    date: string;
    revenue: number;
    roomRevenue: number;
    foodRevenue: number;
    serviceCharge: number;
    expenses?: number;
    netProfit?: number;
    billsCount: number;
  }>;
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerViewReports');
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as AIInsightRequest;
    const { month, rangeDays, periodSummary, dailyData = [] } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are a hospitality financial executive & hotel POS analytics expert for Mount Ash Villa.
Analyze the following settlement and performance dataset for period: ${month || `${rangeDays} Days`}.

Summary Metrics:
- Total Settled Revenue: Rs. ${periodSummary?.totalRevenue?.toLocaleString() || 0}
- Room Accommodation Revenue: Rs. ${periodSummary?.roomRevenue?.toLocaleString() || 0}
- Food & Beverage Sales: Rs. ${periodSummary?.foodRevenue?.toLocaleString() || 0}
- Service Charges Collected: Rs. ${periodSummary?.serviceCharge?.toLocaleString() || 0}
- Total Operational Expenses: Rs. ${periodSummary?.totalExpenses?.toLocaleString() || 0}
- Net Profit: Rs. ${periodSummary?.netProfit?.toLocaleString() || 0}
- Total Checkout Bills: ${periodSummary?.totalBills || 0}
- Average Daily Revenue: Rs. ${Math.round(periodSummary?.avgDailyRevenue || 0).toLocaleString()}
- Peak Revenue Day: ${periodSummary?.peakDay ? `${periodSummary.peakDay.date} (Rs. ${periodSummary.peakDay.amount.toLocaleString()})` : 'N/A'}

Recent Daily Trajectory (${dailyData.length} records):
${dailyData.slice(-10).map(d => `${d.date}: Rev Rs. ${d.revenue.toLocaleString()} (Room: ${d.roomRevenue}, F&B: ${d.foodRevenue}, Bills: ${d.billsCount}, Exp: ${d.expenses || 0})`).join('\n')}

Provide an insightful, structured executive briefing in strict JSON format matching this schema:
{
  "healthScore": <number between 1 and 100>,
  "performanceTier": <"Exceptional" | "Healthy" | "Moderate" | "Needs Attention">,
  "executiveSummary": "<2-3 sentence executive synopsis>",
  "keyHighlights": [
    "<Highlight 1>",
    "<Highlight 2>",
    "<Highlight 3>"
  ],
  "foodToRoomAnalysis": "<Analysis of F&B attachment vs Room revenue>",
  "marginAnalysis": "<Analysis of net profit margin & cost efficiency>",
  "recommendations": [
    { "title": "<Action title>", "description": "<Actionable detail>", "impact": "High" | "Medium" | "Quick Win" },
    { "title": "<Action title>", "description": "<Actionable detail>", "impact": "High" | "Medium" | "Quick Win" },
    { "title": "<Action title>", "description": "<Actionable detail>", "impact": "High" | "Medium" | "Quick Win" }
  ]
}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (res.ok) {
          const result = await res.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return jsonResponse({ source: 'gemini', data: parsed });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to analytical heuristics:', geminiErr);
      }
    }

    // Heuristic Analytics Engine (Guaranteed Instant Fallback)
    const totalRev = periodSummary?.totalRevenue || 0;
    const roomRev = periodSummary?.roomRevenue || 0;
    const foodRev = periodSummary?.foodRevenue || 0;
    const exp = periodSummary?.totalExpenses || 0;
    const netProf = periodSummary?.netProfit || (totalRev - exp);
    const bills = periodSummary?.totalBills || 0;
    const avgRev = periodSummary?.avgDailyRevenue || 0;
    const peakDay = periodSummary?.peakDay;

    const marginPct = totalRev > 0 ? Math.round((netProf / totalRev) * 100) : 0;
    const foodRatioPct = totalRev > 0 ? Math.round((foodRev / totalRev) * 100) : 0;
    const roomRatioPct = totalRev > 0 ? Math.round((roomRev / totalRev) * 100) : 0;

    let healthScore = 75;
    if (marginPct >= 50) healthScore += 15;
    else if (marginPct < 20) healthScore -= 15;
    if (bills > 15) healthScore += 10;
    healthScore = Math.min(98, Math.max(35, healthScore));

    const performanceTier = 
      healthScore >= 85 ? 'Exceptional' :
      healthScore >= 70 ? 'Healthy' :
      healthScore >= 50 ? 'Moderate' : 'Needs Attention';

    const highlights: string[] = [];
    if (peakDay && peakDay.amount > 0) {
      highlights.push(`Peak settlement achieved on ${peakDay.date} with Rs. ${peakDay.amount.toLocaleString()} in revenue.`);
    }
    highlights.push(`Food & Beverage sales contributed ${foodRatioPct}% (Rs. ${foodRev.toLocaleString()}) of total property receipts.`);
    if (marginPct > 0) {
      highlights.push(`Operating profit margin stands at ${marginPct}% with net earnings of Rs. ${netProf.toLocaleString()}.`);
    } else {
      highlights.push(`Operating expenses (Rs. ${exp.toLocaleString()}) exceeded settled receipts this period.`);
    }

    const fallbackInsights = {
      healthScore,
      performanceTier,
      executiveSummary: `For the analyzed period, Mount Ash Villa recorded Rs. ${totalRev.toLocaleString()} across ${bills} settled guest folios, yielding an average daily revenue of Rs. ${Math.round(avgRev).toLocaleString()} with a ${marginPct}% net margin.`,
      keyHighlights: highlights,
      foodToRoomAnalysis: `Room bookings represent ${roomRatioPct}% of intake, while dining and minibar orders account for ${foodRatioPct}%. Increasing restaurant cross-promotion during guest check-in can elevate ancillary revenue.`,
      marginAnalysis: `Operating costs of Rs. ${exp.toLocaleString()} leave a healthy net bottom line of Rs. ${netProf.toLocaleString()} (${marginPct}% margin). Maintain inventory control to preserve these margins.`,
      recommendations: [
        {
          title: 'Optimize Dining Package Attachments',
          description: 'Introduce breakfast or dining bundles during room check-in to push food & beverage contribution past 35%.',
          impact: 'High',
        },
        {
          title: 'Capitalize on Peak Day Patterns',
          description: peakDay ? `Evaluate driver bookings on ${peakDay.date} to replicate weekend and holiday stay packages.` : 'Identify high-occupancy days to apply dynamic peak rate adjustments.',
          impact: 'Medium',
        },
        {
          title: 'Daily Expense Ledger Reconciliation',
          description: 'Keep all supplier and operational expense entries logged in real-time to maintain exact net yield accuracy.',
          impact: 'Quick Win',
        },
      ],
    };

    return jsonResponse({ source: 'heuristic', data: fallbackInsights });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to generate AI insights', 500);
  }
}
