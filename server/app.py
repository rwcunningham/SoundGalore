# server/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from pathlib import Path

# ------------------------------------------------------------------------------------
# Flask + SQLAlchemy setup
# ------------------------------------------------------------------------------------
app = Flask(__name__, static_folder="../client/build", static_url_path="/")
CORS(app)

# DB location: use env var if present, otherwise local SQLite file
basedir = Path(__file__).resolve().parent
default_sqlite = "sqlite:///" + str(basedir / "data.db")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", default_sqlite)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# ------------------------------------------------------------------------------------
# ORM models
# ------------------------------------------------------------------------------------
class User(db.Model):                       # already showed you this earlier
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80),  nullable=False)
    email    = db.Column(db.String(120), nullable=False)

class Track(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    title    = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(255), nullable=False)

# Create tables on first request (fine for small projects / dev)
@app.before_first_request
def create_tables() -> None:
    db.create_all()

# ------------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------------
@app.route("/api/ping")
def ping():
    return {"msg": "pong"}

@app.route("/api/tracks", methods=["POST"])
def upload_track():
    data = request.get_json(force=True)       # ensure JSON body
    new_track = Track(title=data["title"], file_url=data["fileUrl"])
    db.session.add(new_track)
    db.session.commit()
    return {"status": "ok", "id": new_track.id}, 201

@app.route("/api/tracks", methods=["GET"])
def list_tracks():
    tracks = Track.query.all()
    return jsonify([{"id": t.id, "title": t.title, "fileUrl": t.file_url} for t in tracks])

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
