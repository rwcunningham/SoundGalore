# server/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user
from flask_login import login_required, current_user

from dotenv import load_dotenv

import os
from datetime import datetime
from pathlib import Path
from models import db, User, Post, Media, Comment, Like, Follow

load_dotenv() #loads all the environment variables in .\.env

# ------------------------------------------------------------------------------------
# Flask + SQLAlchemy setup
# ------------------------------------------------------------------------------------
app = Flask(__name__, static_folder="../client/soundgalore-gen1/build", static_url_path="/")
CORS(app, origins=["https://localhost:3000"], supports_credentials=True)

#Prepare Authentication
login_manager = LoginManager(app)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-only-change-me") #Secret Key is "secure envelope that seals your cookies" 


# DB location: use env var if present, otherwise local SQLite file
basedir = Path(__file__).resolve().parent
default_sqlite = "sqlite:///" + str(basedir / "data.db")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", default_sqlite)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


# ------------------------------------------------------------------
# DB initialisation – run once when this module is imported
# ------------------------------------------------------------------
def init_database() -> None:
    """Create empty tables if they don’t exist (Flask ≥ 3)."""
    with app.app_context():        # push app context so SQLAlchemy can work
        db.create_all()

init_database()                    # ← runs immediately

# Create the "User Loader"
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)


# ------------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------------

@app.route("/api/ping")
def ping():
    return {"msg": "pong"}

@app.route("/api/media", methods=["POST"])
@login_required
def upload_media():
    data = request.get_json(force=True)       # ensure JSON body
    new_media = Media(url=data["url"])
    db.session.add(new_media)
    db.session.commit()
    return {"status": "ok", "id": new_media.id}, 201

@app.route("/api/media", methods=["GET"])
def list_media():
    media = Media.query.all()
    return jsonify([{"id": t.id, "title": t.title, "fileUrl": t.url} for t in media])


@app.route("/api/feed", methods=["GET"])
@login_required
def api_feed():
    cache_size = 20
    # `before` comes from ?before=2025-06-27T17:05:23.736481+00:00
    before_ts = request.args.get("before")
    before_dt = datetime.fromisoformat(before_ts) if before_ts else None

    posts = current_user.feed(limit=cache_size, before=before_dt).all()
    return jsonify([p.to_dict() for p in posts])


@app.post("/api/users")
def create_user():

    data = request.get_json(force=True)
    user = User(username=data["username"], email=data["email"])
    user.set_password(data["password"])

    #
    # 1. Data Validation Step:
    #

    required = ["username","email","password"]
    missing = []
    for attribute in required:
        if not data.get(attribute):
            missing += attribute
    if missing:
        return {"error":f"missing fields: {','.join(missing)}"}, 400


    db.session.add(user)
    try:
        db.commit()
    except:
        db.session.rollback()
        return {"error":"session session already exists"}, 409
    
    return {"id":user.id, 
            "username":user.username, 
            "email":user.email}, 201


@app.post("/api/follows")
def create_follow():
    data = request.get_json(force=True)
    follow = Follow(follower_id = data.follower_id, followed_id = data.followed_id)
    
    #1. data validation step:
    required = ["follower_id", "followed_id"]
    missing = []
    for attribute in required:
        if not data.get(attribute):
            missing += attribute

    if missing:
        return {"error":"missing follower or followed"}, 400


    db.session.add(follow)
    try:
        db.commit()
    except:
        db.session.rollback()
        return{"error":"the follow probably already exists"}, 409
    
    return {"follower_id":follow.follower_id,
            "followed_id":follow.followed_id,
            "created_at":follow.created_at}






    
    


#login screen will send a POST Request with a JSON that contains username: and password: keys
@app.post("/auth/login")
def login() -> tuple[dict, int]:
    
    # get the data the user entered
    # keys needed: email, password, 
    data = request.get_json(force=True)
    # find the first/only user with that email address:
    user = User.query.filter_by(username=data.get("username")).first()
    if not user:
        return {"error":"invalid username"}, 401
        

    # Authenticate
    if user and user.check_password( # ensure the user exists
        data.get("password","")      # check the password
    ):                               # issues a cookie, stores user.id in cookie
        login_user(
            user,
            remember=data.get("remember", False) #remember user if they checked the box
        )
        return {
            "msg":"logged-in",
            "id" : user.id
        }, 200
    return {"error":"invalid credentials"}, 401

@app.post("/auth/logout")
@login_required
def logout():
    logout_user()
    return {"msg":"logged out"}


# ------------------------------------------------------------------------------------
# Serve React build (production)
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

# ------------------------------------------------------------------------------------
# create an example user for our table

if __name__ == "__main__":
    app.run(debug=True)
