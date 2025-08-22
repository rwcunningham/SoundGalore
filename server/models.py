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
"""

import uuid
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

# the "db" instance will be initialised in app.py

db: SQLAlchemy = SQLAlchemy()


def _uuid() -> str:
    """Generate a random UUID4 string."""
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Helper for timezone‑aware timestamps
# ---------------------------------------------------------------------------
_now_utc = lambda: datetime.now(timezone.utc)


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    # relationships (these don't affect the actual database, they just )
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
        foreign_keys="Follow.followee_id",
        backref="followed",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    def set_password(self, raw_pw: str) -> None:
        self.password_hash = generate_password_hash(raw_pw, method="pbkdf2:sha256")

    def check_password(self, raw_pw: str) -> bool:
        return check_password_hash(self.password_hash, raw_pw) #werkzeug method to check password



    def feed(self, *, limit: int = 20, before: datetime | None = None):
        """
        Return a query for the most-recent, non-deleted Posts written by
        accounts this user follows.

        • Key-set pagination: pass `before` = last-seen `created_at` timestamp.
        • Change `limit` for page size / infinite scroll window.
        """
        q = (
            Post.query
            .join(Follow, Follow.followee_id == Post.user_id)
            .filter(
                Follow.follower_id == self.id,    # only whom *I* follow
                Post.is_deleted.is_(False),       # hide soft-deleted
            )
        )
        if before is not None:                    # key-set pagination
            q = q.filter(Post.created_at < before)

        return (
            q.order_by(Post.created_at.desc())    # newest first
             .limit(limit)
             .options(                            # avoid N+1 later
                 db.subqueryload(Post.media),
                 db.subqueryload(Post.author)
             )
        )


    def __repr__(self) -> str:  # pragma: no cover – debug convenience
        return f"<User {self.username}>"

# id, user_id, text, created_at, is_deleted, 
class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    text = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    image_media_id =db.Column(db.String(36), db.ForeignKey("media.id"))
    audio_media_id = db.Column(db.String(36), db.ForeignKey("media.id"))

    # relationships
    comments = db.relationship("Comment", backref="post", lazy="dynamic", cascade="all, delete-orphan")
    likes = db.relationship("Like", backref="post", lazy="dynamic", cascade="all, delete-orphan")
    image = db.relationship("Media", foreign_keys=[image_media_id])
    audio = db.relationship("Media", foreign_keys=[audio_media_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "text": self.text,
            "created_at": self.created_at.isoformat(),
            "media": [m.url for m in self.media]
        }


#id, post_id, media_type, url, width, height, duration, created_at
class Media(db.Model):
    __tablename__ = "media"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    #post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), nullable=True, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True)

    media_type = db.Column(db.String(20), nullable=False)  # image | audio | video
    url = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)

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
    
    # follower_id + followee_id composite PK prevents duplicate follow rows.
    follower_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    followee_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    # Index going both: slows down writes, but we can retrieve the followers and follows more quickly 
    __table_args__ = (
        db.Index("ix_follower_follow_created","follower_id", "created_at"),
        db.Index("ix_follow_followed_created", "followee_id", "created_at"),
        db.CheckConstraint('follower_id != followee_id', name='ck_no_self_follow')
    )

    
