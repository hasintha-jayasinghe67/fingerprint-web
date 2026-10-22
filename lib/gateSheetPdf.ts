/**
 * Client-side gate-sheet PDF matching the school printable roster layout.
 *
 * Full sheet: NAME | CODE | Mon–Fri, plus rules / legend / signature.
 * Off-probation: NAME | Mon–Fri only (no CODE column, no extras).
 *
 * Large rosters paginate across as many A4 pages as needed. Table headers
 * repeat on each page; full-sheet boilerplate always appears in full
 * (under the last table chunk when it fits, otherwise on a fresh page).
 *
 * Column widths grow with content (especially long names) so cells stay
 * single-line and the grid stays aligned.
 */

import { jsPDF } from "jspdf";

export interface GateSheetPdfRow {
  name: string;
  /** Prefects table code only (e.g. IMP) — never the PIN. */
  code: string | null;
  pin: string;
  /** Keys 1–5 = Mon–Fri; values MG / PG / PBG / null */
  days: Record<number, string | null>;
}

export type GateSheetPdfVariant = "full" | "offProbation";

const DAY_KEYS = [1, 2, 3, 4, 5] as const;
const DAY_LABELS_FULL = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];
const DAY_LABELS_SHORT = ["MON", "TUE", "WED", "THU", "FRI"];

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

/** Default column edges from the reference sheet (pt): NAME|CODE|Mon–Fri. */
const DEFAULT_COLS = [72, 179.5, 235.5, 288.5, 348.5, 424.5, 497.5, 543.5];
const TABLE_LEFT = DEFAULT_COLS[0];
const TABLE_RIGHT_DEFAULT = DEFAULT_COLS[DEFAULT_COLS.length - 1];
const HEADER_TOP = 86.5;
const ROW_H = 20;
const FONT = "helvetica";
const FONT_SIZE = 11;
const CELL_PAD_X = 4;
const MIN_CODE_W = 40;
const MIN_DAY_W = 32;
const PAGE_BOTTOM_MARGIN = 54;
/** Gap between the table and the rules block. */
const EXTRAS_GAP = 16;
/** Space reserved under the rules for the legend + signature. */
const LEGEND_BLOCK_H = 104;

function formatCodeCell(code: string | null): string {
  return (code || "").trim();
}

function slugBatch(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "batch"
  );
}

export function slugBatchFilename(
  name: string,
  variant: GateSheetPdfVariant = "full"
): string {
  const base = slugBatch(name);
  return variant === "offProbation"
    ? `${base}_off_probation.pdf`
    : `${base}_codes.pdf`;
}

function measure(
  doc: InstanceType<typeof jsPDF>,
  text: string,
  style: "normal" | "bold" = "normal",
  size = FONT_SIZE
): number {
  doc.setFont(FONT, style);
  doc.setFontSize(size);
  return doc.getTextWidth(text);
}

interface ColumnLayout {
  cols: number[];
  dayLabels: string[];
  includeCode: boolean;
}

interface RuleBlock {
  prefix: string;
  lines: string[];
}

function buildRuleBlocks(doc: InstanceType<typeof jsPDF>): {
  blocks: RuleBlock[];
  ruleLeft: number;
  ruleIndent: number;
  lineH: number;
  rulesHeight: number;
} {
  const pageW = doc.internal.pageSize.getWidth();
  const ruleLeft = 90;
  const ruleIndent = 108;
  const ruleMaxW = pageW - ruleIndent - 54;
  const lineH = 15.5;
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);

  const blocks: RuleBlock[] = RULES.map((rule, i) => ({
    prefix: `${i + 1})  `,
    lines: doc.splitTextToSize(rule, ruleMaxW) as string[],
  }));
  const rulesHeight = blocks.reduce(
    (sum, b) => sum + b.lines.length * lineH + 1.5,
    0
  );
  return { blocks, ruleLeft, ruleIndent, lineH, rulesHeight };
}

