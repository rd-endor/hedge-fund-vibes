-- CreateTable
CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "targetEquityMin" INTEGER NOT NULL,
    "targetEquityMax" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1
);
