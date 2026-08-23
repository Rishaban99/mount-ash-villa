/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requirePermission } from '@/lib/api-auth';

interface BreakRecord {
  date: string;
  off: string;
  in: string;
  minutes: number;
}

interface StaffEvaluationInput {
  userId: string;
  name: string;
  role: string;
  month: string;
  year: string;
  workingDays: number;
  presentDays: number;
  approvedLeaveDays: number;
  unauthorizedAbsentDays: number;
  lateDays: number;
  attendancePercentage: number;
  totalWorkedHours: number;
  additionalApprovedLeave?: string;
  leaveNotes?: string;
  breakRecords: BreakRecord[];
  punctualityRecords: string[];
  overtimeHours: number;
  overtimeNotes: string[];
  staffRemarks: Array<{ date: string; category: string; notes: string }>;
}

interface StaffAIEvaluationRequest {
  staffList: StaffEvaluationInput[];
}

export interface RemarksClassification {
  attendance: string;
  approvedLeave: string;
  punctuality: string;
  breakDiscipline: string;
  overtime: string;
  workEthic: string;
  conduct: string;
  overallRemarks: string;
}

export interface ConductAssessment {
  punctuality: string;
  breakDiscipline: string;
  reliability: string;
  workEthic: string;
  overtimeContribution: string;
}

export interface StaffAICertificateResult {
  userId: string;
  awardTitle: string;
  overallClassification: string;
  performanceGrade: string;
  score: number;
  remarksClassification: RemarksClassification;
  aiCitation: string;
  remarksAppraisal: string;
  conductAssessment: ConductAssessment;
  merits: string[];
  areasForAttention: string[];
  leaveAnalysis: string;
  evidenceSummary: string[];
  managerClosingNote: string;
  confidence: 'High' | 'Medium' | 'Low';
}

