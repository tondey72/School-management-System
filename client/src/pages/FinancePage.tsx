import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  totalAmount: string | number;
  outstandingAmount: string | number;
  status: string;
  dueDate?: string;
  studentId: string;
}

interface Payment {
  id: string;
  amount: string | number;
  paymentMethod: string;
  status: string;
  receiptNo?: string;
  invoiceId: string;
  createdAt?: string;
}

type TabKey = "invoicing" | "receipting" | "due" | "reminders" | "vat";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "invoicing", label: "Invoicing" },
  { key: "receipting", label: "Receipting" },
  { key: "due", label: "Due Payments" },
  { key: "reminders", label: "Reminders" },
  { key: "vat", label: "VAT Config" }
];

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("invoicing");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vatRate, setVatRate] = useState(0.16);
  const [reminderLogs, setReminderLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>("");

  const [invoiceStudentId, setInvoiceStudentId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("0");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("Tuition Fee");

  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "MOBILE_MONEY" | "CHEQUE" | "ONLINE">("CASH");

  const [vatInput, setVatInput] = useState("16");

  const asNumber = (value: string | number | undefined) => Number(value ?? 0);

  const loadData = async () => {
    const [invoicesResponse, paymentsResponse] = await Promise.all([
      api.get<Invoice[]>("/finance/invoicing/invoices"),
      api.get<Payment[]>("/finance/payments/payments")
    ]);

    setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : []);
    setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);

    try {
      const studentsResponse = await api.get<StudentOption[]>("/students");
      const loadedStudents = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
      setStudents(loadedStudents);
      if (!invoiceStudentId && loadedStudents.length > 0) {
        setInvoiceStudentId(loadedStudents[0].id);
      }
    } catch {
      setStudents([]);
    }

    try {
      const vatResponse = await api.get<{ vatRate: number }>("/finance/invoicing/vat");
      const nextVatRate = typeof vatResponse.data?.vatRate === "number" ? vatResponse.data.vatRate : 0.16;
      setVatRate(nextVatRate);
      setVatInput(String(Math.round(nextVatRate * 100)));
    } catch {
      setVatRate(0.16);
      setVatInput("16");
    }

    try {
      const logsResponse = await api.get<string[] | string>("/finance/reminders/logs");
      if (Array.isArray(logsResponse.data)) {
        setReminderLogs(logsResponse.data.map((log) => String(log)));
      } else if (typeof logsResponse.data === "string") {
        setReminderLogs([logsResponse.data]);
      } else {
        setReminderLogs([]);
      }
    } catch {
      setReminderLogs([]);
    }
  };

  useEffect(() => {
    loadData().catch(() => {
      setFeedback("Could not load finance data.");
    });
  }, []);

  const dueInvoices = useMemo(() => {
    return invoices.filter((invoice) => asNumber(invoice.outstandingAmount) > 0);
  }, [invoices]);

  const summary = useMemo(() => {
    const invoiceTotal = invoices.reduce((sum, invoice) => sum + asNumber(invoice.totalAmount), 0);
    const outstanding = invoices.reduce((sum, invoice) => sum + asNumber(invoice.outstandingAmount), 0);
    const collections = payments.reduce((sum, payment) => sum + asNumber(payment.amount), 0);

    return {
      invoices: invoices.length,
      invoiceTotal,
      collections,
      outstanding
    };
  }, [invoices, payments]);

  const createInvoice = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback("");

    await api.post("/finance/invoicing/invoices", {
      studentId: invoiceStudentId,
      issueDate: new Date().toISOString(),
      dueDate: new Date(`${invoiceDueDate}T00:00:00.000Z`).toISOString(),
      billingCycle: "TERM",
      academicYear: String(new Date().getFullYear()),
      lineItems: [
        {
          description: invoiceDescription,
          feeType: "TUITION",
          quantity: 1,
          unitPrice: invoiceAmount
        }
      ],
      discountAmount: "0",
      taxAmount: "0"
    });

    setInvoiceAmount("0");
    setInvoiceDueDate("");
    setInvoiceDescription("Tuition Fee");
    setFeedback("Invoice created successfully.");
    await loadData();
  };

  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback("");

    await api.post("/finance/payments/payments", {
      invoiceId: paymentInvoiceId,
      amount: paymentAmount,
      paymentMethod
    });

    setPaymentAmount("0");
    setFeedback("Payment recorded and receipt generated.");
    await loadData();
  };

  const markDueAsComplete = async () => {
    setFeedback("");
    const response = await api.post<string>("/finance/due-payment/complete", {});
    setFeedback(typeof response.data === "string" ? response.data : "Due payment processed.");
    await loadData();
  };

  const sendReminders = async () => {
    setFeedback("");
    const response = await api.post<string>("/finance/reminders/send", {});
    setFeedback(typeof response.data === "string" ? response.data : "Reminders sent.");
    await loadData();
  };

  const updateVatRate = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback("");
    const normalizedRate = Math.max(0, Math.min(100, Number(vatInput))) / 100;

    await api.put("/finance/invoicing/vat", { rate: normalizedRate });
    setFeedback("VAT configuration updated.");
    await loadData();
  };

  return (
    <section className="space-y-6">
      <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
        <h2 className="font-heading text-3xl font-extrabold">Finance and Billing</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage invoicing, receipting, due collections, reminders, and tax setup from one workspace.</p>
      </motion.header>

      <div className="grid gap-4 text-sm md:grid-cols-4">
        <div className="card-surface p-4">Invoices: <strong>{summary.invoices}</strong></div>
        <div className="card-surface p-4">Invoice Total: <strong>{summary.invoiceTotal.toFixed(2)}</strong></div>
        <div className="card-surface p-4">Collections: <strong>{summary.collections.toFixed(2)}</strong></div>
        <div className="card-surface p-4">Outstanding: <strong>{summary.outstanding.toFixed(2)}</strong></div>
      </div>

      <nav className="card-surface flex flex-wrap gap-2 p-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {feedback && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-3 text-sm">
          {feedback}
        </div>
      )}

      {activeTab === "invoicing" && (
        <div className="space-y-4">
          <form className="card-surface grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={createInvoice}>
            <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={invoiceStudentId} onChange={(event) => setInvoiceStudentId(event.target.value)} required>
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
              ))}
            </select>
            <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Description" value={invoiceDescription} onChange={(event) => setInvoiceDescription(event.target.value)} required />
            <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Amount" type="number" min="1" value={invoiceAmount} onChange={(event) => setInvoiceAmount(event.target.value)} required />
            <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={invoiceDueDate} onChange={(event) => setInvoiceDueDate(event.target.value)} required />
            <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Create Invoice</button>
          </form>

          <div className="card-surface overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[hsl(var(--muted-foreground))]">
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Outstanding</th>
                  <th className="pb-2">Due Date</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2">{invoice.invoiceNo}</td>
                    <td className="py-2">{asNumber(invoice.totalAmount).toFixed(2)}</td>
                    <td className="py-2">{asNumber(invoice.outstandingAmount).toFixed(2)}</td>
                    <td className="py-2">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}</td>
                    <td className="py-2">{invoice.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "receipting" && (
        <div className="space-y-4">
          <form className="card-surface grid gap-3 p-4 md:grid-cols-4" onSubmit={recordPayment}>
            <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={paymentInvoiceId} onChange={(event) => setPaymentInvoiceId(event.target.value)} required>
              <option value="">Select Invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} ({asNumber(invoice.outstandingAmount).toFixed(2)})</option>
              ))}
            </select>
            <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Payment Amount" type="number" min="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
            <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </select>
            <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Record Payment</button>
          </form>

          <div className="card-surface overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[hsl(var(--muted-foreground))]">
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Receipt</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2">{asNumber(payment.amount).toFixed(2)}</td>
                    <td className="py-2">{payment.paymentMethod}</td>
                    <td className="py-2">{payment.receiptNo ?? "-"}</td>
                    <td className="py-2">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "due" && (
        <div className="space-y-4">
          <div className="card-surface p-4 text-sm">
            <p className="mb-2">Open due invoices: <strong>{dueInvoices.length}</strong></p>
            <button type="button" className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" onClick={markDueAsComplete}>
              Mark Due Payment Complete
            </button>
          </div>
          <div className="card-surface overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[hsl(var(--muted-foreground))]">
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Outstanding</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dueInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2">{invoice.invoiceNo}</td>
                    <td className="py-2">{asNumber(invoice.outstandingAmount).toFixed(2)}</td>
                    <td className="py-2">{invoice.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "reminders" && (
        <div className="space-y-4">
          <div className="card-surface p-4 text-sm">
            <button type="button" className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" onClick={sendReminders}>
              Send Reminders
            </button>
          </div>
          <div className="card-surface p-4">
            <h3 className="mb-3 font-heading text-lg font-bold">Reminder Logs</h3>
            <ul className="space-y-2 text-sm">
              {(reminderLogs.length > 0 ? reminderLogs : ["No reminder logs available yet."]).map((log, index) => (
                <li key={`${log}-${index}`} className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2">{log}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === "vat" && (
        <form className="card-surface grid gap-3 p-4 md:grid-cols-[1fr_auto]" onSubmit={updateVatRate}>
          <label className="text-sm">
            VAT Rate (%)
            <input
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={vatInput}
              onChange={(event) => setVatInput(event.target.value)}
              required
            />
          </label>
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Save VAT</button>
          <p className="text-sm text-[hsl(var(--muted-foreground))] md:col-span-2">Current VAT: {(vatRate * 100).toFixed(2)}%</p>
        </form>
      )}
    </section>
  );
}
