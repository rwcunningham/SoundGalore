# seed_more.py

from __future__ import annotations

from app import app
from models import db, User, Follow


NEW_USERS = [
    # username, email, password
    ("dave",    "dave@example.com",    "test1234"),
    ("erin",    "erin@example.com",    "test1234"),
    ("frank",   "frank@example.com",   "test1234"),
    ("grace",   "grace@example.com",   "test1234"),
    ("heidi",   "heidi@example.com",   "test1234"),
    ("ivan",    "ivan@example.com",    "test1234"),
    ("judy",    "judy@example.com",    "test1234"),
    ("mallory", "mallory@example.com", "test1234"),
    ("oscar",   "oscar@example.com",   "test1234"),
    ("peggy",   "peggy@example.com",   "test1234"),
]


# Define follow relationships by username pairs: (follower, followee)
FOLLOW_EDGES = [
    # Involving existing users
    ("alice", "bob"),
    ("alice", "charlie"),
    ("bob",   "alice"),
    ("charlie", "alice"),

    # Between new users
    ("dave", "erin"),
    ("erin", "frank"),
    ("frank", "grace"),
    ("grace", "heidi"),
    ("heidi", "ivan"),
    ("ivan", "judy"),
    ("judy", "mallory"),
    ("mallory", "oscar"),
    ("oscar", "peggy"),
    ("peggy", "dave"),  # close the loop

    # Some cross-links
    ("dave", "alice"),
    ("erin", "alice"),
    ("frank", "bob"),
    ("grace", "charlie"),
    ("heidi", "bob"),
    ("ivan", "charlie"),
]


def get_user_map_by_username(usernames: set[str]) -> dict[str, User]:
    """Fetch users by username and return a {username: User} map."""
    if not usernames:
        return {}
    users = User.query.filter(User.username.in_(usernames)).all()
    return {u.username: u for u in users}


def ensure_users():
    """Create the NEW_USERS if they don't already exist."""
    created = 0
    for username, email, password in NEW_USERS:
        exists = User.query.filter_by(username=username).first()
        if exists:
            continue
        u = User(username=username, email=email)
        u.set_password(password)
        db.session.add(u)
        created += 1
    if created:
        db.session.commit()
    return created


def ensure_follows():
    """Create follow edges, skipping duplicates and self-follows."""
    # Make sure we have all mentioned usernames, including existing seeds.
    mentioned = {u for edge in FOLLOW_EDGES for u in edge}
    user_map = get_user_map_by_username(mentioned)

    missing = [u for u in mentioned if u not in user_map]
    if missing:
        # If some of the referenced users don't exist, just skip those edges.
        print(f"Note: skipping follows for unknown users: {', '.join(sorted(missing))}")

    created = 0
    for follower_name, followee_name in FOLLOW_EDGES:
        follower = user_map.get(follower_name)
        followee = user_map.get(followee_name)
        if not follower or not followee:
            continue
        if follower.id == followee.id:
            continue  # respect ck_no_self_follow

        # Composite PK order matches (follower_id, followee_id)
        already = Follow.query.get((follower.id, followee.id))
        if already:
            continue

        db.session.add(Follow(follower_id=follower.id, followee_id=followee.id))
        created += 1

    if created:
        db.session.commit()
    return created


def main():
    with app.app_context():
        db.create_all()  # no-op if tables exist
        users_added = ensure_users()
        follows_added = ensure_follows()

        # Small summary
        total_users = User.query.count()
        total_follows = Follow.query.count()

        print(f"Users added this run:   {users_added}")
        print(f"Follows added this run: {follows_added}")
        print(f"Total users:            {total_users}")
        print(f"Total follows:          {total_follows}")


if __name__ == "__main__":
    main()
