import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { computeRisk } from "@/app/lib/riskEngine";

function shouldPersist(
  latest: { state: string; confidence: number; createdAt: Date } | null,
  next: ReturnType<typeof computeRisk>,
  confidenceThreshold: number
) {
  if (!latest) return true;

  // Persist if state changed
  if (latest.state !== next.state) return true;

  // Persist if confidence increased meaningfully (escalation)
  const delta = next.confidence - latest.confidence;
  if (delta >= confidenceThreshold) return true;

  // Persist if 30 days passed since last stored signal
  const daysSinceLastSignal = (Date.now() - latest.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSignal >= 30) return true;

  return false;
}

export async function POST() {
  // Get settings
  let settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  // Initialize default settings if they don't exist
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: "singleton",
        exposureFloor: 20,
        riskOffMaxExposure: 40,
        confidenceEscalationThreshold: 0.08,
      },
    });
  }

  const confidenceThreshold = settings.confidenceEscalationThreshold;

  const next = computeRisk(new Date(), {
    exposureFloor: settings.exposureFloor,
    riskOffMaxExposure: settings.riskOffMaxExposure,
  });

  const latest = await prisma.riskSignal.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!shouldPersist(latest, next, confidenceThreshold)) {
    return NextResponse.json({ persisted: false, latest, next });
  }

  const created = await prisma.riskSignal.create({
    data: {
      state: next.state,
      confidence: next.confidence,
      targetEquityMin: next.targetEquityMin,
      targetEquityMax: next.targetEquityMax,
      rationale: next.rationale,
      detailsJson: JSON.stringify(next.details),
      version: (latest?.version ?? 0) + 1,
    },
  });

  return NextResponse.json({ persisted: true, signal: created });
}
