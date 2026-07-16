import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import client from '../api/client';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';

// ─── Status pill styling & labels ────────────────────────────────────────────
const STATUS_CONFIG = {
  PAID:           { label: 'Paid',           color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',     dot: 'bg-amber-400' },
  PENDING:        { label: 'Pending',        color: 'bg-sky-500/20 text-sky-400 border-sky-500/30 font-medium', dot: 'bg-sky-400' },
  OVERDUE:        { label: 'Overdue',        color: 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-bold animate-pulse', dot: 'bg-rose-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const PaymentModeBadge = ({ mode }) => {
  const colors = {
    UPI: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    CASH: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    CARD: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    BANK_TRANSFER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${colors[mode] || 'bg-slate-800 text-slate-400'}`}>
      {mode ? mode.replace('_', ' ') : 'Other'}
    </span>
  );
};

const Fees = () => {
  const toast = useToast();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments' | 'structures'

  // Data states
  const [dashboardStats, setDashboardStats] = useState({
    collected_this_month: 0,
    total_pending: 0,
    overdue_count: 0,
    total_collected: 0,
  });
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  // Modals state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_mode: 'UPI',
    payment_date: new Date().toISOString().slice(0, 10),
    remarks: '',
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Invoice Generation Modal
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    target_type: 'batch', // 'batch' | 'student'
    batch: '',
    student: '',
    amount_due: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [genError, setGenError] = useState(null);

  // Structure Creation Modal
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);
  const [structForm, setStructForm] = useState({
    batch: '',
    student: '',
    amount: '',
    frequency: 'MONTHLY',
    effective_from: new Date().toISOString().slice(0, 10),
  });
  const [structSubmitting, setStructSubmitting] = useState(false);
  const [structError, setStructError] = useState(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, invRes, payRes, batchRes] = await Promise.all([
        client.get('fees/dashboard/'),
        client.get('fees/invoices/'),
        client.get('fees/payments/'),
        client.get('batches/'),
      ]);
      setDashboardStats(dashRes.data);
      setInvoices(invRes.data);
      setPayments(payRes.data);
      setBatches(batchRes.data);

      if (isAdmin) {
        const [structRes, studentRes] = await Promise.all([
          client.get('fees/structures/'),
          client.get('students/'),
        ]);
        setStructures(structRes.data);
        setStudents(studentRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync billing data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle Recording Payment
  const handleOpenPaymentModal = (inv) => {
    setPaymentModalInvoice(inv);
    const isPartial = Number(inv.amount_paid) > 0;
    const paymentCount = inv.payments ? inv.payments.length + 1 : 1;
    setPaymentForm({
      amount_paid: inv.balance_due,
      payment_mode: 'UPI',
      payment_date: new Date().toISOString().slice(0, 10),
      remarks: isPartial ? `Installment #${paymentCount}` : 'Full Settlement',
    });
    setPaymentError(null);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    setPaymentSubmitting(true);
    setPaymentError(null);
    try {
      await client.post(`fees/invoices/${paymentModalInvoice.id}/pay/`, paymentForm);
      setPaymentModalInvoice(null);
      await fetchAllData();
      toast.success('Payment recorded and receipt generated.');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.amount_paid?.[0] || 'Payment processing failed.';
      setPaymentError(msg);
      toast.error(msg);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Handle Generating Invoice
  const handleGenSubmit = async (e) => {
    e.preventDefault();
    setGenSubmitting(true);
    setGenError(null);

    const payload = {
      amount_due: genForm.amount_due,
      due_date: genForm.due_date,
    };
    if (genForm.target_type === 'batch' && genForm.batch) payload.batch = genForm.batch;
    if (genForm.target_type === 'student' && genForm.student) payload.student = genForm.student;

    try {
      await client.post('fees/invoices/', payload);
      setIsGenModalOpen(false);
      await fetchAllData();
      toast.success('Invoices issued successfully.');
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to issue invoice.';
      setGenError(msg);
      toast.error(msg);
    } finally {
      setGenSubmitting(false);
    }
  };

  // Handle Fee Structure Creation
  const handleStructSubmit = async (e) => {
    e.preventDefault();
    setStructSubmitting(true);
    setStructError(null);

    const payload = {
      batch: structForm.batch,
      amount: structForm.amount,
      frequency: structForm.frequency,
      effective_from: structForm.effective_from,
    };
    if (structForm.student) payload.student = structForm.student;

    try {
      await client.post('fees/structures/', payload);
      setIsStructModalOpen(false);
      await fetchAllData();
      toast.success('Fee structure template created.');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create fee structure template.';
      setStructError(msg);
      toast.error(msg);
    } finally {
      setStructSubmitting(false);
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.enrollment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `INV-${inv.id}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesBatch = batchFilter === 'ALL' || (inv.batch && String(inv.batch) === String(batchFilter));

    return matchesSearch && matchesStatus && matchesBatch;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Fees & Billing Portal"
        subtitle="Manage fee structures, issue student invoices, and log payment receipts"
        badge="Live Billing"
        actionButton={
          isAdmin ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStructModalOpen(true)}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                + Fee Structure
              </button>
              <button
                onClick={() => setIsGenModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                + Issue Invoice
              </button>
            </div>
          ) : null
        }
      />

      {/* Overview Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected This Month</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">₹{Number(dashboardStats.collected_this_month).toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Current calendar period</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pending Dues</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">₹{Number(dashboardStats.total_pending).toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Uncollected outstanding total</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Invoices</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">{dashboardStats.overdue_count}</h3>
            </div>
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Requires follow-up</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Lifetime Receipts</p>
              <h3 className="text-2xl font-black text-indigo-400 mt-1">₹{Number(dashboardStats.total_collected).toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Total processed revenues</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          Student Invoices ({filteredInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          Payment Ledger ({payments.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'structures'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Fee Structures ({structures.length})
          </button>
        )}
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <svg className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search student, enrollment, invoice ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              No matching fee invoices found.
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Invoice ID</th>
                      <th className="px-6 py-4 font-semibold">Student Details</th>
                      <th className="px-6 py-4 font-semibold">Batch</th>
                      <th className="px-6 py-4 font-semibold">Due Date</th>
                      <th className="px-6 py-4 font-semibold">Amount Due</th>
                      <th className="px-6 py-4 font-semibold">Paid / Balance</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-indigo-400">
                          INV-{String(inv.id).padStart(4, '0')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{inv.student_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{inv.enrollment_no}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-medium">
                          {inv.batch_name}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-400">
                          {inv.due_date}
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          ₹{Number(inv.amount_due).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-emerald-400">
                            Paid: ₹{Number(inv.amount_paid).toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs font-semibold text-amber-400">
                            Bal: ₹{Number(inv.balance_due).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && inv.status !== 'PAID' ? (
                            <button
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition-all"
                            >
                              Record Payment
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Transaction Receipts</h3>
            <span className="text-xs text-slate-500 font-mono">Total Transactions: {payments.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Receipt ID</th>
                  <th className="px-6 py-4 font-semibold">Invoice Reference</th>
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Amount Paid</th>
                  <th className="px-6 py-4 font-semibold">Payment Mode</th>
                  <th className="px-6 py-4 font-semibold">Date Received</th>
                  <th className="px-6 py-4 font-semibold">Collected By</th>
                  <th className="px-6 py-4 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      REC-{String(p.id).padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4 font-mono text-indigo-400">
                      INV-{String(p.invoice_id).padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {p.student_name}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-400">
                      ₹{Number(p.amount_paid).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <PaymentModeBadge mode={p.payment_mode} />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-400">
                      {p.payment_date}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                      {p.received_by_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {p.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FEE STRUCTURES */}
      {activeTab === 'structures' && isAdmin && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Batch & Custom Fee Tiers</h3>
            <button
              onClick={() => setIsStructModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              + Add Structure
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Batch Target</th>
                  <th className="px-6 py-4 font-semibold">Student Override</th>
                  <th className="px-6 py-4 font-semibold">Standard Amount</th>
                  <th className="px-6 py-4 font-semibold">Frequency</th>
                  <th className="px-6 py-4 font-semibold">Effective From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {structures.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-indigo-400">
                      {s.batch_name}
                    </td>
                    <td className="px-6 py-4">
                      {s.student_name ? (
                        <span className="px-2.5 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-md text-xs font-medium">
                          {s.student_name} ({s.enrollment_no})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">All Batch Students</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      ₹{Number(s.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                      {s.frequency}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-400">
                      {s.effective_from}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD PAYMENT */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Record Fee Payment</h3>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">INV-{String(paymentModalInvoice.id).padStart(4, '0')}</p>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {paymentError}
              </div>
            )}

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Student:</span>
                <span className="font-semibold text-white">{paymentModalInvoice.student_name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Due:</span>
                <span className="font-bold text-slate-200">₹{paymentModalInvoice.amount_due}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Remaining Balance:</span>
                <span className="font-bold text-amber-400">₹{paymentModalInvoice.balance_due}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Installment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-lg font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                />
                {/* Installment Presets */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount_paid: paymentModalInvoice.balance_due, remarks: 'Full Settlement' })}
                    className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20"
                  >
                    Full Balance (₹{paymentModalInvoice.balance_due})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({
                      ...paymentForm,
                      amount_paid: (Number(paymentModalInvoice.balance_due) / 2).toFixed(2),
                      remarks: `Installment #${(paymentModalInvoice.payments?.length || 0) + 1} (50%)`
                    })}
                    className="text-[11px] font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20"
                  >
                    50% Installment (₹{(Number(paymentModalInvoice.balance_due) / 2).toFixed(0)})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Remarks / Transaction Ref</label>
                <input
                  type="text"
                  placeholder="e.g. UTR #1293810293 or Cash Receipt"
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
                >
                  {paymentSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE INVOICE */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white">Issue Fee Invoice</h3>
              <button onClick={() => setIsGenModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {genError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {genError}
              </div>
            )}

            <form onSubmit={handleGenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGenForm({ ...genForm, target_type: 'batch' })}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                      genForm.target_type === 'batch'
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Entire Batch
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenForm({ ...genForm, target_type: 'student' })}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                      genForm.target_type === 'student'
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Single Student
                  </button>
                </div>
              </div>

              {genForm.target_type === 'batch' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Batch</label>
                  <select
                    required
                    value={genForm.batch}
                    onChange={(e) => setGenForm({ ...genForm, batch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Choose Batch...</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Student</label>
                  <select
                    required
                    value={genForm.student}
                    onChange={(e) => setGenForm({ ...genForm, student: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Choose Student...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.user?.first_name} {s.user?.last_name} ({s.enrollment_no})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Invoice Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2500"
                  value={genForm.amount_due}
                  onChange={(e) => setGenForm({ ...genForm, amount_due: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={genForm.due_date}
                  onChange={(e) => setGenForm({ ...genForm, due_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genSubmitting}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  {genSubmitting ? 'Issuing...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW FEE STRUCTURE */}
      {isStructModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white">Create Fee Structure</h3>
              <button onClick={() => setIsStructModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {structError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {structError}
              </div>
            )}

            <form onSubmit={handleStructSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Batch</label>
                <select
                  required
                  value={structForm.batch}
                  onChange={(e) => setStructForm({ ...structForm, batch: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Student (Optional Override)</label>
                <select
                  value={structForm.student}
                  onChange={(e) => setStructForm({ ...structForm, student: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Students in Batch</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.user?.first_name} {s.user?.last_name} ({s.enrollment_no})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fee Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2000"
                  value={structForm.amount}
                  onChange={(e) => setStructForm({ ...structForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Billing Frequency</label>
                <select
                  value={structForm.frequency}
                  onChange={(e) => setStructForm({ ...structForm, frequency: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ONE_TIME">One Time</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="INSTALLMENT">Installments</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Effective Date</label>
                <input
                  type="date"
                  required
                  value={structForm.effective_from}
                  onChange={(e) => setStructForm({ ...structForm, effective_from: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsStructModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={structSubmitting}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  {structSubmitting ? 'Creating...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
