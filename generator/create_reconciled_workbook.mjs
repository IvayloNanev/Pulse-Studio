import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { Workbook, SpreadsheetFile } = await import(process.env.PULSE_ARTIFACT_TOOL ?? "@oai/artifact-tool");

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.PULSE_PROJECT_ROOT ?? path.dirname(here);
const output = path.join(projectRoot, "dataset-build");
const workbookPath = path.join(output, "Pulse-Studio-Synthetic-Dataset-Review.xlsx");
const previewDir = path.join(output, "reports", "workbook-previews");
const definitions = [
  ["members", "Members"], ["membership_plans", "Plans"], ["memberships", "Memberships"],
  ["membership_status_history", "Status History"], ["class_sessions", "Sessions"],
  ["reservations", "Reservations"], ["attendance_records", "Attendance"],
  ["attendance_corrections", "Attendance Fixes"], ["risk_assessments", "Risks"], ["outreach_records", "Outreach"],
  ["staff_accounts", "Staff Accounts"], ["member_accounts", "Member Accounts"],
  ["membership_pause_requests", "Pause Requests"], ["drop_in_payments", "Drop-ins"],
  ["waitlist_promotions", "Promotions"], ["risk_case_notes", "Risk Notes"],
  ["notifications", "Notifications"], ["outreach_actions", "Outreach Audit"],
];

function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ""; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ""));
}

function columnLetter(number) {
  let out = "";
  while (number > 0) { number--; out = String.fromCharCode(65 + number % 26) + out; number = Math.floor(number / 26); }
  return out;
}

const wb = Workbook.create();
const summary = wb.worksheets.add("Summary");
for (const [, sheetName] of definitions) wb.worksheets.add(sheetName);
wb.worksheets.add("Error Manifest");

summary.showGridLines = false;
summary.getRange("A1:F1").merge();
summary.getRange("A1").values = [["Pulse Studio — Synthetic Dataset Review"]];
summary.getRange("A2:F2").merge();
summary.getRange("A2").values = [["Schema 2.0.0 | seed 20260820 | America/New_York"]];
summary.getRange("A4:C4").values = [["Table", "Rows", "Purpose"]];
const purposes = ["Member identity and channel rules", "Allowances and monthly prices", "Membership facts and agreed price", "Membership lifecycle intervals", "Historical + upcoming schedule", "Bookings, cancellations, waitlists", "Attended/no-show outcomes", "Audited attendance corrections", "Deterministic 30-day decline", "Product D lifecycle and responses", "Owner and instructor identities", "Member authentication references", "Pause approval and fee facts", "$35 simulated drop-ins", "Automatic waitlist promotions", "Coworker risk notes", "Simulated member notifications", "Product D action audit"];
summary.getRange(`A5:C${4 + definitions.length}`).values = definitions.map(([, name], i) => [name, null, purposes[i]]);
summary.getRange(`B5:B${4 + definitions.length}`).formulas = definitions.map(([, name]) => [`=COUNTA('${name}'!A2:A30000)`]);
summary.getRange("E4:F4").values = [["Acceptance check", "Result"]];
summary.getRange("E5:E14").values = [
  ["Member count = 250"], ["Attendance mix = 90% / 10%"],
  ["Risk mix = 15 medium / 10 high"], ["Intentional errors = 12"],
  ["Intentional orphan FKs = 2"], ["Golden member exists"],
  ["Golden decline = 8 → 2, high"], ["Golden Product D outreach completed"],
  ["Golden rebooking confirmed"], ["OVERALL ACCEPTANCE"],
];
summary.getRange("F5:F14").formulas = [
  ["=IF(B5=250,\"PASS\",\"FAIL\")"],
  ["=IF(ABS(COUNTIF('Attendance'!C2:C16807,\"no_show\")/COUNTA('Attendance'!A2:A16807)-10%)<=0.01%,\"PASS\",\"FAIL\")"],
  ["=IF(AND(COUNTIF('Risks'!K2:K26,\"medium\")=15,COUNTIF('Risks'!K2:K26,\"high\")=10),\"PASS\",\"FAIL\")"],
  ["=IF(COUNTA('Error Manifest'!A2:A13)=12,\"PASS\",\"FAIL\")"],
  ["=IF(COUNTIF('Error Manifest'!D2:D13,\"FK_RESERVATION_MEMBER\")+COUNTIF('Error Manifest'!D2:D13,\"FK_ATTENDANCE_RESERVATION\")=2,\"PASS\",\"FAIL\")"],
  ["=IF(COUNTIF('Members'!A2:A251,\"MEM-0016\")=1,\"PASS\",\"FAIL\")"],
  ["=IF(COUNTIFS('Risks'!B2:B26,\"MEM-0016\",'Risks'!H2:H26,8,'Risks'!I2:I26,2,'Risks'!J2:J26,75,'Risks'!K2:K26,\"high\")=1,\"PASS\",\"FAIL\")"],
  ["=IF(COUNTIFS('Outreach'!C2:C40,\"MEM-0016\",'Outreach'!H2:H40,\"completed\")=1,\"PASS\",\"FAIL\")"],
  ["=IF(COUNTIFS('Reservations'!A2:A25000,\"RES-024010\",'Reservations'!B2:B25000,\"MEM-0016\",'Reservations'!E2:E25000,\"confirmed\")=1,\"PASS\",\"FAIL\")"],
  ["=IF(COUNTIF(F5:F13,\"FAIL\")=0,\"PASS\",\"FAIL\")"],
];
summary.getRange("A25:C25").values = [["Attendance metric", "Value", "Target"]];
summary.getRange("A26:A28").values = [["Attended"], ["No-show"], ["No-show rate"]];
summary.getRange("B26:B28").formulas = [["=COUNTIF('Attendance'!C2:C16807,\"attended\")"], ["=COUNTIF('Attendance'!C2:C16807,\"no_show\")"], ["=B27/(B26+B27)"]];
summary.getRange("C26:C28").values = [["90%"], ["10%"], [0.10]];
summary.getRange("B28:C28").setNumberFormat("0.00%");
summary.getRange("A30:F30").merge();
summary.getRange("A30").values = [["Invalid rows are quarantined under data/invalid and must never be loaded as runtime data."]];

