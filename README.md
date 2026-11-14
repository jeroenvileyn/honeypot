# Howest Blackjack — Secure Web App

A secure blackjack web app for the Honeypot project assignment.

- **Backend:** Python 3.11+ / Flask / SQLite
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Security:** parameterized queries (no SQLi), React auto-escaping (no XSS), CSRF-safe (SameSite cookies + same-origin), file-type/size validation on avatar upload, admin role check server-side, rate limiting on login.

## Project layout

```
blackjack/
├── backend/         # Flask API + SQLite
│   ├── app.py
│   ├── requirements.txt
│   ├── schema.sql
│   └── uploads/avatars/   (created at runtime)
└── frontend/        # React app (Vite)
    ├── package.json
    └── src/
```

## Quick start (development)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py                     # serves http://localhost:5000
```

First run creates `blackjack.db` from `schema.sql` and a default admin:

- **username:** `admin`
- **password:** See shared password

### 2. Frontend

```bash
cd frontend
npm run build
sudo cp -r dist/* /usr/share/nginx/gambling/
```

Vite proxies `/api/*` to the Flask backend, so cookies and CORS just work.

## Production deployment on the Debian VM
1. Run Flask behind gunicorn:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 127.0.0.1:5000 app:app
   ```
2. Set a real secret in `backend/app.py` via env var:
   ```bash
   export FLASK_SECRET_KEY="$(python -c 'import secrets;print(secrets.token_hex(32))')"
   ```
