-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('APPLICANT', 'ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PrivateFieldType" AS ENUM ('PASSPORT_NUMBER', 'EXACT_DATE_OF_BIRTH', 'WRITTEN_ESSAY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'APPLICANT',
    "publicKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "citizenship" TEXT NOT NULL,
    "birthMonthYear" TEXT NOT NULL,
    "cvHash" TEXT NOT NULL,
    "writtenSubmissionHash" TEXT NOT NULL,
    "videoLinkHash" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevealedField" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "fieldType" "PrivateFieldType" NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevealedField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationId_key" ON "Application"("applicationId");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_applicationId_idx" ON "Application"("applicationId");

-- CreateIndex
CREATE INDEX "RevealedField_applicationId_idx" ON "RevealedField"("applicationId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevealedField" ADD CONSTRAINT "RevealedField_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
