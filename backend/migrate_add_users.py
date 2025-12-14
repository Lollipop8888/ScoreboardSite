"""
Migration script to add users table and owner_id to leagues.
Run this script to update the database schema.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "scoreboard.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("Users table created/verified.")
    
    # Check if leagues table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='leagues'")
    if cursor.fetchone():
        # Check if owner_id column exists in leagues
        cursor.execute("PRAGMA table_info(leagues)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'owner_id' not in columns:
            print("Adding owner_id column to leagues table...")
            cursor.execute("ALTER TABLE leagues ADD COLUMN owner_id TEXT REFERENCES users(id)")
            print("owner_id column added successfully!")
        else:
            print("owner_id column already exists in leagues table.")
        
        # Create index for leagues owner_id
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leagues_owner_id ON leagues(owner_id)")
    else:
        print("Leagues table doesn't exist yet - will be created when app starts.")
    
    # Create indexes for better performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
    
    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
