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

------------------------------------
How to Run
------------------------------------
(Instructions will be added once the application has a runnable build)  

Deployment
------------------------------------
- Vercel builds a specific Git repo + branch. Ensure your project is linked to `HarshB231/447Project` (Project → Settings → Git). Push changes to `main` and Redeploy.
- Environment variables (Project → Settings → Environment Variables):
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- Optional server-only: `SUPABASE_SERVICE_ROLE_KEY` (never expose client-side)
- Supabase dynamic dependency warnings shown in build logs are non-blocking and expected from Supabase SDK bundling.
- Supabase Schema: see `supabase/schema.sql`. Run in Supabase SQL Editor to create tables: `employees`, `visas`, `notes`, `audit_log`, plus a view for current visa and RLS policies.

Testing Checklist
------------------------------------
- Employees API responds with data from Supabase.
- Flag updates persist and create `audit_log` entries.
- Import writes employees/visas/notes to Supabase.
- Export reads from Supabase and returns an Excel file.

------------------------------------
How does it work?
------------------------------------
- Project structure and tools will be finalized as development progresses  
- Initial commits will focus on setting up pages, components, and deployment pipeline  
- Future versions will connect to data sources and implement system features  

------------------------------------
Development Notes
------------------------------------
This section will track technical changes, design choices, and debugging notes as the project grows. 
The initial HTML, CSS, and JavaScript setup was created with the help of ChatGPT to quickly scaffold a working structure for our team to build on.

------------------------------------
Change Log
------------------------------------
- 9/20: Repository created and README initialized  
- 9/26: Initialized and committed the basic dashboard shell (static HTML, CSS, JS).
