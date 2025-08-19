# server/hard_reset_db.py
from app import app, db
# Import models so SQLAlchemy "sees" all tables/columns
from models import User, Post, Media, Comment, Like, Follow  # noqa: F401
from sqlalchemy import inspect
from pathlib import Path

with app.app_context():
    # show exactly where we're writing
    print("Instance path:", app.instance_path)
    db_file = Path(app.config["SQLALCHEMY_DATABASE_URI"].replace("sqlite:///", ""))
    print("DB file:", db_file)

    # Drop & recreate
    db.drop_all()
    db.create_all()

    # Verify schema
    insp = inspect(db.engine)
    print("Tables:", insp.get_table_names())
    print("posts cols:", [c["name"] for c in insp.get_columns("posts")])
    print("media cols:", [c["name"] for c in insp.get_columns("media")])