# server/app.py
from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

from models import db, User, Post, Media, Comment, Like, Follow

load_dotenv()

# ------------------------------------------------------------------------------------
# Flask app setup
# ------------------------------------------------------------------------------------

app = Flask(
    __name__,
    static_folder="../client/soundgalore-gen1/build",
    static_url_path="/",
)

CORS(
    app,
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
)

app.config["TRAP_BAD_REQUEST_ERRORS"] = True
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-only-change-me")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# ------------------------------------------------------------------------------------
# Database setup
# ------------------------------------------------------------------------------------

Path(app.instance_path).mkdir(parents=True, exist_ok=True)
db_path = Path(app.instance_path) / "data.db"

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{db_path}",
)

db.init_app(app)

# ------------------------------------------------------------------------------------
# Upload directories
# ------------------------------------------------------------------------------------

app.config["UPLOAD_AUDIO_DIR"] = os.path.join(app.root_path, "uploads", "audio")
app.config["UPLOAD_IMAGE_DIR"] = os.path.join(app.root_path, "uploads", "images")

os.makedirs(app.config["UPLOAD_AUDIO_DIR"], exist_ok=True)
os.makedirs(app.config["UPLOAD_IMAGE_DIR"], exist_ok=True)

# ------------------------------------------------------------------------------------
# Login setup
# ------------------------------------------------------------------------------------

login_manager = LoginManager(app)


@login_manager.user_loader
def load_user(user_id: str):
    return db.session.get(User, user_id)


# ------------------------------------------------------------------------------------
# DB initialization
# ------------------------------------------------------------------------------------

def init_database() -> None:
    with app.app_context():
        db.create_all()


init_database()

# ------------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------------

def make_unique_upload_filename(original_filename: str) -> str:
    safe_name = secure_filename(original_filename)

    stem = Path(safe_name).stem
    suffix = Path(safe_name).suffix

    if not stem:
        stem = "upload"

    if not suffix:
        suffix = ".jpg"

    return f"{stem}-{uuid4().hex}{suffix}"


USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_new_user(username: str, email: str, password: str) -> str | None:
    if not USERNAME_RE.fullmatch(username):
        return "Username must be 3-30 characters and can only contain letters, numbers, and underscores."

    if not EMAIL_RE.fullmatch(email):
        return "Please enter a valid email address."

    if len(password) < 8:
        return "Password must be at least 8 characters long."

    if len(password) > 72:
        return "Password must be 72 characters or fewer."

    if any(ch.isspace() for ch in password):
        return "Password cannot contain spaces."

    if not re.search(r"[A-Za-z]", password):
        return "Password must contain at least one letter."

    if not re.search(r"\d", password):
        return "Password must contain at least one number."

    return None


def save_profile_image(profile_image_file):
    if not profile_image_file:
        return None

    profile_image_filename = make_unique_upload_filename(profile_image_file.filename)

    profile_image_dest_path = os.path.join(
        app.config["UPLOAD_IMAGE_DIR"],
        profile_image_filename,
    )

    profile_image_file.save(profile_image_dest_path)

    return f"/images/{profile_image_filename}"


def comment_to_dict(comment):
    like_count = Like.query.filter_by(comment_id=comment.id).count()
    liked_by_current_user = (
        Like.query
        .filter_by(user_id=current_user.id, comment_id=comment.id)
        .first()
        is not None
    )

    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "username": comment.author.username,
        "display_name": comment.author.display_name or comment.author.username,
        "profile_image_url": comment.author.profile_image_url,
        "body": comment.body,
        "created_at": comment.created_at.isoformat(),
        "like_count": like_count,
        "liked_by_current_user": liked_by_current_user,
    }


# ------------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------------

@app.route("/api/ping")
def ping():
    return {"msg": "pong"}


@app.route("/api/get_current_user")
@login_required
def get_current_user():
    return jsonify(
        {
            "current_user_id": current_user.id,
            "current_user_username": current_user.username,
            "current_user_display_name": current_user.display_name or current_user.username,
            "current_user_email": current_user.email,
            "current_user_profile_image_url": current_user.profile_image_url,
        }
    ), 200


