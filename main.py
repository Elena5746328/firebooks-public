from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlencode

from auth_backend import router as auth_router, init_auth_db
from favorites_backend import router as favorites_router
from cart_backend import router as cart_router
from orders_backend import router as orders_router
from update_book_details import main as update_book_details
from reviews_backend import router as reviews_router

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import (
    init_db,
    seed_books,
    get_connection,
    get_all_books as db_get_all_books,
    get_book_by_id,
    get_books_by_ids,
    search_books,
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

# ============================================================
# МОДЕЛИ
# ============================================================

class Review(BaseModel):
    author: str
    rating: int = Field(ge=1, le=5)
    text: str

class Book(BaseModel):
    id: int
    title: str
    author: str
    cover_type: str = "Не указан"
    old_price: int = 0
    new_price: int = 0
    discount: int = 0
    full_title: str = ""
    rating: float = Field(default=0, ge=0, le=5)
    cover_url: str
    status: str = "Уточняйте наличие"
    publisher: str = "Не указано"
    year: str = "Не указан"
    pages: str = "Не указано"
    isbn: str = "Не указан"
    reviews_count: int = 0
    description: str = "Описание пока не добавлено."
    reviews: list[Review] = Field(default_factory=list)

class HeroBook(BaseModel):
    title: str
    author: str
    description: str
    cover_url: str

# ============================================================
# СОЗДАНИЕ КНИГ ДЛЯ ПЕРВОНАЧАЛЬНОГО ИМПОРТА
# ============================================================

def make_book(
    book_id,
    title,
    author,
    cover,
    price,
    old_price=0,
    *,
    full_title=None,
    cover_type="Твердая обложка",
    rating=5,
    status="В наличии",
    reviews_count=0,
    description=None,
    **extra
):
    discount = (
        round((old_price - price) / old_price * 100)
        if old_price
        else 0
    )

    return Book(
        id=book_id,
        title=title,
        author=author,
        cover_type=cover_type,
        old_price=old_price,
        new_price=price,
        discount=discount,
        full_title=full_title or title,
        rating=rating,
        cover_url="/static/img/" + cover,
        status=status,
        reviews_count=reviews_count,
        description=description or "Описание пока не добавлено.",
        **extra
    )

# ============================================================
# ИСХОДНЫЙ КАТАЛОГ
# ============================================================
# Используется только для добавления отсутствующих книг.
# Существующие записи в SQLite имеют приоритет.

BOOKS = [

    make_book(
        1, "Без сожалений", "Таша Мисник",
        "019fd5f3-e95e-7be2-9ad3-73e4752605c8.jpg",
        1109, 1379,
        full_title="Без сожалений (с цветным обрезом)",
        cover_type="Мягкая обложка",
        status="Предзаказ"
    ),

    make_book(
        2, "Скорбь Сатаны", "Мария Корелли",
        "019b117b-276e-7d13-b66f-c37af1dc6798.png",
        729, 889,
        full_title="Скорбь Сатаны. Вечные истории. Young Adult",
        reviews_count=113
    ),

    make_book(
        3, "Неночь", "Джей Кристофф",
        "019d333a-63f4-7406-b0dd-d6180c58550b.png",
        1199, 1419,
        full_title="Неночь (новая редакция)",
        rating=4,
        reviews_count=46
    ),

    make_book(
        4, "Призрак Оперы", "Гастон Леру",
        "0190390d-f770-725a-97ce-fc1b88f7c56a.png",
        579, 706,
        full_title="Призрак Оперы. Вечные истории. Young Adult",
        reviews_count=266
    ),

    make_book(
        5, "Игра Престолов", "Джордж Р.Р. Мартин",
        "019e6d6c-7f54-7725-99a0-9b3d16b192d6.png",
        1999, 2399,
        reviews_count=1799
    ),

    make_book(
        6, "Ониксовый шторм", "Ребекка Яррос",
        "0195aee6-cec1-7604-96bf-083a79d9b6b5.png",
        1599, 1919,
        full_title="Ониксовый шторм (черный обрез)",
        reviews_count=991
    ),

    make_book(
        7, "Мара и Морок", "Лия Арден",
        "019d2894-9efb-7478-8fcf-e06b5a679917.png",
        849, 1036,
        full_title="Мара и Морок. Особенная Тень",
        reviews_count=678
    ),

    make_book(
        8, "Восточный дворец", "Сыцунь Фэйво",
        "019ffba0-1384-70d0-a9bb-179260c9c57b.png",
        1499, 1799,
        full_title=(
            "Восточный дворец: прощай моя принцесса "
            "(комплект из 2 книг)"
        ),
        cover_type="Мягкая обложка",
        reviews_count=43
    ),

    make_book(
        9, "Четыре Дракона", "Лия Арден",
        "019e6a51-bd44-73ee-84e7-f108dfe34092.png",
        3099, 3719,
        full_title="Четыре Дракона. Дилогия (подарочное издание)",
        reviews_count=180
    ),

    make_book(
        10, "Собор Парижской Богоматери", "Виктор Мари Гюго",
        "018f61f1-cd8c-70cf-8fda-7bdb4b99e395.png",
        799, 975,
        full_title=(
            "Собор Парижской Богоматери. "
            "Вечные истории. Young Adult"
        ),
        reviews_count=254
    ),

    make_book(
        11, "Гордость и предубеждение", "Джейн Остен",
        "019c08a2-b492-7bfa-8af7-8da0e8c5ff85.png",
        649, 792,
        full_title=(
            "Гордость и предубеждение. "
            "Вечные истории. Young Adult"
        ),
        reviews_count=482
    ),

    make_book(
        12, "В ритме сердца", "Тори Майрен",
        "019e064c-c08d-7b6a-9c1e-1d67138eaa1b.png",
        879, 1055,
        reviews_count=275
    ),

    make_book(
        13, "Императорский див", "Виктор Дашкевич",
        "019edea7-280d-7b3b-a3dd-57f2060de04c.jpg",
        1349, 1619,
        full_title="Императорский див (подарочное издание)"
    ),

    make_book(
        14, "Наследник Ардена", "Софи Арни",
        "019e69f4-29b7-7738-af92-f213c776791b.png",
        2699, 3293,
        full_title="Наследник Ардена (подарочная трилогия)"
    ),

    make_book(
        15, "Академия вампиров", "Райчел Мид",
        "018f5f49-ad94-7e7d-bf28-6eb3c86740b0.png",
        879, 1055,
        full_title=(
            "Академия вампиров. Книга 1. "
            "Охотники и жертвы"
        )
    ),

    # ========================================================
    # ЖЕЛЕЗНОЕ ПЛАМЯ
    # ИСПРАВЛЕНА ОБЛОЖКА
    # ========================================================

    make_book(
        101, "Железное пламя", "Ребекка Яррос",
        "62a38c10c8c4652682ca90b3945f69e6.jpg",
        1312, 1687,
        cover_type="Твердый переплет",
        publisher="Кислород",
        year="2024",
        pages="912",
        isbn="978-5-353-10858-0",
        reviews_count=47,
        description=(
            "Никто не ожидал, что Вайолет Сорренгейл "
            "выживет в Военной академии Басгиат, "
            "включая саму Вайолет. Но как драконы "
            "устанавливают собственные законы, так и "
            "Вайолет устанавливает свои правила. "
            "Тем более что у нее есть определенные "
            "преимущества — ум, железная воля, "
            "преданные друзья и любовь Ксейдена Риорсона. "
            "Однако одной решимости выжить становится мало. "
            "Ведь Вайолет знает столько тайн, что голова кругом! "
            "И даже драконьего огня может оказаться "
            "недостаточно, чтобы спалить всех ее врагов. "
            "Что ж, добро пожаловать в революцию!"
        )
    ),

    # ========================================================
    # ЧЕТВЁРТОЕ КРЫЛО
    # ИСПРАВЛЕНА ОБЛОЖКА И ЦЕНА
    # ========================================================

    make_book(
        102, "Четвёртое крыло", "Ребекка Яррос",
        "e9c52af3f897a42c929de5c1ddc4aa18.jpg",
        1679, 2399,
        rating=0,
        reviews_count=0,
        description=("Вайолет Сорренгейл поступает в военную "
            "академию Басгиат, где будущие всадники "
            "проходят испытания, чтобы стать партнёрами "
            "драконов. Ей предстоит найти союзников "
            "и раскрыть тайны академии."
        )
    ),

    # --------------------------------------------------------
    # ДОБАВЛЕННЫЕ КНИГИ
    # --------------------------------------------------------

    make_book(
        16, "Безмолвный пациент", "Алекс Михаэлидес",
        "0199754d-67f6-7f96-adbd-ce6390eb6b09.png",
        899, 1199,
        description=(
            "Психологический триллер о художнице Алисии "
            "Беренсон, которая после трагического события "
            "перестаёт говорить. Психотерапевт Тео Фабер "
            "пытается раскрыть тайну её молчания."
        )
    ),

    make_book(
        17, "451° по Фаренгейту", "Рэй Брэдбери",
        "019e69fd-fba2-7954-8584-737d6332425a.png",
        699, 899,
        description=(
            "Антиутопия о мире, в котором книги запрещены. "
            "Пожарный Гай Монтэг начинает сомневаться "
            "в правилах общества."
        )
    ),

    make_book(
        18, "Убийство в Восточном экспрессе", "Агата Кристи",
        "018f5df6-a66e-7012-ac05-dba6a39af65a.png",
        649, 849,
        description=(
            "Эркюль Пуаро оказывается среди пассажиров "
            "роскошного поезда, где происходит загадочное "
            "преступление. Каждый пассажир может "
            "хранить секрет."
        )
    ),

    make_book(
        19, "Шестёрка воронов", "Ли Бардуго",
        "019ce60a-d2b3-74e9-adef-a1a2935761b4.png",
        999, 1299,
        description=(
            "Каз Бреккер собирает команду из шести "
            "необычных участников для выполнения "
            "почти невозможного задания."
        )
    ),

    make_book(
        20, "Королевство шипов и роз", "Сара Дж. Маас",
        "018f5cb5-ed87-7590-b6b3-0ee3c81a54d6.png",
        1199, 1499,
        description=(
            "Фейра оказывается в загадочном мире фейри, "
            "полном магии, опасностей и древних тайн."
        )
    ),

    make_book(
        21, "Невеста Ноября", "Лия Арден",
        "019e3a33-4d82-7384-9970-3cc06c17b13f.png",
        899, 1099,
        description=(
            "Атмосферное фэнтези Лии Арден, "
            "вдохновлённое сказочными мотивами, "
            "мистикой и древними традициями."
        )
    ),

    make_book(
        22, "Десять негритят", "Агата Кристи",
        "019abc56-8d7f-75c9-9640-dd624b1cf984.png",
        649, 849,
        description=(
            "Десять незнакомцев получают приглашения "
            "на уединённый остров. Вскоре становится ясно, "
            "что их собрали здесь не случайно. "
            "Роман также известен под названием "
            "«И никого не стало»."
        )
    ),

    make_book(
        23, "Майор Гром: Чумной доктор", "BUBBLE",
        "018edaae-2932-7eee-8e16-cb1a73b2a7e1.jpg",
        999, 1299,
        full_title="Майор Гром. Том 1. Чумной доктор",
        cover_type="Комикс",
        description=(
            "Первая часть приключений майора полиции "
            "Игоря Грома. Ему предстоит расследовать "
            "преступления загадочного Чумного Доктора."
        )
    ),

    make_book(
        24, "Майор Гром: Игра", "BUBBLE",
        "018edb89-f346-7112-9c38-96c73ea8fbbb.png",
        1099, 1399,
        full_title="Майор Гром. Том 5. Игра",
        cover_type="Комикс",
        description=(
            "Пятая часть приключений Игоря Грома. "
            "Героя ждут новые опасные противники, "
            "сложные решения и испытания."
        )
    ),

    make_book(
        25, "Мастер и Маргарита", "Михаил Булгаков",
        "018f616c-7c89-7694-9c44-c58e29ae5a53.png",
        799, 999,
        description=(
            "Роман, в котором мистические события "
            "в Москве переплетаются с историей "
            "Мастера и Маргариты, размышлениями "
            "о любви, творчестве, добре и зле."
        )
    ),
]

# ============================================================
# ПРОВЕРКА ИСХОДНОГО КАТАЛОГА
# ============================================================

BOOKS_BY_ID = {
    book.id: book
    for book in BOOKS
}

if len(BOOKS_BY_ID) != len(BOOKS):
    raise RuntimeError(
        "Обнаружены повторяющиеся ID книг"
    )

# ============================================================
# ПОДБОРКИ
# ============================================================

NEW_BOOK_IDS = [
    1, 2, 3, 4, 5,
    16, 17, 21, 23, 25
]

BESTSELLER_BOOK_IDS = [
    6, 7, 8, 9, 10,
    19, 20, 22, 24
]

UPCOMING_BOOK_IDS = [
    11, 12, 13, 14, 15,
    18
]

# ============================================================
# ДЕМОНСТРАЦИОННЫЕ ОТЗЫВЫ
# ============================================================
# Пока не являются пользовательскими записями в SQLite.
# Будут перенесены при разработке системы регистрации.

DEMO_REVIEWS = {
    101: [
        Review(
            author="Мария",
            rating=5,
            text=(
                "Прочитала за три дня, не могла оторваться. "
                "Вторая часть цикла «Эмпирей» оказалась "
                "ещё мощнее первой. Отношения Вайолет "
                "и Ксейдена, политические интриги, "
                "драконы — всё на высоте."
            )
        ),
        Review(
            author="Анастасия",
            rating=5,
            text=(
                "Книга потрясающая! Читается на одном дыхании. "
                "Ждала продолжения после «Четвёртого крыла». "
                "Сюжет стал ещё напряжённее, ставки выше, "
                "а эмоции — сильнее. Концовка просто "
                "снесла крышу. Теперь мучаюсь "
                "в ожидании третьей части."
            )
        ),
        Review(
            author="Дмитрий",
            rating=4,
            text=(
                "Хорошее продолжение, но местами затянуто. "
                "900 страниц — это много, некоторые сцены "
                "можно было сократить. Но в целом сюжет "
                "держит, драконы и боевые сцены "
                "отлично прописаны. Рекомендую фанатам жанра."
            )
        )
    ]
}

def prepare_book(data):
    """
    Получает книгу из SQLite и добавляет отзывы
    из базы данных FIREBOOKS.
    """

    book = Book.model_validate(data)

    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                author,
                rating,
                text,
                source,
                is_demo
            FROM v_book_reviews
            WHERE book_id = ?
            ORDER BY created_at DESC, review_key DESC
            """,
            (book.id,)
        ).fetchall()
    finally:
        connection.close()

    # Для остальных книг сохраняем прежний рейтинг,
    # пока в базе нет опубликованных отзывов.
    if not rows and book.id not in (101, 102):
        return book

    book.reviews = []

    for row in rows:
        author = row["author"]
        source = row["source"] or ""

        # Показываем происхождение отзыва.
        if source.startswith("Читай-город"):
            author += (
                " · Читай-город "
                "(пересказ, оценка условная)"
            )
        elif row["is_demo"]:
            author += " · демо FIREBOOKS"

        book.reviews.append(
            Review(
                author=author,
                rating=row["rating"],
                text=row["text"]
            )
        )

    # Количество отзывов берём из базы.
    book.reviews_count = len(book.reviews)

    # Рассчитываем демонстрационный рейтинг.
    if book.reviews:
        total_rating = sum(
            review.rating for review in book.reviews
        )
        book.rating = round(
            total_rating / len(book.reviews), 1
        )
    else:
        book.rating = 0

    return book

def prepare_books(rows):
    return [
        prepare_book(row)
        for row in rows
    ]

# ============================================================
# ЗАПУСК ПРИЛОЖЕНИЯ И БАЗЫ
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_auth_db()
    seed_books(BOOKS)
    update_book_details()

    # Обновляем уже существующие записи в SQLite.
    # Остальные книги и данные не изменяем.

    connection = get_connection()

    try:
        # Железное пламя: правильная обложка
        connection.execute(
            """
            UPDATE books
            SET cover_url = ?
            WHERE id = ?
            """,
            (
                "/static/img/62a38c10c8c4652682ca90b3945f69e6.jpg",
                101,
            )
        )

        # Четвёртое крыло: обложка и цены
        connection.execute(
            """
            UPDATE books
            SET cover_url = ?,
                old_price = ?,
                new_price = ?,
                discount = ?
            WHERE id = ?
            """,
            (
                "/static/img/e9c52af3f897a42c929de5c1ddc4aa18.jpg",
                2399,
                1679,
                30,
                102,
            )
        )

        connection.commit()

    finally:
        connection.close()

    yield

app = FastAPI(
    title="FIREBOOKS",
    lifespan=lifespan
)

app.include_router(auth_router)
app.include_router(favorites_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(reviews_router)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

# ============================================================
# ГЛАВНЫЙ БАННЕР
# ============================================================

HERO_BOOK = HeroBook(
    title="Четвёртое крыло",
    author="Ребекка Яррос",
    description=(
        "#1 САМЫХ ПРОДАВАЕМЫХ КНИГ AMAZON! "
        "МГНОВЕННЫЙ БЕСТСЕЛЛЕР NEW YORK TIMES!"
    ),
    cover_url=(
        "/static/img/"
        "e9c52af3f897a42c929de5c1ddc4aa18.jpg"
    )
)

@app.get("/api/hero", response_model=HeroBook)
def get_hero():
    return HERO_BOOK

# ============================================================
# API: ВСЕ КНИГИ ИЗ SQLITE
# ============================================================

@app.get("/api/books", response_model=list[Book])
def api_all_books():
    return prepare_books(
        db_get_all_books()
    )

# ============================================================
# API: НОВИНКИ
# ============================================================

@app.get("/api/books/new", response_model=list[Book])
def api_new_books():
    return prepare_books(
        get_books_by_ids(NEW_BOOK_IDS)
    )

# ============================================================
# API: БЕСТСЕЛЛЕРЫ
# ============================================================

@app.get("/api/books/bestsellers", response_model=list[Book])
def api_bestsellers():
    return prepare_books(
        get_books_by_ids(BESTSELLER_BOOK_IDS)
    )

# ============================================================
# API: СКОРО В ПРОДАЖЕ
# ============================================================

@app.get("/api/books/upcoming", response_model=list[Book])
def api_upcoming():
    return prepare_books(
        get_books_by_ids(UPCOMING_BOOK_IDS)
    )

# ============================================================
# API: ПОИСК
# ============================================================

@app.get("/api/search", response_model=list[Book])
def api_search(q: str = ""):
    return prepare_books(
        search_books(q)
    )

# ============================================================
# API: ОТДЕЛЬНАЯ КНИГА
# ============================================================

@app.get("/api/books/{book_id}", response_model=Book)
def api_book_detail(book_id: int):
    data = get_book_by_id(book_id)

    if data is None:
        raise HTTPException(
            status_code=404,
            detail="Книга не найдена"
        )

    return prepare_book(data)

# ============================================================
# HTML-СТРАНИЦЫ
# ============================================================

PAGES = {
    "/": "index.html",
    "/catalog": "catalog.html",
    "/book": "book.html",
    "/cart": "cart.html",
    "/recommend": "recommend.html",
    "/library": "library.html",
    "/bookmarks": "bookmarks.html",
    "/my-reviews": "my-reviews.html",
    "/orders": "orders.html",
    "/profile": "profile.html",
    "/checkout": "checkout.html",
    "/info": "info.html",
}

def page_response(path: str):
    filename = PAGES[path]
    filepath = STATIC_DIR / filename

    if not filepath.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Файл страницы {filename} не найден"
        )

    return FileResponse(filepath)

def build_page_handler(page_path: str):
    def serve_page():
        return page_response(page_path)

    return serve_page

for route in PAGES:
    app.add_api_route(
        route,
        build_page_handler(route),
        methods=["GET"],
        include_in_schema=False
    )

# ============================================================
# СТАРЫЕ ССЫЛКИ
# ============================================================

@app.get("/my-books", include_in_schema=False)
def old_library_route():
    return RedirectResponse(
        url="/library",
        status_code=302
    )

@app.get("/search", include_in_schema=False)
def search_page(q: str = ""):
    return RedirectResponse(
        url="/?" + urlencode({"q": q}),
        status_code=302
    )