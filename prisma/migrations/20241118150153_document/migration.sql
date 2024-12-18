CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "ChatDocument" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vector" vector,

    CONSTRAINT "ChatDocument_pkey" PRIMARY KEY ("id")
);