const navy = "#18324A", teal = "#1F8A8A", pale = "#E9F4F4", border = "#CBD5E1";
summary.getRange("A1:F1").format = { fill: navy, font: { color: "#FFFFFF", bold: true, size: 18 }, rowHeight: 32, verticalAlignment: "center" };
summary.getRange("A2:F2").format = { fill: "#DCE7EF", font: { color: navy, italic: true }, rowHeight: 24 };
summary.getRange("A4:C4").format = { fill: teal, font: { color: "#FFFFFF", bold: true }, borders: { preset: "all", style: "thin", color: border } };
summary.getRange("E4:F4").format = { fill: teal, font: { color: "#FFFFFF", bold: true }, borders: { preset: "all", style: "thin", color: border } };
summary.getRange(`A5:C${4 + definitions.length}`).format = { borders: { preset: "all", style: "thin", color: border } };
summary.getRange("E5:F14").format = { borders: { preset: "all", style: "thin", color: border } };
summary.getRange("F5:F14").format = { fill: pale, font: { color: "#146B55", bold: true } };
summary.getRange("F5:F14").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: "#FEE2E2", font: { color: "#991B1B", bold: true } } });
summary.getRange("F5:F14").conditionalFormats.add("containsText", { text: "PASS", format: { fill: "#DCFCE7", font: { color: "#166534", bold: true } } });
summary.getRange("A25:C25").format = { fill: teal, font: { color: "#FFFFFF", bold: true }, borders: { preset: "all", style: "thin", color: border } };
summary.getRange("A26:C28").format = { borders: { preset: "all", style: "thin", color: border } };
summary.getRange("A30:F30").format = { fill: "#FFF4CC", font: { color: "#7A4E00", bold: true }, wrapText: true };
summary.getRange("A:A").format.columnWidth = 23; summary.getRange("B:B").format.columnWidth = 13; summary.getRange("C:C").format.columnWidth = 36;
summary.getRange("D:D").format.columnWidth = 4; summary.getRange("E:E").format.columnWidth = 28; summary.getRange("F:F").format.columnWidth = 23;
summary.freezePanes.freezeRows(4);

