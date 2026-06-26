# Medical Questionnaire Specification

**Applicable to**: All health insurance applications (mandatory, no bypass)  
**Step in Journey**: Step 7  
**DB Table**: `medical_questionnaires`  
**Indian Market Standard**: IRDAI-compliant health declaration

---

## 1. Overview

The medical questionnaire captures the health declaration required for underwriting health insurance in India. It follows standard IRDAI health insurance proposal form requirements.

Key principles:
- **Mandatory** for all applicants regardless of age or sum insured
- **Per-member** for family floater plans
- **Self-declaration** — customer attests to accuracy (no doctor required at this stage)
- **Triggers STP routing** — responses determine risk score and UW referral
- **Stored immutably** — cannot be edited after submission (UW can see original)

---

## 2. Section A: Physical Measurements

```typescript
{
  height_cm: number,    // Required. Range: 100–220 cm
  weight_kg: number,    // Required. Range: 20–200 kg
  bmi: number           // Auto-calculated: weight / (height/100)^2, round to 2 decimals
}
```

**BMI Classification (India)**:
| BMI Range | Classification | Risk Flag |
|---|---|---|
| < 18.5 | Underweight | `bmi_underweight` |
| 18.5–22.9 | Normal | none |
| 23.0–27.4 | Overweight | none |
| 27.5–32.4 | Obese (Class I) | `bmi_over_27` |
| > 32.5 | Obese (Class II+) | `bmi_over_32` |

Note: India uses lower BMI cut-offs than Western standards.

---

## 3. Section B: Lifestyle

### B1: Tobacco Use
```typescript
{
  is_smoker: boolean,

  // If is_smoker = true:
  tobacco_type: 'cigarettes' | 'bidi' | 'cigars' | 'pipe' | 'chewing_tobacco' | 'multiple',
  cigarettes_per_day: number,     // If cigarettes/bidi/cigars
  smoking_years: number,          // How many years
  has_quit_smoking: boolean,
  quit_smoking_years: number | null  // If has_quit_smoking = true
}
```

**Risk Flags**:
- `is_smoker = true` → `risk_flag: 'smoker'` (loading typically applies)
- `cigarettes_per_day > 10` → `risk_flag: 'heavy_smoker'`
- `has_quit_smoking = true AND quit_smoking_years < 3` → still flagged as ex-smoker risk

### B2: Alcohol Consumption
```typescript
{
  alcohol_consumption: 'none' | 'occasional' | 'regular',
  
  // If regular:
  alcohol_units_per_week: number,   // 1 unit = 10ml pure alcohol
  alcohol_type: 'beer' | 'wine' | 'spirits' | 'multiple'
}
```

**Risk Flags**:
- `alcohol_consumption = 'regular' AND alcohol_units_per_week > 14` → `risk_flag: 'alcohol_high'`

---

## 4. Section C: Pre-Existing Conditions

### C1: Condition Checklist
Customer answers Yes/No for each:

```typescript
{
  // Metabolic / Endocrine
  has_diabetes: boolean,                 // Type 1 or Type 2 diabetes
  has_thyroid_disorder: boolean,         // Hypo/hyperthyroidism

  // Cardiovascular
  has_hypertension: boolean,             // High blood pressure
  has_heart_disease: boolean,            // CAD, heart attack, angioplasty, bypass, valve issues

  // Oncology
  has_cancer: boolean,                   // Any cancer, carcinoma, malignancy, lymphoma

  // Renal / Hepatic
  has_kidney_disease: boolean,           // CKD, kidney stones (recurrent), dialysis
  has_liver_disease: boolean,            // Hepatitis B/C, cirrhosis, liver failure

  // Neurological
  has_neurological_disorder: boolean,    // Epilepsy, stroke, Parkinson's, multiple sclerosis

  // Respiratory
  has_respiratory_disorder: boolean,     // Asthma, COPD, sleep apnea, tuberculosis

  // Mental Health
  has_mental_health: boolean,            // Depression, anxiety disorder, bipolar, schizophrenia

  // HIV / Infectious
  has_hiv_aids: boolean,

  // Musculoskeletal
  has_musculoskeletal: boolean,          // Arthritis, spondylitis, disc prolapse, joint replacement

  // Gastrointestinal
  has_digestive_disorder: boolean,       // IBD, Crohn's, ulcerative colitis, IBS (severe)

  // Sensory
  has_eye_disorder: boolean,             // Glaucoma, retinal detachment (not refractive errors)
  has_ear_disorder: boolean,             // Hearing loss, Meniere's disease

  // Skin
  has_skin_disorder: boolean,            // Psoriasis, eczema (severe), vitiligo

  // Other
  has_other_condition: boolean,
  other_condition_details: string | null // Text if has_other = true
}
```

