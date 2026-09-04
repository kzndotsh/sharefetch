CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fetch_changelog" (
	"id" text PRIMARY KEY NOT NULL,
	"fetch_id" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fetch_utils" (
	"fetch_id" text NOT NULL,
	"slug" text NOT NULL,
	"role" text,
	CONSTRAINT "fetch_utils_fetch_id_slug_pk" PRIMARY KEY("fetch_id","slug")
);
--> statement-breakpoint
CREATE TABLE "fetches" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"spec" jsonb NOT NULL,
	"title" text NOT NULL,
	"display_name" text NOT NULL,
	"handle" text NOT NULL,
	"visibility" text NOT NULL,
	"desktop_kind" text NOT NULL,
	"desktop_slug" text NOT NULL,
	"distro_slug" text,
	"colorscheme_slug" text,
	"display_server" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"role" text,
	"usage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"handle" text NOT NULL,
	"bio_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetch_changelog" ADD CONSTRAINT "fetch_changelog_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."fetches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetch_utils" ADD CONSTRAINT "fetch_utils_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."fetches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fetch_changelog_fetch_idx" ON "fetch_changelog" USING btree ("fetch_id");--> statement-breakpoint
CREATE INDEX "fetch_utils_slug_idx" ON "fetch_utils" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "fetches_desktop_slug_idx" ON "fetches" USING btree ("desktop_slug");--> statement-breakpoint
CREATE INDEX "fetches_desktop_kind_idx" ON "fetches" USING btree ("desktop_kind");--> statement-breakpoint
CREATE INDEX "fetches_distro_slug_idx" ON "fetches" USING btree ("distro_slug");--> statement-breakpoint
CREATE INDEX "fetches_colorscheme_slug_idx" ON "fetches" USING btree ("colorscheme_slug");--> statement-breakpoint
CREATE INDEX "fetches_display_server_idx" ON "fetches" USING btree ("display_server");--> statement-breakpoint
CREATE INDEX "fetches_last_verified_idx" ON "fetches" USING btree ("last_verified_at");--> statement-breakpoint
CREATE INDEX "fetches_handle_idx" ON "fetches" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "fetches_visibility_idx" ON "fetches" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");