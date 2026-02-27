# AuthZ Orchestrator – Minimal Implementation Spec (Keto + OPA)

> Concise “Claude code instruction” to build a **demo** (not production) showing:
> - Structural resource access (folders / products) via **ORY Keto**
> - Attribute / contextual decisions via **real OPA**
> - Non‑technical UI for editing predefined policy parameters (no Rego exposure)
> - Risk + working hours + action time window + assurance (AAL) step‑up logic
> - Unified decision endpoint with explanations

Ignore for this demo: deep security hardening, metrics, deployment topology, advanced governance, bundle signing.

---

## 1. High-Level Flow

1. Client → Orchestrator `/decision` with: subject, action, resource, context (ip, timestamp, session_aal).
2. Orchestrator:
   - Maps `action` → required structural relation(s).
   - Keto `Check` for (resource’s parent object, relation, subject).
   - If structural fail ⇒ immediate `DENY` (still return base fields).
   - Enrich context (resource attributes, tenant policy config, risk classification).
   - Call OPA (`/v1/data/authz/decision`) with assembled input.
   - Merge structural + policy result → final state: `ALLOW | DENY | STEP_UP_REQUIRED`.
3. Return JSON with explanation: structural path (optional simplified), policy reasons, (required vs current AAL).

---

## 2. Minimum Domain Modeling

### Resources
- Folder (or Product) object key: `folder:<tenant>:<folderId>`
- Files belong to a folder; structural checks happen at folder level (demo).
- File metadata (for attribute policy):
  - classification: `public | internal | confidential`
  - required_clearance (int, optional)
  - tags: string[]
  - allowed_regions: string[] (optional)

### Users (demo stub)
- Example subjects: `user:alice`, `user:bob`, `user:carol`
- Attributes: `clearance` (int), `after_hours_override` (bool)

### Keto Relations (namespace: `folder`)
- `admin`
- `editor` (includes `admin`)
- `viewer` (includes `editor`)
- (Optional) `exporter` (includes `viewer`) if you need an export action.

(Only implement the minimal set you demo.)

---

## 3. Predefined Policy Templates (Parameters Only)

Template | Purpose | Editable Parameters (UI) | Internal Logic (hidden)
---------|---------|---------------------------|------------------------
Working Hours | Restrict actions outside allowed hours | Blocks: day(s), start_hour, end_hour; override subjects | If outside & no override → deny
Action Time Windows | Restrict specific actions to windows; handle freezes | Per action: windows[]; freeze intervals; emergency flag | Freeze > window precedence
Risk-Based Assurance | Require higher AAL under risk / sensitivity | base_action_aal map; escalation rules (risk + classification); accepted_factors per AAL; step_up_ttl | If session_aal < required_aal → step_up_required
Classification / Clearance | Enforce clearance | Optional per tenant clearance offset | Compare subject.clearance ≥ required_clearance
(Option) IP / Region | Basic context gating | ip_allowlist, allowed_regions | If set & mismatch → deny

Only implement the ones you will actually showcase (recommend: Working Hours + Time Windows + Risk/AAL + Clearance).

---

## 4. Tenant Policy Config Shape (Draft → Active)

```jsonc
{
  "working_hours": {
    "blocks": [
      { "days": ["MON","TUE","WED","THU","FRI"], "start_hour": 8, "end_hour": 18 }
    ],
    "override_subjects": ["user:alice"]
  },
  "action_time_windows": {
    "actions": {
      "file.export": [
        { "days": ["MON","TUE","WED","THU","FRI"], "start_hour": 9, "end_hour": 17 }
      ]
    },
    "freezes": [
      { "action_pattern": "file.export", "start_iso": "2025-10-15T16:00:00Z", "end_iso": "2025-10-15T17:00:00Z", "reason": "Maintenance" }
    ],
    "emergency_override": false
  },
  "assurance": {
    "base_action_aal": {
      "file.read": 1,
      "file.edit": 2,
      "file.approve": 2,
      "file.export": 2
    },
    "risk_escalation_rules": [
      { "match": { "risk": "HIGH" }, "required_aal": 3 },
      { "match": { "classification": "confidential" }, "required_aal": 2 }
    ],
    "accepted_factors": {
      "2": ["totp","passkey"],
      "3": ["fido2_key"]
    },
    "step_up_ttl_minutes": { "2": 30, "3": 10 }
  },
  "clearance_offsets": {
    "confidential": 3
  }
}
```

