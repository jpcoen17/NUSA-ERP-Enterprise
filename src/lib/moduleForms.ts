// Generated field layouts for generic-record modules (module number -> fields).
export interface RecField { key: string; label: string; type: "text" | "number" | "date" | "select"; required: boolean; options?: string[] }
export const MODULE_FORMS: Record<number, RecField[]> = {
 "4": [
  {
   "key": "unit_name",
   "label": "Unit name",
   "type": "text",
   "required": true
  },
  {
   "key": "head",
   "label": "Head",
   "type": "text",
   "required": false
  },
  {
   "key": "level",
   "label": "Level",
   "type": "select",
   "required": false,
   "options": [
    "Division",
    "Department",
    "Team"
   ]
  }
 ],
 "5": [
  {
   "key": "setting_key",
   "label": "Setting key",
   "type": "text",
   "required": true
  },
  {
   "key": "value",
   "label": "Value",
   "type": "text",
   "required": true
  },
  {
   "key": "description",
   "label": "Description",
   "type": "text",
   "required": false
  }
 ],
 "6": [
  {
   "key": "account_code",
   "label": "Account code",
   "type": "text",
   "required": true
  },
  {
   "key": "account_name",
   "label": "Account name",
   "type": "text",
   "required": true
  },
  {
   "key": "type",
   "label": "Type",
   "type": "select",
   "required": false,
   "options": [
    "Asset",
    "Liability",
    "Equity",
    "Revenue",
    "Expense"
   ]
  },
  {
   "key": "balance",
   "label": "Balance",
   "type": "number",
   "required": false
  }
 ],
 "7": [
  {
   "key": "vendor",
   "label": "Vendor",
   "type": "text",
   "required": true
  },
  {
   "key": "bill_no",
   "label": "Bill no",
   "type": "text",
   "required": true
  },
  {
   "key": "due_date",
   "label": "Due date",
   "type": "date",
   "required": false
  },
  {
   "key": "amount",
   "label": "Amount",
   "type": "number",
   "required": true
  }
 ],
 "9": [
  {
   "key": "account_name",
   "label": "Account name",
   "type": "text",
   "required": true
  },
  {
   "key": "bank",
   "label": "Bank",
   "type": "text",
   "required": false
  },
  {
   "key": "balance",
   "label": "Balance",
   "type": "number",
   "required": false
  }
 ],
 "10": [
  {
   "key": "report_name",
   "label": "Report name",
   "type": "text",
   "required": true
  },
  {
   "key": "period",
   "label": "Period",
   "type": "text",
   "required": false
  },
  {
   "key": "notes",
   "label": "Notes",
   "type": "text",
   "required": false
  }
 ],
 "12": [
  {
   "key": "lead_name",
   "label": "Lead name",
   "type": "text",
   "required": true
  },
  {
   "key": "company",
   "label": "Company",
   "type": "text",
   "required": false
  },
  {
   "key": "email",
   "label": "Email",
   "type": "text",
   "required": false
  },
  {
   "key": "source",
   "label": "Source",
   "type": "select",
   "required": false,
   "options": [
    "Web",
    "Referral",
    "Event",
    "Cold call"
   ]
  },
  {
   "key": "value",
   "label": "Value",
   "type": "number",
   "required": false
  }
 ],
 "14": [
  {
   "key": "quote_no",
   "label": "Quote no",
   "type": "text",
   "required": true
  },
  {
   "key": "customer",
   "label": "Customer",
   "type": "text",
   "required": true
  },
  {
   "key": "valid_until",
   "label": "Valid until",
   "type": "date",
   "required": false
  },
  {
   "key": "amount",
   "label": "Amount",
   "type": "number",
   "required": false
  }
 ],
 "15": [
  {
   "key": "customer",
   "label": "Customer",
   "type": "text",
   "required": true
  },
  {
   "key": "interaction",
   "label": "Interaction",
   "type": "select",
   "required": false,
   "options": [
    "Call",
    "Email",
    "Meeting",
    "Visit"
   ]
  },
  {
   "key": "notes",
   "label": "Notes",
   "type": "text",
   "required": false
  },
  {
   "key": "date",
   "label": "Date",
   "type": "date",
   "required": false
  }
 ],
 "16": [
  {
   "key": "vendor_name",
   "label": "Vendor name",
   "type": "text",
   "required": true
  },
  {
   "key": "email",
   "label": "Email",
   "type": "text",
   "required": false
  },
  {
   "key": "city",
   "label": "City",
   "type": "text",
   "required": false
  },
  {
   "key": "category",
   "label": "Category",
   "type": "text",
   "required": false
  }
 ],
 "17": [
  {
   "key": "request_no",
   "label": "Request no",
   "type": "text",
   "required": true
  },
  {
   "key": "item",
   "label": "Item",
   "type": "text",
   "required": true
  },
  {
   "key": "quantity",
   "label": "Quantity",
   "type": "number",
   "required": false
  },
  {
   "key": "needed_by",
   "label": "Needed by",
   "type": "date",
   "required": false
  }
 ],
 "18": [
  {
   "key": "po_no",
   "label": "PO no",
   "type": "text",
   "required": true
  },
  {
   "key": "vendor",
   "label": "Vendor",
   "type": "text",
   "required": true
  },
  {
   "key": "order_date",
   "label": "Order date",
   "type": "date",
   "required": false
  },
  {
   "key": "amount",
   "label": "Amount",
   "type": "number",
   "required": true
  }
 ],
 "19": [
  {
   "key": "vendor",
   "label": "Vendor",
   "type": "text",
   "required": true
  },
  {
   "key": "quality_score",
   "label": "Quality score",
   "type": "number",
   "required": false
  },
  {
   "key": "delivery_score",
   "label": "Delivery score",
   "type": "number",
   "required": false
  },
  {
   "key": "notes",
   "label": "Notes",
   "type": "text",
   "required": false
  }
 ],
 "20": [
  {
   "key": "contract_no",
   "label": "Contract no",
   "type": "text",
   "required": true
  },
  {
   "key": "vendor",
   "label": "Vendor",
   "type": "text",
   "required": true
  },
  {
   "key": "start",
   "label": "Start",
   "type": "date",
   "required": false
  },
  {
   "key": "end",
   "label": "End",
   "type": "date",
   "required": false
  },
  {
   "key": "value",
   "label": "Value",
   "type": "number",
   "required": false
  }
 ],
 "22": [
  {
   "key": "warehouse_code",
   "label": "Warehouse code",
   "type": "text",
   "required": true
  },
  {
   "key": "name",
   "label": "Name",
   "type": "text",
   "required": true
  },
  {
   "key": "location",
   "label": "Location",
   "type": "text",
   "required": false
  },
  {
   "key": "capacity",
   "label": "Capacity",
   "type": "number",
   "required": false
  }
 ],
 "23": [
  {
   "key": "transfer_no",
   "label": "Transfer no",
   "type": "text",
   "required": true
  },
  {
   "key": "product",
   "label": "Product",
   "type": "text",
   "required": true
  },
  {
   "key": "quantity",
   "label": "Quantity",
   "type": "number",
   "required": false
  },
  {
   "key": "from",
   "label": "From",
   "type": "text",
   "required": false
  },
  {
   "key": "to",
   "label": "To",
   "type": "text",
   "required": false
  }
 ],
 "24": [
  {
   "key": "opname_no",
   "label": "Opname no",
   "type": "text",
   "required": true
  },
  {
   "key": "warehouse",
   "label": "Warehouse",
   "type": "text",
   "required": false
  },
  {
   "key": "date",
   "label": "Date",
   "type": "date",
   "required": false
  },
  {
   "key": "variance",
   "label": "Variance",
   "type": "number",
   "required": false
  }
 ],
 "25": [
  {
   "key": "item",
   "label": "Item",
   "type": "text",
   "required": true
  },
  {
   "key": "code",
   "label": "Code",
   "type": "text",
   "required": true
  },
  {
   "key": "format",
   "label": "Format",
   "type": "select",
   "required": false,
   "options": [
    "Barcode",
    "QR"
   ]
  }
 ],
 "26": [
  {
   "key": "plan_no",
   "label": "Plan no",
   "type": "text",
   "required": true
  },
  {
   "key": "product",
   "label": "Product",
   "type": "text",
   "required": true
  },
  {
   "key": "quantity",
   "label": "Quantity",
   "type": "number",
   "required": false
  },
  {
   "key": "start",
   "label": "Start",
   "type": "date",
   "required": false
  }
 ],
 "27": [
  {
   "key": "bom_code",
   "label": "BOM code",
   "type": "text",
   "required": true
  },
  {
   "key": "finished_product",
   "label": "Finished product",
   "type": "text",
   "required": true
  },
  {
   "key": "component",
   "label": "Component",
   "type": "text",
   "required": false
  },
  {
   "key": "qty_per_unit",
   "label": "Qty per unit",
   "type": "number",
   "required": false
  }
 ],
 "28": [
  {
   "key": "wo_no",
   "label": "WO no",
   "type": "text",
   "required": true
  },
  {
   "key": "product",
   "label": "Product",
   "type": "text",
   "required": true
  },
  {
   "key": "quantity",
   "label": "Quantity",
   "type": "number",
   "required": false
  },
  {
   "key": "due_date",
   "label": "Due date",
   "type": "date",
   "required": false
  }
 ],
 "29": [
  {
   "key": "wo_no",
   "label": "WO no",
   "type": "text",
   "required": true
  },
  {
   "key": "output",
   "label": "Output",
   "type": "number",
   "required": false
  },
  {
   "key": "defects",
   "label": "Defects",
   "type": "number",
   "required": false
  },
  {
   "key": "date",
   "label": "Date",
   "type": "date",
   "required": false
  }
 ],
 "30": [
  {
   "key": "product",
   "label": "Product",
   "type": "text",
   "required": true
  },
  {
   "key": "material_cost",
   "label": "Material cost",
   "type": "number",
   "required": false
  },
  {
   "key": "labor_cost",
   "label": "Labor cost",
   "type": "number",
   "required": false
  },
  {
   "key": "overhead",
   "label": "Overhead",
   "type": "number",
   "required": false
  }
 ],
 "31": [
  {
   "key": "employee_no",
   "label": "Employee no",
   "type": "text",
   "required": true
  },
  {
   "key": "full_name",
   "label": "Full name",
   "type": "text",
   "required": true
  },
  {
   "key": "position",
   "label": "Position",
   "type": "text",
   "required": false
  },
  {
   "key": "department",
   "label": "Department",
   "type": "text",
   "required": false
  },
  {
   "key": "join_date",
   "label": "Join date",
   "type": "date",
   "required": false
  }
 ],
 "32": [
  {
   "key": "candidate",
   "label": "Candidate",
   "type": "text",
   "required": true
  },
  {
   "key": "position",
   "label": "Position",
   "type": "text",
   "required": true
  },
  {
   "key": "stage",
   "label": "Stage",
   "type": "select",
   "required": false,
   "options": [
    "Applied",
    "Interview",
    "Offer",
    "Hired",
    "Rejected"
   ]
  },
  {
   "key": "email",
   "label": "Email",
   "type": "text",
   "required": false
  }
 ],
 "33": [
  {
   "key": "employee",
   "label": "Employee",
   "type": "text",
   "required": true
  },
  {
   "key": "date",
   "label": "Date",
   "type": "date",
   "required": true
  },
  {
   "key": "check_in",
   "label": "Check in",
   "type": "text",
   "required": false
  },
  {
   "key": "check_out",
   "label": "Check out",
   "type": "text",
   "required": false
  }
 ],
 "34": [
  {
   "key": "employee",
   "label": "Employee",
   "type": "text",
   "required": true
  },
  {
   "key": "period",
   "label": "Period",
   "type": "text",
   "required": true
  },
  {
   "key": "basic_salary",
   "label": "Basic salary",
   "type": "number",
   "required": false
  },
  {
   "key": "deductions",
   "label": "Deductions",
   "type": "number",
   "required": false
  }
 ],
 "35": [
  {
   "key": "employee",
   "label": "Employee",
   "type": "text",
   "required": true
  },
  {
   "key": "type",
   "label": "Type",
   "type": "select",
   "required": false,
   "options": [
    "Annual leave",
    "Sick leave",
    "Appraisal"
   ]
  },
  {
   "key": "start",
   "label": "Start",
   "type": "date",
   "required": false
  },
  {
   "key": "notes",
   "label": "Notes",
   "type": "text",
   "required": false
  }
 ],
 "41": [
  {
   "key": "project_name",
   "label": "Project name",
   "type": "text",
   "required": true
  },
  {
   "key": "manager",
   "label": "Manager",
   "type": "text",
   "required": false
  },
  {
   "key": "start",
   "label": "Start",
   "type": "date",
   "required": false
  },
  {
   "key": "end",
   "label": "End",
   "type": "date",
   "required": false
  }
 ],
 "42": [
  {
   "key": "task",
   "label": "Task",
   "type": "text",
   "required": true
  },
  {
   "key": "project",
   "label": "Project",
   "type": "text",
   "required": false
  },
  {
   "key": "assignee",
   "label": "Assignee",
   "type": "text",
   "required": false
  },
  {
   "key": "due_date",
   "label": "Due date",
   "type": "date",
   "required": false
  }
 ],
 "43": [
  {
   "key": "employee",
   "label": "Employee",
   "type": "text",
   "required": true
  },
  {
   "key": "project",
   "label": "Project",
   "type": "text",
   "required": false
  },
  {
   "key": "date",
   "label": "Date",
   "type": "date",
   "required": false
  },
  {
   "key": "hours",
   "label": "Hours",
   "type": "number",
   "required": false
  }
 ],
 "44": [
  {
   "key": "project",
   "label": "Project",
   "type": "text",
   "required": true
  },
  {
   "key": "budget",
   "label": "Budget",
   "type": "number",
   "required": true
  },
  {
   "key": "spent",
   "label": "Spent",
   "type": "number",
   "required": false
  }
 ],
 "45": [
  {
   "key": "project",
   "label": "Project",
   "type": "text",
   "required": true
  },
  {
   "key": "score",
   "label": "Score",
   "type": "number",
   "required": false
  },
  {
   "key": "notes",
   "label": "Notes",
   "type": "text",
   "required": false
  }
 ],
 "46": [
  {
   "key": "product",
   "label": "Product",
   "type": "text",
   "required": true
  },
  {
   "key": "period",
   "label": "Period",
   "type": "text",
   "required": false
  },
  {
   "key": "forecast_qty",
   "label": "Forecast qty",
   "type": "number",
   "required": false
  }
 ],
 "47": [
  {
   "key": "shipment_no",
   "label": "Shipment no",
   "type": "text",
   "required": true
  },
  {
   "key": "origin",
   "label": "Origin",
   "type": "text",
   "required": false
  },
  {
   "key": "destination",
   "label": "Destination",
   "type": "text",
   "required": false
  },
  {
   "key": "carrier",
   "label": "Carrier",
   "type": "text",
   "required": false
  }
 ],
 "48": [
  {
   "key": "delivery_no",
   "label": "Delivery no",
   "type": "text",
   "required": true
  },
  {
   "key": "order_no",
   "label": "Order no",
   "type": "text",
   "required": false
  },
  {
   "key": "driver",
   "label": "Driver",
   "type": "text",
   "required": false
  },
  {
   "key": "delivery_date",
   "label": "Delivery date",
   "type": "date",
   "required": false
  }
 ],
 "49": [
  {
   "key": "plate_no",
   "label": "Plate no",
   "type": "text",
   "required": true
  },
  {
   "key": "vehicle_type",
   "label": "Vehicle type",
   "type": "text",
   "required": false
  },
  {
   "key": "driver",
   "label": "Driver",
   "type": "text",
   "required": false
  },
  {
   "key": "last_service",
   "label": "Last service",
   "type": "date",
   "required": false
  }
 ],
 "51": [
  {
   "key": "ticket_no",
   "label": "Ticket no",
   "type": "text",
   "required": true
  },
  {
   "key": "subject",
   "label": "Subject",
   "type": "text",
   "required": true
  },
  {
   "key": "priority",
   "label": "Priority",
   "type": "select",
   "required": false,
   "options": [
    "Low",
    "Medium",
    "High"
   ]
  },
  {
   "key": "requester",
   "label": "Requester",
   "type": "text",
   "required": false
  }
 ],
 "52": [
  {
   "key": "customer",
   "label": "Customer",
   "type": "text",
   "required": true
  },
  {
   "key": "issue",
   "label": "Issue",
   "type": "text",
   "required": true
  },
  {
   "key": "channel",
   "label": "Channel",
   "type": "select",
   "required": false,
   "options": [
    "Phone",
    "Email",
    "Chat"
   ]
  },
  {
   "key": "resolution",
   "label": "Resolution",
   "type": "text",
   "required": false
  }
 ],
 "53": [
  {
   "key": "complaint_no",
   "label": "Complaint no",
   "type": "text",
   "required": true
  },
  {
   "key": "customer",
   "label": "Customer",
   "type": "text",
   "required": true
  },
  {
   "key": "category",
   "label": "Category",
   "type": "text",
   "required": false
  },
  {
   "key": "details",
   "label": "Details",
   "type": "text",
   "required": false
  }
 ],
 "54": [
  {
   "key": "sla_name",
   "label": "SLA name",
   "type": "text",
   "required": true
  },
  {
   "key": "response_hours",
   "label": "Response hours",
   "type": "number",
   "required": false
  },
  {
   "key": "resolution_hours",
   "label": "Resolution hours",
   "type": "number",
   "required": false
  }
 ],
 "55": [
  {
   "key": "customer",
   "label": "Customer",
   "type": "text",
   "required": true
  },
  {
   "key": "rating",
   "label": "Rating",
   "type": "number",
   "required": false
  },
  {
   "key": "comment",
   "label": "Comment",
   "type": "text",
   "required": false
  }
 ],
 "56": [
  {
   "key": "title",
   "label": "Title",
   "type": "text",
   "required": true
  },
  {
   "key": "category",
   "label": "Category",
   "type": "text",
   "required": false
  },
  {
   "key": "version",
   "label": "Version",
   "type": "text",
   "required": false
  },
  {
   "key": "owner",
   "label": "Owner",
   "type": "text",
   "required": false
  }
 ],
 "59": [
  {
   "key": "record_title",
   "label": "Record title",
   "type": "text",
   "required": true
  },
  {
   "key": "retention_years",
   "label": "Retention years",
   "type": "number",
   "required": false
  },
  {
   "key": "location",
   "label": "Location",
   "type": "text",
   "required": false
  }
 ],
 "60": [
  {
   "key": "article_title",
   "label": "Article title",
   "type": "text",
   "required": true
  },
  {
   "key": "category",
   "label": "Category",
   "type": "text",
   "required": false
  },
  {
   "key": "content",
   "label": "Content",
   "type": "text",
   "required": false
  }
 ],
 "62": [
  {
   "key": "kpi",
   "label": "KPI",
   "type": "text",
   "required": true
  },
  {
   "key": "target",
   "label": "Target",
   "type": "number",
   "required": false
  },
  {
   "key": "actual",
   "label": "Actual",
   "type": "number",
   "required": false
  },
  {
   "key": "period",
   "label": "Period",
   "type": "text",
   "required": false
  }
 ],
 "71": [
  {
   "key": "campaign",
   "label": "Campaign",
   "type": "text",
   "required": true
  },
  {
   "key": "channel",
   "label": "Channel",
   "type": "text",
   "required": false
  },
  {
   "key": "budget",
   "label": "Budget",
   "type": "number",
   "required": false
  },
  {
   "key": "start",
   "label": "Start",
   "type": "date",
   "required": false
  }
 ],
 "72": [
  {
   "key": "campaign",
   "label": "Campaign",
   "type": "text",
   "required": true
  },
  {
   "key": "subject",
   "label": "Subject",
   "type": "text",
   "required": true
  },
  {
   "key": "audience",
   "label": "Audience",
   "type": "text",
   "required": false
  },
  {
   "key": "send_date",
   "label": "Send date",
   "type": "date",
   "required": false
  }
 ],
 "73": [
  {
   "key": "platform",
   "label": "Platform",
   "type": "select",
   "required": false,
   "options": [
    "Instagram",
    "Facebook",
    "LinkedIn",
    "X"
   ]
  },
  {
   "key": "post_title",
   "label": "Post title",
   "type": "text",
   "required": true
  },
  {
   "key": "schedule",
   "label": "Schedule",
   "type": "date",
   "required": false
  }
 ],
 "74": [
  {
   "key": "member",
   "label": "Member",
   "type": "text",
   "required": true
  },
  {
   "key": "points",
   "label": "Points",
   "type": "number",
   "required": false
  },
  {
   "key": "tier",
   "label": "Tier",
   "type": "select",
   "required": false,
   "options": [
    "Bronze",
    "Silver",
    "Gold"
   ]
  }
 ],
 "75": [
  {
   "key": "opportunity",
   "label": "Opportunity",
   "type": "text",
   "required": true
  },
  {
   "key": "partner",
   "label": "Partner",
   "type": "text",
   "required": false
  },
  {
   "key": "value",
   "label": "Value",
   "type": "number",
   "required": false
  },
  {
   "key": "stage",
   "label": "Stage",
   "type": "select",
   "required": false,
   "options": [
    "Lead",
    "Proposal",
    "Negotiation",
    "Won"
   ]
  }
 ]
};
