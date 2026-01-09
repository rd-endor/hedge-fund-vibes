-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "exposureFloor" INTEGER NOT NULL DEFAULT 20,
    "riskOffMaxExposure" INTEGER NOT NULL DEFAULT 40,
    "confidenceEscalationThreshold" REAL NOT NULL DEFAULT 0.08,
    "updatedAt" DATETIME NOT NULL
);
