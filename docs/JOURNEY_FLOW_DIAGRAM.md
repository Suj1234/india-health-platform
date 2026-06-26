# Journey Flow Diagram — All Plan Types
**All personas · All paths · End to end**

---

## User Personas

| # | Persona | Who they are | Cover type | Proposer = Insured? |
|---|---|---|---|---|
| P1 | **Self Buyer** | Individual buying for themselves | Individual | ✅ Yes |
| P2 | **Family Buyer** | Buying for self + spouse + children | Family Floater | ✅ Yes (self is insured) |
| P3 | **Adult Child** | Son/daughter buying for their parents | Parents Plan | ❌ No — proposer is policy holder only |
| P4 | **Returning Customer** | Already submitted, coming back after UW decision | Any | — |
| P5 | **Insurance Agent** | Fills form on behalf of customer | Any | — (Phase 2 only) |

### Key difference for Parents Plan
The **adult child (proposer)** is the person who:
- Fills the entire form
- Does PAN verification + KYC
- Pays the premium
- Signs all declarations

But the **parents (insured members)** are the ones being covered. The proposer's age, health, BMI, lifestyle are **irrelevant** to underwriting. Health questions, NuralX scan (if applicable), and premium calculation are all based on the **parents**.

---

## Full Journey Flow Diagram

