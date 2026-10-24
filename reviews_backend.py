from contextlib import closing

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from database import get_connection
from auth_backend import current_user, check_origin

router = APIRouter(
    prefix="/api/reviews",
    tags=["Reviews"]
)

# ПРОВЕРКА АВТОРИЗАЦИИ

def require_user(request: Request):
    user = current_user(request)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Войдите в аккаунт"
        )

    return user

# ДАННЫЕ ОТЗЫВА

class ReviewData(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=5, max_length=3000)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value):
        text = value.strip()

        if len(text) < 5:
            raise ValueError(
                "Отзыв должен содержать минимум 5 символов"
            )

        return text

class ReviewCreate(ReviewData):
    book_id: int = Field(gt=0)

# ПОЛУЧЕНИЕ МОИХ ОТЗЫВОВ

@router.get("/mine")
def get_my_reviews(request: Request):
    user = require_user(request)

    with closing(get_connection()) as connection:
        rows = connection.execute("""
            SELECT
                r.id,
                r.book_id,
                COALESCE(
                    NULLIF(b.full_title, ''),
                    b.title
                ) AS book_title,
                b.author AS book_author,
                b.cover_url AS cover,
                r.rating,
                r.text,
                r.created_at
            FROM reviews AS r
            JOIN books AS b
                ON b.id = r.book_id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC, r.id DESC
        """, (user["id"],)).fetchall()

    reviews = []

    for row in rows:
        reviews.append({
            "id": row["id"],
            "bookId": row["book_id"],
            "bookTitle": row["book_title"],
            "author": row["book_author"],
            "cover": row["cover"] or "",
            "rating": row["rating"],
            "text": row["text"],
            "createdAt": row["created_at"]
        })

    return {"reviews": reviews}

# СОЗДАНИЕ ОТЗЫВА

@router.post("", status_code=201)
def create_review(
    data: ReviewCreate,
    request: Request
):
    check_origin(request)
    user = require_user(request)

    with closing(get_connection()) as connection:
        with connection:
            connection.execute("BEGIN IMMEDIATE")

            book = connection.execute(
                "SELECT id FROM books WHERE id = ?",
                (data.book_id,)
            ).fetchone()

            if not book:
                raise HTTPException(
                    status_code=404,
                    detail="Книга не найдена"
                )

            purchased = connection.execute("""
                SELECT 1
                FROM order_items AS oi
                JOIN orders AS o
                    ON o.id = oi.order_id
                WHERE o.user_id = ?
                  AND oi.book_id = ?
                LIMIT 1
            """, (
                user["id"],
                data.book_id
            )).fetchone()

            if not purchased:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Отзыв можно оставить только "
                        "на книгу из ваших заказов"
                    )
                )

            existing = connection.execute("""
                SELECT id
                FROM reviews
                WHERE user_id = ?
                  AND book_id = ?
                LIMIT 1
            """, (
                user["id"],
                data.book_id
            )).fetchone()

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="Вы уже написали отзыв на эту книгу"
                )

            cursor = connection.execute("""
                INSERT INTO reviews (
                    user_id,
                    book_id,
                    rating,
                    text
                )
                VALUES (?, ?, ?, ?)
            """, (
                user["id"],
                data.book_id,
                data.rating,
                data.text
            ))

            review_id = cursor.lastrowid

    return {
        "ok": True,
        "id": review_id,
        "message": "Отзыв опубликован"
    }

# РЕДАКТИРОВАНИЕ ОТЗЫВА

@router.put("/{review_id}")
def update_review(
    review_id: int,
    data: ReviewData,
    request: Request
):
    check_origin(request)
    user = require_user(request)

    with closing(get_connection()) as connection:
        with connection:
            cursor = connection.execute("""
                UPDATE reviews
                SET rating = ?,
                    text = ?
                WHERE id = ?
                  AND user_id = ?
            """, (
                data.rating,
                data.text,
                review_id,
                user["id"]
            ))

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Отзыв не найден"
                )

    return {
        "ok": True,
        "message": "Отзыв обновлён"
    }

# УДАЛЕНИЕ ОТЗЫВА

@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    request: Request
):
    check_origin(request)
    user = require_user(request)

    with closing(get_connection()) as connection:
        with connection:
            cursor = connection.execute("""
                DELETE FROM reviews
                WHERE id = ?
                  AND user_id = ?
            """, (
                review_id,
                user["id"]
            ))

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Отзыв не найден"
                )

    return {
        "ok": True,
        "message": "Отзыв удалён"
    }