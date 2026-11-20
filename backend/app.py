import io
import json
import os
import random
import re
import secrets
import sqlite3
import time
from dotenv import load_dotenv
import uuid
from collections import defaultdict, deque
from functools import wraps
from pathlib import Path

from flask import (Flask, abort, g, jsonify, request, send_from_directory,
                   session)
from PIL import Image
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "blackjack.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"
UPLOAD_DIR = BASE_DIR / "uploads" / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG", "WEBP"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,24}$")
DISPLAY_RE = re.compile(r"^[A-Za-z0-9 _.\-]{1,32}$")
load_dotenv(BASE_DIR / ".env")
app = Flask(__name__)
SEC_KEY = os.environ.get("FLASK_SECRET_KEY")
if not SEC_KEY:
    raise RuntimeError("FLASK_SECRET_KEY environment variable is not set")
app.config.update(
    SECRET_KEY=SEC_KEY,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "1") == "1",
    MAX_CONTENT_LENGTH=3 * 1024 * 1024,
    PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 7,
)

# ---------- CSRF protection ----------

ALLOWED_ORIGINS = {
    "https://group18.hp.edu.technet.howest.be",
    "http://localhost:5173",
    "http://localhost:5000",
}

def csrf_protect(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        origin = request.headers.get("Origin") or request.headers.get("Referer", "")
        if not any(origin.startswith(o) for o in ALLOWED_ORIGINS):
            return jsonify({"error": "forbidden"}), 403
        return fn(*args, **kwargs)
    return wrapper

# ---------- DB helpers ----------

def get_db() -> sqlite3.Connection:
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db

@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db is not None:
        db.close()

UUID_RE = re.compile(r"^[a-f0-9]{32}$")

def valid_uid(uid: str) -> bool:
    return bool(UUID_RE.match(uid or ""))

def init_db():
    first_run = not DB_PATH.exists()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    if first_run or conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"] == 0:
        conn.execute("INSERT INTO users (id, username, password_hash, display_name, is_admin) VALUES (?,?,?,?,1)", (uuid.uuid4().hex, "admin", generate_password_hash("ChangeMe123!"), "Administrator"),)
        conn.commit()
    conn.close()

# ---------- Auth helpers ----------

_login_attempts: dict[tuple[str, str], deque] = defaultdict(deque)
LOGIN_WINDOW = 300   # seconds
LOGIN_LIMIT = 5

def rate_limited(key: tuple[str, str]) -> bool:
    now = time.time()
    dq = _login_attempts[key]
    while dq and now - dq[0] > LOGIN_WINDOW:
        dq.popleft()
    if len(dq) >= LOGIN_LIMIT:
        return True
    dq.append(now)
    return False

def current_user():
    uid = session.get("uid")
    if not uid:
        return None
    row = get_db().execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if row and row["is_enabled"]:
        return row
    session.clear()
    return None

def login_required(fn):
    @wraps(fn)
    def w(*a, **kw):
        if not current_user():
            return jsonify({"error": "auth required"}), 401
        return fn(*a, **kw)
    return w

def admin_required(fn):
    @wraps(fn)
    def w(*a, **kw):
        u = current_user()
        if not u or not u["is_admin"]:
            return jsonify({"error": "forbidden"}), 403
        return fn(*a, **kw)
    return w

def user_dto(u: sqlite3.Row, private=False) -> dict:
    dto = {
        "username": u["username"],
        "displayName": u["display_name"],
        "avatar": f"/uploads/avatars/{u['avatar']}" if u["avatar"] else None,
        "chips": u["chips"],
        "isAdmin": bool(u["is_admin"]),
        "isEnabled": bool(u["is_enabled"]),
        "createdAt": u["created_at"],
    }
    if private:
        dto["id"] = u["id"]
    return dto

# ---------- Auth routes ----------

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    display = (data.get("displayName") or username).strip()

    if not USERNAME_RE.match(username):
        return jsonify({"error": "username must be 3-24 chars (letters, digits, _)"}), 400

    if len(password) < 8 or len(password) > 128:
        return jsonify({"error": "password must be 8-128 chars"}), 400

    if not DISPLAY_RE.match(display):
        return jsonify({"error": "display name invalid"}), 400

    db = get_db()

    if db.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
        return jsonify({"error": "username taken"}), 409

    new_id = uuid.uuid4().hex

    db.execute(
        "INSERT INTO users (id, username, password_hash, display_name) VALUES (?,?,?,?)",
        (new_id, username, generate_password_hash(password), display),
    )

    db.commit()

    row = db.execute("SELECT * FROM users WHERE id = ?", (new_id,)).fetchone()

    session.clear()
    session["uid"] = row["id"]

    return jsonify({"user": user_dto(row)})

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
    if rate_limited((ip, username.lower())):
        return jsonify({"error": "too many attempts, try again later"}), 429
    if not username or not password:
        return jsonify({"error": "missing credentials"}), 400
    row = get_db().execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "invalid credentials"}), 401
    if not row["is_enabled"]:
        return jsonify({"error": "account disabled"}), 403
    session.clear()
    session["uid"] = row["id"]
    session.permanent = True
    return jsonify({"user": user_dto(row)})

