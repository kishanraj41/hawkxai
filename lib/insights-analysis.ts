import type {
  IndustryCategory,
  IndustryAnalysis,
  IndustryFactor,
  IndustryConstraint,
  IndustryVariable,
  POIData,
  PublicDataSource,
} from "./insights-types";

const INDUSTRY_FACTORS: Record<IndustryCategory, string[]> = {
  technology: [
    "Innovation Index",
    "Adoption Rate",
    "Developer Interest",
    "Investment Volume",
    "Patent Activity",
  ],
  finance: [
    "Market Volatility",
    "Trading Volume",
    "Regulatory Compliance",
    "Customer Trust",
    "Digital Adoption",
  ],
  healthcare: [
    "Patient Outcomes",
    "Regulatory Approval",
    "Research Funding",
    "Provider Adoption",
    "Cost Efficiency",
  ],
  retail: [
    "Consumer Demand",
    "Price Competitiveness",
    "Supply Chain Efficiency",
    "Brand Loyalty",
    "Digital Presence",
  ],
  automotive: [
    "Sales Volume",
    "Safety Ratings",
    "Environmental Impact",
    "Innovation Score",
    "Customer Satisfaction",
  ],
  "real-estate": [
    "Property Values",
    "Market Liquidity",
    "Interest Rates",
    "Development Activity",
    "Location Score",
  ],
  entertainment: [
    "Audience Engagement",
    "Content Quality",
    "Distribution Reach",
    "Revenue Streams",
    "Critical Reception",
  ],
  education: [
    "Student Outcomes",
    "Enrollment Trends",
    "Innovation Index",
    "Funding Levels",
    "Accreditation Status",
  ],
  hospitality: [
    "Guest Satisfaction",
    "Occupancy Rates",
    "Service Quality",
    "Location Appeal",
    "Price Positioning",
  ],
  manufacturing: [
    "Production Efficiency",
    "Quality Control",
    "Supply Chain Resilience",
    "Innovation Rate",
    "Safety Standards",
  ],
};

const INDUSTRY_CONSTRAINTS: Record<IndustryCategory, string[]> = {
  technology: ["Scalability", "Security", "Performance", "Compatibility"],
  finance: ["Compliance", "Risk Management", "Liquidity", "Capital Requirements"],
  healthcare: ["Safety", "Efficacy", "Regulatory", "Accessibility"],
  retail: ["Inventory", "Logistics", "Pricing", "Competition"],
  automotive: ["Safety Standards", "Emissions", "Quality", "Cost"],
  "real-estate": ["Zoning", "Financing", "Market Conditions", "Location"],
  entertainment: ["Content Rights", "Distribution", "Audience Ratings", "Budget"],
  education: ["Accreditation", "Funding", "Faculty", "Enrollment"],
  hospitality: ["Health & Safety", "Capacity", "Location", "Service Standards"],
  manufacturing: ["Quality", "Capacity", "Resources", "Compliance"],
};

const INDUSTRY_VARIABLES: Record<IndustryCategory, string[]> = {
  technology: ["Platform Type", "Target Market", "Revenue Model", "Stage"],
  finance: ["Asset Class", "Risk Profile", "Term Length", "Instrument Type"],
  healthcare: ["Treatment Type", "Patient Demographics", "Provider Type", "Coverage"],
  retail: ["Channel", "Product Category", "Price Point", "Season"],
  automotive: ["Vehicle Type", "Powertrain", "Market Segment", "Production Volume"],
  "real-estate": ["Property Type", "Location Tier", "Term", "Financing Type"],
  entertainment: ["Genre", "Format", "Distribution Model", "Target Audience"],
  education: ["Level", "Delivery Method", "Subject Area", "Accreditation Type"],
  hospitality: ["Service Type", "Star Rating", "Location Type", "Season"],
  manufacturing: ["Product Type", "Production Method", "Scale", "Quality Grade"],
};

export async function analyzeIndustry(
  category: IndustryCategory,
  _poiData: POIData,
  publicSources: PublicDataSource[]
): Promise<IndustryAnalysis> {
  const factors = generateFactors(category, publicSources);
  const constraints = generateConstraints(category);
  const variables = generateVariables(category);
  
  const score = calculateIndustryScore(factors, constraints, variables);
  const insights = generateIndustryInsights(category, factors, constraints, variables);

  return {
    category,
    factors,
    constraints,
    variables,
    score,
    insights,
  };
}

