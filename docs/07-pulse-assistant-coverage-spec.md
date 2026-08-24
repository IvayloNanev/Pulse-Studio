# Pulse Assistant Coverage Specification v1

**Status:** implementation gate  
**Product:** Product C — bounded member concierge  
**Business timezone:** `America/New_York`

## 1. Purpose

Pulse Assistant answers reasonable member questions only from approved studio policy and authenticated shared-product facts. It is not a general-purpose chatbot and it never invents policy, availability, prices, member facts, actions, or support outcomes.

The Assistant may explain and navigate. It does not book, cancel, change a membership, take payment, modify attendance, or claim that a staff action occurred.

## 2. Answer routes

| Route | Use | Performance target |
|---|---|---|
| Deterministic live fact | Exact membership, credit, reservation, activity, schedule, or capacity fact | p95 under 1 second |
| Approved policy retrieval | Exact approved rule or class-preparation answer | p95 under 1 second |
| Grounded LLM | Natural explanation combining supplied live facts and approved policies | Hard timeout of 5 seconds |
| Safe escalation | Missing rule, unavailable source, dispute, medical/safety issue, or staff-only action | Immediate and explicit |

The grounded LLM may paraphrase supplied facts. It may not introduce a factual claim that is absent from the supplied evidence.

## 3. Canonical member-question registry

Statuses:

- **READY** — authoritative source exists and the answer may be implemented now.
- **CONTRACT** — authoritative source exists, but Product C does not yet receive or validate it.
- **WORKFLOW** — policy exists, but the member needs a real page or staff workflow rather than a claimed chatbot action.
- **DECISION** — the business has not approved the rule; the Assistant must escalate until it is decided.

### Membership, pricing, and credits

| # | Canonical question | Status | Authority / required behavior |
|---:|---|---|---|
| 1 | What membership plan am I on? | READY | `member_dashboard.plan_name` |
| 2 | Is my membership active or paused? | READY | `member_dashboard.membership_status` |
| 3 | What is my actual monthly price? | READY | Use private deterministic `agreed_monthly_price`, never catalog price or external model context |
| 4 | When does my current billing cycle end? | READY | `member_dashboard.billing_cycle_end_at` |
| 5 | How many classes do I have available? | READY | `classes_remaining` |
| 6 | How many credits are currently reserved? | READY | `classes_reserved` |
| 7 | How many credits have I used? | READY | Authenticated `classes_used` from sanitized context |
| 8 | Do unused credits roll over? | READY | Business Rules §3: they expire and do not roll over |
| 9 | What outcomes use a credit? | READY | Business Rules §7 |
| 10 | Can I book after using all credits? | READY | Approved simulated $35 drop-in rule |
| 11 | Can I pause my membership? | READY | Business Rules §9 |
| 12 | Can I cancel my membership? | WORKFLOW | Self-service Account confirmation; 30-day notice; may withdraw before effective date |
| 13 | Can I reactivate a cancelled membership? | WORKFLOW | New membership at current price through enrollment; no reopening old membership |
| 14 | Can I change plans? | WORKFLOW | Member confirms in Account; change schedules automatically for next cycle without staff approval |

### Reservations, booking, waitlists, and attendance

| # | Canonical question | Status | Authority / required behavior |
|---:|---|---|---|
| 15 | What is my next reserved class? | READY | First authenticated upcoming reservation |
| 16 | What upcoming classes have I booked? | READY | Authenticated `member_reservations` list |
| 17 | Am I confirmed or waitlisted? | READY | `reservation_status` |
| 18 | Can you book this class for me? | WORKFLOW | Never claim completion; link to filtered Classes page |
| 19 | Can you cancel my reservation? | WORKFLOW | Never claim completion; link to Reservations confirmation flow |
| 20 | Can I hold two reservations for one session? | READY | Business Rules §5: no |
| 21 | What happens when a class is full? | READY | Offer waitlist; no automatic enrollment without member choice |
| 22 | Does joining a waitlist use a credit? | READY | No credit/capacity/charge while waitlisted |
| 23 | How does waitlist promotion work? | READY | FIFO among eligible members until class starts |
| 24 | When is a waitlisted drop-in charged? | READY | Only after promotion to confirmed |
| 25 | How many classes have I attended this month? | READY | `member_activity_stats` |
| 26 | What was my last attended class? | READY | Latest authenticated attended activity |
| 27 | Why was I marked no-show? | WORKFLOW | Explain rule from evidence; disputes require staff review |

### Live schedule and availability

| # | Canonical question | Status | Authority / required behavior |
|---:|---|---|---|
| 28 | What classes are available today? | READY | Query the next 14 days of `public_class_schedule` using New York dates |
| 29 | Is there yoga tomorrow? | READY | Filter live schedule by date and class type |
| 30 | Which classes still have space? | READY | Use `available_spots`; never infer from stale copy |
| 31 | Is this class full? | READY | Use current `is_full` |
| 32 | Who teaches this class? | READY | Use `instructor_name` |
| 33 | What time does this class start and end? | READY | Use `starts_at` / `ends_at` in New York time |
| 34 | What class types does Pulse offer? | READY | Yoga, cycling, and HIIT |

