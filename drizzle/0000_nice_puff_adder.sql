CREATE TABLE "game_live" (
	"game_id" text PRIMARY KEY NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pin_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_officials" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'ref' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"is_overtime" boolean DEFAULT false NOT NULL,
	"is_playoff" boolean DEFAULT false NOT NULL,
	"is_forfeit" boolean DEFAULT false NOT NULL,
	"location" text DEFAULT 'James Lick Arena',
	"has_boxscore" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "goalie_game_stats" (
	"player_id" integer NOT NULL,
	"game_id" text NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"shots_against" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"shutouts" integer DEFAULT 0 NOT NULL,
	"goalie_assists" integer DEFAULT 0 NOT NULL,
	"result" text,
	CONSTRAINT "goalie_game_stats_player_id_game_id_pk" PRIMARY KEY("player_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_name" text NOT NULL,
	"player_id" integer,
	"class_year" integer NOT NULL,
	"wing" text DEFAULT 'players' NOT NULL,
	"years_active" text,
	"achievements" text,
	CONSTRAINT "hall_of_fame_player_name_class_year_unique" UNIQUE("player_name","class_year")
);
--> statement-breakpoint
CREATE TABLE "player_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_name" text NOT NULL,
	"player_id" integer,
	"season_id" text NOT NULL,
	"award_type" text NOT NULL,
	CONSTRAINT "player_awards_player_name_season_id_award_type_unique" UNIQUE("player_name","season_id","award_type")
);
--> statement-breakpoint
CREATE TABLE "player_game_stats" (
	"player_id" integer NOT NULL,
	"game_id" text NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"gwg" integer DEFAULT 0 NOT NULL,
	"ppg" integer DEFAULT 0 NOT NULL,
	"shg" integer DEFAULT 0 NOT NULL,
	"eng" integer DEFAULT 0 NOT NULL,
	"hat_tricks" integer DEFAULT 0 NOT NULL,
	"pen" integer DEFAULT 0 NOT NULL,
	"pim" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "player_game_stats_player_id_game_id_pk" PRIMARY KEY("player_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "player_season_stats" (
	"player_id" integer NOT NULL,
	"season_id" text NOT NULL,
	"team_slug" text NOT NULL,
	"is_playoff" boolean DEFAULT false NOT NULL,
	"gp" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"gwg" integer DEFAULT 0 NOT NULL,
	"ppg" integer DEFAULT 0 NOT NULL,
	"shg" integer DEFAULT 0 NOT NULL,
	"eng" integer DEFAULT 0 NOT NULL,
	"hat_tricks" integer DEFAULT 0 NOT NULL,
	"pen" integer DEFAULT 0 NOT NULL,
	"pim" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "player_season_stats_player_id_season_id_team_slug_is_playoff_pk" PRIMARY KEY("player_id","season_id","team_slug","is_playoff")
);
--> statement-breakpoint
CREATE TABLE "player_seasons" (
	"player_id" integer NOT NULL,
	"season_id" text NOT NULL,
	"team_slug" text NOT NULL,
	"is_goalie" boolean DEFAULT false NOT NULL,
	CONSTRAINT "player_seasons_player_id_season_id_team_slug_pk" PRIMARY KEY("player_id","season_id","team_slug")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "players_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "season_teams" (
	"season_id" text NOT NULL,
	"team_slug" text NOT NULL,
	CONSTRAINT "season_teams_season_id_team_slug_pk" PRIMARY KEY("season_id","team_slug")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"league_id" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"season_type" text DEFAULT 'fall' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"standings_method" text DEFAULT 'pts-pbla' NOT NULL,
	"game_length" integer DEFAULT 60 NOT NULL,
	"default_location" text,
	"admin_notes" text,
	"stats_only" boolean DEFAULT false NOT NULL,
	"playoff_teams" integer DEFAULT 4 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_metadata" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_live" ADD CONSTRAINT "game_live_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_officials" ADD CONSTRAINT "game_officials_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_teams_slug_fk" FOREIGN KEY ("home_team") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_teams_slug_fk" FOREIGN KEY ("away_team") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD CONSTRAINT "hall_of_fame_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_live_updated" ON "game_live" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_game_officials_game" ON "game_officials" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_games_season" ON "games" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_games_status" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_goalie_game_stats_game" ON "goalie_game_stats" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_goalie_game_stats_player" ON "goalie_game_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_hall_of_fame_player" ON "hall_of_fame" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_awards_player" ON "player_awards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_awards_season" ON "player_awards" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_player_game_stats_game" ON "player_game_stats" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_player_game_stats_player" ON "player_game_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_season_stats_season" ON "player_season_stats" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_player_season_stats_player" ON "player_season_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_seasons_season" ON "player_seasons" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_player_seasons_player" ON "player_seasons" USING btree ("player_id");