from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Literal

from database import get_connection
from auth_backend import current_user, check_origin

router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"]
)

class OrderInput(BaseModel):
    book_ids: list[int] = Field(min_length=1)

    customer_name: str = Field(min_length=1, max_length=100)
    customer_phone: str = Field(min_length=1, max_length=30)
    customer_email: str = Field(min_length=3, max_length=254)

    delivery_method: Literal["pickup", "courier", "post"]
    delivery_address: str = Field(default="", max_length=500)

DELIVERY_PRICES = {
    "pickup": 0,
    "courier": 300,
    "post": 250
}

def require_user(request: Request):
    user = current_user(request)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Для оформления заказа войдите в аккаунт"
        )

    return user

@router.post("")
def create_order(data: OrderInput, request: Request):
    check_origin(request)
    user = require_user(request)

    book_ids = data.book_ids

    if len(book_ids) != len(set(book_ids)):
        raise HTTPException(
            status_code=400,
            detail="В заказе обнаружены повторяющиеся книги"
        )

    if any(book_id <= 0 for book_id in book_ids):
        raise HTTPException(
            status_code=400,
            detail="Некорректный ID книги"
        )

    if (
        data.delivery_method != "pickup"
        and not data.delivery_address.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="Укажите адрес доставки"
        )

    name = data.customer_name.strip()
    phone = data.customer_phone.strip()
    email = data.customer_email.strip()

    if not name or not phone or not email:
        raise HTTPException(
            status_code=400,
            detail="Заполните контактные данные"
        )

    with get_connection() as conn:
        try:
            conn.execute("BEGIN IMMEDIATE")

            placeholders = ",".join("?" for _ in book_ids)

            rows = conn.execute(
                f"""
                SELECT
                    c.book_id,
                    c.quantity,
                    b.new_price
                FROM cart_items AS c
                JOIN books AS b ON b.id = c.book_id
                WHERE c.user_id = ?
                  AND c.book_id IN ({placeholders})
                """,
                [user["id"], *book_ids]
            ).fetchall()

            if len(rows) != len(book_ids):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Некоторые книги отсутствуют в корзине. "
                        "Обновите страницу."
                    )
                )

            subtotal = 0
            order_items = []

            for row in rows:
                price = int(row["new_price"])
                quantity = int(row["quantity"])

                if price < 0 or not 1 <= quantity <= 999:
                    raise HTTPException(
                        status_code=400,
                        detail="Некорректные данные книги"
                    )

                subtotal += price * quantity

                order_items.append({
                    "book_id": row["book_id"],
                    "quantity": quantity,
                    "price": price
                })

            delivery_price = DELIVERY_PRICES[
                data.delivery_method
            ]

            total = subtotal + delivery_price

            cursor = conn.execute(
                """
                INSERT INTO orders (
                    user_id,
                    status,
                    total,
                    customer_name,
                    customer_phone,
                    customer_email,
                    delivery_method,
                    delivery_address,delivery_price,
                    payment_method
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    "Новый",
                    total,
                    name,
                    phone,
                    email,
                    data.delivery_method,
                    (
                        data.delivery_address.strip()
                        if data.delivery_method != "pickup"
                        else ""
                    ),
                    delivery_price,
                    "cash"
                )
            )

            order_id = cursor.lastrowid

            for item in order_items:
                conn.execute(
                    """
                    INSERT INTO order_items (
                        order_id,
                        book_id,
                        quantity,
                        price
                    )
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        order_id,
                        item["book_id"],
                        item["quantity"],
                        item["price"]
                    )
                )

            conn.execute(
                f"""
                DELETE FROM cart_items
                WHERE user_id = ?
                  AND book_id IN ({placeholders})
                """,
                [user["id"], *book_ids]
            )

            conn.commit()

        except Exception:
            conn.rollback()
            raise

    return {
        "ok": True,
        "order_id": order_id,
        "number": f"FB-{order_id:06d}",
        "subtotal": subtotal,
        "delivery_price": delivery_price,
        "total": total
    }

@router.get("")
def list_orders(request: Request):
    user = require_user(request)

    with get_connection() as conn:
        orders_rows = conn.execute(
            """
            SELECT
                id,
                status,
                total,
                created_at,
                delivery_method,
                delivery_address,
                delivery_price
            FROM orders
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user["id"],)
        ).fetchall()

        result = []

        for order in orders_rows:
            item_rows = conn.execute(
                """
                SELECT
                    oi.book_id AS id,
                    oi.quantity,
                    oi.price,
                    b.title,
                    b.author,
                    b.cover_url
                FROM order_items AS oi
                LEFT JOIN books AS b
                    ON b.id = oi.book_id
                WHERE oi.order_id = ?
                ORDER BY oi.id
                """,
                (order["id"],)
            ).fetchall()

            items = [
                {
                    "id": item["id"],
                    "title": item["title"] or "Книга",
                    "author": item["author"] or "",
                    "cover": item["cover_url"] or "",
                    "price": item["price"],
                    "quantity": item["quantity"]
                }
                for item in item_rows
            ]

            result.append({
                "id": order["id"],
                "number": f"FB-{order['id']:06d}",
                "status": order["status"],
                "total": order["total"],
                "created_at": order["created_at"],
                "delivery_method": order["delivery_method"],
                "delivery_address": order["delivery_address"],
                "delivery_price": order["delivery_price"],
                "items": items
            })

    return {"orders": result}