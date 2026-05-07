# server/hard_reset_db.py
from __future__ import annotations

from pathlib import Path
from sqlalchemy import inspect
from app import app, db

# Ensure all models are imported so SQLAlchemy "sees" them
from models import User, Post, Media, Comment, Like, Follow  # noqa: F401


def _sqlite_path_from_uri(uri: str) -> Path | None:
    # Supports sqlite:///relative.db and sqlite:////absolute/path.db
    if not uri.startswith("sqlite:///"):
        return None

    path_part = uri.replace("sqlite:///", "", 1)
    return Path(path_part)


with app.app_context():
    print("Instance path:", app.instance_path)

    uri = app.config["SQLALCHEMY_DATABASE_URI"]
    print("SQLALCHEMY_DATABASE_URI:", uri)

    # 1) Cleanly close any active session/connection
    try:
        db.session.remove()
    except Exception as e:
        print("Warn: db.session.remove() failed:", repr(e))

    try:
        db.engine.dispose()
    except Exception as e:
        print("Warn: db.engine.dispose() failed:", repr(e))

    db_path = _sqlite_path_from_uri(uri)

    # 2) If SQLite, delete the file for a true hard reset
    if db_path is not None:
        if not db_path.is_absolute():
            db_path = Path(app.instance_path) / db_path

        print("Resolved SQLite file:", db_path)

        db_path.parent.mkdir(parents=True, exist_ok=True)

        if db_path.exists():
            print("Deleting existing DB file...")
            db_path.unlink()
        else:
            print("No existing DB file found.")

    else:
        # Non-SQLite fallback
        print("Non-SQLite database detected; using drop_all/create_all")

        try:
            db.drop_all()
            db.session.commit()
        except Exception as e:
            print("drop_all() failed:", repr(e))
            db.session.rollback()
            raise

    # 3) Recreate schema
    print("Creating schema...")
    db.create_all()
    db.session.commit()

    # 4) Verify schema
    insp = inspect(db.engine)
    tables = insp.get_table_names()
    print("Tables:", tables)

    def show_cols(tbl: str):
        if tbl in tables:
            cols = [c["name"] for c in insp.get_columns(tbl)]
            print(f"{tbl} cols:", cols)
        else:
            print(f"{tbl} table not found")

    show_cols("users")
    show_cols("posts")
    show_cols("media")
    show_cols("comments")
    show_cols("likes")
    show_cols("follows")

    # 5) Specific sanity check for new comment-like capable likes table
    if "likes" in tables:
        like_cols = {c["name"] for c in insp.get_columns("likes")}

        expected_like_cols = {
            "id",
            "user_id",
            "post_id",
            "comment_id",
            "created_at",
        }

        missing_like_cols = expected_like_cols - like_cols

        if missing_like_cols:
            print("WARNING: likes table is missing columns:", missing_like_cols)
        else:
            print("likes table looks good for post likes and comment likes.")