### Preparation and studio attendance policy

| # | Canonical question | Status | Authority / required behavior |
|---:|---|---|---|
| 35 | What should I wear for yoga? | READY | Approved yoga preparation policy |
| 36 | How should I prepare for cycling? | READY | Approved cycling preparation policy |
| 37 | What should I bring to HIIT? | READY | Approved HIIT preparation policy |
| 38 | Is this class appropriate for a beginner? | READY | Yoga/cycling are all levels; HIIT is intermediate by default with instructor-provided modifications |
| 39 | Can I arrive late and still enter class? | READY | Arrive before start; entry up to 5 minutes late is at instructor discretion; no entry after 5 minutes |
| 40 | When can staff record my check-in? | READY | 15 minutes before through 20 minutes after start; do not imply admission rights |

### Cancellations, refunds, account, and support

| # | Canonical question | Status | Authority / required behavior |
|---:|---|---|---|
| 41 | When is a member cancellation late? | READY | Less than 12 hours before start; exactly 12 hours is early |
| 42 | Will an early cancellation return my credit? | READY | Yes for eligible membership booking |
| 43 | What happens if the studio cancels? | READY | Cancel reservations, restore applicable value, notify members |
| 44 | Is my drop-in refunded if I cancel? | READY | Early: simulated refund; late/no-show: no refund |
| 45 | How do I reset my password? | WORKFLOW | Link to recovery; never request or handle a password in chat |
| 46 | How do I update my contact information? | WORKFLOW | Link to Account or approved support flow |
| 47 | What payment method is on file? | CONTRACT | If supported, expose only brand/last four/expiry; never full card or security code |
| 48 | Where can I see notifications? | WORKFLOW | Link to in-app center; use real unread/read state; email/SMS are explicitly simulated |
| 49 | How do I contact the studio? | READY | Use approved simulated email, phone, staffed hours, and one-business-day email target |
| 50 | What member services are available? | CONTRACT | Use approved program/service registry and real destinations |

## 4. Required refusals and escalation

The Assistant must not provide or imply:

- medical diagnosis, injury clearance, treatment, or emergency advice;
- guaranteed fitness, weight-loss, or health outcomes;
- action completion for booking, cancellation, payment, membership changes, refunds, attendance corrections, or staff outreach;
- resolution of billing, attendance, safety, harassment, or account-ownership disputes;
- staff-only data or operations;
- passwords, security codes, full payment numbers, authentication identifiers, or another member's information;
- answers to unrelated general-knowledge requests under the Pulse Studio identity.

For an immediate health or safety emergency, instruct the member to contact local emergency services and on-site staff. For disputes or missing business rules, say that the rule cannot be verified and provide the approved human-support route.

## 5. Context and privacy contract

Allowed external-model context is limited to the minimum required fields:

- membership status, plan name, and formatted cycle boundary;
- the signed-in member's upcoming reservations and recent attendance summary;
- requested public schedule rows and live capacity;
- approved policies with stable keys, owner/source, effective date, and escalation route.

Exact agreed price and derived credit counts remain in private deterministic server logic and are not sent to the external model. Previous personalized Assistant answers and conversation history also remain inside Pulse Studio; short follow-ups are resolved server-side.

Do not send email, phone, member/authentication identifiers, full payment information, security codes, internal notes, risk assessments, or another member's data to the model. Member name is omitted unless the question requires a natural greeting.

## 6. Automatic operational protection

- Each authenticated member may submit up to 20 Assistant requests per rolling minute.
- Each authenticated member may trigger up to 50 external-model calls per New York calendar day.
- Deterministic personal facts and approved policy answers do not consume the external-model allowance.
- When the model allowance is exhausted or quota verification is unavailable, the Assistant falls back to a verified deterministic response rather than attempting an unbudgeted model call.
- Usage counters are private database state; members cannot read or modify them directly.

## 7. Evaluation and release gate

Before release approval:

1. Each canonical question has at least three paraphrases.
2. Include compound questions, pronoun-based follow-ups, negation, typos, and ambiguous wording.
3. Include prompt-injection, unrelated, medical, emergency, dispute, staff-action, and data-exfiltration attempts.
4. Personal facts must be exactly correct in 100% of evaluation cases.
5. Invented facts, actions, prices, availability, or private data must occur in 0% of cases.
6. At least 95% of in-scope questions must receive the correct answer or route.
7. Out-of-scope questions must safely escalate in 100% of cases.
8. API tests cover 400, 401, 403, missing-context, database failure, provider timeout, provider 503, deterministic fallback, and rate limiting.
9. Deterministic p95 latency is under 1 second; grounded LLM calls have a 5-second hard timeout.
10. Production smoke tests simulate Gateway failure and verify that member facts remain truthful and useful.

## 8. Business decision status

All business decisions required by this v1 coverage specification are approved. Any new policy domain or changed operational promise reopens the decision gate before implementation.
