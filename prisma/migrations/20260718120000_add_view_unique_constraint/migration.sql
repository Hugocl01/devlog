-- AlterTable: dedup views per (post/update, ipHash) to allow upsert instead of findFirst+create
CREATE UNIQUE INDEX "post_views_postId_ipHash_key" ON "post_views"("postId", "ipHash");
CREATE UNIQUE INDEX "update_views_updateId_ipHash_key" ON "update_views"("updateId", "ipHash");
