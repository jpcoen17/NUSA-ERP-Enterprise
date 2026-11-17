import { Link, useParams } from "react-router-dom";
import { MODULES } from "@/lib/modules";
import RecordsPage from "@/pages/RecordsPage";
import { MODULE_FORMS } from "@/lib/moduleForms";
import InventoryPage from "@/pages/InventoryPage";
import CashBankPage from "@/pages/CashBankPage";
import GeneralLedgerPage from "@/pages/GeneralLedgerPage";
import AccountsPayablePage from "@/pages/AccountsPayablePage";
import FinancialReportingPage from "@/pages/FinancialReportingPage";
import { useGuest } from "@/hooks/useGuest";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import SalesOrdersPage from "@/pages/SalesOrdersPage";
import InvoicesPage from "@/pages/InvoicesPage";
import PasskeysPage from "@/pages/PasskeysPage";
import PasskeyStatusPage from "@/pages/PasskeyStatusPage";
import MfaPage from "@/pages/MfaPage";
import ApprovalPage from "@/pages/ApprovalPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SupplyChainPage from "@/pages/SupplyChainPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import RbacPage from "@/pages/RbacPage";
import AuditPage from "@/pages/AuditPage";
import DashboardPage from "@/pages/DashboardPage";
import OrgTablePage from "@/pages/OrgTablePage";
import StatusBadge from "@/components/StatusBadge";

// Modules with a dedicated page: the generic record store must NOT also render for them.
const CUSTOM = new Set([6, 7, 9, 10, 18]);
const TABLES: Record<number, string> = { 2: "companies", 3: "branches", 11: "customers", 16: "suppliers" };

export default function ModulePage() {
  const guest = useGuest();
  const { no } = useParams();
  const m = MODULES.find((x) => x.no === Number(no));
  if (!m) return <p>Module not found. <Link className="text-accent" to="/">Back to launcher</Link></p>;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs text-slate-500">{m.group} {m.groupName} · Module #{m.no}</p>
      <h1 className="mb-3 text-2xl font-semibold">{m.name}</h1>
      <StatusBadge status={m.status} />
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {m.status === "PLANNED" ? "This module is planned and has no functionality yet." : m.status === "TESTING" && ([6, 7, 8, 9, 10, 21, 13, 18, 40, 50, 58, 61, 64, 66, 67, 68].includes(m.no)) ? "Real feature backed by server-side database functions with RLS. Built and database-tested; awaiting owner verification in the browser." : m.status === "TESTING" ? "Basic record keeping (add / edit / delete) stored in Supabase with RLS and audit log. No business workflow or approvals yet." : "In development: real data from Supabase. Not all create/edit features are built yet."}
      </div>
      {m.no === 1 && <DashboardPage />}
      {m.no === 9 && <CashBankPage />}
      {m.no === 21 && <InventoryPage />}
      {m.no === 6 && <GeneralLedgerPage />}
      {m.no === 7 && <AccountsPayablePage />}
      {m.no === 10 && <FinancialReportingPage />}
      {m.no === 18 && <PurchaseOrdersPage />}
      {m.no === 8 && <InvoicesPage />}
      {m.no === 13 && <SalesOrdersPage />}
      {m.no === 36 && <PasskeyStatusPage kind="fingerprint" />}
      {m.no === 37 && <PasskeyStatusPage kind="face" />}
      {(m.no === 38 || m.no === 39) && guest && <p className="mt-6 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600">Fitur ini dinonaktifkan untuk akun Guest karena akun ini dipakai bersama. Daftar akun sendiri untuk mencobanya.</p>}
      {m.no === 38 && !guest && <PasskeysPage />}
      {m.no === 39 && !guest && <MfaPage />}
      {m.no === 40 && <AuditPage prefix="auth_" />}
      {m.no === 50 && <SupplyChainPage />}
      {m.no === 58 && <ApprovalPage />}
      {m.no === 61 && <AnalyticsPage view="tables" />}
      {m.no === 63 && <ReportsPage />}
      {m.no === 64 && <AnalyticsPage view="charts" />}
      {m.no === 66 && <UsersPage />}
      {m.no === 67 && <RbacPage />}
      {m.no === 68 && <AuditPage />}
      {MODULE_FORMS[m.no] && !TABLES[m.no] && !CUSTOM.has(m.no) && <RecordsPage moduleNo={m.no} />}
      {TABLES[m.no] && <OrgTablePage table={TABLES[m.no]} />}
      <Link to="/" className="mt-4 inline-block text-sm text-accent">← Back to launcher</Link>
    </div>
  );
}
