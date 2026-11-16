-- DEMO approval requests (requested_by is NULL = demo system, so any Super Admin can decide them). Re-runnable.
delete from public.approval_requests where is_demo;
insert into public.approval_requests (company_id, title, description, request_type, amount, requested_by, is_demo)
select c.id, v.title, v.descr, v.typ, v.amt, null, true from (values
 ('NUSA-TRD','Purchase 50 office laptops','Annual device refresh','purchase',650000000),
 ('NUSA-TRD','Marketing event sponsorship','Q1 trade expo','expense',45000000),
 ('NUSA-MFG','Emergency machine repair','Line 2 compressor','expense',120000000),
 ('NUSA-MFG','Bulk discount 12% for Demo Customer 4','Large order negotiation','discount',0),
 ('NUSA-LOG','Fleet: 3 new delivery vans','Expansion for Medan hub','purchase',900000000),
 ('NUSA-LOG','Annual leave (team of 5)','Dec holiday cover arranged','leave',0)) v(code,title,descr,typ,amt)
join public.companies c on c.code = v.code;