@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})

@app.get("/api/auth/me")
def me():
    u = current_user()
    return jsonify({"user": user_dto(u) if u else None})

# ---------- Profile ----------

@app.put("/api/profile")
@login_required
@csrf_protect
def update_profile():
    data = request.get_json(silent=True) or {}
    display = (data.get("displayName") or "").strip()
    if not DISPLAY_RE.match(display):
        return jsonify({"error": "display name invalid"}), 400
    db = get_db()
    u = current_user()
    db.execute("UPDATE users SET display_name = ? WHERE id = ?", (display, u["id"]))
    db.commit()
    return jsonify({"user": user_dto(db.execute("SELECT * FROM users WHERE id = ?", (u["id"],)).fetchone())})

@app.post("/api/profile/avatar")
@login_required
@csrf_protect
def upload_avatar():
    f = request.files.get("avatar")
    if not f:
        return jsonify({"error": "no file"}), 400
    blob = f.read(MAX_AVATAR_BYTES + 1)
    if len(blob) > MAX_AVATAR_BYTES:
        return jsonify({"error": "file too large (max 2 MB)"}), 413
    try:
        img = Image.open(io.BytesIO(blob))
        img.verify()  # magic-byte check
        img = Image.open(io.BytesIO(blob))  # re-open after verify
        if img.format not in ALLOWED_IMAGE_FORMATS:
            raise ValueError("bad format")
        img = img.convert("RGB")
        img.thumbnail((512, 512))
    except Exception:
        return jsonify({"error": "invalid image"}), 400
    fname = f"{uuid.uuid4().hex}.jpg"
    img.save(UPLOAD_DIR / fname, "JPEG", quality=88)
    db = get_db()
    u = current_user()
    old = u["avatar"]
    db.execute("UPDATE users SET avatar = ? WHERE id = ?", (fname, u["id"]))
    db.commit()
    if old:
        try: (UPLOAD_DIR / old).unlink(missing_ok=True)
        except Exception: pass
    return jsonify({"user": user_dto(db.execute("SELECT * FROM users WHERE id = ?", (u["id"],)).fetchone())})

@app.get("/uploads/avatars/<path:fname>")
def serve_avatar(fname):
    # send_from_directory blocks path traversal automatically
    return send_from_directory(UPLOAD_DIR, fname)

# ---------- Blackjack (server-authoritative) ----------

SUITS = ["♠", "♥", "♦", "♣"]
RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"]

def fresh_shoe(decks=4):
    cards = [{"r": r, "s": s} for _ in range(decks) for s in SUITS for r in RANKS]
    random.SystemRandom().shuffle(cards)
    return cards

def hand_value(cards):
    total, aces = 0, 0
    for c in cards:
        if c["r"] == "A":
            total += 11; aces += 1
        elif c["r"] in ("J","Q","K"):
            total += 10
        else:
            total += int(c["r"])
    while total > 21 and aces:
        total -= 10; aces -= 1
    return total

def is_blackjack(cards):
    return len(cards) == 2 and hand_value(cards) == 21

def load_state(row) -> dict:
    return json.loads(row["state"])

def save_state(db, gid, state, finished=False):
    db.execute("UPDATE games SET state = ?, finished = ? WHERE id = ?",
               (json.dumps(state), 1 if finished else 0, gid))
    db.commit()

def public_state(state, finished):
    """Hide dealer hole card and shoe from the client."""
    out = {
        "dealer": list(state["dealer"]),
        "hands": [
            {"cards": list(h["cards"]), "bet": h["bet"], "done": h["done"],
             "doubled": h["doubled"], "result": h["result"]}
            for h in state["hands"]
        ],
        "active": state["active"],
        "payout": state.get("payout"),
    }
    if not finished and out["dealer"]:
        out["dealer"] = [out["dealer"][0], {"r": "?", "s": "?"}] + out["dealer"][2:]
        out["dealerValue"] = hand_value([state["dealer"][0]])
    else:
        out["dealerValue"] = hand_value(state["dealer"])
    for h in out["hands"]:
        h["value"] = hand_value(h["cards"])
    return out