/** Total height needed below the table for rules + legend/signature. */
function extrasHeight(doc: InstanceType<typeof jsPDF>): number {
  const { rulesHeight } = buildRuleBlocks(doc);
  // gap + rules + breathing room + legend/signature block
  return EXTRAS_GAP + rulesHeight + 40 + LEGEND_BLOCK_H;
}

function maxDataRowsForHeight(availableBelowHeader: number): number {
  // Header row + N data rows must fit in availableBelowHeader.
  return Math.max(0, Math.floor(availableBelowHeader / ROW_H) - 1);
}

/**
 * Split rows so every page fits, and the last table page leaves room for
 * extras when requested. If extras cannot share a page with even one row,
 * they are drawn on their own page afterward.
 */
function chunkRows(
  rows: GateSheetPdfRow[],
  pageH: number,
  reserveExtras: number
): GateSheetPdfRow[][] {
  if (rows.length === 0) return [[]];

  const usable = pageH - HEADER_TOP - PAGE_BOTTOM_MARGIN;
  const maxFull = Math.max(1, maxDataRowsForHeight(usable));
  const maxWithExtras =
    reserveExtras > 0
      ? maxDataRowsForHeight(usable - reserveExtras)
      : maxFull;

  const chunks: GateSheetPdfRow[][] = [];
  let remaining = rows.slice();

  while (remaining.length > 0) {
    // Fits on one page with boilerplate underneath.
    if (maxWithExtras >= 1 && remaining.length <= maxWithExtras) {
      chunks.push(remaining);
      break;
    }

    // Fits as a table-only page; boilerplate will follow on a new page.
    if (remaining.length <= maxFull) {
      chunks.push(remaining);
      break;
    }

    // More than one page of rows: fill this page, then continue.
    // If the leftover after a full page fits with extras, take maxFull now
    // and finish on the next page with boilerplate.
    chunks.push(remaining.slice(0, maxFull));
    remaining = remaining.slice(maxFull);
  }

  return chunks;
}

