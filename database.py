import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "firebooks.db"

def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection

def init_db():
    with get_connection() as connection:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                surname TEXT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                cover_type TEXT,
                old_price INTEGER DEFAULT 0,
                new_price INTEGER NOT NULL,
                discount INTEGER DEFAULT 0,
                full_title TEXT,
                rating INTEGER DEFAULT 0,
                cover_url TEXT,
                status TEXT,
                publisher TEXT,
                year TEXT,
                pages TEXT,
                isbn TEXT,
                reviews_count INTEGER DEFAULT 0,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                PRIMARY KEY (user_id, book_id),
                FOREIGN KEY (user_id)
                    REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id)
                    REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1
                    CHECK (quantity > 0),
                UNIQUE (user_id, book_id),
                FOREIGN KEY (user_id)
                    REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id)
                    REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Новый',
                total INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                    REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL
                    CHECK (quantity > 0),
                price INTEGER NOT NULL,
                FOREIGN KEY (order_id)
                    REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id)
                    REFERENCES books(id)
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                rating INTEGER NOT NULL
                    CHECK (rating BETWEEN 1 AND 5),
                text TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                    REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id)
                    REFERENCES books(id) ON DELETE CASCADE
            );
        """)

        # Добавляем недостающие поля для оформления заказов
        order_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(orders)"
            ).fetchall()
        }

        required_columns = {
            "customer_name": "TEXT NOT NULL DEFAULT ''",
            "customer_phone": "TEXT NOT NULL DEFAULT ''",
            "customer_email": "TEXT NOT NULL DEFAULT ''",
            "delivery_method": "TEXT NOT NULL DEFAULT 'pickup'",
            "delivery_address": "TEXT NOT NULL DEFAULT ''",
            "delivery_price": "INTEGER NOT NULL DEFAULT 0",
            "payment_method": "TEXT NOT NULL DEFAULT 'cash'",
        }

        for column, definition in required_columns.items():
            if column not in order_columns:
                connection.execute(
                    f"ALTER TABLE orders ADD COLUMN {column} {definition}"
                )

        # Бонусы за оформленные заказы
        connection.execute("""
            CREATE TABLE IF NOT EXISTS loyalty_awards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_id INTEGER NOT NULL UNIQUE,
                points INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (user_id)
                    REFERENCES users(id) ON DELETE CASCADE,

                FOREIGN KEY (order_id)
                    REFERENCES orders(id) ON DELETE CASCADE
            )
        """)

def seed_books(books):
    """
    Добавляет только отсутствующие книги.
    Существующие записи SQLite не перезаписываются.
    """
    with get_connection() as connection:
        for book in books:
            data = book.model_dump(
                exclude={"reviews"}
            )

            connection.execute("""
                INSERT OR IGNORE INTO books (
                    id,
                    title,
                    author,
                    cover_type,
                    old_price,
                    new_price,
                    discount,
                    full_title,
                    rating,
                    cover_url,
                    status,
                    publisher,
                    year,
                    pages,
                    isbn,
                    reviews_count,
                    description
                )
                VALUES (
                    :id,
                    :title,
                    :author,
                    :cover_type,
                    :old_price,
                    :new_price,
                    :discount,
                    :full_title,
                    :rating,
                    :cover_url,
                    :status,
                    :publisher,
                    :year,
                    :pages,
                    :isbn,
                    :reviews_count,
                    :description
                )
            """, data)

def get_all_books():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM books ORDER BY id"
        ).fetchall()

    return [dict(row) for row in rows]

def get_book_by_id(book_id):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM books WHERE id = ?",
            (book_id,)
        ).fetchone()

    return dict(row) if row else None

def get_books_by_ids(book_ids):
    """
    Получает книги по ID и сохраняет порядок подборки.
    """
    if not book_ids:
        return []

    placeholders = ",".join("?" for _ in book_ids)

    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT * FROM books WHERE id IN ({placeholders})",
            tuple(book_ids)
        ).fetchall()

    books_map = {
        row["id"]: dict(row)
        for row in rows
    }

    return [
        books_map[book_id]
        for book_id in book_ids
        if book_id in books_map
    ]

def search_books(query):
    """
    Поиск по названию, полному названию и автору.
    Используется casefold для русского текста.
    """
    import re

    words = re.findall(r"[\wё]+", query.casefold())

    if not words:
        return []

    results = []

    for book in get_all_books():
        searchable = (
            f"{book['title']} "
            f"{book['full_title'] or ''} "
            f"{book['author']}"
        ).casefold()

        if all(word in searchable for word in words):
            results.append(book)

    return results

def count_books():
    with get_connection() as connection:
        row = connection.execute(
            "SELECT COUNT(*) FROM books"
        ).fetchone()

    return row[0]

if __name__ == "__main__":
    init_db()
    print(f"База данных: {DATABASE_PATH}")
    print(f"Книг в базе: {count_books()}")