def settle(state, db, user_id):
    """Compute payouts at end of round and credit chips."""
    dealer_val = hand_value(state["dealer"])
    dealer_bj = is_blackjack(state["dealer"])
    payout = 0
    for h in state["hands"]:
        v = hand_value(h["cards"])
        bet = h["bet"]
        if v > 21:
            h["result"] = "bust"; continue
        if is_blackjack(h["cards"]) and len(state["hands"]) == 1:
            if dealer_bj:
                h["result"] = "push"; payout += bet
            else:
                h["result"] = "blackjack"; payout += bet + int(bet * 1.5)
            continue
        if dealer_val > 21 or v > dealer_val:
            h["result"] = "win"; payout += bet * 2
        elif v == dealer_val:
            h["result"] = "push"; payout += bet
        else:
            h["result"] = "lose"
    if payout:
        db.execute("UPDATE users SET chips = chips + ? WHERE id = ?", (payout, user_id))
    state["payout"] = payout

def get_active_game(db, user_id):
    return db.execute(
        "SELECT * FROM games WHERE user_id = ? AND finished = 0 ORDER BY id DESC LIMIT 1",
        (user_id,)).fetchone()

@app.get("/api/game/state")
@login_required
def game_state():
    u = current_user()
    db = get_db()
    g_row = get_active_game(db, u["id"])
    if not g_row:
        return jsonify({"game": None, "chips": u["chips"]})
    state = load_state(g_row)
    return jsonify({"game": public_state(state, False), "chips": u["chips"]})

@app.post("/api/game/deal")
@login_required
@csrf_protect
def deal():
    data = request.get_json(silent=True) or {}
    bet = data.get("bet")
    if not isinstance(bet, int) or bet < 5 or bet > 1000:
        return jsonify({"error": "bet must be int 5..1000"}), 400
    db = get_db()
    u = current_user()
    if get_active_game(db, u["id"]):
        return jsonify({"error": "round already in progress"}), 400
    result = db.execute("UPDATE users SET chips = chips - ? WHERE id = ? AND chips >= ?", (bet, u["id"], bet))
    if result.rowcount == 0:
        return jsonify({"error": "not enough chips"}), 400
    shoe = fresh_shoe()
    player = [shoe.pop(), shoe.pop()]
    dealer = [shoe.pop(), shoe.pop()]
    state = {
        "shoe": shoe,
        "dealer": dealer,
        "hands": [{"cards": player, "bet": bet, "done": False, "doubled": False, "result": None}],
        "active": 0,
    }
    finished = False
    # Natural blackjack auto-resolve
    if is_blackjack(player) or is_blackjack(dealer):
        for h in state["hands"]:
            h["done"] = True
        settle(state, db, u["id"])
        finished = True
    cur = db.execute("INSERT INTO games (user_id, state, bet, finished) VALUES (?,?,?,?)",
                     (u["id"], json.dumps(state), bet, 1 if finished else 0))
    db.commit()
    chips = db.execute("SELECT chips FROM users WHERE id = ?", (u["id"],)).fetchone()["chips"]
    return jsonify({"game": public_state(state, finished), "chips": chips, "finished": finished})