function buildPromptForStaff(s: StaffEvaluationInput): string {
  const breakRecordsText = s.breakRecords.length > 0
    ? s.breakRecords.map(b => `  * ${b.date}: Off ${b.off} → In ${b.in} (${b.minutes} min)`).join('\n')
    : 'No break records provided.';

  const punctualityText = s.punctualityRecords.length > 0
    ? s.punctualityRecords.map(p => `  * ${p}`).join('\n')
    : 'No punctuality records provided.';

  const overtimeText = s.overtimeNotes.length > 0
    ? s.overtimeNotes.map(n => `  * ${n}`).join('\n')
    : 'No overtime notes provided.';

  const remarksText = s.staffRemarks.length > 0
    ? s.staffRemarks.map(r => `  * ${r.date} [${r.category}]: "${r.notes}"`).join('\n')
    : 'No staff remarks recorded.';

  return `Employee Name: ${s.name}
Role: ${s.role}
Month: ${s.month}
Year: ${s.year}

Attendance:
* Working Days: ${s.workingDays}
* Present Days: ${s.presentDays}
* Approved Leave Days: ${s.approvedLeaveDays}
* Unauthorized Absence Days: ${s.unauthorizedAbsentDays}
* Late Days: ${s.lateDays}
* Attendance Percentage: ${s.attendancePercentage}%
* Total Worked Hours: ${s.totalWorkedHours}

Leave:
* Monthly Approved Leave Allowance: 3 days
* Approved Leave Used: ${s.approvedLeaveDays}
* Additional Approved Leave: ${s.additionalApprovedLeave || 'None'}
* Leave Notes: ${s.leaveNotes || 'None'}

Break Records:
${breakRecordsText}

Punctuality Records:
${punctualityText}

Overtime:
* Overtime Hours: ${s.overtimeHours}
* Overtime Notes:
${overtimeText}

Staff Remarks:
${remarksText}`;
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerViewReports');
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as StaffAIEvaluationRequest;
    const { staffList = [] } = body;

    if (!staffList || staffList.length === 0) {
      return errorResponse('No staff data provided for evaluation', 400);
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const results: StaffAICertificateResult[] = [];

        for (const s of staffList) {
          const staffData = buildPromptForStaff(s);

          const systemPrompt = `You are the Monthly Staff Performance Evaluation AI for Mount Ash Villa.

Your task is to analyze ONLY the staff attendance records, approved leave, break records, overtime records, punctuality information, exception patterns, and staff remarks provided in the input.

The purpose is to generate a fair, evidence-based Monthly Remarks Analysis & Classification that can be used for an official Monthly Certificate of Attendance, Conduct & Excellence.

IMPORTANT PRINCIPLES:
1. Evaluate the employee only using the information provided in the input.
2. Never invent achievements, incidents, responsibilities, customer feedback, conduct, or performance.
3. Never treat approved leave as unauthorized absence.
4. Approved monthly leave must NOT negatively affect the employee's attendance classification.
5. The default approved monthly leave allowance is 3 days unless another value is explicitly provided.
6. If the employee uses 3 days or fewer of approved leave, classify the leave as "Within Approved Leave Allowance".
7. If approved leave exceeds the allowed monthly leave, classify only the excess as "Leave Allowance Exceeded". Do NOT automatically classify it as misconduct or unauthorized absence.
8. Unauthorized absence and approved leave are completely different categories.
9. If no leave information is provided, return "No recorded evidence".
10. Do not penalize an employee because no staff remark was recorded.
11. Distinguish factual attendance information from qualitative staff remarks.
12. Do not infer serious misconduct from missing information.
13. If evidence is mixed, explicitly classify the result as "Mixed Performance".
14. Negative remarks must be summarized professionally and respectfully.
15. Never use insulting, humiliating, discriminatory, or emotionally judgmental language.
16. Do not create a disciplinary finding unless the supplied records explicitly contain one.
17. Use gender-neutral language unless gender is explicitly provided.
18. Every AI-generated statement must be supported by the supplied evidence.
19. Do not use the employee's approved leave as a negative factor in the performance score.
20. Do not automatically award an excellence grade solely because attendance percentage is high.
21. Consider staff remarks when determining conduct, work ethic, punctuality, reliability, and professional recognition.
22. Overtime should be recognized only when actual overtime records are provided.
23. Break discipline should be evaluated only from actual break records or explicit staff remarks.
24. Missing evidence must be described as "No recorded evidence".
25. Do not compare one employee against another unless comparative data is explicitly provided.

MONTHLY APPROVED LEAVE RULE:
Default monthly approved leave allowance: 3 days.
0 approved leave days: "Excellent Leave Discipline"
1–3 approved leave days: "Within Approved Leave Allowance"
More than 3 approved leave days: "Leave Allowance Exceeded" (but does NOT automatically mean misconduct)
If explicitly separately approved: "Approved Leave - Additional Approval"

ATTENDANCE CLASSIFICATION:
Do not count approved leave as absence. Options: Exceptional Attendance, Excellent Attendance, Very Good Attendance, Good Attendance, Satisfactory Attendance, Attendance Requires Attention, No Recorded Evidence

PUNCTUALITY CLASSIFICATION:
Options: Exceptional Punctuality, Excellent Punctuality, Very Good Punctuality, Good Punctuality, Punctuality Requires Attention, No Recorded Evidence

BREAK DISCIPLINE CLASSIFICATION:
Options: Excellent Break Discipline, Good Break Discipline, Generally Compliant, Break Discipline Requires Attention, No Recorded Evidence

OVERTIME CLASSIFICATION:
Options: Outstanding Overtime Contribution, Strong Overtime Contribution, Regular Overtime Contribution, Limited Overtime Contribution, No Overtime Recorded, No Recorded Evidence

STAFF REMARKS CLASSIFICATION:
Positive: Excellent Performance, Strong Work Ethic, Good Teamwork, Reliable Service, Professional Conduct, Customer Service Recognition, Punctuality Recognition, Break Discipline Recognition, Overtime Dedication, Special Commendation
Neutral: General Observation, Routine Performance, No Significant Observation
Improvement: Punctuality Requires Attention, Break Discipline Requires Attention, Attendance Requires Attention, Work Performance Requires Improvement, Conduct Requires Review
(Only assign improvement classification if there is actual supporting evidence.)

OVERALL REMARKS CLASSIFICATION (choose ONE):
Outstanding, Excellent, Very Good, Good, Satisfactory, Mixed Performance, Requires Improvement, Insufficient Evidence
("Insufficient Evidence" when not enough info for a reliable qualitative evaluation.)

PERFORMANCE SCORING (0-100):
Attendance & Reliability: 40%, Punctuality: 20%, Break Discipline: 10%, Work Ethic & Conduct: 20%, Overtime & Additional Contribution: 10%
Approved leave must NOT reduce the score.

CERTIFICATE AWARD RULES (only when supported by evidence):
Monthly Attendance Excellence Award, Exemplary Conduct & Diligence Award, Outstanding Service Recognition, Highland Service Star, Exceptional Reliability Award, Punctuality & Commitment Award, Dedicated Service Recognition, Attendance Recognition Award
If evidence does not support special award, use: "Monthly Performance Recognition"

Return ONLY valid JSON matching this exact structure:
{
  "awardTitle": "",
  "overallClassification": "",
  "performanceGrade": "",
  "score": 0,
  "remarksClassification": {
    "attendance": "",
    "approvedLeave": "",
    "punctuality": "",
    "breakDiscipline": "",
    "overtime": "",
    "workEthic": "",
    "conduct": "",
    "overallRemarks": ""
  },
  "aiCitation": "",
  "remarksAppraisal": "",
  "conductAssessment": {
    "punctuality": "",
    "breakDiscipline": "",
    "reliability": "",
    "workEthic": "",
    "overtimeContribution": ""
  },
  "merits": [],
  "areasForAttention": [],
  "leaveAnalysis": "",
  "evidenceSummary": [],
  "managerClosingNote": "",
  "confidence": "High"
}

CONFIDENCE RULES:
"High": Sufficient attendance, leave, and remark evidence exists.
"Medium": Some important information is missing but a reasonable evaluation is possible.
"Low": Very limited evidence exists.
Do not use "High" when most evaluation categories contain "No recorded evidence".

MANAGER CLOSING NOTE: Generate a short formal appreciation statement from Mount Ash Villa management that does not introduce any new achievement.

INPUT:
${staffData}`;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.15,
              },
            }),
          });

          if (res.ok) {
            const result = await res.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText);
              results.push({ userId: s.userId, ...parsed });
            }
          }
        }

        if (results.length > 0) {
          return jsonResponse({ source: 'gemini', results });
        }
      } catch (geminiError) {
        console.warn('Gemini API failed, using heuristic fallback:', geminiError);
      }
    }

    // ── Heuristic Fallback Engine ─────────────────────────────────────────────
    const fallbackResults: StaffAICertificateResult[] = staffList.map((s) => {
      const attendancePct = s.attendancePercentage;
      const hasBreaks = s.breakRecords.length > 0;
      const hasRemarks = s.staffRemarks.length > 0;
      const hasOvertime = s.overtimeHours > 0;

      const approvedLeaveClass =
        s.approvedLeaveDays === 0
          ? 'Excellent Leave Discipline'
          : s.approvedLeaveDays <= 3
          ? 'Within Approved Leave Allowance'
          : 'Leave Allowance Exceeded';

      const attendanceClass =
        attendancePct >= 97 ? 'Exceptional Attendance' :
        attendancePct >= 93 ? 'Excellent Attendance' :
        attendancePct >= 88 ? 'Very Good Attendance' :
        attendancePct >= 80 ? 'Good Attendance' :
        attendancePct >= 70 ? 'Satisfactory Attendance' : 'Attendance Requires Attention';

      const punctualityClass =
        s.lateDays === 0 ? 'Exceptional Punctuality' :
        s.lateDays === 1 ? 'Excellent Punctuality' :
        s.lateDays <= 3 ? 'Very Good Punctuality' :
        s.lateDays <= 5 ? 'Good Punctuality' : 'Punctuality Requires Attention';

      const breakClass = !hasBreaks ? 'No Recorded Evidence' : 'Generally Compliant';
      const overtimeClass = !hasOvertime ? 'No Overtime Recorded' : 'Regular Overtime Contribution';

      const score = Math.round(
        (Math.min(100, attendancePct) * 0.4) +
        (Math.max(0, 100 - s.lateDays * 10) * 0.2) +
        (hasBreaks ? 70 : 80) * 0.1 +
        (hasRemarks ? 75 : 70) * 0.2 +
        (hasOvertime ? 80 : 60) * 0.1
      );

      const overallClass =
        score >= 90 ? 'Outstanding' :
        score >= 80 ? 'Excellent' :
        score >= 70 ? 'Very Good' :
        score >= 60 ? 'Good' :
        score >= 50 ? 'Satisfactory' : 'Insufficient Evidence';

      const awardTitle =
        score >= 90 ? 'Highland Service Star' :
        score >= 80 ? 'Exemplary Conduct & Diligence Award' :
        score >= 70 ? 'Monthly Attendance Excellence Award' :
        'Monthly Performance Recognition';

      const merits: string[] = [];
      if (s.lateDays === 0) merits.push('Flawless Punctuality');
      if (s.approvedLeaveDays <= 3) merits.push('Disciplined Leave Usage');
      if (s.unauthorizedAbsentDays === 0) merits.push('No Unauthorized Absences');
      if (hasOvertime) merits.push('Overtime Dedication');
      if (s.totalWorkedHours >= 180) merits.push('Extended Duty Commitment');
      if (merits.length === 0) merits.push('Consistent Attendance Adherence');

      return {
        userId: s.userId,
        awardTitle,
        overallClassification: overallClass,
        performanceGrade: `${score}/100 • ${overallClass}`,
        score,
        remarksClassification: {
          attendance: attendanceClass,
          approvedLeave: approvedLeaveClass,
          punctuality: punctualityClass,
          breakDiscipline: breakClass,
          overtime: overtimeClass,
          workEthic: hasRemarks ? 'General Observation' : 'No Significant Observation',
          conduct: hasRemarks ? 'General Observation' : 'No Significant Observation',
          overallRemarks: overallClass,
        },
        aiCitation: `This certificate is conferred upon ${s.name} in recognition of their recorded attendance and service commitment at Mount Ash Villa during ${s.month} ${s.year}. Attendance records show ${s.presentDays} present days with ${s.approvedLeaveDays} approved leave day(s) used, which falls ${s.approvedLeaveDays <= 3 ? 'within' : 'above'} the approved monthly leave allowance of 3 days. The employee demonstrated ${attendanceClass.toLowerCase()} throughout the operating period.`,
        remarksAppraisal: `Attendance records indicate ${s.presentDays} days present out of ${s.workingDays} working days (${s.attendancePercentage}%). ${s.approvedLeaveDays} approved leave day(s) were recorded. ${s.lateDays > 0 ? `${s.lateDays} late arrival(s) were noted.` : 'No late arrivals were recorded.'} ${hasBreaks ? `Break records were logged for ${s.breakRecords.length} instance(s).` : 'No break records were provided.'} ${hasOvertime ? `Overtime of ${s.overtimeHours} hours was recorded.` : 'No overtime was recorded.'} ${hasRemarks ? `${s.staffRemarks.length} staff remark(s) were logged during the month.` : 'No staff remarks were recorded for this period.'}`,
        conductAssessment: {
          punctuality: punctualityClass,
          breakDiscipline: breakClass,
          reliability: attendanceClass,
          workEthic: hasRemarks ? 'General Observation' : 'No Recorded Evidence',
          overtimeContribution: overtimeClass,
        },
        merits,
        areasForAttention: s.lateDays > 3 ? ['Punctuality consistency noted for review'] : [],
        leaveAnalysis: `Employee used ${s.approvedLeaveDays} approved leave day(s) during the month. The monthly allowance is 3 days. Classification: ${approvedLeaveClass}.`,
        evidenceSummary: [
          `Attendance: ${s.presentDays}/${s.workingDays} days present (${s.attendancePercentage}%)`,
          `Approved Leave: ${s.approvedLeaveDays} day(s)`,
          `Unauthorized Absences: ${s.unauthorizedAbsentDays}`,
          `Late Arrivals: ${s.lateDays}`,
          `Total Hours Worked: ${s.totalWorkedHours}`,
          `Break Records: ${s.breakRecords.length} instance(s)`,
          `Overtime Hours: ${s.overtimeHours}`,
          `Staff Remarks: ${s.staffRemarks.length} recorded`,
        ],
        managerClosingNote: 'Mount Ash Villa management sincerely appreciates the employee\'s recorded commitment, professionalism, and contribution during the month and encourages continued consistency in the months ahead.',
        confidence: s.presentDays > 0 ? 'Medium' : 'Low',
      };
    });

    return jsonResponse({ source: 'heuristic', results: fallbackResults });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`AI evaluation failed: ${errorMsg}`, 500);
  }
}
