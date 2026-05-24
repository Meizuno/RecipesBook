-- Add the `is_favorite` flag + its index. Default false so existing
-- rows are valid without a backfill; index speeds up the home page's
-- "favorites only" filter.

ALTER TABLE "recipes" ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "recipes_is_favorite_idx" ON "recipes"("is_favorite");
