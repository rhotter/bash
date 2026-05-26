ALTER TABLE "adhoc_game_rosters" ADD COLUMN "is_sub" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "goalie_game_stats" ADD COLUMN "is_sub" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD COLUMN "is_sub" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "enable_sync" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_instances" DROP COLUMN "publish_location";