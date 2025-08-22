# server/hard_reset_db.py
from __future__ import annotations

import os
from pathlib import Path
from sqlalchemy import inspect
from app import app, db

# Ensure all models are imported so SQLAlchemy "sees" them
from models import User, Post, Media, Comment, Like, Follow  # noqa: F401


def _sqlite_path_from_uri(uri: str) -> Path | None:
    # Supports sqlite:///relative.db and sqlite:////absolute/path.db
    if not uri.startswith("sqlite:///"):
        return None
    # Strip scheme
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
        # If the path is relative, anchor it to the Flask instance folder for clarity
        if not db_path.is_absolute():
            db_path = Path(app.instance_path) / db_path

        db_dir = db_path.parent
        print("Resolved SQLite file:", db_path)

        # Ensure parent directory exists
        db_dir.mkdir(parents=True, exist_ok=True)

        # Delete the DB file if present
        if db_path.exists():
            print("Deleting existing DB file …")
            try:
                db_path.unlink()
            except PermissionError as e:
                print("PermissionError deleting DB (is something holding it open?):", e)
                raise

    else:
        # Non-SQLite: fall back to metadata drop (safer than leaving stale schema)
        print("Non-SQLite database detected; using drop_all/create_all")
        try:
            db.drop_all()
            db.session.commit()
        except Exception as e:
            print("drop_all() failed:", repr(e))
            db.session.rollback()

    # 3) Recreate schema
    print("Creating schema …")
    db.create_all()
    db.session.commit()

    # 4) Verify schema
    insp = inspect(db.engine)
    tables = insp.get_table_names()
    print("Tables:", tables)

    # Only inspect columns if the table exists—avoids raising during early dev
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
