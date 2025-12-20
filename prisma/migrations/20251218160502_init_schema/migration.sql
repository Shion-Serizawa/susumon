-- CreateEnum
CREATE TYPE "MetaNoteCategory" AS ENUM ('気づき', '疑問', '感情');

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "goal" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_log_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "learning_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "MetaNoteCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "theme_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_log_id" TEXT,
    "note_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "meta_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_themes_user_completed" ON "themes"("user_id", "is_completed");

-- CreateIndex
CREATE INDEX "idx_logs_user_date" ON "learning_log_entries"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_logs_user_theme_date" ON "learning_log_entries"("user_id", "theme_id", "date");

-- CreateIndex
CREATE INDEX "gin_logs_tags" ON "learning_log_entries" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "learning_log_entries_user_id_theme_id_date_key" ON "learning_log_entries"("user_id", "theme_id", "date");

-- CreateIndex
CREATE INDEX "idx_notes_user_date" ON "meta_notes"("user_id", "note_date");

-- CreateIndex
CREATE INDEX "idx_notes_user_category_date" ON "meta_notes"("user_id", "category", "note_date");

-- CreateIndex
CREATE INDEX "gin_notes_theme_ids" ON "meta_notes" USING GIN ("theme_ids");

-- AddForeignKey
ALTER TABLE "learning_log_entries" ADD CONSTRAINT "learning_log_entries_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_notes" ADD CONSTRAINT "meta_notes_related_log_id_fkey" FOREIGN KEY ("related_log_id") REFERENCES "learning_log_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
