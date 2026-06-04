from __future__ import annotations

"""
Flask-SQLAlchemy data model for a minimal social-media style prototype.
"""

import uuid
from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db: SQLAlchemy = SQLAlchemy()


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_utc():
    return datetime.now(timezone.utc)


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    profile_image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)

    posts = db.relationship(
        "Post",
        backref="author",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    comments = db.relationship(
        "Comment",
        backref="author",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    likes = db.relationship(
        "Like",
        backref="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

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
        return check_password_hash(self.password_hash, raw_pw)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name or self.username,
            "profile_image_url": self.profile_image_url,
        }

    def feed(self, *, limit: int = 20, before: datetime | None = None):
        q = (
            Post.query
            .join(Follow, Follow.followee_id == Post.user_id)
            .filter(
                Follow.follower_id == self.id,
                Post.is_deleted.is_(False),
            )
        )

        if before is not None:
            q = q.filter(Post.created_at < before)

        return (
            q.order_by(Post.created_at.desc())
            .limit(limit)
            .options(
                db.selectinload(Post.image),
                db.selectinload(Post.audio),
                db.selectinload(Post.author),
            )
        )

    def __repr__(self) -> str:
        return f"<User {self.username}>"


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)

    image_media_id = db.Column(db.String(36), db.ForeignKey("media.id"))
    audio_media_id = db.Column(db.String(36), db.ForeignKey("media.id"))

    comments = db.relationship(
        "Comment",
        backref="post",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    likes = db.relationship(
        "Like",
        backref="post",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    image = db.relationship("Media", foreign_keys=[image_media_id])
    audio = db.relationship("Media", foreign_keys=[audio_media_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.author.username,
            "title": self.title,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "image_url": self.image.url if self.image else None,
            "audio_url": self.audio.url if self.audio else None,
            "author": {
                "id": self.author.id,
                "username": self.author.username,
                "display_name": self.author.display_name or self.author.username,
                "profile_image_url": self.author.profile_image_url,
            },
        }


class Media(db.Model):
    __tablename__ = "media"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), index=True)

    media_type = db.Column(db.String(20), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)

    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    duration = db.Column(db.Float)

    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)

    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    parent_id = db.Column(db.String(36), db.ForeignKey("comments.id"))

    replies = db.relationship(
        "Comment",
        backref=db.backref("parent", remote_side=[id]),
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    likes = db.relationship(
        "Like",
        backref="comment",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )


class Like(db.Model):
    __tablename__ = "likes"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    post_id = db.Column(db.String(36), db.ForeignKey("posts.id"), nullable=True, index=True)
    comment_id = db.Column(db.String(36), db.ForeignKey("comments.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "post_id", name="uq_user_post_like"),
        db.UniqueConstraint("user_id", "comment_id", name="uq_user_comment_like"),
    )


class Follow(db.Model):
    __tablename__ = "follows"

    follower_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    followee_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now_utc, nullable=False)

    __table_args__ = (
        db.Index("ix_follower_follow_created", "follower_id", "created_at"),
        db.Index("ix_follow_followed_created", "followee_id", "created_at"),
        db.CheckConstraint("follower_id != followee_id", name="ck_no_self_follow"),
    )