from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from database import get_connection
from auth_backend import current_user, check_origin

router = APIRouter(prefix="/api/cart", tags=["Cart"])

class CartItemInput(BaseModel):
    book_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=999)

class QuantityInput(BaseModel):
    quantity: int = Field(ge=1, le=999)

def require_user(request: Request):
    user = current_user(request)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Для работы с корзиной войдите в аккаунт"
        )

    return user

def get_cart(user_id: int):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                c.book_id AS id,
                c.quantity,
                b.title,
                b.author,
                b.cover_url,
                b.new_price,
                b.old_price
            FROM cart_items AS c
            JOIN books AS b ON b.id = c.book_id
            WHERE c.user_id = ?
            ORDER BY c.id DESC
            """,
            (user_id,)
        ).fetchall()

    return [
        {
            "id": row["id"],
            "quantity": row["quantity"],
            "title": row["title"],
            "author": row["author"],
            "cover": row["cover_url"],
            "price": row["new_price"],
            "old_price": row["old_price"]
        }
        for row in rows
    ]

@router.get("")
def list_cart(request: Request):
    user = require_user(request)
    return {"items": get_cart(user["id"])}

@router.post("")
def add_to_cart(data: CartItemInput, request: Request):
    check_origin(request)
    user = require_user(request)

    with get_connection() as conn:
        book = conn.execute(
            "SELECT id FROM books WHERE id = ?",
            (data.book_id,)
        ).fetchone()

        if book is None:
            raise HTTPException(
                status_code=404,
                detail="Книга не найдена"
            )

        existing = conn.execute(
            """
            SELECT id, quantity
            FROM cart_items
            WHERE user_id = ? AND book_id = ?
            """,
            (user["id"], data.book_id)
        ).fetchone()

        if existing:
            new_quantity = min(
                999,
                existing["quantity"] + data.quantity
            )

            conn.execute(
                """
                UPDATE cart_items
                SET quantity = ?
                WHERE id = ?
                """,
                (new_quantity, existing["id"])
            )
        else:
            conn.execute(
                """
                INSERT INTO cart_items
                    (user_id, book_id, quantity)
                VALUES (?, ?, ?)
                """,
                (user["id"], data.book_id, data.quantity)
            )

    return {
        "ok": True,
        "items": get_cart(user["id"])
    }

@router.patch("/{book_id}")
def update_quantity(
    book_id: int,
    data: QuantityInput,
    request: Request
):
    check_origin(request)
    user = require_user(request)

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE cart_items
            SET quantity = ?
            WHERE user_id = ? AND book_id = ?
            """,
            (data.quantity, user["id"], book_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Книга отсутствует в корзине"
            )

    return {
        "ok": True,
        "items": get_cart(user["id"])
    }

@router.delete("/{book_id}")
def remove_from_cart(book_id: int, request: Request):
    check_origin(request)
    user = require_user(request)

    with get_connection() as conn:
        conn.execute(
            """
            DELETE FROM cart_items
            WHERE user_id = ? AND book_id = ?
            """,
            (user["id"], book_id)
        )

    return {
        "ok": True,
        "items": get_cart(user["id"])
    }