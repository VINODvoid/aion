-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "PactStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "ConsequenceType" AS ENUM ('SHAME', 'LOCK', 'FINANCIAL', 'NUCLEAR');

-- CreateEnum
CREATE TYPE "ConsequenceStatus" AS ENUM ('ARMED', 'FIRED', 'SKIPPED_GRACE', 'DEBT', 'DISARMED');

-- CreateEnum
CREATE TYPE "XPSource" AS ENUM ('CHECKIN', 'PACT_COMPLETE', 'MILESTONE', 'BONUS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL,
    "twitterTokens" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "Frequency" NOT NULL,
    "weeklyTarget" INTEGER,
    "consequenceTier" INTEGER NOT NULL,
    "graceDaysAllowed" INTEGER NOT NULL DEFAULT 0,
    "graceDaysUsed" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "PactStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "pactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "proof" TEXT,
    "xpEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streaks" (
    "id" TEXT NOT NULL,
    "pactId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lastCheckInDate" TEXT,

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consequences" (
    "id" TEXT NOT NULL,
    "pactId" TEXT NOT NULL,
    "type" "ConsequenceType" NOT NULL,
    "status" "ConsequenceStatus" NOT NULL DEFAULT 'ARMED',
    "config" JSONB NOT NULL,
    "razorpayMandateId" TEXT,
    "firedAt" TIMESTAMP(3),

    CONSTRAINT "consequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grace_days" (
    "id" TEXT NOT NULL,
    "pactId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "grace_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XPSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "pacts_userId_status_idx" ON "pacts"("userId", "status");

-- CreateIndex
CREATE INDEX "check_ins_pactId_date_idx" ON "check_ins"("pactId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_pactId_date_key" ON "check_ins"("pactId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "streaks_pactId_key" ON "streaks"("pactId");

-- CreateIndex
CREATE UNIQUE INDEX "consequences_pactId_key" ON "consequences"("pactId");

-- CreateIndex
CREATE UNIQUE INDEX "grace_days_pactId_date_key" ON "grace_days"("pactId", "date");

-- CreateIndex
CREATE INDEX "xp_logs_userId_createdAt_idx" ON "xp_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "pacts" ADD CONSTRAINT "pacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_pactId_fkey" FOREIGN KEY ("pactId") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_pactId_fkey" FOREIGN KEY ("pactId") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consequences" ADD CONSTRAINT "consequences_pactId_fkey" FOREIGN KEY ("pactId") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grace_days" ADD CONSTRAINT "grace_days_pactId_fkey" FOREIGN KEY ("pactId") REFERENCES "pacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