function computeCols(
  doc: InstanceType<typeof jsPDF>,
  rows: GateSheetPdfRow[],
  includeCode: boolean
): ColumnLayout {
  const pageW = doc.internal.pageSize.getWidth();
  const maxRight = pageW - 28;
  const tableSpan = maxRight - TABLE_LEFT;

  const defaultNameW = DEFAULT_COLS[1] - DEFAULT_COLS[0];
  const defaultCodeW = DEFAULT_COLS[2] - DEFAULT_COLS[1];
  const defaultDayWidths = DAY_LABELS_FULL.map(
    (_, i) => DEFAULT_COLS[i + 3] - DEFAULT_COLS[i + 2]
  );
  const defaultDaySum = defaultDayWidths.reduce((a, b) => a + b, 0);

  let nameNeed = measure(doc, "NAME", "bold") + CELL_PAD_X * 2;
  let codeNeed = measure(doc, "CODE", "bold") + CELL_PAD_X * 2;
  for (const row of rows) {
    nameNeed = Math.max(
      nameNeed,
      measure(doc, row.name || "", "normal") + CELL_PAD_X * 2
    );
    if (includeCode) {
      codeNeed = Math.max(
        codeNeed,
        measure(doc, formatCodeCell(row.code), "normal") + CELL_PAD_X * 2
      );
    }
  }

  const codeW = includeCode
    ? Math.max(MIN_CODE_W, defaultCodeW, codeNeed)
    : 0;
  const minDaysTotal = MIN_DAY_W * DAY_LABELS_FULL.length;
  const nameW = Math.min(
    Math.max(defaultNameW, nameNeed),
    tableSpan - codeW - minDaysTotal
  );

  const fullHeaderNeeds = DAY_LABELS_FULL.map(
    (label) => measure(doc, label, "bold") + 4
  );
  const shortHeaderNeeds = DAY_LABELS_SHORT.map(
    (label) => measure(doc, label, "bold") + 4
  );

  const shortDaysMin = shortHeaderNeeds.reduce(
    (a, b) => a + Math.max(MIN_DAY_W, b),
    0
  );
  const referenceDayBudget = TABLE_RIGHT_DEFAULT - TABLE_LEFT - nameW - codeW;
  const needsWideTable = referenceDayBudget < shortDaysMin - 0.5;
  const targetRight = needsWideTable ? maxRight : TABLE_RIGHT_DEFAULT;
  const dayBudget = Math.max(
    minDaysTotal,
    targetRight - TABLE_LEFT - nameW - codeW
  );

  const useFullHeaders = DAY_LABELS_FULL.every((label, i) => {
    const share = (defaultDayWidths[i] / defaultDaySum) * dayBudget;
    return share >= measure(doc, label, "bold") + 2;
  });
  const dayLabels = useFullHeaders ? DAY_LABELS_FULL : DAY_LABELS_SHORT;
  const headerNeeds = useFullHeaders ? fullHeaderNeeds : shortHeaderNeeds;

  let dayWidths = defaultDayWidths.map((dw, i) =>
    Math.max(MIN_DAY_W, headerNeeds[i], (dw / defaultDaySum) * dayBudget)
  );
  let daySum = dayWidths.reduce((a, b) => a + b, 0);
  if (daySum > dayBudget + 0.05) {
    let overflow = daySum - dayBudget;
    for (let pass = 0; pass < 8 && overflow > 0.05; pass++) {
      const flexible = dayWidths.map((w, i) =>
        Math.max(0, w - Math.max(MIN_DAY_W, headerNeeds[i]))
      );
      const flexSum = flexible.reduce((a, b) => a + b, 0);
      if (flexSum <= 0) break;
      dayWidths = dayWidths.map((w, i) => w - (flexible[i] / flexSum) * overflow);
      daySum = dayWidths.reduce((a, b) => a + b, 0);
      overflow = daySum - dayBudget;
    }
  } else if (daySum < dayBudget - 0.05) {
    const extra = dayBudget - daySum;
    dayWidths = dayWidths.map(
      (w, i) => w + (defaultDayWidths[i] / defaultDaySum) * extra
    );
  }

  const cols = [TABLE_LEFT];
  cols.push(cols[0] + nameW);
  if (includeCode) {
    cols.push(cols[1] + codeW);
  }
  for (const w of dayWidths) {
    cols.push(cols[cols.length - 1] + w);
  }
  return { cols, dayLabels, includeCode };
}

/** Draw one table chunk (header + rows). Returns the table bottom y. */
function drawGateTableChunk(
  doc: InstanceType<typeof jsPDF>,
  rows: GateSheetPdfRow[],
  layout: ColumnLayout
): number {
  const { cols, dayLabels, includeCode } = layout;
  const tableLeft = cols[0];
  const tableRight = cols[cols.length - 1];
  const tableBottom = HEADER_TOP + ROW_H * (1 + rows.length);
  const nameInnerW = cols[1] - cols[0] - CELL_PAD_X * 2;
  const dayStartIdx = includeCode ? 2 : 1;

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);

  for (let i = 0; i <= rows.length + 1; i++) {
    const y = HEADER_TOP + i * ROW_H;
    doc.line(tableLeft, y, tableRight, y);
  }
  for (const x of cols) {
    doc.line(x, HEADER_TOP, x, tableBottom);
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(FONT_SIZE);
  const headerY = HEADER_TOP + ROW_H / 2 + 3.5;
  doc.text("NAME", (cols[0] + cols[1]) / 2, headerY, { align: "center" });
  if (includeCode) {
    doc.text("CODE", (cols[1] + cols[2]) / 2, headerY, { align: "center" });
  }
  dayLabels.forEach((label, i) => {
    const cx = (cols[dayStartIdx + i] + cols[dayStartIdx + i + 1]) / 2;
    doc.text(label, cx, headerY, { align: "center" });
  });

  rows.forEach((row, idx) => {
    const y = HEADER_TOP + ROW_H * (idx + 1) + ROW_H / 2 + 3.5;

    let nameSize = FONT_SIZE;
    doc.setFont(FONT, "normal");
    doc.setFontSize(nameSize);
    let nameW = doc.getTextWidth(row.name || "");
    while (nameW > nameInnerW && nameSize > 7) {
      nameSize -= 0.5;
      doc.setFontSize(nameSize);
      nameW = doc.getTextWidth(row.name || "");
    }
    doc.text(row.name || "", tableLeft + CELL_PAD_X, y);
    doc.setFontSize(FONT_SIZE);

    if (includeCode) {
      const codeText = formatCodeCell(row.code);
      if (codeText) {
        doc.text(codeText, (cols[1] + cols[2]) / 2, y, { align: "center" });
      }
    }

    DAY_KEYS.forEach((dayKey, i) => {
      const assignment = row.days[dayKey];
      if (!assignment) return;
      const cx = (cols[dayStartIdx + i] + cols[dayStartIdx + i + 1]) / 2;
      doc.setFont(FONT, "bold");
      doc.text(assignment, cx, y, { align: "center" });
      doc.setFont(FONT, "normal");
    });
  });

  return tableBottom;
}