for (const [fileName, sheetName] of definitions) {
  const rows = parseCsv(await fs.readFile(path.join(output, "data", "valid", `${fileName}.csv`), "utf8"));
  const sheet = wb.worksheets.getItem(sheetName);
  sheet.getRangeByIndexes(0, 0, rows.length, rows[0].length).values = rows;
  const lastCol = columnLetter(rows[0].length);
  sheet.getRange(`A1:${lastCol}1`).format = { fill: navy, font: { color: "#FFFFFF", bold: true }, wrapText: true, borders: { preset: "all", style: "thin", color: border } };
  sheet.getRange(`A2:${lastCol}${Math.min(rows.length, 30000)}`).format = { borders: { preset: "inside", style: "thin", color: "#E5E7EB" } };
  sheet.getRange(`A1:${lastCol}${rows.length}`).format.autofitColumns();
  for (let col = 0; col < rows[0].length; col++) {
    const range = sheet.getRangeByIndexes(0, col, rows.length, 1);
    const header = rows[0][col];
    if (header.endsWith("_at") || header.endsWith("_date") || header.endsWith("_start") || header.endsWith("_end")) {
      sheet.getRangeByIndexes(1, col, rows.length - 1, 1).setNumberFormat(header.endsWith("_date") ? "yyyy-mm-dd" : "yyyy-mm-dd hh:mm");
      range.format.columnWidth = header.endsWith("_date") ? 14 : 21;
    }
    else if ((range.format.columnWidth ?? 0) > 34) range.format.columnWidth = 34;
  }
  sheet.getRange(`A1:${lastCol}1`).format.autofitRows();
  if (fileName === "outreach_records") {
    sheet.getRange(`E2:F${rows.length}`).format.wrapText = true;
    sheet.getRange(`E1:F${rows.length}`).format.columnWidth = 46;
    sheet.getRange(`A2:${lastCol}${rows.length}`).format.rowHeight = 58;
  }
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
}

const errorRows = parseCsv(await fs.readFile(path.join(output, "manifests", "error_manifest.csv"), "utf8"));
const errorSheet = wb.worksheets.getItem("Error Manifest");
errorSheet.getRangeByIndexes(0, 0, errorRows.length, errorRows[0].length).values = errorRows;
const errorLast = columnLetter(errorRows[0].length);
errorSheet.getRange(`A1:${errorLast}1`).format = { fill: "#9B2C2C", font: { color: "#FFFFFF", bold: true }, wrapText: true };
errorSheet.getRange(`A1:${errorLast}${errorRows.length}`).format.autofitColumns();
for (let col = 0; col < errorRows[0].length; col++) errorSheet.getRangeByIndexes(0, col, errorRows.length, 1).format.columnWidth = Math.min(errorSheet.getRangeByIndexes(0, col, errorRows.length, 1).format.columnWidth ?? 20, 38);
errorSheet.getRange(`E2:F${errorRows.length}`).format.wrapText = true;
errorSheet.getRange(`E1:F${errorRows.length}`).format.columnWidth = 46;
errorSheet.getRange(`A2:${errorLast}${errorRows.length}`).format.rowHeight = 42;
errorSheet.getRange(`A1:${errorLast}1`).format.autofitRows();
errorSheet.freezePanes.freezeRows(1); errorSheet.showGridLines = false;

await fs.mkdir(previewDir, { recursive: true });
const inspection = await wb.inspect({ kind: "workbook,sheet,formula", maxChars: 10000, tableMaxRows: 4, tableMaxCols: 8, options: { maxResults: 80 } });
await fs.writeFile(path.join(output, "reports", "workbook-inspection.txt"), inspection.ndjson ?? JSON.stringify(inspection, null, 2));
const formulaScan = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, maxChars: 8000 });
await fs.writeFile(path.join(output, "reports", "workbook-formula-errors.txt"), formulaScan.ndjson ?? JSON.stringify(formulaScan, null, 2));

for (const sheetName of ["Summary", ...definitions.map(d => d[1]), "Error Manifest"]) {
  const blob = await wb.render({ sheetName, range: "A1:K32", scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName.replaceAll(" ", "-")}.png`), new Uint8Array(await blob.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(workbookPath);
console.log(JSON.stringify({ status: "passed", workbookPath, sheets: definitions.length + 2, previews: definitions.length + 2 }, null, 2));
