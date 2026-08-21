import { NextRequest, NextResponse } from "next/server";
import type {
  InsightsPayload,
  InsightsDashboard,
  IndustryCategory,
  DataLineage,
  FootprintAnalysis,
  IndustryAnalysis,
  PublicDataSource,
} from "@/lib/insights-types";
import { analyzeIndustry } from "@/lib/insights-analysis";
import { buildDataLineage } from "@/lib/lineage";
import { calculateFootprint } from "@/lib/insights-footprint";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const poiId = searchParams.get("poi");
    const category = searchParams.get("category") as IndustryCategory | null;

    const dashboards: InsightsDashboard[] = [];
    const degraded: string[] = [];

    const publicSources = await fetchPublicSources();
    
    if (!publicSources || publicSources.length === 0) {
      degraded.push("Limited public data sources available");
    }

    if (poiId) {
      const dashboard = await generateDashboard(poiId, category, publicSources);
      if (dashboard) {
        dashboards.push(dashboard);
      }
    } else {
      const topPOIs = await getTopPOIs(category);
      for (const poi of topPOIs.slice(0, 5)) {
        const dashboard = await generateDashboard(poi.id, category, publicSources);
        if (dashboard) {
          dashboards.push(dashboard);
        }
      }
    }

    const payload: InsightsPayload = {
      dashboards,
      updatedAt: new Date().toISOString(),
      summary: `Generated ${dashboards.length} insight dashboard${dashboards.length !== 1 ? 's' : ''}`,
      degraded,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { poiLabel, category, keywords } = body;

    if (!poiLabel || !category) {
      return NextResponse.json(
        { error: "POI label and category are required" },
        { status: 400 }
      );
    }

    const publicSources = await fetchPublicSources();
    const poiData = {
      id: `poi-${Date.now()}`,
      label: poiLabel,
      category: category as IndustryCategory,
      keywords: keywords || [poiLabel],
      dataPoints: 0,
      relevanceScore: 0,
    };

    const analysis = await analyzeIndustry(
      category as IndustryCategory,
      poiData,
      publicSources
    );

    const lineage = buildDataLineage({
      publicSources,
      poiData,
      analysisResults: analysis,
    });

    const footprint = await calculateFootprint(
      poiData,
      publicSources,
      analysis
    );

    const timeSeries = generateTimeSeries(publicSources);
    const heatmap = generateHeatmap();
    const comparisons = generateComparisons(analysis, footprint);

    const dashboard: InsightsDashboard = {
      poiId: poiData.id,
      poiLabel: poiData.label,
      category: poiData.category,
      updatedAt: new Date().toISOString(),
      publicSources,
      poiData: {
        ...poiData,
        dataPoints: publicSources.reduce((sum, s) => sum + s.dataPoints, 0),
        relevanceScore: calculateRelevance(publicSources),
      },
      analysis,
      lineage,
      footprint,
      timeSeries,
      heatmap,
      comparisons,
      insights: extractInsights(analysis, footprint, lineage),
    };

    const payload: InsightsPayload = {
      dashboards: [dashboard],
      updatedAt: new Date().toISOString(),
      summary: `Generated insights for ${poiLabel}`,
      degraded: [],
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Insights creation error:", error);
    return NextResponse.json(
      { error: "Failed to create insights" },
      { status: 500 }
    );
  }
}

async function fetchPublicSources() {
  const sources = [
    {
      id: "micro-1",
      name: "Micro Blog Platform",
      platform: "micro" as const,
      category: "social",
      dataPoints: 1250,
      lastUpdated: new Date().toISOString(),
      reliability: 0.85,
    },
    {
      id: "tech-1",
      name: "Tech News Aggregator",
      platform: "tech" as const,
      category: "technology",
      dataPoints: 890,
      lastUpdated: new Date().toISOString(),
      reliability: 0.92,
    },
    {
      id: "b2b-1",
      name: "B2B Intelligence Feed",
      platform: "b2b" as const,
      category: "business",
      dataPoints: 2100,
      lastUpdated: new Date().toISOString(),
      reliability: 0.88,
    },
    {
      id: "etech-1",
      name: "ETech Insights Platform",
      platform: "etech" as const,
      category: "emerging-tech",
      dataPoints: 750,
      lastUpdated: new Date().toISOString(),
      reliability: 0.78,
    },
    {
      id: "silicon-1",
      name: "Silicon Valley Feed",
      platform: "silicon" as const,
      category: "startups",
      dataPoints: 1420,
      lastUpdated: new Date().toISOString(),
      reliability: 0.90,
    },
  ];

  return sources;
}

