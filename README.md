# Visa Management System (VMS) – Project
Maaz Ashfaq, Harsh Bhavsar, Gabriel Pagudar
CMSC 447 - Team 9
Fall 2025

------------------------------------
Overview of the Project
------------------------------------
- Starter web repository for the Visa Management System project  
- Intended to serve as a base for building out requirements, epics, and user stories  
- Will eventually include a web interface, database integration, and role-based access  
- Currently functions as a placeholder shell so the team can begin organizing code and workflow  

Credits
------------------------------------
- Initial website skeleton implemented by Harsh: basic app routes, dashboard/employees pages, Tailwind setup, and initial API scaffolding.

Tech Stack
------------------------------------
- Next.js (App Router), TypeScript, Tailwind CSS + PostCSS
- Local JSON data under `data/` for prototyping (audit log, employees)
- API routes under `app/api/*` for import/export/report/stats/notes
- Helpers in `lib/` (e.g., `supabaseClient.ts`, `excelSchema.ts`, `data.ts`)

------------------------------------
How to Run
------------------------------------
(Instructions will be added once the application has a runnable build)  

Local Development
------------------------------------
- Install dependencies:
  
	```powershell
	npm install
	```
- Run dev server:
  
	```powershell
	npm run dev
	```
- Open `http://localhost:3000`

Deployment (Vercel)
------------------------------------
- Connect this GitHub repo to a Vercel project
- Build command: `npm run build` (Next.js default)
- Environment variables: see Supabase section below
- Optional `vercel.json` for runtime and image domains
- Preview deployments on pull requests to validate import/export and API flows

Suggested `vercel.json` skeleton:

```json
{
	"version": 2,
	"buildCommand": "npm run build",
	"outputDirectory": ".next",
	"env": {
		"NEXT_PUBLIC_SUPABASE_URL": "",
		"NEXT_PUBLIC_SUPABASE_ANON_KEY": "",
		"SUPABASE_SERVICE_ROLE": "",
		"NODE_ENV": "production"
	}
}
```

------------------------------------
How does it work?
------------------------------------
- Project structure and tools will be finalized as development progresses  
- Initial commits will focus on setting up pages, components, and deployment pipeline  
- Future versions will connect to data sources and implement system features  

Supabase Support
------------------------------------
- `lib/supabaseClient.ts` initializes a Supabase client for server/client components
- Environment variables:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- (optional server-side) `SUPABASE_SERVICE_ROLE`
- Roadmap:
	- Replace local JSON with Supabase tables for `employees` and `audit_log`
	- Server actions/api routes for insert/update/delete
	- RLS policies to secure write operations; keep anon reads for basic views
	- Storage for file uploads (spreadsheet import)
	- Auditing via triggers or app-layer inserts into `audit_log`

------------------------------------
Development Notes
------------------------------------
This section will track technical changes, design choices, and debugging notes as the project grows. 
The initial HTML, CSS, and JavaScript setup was created with the help of ChatGPT to quickly scaffold a working structure for our team to build on.

Hosting Plan Summary
------------------------------------
- Development: local Next.js with mock JSON
- Staging (Vercel Preview): connects to Supabase staging; validates API routes and import/export
- Production (Vercel): connects to Supabase production; enforces RLS and uses service role only in server-side routes

------------------------------------
Change Log
------------------------------------
- 9/20: Repository created and README initialized  
- 9/26: Initialized and committed the basic dashboard shell (static HTML, CSS, JS).
 - 10/05: Added Next.js app router scaffolding and Tailwind configuration.  
 - 10/12: Introduced local JSON data (`data/employees.json`, `data/audit-log.json`) for prototyping.  
 - 10/19: Implemented initial API routes under `app/api/*` for import/export and employees.  
 - 10/26: Built employees list and detail pages; wired UI to local API endpoints.  
 - 11/02: Added import/export view and basic audit log page; improved styles in `app/styles.css`.  
 - 11/09: Created `scripts/import-excel.ts` and `scripts/import-excel-json.ts` for spreadsheet ingestion.  
 - 11/16: Added `lib/excelSchema.ts` and `lib/data.ts`; normalized schema handling for imports.  
 - 11/23: Added Supabase client helper (`lib/supabaseClient.ts`); outlined env vars in README.  
 - 11/30: Expanded README with Vercel deployment plan, preview environments, and hosting summary.  
 - 12/03: Added Prisma stub (`lib/prisma.ts`) and `prisma/schema.prisma` placeholder for future DB migration.  
 - 12/07: Implemented report assist page and initial stats endpoint; UI polish in dashboard.  
 - 12/09: Added parallel sorting directory with MPI and OpenMP implementations and benchmark tooling.  
 - 12/10: Credited initial skeleton to Harsh; refined README sections for tech stack, Supabase roadmap, and deployment details.  
