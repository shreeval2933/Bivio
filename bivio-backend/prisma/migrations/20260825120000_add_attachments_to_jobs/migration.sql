-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
