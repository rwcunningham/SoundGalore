import sqlite3
from pathlib import Path

# Always use the instance DB
DB_PATH = Path(__file__).parent / "instance" / "data.db"
print("Using DB at:", DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", cur.fetchall())

# Posts
cur.execute("""
  SELECT id, user_id, text, image_media_id, audio_media_id, created_at
  FROM posts
  ORDER BY datetime(created_at) DESC
  LIMIT 10
""")
print("POSTS:", cur.fetchall())

# Media
cur.execute("""
  SELECT id, media_type, url, filename, user_id, created_at
  FROM media
  ORDER BY datetime(created_at) DESC
  LIMIT 10
""")
print("MEDIA:", cur.fetchall())

# Schemas
cur.execute("PRAGMA table_info(posts)")
print("posts schema:", cur.fetchall())

cur.execute("PRAGMA table_info(media)")
print("media schema:", cur.fetchall())

conn.close()