@app.get("/api/my_followees")
@login_required
def my_followees():
    rows = (
        db.session.query(
            Follow.follower_id,
            Follow.followee_id,
            User.username.label("followee_name"),
            User.display_name.label("followee_display_name"),
            User.profile_image_url.label("followee_profile_image_url"),
            Follow.created_at,
        )
        .join(User, User.id == Follow.followee_id)
        .filter(Follow.follower_id == current_user.id)
        .order_by(Follow.created_at.desc())
        .all()
    )

    result = [
        {
            "follower_id": row.follower_id,
            "followee_id": row.followee_id,
            "followee_name": row.followee_name,
            "followee_display_name": row.followee_display_name or row.followee_name,
            "followee_profile_image_url": row.followee_profile_image_url,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]

    return jsonify(result), 200


@app.get("/api/my_followers")
@login_required
def my_followers():
    rows = (
        db.session.query(
            Follow.followee_id,
            Follow.follower_id,
            User.username.label("follower_name"),
            User.display_name.label("follower_display_name"),
            User.profile_image_url.label("follower_profile_image_url"),
            Follow.created_at,
        )
        .join(User, User.id == Follow.follower_id)
        .filter(Follow.followee_id == current_user.id)
        .order_by(Follow.created_at.desc())
        .all()
    )

    result = [
        {
            "followee_id": row.followee_id,
            "follower_id": row.follower_id,
            "follower_name": row.follower_name,
            "follower_display_name": row.follower_display_name or row.follower_name,
            "follower_profile_image_url": row.follower_profile_image_url,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]

    return jsonify(result), 200


@app.route("/api/upload_media", methods=["POST"])
@login_required
def upload_media():
    audio_file = request.files.get("audioFile")
    image_file = request.files.get("imageFile")

    if not audio_file:
        return jsonify({"error": "post to /api/upload_media was missing audio file"}), 400

    if not image_file:
        return jsonify({"error": "post to /api/upload_media was missing image file"}), 400

    audio_filename = make_unique_upload_filename(audio_file.filename)
    image_filename = make_unique_upload_filename(image_file.filename)

    audio_dest_path = os.path.join(app.config["UPLOAD_AUDIO_DIR"], audio_filename)
    image_dest_path = os.path.join(app.config["UPLOAD_IMAGE_DIR"], image_filename)

    audio_file.save(audio_dest_path)
    image_file.save(image_dest_path)

    audio_url = f"/audio/{audio_filename}"
    image_url = f"/images/{image_filename}"

    try:
        audio_media_entry = Media(
            media_type="audio",
            url=audio_url,
            filename=audio_filename,
            user_id=current_user.id,
        )

        image_media_entry = Media(
            media_type="image",
            url=image_url,
            filename=image_filename,
            user_id=current_user.id,
        )

        db.session.add_all([audio_media_entry, image_media_entry])
        db.session.flush()

        post_title = request.form.get("title", "").strip()
        post_description = request.form.get("description", "")

        if not post_title:
            db.session.rollback()
            return jsonify({"error": "missing title"}), 400

        new_post_entry = Post(
            user_id=current_user.id,
            title=post_title,
            is_deleted=False,
            description=post_description,
            image_media_id=image_media_entry.id,
            audio_media_id=audio_media_entry.id,
        )

        db.session.add(new_post_entry)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        app.logger.exception("Upload failed")
        return jsonify({"error": str(e)}), 500

    return jsonify(
        {
            "post_title": post_title,
            "post_description": post_description,
            "audio_url": audio_url,
            "audio_timestamp": audio_media_entry.created_at.isoformat(),
            "audio_media_id": audio_media_entry.id,
            "image_url": image_url,
            "imageTimestamp": image_media_entry.created_at.isoformat(),
            "image_media_id": image_media_entry.id,
            "new_post_id": new_post_entry.id,
        }
    ), 201


@app.route("/audio/<path:filename>")
def serve_audio(filename: str):
    return send_from_directory(app.config["UPLOAD_AUDIO_DIR"], filename)


@app.route("/images/<path:filename>")
def serve_image(filename: str):
    return send_from_directory(app.config["UPLOAD_IMAGE_DIR"], filename)


@app.post("/api/posts")
@login_required
def create_post():
    data = request.get_json(force=True)

    title = data.get("title", "").strip()
    description = data.get("description", "")
    image_media_id = data.get("image_media_id")
    audio_media_id = data.get("audio_media_id")
    is_deleted = data.get("is_deleted", False)

    if not title:
        return jsonify({"error": "missing title"}), 400

    new_post = Post(
        user_id=current_user.id,
        title=title,
        description=description,
        is_deleted=is_deleted,
        image_media_id=image_media_id,
        audio_media_id=audio_media_id,
    )

    db.session.add(new_post)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.exception("Create post failed")
        return jsonify({"error": str(e)}), 500

    return jsonify(new_post.to_dict()), 201


@app.route("/api/media", methods=["GET"])
def list_media():
    media = Media.query.all()

    return jsonify(
        [
            {
                "id": item.id,
                "media_type": item.media_type,
                "fileUrl": item.url,
                "filename": item.filename,
            }
            for item in media
        ]
    ), 200


@app.route("/api/user_profile", methods=["GET"])
@login_required
def api_user_profile():
    cache_size = 20
    before_ts = request.args.get("before")
    before_dt = datetime.fromisoformat(before_ts) if before_ts else None

    posts_query = (
        Post.query
        .filter(
            Post.user_id == current_user.id,
            Post.is_deleted.is_(False),
        )
    )

    if before_dt is not None:
        posts_query = posts_query.filter(Post.created_at < before_dt)

    posts = (
        posts_query
        .order_by(Post.created_at.desc())
        .limit(cache_size)
        .options(
            db.selectinload(Post.image),
            db.selectinload(Post.audio),
            db.selectinload(Post.author),
        )
        .all()
    )

    return jsonify([post.to_dict() for post in posts]), 200


@app.route("/api/user_profile/<user_id>", methods=["GET"])
@login_required
def api_user_profile_by_id(user_id):
    cache_size = 20
    before_ts = request.args.get("before")
    before_dt = datetime.fromisoformat(before_ts) if before_ts else None

    profile_user = db.session.get(User, user_id)

    if profile_user is None:
        return jsonify({"error": "user not found"}), 404

    posts_query = (
        Post.query
        .filter(
            Post.user_id == user_id,
            Post.is_deleted.is_(False),
        )
    )

    if before_dt is not None:
        posts_query = posts_query.filter(Post.created_at < before_dt)

    posts = (
        posts_query
        .order_by(Post.created_at.desc())
        .limit(cache_size)
        .options(
            db.selectinload(Post.image),
            db.selectinload(Post.audio),
            db.selectinload(Post.author),
        )
        .all()
    )

    existing_follow = Follow.query.filter_by(
        follower_id=current_user.id,
        followee_id=profile_user.id,
    ).first()

    return jsonify({
        "user": {
            "id": profile_user.id,
            "username": profile_user.username,
            "display_name": profile_user.display_name or profile_user.username,
            "profile_image_url": profile_user.profile_image_url,
            "is_current_user": profile_user.id == current_user.id,
            "is_following": existing_follow is not None,
        },
        "posts": [post.to_dict() for post in posts],
    }), 200


@app.route("/api/feed", methods=["GET"])
@login_required
def api_feed():
    cache_size = 20
    before_ts = request.args.get("before")
    before_dt = datetime.fromisoformat(before_ts) if before_ts else None

    posts = current_user.feed(limit=cache_size, before=before_dt).all()

    return jsonify([post.to_dict() for post in posts]), 200


@app.post("/api/users")
def create_user():
    username = request.form.get("username", "").strip()
    display_name = request.form.get("display_name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    profile_image_file = request.files.get("profileImage")

    required = {
        "username": username,
        "email": email,
        "password": password,
    }

    missing = [field for field, value in required.items() if not value]

    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    validation_error = validate_new_user(username, email, password)

    if validation_error:
        return jsonify({"error": validation_error}), 400

    existing_username = User.query.filter_by(username=username).first()

    if existing_username:
        return jsonify({"error": "That username is already taken."}), 409

    existing_email = User.query.filter_by(email=email).first()

    if existing_email:
        return jsonify({"error": "That email is already in use."}), 409

    profile_image_url = save_profile_image(profile_image_file)

    user = User(
        username=username,
        display_name=display_name or username,
        email=email,
        profile_image_url=profile_image_url,
    )

    user.set_password(password)

    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Username or email already exists."}), 409
    except Exception:
        db.session.rollback()
        app.logger.exception("Create user failed")
        return jsonify({"error": "Could not create user."}), 500

    return jsonify({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "profile_image_url": user.profile_image_url,
    }), 201


@app.post("/api/follows")
@login_required
def create_follow():
    data = request.get_json(force=True)

    followee_id = data.get("followee_id")

    if not followee_id:
        return jsonify({"error": "missing followee_id"}), 400

    if followee_id == current_user.id:
        return jsonify({"error": "you cannot follow yourself"}), 400

    followee = db.session.get(User, followee_id)

    if followee is None:
        return jsonify({"error": "user not found"}), 404

    existing_follow = Follow.query.filter_by(
        follower_id=current_user.id,
        followee_id=followee_id,
    ).first()

    if existing_follow:
        return jsonify({
            "msg": "already following",
            "follower_id": current_user.id,
            "followee_id": followee_id,
        }), 200

    follow = Follow(
        follower_id=current_user.id,
        followee_id=followee_id,
    )

    db.session.add(follow)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        app.logger.exception("Create follow failed")
        return jsonify({"error": "could not follow user"}), 500

    return jsonify({
        "follower_id": follow.follower_id,
        "followee_id": follow.followee_id,
        "created_at": follow.created_at.isoformat(),
    }), 201


@app.post("/auth/login")
def login() -> tuple[dict, int]:
    data = request.get_json(force=True)

    user = User.query.filter_by(username=data.get("username")).first()

    if not user:
        return {"error": "invalid username"}, 401

    if user.check_password(data.get("password", "")):
        login_user(user, remember=data.get("remember", False))

        return {
            "msg": "logged-in",
            "id": user.id,
        }, 200

    return {"error": "invalid credentials"}, 401


@app.post("/auth/logout")
@login_required
def logout():
    logout_user()

    return {"msg": "logged out"}, 200


@app.get("/api/posts/<post_id>/comments")
@login_required
def get_post_comments(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "post not found"}), 404

    comments = (
        Comment.query
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .all()
    )

    post_like_count = Like.query.filter_by(post_id=post_id).count()
    post_liked_by_current_user = (
        Like.query
        .filter_by(user_id=current_user.id, post_id=post_id)
        .first()
        is not None
    )

    return jsonify({
        "post_like_count": post_like_count,
        "post_liked_by_current_user": post_liked_by_current_user,
        "comments": [comment_to_dict(comment) for comment in comments],
    }), 200


@app.post("/api/posts/<post_id>/comments")
@login_required
def create_comment(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "post not found"}), 404

    data = request.get_json(force=True)
    body = data.get("body", "").strip()

    if not body:
        return jsonify({"error": "missing comment body"}), 400

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        body=body,
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify(comment_to_dict(comment)), 201


@app.post("/api/posts/<post_id>/like")
@login_required
def toggle_post_like(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "post not found"}), 404

    existing_like = Like.query.filter_by(
        user_id=current_user.id,
        post_id=post_id,
    ).first()

    if existing_like:
        db.session.delete(existing_like)
        liked = False
    else:
        db.session.add(Like(
            user_id=current_user.id,
            post_id=post_id,
        ))
        liked = True

    db.session.commit()

    like_count = Like.query.filter_by(post_id=post_id).count()

    return jsonify({
        "liked": liked,
        "like_count": like_count,
    }), 200


