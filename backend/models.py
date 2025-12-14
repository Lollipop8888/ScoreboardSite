import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


def generate_share_code():
    return str(uuid.uuid4())[:8].upper()


class League(Base):
    __tablename__ = "leagues"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    sport = Column(String(50), nullable=False)
    season = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teams = relationship("Team", back_populates="league", cascade="all, delete-orphan")
    games = relationship("Game", back_populates="league", cascade="all, delete-orphan")
    brackets = relationship("Bracket", back_populates="league", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=generate_uuid)
    league_id = Column(String, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    abbreviation = Column(String(10))
    color = Column(String(7), default="#3B82F6")  # Primary hex color
    color2 = Column(String(7))  # Secondary hex color (optional)
    color3 = Column(String(7))  # Tertiary hex color (optional)
    logo_url = Column(String(500))
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    ties = Column(Integer, default=0)
    points_for = Column(Integer, default=0)
    points_against = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    league = relationship("League", back_populates="teams")


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=generate_uuid)
    league_id = Column(String, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    home_team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    away_team_id = Column(String, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    status = Column(String(20), default="scheduled")  # scheduled, live, final
    quarter = Column(String(20))  # Q1, Q2, Halftime, Q3, Q4, OT, Final
    game_time = Column(String(10))  # Time remaining in quarter
    scheduled_at = Column(DateTime)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    share_code = Column(String(8), default=generate_share_code, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    league = relationship("League", back_populates="games")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])


class Bracket(Base):
    __tablename__ = "brackets"

    id = Column(String, primary_key=True, default=generate_uuid)
    league_id = Column(String, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    bracket_type = Column(String(20), default="single_elimination")  # single_elimination, double_elimination
    num_teams = Column(Integer, nullable=False)
    share_code = Column(String(8), default=generate_share_code, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    league = relationship("League", back_populates="brackets")
    matches = relationship("BracketMatch", back_populates="bracket", cascade="all, delete-orphan")


class BracketMatch(Base):
    __tablename__ = "bracket_matches"

    id = Column(String, primary_key=True, default=generate_uuid)
    bracket_id = Column(String, ForeignKey("brackets.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, nullable=False)
    match_number = Column(Integer, nullable=False)
    team1_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"))
    team2_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"))
    team1_score = Column(Integer, default=0)
    team2_score = Column(Integer, default=0)
    winner_id = Column(String, ForeignKey("teams.id", ondelete="SET NULL"))
    status = Column(String(20), default="pending")  # pending, live, completed
    next_match_id = Column(String, ForeignKey("bracket_matches.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)

    bracket = relationship("Bracket", back_populates="matches")
    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    winner = relationship("Team", foreign_keys=[winner_id])


class Scoreboard(Base):
    __tablename__ = "scoreboards"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    share_code = Column(String(8), default=generate_share_code, unique=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    players = relationship("ScoreboardPlayer", back_populates="scoreboard", cascade="all, delete-orphan")


class ScoreboardPlayer(Base):
    __tablename__ = "scoreboard_players"

    id = Column(String, primary_key=True, default=generate_uuid)
    scoreboard_id = Column(String, ForeignKey("scoreboards.id"), nullable=False)
    name = Column(String(100), nullable=False)
    score = Column(Integer, default=0)
    color = Column(String(7), default="#3B82F6")
    created_at = Column(DateTime, default=datetime.utcnow)

    scoreboard = relationship("Scoreboard", back_populates="players")
