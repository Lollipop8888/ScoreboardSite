"""
Migration script to add game_unit_label to leagues and game_unit to games tables.
Run this once to update the database schema.
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('scoreboard.db')
    cursor = conn.cursor()
    
    # Check if game_unit_label column exists in leagues table
    cursor.execute("PRAGMA table_info(leagues)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'game_unit_label' not in columns:
        print("Adding game_unit_label column to leagues table...")
        cursor.execute("ALTER TABLE leagues ADD COLUMN game_unit_label VARCHAR(50)")
        print("Done!")
    else:
        print("game_unit_label column already exists in leagues table")
    
    # Check if game_unit column exists in games table
    cursor.execute("PRAGMA table_info(games)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'game_unit' not in columns:
        print("Adding game_unit column to games table...")
        cursor.execute("ALTER TABLE games ADD COLUMN game_unit INTEGER")
        print("Done!")
    else:
        print("game_unit column already exists in games table")
    
    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