### C2: PED Details (for each flagged condition)
```typescript
ped_details: Array<{
  condition: string,                    // Matches condition key (e.g., 'diabetes')
  condition_display_name: string,       // User-friendly name
  diagnosis_year: number,               // YYYY (4 digits, must be <= current year)
  is_controlled: boolean,              // Is it currently under control?
  current_treatment: 'medication' | 'surgery' | 'lifestyle' | 'no_treatment' | 'multiple',
  medications: string,                  // Medication names, freetext
  last_hospitalized_year: number | null, // Year of last hospitalization for this condition
  additional_notes: string | null
}>
```

**Example**:
```json
{
  "condition": "hypertension",
  "condition_display_name": "High Blood Pressure (Hypertension)",
  "diagnosis_year": 2020,
  "is_controlled": true,
  "current_treatment": "medication",
  "medications": "Amlodipine 5mg, Telma 40mg",
  "last_hospitalized_year": null,
  "additional_notes": null
}
```

---

## 5. Section D: Surgical History

```typescript
{
  has_had_surgery: boolean,

  // If true:
  surgery_details: Array<{
    surgery_type: string,      // freetext: "Appendectomy", "CABG", "Knee replacement"
    surgery_year: number,
    hospital_name: string,
    outcome: 'complete_recovery' | 'partial_recovery' | 'ongoing_complications',
    complications: string | null
  }>
}
```

---

## 6. Section E: Family History

```typescript
{
  has_family_history: boolean,

  // If true:
  family_history: Array<{
    relation: 'father' | 'mother' | 'sibling' | 'paternal_grandfather' 
              | 'paternal_grandmother' | 'maternal_grandfather' | 'maternal_grandmother',
    condition: string,          // freetext: "Diabetes", "Heart attack", "Cancer (breast)"
    age_at_onset: number | null,
    is_alive: boolean,
    age_at_death: number | null  // If not alive
  }>
}
```

**Risk Flags from Family History**:
- Father/mother heart disease before age 55 (male) / 65 (female) → `risk_flag: 'family_cardiac_early'`
- Father/mother cancer → `risk_flag: 'family_cancer_history'`
- Multiple family members diabetes → `risk_flag: 'family_diabetes_multiple'`

---

## 7. Section F: Current Medications

```typescript
{
  is_on_medication: boolean,
  current_medications: string | null   // Freetext list of medicines, doses
}
```

---

## 8. Section G: Insurance History

```typescript
{
  has_existing_health_insurance: boolean,
  existing_insurance_details: Array<{
    insurer_name: string,
    plan_name: string,
    sum_insured: number,
    since_year: number,
    is_active: boolean
  }>,

  had_claim_last_3_years: boolean,
  claim_details: string | null,     // Freetext: claim type, year, amount
  claim_amount: number | null,

  was_ever_declined: boolean,       // Ever declined/loaded by any insurer?
  declined_details: string | null   // Which insurer, when, reason
}
```

---

## 9. Section H: Family Floater Members

Only shown if application covers family members (from proposal data).

```typescript
{
  covers_family_members: boolean,

  member_health_details: Array<{
    member_id: string,            // Links to proposal_data.members[].id
    relation: string,
    name: string,
    dob: string,
    age: number,

    // Per-member health data:
    height_cm: number,
    weight_kg: number,
    bmi: number,                  // Auto-calculated

    is_smoker: boolean,
    tobacco_type: string | null,
    cigarettes_per_day: number | null,

    ped_conditions: string[],     // List of condition keys with "yes"
    ped_details: Array<{...}>,    // Same structure as Section C2

    has_had_surgery: boolean,
    surgery_details: Array<{...}>,

    is_on_medication: boolean,
    current_medications: string | null
  }>
}
```

---

## 10. Declaration

```typescript
{
  declaration_health_accurate: boolean,  // Must be true to submit
  // Text displayed:
  // "I/We hereby declare that the information provided in this proposal form is true,
  //  complete and correct to the best of my/our knowledge and belief and that I/We have
  //  not withheld or concealed any material fact. I/We understand that any misrepresentation
  //  or concealment of material facts may render the policy voidable."
}
```

---

## 11. Risk Score Computation

