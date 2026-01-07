import OpenAI from 'openai';
import { ExtractionResult, Section, Issue, ExtractedItem } from '@/types';
import { findPageForQuote } from './pdf-parser';

// Venice.ai API - OpenAI-compatible endpoint
// Uses DIEM tokens for zero-marginal-cost inference
const venice = new OpenAI({
  apiKey: process.env.VENICE_API_KEY!,
  baseURL: 'https://api.venice.ai/api/v1',
});

const EXTRACTION_PROMPT = `You are a legal document analyzer specializing in Ontario condominium status certificates. Analyze the provided status certificate text and extract ALL relevant information with extreme precision.

Return a JSON object with this exact structure:
{
  "corporation": "Full corporation name and number (e.g., 'Toronto Standard Condominium Corporation No. 1511')",
  "unit": "Unit/suite number",
  "parking": "Parking space number if applicable",
  "locker": "Locker number if applicable", 
  "address": "Full property address including city, province, postal code",
  "owner": "Registered owner name(s)",
  "common_interest": "Unit's common interest percentage",
  "certificate_date": "YYYY-MM-DD",
  "expiry_date": "YYYY-MM-DD (certificate date + 60 days)",
  "sections": {
    "commonExpenses": {
      "title": "Common Expenses",
      "items": [
        {
          "id": "ce-monthly",
          "key": "monthly_amount",
          "label": "Monthly Common Expenses",
          "value": "$XXX.XX",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote from document",
          "reason": "why this confidence"
        },
        {
          "id": "ce-arrears",
          "key": "unit_arrears",
          "label": "Unit Arrears",
          "value": "$0.00 or amount",
          "status": "ok|warning|error",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "ce-prepaid",
          "key": "prepaid_expenses",
          "label": "Prepaid Common Expenses",
          "value": "amount",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "ce-increase",
          "key": "pending_increases",
          "label": "Pending Fee Increases",
          "value": "description or None",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        }
      ]
    },
    "reserveFund": {
      "title": "Reserve Fund",
      "items": [
        {
          "id": "rf-balance",
          "key": "reserve_fund_balance",
          "label": "Reserve Fund Balance",
          "value": "$X,XXX,XXX.XX",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rf-perunit",
          "key": "reserve_per_unit",
          "label": "Reserve Fund Per Unit",
          "value": "$X,XXX (calculated: balance / total units)",
          "status": "ok|warning|missing",
          "confidence": "medium",
          "quote": null,
          "reason": "Calculated from reserve balance and total units"
        },
        {
          "id": "rf-study-date",
          "key": "study_date",
          "label": "Reserve Fund Study Date",
          "value": "Month DD, YYYY",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "Flag WARNING if >2.5 years old from certificate date"
        },
        {
          "id": "rf-study-preparer",
          "key": "study_preparer",
          "label": "Study Prepared By",
          "value": "Company name",
          "status": "ok|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rf-next-study",
          "key": "next_study_date",
          "label": "Next Study Due",
          "value": "Month YYYY or date",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rf-contribution",
          "key": "annual_contribution",
          "label": "Annual Reserve Contribution",
          "value": "$XXX,XXX.XX",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rf-adequacy",
          "key": "adequacy_statement",
          "label": "Adequacy Statement",
          "value": "Adequate/Inadequate/Not stated",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "WARNING if missing or inadequate"
        }
      ]
    },
    "specialAssessments": {
      "title": "Special Assessments",
      "items": [
        {
          "id": "sa-current",
          "key": "current_assessments",
          "label": "Current Special Assessments",
          "value": "None or description with amount",
          "status": "ok|warning|error",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "WARNING if any current assessments"
        },
        {
          "id": "sa-planned",
          "key": "planned_assessments",
          "label": "Planned/Contemplated Assessments",
          "value": "None or description",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "WARNING if any planned assessments"
        }
      ]
    },
    "legalProceedings": {
      "title": "Legal Proceedings",
      "items": [
        {
          "id": "lp-judgments",
          "key": "outstanding_judgments",
          "label": "Outstanding Judgments",
          "value": "None or description",
          "status": "ok|error",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "ERROR if any judgments exist"
        },
        {
          "id": "lp-litigation",
          "key": "current_litigation",
          "label": "Current Litigation",
          "value": "None or description",
          "status": "ok|warning|error",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "ERROR if litigation >$50k, WARNING if any exists"
        },
        {
          "id": "lp-administrator",
          "key": "administrator_appointed",
          "label": "Administrator/Inspector Appointed",
          "value": "No or Yes with details",
          "status": "ok|error",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "ERROR if administrator appointed"
        },
        {
          "id": "lp-warranty",
          "key": "warranty_claims",
          "label": "Warranty Claims",
          "value": "None or description",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        }
      ]
    },
    "insurance": {
      "title": "Insurance",
      "items": [
        {
          "id": "ins-coverage",
          "key": "building_coverage",
          "label": "Building Insurance Coverage",
          "value": "$XXX,XXX,XXX.XX",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "ins-standard-ded",
          "key": "standard_deductible",
          "label": "Standard Deductible",
          "value": "$XX,XXX.XX",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "ins-water-ded",
          "key": "water_deductible",
          "label": "Water Damage Deductible",
          "value": "$XX,XXX.XX",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "WARNING if >$25,000"
        },
        {
          "id": "ins-flood-ded",
          "key": "flood_deductible",
          "label": "Flood Deductible",
          "value": "$XX,XXX.XX",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "WARNING if >$25,000"
        },
        {
          "id": "ins-liability",
          "key": "liability_coverage",
          "label": "Liability Coverage",
          "value": "$X,XXX,XXX.XX",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "ins-do",
          "key": "directors_officers_coverage",
          "label": "Directors & Officers Liability",
          "value": "$X,XXX,XXX.XX",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        }
      ]
    },
    "management": {
      "title": "Management & Governance",
      "items": [
        {
          "id": "mgmt-company",
          "key": "property_manager",
          "label": "Property Management Company",
          "value": "Company name",
          "status": "ok|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "mgmt-contact",
          "key": "manager_contact",
          "label": "Manager Contact",
          "value": "Address and phone",
          "status": "ok|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "mgmt-directors",
          "key": "board_directors",
          "label": "Number of Directors",
          "value": "X directors",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote or list of names",
          "reason": "reason"
        },
        {
          "id": "mgmt-units",
          "key": "total_units",
          "label": "Total Units in Corporation",
          "value": "XXX units",
          "status": "ok|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "mgmt-fiscal",
          "key": "fiscal_year_end",
          "label": "Fiscal Year End",
          "value": "Month DD",
          "status": "ok|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        }
      ]
    },
    "rulesRestrictions": {
      "title": "Rules & Restrictions",
      "items": [
        {
          "id": "rules-leasing",
          "key": "units_leased",
          "label": "Units Currently Leased",
          "value": "XX units (XX%)",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rules-pets",
          "key": "pet_policy",
          "label": "Pet Policy",
          "value": "description or Not specified",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rules-rental",
          "key": "rental_restrictions",
          "label": "Rental Restrictions",
          "value": "description or None noted",
          "status": "ok|warning|missing",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        },
        {
          "id": "rules-changes",
          "key": "planned_changes",
          "label": "Planned Changes to Common Elements",
          "value": "None or description",
          "status": "ok|warning",
          "confidence": "high|medium|low",
          "quote": "exact quote",
          "reason": "reason"
        }
      ]
    },
    "buildingNotes": {
      "title": "Building-Specific Notes",
      "items": []
    }
  },
  "issues": [],
  "risk_rating": "GREEN|YELLOW|RED",
  "summary": {
    "total_items": 0,
    "verified": 0,
    "warnings": 0,
    "missing": 0
  }
}

CRITICAL EXTRACTION RULES:

1. MONETARY VALUES: Always include the dollar sign and exact amount as shown. Parse carefully - $3,304,327.04 is different from $3,087,829.

2. DATES: Look for certificate date (usually at end), reserve fund study date, fiscal year dates. Calculate expiry as certificate date + 60 days.

3. RESERVE FUND STUDY AGE: 
   - Calculate age from certificate date
   - If study is >2.5 years old, set status to "warning"
   - Ontario Regulation 48/01 requires update every 3 years

4. DEDUCTIBLES:
   - Water damage deductible >$25,000 = WARNING (significant owner liability risk)
   - Flood deductible >$25,000 = WARNING
   - Earthquake deductible can be high - note but don't flag as warning

5. BUILDING-SPECIFIC ISSUES: Look for mentions of:
   - Kitec plumbing (common Ontario issue)
   - Aluminum wiring
   - UFFI insulation
   - Balcony repairs
   - Garage/parking structure issues
   - Elevator modernization
   - COVID-19 impacts
   Add any found to buildingNotes section with appropriate status

6. FINANCIAL HEALTH INDICATORS:
   - Reserve fund per unit <$3,000 = WARNING
   - Reserve fund per unit <$1,000 = ERROR
   - Operating deficit = WARNING (note if one-time or recurring)
   - Building arrears >5% of budget = WARNING

7. ISSUE SEVERITY RULES:
   - HIGH/ERROR: Any judgment, administrator appointed, litigation >$50k, special assessment >$5,000/unit
   - WARNING: Reserve study >2.5 years, water deductible >$25k, any litigation, planned assessments, operating deficit
   - LOW/INFO: Standard disclosures, minor items, informational notes

8. RISK RATING:
   - GREEN: No warnings or errors, all key info present, healthy financials
   - YELLOW: 1-3 warnings, no errors, minor concerns
   - RED: Any error, 4+ warnings, critical missing info, or serious financial concerns

ALWAYS extract the exact quote that supports each data point. If information is not found, set status to "missing" and value to "NOT FOUND".`;

