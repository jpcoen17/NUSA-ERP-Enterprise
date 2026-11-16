import { Link, useParams } from "react-router-dom";
import { MODULES } from "@/lib/modules";
import RecordsPage from "@/pages/RecordsPage";
import { MODULE_FORMS } from "@/lib/moduleForms";
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

const TABLES: Record<number, string> = { 2: "companies", 3: "branches", 8: "invoices", 11: "customers", 13: "sales_orders", 21: "products" };

export default function ModulePage() {
  const { no } = useParams();
  const m = MODULES.find((x) => x.no === Number(no));
  if (!m) return <p>Module not found. <Link className="text-accent" to="/">Back to launcher</Link></p>;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs text-slate-500">{m.group} {m.groupName} · Module #{m.no}</p>
      <h1 className="mb-3 text-2xl font-semibold">{m.name}</h1>
      <StatusBadge status={m.status} />
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {m.status === "PLANNED" ? "This module is planned and has no functionality yet." : m.status === "TESTING" && ([50, 58, 61, 64, 66, 67, 68].includes(m.no)) ? "Real feature backed by server-side database functions with RLS. Built and database-tested; awaiting owner verification in the browser." : m.status === "TESTING" ? "Basic record keeping (add / edit / delete) stored in Supabase with RLS and audit log. No business workflow or approvals yet." : "In development: real data from Supabase. Not all create/edit features are built yet."}
      </div>
      {m.no === 1 && <DashboardPage />}
      {m.no === 50 && <SupplyChainPage />}
      {m.no === 58 && <ApprovalPage />}
      {m.no === 61 && <AnalyticsPage view="tables" />}
      {m.no === 63 && <ReportsPage />}
      {m.no === 64 && <AnalyticsPage view="charts" />}
      {m.no === 66 && <UsersPage />}
      {m.no === 67 && <RbacPage />}
      {m.no === 68 && <AuditPage />}
      {MODULE_FORMS[m.no] && <RecordsPage moduleNo={m.no} />}
      {TABLES[m.no] && <OrgTablePage table={TABLES[m.no]} />}
      <Link to="/" className="mt-4 inline-block text-sm text-accent">← Back to launcher</Link>
    </div>
  );
}
