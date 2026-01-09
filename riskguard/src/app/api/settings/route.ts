import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
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

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { exposureFloor, riskOffMaxExposure, confidenceEscalationThreshold } = body;

  // Validate inputs
  if (
    typeof exposureFloor !== "number" ||
    typeof riskOffMaxExposure !== "number" ||
    typeof confidenceEscalationThreshold !== "number"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (exposureFloor < 0 || exposureFloor > 100) {
    return NextResponse.json({ error: "Exposure floor must be between 0 and 100" }, { status: 400 });
  }

  if (riskOffMaxExposure < 0 || riskOffMaxExposure > 100) {
    return NextResponse.json({ error: "Risk-off max exposure must be between 0 and 100" }, { status: 400 });
  }

  if (confidenceEscalationThreshold < 0 || confidenceEscalationThreshold > 1) {
    return NextResponse.json({ error: "Confidence escalation threshold must be between 0 and 1" }, { status: 400 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {
      exposureFloor,
      riskOffMaxExposure,
      confidenceEscalationThreshold,
    },
    create: {
      id: "singleton",
      exposureFloor,
      riskOffMaxExposure,
      confidenceEscalationThreshold,
    },
  });

  return NextResponse.json(settings);
}