function drawFullExtras(
  doc: InstanceType<typeof jsPDF>,
  startY: number
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { blocks, ruleLeft, ruleIndent, lineH } = buildRuleBlocks(doc);

  let textY = startY;
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);

  for (const block of blocks) {
    // If a rule would run past the bottom margin, continue on a new page.
    const blockH = block.lines.length * lineH + 1.5;
    if (textY + blockH > pageH - PAGE_BOTTOM_MARGIN - LEGEND_BLOCK_H) {
      doc.addPage();
      textY = HEADER_TOP;
    }
    doc.text(block.prefix, ruleLeft, textY);
    block.lines.forEach((line, li) => {
      doc.text(line, ruleIndent, textY + li * lineH);
    });
    textY += blockH;
  }

  let legendY = textY + 40;
  if (legendY + LEGEND_BLOCK_H > pageH - PAGE_BOTTOM_MARGIN) {
    doc.addPage();
    legendY = HEADER_TOP;
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  doc.text("MG – Main Gate", TABLE_LEFT, legendY);
  doc.text("PG - Pool Gate", TABLE_LEFT, legendY + 32);
  doc.text("PBG – Palm Beach Gate", TABLE_LEFT, legendY + 64);

  const sigX = pageW - 72;
  doc.text("…………………………….", sigX, legendY + 32, { align: "right" });
  doc.text("HEAD PREFECT", sigX, legendY + 64, { align: "right" });
}

/** Build an A4 gate-sheet PDF for one batch (multi-page when needed). */
export function buildBatchGateSheetPdf(
  rows: GateSheetPdfRow[],
  variant: GateSheetPdfVariant = "full"
): InstanceType<typeof jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const includeCode = variant !== "offProbation";
  const pageH = doc.internal.pageSize.getHeight();
  const layout = computeCols(doc, rows, includeCode);
  const reserve =
    variant === "full" ? extrasHeight(doc) : 0;
  const chunks = chunkRows(rows, pageH, reserve);

  chunks.forEach((chunk, idx) => {
    if (idx > 0) doc.addPage();
    const tableBottom = drawGateTableChunk(doc, chunk, layout);
    const isLast = idx === chunks.length - 1;
    if (variant === "full" && isLast) {
      const need = extrasHeight(doc);
      if (tableBottom + need <= pageH - PAGE_BOTTOM_MARGIN) {
        drawFullExtras(doc, tableBottom + EXTRAS_GAP);
      } else {
        doc.addPage();
        drawFullExtras(doc, HEADER_TOP);
      }
    }
  });

  return doc;
}

/** Build and trigger a browser download for one batch gate sheet. */
export function downloadBatchGateSheetPdf(
  batchName: string,
  rows: GateSheetPdfRow[],
  variant: GateSheetPdfVariant = "full"
): void {
  const doc = buildBatchGateSheetPdf(rows, variant);
  doc.save(slugBatchFilename(batchName, variant));
}
