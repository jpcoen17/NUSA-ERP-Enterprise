# Backup & recovery (honest summary)
- Database backups are provided by Supabase (Dashboard -> Database -> Backups). Availability/retention depends on your plan: check it, do not assume.
- Schema is reproducible from `supabase/migrations/` (in Git). Demo data is reproducible from the seed files.
- Module 70 exports business tables to JSON for Super Admins. There is NO automated restore from that file yet.
- Never commit export files, `.env.local`, or any key to Git.
- Not done: restore drills, off-site automated backups, documented RTO/RPO. Do these before real production use.
