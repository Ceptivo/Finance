import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  History,
  AlertTriangle,
} from "lucide-react";
import { generateDailyReport } from "@/lib/daily-report.functions";
import { useIncomes, useExpenses, useSubs } from "@/lib/store";
import {
  buildMonthlyIncomeReport,
  buildMonthlySpendingReport,
  buildSubscriptionsReport,
  buildAnnualPerformanceReport,
  exportCSV,
  exportExcel,
  exportPDF,
  type ReportTable,
} from "@/lib/report-export";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

const reports = [
  { name: "Monthly Income Report", desc: "Income breakdown by category and source for the month." },
  { name: "Monthly Spending Report", desc: "Spending by category with comparison to last month." },
  { name: "Subscriptions Report", desc: "All active subscriptions and their monthly impact." },
  { name: "Annual Performance Report", desc: "Full-year cash flow, savings rate and trends." },
];

function ReportsPage() {
  const genFn = useServerFn(generateDailyReport);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ReportTable | null>(null);

  const incomes = useIncomes();
  const expenses = useExpenses();
  const subs = useSubs();

  const buildReport = (name: string): ReportTable | null => {
    const built =
      name === "Monthly Income Report"
        ? buildMonthlyIncomeReport(incomes.items)
        : name === "Monthly Spending Report"
          ? buildMonthlySpendingReport(expenses.items)
          : name === "Subscriptions Report"
            ? buildSubscriptionsReport(subs.items)
            : buildAnnualPerformanceReport(incomes.items, expenses.items);
    if (built.rows.length === 0) {
      toast.info("No data for this report yet — add some entries first.");
      return null;
    }
    return built;
  };

  const exportAs = async (name: string, format: "pdf" | "excel" | "csv") => {
    const built = buildReport(name);
    if (!built) return;
    try {
      if (format === "pdf") await exportPDF(built);
      else if (format === "excel") exportExcel(built);
      else exportCSV(built);
      toast.success(`${built.title} exported as ${format.toUpperCase()}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    }
  };

  const run = async () => {
    setLoading(true);
    try {
      const res = await genFn();
      setReport(res.report);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Generate exports and get an AI coach to review your finances."
      />

      {/* Daily AI Report */}
      <div className="glass rounded-2xl p-5 mb-5 shadow-elegant border border-primary/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow shrink-0">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">Daily Financial Health Report</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                AI reviews your last 30 days, flags risky behavior, and tells you what to do today.
              </p>
            </div>
          </div>
          <Button
            onClick={run}
            disabled={loading}
            className="gradient-primary text-primary-foreground shadow-glow border-0"
          >
            {loading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            {loading ? "Analyzing…" : report ? "Refresh report" : "Generate report"}
          </Button>
        </div>
        {report && (
          <div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {report}
          </div>
        )}
        {!report && !loading && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5" /> Educational only — not regulated financial
            advice.
          </div>
        )}
      </div>

      {/* Past Finances quick link */}
      <Link
        to="/past-finances"
        className="glass rounded-2xl p-5 mb-5 shadow-elegant block hover:-translate-y-0.5 hover:shadow-glow transition-smooth"
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-accent grid place-items-center shrink-0">
            <History className="size-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Past Finances</h3>
            <p className="text-sm text-muted-foreground">
              Upload old bank statements to review previous months — sandboxed from your live
              dashboard.
            </p>
          </div>
          <Button variant="outline">Open</Button>
        </div>
      </Link>

      <h3 className="text-sm font-semibold text-muted-foreground mb-3 mt-2">Exports</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div
            key={r.name}
            className="glass rounded-2xl p-5 shadow-elegant transition-smooth hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{r.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
              </div>
              <div className="size-10 rounded-xl bg-accent grid place-items-center shrink-0">
                <FileText className="size-5 text-accent-foreground" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => exportAs(r.name, "pdf")}>
                <FileDown className="size-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" onClick={() => exportAs(r.name, "excel")}>
                <FileSpreadsheet className="size-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" onClick={() => exportAs(r.name, "csv")}>
                <FileDown className="size-4 mr-1" /> CSV
              </Button>
              <Button
                onClick={() => {
                  const built = buildReport(r.name);
                  if (built) setPreview(built);
                }}
                className="ml-auto gradient-primary text-primary-foreground shadow-glow border-0"
              >
                Generate
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.title}</DialogTitle>
                <DialogDescription>Period: {preview.period}</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.columns.map((c) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((v, j) => (
                          <TableCell key={j}>{v}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {preview.summary.map((s) => (
                  <div key={s}>{s}</div>
                ))}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportPDF(preview)
                      .then(() => toast.success("PDF exported"))
                      .catch((e) => toast.error(e?.message ?? "Export failed"))
                  }
                >
                  <FileDown className="size-4 mr-1" /> PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    exportExcel(preview);
                    toast.success("Excel exported");
                  }}
                >
                  <FileSpreadsheet className="size-4 mr-1" /> Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    exportCSV(preview);
                    toast.success("CSV exported");
                  }}
                >
                  <FileDown className="size-4 mr-1" /> CSV
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
