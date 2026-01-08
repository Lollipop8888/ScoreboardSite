"""
Migration script to add seasons support to the database.
Creates:
- seasons table
- team_season_stats table
- season_id column on games table
- Migrates existing leagues to have a default season
"""

import sqlite3
import uuid
from datetime import datetime

DB_PATH = "scoreboard.db"

def generate_uuid():
    return str(uuid.uuid4())

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if seasons table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='seasons'")
    if cursor.fetchone():
        print("seasons table already exists, skipping creation")
    else:
        print("Creating seasons table...")
        cursor.execute("""
            CREATE TABLE seasons (
                id TEXT PRIMARY KEY,
                league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                is_current BOOLEAN DEFAULT 1,
                is_finished BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Done!")
    
    # Check if team_season_stats table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='team_season_stats'")
    if cursor.fetchone():
        print("team_season_stats table already exists, skipping creation")
    else:
        print("Creating team_season_stats table...")
        cursor.execute("""
            CREATE TABLE team_season_stats (
                id TEXT PRIMARY KEY,
                team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                ties INTEGER DEFAULT 0,
                points_for INTEGER DEFAULT 0,
                points_against INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Done!")
    
    # Check if season_id column exists on games
    cursor.execute("PRAGMA table_info(games)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'season_id' not in columns:
        print("Adding season_id column to games table...")
        cursor.execute("ALTER TABLE games ADD COLUMN season_id TEXT REFERENCES seasons(id) ON DELETE CASCADE")
        print("Done!")
    else:
        print("season_id column already exists on games table")
    
    # Migrate existing leagues to have a default season
    print("\nMigrating existing leagues to have default seasons...")
    cursor.execute("SELECT id, name, season FROM leagues")
    leagues = cursor.fetchall()
    
    for league_id, league_name, season_name in leagues:
        # Check if league already has a season
        cursor.execute("SELECT id FROM seasons WHERE league_id = ?", (league_id,))
        existing_season = cursor.fetchone()
        
        if existing_season:
            print(f"  League '{league_name}' already has a season, skipping")
            continue
        
        # Create a default season using the league's season field
        season_id = generate_uuid()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO seasons (id, league_id, name, is_current, is_finished, created_at, updated_at)
            VALUES (?, ?, ?, 1, 0, ?, ?)
        """, (season_id, league_id, season_name or "Season 1", now, now))
        print(f"  Created season '{season_name or 'Season 1'}' for league '{league_name}'")
        
        # Update all games in this league to belong to this season
        cursor.execute("UPDATE games SET season_id = ? WHERE league_id = ?", (season_id, league_id))
        
        # Create TeamSeasonStats for all teams in this league, copying their current stats
        cursor.execute("SELECT id, wins, losses, ties, points_for, points_against FROM teams WHERE league_id = ?", (league_id,))
        teams = cursor.fetchall()
        
        for team_id, wins, losses, ties, pf, pa in teams:
            stats_id = generate_uuid()
            cursor.execute("""
                INSERT INTO team_season_stats (id, team_id, season_id, wins, losses, ties, points_for, points_against, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (stats_id, team_id, season_id, wins or 0, losses or 0, ties or 0, pf or 0, pa or 0, now))
        
        print(f"    Migrated {len(teams)} team stats")
    
    conn.commit()
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
