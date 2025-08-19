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

from werkzeug.utils import secure_filename

from PIL import Image #used to get metadata from an image, independent of the type of image

from pathlib import Path


 

load_dotenv() #loads all the environment variables in .\.env

# ------------------------------------------------------------------------------------
# Flask + SQLAlchemy setup
# ------------------------------------------------------------------------------------

app = Flask(__name__, static_folder="../client/soundgalore-gen1/build", static_url_path="/")
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

app.config['TRAP_BAD_REQUEST_ERRORS'] = True

app.config['UPLOAD_AUDIO_DIR'] = os.path.join(app.root_path, 'uploads', 'audio')
app.config['UPLOAD_IMAGE_DIR'] = os.path.join(app.root_path, 'uploads', 'images')
os.makedirs(app.config['UPLOAD_AUDIO_DIR'], exist_ok=True)
os.makedirs(app.config['UPLOAD_IMAGE_DIR'], exist_ok=True)


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


# make sure the instance folder exists
Path(app.instance_path).mkdir(parents=True, exist_ok=True)

db_path = Path(app.instance_path) / "data.db"
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"

# ------------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------------

@app.route("/api/ping")
def ping():
    return {"msg": "pong"}

@app.route("/api/upload_media", methods=["POST"])
@login_required
def upload_media():
    print("upload_media -> form:", request.form.to_dict(), 
      "files:", list(request.files.keys()))

        # ensure JSON body
    audioFile = request.files.get('audioFile') # make sure the request has a key called "file"
    imageFile = request.files.get('imageFile') # 

    if not audioFile:
        return jsonify({'error':'post to api/media was missing audio file'})
    if not imageFile:
        return jsonify({'error':'post to api/media was missing image file'})
    
    audioFilename = secure_filename(audioFile.filename)
    imageFilename = secure_filename(imageFile.filename)
    
    #if (media_type == "audio"):

        #upload the audio
    audio_upload_dir = os.path.normpath(os.path.join(app.root_path, '..','client','soundgalore-gen1','public','audio'))
    #os.makedirs(audio_upload_dir, exist_ok=True)
    #audio_dest_path = os.path.join(audio_upload_dir, audioFilename)
    #audioFile.save(audio_dest_path)
    audio_dest_path = os.path.join(app.config['UPLOAD_AUDIO_DIR'], audioFilename)



    audioUrl = f"/audio/{audioFilename}"
    
    audio_media_entry = Media(media_type='audio', url=audioUrl, filename=audioFilename, user_id=current_user.id)
    db.session.add(audio_media_entry)
    db.session.commit()

    #upload the image
    image_upload_dir = os.path.normpath(os.path.join(app.root_path, '..','client','soundgalore-gen1','public','images'))
    #os.makedirs(image_upload_dir, exist_ok=True)
    #image_dest_path = os.path.join(image_upload_dir, imageFilename)
    #imageFile.save(image_dest_path)
    image_dest_path = os.path.join(app.config['UPLOAD_IMAGE_DIR'], imageFilename)


    imageUrl = f"/images/{imageFilename}"

    image_media_entry = Media(media_type='image', url=imageUrl, filename=imageFilename, user_id=current_user.id)
    db.session.add(image_media_entry)
    db.session.commit()

    try:
        db.session.add_all([audio_media_entry, image_media_entry])
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        app.logger.exception("Upload failed")
        return jsonify({"error": str(e)}), 500
    

    post_description = request.form.get('description')
    new_post_entry = Post(user_id=current_user.id, is_deleted=False, text=post_description, image_media_id=image_media_entry.id, audio_media_id=audio_media_entry.id)

    try:
        db.session.add(new_post_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.exception("New Post Creation failed")
        return jsonify({'error':str(e)}), 500

    return jsonify({'audioUrl':audioUrl, 
                    'audioTimestamp':audio_media_entry.created_at, 
                    'audio_media_id':audio_media_entry.id,
                    'imageUrl':imageUrl,
                    'imageTimestamp':image_media_entry.created_at,
                    'image_media_id':image_media_entry.id,
                    'new_post_id':new_post_entry.id
                    }), 201

    


    
@app.route('/audio/<path:filename>')
def serve_audio(filename):
    return send_from_directory(app.config['UPLOAD_AUDIO_DIR'], filename)

@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_IMAGE_DIR'], filename)

@app.post('/api/posts')
@login_required
def create_post():
    data = request.get_json(force=True)
    # id, user_id, text, created_at, is_deleted, 
    
    user_id = current_user.id
    text = data.get('text','')
    image_media_id = data.get('image_media_id')
    audio_media_id = data.get('audio_media_id')

    created_at = data.get('created_at')
    is_deleted = data.get('is_deleted', False)

    new_post = Post(user_id=user_id, created_at=created_at, is_deleted=is_deleted, text=text, image_media_id=image_media_id, audio_media_id=audio_media_id)
    db.session.add(new_post)
    db.session.commit()

    return jsonify({'user_id':'{new_post.user_id}',
                    'text':'{new_post.text}',
                    'created_at':'{new_post.created_at}',
                    'is_deleted':'{new_post.is_deleted}',
                    'id' : new_post.id}), 201
                    

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


@app.errorhandler(400)
def handle_400(e):
    app.logger.exception("400 on %s: %s", request.path, e)
    # Log what the server actually received at the socket level (if available)
    try:
        app.logger.info("Headers: %s", dict(request.headers))
    except Exception:
        pass
    return jsonify(error=str(e)), 400


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
    app.run(debug=True, use_reloader=False)
