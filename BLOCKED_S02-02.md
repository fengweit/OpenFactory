# BLOCKED: S02-02 — Fix analytics `_table_exists` bug

## Task
Fix `dashboard/app.py` `api_stats()` which calls `_table_exists()` (undefined) → crashes `/api/stats` on Alpha Hunter dashboard.

## Why blocked
- `dashboard/app.py` does not exist in this repository.
- No Python files exist anywhere in the repo.
- No `_table_exists` function or `/api/stats` endpoint is defined in any file.
- The Alpha Hunter dashboard appears to live in a separate repository or has not been added to this codebase yet.

## Resolution
Once the Alpha Hunter dashboard code (`dashboard/app.py`) is added to this repo or its location is clarified, the fix is straightforward: define `_table_exists(table_name)` (likely a SQLite/Postgres check) or replace the call with the appropriate table existence check.
