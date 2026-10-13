"""
Migration script to add team_id to user_follows (following a team for notifications).
Run this script once to update the database schema. Non-destructive: it only adds a column.
"""

import sqlite3
import os

# Get the database path
db_path = os.environ.get("DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "scoreboard.db"))

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(user_follows)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'team_id' not in columns:
        print("Adding team_id column to user_follows table...")
        cursor.execute("ALTER TABLE user_follows ADD COLUMN team_id VARCHAR REFERENCES teams(id) ON DELETE CASCADE")
        conn.commit()
        print("Migration complete!")
    else:
        print("Column team_id already exists, skipping migration.")

    conn.close()

if __name__ == "__main__":
    migrate()