```mermaid
flowchart TD

    %% ═══════════════════════════════════════════════════════
    %% ENTRY POINTS
    %% ═══════════════════════════════════════════════════════

    P1["👤 P1 — Self Buyer\nbuys for self only"]
    P2["👨‍👩‍👧 P2 — Family Buyer\nself + spouse + children"]
    P3["🧑 P3 — Adult Child\nbuys for parents\nproposer ≠ insured"]
    P4["📧 P4 — Returning Customer\nresumes via email link\nafter UW decision"]
    P5["🧑‍💼 P5 — Agent\nPhase 2 only"]

    P1 & P2 & P3 & P5 --> LAND

    %% ═══════════════════════════════════════════════════════
    %% LANDING PAGE
    %% ═══════════════════════════════════════════════════════

    LAND["🏠 LANDING PAGE\nMarketing content\nQuote calculator\nEnter: age · city · sum insured"]

    LAND --> COVER_SEL{"Select\nCover Type"}

    COVER_SEL -->|"Just Myself"| TAG_I(["🔵 INDIVIDUAL"])
    COVER_SEL -->|"Myself + Family"| TAG_F(["🟢 FAMILY FLOATER"])
    COVER_SEL -->|"My Parents"| TAG_P(["🟠 PARENTS PLAN"])

    TAG_I --> INDV_PREM["Indicative premium\nbased on proposer age"]
    TAG_F --> FAM_PREM["Indicative premium\nbased on proposer age\n+ member count"]
    TAG_P --> PAR_PREM["Indicative premium\nbased on PARENTS ages\nnot proposer age"]

    INDV_PREM & FAM_PREM & PAR_PREM --> S1_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% STEP 1 — MOBILE OTP (identical for all plan types)
    %% ═══════════════════════════════════════════════════════

    subgraph STEP1["STEP 1 — Mobile OTP Verification"]
        S1_ENTRY["Enter 10-digit mobile\n+ tick consent checkbox\nformat: must start with 6–9"]
        S1_RATE{"Rate limit\ncheck"}
        S1_BLOCK["Blocked\nmax 3 OTPs/hour\nper mobile"]
        S1_SEND["Send OTP via Brevo SMS\nFallback: email if SMS fails\n6-digit · expires 10 min"]
        S1_SHEET["Bottom sheet opens\nEnter OTP\n30-sec resend cooldown"]
        S1_ATT{"OTP correct?\nAttempts < 3?"}
        S1_LOCKOUT["Locked out\n30-min cooldown"]
        S1_OK["✅ OTP verified\nApplication record created in DB\nCustomer user upserted\nJWT httpOnly cookie set\nstatus → otp_verified\n\nBackground: iAdore job starts"]

        S1_ENTRY --> S1_RATE
        S1_RATE -->|Blocked| S1_BLOCK
        S1_RATE -->|OK| S1_SEND
        S1_SEND --> S1_SHEET --> S1_ATT
        S1_ATT -->|Wrong · attempts < 3| S1_SHEET
        S1_ATT -->|3 attempts used| S1_LOCKOUT
        S1_ATT -->|Correct| S1_OK
    end

    S1_OK --> S2_PAN_LOAD

    %% ═══════════════════════════════════════════════════════
    %% STEP 2 — IDENTITY + MEMBERS
    %% ═══════════════════════════════════════════════════════

    subgraph STEP2["STEP 2 — Identity + Members"]

        subgraph S2A["2a — PAN Verification"]
            S2_PAN_LOAD["Loading...\nGET /api/journey/pre-profile\nCheck if iAdore has PAN for this mobile"]
            S2_PAN_Q{"PAN found\nvia iAdore?"}
            S2_CONFIRM["Show masked PAN + name\nABC*****H · Rah** S***\nConfirm / This is not my PAN"]
            S2_MANUAL["Customer types PAN\nauto-uppercased\nformat: AAAAA9999A"]
            S2_VERIFY["Look up PAN\nKarza / iAdore\nShow masked result\nConfirm / Try different PAN"]

            S2_PAN_LOAD --> S2_PAN_Q
            S2_PAN_Q -->|Yes| S2_CONFIRM
            S2_PAN_Q -->|No| S2_MANUAL
            S2_MANUAL --> S2_VERIFY
            S2_CONFIRM & S2_VERIFY --> S2_DET
        end

        subgraph S2B["2b — Personal Details"]
            S2_DET["Pre-filled form\n─────────────────────────────\nREAD-ONLY from PAN/iAdore:\nFull Name · Date of Birth · Gender\n─────────────────────────────\nEDITABLE pre-filled:\nAddress · City · State · Pincode\nOccupation · Employer name\n─────────────────────────────\nCUSTOMER ENTERS:\nEmail address"]
        end

        S2_DET --> S2_CT{"Cover type?"}

        S2_CT -->|Individual| S2_I["✅ No extra members\nProposer = only insured\nAll details already collected"]

        S2_CT -->|Family| S2_F["Add Family Members\n──────────────────\nSPOUSE\nName · DOB · Gender\n──────────────────\nCHILDREN  up to 4\nName · DOB · Gender · Relation\n(son / daughter)\n──────────────────\nAll become insured members"]

        S2_CT -->|Parents| S2_P["Add Insured Members\n──────────────────\n⚠ PROPOSER NOT INSURED\nProposer = policy holder only\n──────────────────\nFATHER optionally\nName · DOB · Gender\n──────────────────\nMOTHER optionally\nName · DOB · Gender\n──────────────────\nAt least one parent required"]

        subgraph S2C["2c — Email OTP (OTP 2)"]
            S2_I & S2_F & S2_P --> S2_EOTP_SEND["Send OTP to entered email\nbottom sheet opens\n6-digit · 10 min · 3 attempts"]
            S2_EOTP_SEND --> S2_EOTP_VER["Email OTP verified\nPOST /api/journey/profile\nProfile + members saved to DB\nstatus → profiling_started"]
        end

    end

    S2_EOTP_VER --> S3_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% STEP 3 — HEALTH DECLARATION + NURALX VITALS SCAN
    %% ═══════════════════════════════════════════════════════

    subgraph STEP3["STEP 3 — Health Declaration  +  NuralX Vitals Scan"]

        subgraph S3A["3a — NuralX Scan Initiation"]
            S3_ENTRY --> S3_NX_CT{"Cover type?\nProposer insured?"}

            S3_NX_CT -->|"Individual / Family\nProposer IS insured"| S3_NX_INIT["Initiate NuralX scan — PROPOSER\n──────────────────────────────\nPOST /api/journey/biometrics/nuralx\nNuralX OAuth → access token\nPOST /scan/initiate → scan_id + scan_url\nscan_url sent to customer's phone\nBackup link emailed\n──────────────────────────────\n30-sec face scan via phone camera\nNo app install needed — browser-based\nMeasures via rPPG from face video:\nHeart rate · Respiratory rate\nBlood pressure · SpO2 · Stress index\n──────────────────────────────\n⚡ Runs in BACKGROUND\ncustomer fills health form meanwhile"]

            S3_NX_CT -->|"Parents Plan\nProposer NOT insured"| S3_NX_SKIP["NuralX for PROPOSER — SKIPPED\n(proposer is not insured)\n──────────────────────────────\nOption A: send scan links\nto each parent's mobile number\nseperately for each parent\n──────────────────────────────\nOption B: skip entirely\nparents' vitals from questionnaire\nUW may request offline medical exam\n──────────────────────────────\nDefault Phase 1: skip"]
        end

        S3_NX_INIT & S3_NX_SKIP --> S3B_ENTRY

        subgraph S3B["3b — Vitals  (all INSURED members)"]
            S3B_ENTRY["For EACH insured member:\nHeight in cm + Weight in kg\n─────────────────────────────\nBMI auto-calculated server-side\nIndia classifications:\n< 18.5 underweight\n18.5–22.9 normal\n23–27.4 overweight\n27.5–32.4 obese class I\n> 32.5 obese class II+"]
        end

        S3B_ENTRY --> S3C_ENTRY

        subgraph S3C["3c — Lifestyle  (all adult insured members)"]
            S3C_ENTRY["For EACH adult insured member:\n─────────────────────────────\nTOBACCO\nSmoker? Y/N\nIf yes: type · qty/day · years · quit?\n─────────────────────────────\nALCOHOL\nNone / Occasional / Regular\nIf regular: units/week"]
        end

        S3C_ENTRY --> S3D_ENTRY

        subgraph S3D["3d — Pre-Existing Conditions  (per insured member)"]
            S3D_ENTRY["Condition checklist per member:\n─────────────────────────────\nDiabetes · Hypertension\nHeart disease · Cancer\nKidney disease · Liver disease\nNeurological disorder · Respiratory\nMental health · HIV/AIDS\nMusculoskeletal · Digestive\nEye disorder · Ear disorder\nSkin disorder · Other\n─────────────────────────────\nFor each YES:\nYear first diagnosed\nCurrent treatment type\nMedication names\nLast hospitalised for this condition"]
        end

        S3D_ENTRY --> S3E_ENTRY

        subgraph S3E["3e — Medical History  (per insured member)"]
            S3E_ENTRY["Per insured member:\n─────────────────────────────\nSurgeries in last 5 years? Y/N\nIf yes: type · year · hospital · outcome\n─────────────────────────────\nHospitalised last 2 years? Y/N\nIf yes: reason + duration\n─────────────────────────────\nPermanent disability? Y/N\nCurrent medications (freetext)"]
        end

        S3E_ENTRY --> S3F_ENTRY

        subgraph S3F["3f — Family + Insurance History  (proposer only)"]
            S3F_ENTRY["FAMILY HISTORY\nFather/mother conditions\nAge at onset · Alive/deceased\n─────────────────────────────\nINSURANCE HISTORY\nExisting health cover? Y/N\nIf yes: insurer · SI · since year\nClaims in last 3 years? Y/N\nEver declined by any insurer? Y/N"]
        end

        S3F_ENTRY --> S3_NX_Q

        S3_NX_Q{"NuralX webhook\nreceived?"}
        S3_NX_Q -->|"Yes — scan completed"| S3_NX_SHOW["Show vitals card\n─────────────────────\nHeart Rate: 72 bpm\nBlood Pressure: 118/76\nSpO2: 98%\nRespiratory Rate: 16/min\nStress Index: 22/100\n─────────────────────\nCalm display — no alarm labels\n'Your health snapshot is captured'"]
        S3_NX_Q -->|"No — 15 min timeout"| S3_NX_TIMEOUT["Proceed without vitals\nvitals = null stored in DB\nUW portal will flag missing scan\nstatus still progresses"]

        S3_NX_SHOW & S3_NX_TIMEOUT --> S3_RISK["Risk score computed server-side\nBMI + Smoking + Alcohol + PEDs\n+ Medical history + NuralX vitals\nRisk flags generated\nstatus → medical_done"]
    end

    S3_RISK --> S4_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% STEP 4 — PLAN CONFIRMATION
    %% ═══════════════════════════════════════════════════════

    subgraph STEP4["STEP 4 — Plan Confirmation  (single bundled plan)"]

        S4_ENTRY["Plan details displayed:\nPlan name · All benefits\nExclusions · Waiting periods\nNetwork hospital count"]

        S4_PREM["FINAL PREMIUM — computed on INSURED members\n──────────────────────────────────────────\nBase premium   calculated on insured members' ages\n+ Smoker loading   if any insured member smokes\n= Risk-adjusted base\n+ Selected riders   customer chooses\n+ GST 18%\n───────────────────────────\nTOTAL PREMIUM  ₹ X,XXX/year\n──────────────────────────────────────────\n⚠ This is the FINAL premium\nNo revision after this step"]

        S4_RIDERS["Optional Rider Add-ons\nEach shows +₹ per year\n──────────────────────\nOPD cover\nMaternity benefit\nCritical illness cover\nPersonal accident\nInternational emergency\nRoom rent waiver"]

        S4_OK["'Confirm this Plan' CTA\nselected quote + riders saved\nstatus → quote_selected"]

        S4_ENTRY --> S4_PREM --> S4_RIDERS --> S4_OK
    end

    S4_OK --> S5_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% STEP 5 — PROPOSAL + NOMINEE + DECLARATIONS
    %% ═══════════════════════════════════════════════════════

    subgraph STEP5["STEP 5 — Proposal + Nominee + Declarations"]

        S5_ENTRY["Read-only review of all collected data\nName · DOB · Gender · PAN\nMobile · Email · Address · Occupation\nSelected plan · Premium"]

        S5_CT{"Cover type?"}
        S5_ENTRY --> S5_CT

        S5_CT -->|Individual| S5_I["Marital status dropdown\n──────────────────\nNOMINEE\nName · Relation · DOB\nShare: 100% fixed"]

        S5_CT -->|Family| S5_F["Marital status dropdown\nFamily member names confirmed\n──────────────────\nNOMINEE for policy\nName · Relation · DOB"]

        S5_CT -->|Parents| S5_P["Layout shows two sections:\n──────────────────\nPOLICY HOLDER  son / daughter\nName · DOB · PAN · Mobile · Email\nAddress · Occupation\n──────────────────\nINSURED MEMBERS  parents\nEach parent shown separately\nName · DOB · Gender\n──────────────────\nNOMINEE\nAppointed per insured parent\nor single nominee for policy"]

        S5_I & S5_F & S5_P --> S5_PED_Q{"Any PED\ndeclared\nin Step 3?"}

        S5_PED_Q -->|Yes| S5_PED["Waiting Period Acknowledgment\n──────────────────────────────\nFor each declared PED:\n[Condition]  →  36-month waiting period\nDisease-specific conditions → 24 months\n(cataract · hernia · sinusitis · joint)\n──────────────────────────────\n☑ Mandatory checkbox\nBlocks submission if unchecked"]

        S5_PED_Q -->|No| S5_FREELOOK

        S5_PED --> S5_FREELOOK["Free-look notice shown to all:\n15 days from policy receipt\nReturn for refund minus exam + stamp duty"]

        S5_FREELOOK --> S5_DECL["4 Mandatory Declarations  — all must be true\n──────────────────────────────────────────\n☑ Health information is accurate and complete\n☑ Consent to data sharing with insurer / reinsurer / IRDAI\n☑ Read and accept plan terms · exclusions · waiting periods\n☑ Authorise insurer to obtain medical / financial information"]

        S5_DECL --> S5_SUB["POST /api/journey/proposal\nProposal submitted\nstatus → proposal_submitted\n─────────────────────────────────\nBackground: TKYC PAN check via Karza\nBackground: STP engine evaluation starts"]

    end

    S5_SUB --> S6_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% STEP 6 — DOCUMENTS
    %% ═══════════════════════════════════════════════════════

    subgraph STEP6["STEP 6 — Documents"]

        S6_ENTRY{"Cover type?"}

        S6_ENTRY -->|"Individual / Family"| S6_IF_OPT{"Upload method?"}

        S6_IF_OPT -->|DigiLocker| S6_DIGI["DigiLocker OAuth flow\nCustomer authorises DigiLocker\nAadhaar XML fetched server-side\nNo manual upload needed\nAadhaar auto-verified"]

        S6_IF_OPT -->|Manual Upload| S6_MAN["Upload files\n──────────────\nAadhaar FRONT  JPG/PDF ≤10MB\nAadhaar BACK   JPG/PDF ≤10MB\nSelfie/Photo   JPG/PNG ≤10MB"]

        S6_DIGI & S6_MAN --> S6_OCR["Karza OCR  background\nExtract from Aadhaar:\nName · DOB · Address · Last 4 digits\nMagic byte MIME check on upload"]

        S6_OCR --> S6_FACE["Photo-face match\nSelfie vs Aadhaar photo  via Karza\nPROPOSER identity confirmed\nThis is KYC — not health vitals"]

        S6_FACE --> S6_FIN_Q{"Financial docs\nrequired?\ninsurer config +\noccupation + SI threshold"}

        S6_FIN_Q -->|No  default OFF| S6_IF_DONE["Individual / Family\ndocs complete ✅"]

        S6_FIN_Q -->|Yes| S6_FIN["Upload financial docs\n──────────────────────────────\nSalaried:       payslips last 3m + ITR/Form16\nSelf-employed:  bank stmt 6m + ITR 2yrs\nBusiness:       bank stmt 6m + ITR 2yrs + GST cert\nRetired:        bank stmt 6m + pension statement\nStudent:        not required\n──────────────────────────────\nList shown upfront before upload starts"]

        S6_FIN --> S6_IF_DONE

        S6_ENTRY -->|Parents Plan| S6_PAR_SON["PROPOSER  son/daughter\n────────────────────────\nAadhaar front + back\nSelfie / photograph\nPAN card\n────────────────────────\nFace match: selfie vs proposer Aadhaar\n KYC of the person paying/signing\nOnly proposer does face match"]

        S6_PAR_SON --> S6_PAR_F["FATHER  insured member\n────────────────────────\nAadhaar front + back\nAge proof + identity verification\n────────────────────────\nNo selfie required\nNo face match needed\nKarza OCR extracts DOB for age verification"]

        S6_PAR_F --> S6_PAR_M["MOTHER  insured member\n────────────────────────\nAadhaar front + back\nAge proof + identity verification\n────────────────────────\nNo selfie required\nNo face match needed\nKarza OCR extracts DOB for age verification"]

        S6_PAR_M --> S6_PAR_DONE["Parents plan docs complete ✅\nKarza OCR run on all 5 documents\nAge verified for each parent\nProposer KYC confirmed"]

    end

    S6_IF_DONE & S6_PAR_DONE --> S6_FIN2

    S6_FIN2["POST /api/journey/documents/finalize\nAll required docs present?\nstatus → docs_uploaded\nCheck if STP result available"]

    S6_FIN2 --> STP_CHECK

    %% ═══════════════════════════════════════════════════════
    %% STP EVALUATION  (runs in background from Step 5)
    %% ═══════════════════════════════════════════════════════

    subgraph STP_SEC["STP EVALUATION  background since Step 5"]

        STP_CHECK{"STP result\nready?"}
        STP_SPIN["'Finalising your application...'\nPoll every 5 seconds\nMax 30 seconds wait"]
        STP_DEC{"STP Decision"}

        STP_CHECK -->|"Still running"| STP_SPIN
        STP_SPIN --> STP_CHECK
        STP_CHECK -->|"Result available"| STP_DEC
    end

    STP_DEC -->|"✅ APPROVED"| PAY_ENTRY
    STP_DEC -->|"⚠ REFERRED"| UW_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% UW PATH
    %% ═══════════════════════════════════════════════════════

    subgraph UW_SEC["NON-STP PATH — Underwriter Review"]

        UW_ENTRY["Customer sees 'Under Review' screen\nApplication reference number prominent\nExpected: 2–3 business days\nSteps 7 & 8 shown as LOCKED in stepper\nstatus → uw_pending"]

        UW_EMAIL["Email sent to customer automatically\nApplication ref · Plan name · SI\n'You will receive a link when decision is made'\nInsurer contact details"]

        UW_PORT["UNDERWRITER PORTAL\nUW logs in · sees dashboard\nOpens application · reviews:\n────────────────────────────\nApplicant profile from iAdore\nMedical declaration + risk score\nNuralX vitals  if captured\nAll uploaded documents\nOCR-extracted data\nSTP engine reasons for referral\nCredit bureau + litigation data"]

        UW_DEC{"UW Decision"}

        UW_ENTRY --> UW_EMAIL
        UW_EMAIL -.->|"customer waits\n2–3 business days"| UW_PORT
        UW_PORT --> UW_DEC
    end

    UW_DEC -->|"✅ Approved\nstandard"| UW_STD["Email sent\nOriginal premium payable\nSecure payment link\n7-day payment window"]

    UW_DEC -->|"✅ Approved\n+ Loading"| UW_LOAD["Email sent\nRevised premium calculated\nOriginal + loading %\nSecure link with revised amount\n7-day window"]

    UW_DEC -->|"✅ Approved\n+ Exclusions"| UW_EXCL["Email sent\nExclusion list detailed\nType: permanent / time-limited\nSecure link · 7-day window"]

    UW_DEC -->|"❌ Rejected"| UW_REJ["Email sent\nReason shown if insurer config allows\nApplication closed permanently\nstatus → application_closed"]

    UW_DEC -->|"📋 More Docs\nRequired"| UW_MORE["Email sent\nList of additional documents\nSecure upload link\nstatus → docs_requested"]

    UW_MORE --> UW_REUP["Customer uploads additional docs\nvia secure link\nstatus → docs_uploaded → uw_pending\nBack to UW portal queue"]

    UW_REUP --> UW_PORT

    UW_STD & UW_LOAD & UW_EXCL --> RESUME_CLICK

    %% ═══════════════════════════════════════════════════════
    %% RESUME PATH  (Returning Customer — P4)
    %% ═══════════════════════════════════════════════════════

    subgraph RESUME_SEC["RESUME SESSION  P4 — Returning Customer"]

        RESUME_CLICK["Customer clicks secure link in email"]
        RESUME_TOK["Token decoded server-side\napplication_id extracted\nJWT expiry verified"]
        RESUME_OTP_S["OTP 3 sent to registered mobile\nResume gate — not a journey step\nShown as: 'Confirm it's you'\n6-digit · 10 min · 3 attempts"]
        RESUME_OTP_V{"OTP valid?"}
        RESUME_DEC["Show UW Decision screen\nPlan details · Premium · Decision"]

        RESUME_CLICK --> RESUME_TOK --> RESUME_OTP_S --> RESUME_OTP_V
        RESUME_OTP_V -->|No| RESUME_OTP_S
        RESUME_OTP_V -->|Yes| RESUME_DEC
    end

    P4 --> RESUME_CLICK

    RESUME_DEC --> RESUME_TYPE{"Decision type?"}

    RESUME_TYPE -->|Standard approval| RESUME_PAY["Proceed to pay\nat original premium"]
    RESUME_TYPE -->|Loading| LOAD_Q{"Accept\nrevised premium?"}
    RESUME_TYPE -->|Exclusions| EXCL_Q{"Accept\nexclusions?"}

    LOAD_Q -->|"✅ Accept"| RESUME_PAY
    LOAD_Q -->|"❌ Decline"| APP_CANCEL["Application cancelled\nstatus → application_closed"]
    EXCL_Q -->|"✅ Accept"| RESUME_PAY
    EXCL_Q -->|"❌ Decline"| APP_CANCEL

    RESUME_PAY --> PAY_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% PAYMENT
    %% ═══════════════════════════════════════════════════════

    subgraph PAY_SEC["PAYMENT"]

        PAY_ENTRY["Premium summary shown\nBase + Riders + GST\nTotal payable in INR"]

        PAY_ORDER["POST /api/payment/create-order\nVerify application status eligible\nCreate Razorpay order server-side\nAmount in paise\nTest/Live keys from RAZORPAY_MODE env\nnot per-insurer — global setting"]

        PAY_RZP["Razorpay checkout overlay\nPre-filled: name · email · mobile\nCustomer pays via\nCard / UPI / Net banking / Wallet"]

        PAY_SIG{"Razorpay\nsignature\nverified?"}

        PAY_FAIL["Payment failed\nShow error + Retry CTA\nNever auto-retry\nNever trust client status"]

        PAY_DONE["Payment verified ✅\nstatus → payment_done\nTrigger policy issuance"]

        PAY_ENTRY --> PAY_ORDER --> PAY_RZP --> PAY_SIG
        PAY_SIG -->|"❌ Mismatch — reject"| PAY_FAIL
        PAY_FAIL --> PAY_RZP
        PAY_SIG -->|"✅ Verified"| PAY_DONE
    end

    PAY_DONE --> POL_ENTRY

    %% ═══════════════════════════════════════════════════════
    %% POLICY ISSUANCE
    %% ═══════════════════════════════════════════════════════

    subgraph POL_SEC["POLICY ISSUANCE"]

        POL_ENTRY["POST /api/policy/issue\nPolicy number generated\nFormat: INS-YYYY-NNNNNN\nStart date: today\nEnd date: today + 1 year"]

        POL_PDF["Generate PDF via pdf-lib\n─────────────────────────────\nPolicy summary\nAll insured members listed\nPlan benefits + limits\nExclusions  standard + UW if any\nWaiting periods\nNominee details\nIRDAI grievance officer info"]

        POL_CLOUD["Upload PDF to Cloudinary\nindia-health/insurer-slug/app-id/policy.pdf\nStore cloudinary_public_id in DB"]

        POL_EMAIL["Send policy PDF via Brevo email\nTo: customer email\nSubject: Your health policy is ready\nAttachment: policy PDF\nstatus → policy_issued"]

        POL_PAGE["Policy Issued Page\n─────────────────────────────\nPolicy number  prominent\nPlan name · Sum insured\nPremium paid · Coverage dates\nNominee · Insured members\nDownload PDF button\nFree-look reminder: 15 days"]

        POL_ENTRY --> POL_PDF --> POL_CLOUD --> POL_EMAIL --> POL_PAGE
    end
```

