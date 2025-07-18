# seed_users.py

from models import db, User
from app import app

def create_test_users():
    with app.app_context():
        db.create_all()  # Ensures tables exist

        # Example users
        test_users = [
            {"username": "alice", "email": "alice@example.com", "password": "password123"},
            {"username": "bob", "email": "bob@example.com", "password": "securepass"},
            {"username": "charlie", "email": "charlie@example.com", "password": "charliepw"},
        ]

        for u in test_users:
            # Avoid duplicating users if run multiple times
            if not User.query.filter_by(username=u["username"]).first():
                user = User(username=u["username"], email=u["email"])
                user.set_password(u["password"])
                db.session.add(user)

        db.session.commit()
        print("Test users created successfully.")

if __name__ == "__main__":
    create_test_users()