```typescript
// Computed server-side after questionnaire submission
function computeRiskScore(q: MedicalQuestionnaire): { score: number, flags: string[] } {
  const flags: string[] = []
  let score = 0

  // BMI
  if (q.bmi > 32.5) { flags.push('bmi_over_32'); score += 15 }
  else if (q.bmi > 27.5) { flags.push('bmi_over_27'); score += 5 }
  else if (q.bmi < 18.5) { flags.push('bmi_underweight'); score += 5 }

  // Smoking
  if (q.is_smoker) {
    flags.push('smoker'); score += 20
    if (q.cigarettes_per_day && q.cigarettes_per_day > 10) { flags.push('heavy_smoker'); score += 10 }
  }

  // Alcohol
  if (q.alcohol_consumption === 'regular' && q.alcohol_units_per_week && q.alcohol_units_per_week > 14) {
    flags.push('alcohol_high'); score += 10
  }

  // PEDs
  const pedCount = [
    q.has_diabetes, q.has_hypertension, q.has_heart_disease, q.has_cancer,
    q.has_kidney_disease, q.has_liver_disease, q.has_neurological_disorder,
    q.has_thyroid_disorder, q.has_hiv_aids, q.has_mental_health,
    q.has_respiratory_disorder, q.has_musculoskeletal, q.has_digestive_disorder
  ].filter(Boolean).length

  if (pedCount > 0) { flags.push('has_ped'); score += pedCount * 10 }
  if (pedCount >= 3) { flags.push('multiple_ped'); score += 15 }

  // High-risk specific conditions
  if (q.has_cancer) { flags.push('cancer_history'); score += 25 }
  if (q.has_hiv_aids) { flags.push('hiv'); score += 30 }
  if (q.has_heart_disease) { flags.push('cardiac'); score += 20 }

  // Surgery
  if (q.has_had_surgery) { score += 5 }

  // Family history
  if (q.has_family_history) { score += 5 }

  // Insurance history
  if (q.had_claim_last_3_years) { score += 10 }
  if (q.was_ever_declined) { score += 10 }

  return { score: Math.min(score, 100), flags }
}
```

### Risk Score → Biometric Recommendation

```typescript
function shouldRecommendBiometrics(
  riskScore: number,
  application: Application,
  insurerConfig: InsurerConfig
): boolean {
  const sumInsured = application.selected_quote?.sum_insured ?? 0
  const age = calculateAge(application.dob!)

  return (
    riskScore > 40 ||
    age > insurerConfig.stp_auto_biometric_age ||   // default 50
    sumInsured > insurerConfig.biometric_threshold_sum_insured ||  // default 2000000
    // Always if cancer or HIV
    false  // specific flags checked above via riskScore already
  )
}
```

### Risk Score → STP Impact

| Risk Score | STP Likelihood | Typical Outcome |
|---|---|---|
| 0–20 | Very high | Auto-approved |
| 21–40 | High | Auto-approved with possible loading |
| 41–60 | Medium | Referred for UW review |
| 61–80 | Low | Referred, likely loading or exclusion |
| 81–100 | Very low | Referred, likely rejected or heavy exclusion |

---

## 12. Complete API Request Payload

```typescript
// POST /api/journey/medical
{
  "application_id": "uuid",

  // Section A
  "height_cm": 172,
  "weight_kg": 75,

  // Section B
  "is_smoker": false,
  "tobacco_type": null,
  "cigarettes_per_day": null,
  "smoking_years": null,
  "has_quit_smoking": false,
  "quit_smoking_years": null,
  "alcohol_consumption": "occasional",
  "alcohol_units_per_week": null,
  "alcohol_type": null,

  // Section C
  "has_diabetes": false,
  "has_hypertension": true,
  "has_heart_disease": false,
  "has_cancer": false,
  "has_kidney_disease": false,
  "has_liver_disease": false,
  "has_neurological_disorder": false,
  "has_thyroid_disorder": false,
  "has_hiv_aids": false,
  "has_mental_health": false,
  "has_respiratory_disorder": false,
  "has_musculoskeletal": false,
  "has_digestive_disorder": false,
  "has_eye_disorder": false,
  "has_ear_disorder": false,
  "has_skin_disorder": false,
  "has_other_condition": false,
  "other_condition_details": null,
  "ped_details": [
    {
      "condition": "hypertension",
      "condition_display_name": "High Blood Pressure (Hypertension)",
      "diagnosis_year": 2020,
      "is_controlled": true,
      "current_treatment": "medication",
      "medications": "Amlodipine 5mg",
      "last_hospitalized_year": null,
      "additional_notes": null
    }
  ],

  // Section D
  "has_had_surgery": false,
  "surgery_details": [],

  // Section E
  "has_family_history": true,
  "family_history": [
    {
      "relation": "father",
      "condition": "Diabetes",
      "age_at_onset": 55,
      "is_alive": true,
      "age_at_death": null
    }
  ],

  // Section F
  "is_on_medication": true,
  "current_medications": "Amlodipine 5mg daily",

  // Section G
  "has_existing_health_insurance": false,
  "existing_insurance_details": [],
  "had_claim_last_3_years": false,
  "claim_details": null,
  "claim_amount": null,
  "was_ever_declined": false,
  "declined_details": null,

  // Section H (family floater)
  "covers_family_members": false,
  "member_health_details": [],

  // Declaration
  "declaration_health_accurate": true
}
```
