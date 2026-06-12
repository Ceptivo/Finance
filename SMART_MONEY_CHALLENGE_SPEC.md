# Smart Money Challenge — Full Product Feature Specification

**App:** Ceptivo Finance App  
**Feature Name:** Smart Money Challenge  
**Version:** 1.0  
**Currency:** ZAR (South African Rand)  
**Status:** Pre-development specification  
**Date:** June 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Feature Goals](#2-feature-goals)
3. [Core Concept](#3-core-concept)
4. [User Journey](#4-user-journey)
5. [Admin Journey](#5-admin-journey)
6. [UI Layout & Component List](#6-ui-layout--component-list)
7. [Polished UI Copy](#7-polished-ui-copy)
8. [Database Schema](#8-database-schema)
9. [Winner Selection Logic](#9-winner-selection-logic)
10. [Edge Cases](#10-edge-cases)
11. [Security Rules & RLS Policies](#11-security-rules--rls-policies)
12. [Compliance & Disclaimer Notes](#12-compliance--disclaimer-notes)
13. [Premium Conversion Strategy](#13-premium-conversion-strategy)
14. [Analytics Metrics](#14-analytics-metrics)
15. [Step-by-Step Development Instructions](#15-step-by-step-development-instructions)

---

## 1. Product Overview

Smart Money Challenge is a premium, community-driven financial habit-building feature inside the Ceptivo Finance App. Each month, users pay a R10 entry fee to join a curated financial challenge — for example, saving R300 before month-end, tracking every expense, or going 14 days without takeaway spending.

Users who pay and confirm challenge completion qualify for the monthly reward draw. One main winner is selected at random to receive **3 months of Ceptivo Premium** (valued at R300). All other qualifying users are automatically entered into the Loser Draw, where one additional winner receives **1 month of Ceptivo Premium** (valued at R100).

Premium is a subscription benefit, not a cash payout. The feature is positioned as a paid financial growth programme — not a game of chance — using language grounded in community, progress, and financial well-being.

**Tagline:** *Build smarter habits. Win more than money.*

---

## 2. Feature Goals

| # | Goal | Success Metric |
|---|------|---------------|
| 1 | Increase Premium subscriptions | Conversion rate of challenge participants to Premium |
| 2 | Increase monthly active user retention | Month-over-month returning participants |
| 3 | Build a financial community identity | Community tracker engagement, participant growth |
| 4 | Generate additional app revenue | R10 × participants per month |
| 5 | Encourage better financial habits | Completion rate per challenge |
| 6 | Reward engaged users | Winners activate Premium post-draw |
| 7 | Drive awareness of Premium tier | CTR from challenge page to Premium upgrade page |

---

## 3. Core Concept

### Entry Rules
- Entry fee: **R10 per user per month** (non-refundable)
- Each user may join **once per month only**
- Both Free and Premium users may participate
- Monthly cap: **first 500 users** — challenge closes when cap is reached
- Users must **confirm completion** to qualify for the draw (honour system)
- Completion is self-reported: user taps "I completed this month's challenge"

### Reward Structure
| Draw | Winner Count | Prize |
|------|-------------|-------|
| Main Draw | 1 | 3 months Ceptivo Premium (R300 value) |
| Loser Draw | 1 | 1 month Ceptivo Premium (R100 value) |

- All qualified users who don't win the Main Draw are automatically entered in the Loser Draw
- If only 1 qualified user exists, they win the Main Draw — no Loser Draw runs
- The same user **cannot** win both draws in the same month

### Challenge Examples
- Save R300 before the end of the month
- No takeaway spending for 14 consecutive days
- Build a 1-month emergency fund buffer
- Track every single expense for 30 days
- Complete all financial health lessons in-app
- Reduce one spending category by 20%
- Create and stick to a monthly budget

### Revenue Model
```
Monthly revenue = R10 × participants (up to 500)
Maximum monthly revenue = R5,000
Maximum monthly prize cost = R300 (3-month Premium) + R100 (1-month Premium) = R400 value
Net maximum = R4,600 per month (before operating costs)
```

---

## 4. User Journey

### 4.1 Discovery Flow
```
Dashboard → "Smart Money Challenge" widget
  ↓
User sees: challenge title, prize, participants/500, countdown, R10 entry
  ↓
User taps "Join for R10"
  ↓
Terms & Conditions modal
  ↓
Payment screen (R10)
  ↓
Payment success → Joined state
```

### 4.2 Participation Flow
```
Joined state → User works on challenge (in-app tracking optional)
  ↓
User returns before end date
  ↓
User taps "I completed this month's challenge"
  ↓
Confirmation modal (brief, no dark patterns)
  ↓
"Qualified for draw" status badge activated
```

### 4.3 Draw & Results Flow
```
Month-end → Admin runs Main Draw
  ↓
1 winner selected from qualified users
  ↓
Winner receives Premium activation notification
  ↓
Admin runs Loser Draw from remaining qualified users
  ↓
1 winner receives 1-month Premium notification
  ↓
Winners published publicly (username only, no personal data)
  ↓
Results visible on challenge page + previous winners section
```

### 4.4 User State Machine

```
NOT_JOINED
  → (paid R10) → JOINED
      → (confirmed completion) → QUALIFIED
          → (drew main prize) → MAIN_WINNER
          → (drew loser prize) → LOSER_WINNER
          → (no prize) → PARTICIPANT_ONLY
  → (cap reached before joining) → CAP_REACHED [view only]
  → (already joined this month) → ALREADY_JOINED [view only]
```

---

## 5. Admin Journey

### 5.1 Challenge Management
1. Admin navigates to `/admin/smart-money-challenge`
2. Admin creates new monthly challenge:
   - Title (e.g. "Save R300 This Month")
   - Description (full challenge instructions)
   - Target amount (optional, for community tracker calculation)
   - Entry fee (default R10, editable)
   - Monthly cap (default 500, editable)
   - Start date
   - End date (last day to join + complete)
   - Draw date (typically 1st of following month)
3. Challenge saved as `status: 'draft'`
4. Admin publishes challenge → `status: 'active'`

### 5.2 Participant Management
1. Admin views real-time participant list
2. Columns: username, joined_at, paid, completed, qualified
3. Filter: all / paid / completed / qualified
4. Export to CSV
5. Manual override: admin can mark a user as disqualified (with reason logged)

### 5.3 Draw Management
1. Admin navigates to Draw screen after end date
2. Sees count: "X qualified participants eligible for Main Draw"
3. Taps "Run Main Draw" → confirmation dialog → random selection runs
4. Winner displayed on screen
5. Admin confirms → Premium activated on winner's account automatically
6. Admin taps "Run Loser Draw" → same flow for remaining qualified users
7. Admin publishes winners publicly (username only, confirmed by admin)
8. Admin can edit winner display text (e.g. "Saved R450 During Challenge")

### 5.4 Analytics Dashboard (Admin)
- Total participants this month
- Total revenue this month (R10 × participants)
- Completion rate (% who confirmed completion)
- Qualification rate (% of completions)
- Premium conversion rate (winners who keep Premium after reward expires)
- Month-over-month participant growth
- Historical draw audit log

---

## 6. UI Layout & Component List

### 6.1 Dashboard Widget (Home Page — `/`)

```
┌──────────────────────────────────────────────────────────────────┐
│  🏆  Smart Money Challenge                    [Join for R10 →]   │
│                                                                    │
│  This month: "Save R300 Before Month-End"                         │
│                                                                    │
│  Prize: 3 Months Premium  ·  Cap: 243/500  ·  12 days left       │
│                                                                    │
│  ████████████████░░░░░░░░  48% full                               │
└──────────────────────────────────────────────────────────────────┘
```

**States:**
- Default (not joined)
- Joined (shows challenge progress prompt)
- Qualified (shows "Draw Pending" badge)
- Cap reached (shows "Closed — Join Next Month" state)
- Results out (shows winner announcement)

### 6.2 Smart Money Challenge Main Page (`/smart-money-challenge`)

**Layout: Single-column centred feed, max-width 680px, lg: 2-col grid**

```
[Hero Section]
  Title: Smart Money Challenge
  Subtitle: Build smarter habits. Win more than money.
  Badge: Active · June 2026

[Challenge Detail Card]
  Challenge title + full description
  Target amount (if applicable)
  Start / End / Draw dates
  Glassmorphic card with emerald glow border

[Join / Status Card]
  State-aware: shows join CTA, joined status, or completion prompt
  R10 entry fee displayed prominently
  "View Terms" link

[Participant Counter + Cap Progress Bar]
  "243 people have joined this month"
  Progress bar: 243/500

[Countdown Timer]
  Days : Hours : Minutes : Seconds (live)
  Label: "Until challenge ends"

[Community Progress Tracker]
  "Together, the community has committed to saving R72,900."
  Updated: participants × target_amount

[Qualification Status Card]
  Shows: Not Joined / Joined / Qualified / Won
  Step indicator: Pay → Complete → Qualified → Draw

[Previous Winners Section]
  Tab: Main Prize Winners | Monthly Losers Draw Winners
  Cards: @Username, Won X Months Premium, [Achievement text], Month Year

[Terms Modal]
  Triggered by "View Terms" link
```

### 6.3 Component List

| # | Component | File | Description |
|---|-----------|------|-------------|
| 1 | `SmartMoneyWidget` | `components/SmartMoneyWidget.tsx` | Dashboard card widget |
| 2 | `ChallengeDetailCard` | `components/challenge/ChallengeDetailCard.tsx` | Current challenge info |
| 3 | `JoinCard` | `components/challenge/JoinCard.tsx` | State-aware join/status card |
| 4 | `PaymentModal` | `components/challenge/PaymentModal.tsx` | R10 payment flow |
| 5 | `PaymentSuccess` | `components/challenge/PaymentSuccess.tsx` | Post-payment confirmation |
| 6 | `PaymentFailed` | `components/challenge/PaymentFailed.tsx` | Payment error state |
| 7 | `CompletionCard` | `components/challenge/CompletionCard.tsx` | Confirm completion CTA |
| 8 | `QualificationBadge` | `components/challenge/QualificationBadge.tsx` | Step tracker badge |
| 9 | `CountdownTimer` | `components/challenge/CountdownTimer.tsx` | Live days:hours:min:sec |
| 10 | `ParticipantCounter` | `components/challenge/ParticipantCounter.tsx` | X/500 with progress bar |
| 11 | `CommunityTracker` | `components/challenge/CommunityTracker.tsx` | Collective savings text |
| 12 | `PreviousWinners` | `components/challenge/PreviousWinners.tsx` | Tabbed winner history |
| 13 | `WinnerAnnouncement` | `components/challenge/WinnerAnnouncement.tsx` | Main prize reveal card |
| 14 | `LoserDrawAnnouncement` | `components/challenge/LoserDrawAnnouncement.tsx` | Loser draw reveal card |
| 15 | `CapReachedBanner` | `components/challenge/CapReachedBanner.tsx` | Monthly cap full state |
| 16 | `AlreadyJoinedState` | `components/challenge/AlreadyJoinedState.tsx` | Re-entry prevention UI |
| 17 | `TermsModal` | `components/challenge/TermsModal.tsx` | T&C modal |
| 18 | `AdminChallengeForm` | `components/admin/AdminChallengeForm.tsx` | Create/edit challenge |
| 19 | `AdminParticipantTable` | `components/admin/AdminParticipantTable.tsx` | Participant management |
| 20 | `AdminDrawScreen` | `components/admin/AdminDrawScreen.tsx` | Run draw + confirm |
| 21 | `AdminAnalytics` | `components/admin/AdminAnalytics.tsx` | Revenue + conversion stats |

---

## 7. Polished UI Copy

### Dashboard Widget
- **Title:** Smart Money Challenge
- **Subtitle:** This month's challenge is live — join 243 others and build a habit worth winning.
- **CTA Button:** Join for R10
- **Joined state CTA:** Continue Your Challenge →
- **Qualified state:** ✓ You're in the draw — good luck!
- **Cap reached:** This month's challenge is full. Next challenge opens 1 July.

---

### Main Page Hero
- **H1:** Smart Money Challenge
- **Tagline:** Build smarter habits. Win more than money.
- **Description:** Each month, thousands of Ceptivo members take on a real financial challenge — and the best-disciplined earn Premium rewards. Join for R10. Complete the challenge. Qualify for the draw.

---

### Challenge Detail Card
- **Section label:** This Month's Challenge
- **Date label:** Challenge period: 1 June – 30 June 2026
- **Draw label:** Reward draw: 1 July 2026
- **Target label (where applicable):** Challenge target: R300

---

### Join / Payment Card
- **Headline:** Ready to take the challenge?
- **Description:** Pay your R10 community entry and commit to this month's financial goal. Your entry helps fund Premium rewards for the entire community.
- **Entry fee label:** Entry fee
- **Entry fee value:** R10.00
- **Prize label:** Main prize
- **Prize value:** 3 Months Ceptivo Premium (R300 value)
- **Loser draw label:** Loser draw prize
- **Loser draw value:** 1 Month Ceptivo Premium (R100 value)
- **CTA button:** Join for R10 — Pay Now
- **Terms link:** By joining, you agree to the Smart Money Challenge Terms.
- **Disclaimer:** Entry fee is non-refundable. One entry per user per month.

---

### Completion Confirmation Section
- **Headline:** How's your challenge going?
- **Description:** When you've completed this month's challenge, confirm it below. Completion is based on the honour system. Confirmed completions qualify for the reward draw.
- **CTA button:** I completed this month's challenge
- **Confirmation dialog title:** Confirm your completion
- **Confirmation dialog body:** By confirming, you acknowledge that you have completed the challenge in good faith. This qualifies you for the monthly reward draw.
- **Confirm button:** Yes, I completed it
- **Cancel button:** Not yet

---

### Qualification Status Card
- **Not joined:** You haven't joined this month's challenge yet.
- **Joined, not completed:** You've joined! Complete the challenge and confirm to qualify for the draw.
- **Qualified:** ✓ You're qualified for the reward draw. Results will be published on {draw_date}.
- **Main winner:** 🏆 Congratulations — you won 3 Months Premium! Your Premium account has been activated.
- **Loser draw winner:** 🎉 You won the Loser Draw — 1 Month Premium activated on your account!
- **No prize:** Thank you for participating! You didn't win this month, but every challenge makes you sharper with money.

---

### Countdown Timer
- **Label:** Challenge ends in
- **Sub-label:** Complete your challenge and confirm before time runs out.
- **Expired label:** This month's challenge has ended. Draw results coming soon.

---

### Monthly Cap Progress Bar
- **Label:** Spots claimed this month
- **Value example:** 243 of 500 spots filled
- **Cap reached label:** This month's challenge is fully subscribed. We'll see you in July!
- **Sub-copy:** Only 500 people can join each month. Be early next month.

---

### Community Progress Tracker
- **Headline:** The community is moving together.
- **Body (dynamic):** 243 people have joined this month's Smart Money Challenge. Together, the community has committed to saving R72,900.
- **Sub-copy:** Every person who joins strengthens the community's collective financial resolve.

---

### Previous Winners Section
- **Section title:** Wall of Winners
- **Tab 1:** Premium Winners (3-Month)
- **Tab 2:** Loser Draw Winners (1-Month)
- **Winner card format:**
  ```
  @LukeInvests
  Won 3 Months Premium
  "Saved R500 During Challenge"
  May 2026
  ```
- **Empty state:** Be the first winner — join this month's challenge!

---

### Winner Announcement (Main Prize)
- **Headline:** 🏆 This Month's Smart Money Challenge Winner
- **Body:** The reward draw for the June 2026 challenge has been completed. Congratulations to this month's winner — your dedication to building smarter money habits has been recognised.
- **Winner display:** @LukeInvests won 3 Months Ceptivo Premium
- **Sub-copy:** All other qualified participants have been entered into the Loser Draw.

---

### Loser Draw Winner Announcement
- **Headline:** 🎉 Loser Draw Winner — June 2026
- **Body:** Everyone who completed the challenge and didn't win the main prize was entered into the Loser Draw. One winner was selected from this group.
- **Winner display:** @SarahSaves won 1 Month Ceptivo Premium
- **Encouragement:** Keep going — next month's challenge is already being prepared.

---

### Payment Success
- **Headline:** You're in! 🎯
- **Body:** Your R10 entry has been confirmed. You are now officially part of the June 2026 Smart Money Challenge. Complete the challenge before 30 June 2026 to qualify for the reward draw.
- **Next step:** Start your challenge — track your progress in the app.
- **CTA:** Go to My Challenge

---

### Payment Failed
- **Headline:** Payment unsuccessful
- **Body:** We couldn't process your R10 entry fee. No amount has been charged. Please try again or use a different payment method.
- **CTA:** Try Again

---

### Monthly Cap Reached
- **Headline:** This month's challenge is full.
- **Body:** 500 people have already joined the June 2026 Smart Money Challenge. We open a new challenge every month with limited spots — be early next time.
- **CTA:** Notify me when July's challenge opens

---

### Terms & Conditions Modal
- **Title:** Smart Money Challenge — Terms & Conditions
- **Content:**
  ```
  1. ENTRY
     Entry fee is R10 per user per month. One entry allowed per user per month.
     The entry fee is non-refundable under any circumstances.

  2. ELIGIBILITY
     Open to all registered Ceptivo Finance App users (Free and Premium).
     Users must be 18 years or older to participate.

  3. CHALLENGE COMPLETION
     Completion is confirmed by the user on the honour system.
     False completion claims may result in disqualification at admin discretion.

  4. REWARD DRAW
     Only users who have paid the entry fee and confirmed completion qualify.
     Main draw: 1 winner selected at random from qualified participants.
     Loser draw: 1 winner selected at random from remaining qualified participants.
     The same user cannot win both draws in the same month.

  5. PRIZES
     Main prize: 3 months Ceptivo Premium subscription (R300 value).
     Loser draw prize: 1 month Ceptivo Premium subscription (R100 value).
     Prizes are subscription rewards, not cash, and have no cash equivalent.
     Premium rewards are activated automatically on the winner's account.

  6. WINNER SELECTION
     Winners are selected by random draw at Ceptivo's discretion.
     Winners are published by username only. No personal data is disclosed.

  7. REVENUE
     A portion of every entry fee funds Premium rewards for the community.
     Entry fees also support the operation and improvement of the app.

  8. LEGAL
     This is a paid challenge programme with a reward draw component.
     Participants should confirm compliance with applicable local laws.
     This feature is not a lottery, gambling product, or financial instrument.
     Ceptivo makes no guarantee of winning.

  9. CHANGES
     Ceptivo reserves the right to modify challenge terms month-to-month.
     Significant changes will be communicated before the challenge period opens.
  ```
- **Agree button:** I understand and agree
- **Close button:** Close

---

## 8. Database Schema

### 8.1 New Tables

```sql
-- ─── smart_money_challenges ────────────────────────────────────────────────
CREATE TABLE public.smart_money_challenges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text NOT NULL,
  target_amount     numeric,              -- optional, e.g. 300 for "save R300"
  entry_fee         numeric NOT NULL DEFAULT 10,
  monthly_cap       int NOT NULL DEFAULT 500,
  start_date        date NOT NULL,
  end_date          date NOT NULL,        -- last day to complete + confirm
  draw_date         date NOT NULL,        -- when admin runs the draw
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','completed','cancelled')),
  main_prize_months int NOT NULL DEFAULT 3,
  loser_prize_months int NOT NULL DEFAULT 1,
  created_by        uuid REFERENCES auth.users(id),
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── challenge_participants ────────────────────────────────────────────────
CREATE TABLE public.challenge_participants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id      uuid NOT NULL REFERENCES public.smart_money_challenges(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at         timestamptz NOT NULL DEFAULT now(),
  payment_id        uuid,                -- FK to payments table
  payment_status    text NOT NULL DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  completed         boolean NOT NULL DEFAULT false,
  completed_at      timestamptz,
  qualified         boolean NOT NULL DEFAULT false,
  disqualified      boolean NOT NULL DEFAULT false,
  disqualified_reason text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)         -- one entry per user per challenge
);

-- ─── challenge_payments ────────────────────────────────────────────────────
CREATE TABLE public.challenge_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id      uuid NOT NULL REFERENCES public.smart_money_challenges(id),
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  participant_id    uuid REFERENCES public.challenge_participants(id),
  amount            numeric NOT NULL,
  currency          text NOT NULL DEFAULT 'ZAR',
  provider          text,                -- e.g. 'paystack', 'peach', 'manual'
  provider_ref      text,                -- external payment reference
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','succeeded','failed','refunded')),
  payment_method    text,                -- card, EFT, etc.
  paid_at           timestamptz,
  metadata          jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── reward_draws ──────────────────────────────────────────────────────────
CREATE TABLE public.reward_draws (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id      uuid NOT NULL REFERENCES public.smart_money_challenges(id),
  draw_type         text NOT NULL
                    CHECK (draw_type IN ('main','loser')),
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','no_eligible_users')),
  eligible_count    int NOT NULL DEFAULT 0,
  run_by            uuid REFERENCES auth.users(id),  -- admin who ran the draw
  run_at            timestamptz,
  winner_user_id    uuid REFERENCES auth.users(id),
  winner_participant_id uuid REFERENCES public.challenge_participants(id),
  prize_months      int NOT NULL,
  premium_activated boolean NOT NULL DEFAULT false,
  premium_activated_at timestamptz,
  published         boolean NOT NULL DEFAULT false,
  published_at      timestamptz,
  winner_display_text text,             -- admin-editable e.g. "Saved R500"
  seed              text,               -- random seed used (for audit)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, draw_type)
);

-- ─── smart_money_winners (public-facing) ───────────────────────────────────
CREATE TABLE public.smart_money_winners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id           uuid NOT NULL REFERENCES public.reward_draws(id),
  challenge_id      uuid NOT NULL REFERENCES public.smart_money_challenges(id),
  draw_type         text NOT NULL CHECK (draw_type IN ('main','loser')),
  display_username  text NOT NULL,       -- @handle for public display
  prize_description text NOT NULL,       -- e.g. "Won 3 Months Premium"
  achievement_text  text,                -- admin-set e.g. "Saved R500 During Challenge"
  challenge_month   text NOT NULL,       -- e.g. "June 2026"
  published         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── smart_money_notifications ─────────────────────────────────────────────
CREATE TABLE public.smart_money_notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  challenge_id      uuid REFERENCES public.smart_money_challenges(id),
  type              text NOT NULL,
  -- types: 'payment_success','payment_failed','completion_confirmed',
  --        'qualified','main_winner','loser_winner','no_prize',
  --        'cap_reached_waitlist','new_challenge_open'
  title             text NOT NULL,
  body              text NOT NULL,
  read              boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── admin_challenge_logs ──────────────────────────────────────────────────
CREATE TABLE public.admin_challenge_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id     uuid NOT NULL REFERENCES auth.users(id),
  challenge_id      uuid REFERENCES public.smart_money_challenges(id),
  action            text NOT NULL,
  -- actions: 'challenge_created','challenge_published','challenge_cancelled',
  --          'participant_disqualified','main_draw_run','loser_draw_run',
  --          'premium_activated','winner_published','manual_override'
  target_user_id    uuid REFERENCES auth.users(id),
  details           jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── user_premium_subscriptions ────────────────────────────────────────────
-- (Extend existing users_financial_profiles or create separate table)
CREATE TABLE public.user_premium_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  tier              text NOT NULL DEFAULT 'premium',
  source            text NOT NULL,
  -- sources: 'paid','challenge_main_win','challenge_loser_win','manual_grant'
  months_granted    int NOT NULL DEFAULT 1,
  starts_at         timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  draw_id           uuid REFERENCES public.reward_draws(id),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── cap_waitlist ──────────────────────────────────────────────────────────
CREATE TABLE public.smart_money_waitlist (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id      uuid NOT NULL REFERENCES public.smart_money_challenges(id),
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  notified          boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
```

### 8.2 RLS + Triggers

```sql
-- Participants: users see only their own rows
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own participation" ON public.challenge_participants
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Payments: users see only their own
ALTER TABLE public.challenge_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.challenge_payments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Challenges: all authenticated users can read active challenges
ALTER TABLE public.smart_money_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active challenges" ON public.smart_money_challenges
  FOR SELECT TO authenticated
  USING (status IN ('active','completed'));

-- Winners: publicly readable
ALTER TABLE public.smart_money_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public winners" ON public.smart_money_winners
  FOR SELECT TO authenticated, anon
  USING (published = true);

-- Reward draws: admin-only write, read only for own entries
ALTER TABLE public.reward_draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage draws" ON public.reward_draws
  FOR ALL TO service_role USING (true);
CREATE POLICY "read published draws" ON public.reward_draws
  FOR SELECT TO authenticated USING (published = true);

-- Logs: service_role only
ALTER TABLE public.admin_challenge_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.admin_challenge_logs
  FOR ALL TO service_role USING (true);

-- Triggers
CREATE TRIGGER t_smart_money_challenges BEFORE UPDATE ON public.smart_money_challenges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_challenge_participants BEFORE UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_reward_draws BEFORE UPDATE ON public.reward_draws
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
```

### 8.3 Participant Count View (for real-time counter)

```sql
CREATE VIEW public.challenge_stats AS
SELECT
  c.id AS challenge_id,
  c.title,
  c.monthly_cap,
  COUNT(p.id) FILTER (WHERE p.payment_status = 'paid') AS paid_count,
  COUNT(p.id) FILTER (WHERE p.completed = true) AS completed_count,
  COUNT(p.id) FILTER (WHERE p.qualified = true) AS qualified_count,
  c.monthly_cap - COUNT(p.id) FILTER (WHERE p.payment_status = 'paid') AS spots_remaining,
  (COUNT(p.id) FILTER (WHERE p.payment_status = 'paid') >= c.monthly_cap) AS cap_reached
FROM public.smart_money_challenges c
LEFT JOIN public.challenge_participants p ON p.challenge_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.challenge_stats TO authenticated;
```

---

## 9. Winner Selection Logic

### 9.1 Algorithm

```typescript
// Server function — runs in service_role context only
async function runMainDraw(challengeId: string, adminUserId: string) {
  // 1. Fetch all qualified, non-disqualified participants
  const eligible = await supabase
    .from('challenge_participants')
    .select('id, user_id')
    .eq('challenge_id', challengeId)
    .eq('qualified', true)
    .eq('disqualified', false)
    .eq('payment_status', 'paid');

  // 2. Edge case: no eligible users
  if (eligible.data.length === 0) {
    await logAdminAction(adminUserId, challengeId, 'main_draw_run', { result: 'no_eligible_users' });
    return { status: 'no_eligible_users' };
  }

  // 3. Edge case: only 1 user — they win main prize, no loser draw
  // (handled naturally by the algorithm below)

  // 4. Generate cryptographically random index
  const seed = crypto.randomUUID(); // audit trail
  const winnerIndex = secureRandomInt(0, eligible.data.length - 1);
  const winner = eligible.data[winnerIndex];

  // 5. Record draw result
  await supabase.from('reward_draws').insert({
    challenge_id: challengeId,
    draw_type: 'main',
    status: 'completed',
    eligible_count: eligible.data.length,
    run_by: adminUserId,
    run_at: new Date().toISOString(),
    winner_user_id: winner.user_id,
    winner_participant_id: winner.id,
    prize_months: 3,
    seed,
  });

  // 6. Activate Premium on winner's account
  await activatePremium(winner.user_id, 3, 'challenge_main_win');

  // 7. Notify winner
  await sendNotification(winner.user_id, 'main_winner', challengeId);

  // 8. Log action
  await logAdminAction(adminUserId, challengeId, 'main_draw_run', {
    winner_user_id: winner.user_id,
    eligible_count: eligible.data.length,
    seed,
  });

  return { status: 'completed', winner };
}

async function runLoserDraw(challengeId: string, adminUserId: string, mainWinnerId: string) {
  // 1. Fetch all qualified users EXCLUDING main draw winner
  const eligible = await supabase
    .from('challenge_participants')
    .select('id, user_id')
    .eq('challenge_id', challengeId)
    .eq('qualified', true)
    .eq('disqualified', false)
    .eq('payment_status', 'paid')
    .neq('user_id', mainWinnerId); // exclude main winner

  // 2. Edge case: no eligible users for loser draw
  if (eligible.data.length === 0) {
    return { status: 'no_eligible_users' };
  }

  // 3. Random selection
  const seed = crypto.randomUUID();
  const winnerIndex = secureRandomInt(0, eligible.data.length - 1);
  const winner = eligible.data[winnerIndex];

  // 4. Record + activate + notify (same pattern as main draw)
  await supabase.from('reward_draws').insert({
    challenge_id: challengeId,
    draw_type: 'loser',
    // ... same fields
    prize_months: 1,
    seed,
  });

  await activatePremium(winner.user_id, 1, 'challenge_loser_win');
  await sendNotification(winner.user_id, 'loser_winner', challengeId);
  await logAdminAction(adminUserId, challengeId, 'loser_draw_run', { ... });

  return { status: 'completed', winner };
}

// Secure random integer helper
function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range;
  let value: number;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(bytesNeeded));
    value = bytes.reduce((acc, byte) => acc * 256 + byte, 0);
  } while (value >= maxValid);
  return min + (value % range);
}
```

### 9.2 Draw Rules Summary
1. Only users with `payment_status = 'paid'` AND `qualified = true` AND `disqualified = false` are eligible
2. Main draw selects 1 winner from eligible pool — purely random
3. Loser draw excludes main draw winner, selects 1 from remaining eligible pool
4. Each draw generates a `seed` UUID stored in `reward_draws` for audit purposes
5. Admin manually confirms before `premium_activated` is set to `true`
6. Winners are only published when admin sets `published = true`

---

## 10. Edge Cases

| Scenario | Handling |
|----------|----------|
| User tries to join twice in same month | `UNIQUE(challenge_id, user_id)` DB constraint returns error. UI shows "Already Joined" state. |
| User tries to join after cap reached | `cap_reached` flag checked server-side before payment. User offered waitlist. |
| Payment succeeds but participant insert fails | Use DB transaction — payment + participant insert atomic. On failure, payment is refunded. |
| User confirms completion before paying | Server function checks `payment_status = 'paid'` before setting `qualified = true`. |
| Admin runs draw before end date | Admin UI disabled until `end_date` has passed. Server-side date validation too. |
| 0 qualified participants | Admin sees "No qualified participants this month" — no draw run. |
| 1 qualified participant | They win main prize. Loser draw does not run. |
| 2 qualified participants | 1 wins main draw, 1 wins loser draw — both prizes awarded. |
| Main winner tries to win loser draw | Loser draw query uses `neq('user_id', mainWinnerId)` — impossible. |
| Premium activated but expires during reward period | `expires_at` is calculated from activation date. Not affected by billing. |
| User deletes account after winning | Premium is stored in `user_premium_subscriptions` — handled gracefully on auth cascade. |
| Admin accidentally runs draw twice | `UNIQUE(challenge_id, draw_type)` constraint on `reward_draws` prevents duplicate draws. |
| Challenge is cancelled after users have paid | Admin cancels challenge → refund flow triggered → `payment_status = 'refunded'`. |
| Network failure mid-payment | Provider webhook confirms payment — do not mark paid on client-side redirect only. |

---

## 11. Security Rules & RLS Policies

### User-Facing Rules
- A user can only read their own `challenge_participants` row
- A user can only read their own `challenge_payments` row
- A user cannot update `qualified`, `disqualified`, `payment_status` columns directly — only server functions can
- `completed = true` can only be set by the user themselves (RLS: `auth.uid() = user_id`), not by others
- Completion confirmation is rate-limited server-side (max 1 per challenge per user)

### Admin Rules
- All draw operations run as `service_role` — never as authenticated user
- Admin identity verified by a separate `admin_users` table or custom claim in JWT
- All admin actions logged to `admin_challenge_logs` with timestamp, user, and action
- Draw seed is stored — allows retroactive audit of winner selection randomness

### Payment Rules
- Payment confirmation comes from provider webhook (`service_role` only endpoint) — NOT from client redirect
- Webhook verifies signature before updating `payment_status`
- `participant_id` is created **before** payment — participant row exists in `pending` state
- Only after webhook confirms `succeeded` does participant row become active

### Anti-Fraud
- `UNIQUE(challenge_id, user_id)` prevents duplicate entries at DB level
- Server checks cap before initiating payment (race condition window acceptable at 500-user scale)
- `disqualified` flag allows admin to remove bad actors without deleting audit trail
- All completion confirmations logged with timestamp

---

## 12. Compliance & Disclaimer Notes

### Recommended In-App Disclaimer
> Smart Money Challenge is a paid financial habit-building programme. Users pay a non-refundable R10 entry fee to join a monthly financial challenge. Challenge completion is self-confirmed by the user on the honour system. One qualifying participant is selected at random to receive Ceptivo Premium as a reward. Premium is a subscription benefit with no cash equivalent. This is not a lottery, raffle, or gambling product. Ceptivo Finance does not guarantee that any user will win. Please ensure participation complies with applicable laws in your jurisdiction. Not regulated financial advice.

### Legal Checklist (Ceptivo to verify before launch)
- [ ] Confirm compliance with South African Consumer Protection Act (CPA) re: competitions and reward draws
- [ ] Confirm whether a permit is required under the Lotteries Act 57 of 1997 (promotions with entry fees and prizes may require a permit or exemption)
- [ ] Register with POPIA requirements for collecting user entry data
- [ ] Confirm payment provider (Paystack, Peach Payments, etc.) T&C allow this use case
- [ ] Draft privacy policy update for winner display (username only — confirm no POPIA breach)
- [ ] Consult a South African lawyer experienced in promotions law before public launch

### Language Policy (Enforced in All Copy)
| ❌ Do Not Use | ✅ Use Instead |
|--------------|---------------|
| Jackpot | Main Prize |
| Bet / Wager | Entry / Join |
| Raffle | Reward Draw |
| Lottery | Challenge Programme |
| Gambling | Habit-Building |
| Win big | Earn your reward |
| Lucky draw | Reward draw |

---

## 13. Premium Conversion Strategy

### During Challenge
- Non-Premium users see Premium feature teasers within the challenge flow
- "As a Premium member, you get X, Y, Z — upgrade after your free trial."
- Winners receive Premium — goal is they stay subscribed after it expires

### After Premium Expires (Winners)
- 7 days before expiry: in-app notification "Your Premium reward expires in 7 days"
- 3 days before: "Keep your Premium access for R100/month — don't lose your progress."
- On expiry: "Your reward period has ended. Upgrade to keep Premium."
- Conversion tracking: `source = 'challenge_reward_expiry'`

### For Non-Winners
- After results: "Didn't win this month? Upgrade to Premium for R100/month and access all features now."
- Community framing: "247 of your fellow challengers are already Premium members."

### Long-Term Funnel
```
R10 entry (low friction) 
  → Complete challenge (engagement + habit formation)
    → Win Premium (experience Premium value)
      → Convert to paid Premium (R100/month)
        → Rejoin next month's challenge (retention loop)
```

---

## 14. Analytics Metrics

### Core KPIs
| Metric | Definition | Target |
|--------|------------|--------|
| Participation Rate | Users who viewed challenge / users who joined | >15% |
| Completion Rate | Participants who confirmed completion | >60% |
| Qualification Rate | Completions / total participants | Same as completion rate |
| Cap Fill Rate | Days to reach 500 participants | <10 days |
| Premium Conversion (Winners) | Winners who subscribe after reward | >40% |
| Monthly Revenue | R10 × paid participants | R3,000–R5,000 |
| MoM Growth | Participant count month-over-month | >10% |

### Events to Track
```typescript
// analytics_events table — track all challenge interactions
type ChallengeEvent =
  | 'challenge_widget_viewed'
  | 'challenge_page_opened'
  | 'join_button_clicked'
  | 'terms_opened'
  | 'terms_agreed'
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'completion_button_clicked'
  | 'completion_confirmed'
  | 'winners_section_viewed'
  | 'cap_reached_banner_viewed'
  | 'waitlist_joined'
  | 'premium_upgrade_clicked_post_challenge'
```

### Admin Analytics Dashboard Data Points
- Total participants (this month vs last month)
- Revenue (R10 × paid participants)
- Completion funnel: Joined → Completed → Qualified
- Draw turnout: Qualified / Total Paid
- Premium conversion: Winners → Paid Premium subscribers
- Challenge popularity by title (for content planning)

---

## 15. Step-by-Step Development Instructions

### Phase 1 — Database & Backend (Week 1)

**Step 1.1 — Migration**
Create a new Supabase migration file with all tables from Section 8.
File: `supabase/migrations/[timestamp]_smart_money_challenge.sql`

**Step 1.2 — Server Functions**
Create `src/lib/smart-money.functions.ts`:
- `getActiveChallenge()` — returns current active challenge + stats
- `joinChallenge(challengeId)` — validates cap, creates participant row (pending), initiates payment
- `confirmPayment(participantId, paymentRef)` — webhook handler, sets payment_status = paid
- `confirmCompletion(challengeId)` — sets completed + qualified on own participant row
- `getChallengeStats(challengeId)` — returns participant count, qualified count, cap status
- `getWinners()` — returns published winners (public)
- `getUserChallengeStatus(challengeId)` — returns current user's state

Create `src/lib/admin-challenge.functions.ts` (service_role only):
- `createChallenge(data)` — create new challenge
- `publishChallenge(challengeId)` — set status to active
- `getParticipants(challengeId)` — full participant list
- `disqualifyParticipant(participantId, reason)` — mark disqualified
- `runMainDraw(challengeId)` — execute draw algorithm
- `runLoserDraw(challengeId)` — execute loser draw
- `activatePremium(userId, months, source)` — grant Premium
- `publishWinners(drawId, displayText)` — make winners public
- `getChallengeRevenue(challengeId)` — revenue report

**Step 1.3 — Payment Integration**
Integrate Paystack or Peach Payments:
- Create `/api/challenge/initiate-payment` endpoint
- Create `/api/challenge/payment-webhook` endpoint (verifies signature)
- Webhook sets `payment_status = 'succeeded'` and triggers participant activation

---

### Phase 2 — Routes & Navigation (Week 1)

**Step 2.1 — New Routes**
```
src/routes/smart-money-challenge.tsx      → main challenge page
src/routes/admin/smart-money.tsx          → admin management page
```

**Step 2.2 — routeTree.gen.ts**
Add `SmartMoneyChallengeRoute` and `AdminSmartMoneyRoute` to the route tree following the existing pattern.

**Step 2.3 — Navigation**
In `AppLayout.tsx`, add:
```typescript
{ to: "/smart-money-challenge", label: "Smart Money Challenge", icon: Trophy },
```
Use `lucide-react` `Trophy` icon.

---

### Phase 3 — Components (Week 2)

Build components in order of user flow dependency:

1. `CountdownTimer` — pure client-side, uses `setInterval`
2. `ParticipantCounter` — progress bar + fraction display
3. `CommunityTracker` — calculated text display
4. `ChallengeDetailCard` — reads from `getActiveChallenge()`
5. `JoinCard` — state-aware, reads user status
6. `TermsModal` — static content + agree button
7. `PaymentModal` — integrates with payment provider
8. `PaymentSuccess` + `PaymentFailed` — post-payment states
9. `CompletionCard` — calls `confirmCompletion()`
10. `QualificationBadge` — step indicator component
11. `PreviousWinners` — tabbed, reads from `getWinners()`
12. `WinnerAnnouncement` + `LoserDrawAnnouncement`
13. `CapReachedBanner` + `AlreadyJoinedState`
14. `SmartMoneyWidget` — dashboard card (uses data from steps 4+5)

---

### Phase 4 — Main Page Assembly (Week 2)

Assemble `src/routes/smart-money-challenge.tsx`:
```tsx
function SmartMoneyChallengePage() {
  // Query: getActiveChallenge(), getUserChallengeStatus()
  return (
    <>
      <HeroSection />
      <ChallengeDetailCard challenge={challenge} />
      <JoinCard status={userStatus} challenge={challenge} />
      <ParticipantCounter stats={stats} />
      <CountdownTimer endDate={challenge.end_date} />
      <CommunityTracker stats={stats} challenge={challenge} />
      <QualificationBadge status={userStatus} />
      <PreviousWinners />
      <TermsModal />
    </>
  );
}
```

---

### Phase 5 — Dashboard Widget (Week 2)

Add `SmartMoneyWidget` to `src/routes/index.tsx` dashboard:
- Place between the stats row and cash flow chart section
- Shows: challenge title, prize, participant count, countdown, CTA
- Adapts to user state (not joined → joined → qualified → result)

---

### Phase 6 — Admin Panel (Week 3)

Build `src/routes/admin/smart-money.tsx`:
```
Tabs: Challenges | Participants | Draw | Analytics | Logs

[Challenges tab]
  → AdminChallengeForm (create/edit)
  → Active challenge overview

[Participants tab]
  → AdminParticipantTable with filter: all/paid/completed/qualified
  → Disqualify action

[Draw tab]
  → Eligible participant count
  → "Run Main Draw" button (disabled until end_date passed)
  → Main draw result display + confirm button
  → "Run Loser Draw" button (appears after main draw)
  → Loser draw result display + confirm button
  → "Publish Winners" button + display text editor

[Analytics tab]
  → Revenue, completion rate, conversion rate
  → Funnel chart

[Logs tab]
  → admin_challenge_logs table, read-only
```

---

### Phase 7 — Testing & Edge Cases (Week 3)

Test each edge case from Section 10:
- [ ] Double-join attempt blocked
- [ ] Cap enforcement (race condition test at 499/500)
- [ ] Payment webhook idempotency (re-delivery handled)
- [ ] 0 qualified users draw flow
- [ ] 1 qualified user main draw + no loser draw
- [ ] Main winner excluded from loser draw
- [ ] Premium activation + expiry date calculation
- [ ] Admin draw disabled before end_date
- [ ] Cancelled challenge refund flow

---

### Phase 8 — Analytics & Notifications (Week 4)

- Wire up all `analytics_events` inserts at each user action
- Build notification service for:
  - Payment confirmation
  - Completion confirmation
  - Winner notifications
  - "New challenge open" push
  - "Your Premium reward expires in 7 days"
- Admin analytics dashboard using aggregation queries

---

### Tech Stack Notes

| Concern | Implementation |
|---------|---------------|
| Random draw | `crypto.getRandomValues()` in server function — never client-side |
| Payment | Paystack ZA or Peach Payments — webhook-first confirmation |
| Premium activation | Upsert to `user_premium_subscriptions`, checked on app load |
| Real-time participant count | Supabase Realtime subscription on `challenge_stats` view |
| Countdown | Client-side `useInterval` hook, synced to challenge `end_date` |
| Admin auth | Separate `is_admin` flag in user metadata or `admin_users` table |
| Audit | Every draw generates a UUID seed stored in `reward_draws.seed` |

---

*End of Smart Money Challenge Feature Specification v1.0*  
*Prepared for Ceptivo Finance App — June 2026*
