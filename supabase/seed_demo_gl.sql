-- DEMO general-ledger backfill for the demo sales/invoices/expenses that were inserted before accounting existed. Re-runnable.
do $$
declare c record;
begin
  delete from public.journal_entries where is_demo;
  for c in select id from public.companies where is_demo loop
    perform public._post(c.id, current_date - 200, 'Demo opening capital', 'demo_opening', null, jsonb_build_array(
      jsonb_build_object('code','1100','debit',5000000000,'credit',0), jsonb_build_object('code','3000','debit',0,'credit',5000000000)), true);
  end loop;
  perform public._post(o.company_id, o.order_date, 'Demo sales ' || o.order_no, 'demo_sales', o.id, jsonb_build_array(
    jsonb_build_object('code','1200','debit',o.total,'credit',0), jsonb_build_object('code','4000','debit',0,'credit',o.total)), true)
  from public.sales_orders o where o.is_demo and o.status in ('confirmed','delivered');
  perform public._post(i.company_id, i.issue_date, 'Demo payment ' || i.invoice_no, 'demo_payment', i.id, jsonb_build_array(
    jsonb_build_object('code','1100','debit',i.paid_amount,'credit',0), jsonb_build_object('code','1200','debit',0,'credit',i.paid_amount)), true)
  from public.invoices i where i.is_demo and i.paid_amount > 0;
  perform public._post(e.company_id, e.expense_date, 'Demo expense: ' || e.category, 'demo_expense', e.id, jsonb_build_array(
    jsonb_build_object('code','6000','debit',e.amount,'credit',0), jsonb_build_object('code','1100','debit',0,'credit',e.amount)), true)
  from public.expenses e where e.is_demo;
end $$;
