ALTER TABLE "fetches" ADD COLUMN "vote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "fetches_vote_count_idx" ON "fetches" USING btree ("vote_count");--> statement-breakpoint
CREATE TABLE "fetch_votes" (
	"fetch_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fetch_votes_fetch_id_voter_id_pk" PRIMARY KEY("fetch_id","voter_id")
);--> statement-breakpoint
ALTER TABLE "fetch_votes" ADD CONSTRAINT "fetch_votes_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."fetches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetch_votes" ADD CONSTRAINT "fetch_votes_voter_id_user_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fetch_votes_voter_idx" ON "fetch_votes" USING btree ("voter_id");