---

## Background Processes (never visible to customer)

| Process | Triggered when | Used by |
|---|---|---|
| **iAdore** demographic fetch | Step 1 — after OTP verified | Pre-fills PAN/details in Step 2 |
| **TKYC** PAN verification (Karza) | Step 5 — after proposal submit | STP engine · UW portal |
| **STP engine** evaluation | Step 5 — after proposal submit | Final routing decision at Step 6 end |
| **Karza OCR** on each upload | Step 6 — per document upload | Extracts DOB/name · face match |
| **Policy PDF** generation | After payment verified | Emailed to customer |

---

## Status State Machine

```
initiated
  → otp_verified            (Step 1 complete)
    → profiling_started     (Step 2 complete, iAdore running)
      → medical_done        (Step 3 complete)
        → quote_selected    (Step 4 complete)
          → proposal_submitted   (Step 5 complete)
            → docs_uploaded      (Step 6 complete)
              → stp_evaluated
                ├─[approved]──→ payment_pending → payment_done → policy_issued
                └─[referred]──→ uw_pending
                                  ├─ uw_approved ──────────→ payment_pending → payment_done → policy_issued
                                  ├─ uw_approved_loading ──→ payment_pending → payment_done → policy_issued
                                  ├─ uw_approved_exclusion → payment_pending → payment_done → policy_issued
                                  ├─ uw_rejected ──────────→ application_closed
                                  └─ uw_more_docs ─────────→ docs_requested → docs_uploaded → uw_pending
```

