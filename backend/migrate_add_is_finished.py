"""
Migration script to add is_finished column to leagues table.
Run this script once to update the database schema.
"""

import sqlite3
import os

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), 'scoreboard.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(leagues)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'is_finished' not in columns:
        print("Adding is_finished column to leagues table...")
        cursor.execute("ALTER TABLE leagues ADD COLUMN is_finished BOOLEAN DEFAULT 0")
        conn.commit()
        print("Migration complete!")
    else:
        print("Column is_finished already exists, skipping migration.")
    
    conn.close()

if __name__ == "__main__":
    migrate()
