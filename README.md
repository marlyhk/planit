# Planit

A calm, private personal planner for university, tutoring, students, groups, sessions, finances, payments and receipts.

## Cross-device version

This build supports **private cloud sync across MacBook, iPad and phone** using one account. It remains local-first for speed, but can synchronize the same Planit data through your own Supabase backend.

Read **`CLOUD-SYNC-SETUP.md`** for the one-time cloud setup.

## Included

- Responsive MacBook / iPad / phone interface
- Pastel design with compact low-stimulation controls
- `Hello Marly ✦` dashboard
- Motivational medicine / dentistry / study banner that changes when Planit opens
- University courses with course codes and custom pastel course color coding
- Classes, study blocks, assignments, exams and personal events
- Day, week, month and agenda calendar views
- Click a time slot to create events
- Desktop drag-to-reschedule and drag-to-resize calendar events
- Students with individual hourly or per-session rates
- Tutoring groups with separate rate and payment accounting for every student
- Scheduled → finished/unpaid → paid workflow
- Cancelled sessions remain in history at $0
- Editable planned and actual session durations
- Per-student paid / unpaid / outstanding balances
- Partial and multi-session payments
- Printable receipts
- Daily, weekly, monthly and yearly finance views
- Earned vs received vs outstanding calculations
- Search / command palette (`⌘K` / `Ctrl+K`)
- Quick add (`⌘N` / `Ctrl+N`)
- Private email/password cloud account
- Local fallback + automatic cross-device sync when configured
- JSON backup export/import

## Local preview

For a quick local preview:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Cloud authentication is meant to be used from the final deployed HTTPS URL.

## Cloud files

- `cloud-config.js` — your Supabase project URL, anon key, optional owner email
- `supabase-setup.sql` — creates the private cloud storage table + Row Level Security
- `CLOUD-SYNC-SETUP.md` — step-by-step setup

## Privacy model

Students and groups are records inside your private account; they are not users and never receive login access. Each authenticated Planit user can only read/write their own cloud row under the included Row Level Security policies.

Do not put a Supabase service-role key into this website. Only use the anon/public key.