async function getTopPOIs(category: IndustryCategory | null) {
  return [
    { id: "poi-1", label: "Sample Product", category: category || "technology" },
    { id: "poi-2", label: "Sample Campaign", category: category || "technology" },
    { id: "poi-3", label: "Sample Brand", category: category || "technology" },
  ];
}

async function generateDashboard(
  poiId: string,
  category: IndustryCategory | null,
  publicSources: PublicDataSource[]
): Promise<InsightsDashboard | null> {
  const poiData = {
    id: poiId,
    label: `POI ${poiId}`,
    category: (category || "technology") as IndustryCategory,
    keywords: [`poi-${poiId}`],
    dataPoints: 0,
    relevanceScore: 0,
  };

  const analysis = await analyzeIndustry(
    poiData.category,
    poiData,
    publicSources
  );

  const lineage = buildDataLineage({
    publicSources,
    poiData,
    analysisResults: analysis,
  });

  const footprint = await calculateFootprint(poiData, publicSources, analysis);

  const timeSeries = generateTimeSeries(publicSources);
  const heatmap = generateHeatmap();
  const comparisons = generateComparisons(analysis, footprint);

  return {
    poiId: poiData.id,
    poiLabel: poiData.label,
    category: poiData.category,
    updatedAt: new Date().toISOString(),
    publicSources,
    poiData: {
      ...poiData,
      dataPoints: publicSources.reduce((sum, s) => sum + s.dataPoints, 0),
      relevanceScore: calculateRelevance(publicSources),
    },
    analysis,
    lineage,
    footprint,
    timeSeries,
    heatmap,
    comparisons,
    insights: extractInsights(analysis, footprint, lineage),
  };
}

function calculateRelevance(publicSources: PublicDataSource[]): number {
  const totalDataPoints = publicSources.reduce(
    (sum, s) => sum + s.dataPoints,
    0
  );
  const avgReliability =
    publicSources.reduce((sum, s) => sum + s.reliability, 0) /
    publicSources.length;
  return Math.min(1, (totalDataPoints / 10000) * avgReliability);
}

function generateTimeSeries(publicSources: PublicDataSource[]) {
  const points = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();
    const value = Math.floor(Math.random() * 100) + 50;
    const organic = Math.floor(value * (0.6 + Math.random() * 0.3));
    points.push({
      timestamp,
      value,
      organic,
      synthetic: value - organic,
      sources: publicSources.length,
    });
  }
  return points;
}

function generateHeatmap() {
  const cells = [];
  const platforms = ["micro", "tech", "b2b", "etech", "silicon"];
  const metrics = ["reach", "engagement", "sentiment", "velocity"];

  for (const platform of platforms) {
    for (const metric of metrics) {
      cells.push({
        x: platform,
        y: metric,
        value: Math.random(),
        label: `${platform}-${metric}`,
      });
    }
  }
  return cells;
}

function generateComparisons(
  analysis: IndustryAnalysis,
  footprint: FootprintAnalysis
) {
  return [
    {
      id: "infiltration",
      label: "Market Infiltration",
      value: footprint.infiltrationScore,
      change: (Math.random() - 0.5) * 20,
      benchmark: 0.65,
    },
    {
      id: "organic",
      label: "Organic Ratio",
      value: footprint.organicRatio,
      change: (Math.random() - 0.5) * 15,
      benchmark: 0.75,
    },
    {
      id: "penetration",
      label: "Market Penetration",
      value: footprint.marketPenetration,
      change: (Math.random() - 0.5) * 25,
      benchmark: 0.55,
    },
    {
      id: "engagement",
      label: "Engagement Score",
      value: footprint.engagement,
      change: (Math.random() - 0.5) * 18,
      benchmark: 0.60,
    },
  ];
}

function extractInsights(
  analysis: IndustryAnalysis,
  footprint: FootprintAnalysis,
  lineage: DataLineage
) {
  return {
    key: [
      `${footprint.infiltrationScore.toFixed(0)}% market infiltration detected`,
      `${(footprint.organicRatio * 100).toFixed(0)}% organic content ratio`,
      `Estimated $${(footprint.dollarImpact.estimated / 1000).toFixed(0)}K ${footprint.dollarImpact.timeframe} impact`,
    ],
    actionable: [
      analysis.insights[0] || "Increase engagement on high-performing platforms",
      analysis.insights[1] || "Focus on organic content generation",
      `Optimize for ${analysis.factors[0]?.name || "key metrics"}`,
    ],
    risks: [
      ...analysis.constraints
        .filter((c) => !c.met && c.impact === "critical")
        .map((c) => `Critical: ${c.name} threshold not met`),
      footprint.organicRatio < 0.5 ? "Low organic content ratio" : null,
      lineage.organicScore < 0.6 ? "Data authenticity concerns" : null,
    ].filter(Boolean) as string[],
  };
}
