export type RetentionPreviewCase = {
  id: string;
  member: string;
  priority: "high" | "medium" | "low";
  status: string;
  evaluatedAt: string;
  previous: number;
  current: number;
  decline: number;
  lastAttended: string;
  notes: number;
  nextAction: string;
};

export const retentionPreviewCases: RetentionPreviewCase[] = [
  { id: "preview-amara", member: "Amara Lewis", priority: "high", status: "Ready for review", evaluatedAt: "Aug 25, 2026", previous: 9, current: 3, decline: 67, lastAttended: "Aug 12, 2026", notes: 2, nextAction: "Start review" },
  { id: "preview-jordan", member: "Jordan Kim", priority: "medium", status: "Outreach ready", evaluatedAt: "Aug 24, 2026", previous: 7, current: 3, decline: 57, lastAttended: "Aug 16, 2026", notes: 1, nextAction: "Review outreach" },
  { id: "preview-sofia", member: "Sofia Martinez", priority: "medium", status: "Follow-up scheduled", evaluatedAt: "Aug 23, 2026", previous: 6, current: 3, decline: 50, lastAttended: "Aug 18, 2026", notes: 3, nextAction: "View follow-up" },
  { id: "preview-daniel", member: "Daniel Brooks", priority: "high", status: "Ready for review", evaluatedAt: "Aug 22, 2026", previous: 11, current: 4, decline: 64, lastAttended: "Aug 10, 2026", notes: 0, nextAction: "Start review" },
  { id: "preview-priya", member: "Priya Shah", priority: "medium", status: "Outreach sent", evaluatedAt: "Aug 21, 2026", previous: 8, current: 4, decline: 50, lastAttended: "Aug 15, 2026", notes: 2, nextAction: "Record response" },
  { id: "preview-marcus", member: "Marcus Reed", priority: "high", status: "Follow-up due", evaluatedAt: "Aug 20, 2026", previous: 10, current: 3, decline: 70, lastAttended: "Aug 8, 2026", notes: 4, nextAction: "Prepare follow-up" },
  { id: "preview-naomi", member: "Naomi Chen", priority: "medium", status: "Outreach draft", evaluatedAt: "Aug 19, 2026", previous: 6, current: 2, decline: 67, lastAttended: "Aug 14, 2026", notes: 1, nextAction: "Review draft" },
  { id: "preview-luis", member: "Luis Alvarez", priority: "medium", status: "Awaiting response", evaluatedAt: "Aug 18, 2026", previous: 7, current: 3, decline: 57, lastAttended: "Aug 17, 2026", notes: 2, nextAction: "View case" },
  { id: "preview-elena", member: "Elena Rossi", priority: "low", status: "Monitoring · no case", evaluatedAt: "Aug 17, 2026", previous: 9, current: 7, decline: 22, lastAttended: "Aug 23, 2026", notes: 0, nextAction: "No action needed" },
  { id: "preview-caleb", member: "Caleb Wright", priority: "low", status: "Monitoring · no case", evaluatedAt: "Aug 16, 2026", previous: 8, current: 6, decline: 25, lastAttended: "Aug 22, 2026", notes: 0, nextAction: "No action needed" },
  { id: "preview-maya", member: "Maya Thompson", priority: "low", status: "Monitoring · no case", evaluatedAt: "Aug 15, 2026", previous: 10, current: 7, decline: 30, lastAttended: "Aug 24, 2026", notes: 0, nextAction: "No action needed" },
];
