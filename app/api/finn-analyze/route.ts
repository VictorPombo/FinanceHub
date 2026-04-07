import { NextRequest, NextResponse } from "next/server";
import { analyzeFinancialAlerts } from "@/lib/finnAnalysis";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const alerts = await analyzeFinancialAlerts(userId);

    return NextResponse.json({ success: true, alerts });
  } catch (err: any) {
    console.error("Erro Finn Analyze:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
