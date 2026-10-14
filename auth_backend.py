import hashlib
import hmac
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from database import get_connection

router = APIRouter(prefix='/api/auth', tags=['Authentication'])
COOKIE_NAME = 'firebooks_session'
SESSION_DAYS = 7


class RegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    surname: str = Field(default='', max_length=80)
    phone: str = Field(min_length=5, max_length=30)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: str
    password: str
    remember: bool = False


def init_auth_db():
    with get_connection() as conn:
        columns = {row['name'] for row in conn.execute('PRAGMA table_info(users)')}
        if 'phone' not in columns:
            conn.execute('ALTER TABLE users ADD COLUMN phone TEXT')
        conn.execute('''CREATE TABLE IF NOT EXISTS user_sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)')


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600_000)
    return 'pbkdf2_sha256$600000$' + salt.hex() + '$' + digest.hex()


def verify_password(password, stored):
    try:
        algorithm, iterations, salt, digest = stored.split('$')
        if algorithm != 'pbkdf2_sha256':
            return False
        candidate = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(candidate, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False


def public_user(row):
    return {'id': row['id'], 'name': row['name'], 'surname': row['surname'] or '',
            'phone': row['phone'] or '', 'email': row['email']}


def token_digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(response, user_id, remember, request):
    token = secrets.token_urlsafe(32)
    ttl = timedelta(days=30 if remember else SESSION_DAYS)
    expiry = datetime.now(timezone.utc) + ttl
    with get_connection() as conn:
        conn.execute('DELETE FROM user_sessions WHERE expires_at <= ?', (datetime.now(timezone.utc).isoformat(),))
        conn.execute('INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
                     (token_digest(token), user_id, expiry.isoformat()))
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=request.url.scheme == 'https',
                        samesite='lax', max_age=int(ttl.total_seconds()), path='/')


def current_user(request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    with get_connection() as conn:
        row = conn.execute('''SELECT users.* FROM user_sessions
                              JOIN users ON users.id = user_sessions.user_id
                              WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > ?''',
                           (token_digest(token), datetime.now(timezone.utc).isoformat())).fetchone()
    return public_user(row) if row else None


def check_origin(request):
    origin = request.headers.get('origin')
    if origin:
        from urllib.parse import urlsplit
        host = urlsplit(origin)
        if host.scheme not in ('http', 'https') or host.netloc != request.url.netloc or host.scheme != request.url.scheme:
            raise HTTPException(403, 'Недопустимый источник запроса')
    elif request.headers.get('sec-fetch-site') == 'cross-site':
        raise HTTPException(403, 'Недопустимый источник запроса')


@router.post('/register', status_code=201)
def register(data: RegisterInput, request: Request, response: Response):
    check_origin(request)
    name = data.name.strip()
    email = data.email.strip().lower()
    phone = data.phone.strip()
    if not name or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or len(re.sub(r'\D', '', phone)) < 10:
        raise HTTPException(422, 'Проверьте имя, email и номер телефона')
    with get_connection() as conn:
        try:
            cursor = conn.execute('''INSERT INTO users (name, surname, phone, email, password_hash)
                                     VALUES (?, ?, ?, ?, ?)''',
                                  (name, data.surname.strip(), phone, email, hash_password(data.password)))
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            raise HTTPException(409, 'Аккаунт с таким email уже существует')
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    create_session(response, user_id, True, request)
    return {'user': public_user(user)}


@router.post('/login')
def login(data: LoginInput, request: Request, response: Response):
    check_origin(request)
    with get_connection() as conn:
        row = conn.execute('SELECT * FROM users WHERE email = ?', (data.email.strip().lower(),)).fetchone()
    if not row or not verify_password(data.password, row['password_hash']):
        raise HTTPException(401, 'Неверная почта или пароль')
    create_session(response, row['id'], data.remember, request)
    return {'user': public_user(row)}


@router.get('/me')
def me(request: Request):
    return {'user': current_user(request)}


@router.post('/logout')
def logout(request: Request, response: Response):
    check_origin(request)
    token = request.cookies.get(COOKIE_NAME)
    if token:
        with get_connection() as conn:
            conn.execute('DELETE FROM user_sessions WHERE token_hash = ?', (token_digest(token),))
    response.delete_cookie(COOKIE_NAME, path='/', samesite='lax', secure=request.url.scheme == 'https', httponly=True)
    return {'ok': True}
