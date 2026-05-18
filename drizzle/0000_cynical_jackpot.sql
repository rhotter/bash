CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "adhoc_game_rosters" (
	"game_id" text NOT NULL,
	"player_id" integer NOT NULL,
	"team_side" text NOT NULL,
	CONSTRAINT "adhoc_game_rosters_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"reason" text,
	"amount_off" integer NOT NULL,
	"limitation" text DEFAULT 'unlimited' NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "draft_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"season_type" text DEFAULT 'fall' NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"draft_type" text DEFAULT 'snake' NOT NULL,
	"rounds" integer DEFAULT 14 NOT NULL,
	"timer_seconds" integer DEFAULT 120 NOT NULL,
	"max_keepers" integer DEFAULT 8 NOT NULL,
	"draft_date" timestamp with time zone,
	"location" text,
	"publish_location" boolean DEFAULT false NOT NULL,
	"current_round" integer,
	"current_pick" integer,
	"timer_countdown" integer,
	"timer_running" boolean DEFAULT false NOT NULL,
	"timer_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "draft_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "draft_picks" (
	"id" text PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"round" integer NOT NULL,
	"pick_number" integer NOT NULL,
	"team_slug" text NOT NULL,
	"original_team_slug" text NOT NULL,
	"player_id" integer,
	"picked_at" timestamp with time zone,
	"is_keeper" boolean DEFAULT false NOT NULL,
	CONSTRAINT "uq_draft_picks_slot" UNIQUE("draft_id","round","pick_number")
);
--> statement-breakpoint
CREATE TABLE "draft_pool" (
	"draft_id" text NOT NULL,
	"player_id" integer NOT NULL,
	"is_keeper" boolean DEFAULT false NOT NULL,
	"keeper_team_slug" text,
	"keeper_round" integer,
	"registration_meta" jsonb,
	CONSTRAINT "draft_pool_draft_id_player_id_pk" PRIMARY KEY("draft_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "draft_team_order" (
	"draft_id" text NOT NULL,
	"team_slug" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "draft_team_order_draft_id_team_slug_pk" PRIMARY KEY("draft_id","team_slug")
);
--> statement-breakpoint
CREATE TABLE "draft_trade_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_id" text NOT NULL,
	"from_team_slug" text NOT NULL,
	"to_team_slug" text NOT NULL,
	"pick_id" text,
	"round" integer,
	"position" integer,
	"player_id" integer
);
--> statement-breakpoint
CREATE TABLE "draft_trades" (
	"id" text PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"team_a_slug" text NOT NULL,
	"team_b_slug" text NOT NULL,
	"trade_type" text NOT NULL,
	"description" text,
	"traded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extras" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"detail_type" text,
	"detail_label" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchises" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text
);
--> statement-breakpoint
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
	"location" text DEFAULT 'The Lick',
	"has_boxscore" boolean DEFAULT false NOT NULL,
	"notes" text,
	"title" text,
	"game_type" text DEFAULT 'regular' NOT NULL,
	"has_shootout" boolean DEFAULT false NOT NULL,
	"away_notes" text,
	"home_notes" text,
	"home_placeholder" text,
	"away_placeholder" text,
	"next_game_id" text,
	"next_game_slot" text,
	"bracket_round" text,
	"series_id" text,
	"series_game_number" integer
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
CREATE TABLE "legal_notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"ack_type" text DEFAULT 'basic' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notice_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"notice_id" integer NOT NULL,
	"notice_version" integer NOT NULL,
	"registration_id" text,
	"acknowledged_at" timestamp with time zone DEFAULT now()
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
	"is_captain" boolean DEFAULT false NOT NULL,
	"is_rookie" boolean DEFAULT false NOT NULL,
	"registration_meta" jsonb,
	CONSTRAINT "player_seasons_player_id_season_id_team_slug_pk" PRIMARY KEY("player_id","season_id","team_slug")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "players_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "registration_answers" (
	"registration_id" text NOT NULL,
	"question_id" integer NOT NULL,
	"answer" text,
	CONSTRAINT "registration_answers_registration_id_question_id_pk" PRIMARY KEY("registration_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "registration_extras" (
	"registration_id" text NOT NULL,
	"extra_id" integer NOT NULL,
	"detail" text,
	CONSTRAINT "registration_extras_registration_id_extra_id_pk" PRIMARY KEY("registration_id","extra_id")
);
--> statement-breakpoint
CREATE TABLE "registration_period_discounts" (
	"period_id" text NOT NULL,
	"discount_id" integer NOT NULL,
	CONSTRAINT "registration_period_discounts_period_id_discount_id_pk" PRIMARY KEY("period_id","discount_id")
);
--> statement-breakpoint
CREATE TABLE "registration_period_extras" (
	"period_id" text NOT NULL,
	"extra_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "registration_period_extras_period_id_extra_id_pk" PRIMARY KEY("period_id","extra_id")
);
--> statement-breakpoint
CREATE TABLE "registration_period_notices" (
	"period_id" text NOT NULL,
	"notice_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "registration_period_notices_period_id_notice_id_pk" PRIMARY KEY("period_id","notice_id")
);
--> statement-breakpoint
CREATE TABLE "registration_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"date_open" timestamp with time zone,
	"date_close" timestamp with time zone,
	"base_fee" integer DEFAULT 0 NOT NULL,
	"max_players" integer,
	"age_minimum" integer,
	"age_as_of_date" text,
	"earlybird_deadline" timestamp with time zone,
	"earlybird_discount" integer DEFAULT 0,
	"late_fee_date" timestamp with time zone,
	"late_fee_amount" integer DEFAULT 0,
	"requires_emergency_info" boolean DEFAULT true NOT NULL,
	"requires_jersey_size" boolean DEFAULT false NOT NULL,
	"confirmation_email_body" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "registration_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"question_text" text NOT NULL,
	"question_type" text DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"registration_type" text DEFAULT 'individual' NOT NULL,
	"team_slug" text,
	"phone" text,
	"address" text,
	"birthdate" text,
	"gender" text,
	"tshirt_size" text,
	"emergency_name" text,
	"emergency_phone" text,
	"health_plan" text,
	"health_plan_id" text,
	"doctor_name" text,
	"doctor_phone" text,
	"medical_notes" text,
	"years_played" integer,
	"skill_level" text,
	"positions" text,
	"last_league" text,
	"last_team" text,
	"misc_notes" text,
	"amount_paid" integer,
	"discount_code_id" integer,
	"stripe_session_id" text,
	"paid_at" timestamp with time zone,
	"manual_payment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "registrations_user_id_period_id_unique" UNIQUE("user_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "season_teams" (
	"season_id" text NOT NULL,
	"team_slug" text NOT NULL,
	"franchise_slug" text,
	"color" text,
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
	"playoff_teams" integer DEFAULT 4
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
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
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"player_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhoc_game_rosters" ADD CONSTRAINT "adhoc_game_rosters_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhoc_game_rosters" ADD CONSTRAINT "adhoc_game_rosters_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_instances" ADD CONSTRAINT "draft_instances_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_log" ADD CONSTRAINT "draft_log_draft_id_draft_instances_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_draft_id_draft_instances_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_original_team_slug_teams_slug_fk" FOREIGN KEY ("original_team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pool" ADD CONSTRAINT "draft_pool_draft_id_draft_instances_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pool" ADD CONSTRAINT "draft_pool_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pool" ADD CONSTRAINT "draft_pool_keeper_team_slug_teams_slug_fk" FOREIGN KEY ("keeper_team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_team_order" ADD CONSTRAINT "draft_team_order_draft_id_draft_instances_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_team_order" ADD CONSTRAINT "draft_team_order_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trade_items" ADD CONSTRAINT "draft_trade_items_trade_id_draft_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."draft_trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trade_items" ADD CONSTRAINT "draft_trade_items_from_team_slug_teams_slug_fk" FOREIGN KEY ("from_team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trade_items" ADD CONSTRAINT "draft_trade_items_to_team_slug_teams_slug_fk" FOREIGN KEY ("to_team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trade_items" ADD CONSTRAINT "draft_trade_items_pick_id_draft_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."draft_picks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trade_items" ADD CONSTRAINT "draft_trade_items_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trades" ADD CONSTRAINT "draft_trades_draft_id_draft_instances_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trades" ADD CONSTRAINT "draft_trades_team_a_slug_teams_slug_fk" FOREIGN KEY ("team_a_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_trades" ADD CONSTRAINT "draft_trades_team_b_slug_teams_slug_fk" FOREIGN KEY ("team_b_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_live" ADD CONSTRAINT "game_live_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_officials" ADD CONSTRAINT "game_officials_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_teams_slug_fk" FOREIGN KEY ("home_team") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_teams_slug_fk" FOREIGN KEY ("away_team") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalie_game_stats" ADD CONSTRAINT "goalie_game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD CONSTRAINT "hall_of_fame_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_notice_id_legal_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."legal_notices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_answers" ADD CONSTRAINT "registration_answers_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_answers" ADD CONSTRAINT "registration_answers_question_id_registration_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."registration_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_extras" ADD CONSTRAINT "registration_extras_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_extras" ADD CONSTRAINT "registration_extras_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_period_discounts" ADD CONSTRAINT "registration_period_discounts_period_id_registration_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."registration_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_period_discounts" ADD CONSTRAINT "registration_period_discounts_discount_id_discount_codes_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_period_extras" ADD CONSTRAINT "registration_period_extras_period_id_registration_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."registration_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_period_extras" ADD CONSTRAINT "registration_period_extras_extra_id_extras_id_fk" FOREIGN KEY ("extra_id") REFERENCES "public"."extras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_period_notices" ADD CONSTRAINT "registration_period_notices_period_id_registration_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."registration_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_period_notices" ADD CONSTRAINT "registration_period_notices_notice_id_legal_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."legal_notices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_periods" ADD CONSTRAINT "registration_periods_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_questions" ADD CONSTRAINT "registration_questions_period_id_registration_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."registration_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_period_id_registration_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."registration_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_team_slug_teams_slug_fk" FOREIGN KEY ("team_slug") REFERENCES "public"."teams"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_franchise_slug_franchises_slug_fk" FOREIGN KEY ("franchise_slug") REFERENCES "public"."franchises"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adhoc_game_rosters_game" ON "adhoc_game_rosters" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_draft_picks_draft" ON "draft_picks" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "idx_draft_picks_team" ON "draft_picks" USING btree ("draft_id","team_slug");--> statement-breakpoint
CREATE INDEX "idx_draft_pool_keepers" ON "draft_pool" USING btree ("draft_id","keeper_team_slug");--> statement-breakpoint
CREATE INDEX "idx_draft_pool_draft_player" ON "draft_pool" USING btree ("draft_id","player_id");--> statement-breakpoint
CREATE INDEX "idx_draft_team_order" ON "draft_team_order" USING btree ("draft_id","position");--> statement-breakpoint
CREATE INDEX "idx_game_live_updated" ON "game_live" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_game_officials_game" ON "game_officials" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_games_season" ON "games" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_games_status" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_goalie_game_stats_game" ON "goalie_game_stats" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_goalie_game_stats_player" ON "goalie_game_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_hall_of_fame_player" ON "hall_of_fame" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_notice_ack_user" ON "notice_acknowledgements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_player_awards_player" ON "player_awards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_awards_season" ON "player_awards" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_player_game_stats_game" ON "player_game_stats" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_player_game_stats_player" ON "player_game_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_season_stats_season" ON "player_season_stats" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_player_season_stats_player" ON "player_season_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_seasons_season" ON "player_seasons" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_player_seasons_player" ON "player_seasons" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_registration_questions_period" ON "registration_questions" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_registrations_user" ON "registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_registrations_period" ON "registrations" USING btree ("period_id");