@app.post("/api/comments/<comment_id>/like")
@login_required
def toggle_comment_like(comment_id):
    comment = db.session.get(Comment, comment_id)

    if comment is None:
        return jsonify({"error": "comment not found"}), 404

    existing_like = Like.query.filter_by(
        user_id=current_user.id,
        comment_id=comment_id,
    ).first()

    if existing_like:
        db.session.delete(existing_like)
        liked = False
    else:
        db.session.add(Like(
            user_id=current_user.id,
            comment_id=comment_id,
        ))
        liked = True

    db.session.commit()

    like_count = Like.query.filter_by(comment_id=comment_id).count()

    return jsonify({
        "liked": liked,
        "like_count": like_count,
    }), 200


@app.get("/api/users/search")
@login_required
def search_users():
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify([]), 200

    query_lower = query.lower()

    matching_users = (
        User.query
        .filter(
            User.id != current_user.id,
            db.func.lower(User.username).contains(query_lower),
        )
        .limit(25)
        .all()
    )

    matching_users.sort(
        key=lambda user: (
            user.username.lower() != query_lower,
            not user.username.lower().startswith(query_lower),
            len(user.username),
            user.username.lower(),
        )
    )

    matching_users = matching_users[:7]

    followed_user_ids = set()

    if matching_users:
        following_rows = (
            Follow.query
            .filter(
                Follow.follower_id == current_user.id,
                Follow.followee_id.in_([user.id for user in matching_users]),
            )
            .all()
        )

        followed_user_ids = {row.followee_id for row in following_rows}

    return jsonify([
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name or user.username,
            "profile_image_url": user.profile_image_url,
            "is_following": user.id in followed_user_ids,
        }
        for user in matching_users
    ]), 200


@app.errorhandler(400)
def handle_400(e):
    app.logger.exception("400 on %s: %s", request.path, e)

    try:
        app.logger.info("Headers: %s", dict(request.headers))
    except Exception:
        pass

    return jsonify(error=str(e)), 400


# ------------------------------------------------------------------------------------
# Serve React build
# ------------------------------------------------------------------------------------

@app.route("/login")
@app.route("/dashboard")
@app.route("/settings")
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path: str):
    target = Path(app.static_folder) / path

    if path and target.exists():
        return send_from_directory(app.static_folder, path)

    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)