---

## Per-Plan-Type Comparison Table

| Step | Individual | Family Floater | Parents Plan |
|---|---|---|---|
| **Cover type selection** | "Just Myself" | "Myself + Family" | "My Parents" |
| **Indicative premium based on** | Proposer age | Proposer + member ages | Parents' ages (not proposer) |
| **Step 2 — member collection** | None | Spouse + children (DOB, gender) | Father + Mother (DOB, gender) |
| **Step 3 — health questions for** | Proposer only | Proposer + spouse + adult children | Parents only — NOT proposer |
| **Step 3 — NuralX scan** | Proposer (face scan) | Proposer (face scan) | Skipped OR sent to parents' mobiles |
| **Step 4 — premium based on** | Proposer data | All insured members' data | Parents' data |
| **Step 5 — proposal layout** | Proposer = insured | Proposer + family members | Proposer as POLICY HOLDER · Parents as INSURED |
| **Step 5 — nominee** | Proposer nominates someone | Single nominee for policy | Proposer appoints nominee per parent |
| **Step 6 — KYC docs** | Proposer: Aadhaar + selfie | Proposer: Aadhaar + selfie | Proposer: Aadhaar + selfie + PAN · Father: Aadhaar · Mother: Aadhaar |
| **Step 6 — face match** | Proposer selfie vs proposer Aadhaar | Proposer selfie vs proposer Aadhaar | Proposer selfie vs proposer Aadhaar — NOT parents |
| **Total documents** | 3 (Aadhaar F+B + selfie) | 3 (+ conditional financial) | 7 (proposer set + father Aadhaar F+B + mother Aadhaar F+B) |

