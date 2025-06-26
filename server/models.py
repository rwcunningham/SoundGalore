from __future__ import annotations

"""
Flask‑SQLAlchemy data model for a minimal social‑media style prototype.
Designed to run on SQLite for local development but portable to PostgreSQL
(or another full‑featured RDBMS) when you outgrow a single‑file DB.

Key design choices
------------------
* **UUID primary keys** (stringified) to avoid autoincrement ID clashes when
  sharding or bulk‑importing between environments.
* Timestamp columns (`created_at`) for basic ordering and analytics.
* Soft‑delete flag on Post so that content can be hidden without breaking
  foreign‑key constraints.
* Separate **Media** table allowing each Post to carry 0‑n pieces of media
  (image, audio, video).  Only URL metadata lives here – binary assets should
  be stored in object storage (S3, GCS…) not inside the DB.
* Association tables for **Like** and **Follow** using composite PKs for fast
  existence queries ("has user already liked this post?").
* Self‑referencing Comment table supports threaded replies.

Feel free to add more (Tags, Notifications, DirectMessages, etc.).
"""

import uuid
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

# the "db" instance will be initialised in app.py

db: SQLAlchemy = SQLAlchemy()


def _uuid() -> str:
    """Generate a random UUID4 string."""
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Helper for timezone‑aware timestamps
# ---------------------------------------------------------------------------
_now_utc = lambda: datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    # relationships
    posts = db.relationship("Post", backref="author", lazy="dynamic", cascade="all, delete-orphan")
    comments = db.relationship("Comment", backref="author", lazy="dynamic", cascade="all, delete-orphan")
    likes = db.relationship("Like", backref="user", lazy="dynamic", cascade="all, delete-orphan")

    following = db.relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        backref="follower",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    followers = db.relationship(
        "Follow",
        foreign_keys="Follow.followed_id",
        backref="followed",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:  # pragma: no cover – debug convenience
        return f"<User {self.username}>"


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    text = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)

    # relationships
    media = db.relationship("Media", backref="post", lazy="dynamic", cascade="all, delete-orphan")
    comments = db.relationship("Comment", backref="post", lazy="dynamic", cascade="all, delete-orphan")
    likes = db.relationship("Like", backref="post", lazy="dynamic", cascade="all, delete-orphan")


class Media(db.Model):
    __tablename__ = "media"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), nullable=False, index=True)

    media_type = db.Column(db.String(20), nullable=False)  # image | audio | video
    url = db.Column(db.String(255), nullable=False)

    # optional metadata – helpful for clients but not required
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    duration = db.Column(db.Float)  # seconds, only for audio/video

    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)

    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    # threaded replies (self‑referencing FK)
    parent_id = db.Column(db.String(36), db.ForeignKey("comments.id"))
    replies = db.relationship(
        "Comment",
        backref=db.backref("parent", remote_side=[id]),
        lazy="dynamic",
        cascade="all, delete-orphan",
    )


class Like(db.Model):
    __tablename__ = "likes"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    # Composite PK makes existence checks O(1) and naturally prevents duplicates.


class Follow(db.Model):
    __tablename__ = "follows"

    follower_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    followed_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    # follower_id + followed_id composite PK prevents duplicate follow rows.