Validation (server-side):
- No overlapping time blocks per action.
- `start_hour < end_hour` (0–23).
- `required_aal >= base_action_aal`.
- Freeze interval `start < end`.

---

## 5. OPA Input Contract (Minimal)

Field | Description
------|------------
subject.id | `user:<id>`
subject.clearance | int
subject.attributes.after_hours_override | bool
resource.type | "file"
resource.attributes.classification | string
resource.attributes.required_clearance | int (nullable)
resource.attributes.tags | string[]
action | e.g. `file.read`
context.ip | string (optional)
context.hour_utc | int
context.risk.level | LOW|MED|HIGH (string)
session.aal | current session AAL (int)
tenant.config | (Injected tenant config subset) OR use `data.tenants.<tenant>.config` in OPA
structural_allowed | bool (gate)

OPA returns decision object with: `allow`, `reasons[]`, `required_aal`, `session_aal`.

---

## 6. Decision Response (Unified)

```jsonc
{
  "state": "ALLOW | DENY | STEP_UP_REQUIRED",
  "action": "file.read",
  "resource": "file:fileConf",
  "subject": "user:bob",
  "tenant": "tenantA",
  "structural": {
    "allowed": true,
    "required_relations": ["viewer"],
    "path": ["viewer","user:bob"] // optional simplified
  },
  "policies": [
    { "template": "working_hours", "status": "pass", "reason_codes": [] },
    { "template": "action_time_window", "status": "fail", "reason_codes": ["freeze_active"] },
    { "template": "assurance", "status": "fail", "reason_codes": ["assurance_step_up_required"], "details": { "required_aal": 3, "session_aal": 2 } }
  ],
  "risk": { "level": "HIGH", "reasons": ["new_device","after_hours"] },
  "required_aal": 3,
  "session_aal": 2,
  "factors_suggested": ["fido2_key"],
  "reasons": ["freeze_active","assurance_step_up_required"],  // flattened ordered list
  "config_version": "v5",
  "timestamp": "2025-10-10T10:10:10Z"
}
```

Reason ordering priority: structural → working_hours → action_time_window/freeze → assurance → clearance/classification → network → system.

---

## 7. Minimal API Endpoints

Method | Path | Purpose
-------|------|--------
POST | `/decision` | Main authorization decision
GET  | `/policy/tenant/:tenant/config` | Fetch active + (if present) draft summary
PUT  | `/policy/tenant/:tenant/draft` | Create/update draft parameters
POST | `/policy/tenant/:tenant/validate` | Run validation (returns errors/warnings)
POST | `/policy/tenant/:tenant/simulate` | (Optional simple) Return count of changed allows/denies vs active
POST | `/policy/tenant/:tenant/publish` | Promote draft → active (if valid)
GET  | `/policy/templates` | List templates + editable fields
GET  | `/explain/structural` | (Optional) raw Keto check/expand for debugging
GET  | `/health` | Basic health

Simplify if needed: keep only `/decision`, config CRUD (PUT/GET), and `/publish`.

---

## 8. UI: Minimal Panels (Non‑Technical)

Panel | Elements | Purpose
------|----------|--------
Policy Catalog | List templates + status (active / overridden) | Orientation
Working Hours Editor | Block table (Add/Edit/Delete) | Adjust allowed time
Action Windows | Action selector + windows + freeze modal + emergency toggle | Time-based gating
Assurance Matrix | Base AAL inline editable cells + escalation rule rows | Risk/AAL tuning
Overrides | After-hours subjects, IP allowlist (if used) | Exceptions
Draft Review | JSON preview (read-only) + validation results + publish button | Finalize
Decision Tester | Form: subject, action, resource, hour, risk override | Live check & explanation

Constraints:
- No code editing UI.
- Plain English tooltips (“Escalate required security level when risk HIGH.”)

---

## 9. Risk Model (Demo Simplification)

Rule Set (hardcoded):
- `HIGH` if (hour_utc < 6 OR hour_utc >= 22) AND classification in {internal, confidential}
- `MED` if classification = internal
- Else `LOW`

Include risk reasons list (e.g., `["late_hour"]`).

---

## 10. Step-Up Logic (Simplified)

