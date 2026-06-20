import { fmtMoneyDecimal } from "./format";
import {
  monthKey,
  inMonth,
  inYear,
  type IncomeEntry,
  type ExpenseEntry,
  type SubscriptionEntry,
} from "./store";

export interface ReportTable {
  title: string;
  period: string;
  columns: string[];
  rows: (string | number)[][];
  summary: string[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function currentMonthLabel() {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function prevMonthYM() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ---------------- Report builders ---------------- */

export function buildMonthlyIncomeReport(incomes: IncomeEntry[]): ReportTable {
  const items = incomes.filter((i) => inMonth(i.date)).sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((a, i) => a + i.amount, 0);
  const byCat = new Map<string, number>();
  for (const i of items) byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    title: "Monthly Income Report",
    period: currentMonthLabel(),
    columns: ["Date", "Source", "Category", "Amount"],
    rows: items.map((i) => [i.date, i.source, i.category, fmtMoneyDecimal(i.amount)]),
    summary: [
      `Total income: ${fmtMoneyDecimal(total)}`,
      `Entries: ${items.length}`,
      top ? `Top category: ${top[0]} (${fmtMoneyDecimal(top[1])})` : "Top category: —",
    ],
  };
}

export function buildMonthlySpendingReport(expenses: ExpenseEntry[]): ReportTable {
  const lastYM = prevMonthYM();
  const thisMonth = expenses.filter((e) => inMonth(e.date));
  const lastMonth = expenses.filter((e) => monthKey(e.date) === lastYM);

  const cats = new Map<string, { now: number; prev: number }>();
  for (const e of thisMonth) {
    const c = cats.get(e.category) ?? { now: 0, prev: 0 };
    c.now += e.cost;
    cats.set(e.category, c);
  }
  for (const e of lastMonth) {
    const c = cats.get(e.category) ?? { now: 0, prev: 0 };
    c.prev += e.cost;
    cats.set(e.category, c);
  }

  const rows = [...cats.entries()]
    .sort((a, b) => b[1].now - a[1].now)
    .map(([cat, { now, prev }]) => {
      const delta = now - prev;
      const pct =
        prev > 0
          ? `${delta >= 0 ? "+" : ""}${Math.round((delta / prev) * 100)}%`
          : now > 0
            ? "new"
            : "—";
      return [
        cat,
        fmtMoneyDecimal(now),
        fmtMoneyDecimal(prev),
        `${delta >= 0 ? "+" : ""}${fmtMoneyDecimal(delta)}`,
        pct,
      ];
    });

  const totalNow = thisMonth.reduce((a, e) => a + e.cost, 0);
  const totalPrev = lastMonth.reduce((a, e) => a + e.cost, 0);
  const totalDelta = totalNow - totalPrev;

  return {
    title: "Monthly Spending Report",
    period: currentMonthLabel(),
    columns: ["Category", "This Month", "Last Month", "Change", "Change %"],
    rows,
    summary: [
      `Total this month: ${fmtMoneyDecimal(totalNow)}`,
      `Total last month: ${fmtMoneyDecimal(totalPrev)}`,
      `Change: ${totalDelta >= 0 ? "+" : ""}${fmtMoneyDecimal(totalDelta)}`,
    ],
  };
}

export function buildSubscriptionsReport(subs: SubscriptionEntry[]): ReportTable {
  const active = subs.filter((s) => s.status === "Active");
  // monthlyCost is already normalized per month; billed amount differs for yearly plans
  const billedAmount = (s: SubscriptionEntry) =>
    s.billingCycle === "Yearly" ? s.monthlyCost * 12 : s.monthlyCost;
  const total = active.reduce((a, s) => a + s.monthlyCost, 0);

  return {
    title: "Subscriptions Report",
    period: currentMonthLabel(),
    columns: [
      "Name",
      "Category",
      "Billing Cycle",
      "Amount",
      "Monthly Impact",
      "Next Charge",
      "Status",
    ],
    rows: subs.map((s) => [
      s.name,
      s.category,
      s.billingCycle,
      fmtMoneyDecimal(billedAmount(s)),
      fmtMoneyDecimal(s.monthlyCost),
      s.nextCharge || "—",
      s.status,
    ]),
    summary: [
      `Active subscriptions: ${active.length} of ${subs.length}`,
      `Total monthly impact: ${fmtMoneyDecimal(total)}`,
      `Annualized: ${fmtMoneyDecimal(total * 12)}`,
    ],
  };
}

export function buildAnnualPerformanceReport(
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[],
): ReportTable {
  const year = new Date().getFullYear();
  const yearIncomes = incomes.filter((i) => inYear(i.date));
  const yearExpenses = expenses.filter((e) => inYear(e.date));

  const rows: (string | number)[][] = [];
  let totalIn = 0;
  let totalOut = 0;
  for (let m = 0; m < 12; m++) {
    const ym = `${year}-${String(m + 1).padStart(2, "0")}`;
    const inc = yearIncomes
      .filter((i) => monthKey(i.date) === ym)
      .reduce((a, i) => a + i.amount, 0);
    const exp = yearExpenses.filter((e) => monthKey(e.date) === ym).reduce((a, e) => a + e.cost, 0);
    if (inc === 0 && exp === 0) continue;
    const net = inc - exp;
    totalIn += inc;
    totalOut += exp;
    rows.push([
      `${MONTHS[m]} ${year}`,
      fmtMoneyDecimal(inc),
      fmtMoneyDecimal(exp),
      fmtMoneyDecimal(net),
      inc > 0 ? `${Math.round((net / inc) * 100)}%` : "—",
    ]);
  }

  const totalNet = totalIn - totalOut;
  return {
    title: "Annual Performance Report",
    period: String(year),
    columns: ["Month", "Income", "Expenses", "Net", "Savings Rate"],
    rows,
    summary: [
      `Total income: ${fmtMoneyDecimal(totalIn)}`,
      `Total expenses: ${fmtMoneyDecimal(totalOut)}`,
      `Net cash flow: ${fmtMoneyDecimal(totalNet)}`,
      `Savings rate: ${totalIn > 0 ? `${Math.round((totalNet / totalIn) * 100)}%` : "—"}`,
    ],
  };
}

/* ---------------- Export formats ---------------- */

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filename(report: ReportTable, ext: string) {
  return `${slug(report.title)}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export function exportCSV(report: ReportTable) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    [report.title],
    [`Period: ${report.period}`],
    [],
    report.columns,
    ...report.rows,
    [],
    ...report.summary.map((s) => [s]),
  ];
  const csv = lines.map((row) => row.map(esc).join(",")).join("\r\n");
  downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), filename(report, "csv"));
}

export function exportExcel(report: ReportTable) {
  // SpreadsheetML 2003 — opens natively in Excel, no extra dependencies.
  const escXml = (v: string | number) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cell = (v: string | number, style?: string) =>
    `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="String">${escXml(v)}</Data></Cell>`;
  const row = (cells: string) => `<Row>${cells}</Row>`;

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14"/></Style>
    <Style ss:ID="head"><Font ss:Bold="1"/></Style>
  </Styles>
  <Worksheet ss:Name="${escXml(report.title).slice(0, 31)}">
    <Table>
      ${row(cell(report.title, "title"))}
      ${row(cell(`Period: ${report.period}`))}
      ${row("")}
      ${row(report.columns.map((c) => cell(c, "head")).join(""))}
      ${report.rows.map((r) => row(r.map((v) => cell(v)).join(""))).join("\n      ")}
      ${row("")}
      ${report.summary.map((s) => row(cell(s, "head"))).join("\n      ")}
    </Table>
  </Worksheet>
</Workbook>`;
  downloadBlob(new Blob([xml], { type: "application/vnd.ms-excel" }), filename(report, "xls"));
}

export async function exportPDF(report: ReportTable) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(report.title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Period: ${report.period} · Generated ${new Date().toLocaleDateString()}`, 14, 25);

  autoTable(doc, {
    startY: 31,
    head: [report.columns],
    body: report.rows.map((r) => r.map(String)),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [109, 40, 217] },
  });

  const endY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 31;
  doc.setFontSize(10);
  doc.setTextColor(40);
  report.summary.forEach((s, i) => doc.text(s, 14, endY + 8 + i * 6));

  doc.save(filename(report, "pdf"));
}