export async function analyzeStatusCertificate(
  text: string,
  pages: string[] = []
): Promise<ExtractionResult> {
  // Use Claude Opus 4.5 via Venice API (OpenAI-compatible)
  const response = await venice.chat.completions.create({
    model: 'claude-opus-45',  // Claude Opus 4.5 on Venice
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\n--- STATUS CERTIFICATE TEXT ---\n\n${text}`,
      },
    ],
  });

  // Extract JSON from response (OpenAI format)
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from Venice API');
  }

  let jsonStr = content;
  
  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const result: ExtractionResult = JSON.parse(jsonStr);

  // Add page numbers to items and issues
  if (pages.length > 0) {
    for (const sectionKey of Object.keys(result.sections)) {
      const section = result.sections[sectionKey];
      for (const item of section.items) {
        if (item.quote) {
          item.page = findPageForQuote(pages, item.quote);
        }
      }
    }

    for (const issue of result.issues) {
      if (issue.quote) {
        issue.page = findPageForQuote(pages, issue.quote) || 1;
      }
    }
  }

  // Calculate summary
  let verified = 0, warnings = 0, missing = 0, total = 0;
  for (const section of Object.values(result.sections)) {
    for (const item of section.items) {
      total++;
      if (item.status === 'ok') verified++;
      else if (item.status === 'warning' || item.status === 'error') warnings++;
      else if (item.status === 'missing') missing++;
    }
  }
  result.summary = { total_items: total, verified, warnings, missing };

  return result;
}

export function calculateSummary(sections: Record<string, Section>): {
  verified: number;
  warnings: number;
  missing: number;
  total: number;
} {
  let verified = 0;
  let warnings = 0;
  let missing = 0;
  let total = 0;

  for (const section of Object.values(sections)) {
    for (const item of section.items) {
      total++;
      if (item.status === 'ok') verified++;
      else if (item.status === 'warning') warnings++;
      else if (item.status === 'missing') missing++;
    }
  }

  return { verified, warnings, missing, total };
}
