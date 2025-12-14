"""
Migration script to add color2 and color3 columns to the teams table.
Run this script once to update an existing database.

Usage: python migrate_add_colors.py
"""

import sqlite3

DATABASE_PATH = "./scoreboard.db"

def migrate():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(teams)")
    columns = [col[1] for col in cursor.fetchall()]
    
    migrations_needed = []
    
    if 'color2' not in columns:
        migrations_needed.append("ALTER TABLE teams ADD COLUMN color2 VARCHAR(7)")
        print("Adding color2 column...")
    
    if 'color3' not in columns:
        migrations_needed.append("ALTER TABLE teams ADD COLUMN color3 VARCHAR(7)")
        print("Adding color3 column...")
    
    if not migrations_needed:
        print("No migrations needed - columns already exist!")
        conn.close()
        return
    
    # Run migrations
    for migration in migrations_needed:
        try:
            cursor.execute(migration)
            print(f"  ✓ Executed: {migration}")
        except Exception as e:
            print(f"  ✗ Failed: {migration}")
            print(f"    Error: {e}")
    
    conn.commit()
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
