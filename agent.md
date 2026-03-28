# OSV SaaS Agent Guidelines & Best Practices

Welcome to the OSV SaaS codebase. When working with this repository as an AI agent (particularly Anthropic models like Claude), please adhere to the following guidelines:

## 1. Project Structure
The primary codebase is located in `osv-construct-os/`:
- **`osv-construct-os/backend/`**: Node.js backend. Uses SQLite (`osv-construct.db`). Contains `src/` with `routes/`, `services/`, `db/`.
- **`osv-construct-os/frontend/`**: Vite + React frontend. 

Other directories:
- **`twilio-retell-setup/`**: Standalone Node.js scripts used to diagnostic and establish Twilio & Retell integrations.

## 2. Environment Variables
- Keep `.env` files organized.
- Primary backend env is at `osv-construct-os/backend/.env`.
- Avoid duplicating connection strings or keys. When creating setup scripts, reuse keys or rely on the primary `.env` when possible, or document clearly if a separate `.env` is required for local standalone scripts.

## 3. Recommended Code Changes & Workflows
- **Understand the stack:** Backend is Express/Node, Frontend is React+Vite. 
- **Tool usage:** Prioritize specific file-editing, reading, and searching tools. Do not use generic terminal commands like `sed` or `cat` when native tools are available.
- **Run servers locally:** Run frontend via `npm run dev` in `osv-construct-os/frontend/`. Run backend via `npm run start` or `node src/index.js` in `osv-construct-os/backend/`.
- **API integrations:** The project integrates heavily with Twilio, Retell AI, Trello, Resend, and Vision AI. Check existing service files in `backend/src/services/` before implementing new API calls to avoid duplication.
- **Documentation:** Rely on the provided `.docx` and `.pdf` files in the root for business logic, prompting, and system architecture details. Do not delete them.

## 4. Keeping it Clean
- Do not leave one-off test scripts in the root directory. Place them in `osv-construct-os/backend/scripts/` or a dedicated `tests/` or `setup/` folder.
- Delete or archive empty directories.