def _act(action: str):
    db = get_db()
    u = current_user()
    g_row = get_active_game(db, u["id"])
    if not g_row:
        return jsonify({"error": "no active round"}), 400
    state = load_state(g_row)
    hand = state["hands"][state["active"]]
    if hand["done"]:
        return jsonify({"error": "hand already done"}), 400

    if action == "hit":
        hand["cards"].append(state["shoe"].pop())
        if hand_value(hand["cards"]) >= 21:
            hand["done"] = True
    elif action == "stand":
        hand["done"] = True
    elif action == "double":
        if len(hand["cards"]) != 2:
            return jsonify({"error": "double only on first two cards"}), 400
        chips = db.execute("SELECT chips FROM users WHERE id = ?", (u["id"],)).fetchone()["chips"]
        if chips < hand["bet"]:
            return jsonify({"error": "not enough chips to double"}), 400
        db.execute("UPDATE users SET chips = chips - ? WHERE id = ?", (hand["bet"], u["id"]))
        hand["bet"] *= 2
        hand["doubled"] = True
        hand["cards"].append(state["shoe"].pop())
        hand["done"] = True
    elif action == "split":
        if len(state["hands"]) != 1 or len(hand["cards"]) != 2:
            return jsonify({"error": "cannot split"}), 400
        c1, c2 = hand["cards"]
        rank_val = lambda r: 10 if r in ("10","J","Q","K") else r
        if rank_val(c1["r"]) != rank_val(c2["r"]):
            return jsonify({"error": "split requires equal-rank cards"}), 400
        chips = db.execute("SELECT chips FROM users WHERE id = ?", (u["id"],)).fetchone()["chips"]
        if chips < hand["bet"]:
            return jsonify({"error": "not enough chips to split"}), 400
        db.execute("UPDATE users SET chips = chips - ? WHERE id = ?", (hand["bet"], u["id"]))
        state["hands"] = [
            {"cards": [c1, state["shoe"].pop()], "bet": hand["bet"], "done": False, "doubled": False, "result": None},
            {"cards": [c2, state["shoe"].pop()], "bet": hand["bet"], "done": False, "doubled": False, "result": None},
        ]
    else:
        return jsonify({"error": "unknown action"}), 400

    # Advance active hand
    while state["active"] < len(state["hands"]) and state["hands"][state["active"]]["done"]:
        state["active"] += 1

    finished = False
    if state["active"] >= len(state["hands"]):
        # Dealer plays unless every hand busted
        all_bust = all(hand_value(h["cards"]) > 21 for h in state["hands"])
        if not all_bust:
            while hand_value(state["dealer"]) < 17:
                state["dealer"].append(state["shoe"].pop())
        settle(state, db, u["id"])
        finished = True

    save_state(db, g_row["id"], state, finished)
    chips = db.execute("SELECT chips FROM users WHERE id = ?", (u["id"],)).fetchone()["chips"]
    # Bailout: if user reached 0 chips with no active round, top up to 500
    if finished and chips == 0:
        db.execute("UPDATE users SET chips = 500 WHERE id = ?", (u["id"],))
        db.commit()
        chips = 500
    return jsonify({"game": public_state(state, finished), "chips": chips, "finished": finished})

@app.post("/api/game/hit")
@login_required
@csrf_protect
def hit(): return _act("hit")

@app.post("/api/game/stand")
@login_required
@csrf_protect
def stand(): return _act("stand")

@app.post("/api/game/double")
@login_required
@csrf_protect
def double(): return _act("double")

@app.post("/api/game/split")
@login_required
@csrf_protect
def split(): return _act("split")

# ---------- Leaderboard ----------

@app.get("/api/leaderboard")
@login_required
def leaderboard():
    rows = get_db().execute(
        "SELECT id, username, display_name, avatar, chips "
        "FROM users WHERE is_enabled = 1 "
        "ORDER BY chips DESC, id ASC LIMIT 50"
    ).fetchall()
    return jsonify({"leaderboard": [
        {
            "username": r["username"],
            "displayName": r["display_name"],
            "avatar": f"/uploads/avatars/{r['avatar']}" if r["avatar"] else None,
            "chips": r["chips"],
        } for r in rows
    ]})

# ---------- Admin ----------

@app.get("/api/admin/users")
@admin_required
def admin_list():
    rows = get_db().execute("SELECT * FROM users ORDER BY id").fetchall()
    return jsonify({"users": [user_dto(r, private=True) for r in rows]})

@app.post("/api/admin/users/<string:uid>/toggle")
@admin_required
@csrf_protect
def admin_toggle(uid):
    if not valid_uid(uid):
        return jsonify({"error": "bad id"}), 400
    me_row = current_user()
    if uid == me_row["id"]:
        return jsonify({"error": "cannot disable yourself"}), 400
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    db.execute("UPDATE users SET is_enabled = ? WHERE id = ?", (0 if row["is_enabled"] else 1, uid))
    db.commit()
    return jsonify({"user": user_dto(db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone())})

@app.post("/api/admin/users/<string:uid>/chips")
@admin_required
@csrf_protect
def admin_give_chips(uid):
    if not valid_uid(uid):
        return jsonify({"error": "bad id"}), 400
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")
    if not isinstance(amount, int) or amount == 0 or amount < -1_000_000 or amount > 1_000_000:
        return jsonify({"error": "amount must be non-zero int (-1000000..1000000)"}), 400
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    new_chips = max(0, row["chips"] + amount)
    db.execute("UPDATE users SET chips = ? WHERE id = ?", (new_chips, uid))
    db.commit()
    return jsonify({"user": user_dto(db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone())})

