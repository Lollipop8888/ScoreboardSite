from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# League Schemas
class LeagueBase(BaseModel):
    name: str
    sport: str
    season: str


class LeagueCreate(LeagueBase):
    pass


class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    season: Optional[str] = None


class League(LeagueBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Team Schemas
class TeamBase(BaseModel):
    name: str
    abbreviation: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    color2: Optional[str] = None
    color3: Optional[str] = None
    logo_url: Optional[str] = None


class TeamCreate(TeamBase):
    league_id: str


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    color: Optional[str] = None
    color2: Optional[str] = None
    color3: Optional[str] = None
    logo_url: Optional[str] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    ties: Optional[int] = None
    points_for: Optional[int] = None
    points_against: Optional[int] = None


class Team(TeamBase):
    id: str
    league_id: str
    wins: int
    losses: int
    ties: int
    points_for: int
    points_against: int
    created_at: datetime

    class Config:
        from_attributes = True


class LeagueWithTeams(League):
    teams: List[Team] = []


# Game Schemas
class GameBase(BaseModel):
    home_team_id: str
    away_team_id: str
    scheduled_at: Optional[datetime] = None


class GameCreate(GameBase):
    league_id: str


class GameUpdate(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    quarter: Optional[str] = None
    game_time: Optional[str] = None


class GameWithTeams(BaseModel):
    id: str
    league_id: str
    home_team: Team
    away_team: Team
    home_score: int
    away_score: int
    status: str
    quarter: Optional[str]
    game_time: Optional[str]
    scheduled_at: Optional[datetime]
    share_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bracket Schemas
class BracketBase(BaseModel):
    name: str
    bracket_type: str = "single_elimination"
    num_teams: int


class BracketCreate(BracketBase):
    league_id: str
    team_ids: List[str] = []


class BracketMatchUpdate(BaseModel):
    team1_score: Optional[int] = None
    team2_score: Optional[int] = None
    status: Optional[str] = None
    winner_id: Optional[str] = None


class BracketMatch(BaseModel):
    id: str
    bracket_id: str
    round_number: int
    match_number: int
    team1: Optional[Team]
    team2: Optional[Team]
    team1_score: int
    team2_score: int
    winner: Optional[Team]
    status: str
    next_match_id: Optional[str]

    class Config:
        from_attributes = True


class Bracket(BracketBase):
    id: str
    league_id: str
    share_code: str
    matches: List[BracketMatch] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Scoreboard Schemas
class ScoreboardPlayerBase(BaseModel):
    name: str
    score: int = 0
    color: str = "#3B82F6"


class ScoreboardPlayerCreate(ScoreboardPlayerBase):
    pass


class ScoreboardPlayerUpdate(BaseModel):
    name: Optional[str] = None
    score: Optional[int] = None
    color: Optional[str] = None


class ScoreboardPlayer(ScoreboardPlayerBase):
    id: str
    scoreboard_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ScoreboardBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class ScoreboardCreate(ScoreboardBase):
    players: List[ScoreboardPlayerCreate] = []


class ScoreboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class Scoreboard(ScoreboardBase):
    id: str
    share_code: str
    players: List[ScoreboardPlayer] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
