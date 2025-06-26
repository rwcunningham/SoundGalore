# server/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path
from models import db, User, Post, Media, Comment, Like, Follow

# ------------------------------------------------------------------------------------
# Flask + SQLAlchemy setup
# ------------------------------------------------------------------------------------
app = Flask(__name__, static_folder="../client/soundgalore-gen1/build", static_url_path="/")
CORS(app)

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

# ------------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------------
@app.route("/api/ping")
def ping():
    return {"msg": "pong"}

@app.route("/api/media", methods=["POST"])
def upload_media():
    data = request.get_json(force=True)       # ensure JSON body
    new_media = Media(title=data["title"], file_url=data["fileUrl"])
    db.session.add(new_media)
    db.session.commit()
    return {"status": "ok", "id": new_media.id}, 201

@app.route("/api/media", methods=["GET"])
def list_media():
    media = Media.query.all()
    return jsonify([{"id": t.id, "title": t.title, "fileUrl": t.file_url} for t in media])

# ------------------------------------------------------------------------------------
# Serve React build (production)
# ------------------------------------------------------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path: str):
    target = Path(app.static_folder) / path
    if path and target.exists():
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

# ------------------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