---

## OTP Count Per Path

| Customer Type | OTP 1 | OTP 2 | OTP 3 | Total |
|---|---|---|---|---|
| Individual / Family — STP approved | Mobile verify | Email verify | — | **2 OTPs** |
| Individual / Family — UW referred | Mobile verify | Email verify | Resume gate | **3 OTPs** |
| Parents — STP approved | Mobile verify | Email verify | — | **2 OTPs** |
| Parents — UW referred | Mobile verify | Email verify | Resume gate | **3 OTPs** |

---

## Data Model Note — Proposer vs Insured

The `applications` table must distinguish between the proposer and the insured members:

```
cover_type:          'individual' | 'family_floater' | 'parents'
proposer_is_insured: true  (individual, family) | false  (parents)

proposal_data: {
  proposer: {
    name, pan, dob, mobile, email, address, occupation,
    is_insured: true/false
  },
  insured_members: [
    { member_id, relation: 'self'/'spouse'/'child'/'father'/'mother',
      name, dob, gender }
  ]
}
```

For **Individual** and **Family**: `proposer.is_insured = true` and `insured_members[0]` is always the proposer. No journey change.

For **Parents**: `proposer.is_insured = false`. Health questions, NuralX, and premium are computed from `insured_members[]` which contains only the parents. Proposer's health is not collected.
