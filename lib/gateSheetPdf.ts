/**
 * Client-side gate-sheet PDF matching the school printable roster layout
 * (A4 table: NAME | CODE | Mon–Fri, rules, gate legend, head-prefect signature).
 */

import { jsPDF } from "jspdf";

export interface GateSheetPdfRow {
  name: string;
  /** Prefects code (e.g. IMP). Combined with pin in the CODE column. */
  code: string | null;
  pin: string;
  /** Keys 1–5 = Mon–Fri; values MG / PG / PBG / null */
  days: Record<number, string | null>;
}

const DAY_KEYS = [1, 2, 3, 4, 5] as const;
const DAY_LABELS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const RULES: string[] = [
  "House Prefects on Gate Duty should sign by 6:30 AM.",
  "House Prefects that don’t have Gate Duty should sign by 7:00 AM.",
  "All House Prefects must report to blocks by 7:30 AM.",
  "All House Prefects should be clean-shaven, neatly dressed and should maintain a decent haircut.",
  "All House Prefects should effectively disperse all boys from main tuck shops after the 7:25 AM bell, and after the interval bell at 11:40 AM.",
  "House Prefects cannot leave the school premises before 1:30 PM.",
  "All House Prefects must sign on the books by 11:15 AM and 1:30 PM after school.",
  "All House Prefects who are found to be slacking in their duties, will be exempted from duties or will have to face serious consequences.",
];

/** Column x edges in PDF points (from the reference sheet). */
const COLS = [72, 179.5, 235.5, 288.5, 348.5, 424.5, 497.5, 543.5];
const TABLE_LEFT = COLS[0];
const TABLE_RIGHT = COLS[COLS.length - 1];
const HEADER_TOP = 86.5;
const ROW_H = 20;
const FONT = "helvetica";

function formatCodeCell(code: string | null, pin: string): string {
  const c = (code || "").trim();
  const p = (pin || "").trim();
  if (c && p) return `${c} ${p}`;
  return c || p || "";
}

export function slugBatchFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${slug || "batch"}_codes.pdf`;
}

/** Build an A4 gate-sheet PDF document for one batch. */
export function buildBatchGateSheetPdf(
  rows: GateSheetPdfRow[]
): InstanceType<typeof jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const tableBottom = HEADER_TOP + ROW_H * (1 + rows.length);

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);

  for (let i = 0; i <= rows.length + 1; i++) {
    const y = HEADER_TOP + i * ROW_H;
    doc.line(TABLE_LEFT, y, TABLE_RIGHT, y);
  }
  for (const x of COLS) {
    doc.line(x, HEADER_TOP, x, tableBottom);
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  const headerY = HEADER_TOP + ROW_H / 2 + 3.5;
  doc.text("NAME", (COLS[0] + COLS[1]) / 2, headerY, { align: "center" });
  doc.text("CODE", (COLS[1] + COLS[2]) / 2, headerY, { align: "center" });
  DAY_LABELS.forEach((label, i) => {
    const cx = (COLS[i + 2] + COLS[i + 3]) / 2;
    doc.text(label, cx, headerY, { align: "center" });
  });

  rows.forEach((row, idx) => {
    const y = HEADER_TOP + ROW_H * (idx + 1) + ROW_H / 2 + 3.5;

    doc.setFont(FONT, "normal");
    doc.setFontSize(11);
    doc.text(row.name, TABLE_LEFT + 3, y, {
      maxWidth: COLS[1] - COLS[0] - 6,
    });

    const codeText = formatCodeCell(row.code, row.pin);
    doc.text(codeText, (COLS[1] + COLS[2]) / 2, y, { align: "center" });

    DAY_KEYS.forEach((dayKey, i) => {
      const assignment = row.days[dayKey];
      if (!assignment) return;
      const cx = (COLS[i + 2] + COLS[i + 3]) / 2;
      doc.setFont(FONT, "bold");
      doc.text(assignment, cx, y, { align: "center" });
      doc.setFont(FONT, "normal");
    });
  });

  let textY = tableBottom + 16;
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  const ruleLeft = 90;
  const ruleIndent = 108;
  const ruleMaxW = pageW - ruleIndent - 54;
  const lineH = 15.5;

  RULES.forEach((rule, i) => {
    const prefix = `${i + 1})  `;
    const lines = doc.splitTextToSize(rule, ruleMaxW) as string[];
    doc.text(prefix, ruleLeft, textY);
    lines.forEach((line, li) => {
      doc.text(line, ruleIndent, textY + li * lineH);
    });
    textY += lines.length * lineH + 1.5;
  });

  const legendY = Math.max(textY + 40, pageH - 120);
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  doc.text("MG – Main Gate", TABLE_LEFT, legendY);
  doc.text("PG - Pool Gate", TABLE_LEFT, legendY + 32);
  doc.text("PBG – Palm Beach Gate", TABLE_LEFT, legendY + 64);

  const sigX = pageW - 72;
  doc.text("…………………………….", sigX, legendY + 32, { align: "right" });
  doc.text("HEAD PREFECT", sigX, legendY + 64, { align: "right" });

  return doc;
}

/** Build and trigger a browser download for one batch gate sheet. */
export function downloadBatchGateSheetPdf(
  batchName: string,
  rows: GateSheetPdfRow[]
): void {
  const doc = buildBatchGateSheetPdf(rows);
  doc.save(slugBatchFilename(batchName));
}
