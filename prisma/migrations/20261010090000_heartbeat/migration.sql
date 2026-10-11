-- Keep-alive heartbeats. Additive only.

-- CreateTable
CREATE TABLE "heartbeats" (
    "source" TEXT NOT NULL,
    "beat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beats" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "heartbeats_pkey" PRIMARY KEY ("source")
);

-- Operational table: RLS on with no policy, so neither the restricted app_user
-- role nor Supabase's public API roles can read or write it. The cron route and
-- the collab server use the owner connection.
ALTER TABLE heartbeats ENABLE ROW LEVEL SECURITY;