@app.route("/api/admin/users/<string:uid>", methods=["DELETE"])
@admin_required
@csrf_protect
def admin_delete_user(uid):
    if not valid_uid(uid):
        return jsonify({"error": "bad id"}), 400
    row = get_db().execute("SELECT username, is_admin FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    if row["is_admin"]:
        return jsonify({"error": "cannot delete admin account"}), 403
    if uid == session.get("uid"):
        return jsonify({"error": "cannot delete yourself"}), 403

    conn = get_db()
    conn.execute("DELETE FROM games WHERE user_id=?", (uid,))
    conn.execute("DELETE FROM users WHERE id=?", (uid,))
    conn.commit()
    return jsonify({"ok": True})

# ---------- Honeypot ----------

import logging

LOG_DIR = Path("/var/log/honeypot")
LOG_DIR.mkdir(parents=True, exist_ok=True)

HONEYPOT_LOG = LOG_DIR / "honeypot.log"

honeypot_logger = logging.getLogger("honeypot")
honeypot_logger.setLevel(logging.INFO)

if not honeypot_logger.handlers:
    handler = logging.FileHandler(HONEYPOT_LOG, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
    honeypot_logger.addHandler(handler)

def log_honeypot(event, details=""):
    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    ua = request.headers.get("User-Agent", "unknown")
    query = request.query_string.decode(errors="ignore")

    honeypot_logger.info(
        f"EVENT={event} | IP={ip} | PATH={request.path} | "
        f"QUERY={query} | DETAILS={details} | UA={ua}"
    )


def fake_login_page(error=False):
    error_html = """
    <div class="error">Invalid username or password</div>
    """ if error else ""

    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Howest Blackjack Admin</title>
    <style>
        body {{
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background:
                radial-gradient(circle at top, #166534 0%, #052e16 35%, #020617 100%);
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
        }}

        .card {{
            width: 390px;
            background: linear-gradient(180deg, #111827, #020617);
            border: 1px solid #22c55e;
            border-radius: 22px;
            padding: 34px;
            box-shadow: 0 30px 90px rgba(0,0,0,0.7);
        }}

        .logo {{
            text-align: center;
            font-size: 34px;
            font-weight: bold;
            margin-bottom: 6px;
            color: #facc15;
        }}

        .subtitle {{
            text-align: center;
            color: #bbf7d0;
            margin-bottom: 28px;
            font-size: 14px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }}

        input {{
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            margin-bottom: 14px;
            border-radius: 12px;
            border: 1px solid #166534;
            background: #020617;
            color: white;
            font-size: 15px;
        }}

        input:focus {{
            outline: none;
            border-color: #facc15;
        }}

        button {{
            width: 100%;
            padding: 13px;
            border: 0;
            border-radius: 12px;
            background: linear-gradient(90deg, #facc15, #eab308);
            color: #111827;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
        }}

        button:hover {{
            background: linear-gradient(90deg, #fde047, #facc15);
        }}

        .error {{
            background: #7f1d1d;
            color: #fecaca;
            border: 1px solid #ef4444;
            padding: 10px;
            border-radius: 12px;
            margin-bottom: 16px;
            text-align: center;
        }}

        .footer {{
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #86efac;
        }}

        .chips {{
            text-align: center;
            font-size: 28px;
            margin-bottom: 10px;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="chips">♠ ♥ ♦ ♣</div>
        <div class="logo">Maison Blackjack</div>
        <div class="subtitle">Admin Panel</div>

        {error_html}

        <form method="POST">
            <input name="username" placeholder="Username" autocomplete="username">
            <input name="password" type="password" placeholder="Password" autocomplete="current-password">
            <button type="submit">Login</button>
        </form>

        <div class="footer">Restricted admin access</div>
    </div>
</body>
</html>
"""


@app.route("/admin.php", methods=["GET", "POST"])
def honeypot_admin():
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        masked = (password[:2] + "***") if password else "***"
        log_honeypot("FAKE_ADMIN_LOGIN", f"username={username} password={masked}")
        return fake_login_page(error=True), 401

    log_honeypot("ADMIN_PAGE_VIEW")
    return fake_login_page()

# ---------- Health ----------

@app.get("/api/health")
def health(): return jsonify({"ok": True})

# ---------- Error handlers (no stack traces leaked) ----------
@app.errorhandler(413)
def too_large(_): return jsonify({"error": "payload too large"}), 413
@app.errorhandler(404)
def nf(_): return jsonify({"error": "not found"}), 404
@app.errorhandler(500)
def ie(_): return jsonify({"error": "server error"}), 500


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=False)