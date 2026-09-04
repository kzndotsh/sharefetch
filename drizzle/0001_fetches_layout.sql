ALTER TABLE "fetches" ADD COLUMN "layout" text;--> statement-breakpoint
CREATE INDEX "fetches_layout_idx" ON "fetches" USING btree ("layout");