1. Compute `required_aal` from base + escalation rules.
2. If `session.aal >= required_aal` → policy pass `assurance_sufficient`.
3. Else:
   - Response `state = STEP_UP_REQUIRED`
   - Include `required_aal`, `factors_suggested` (from config.accepted_factors[required_aal])
   - Caller (UI) just displays message (no real ceremony).

---

## 11. Minimal Validation Rules (Server-Side)

Rule | Failure Type
-----|-------------
Time block overlap (same template + day) | Error
Freeze interval invalid (end ≤ start) | Error
Escalation required_aal < base_action_aal | Error
AAL outside {1,2,3} | Error
Empty escalation rule match (no selector) | Warning (allowed)
Duplicate escalation match tuple | Error
Missing base_action_aal for an action referenced in rules | Error

Return JSON:
```
{ "valid": false, "errors": [ { "code": "OVERLAP_BLOCK", "field": "working_hours.blocks[1]" } ], "warnings": [] }
```

---

## 12. Demo Narratives (Script)

Scenario | Steps | Expectation
--------|-------|------------
1. Baseline access | Bob views public file | ALLOW (no reasons)
2. Clearance deny | Bob reads confidential (clearance 2 < 3) | DENY `clearance_insufficient`
3. Working hours deny | Carol reads internal at 02:00 | DENY `working_hours_violation`
4. Override | Add Carol to override, re-check | ALLOW `working_hours_override_applied`
5. Risk step-up | Bob approves confidential at 23:00 | STEP_UP_REQUIRED `required_aal=3`
6. Freeze | Add freeze for `file.export`, attempt export | DENY `freeze_active`
7. Emergency override | Flip emergency flag, re-check export | ALLOW `emergency_override_active`

---

## 13. “Claude Code” Generation Targets

When asking the model to generate code, specify tasks incrementally, e.g.:

1. “Generate OpenAPI spec for the endpoints in AUTHZ_ORCHESTRATOR_MIN_SPEC.md”
2. “Implement decision pipeline pseudo-code (no external libs).”
3. “Generate OPA Rego stub that consumes: structural_allowed, working_hours blocks, action windows, risk, clearance, assurance config—return decision object.”
4. “Produce validation module for policy draft (JS).”
5. “Create JSON schema for tenant config based on section 4.”

Always restate:
- Do not expose raw Rego editing endpoints.
- Follow exact decision response contract.
- Maintain reason priority ordering.

---

## 14. Minimal Reason Codes (Canonical List)

Category | Codes
---------|------
Structural | structural_denied
Working Hours | working_hours_violation, working_hours_override_applied
Action Window | action_window_denied
Freeze | freeze_active
Assurance | assurance_step_up_required, assurance_sufficient
Clearance | clearance_insufficient
Emergency | emergency_override_active
System | policy_engine_unavailable

---

## 15. Minimal Data Needed to Seed Demo

Item | Example
-----|--------
Folder tuple | (folder:tenantA:fin, viewer, user:bob)
Folder tuple | (folder:tenantA:fin, viewer, user:carol)
Folder tuple | (folder:tenantA:fin, admin, user:alice)
File public | classification=public
File confidential | classification=confidential, required_clearance=3
Tenant config | Working hours block 08–18; base_action_aal; simple escalation rule

---

## 16. Done Criteria

Must have before demo:
- `/decision` returns ALLOW / DENY / STEP_UP_REQUIRED per scenarios
- UI can edit and publish working hours + escalation rules
- Validation prevents overlapping blocks
- Explanation includes ordered reasons
- Risk changes can flip required AAL
- Draft vs Active version visible

---

## 17. Out-of-Scope (Intentionally Ignored)

- Multi-region deployment
- Metrics dashboards
- Complex identity / SSO flows
- Quotas, dual control, masking
- Full audit persistence (logging only acceptable)

---

## 18. Summary

Build a lightweight **AuthZ Orchestrator** that:
- Uses Keto for “can this user even be considered?”
- Uses OPA for “given attributes & context, should it proceed or need step-up?”
- Lets non-technical users edit **parameters only** for predefined policy templates through a simple UI.
- Produces a single, explainable decision response with minimal states.
- Demonstrates divergence between users sharing structural access due to attribute & risk policies.

This spec is the concise blueprint to implement the demo rapidly.

---