function generateFactors(
  category: IndustryCategory,
  publicSources: PublicDataSource[]
): IndustryFactor[] {
  const factorNames = INDUSTRY_FACTORS[category];
  const avgReliability = publicSources.reduce((sum, s) => sum + s.reliability, 0) / publicSources.length;
  
  return factorNames.map((name, index) => {
    const baseValue = 0.5 + Math.random() * 0.4;
    const weight = (factorNames.length - index) / factorNames.length;
    const trend = Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : "stable";
    
    return {
      id: `factor-${index}`,
      name,
      weight: weight * avgReliability,
      value: baseValue * 100,
      unit: name.includes("Rate") || name.includes("Ratio") ? "%" : "index",
      trend: trend as "up" | "down" | "stable",
    };
  });
}

function generateConstraints(category: IndustryCategory): IndustryConstraint[] {
  const constraintNames = INDUSTRY_CONSTRAINTS[category];
  
  return constraintNames.map((name, index) => {
    const threshold = 70 + Math.random() * 20;
    const current = 50 + Math.random() * 50;
    const met = current >= threshold;
    const impact = index < 2 ? "critical" : index < 4 ? "high" : index < 6 ? "medium" : "low";
    
    return {
      id: `constraint-${index}`,
      name,
      threshold,
      current,
      met,
      impact: impact as "critical" | "high" | "medium" | "low",
    };
  });
}

function generateVariables(category: IndustryCategory): IndustryVariable[] {
  const variableNames = INDUSTRY_VARIABLES[category];
  
  return variableNames.map((name, index) => {
    const types = ["numeric", "boolean", "categorical"] as const;
    const type = types[index % types.length];
    
    let value: string | number | boolean;
    if (type === "numeric") {
      value = Math.floor(Math.random() * 100);
    } else if (type === "boolean") {
      value = Math.random() > 0.5;
    } else {
      value = ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];
    }
    
    return {
      id: `variable-${index}`,
      name,
      type,
      value,
      impact: 0.6 + Math.random() * 0.4,
    };
  });
}

function calculateIndustryScore(
  factors: IndustryFactor[],
  constraints: IndustryConstraint[],
  variables: IndustryVariable[]
): number {
  const factorScore = factors.reduce((sum, f) => sum + f.value * f.weight, 0) / 
    factors.reduce((sum, f) => sum + f.weight * 100, 0);
  
  const constraintScore = constraints.filter(c => c.met).length / constraints.length;
  
  const variableScore = variables.reduce((sum, v) => sum + v.impact, 0) / variables.length;
  
  return (factorScore * 0.5 + constraintScore * 0.3 + variableScore * 0.2) * 100;
}

function generateIndustryInsights(
  category: IndustryCategory,
  factors: IndustryFactor[],
  constraints: IndustryConstraint[],
  variables: IndustryVariable[]
): string[] {
  const insights: string[] = [];
  
  const topFactor = factors.sort((a, b) => b.value * b.weight - a.value * a.weight)[0];
  if (topFactor) {
    insights.push(
      `${topFactor.name} is the strongest performing factor at ${topFactor.value.toFixed(1)}${topFactor.unit}`
    );
  }
  
  const unmetConstraints = constraints.filter(c => !c.met && c.impact === "critical");
  if (unmetConstraints.length > 0) {
    insights.push(
      `Critical attention needed: ${unmetConstraints.map(c => c.name).join(", ")}`
    );
  }
  
  const risingFactors = factors.filter(f => f.trend === "up");
  if (risingFactors.length > 0) {
    insights.push(
      `Positive momentum in ${risingFactors.length} key ${category} factors`
    );
  }
  
  const highImpactVars = variables.filter(v => v.impact > 0.8);
  if (highImpactVars.length > 0) {
    insights.push(
      `${highImpactVars.length} high-impact variables identified for optimization`
    );
  }
  
  insights.push(
    `Overall ${category} performance index: ${calculateIndustryScore(factors, constraints, variables).toFixed(1)}/100`
  );
  
  return insights;
}
