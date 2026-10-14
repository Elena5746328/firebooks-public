from fastapi import APIRouter, HTTPException, Request
from database import get_connection
from auth_backend import current_user, check_origin

router = APIRouter(prefix='/api/favorites', tags=['Favorites'])


def require_user(request: Request):
    user = current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail='Войдите в аккаунт')
    return user


@router.get('')
def list_favorites(request: Request):
    user = require_user(request)
    with get_connection() as conn:
        rows = conn.execute('''
            SELECT books.* FROM favorites
            JOIN books ON books.id = favorites.book_id
            WHERE favorites.user_id = ?
            ORDER BY favorites.rowid DESC
        ''', (user['id'],)).fetchall()
    return {'books': [dict(row) for row in rows]}


@router.put('/{book_id}')
def add_favorite(book_id: int, request: Request):
    check_origin(request)
    user = require_user(request)
    with get_connection() as conn:
        exists = conn.execute('SELECT 1 FROM books WHERE id = ?', (book_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail='Книга не найдена')
        conn.execute('INSERT OR IGNORE INTO favorites (user_id, book_id) VALUES (?, ?)',
                     (user['id'], book_id))
    return {'ok': True, 'book_id': book_id, 'is_favorite': True}


@router.delete('/{book_id}')
def remove_favorite(book_id: int, request: Request):
    check_origin(request)
    user = require_user(request)
    with get_connection() as conn:
        conn.execute('DELETE FROM favorites WHERE user_id = ? AND book_id = ?',
                     (user['id'], book_id))
    return {'ok': True, 'book_id': book_id, 'is_favorite': False}
