# Docker Compose Quickstart

This repo has two services:
- `backend`: Flask API with a small SQLite DB and a Node.js parser.
- `frontend`: React/Vite client served in dev mode from the container.

## Run
```bash
docker compose up --build
```
- API: http://localhost:5000
- Frontend: http://localhost:5173

## Notes
- The backend now listens on `0.0.0.0` so the frontend container and your browser can reach it.
- Node.js is installed in the backend image to run the SIU parser invoked from Python.
- The SQLite file `front/back/scheduler.db` is bind-mounted for persistence; keep it in place before starting the stack.
