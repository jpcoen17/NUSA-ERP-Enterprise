// OFFICIAL NUSA ERP ENTERPRISE module registry (75 modules, 15 groups x 5).
// Do NOT rename, add, or remove modules without owner approval.
// Status must stay honest: change it only when the work really reaches that state.
import { PROJECT_CONFIG } from "./project-config";
import { MODULE_FORMS } from "./moduleForms";

export type ModuleStatus = "PLANNED" | "IN DEVELOPMENT" | "FUNCTIONAL" | "TESTING" | "COMPLETE";
export const STATUSES: ModuleStatus[] = ["PLANNED", "IN DEVELOPMENT", "FUNCTIONAL", "TESTING", "COMPLETE"];

export interface ERPModule { no: number; group: string; groupName: string; name: string; status: ModuleStatus }

export const GROUPS: { code: string; name: string; modules: string[] }[] = [
  { code: "01", name: "Executive & Administration", modules: ["Executive Dashboard", "Company Management", "Multi-Branch Management", "Organization Structure", "Enterprise Settings"] },
  { code: "02", name: "Finance & Accounting", modules: ["General Ledger", "Accounts Payable", "Accounts Receivable", "Cash & Bank Management", "Financial Reporting"] },
  { code: "03", name: "Sales & CRM", modules: ["CRM Management", "Lead Management", "Sales Management", "Quotation Management", "Customer Relationship"] },
  { code: "04", name: "Procurement", modules: ["Vendor Management", "Purchase Requisition", "Purchase Order", "Supplier Evaluation", "Contract Procurement"] },
  { code: "05", name: "Inventory & Warehouse", modules: ["Inventory Control", "Warehouse Management", "Stock Transfer", "Stock Opname", "Barcode & QR Management"] },
  { code: "06", name: "Manufacturing", modules: ["Production Planning", "Bill of Materials", "Work Orders", "Production Monitoring", "Manufacturing Costing"] },
  { code: "07", name: "Human Resources", modules: ["Employee Management", "Recruitment", "Employee Attendance", "Payroll Management", "Leave & Appraisal"] },
  { code: "08", name: "Identity & Authentication", modules: ["Fingerprint Passkey Login", "Face Recognition Passkey Login", "Passkey Registration & Management", "Multi-Factor Authentication", "Identity & Authentication Logs"] },
  { code: "09", name: "Project Management", modules: ["Project Planning", "Task Management", "Timesheet", "Project Budget", "Project Evaluation"] },
  { code: "10", name: "Supply Chain", modules: ["Demand Planning", "Logistics Management", "Delivery Management", "Fleet Management", "Supply Chain Analytics"] },
  { code: "11", name: "Customer Service", modules: ["Helpdesk", "Customer Support", "Complaint Management", "SLA", "Customer Feedback"] },
  { code: "12", name: "Document & Workflow", modules: ["Document Management", "Digital Signature", "Approval Workflow", "Records Management", "Knowledge Management"] },
  { code: "13", name: "Business Intelligence", modules: ["Business Analytics", "KPI Monitoring", "Custom Reports", "Data Visualization", "AI Business Intelligence"] },
  { code: "14", name: "IT & Enterprise Security", modules: ["User Management", "RBAC", "Audit Trail", "Cybersecurity Monitoring", "Backup & Disaster Recovery"] },
  { code: "15", name: "Marketing & Business Development", modules: ["Marketing Campaign", "Email Marketing", "Social Media Management", "Loyalty Management", "Business Development"] },
];

// Only entries listed here differ from PLANNED. Modules 1, 2, 3, 8, 11, 13, 21 have real read-only data; nothing is FUNCTIONAL until verified against a live Supabase project.
// TESTING = built + database/RLS-tested, awaiting owner verification in the browser.
const GENERIC: Record<number, ModuleStatus> = Object.fromEntries(Object.keys(MODULE_FORMS).map((n) => [Number(n), "TESTING" as ModuleStatus]));
const STATUS_OVERRIDES: Record<number, ModuleStatus> = { ...GENERIC, 36: "IN DEVELOPMENT", 37: "IN DEVELOPMENT", 38: "IN DEVELOPMENT", 39: "IN DEVELOPMENT", 40: "TESTING", 50: "TESTING", 58: "TESTING", 61: "TESTING", 63: "IN DEVELOPMENT", 64: "TESTING", 66: "TESTING", 67: "TESTING", 68: "TESTING", 1: "IN DEVELOPMENT", 2: "IN DEVELOPMENT", 3: "IN DEVELOPMENT", 8: "IN DEVELOPMENT", 11: "IN DEVELOPMENT", 13: "IN DEVELOPMENT", 21: "IN DEVELOPMENT" };

export const MODULES: ERPModule[] = GROUPS.flatMap((g, gi) =>
  g.modules.map((name, i) => {
    const no = gi * PROJECT_CONFIG.modules_per_group + i + 1;
    return { no, group: g.code, groupName: g.name, name, status: STATUS_OVERRIDES[no] ?? "PLANNED" };
  })
);

if (GROUPS.length !== PROJECT_CONFIG.module_groups || MODULES.length !== PROJECT_CONFIG.total_modules) {
  throw new Error("Module registry does not match the official 75-module configuration.");
}
