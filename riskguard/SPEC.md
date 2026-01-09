# 🛡️ RiskGuard — Project Specification

## 1. Product Overview

### Product Name
**RiskGuard** (working name)

### One-Line Description
A risk-first investment system that helps users reduce market exposure before catastrophic losses — without stock picking or constant trading.

### Core Promise
Most investing tools assume risk is static.  
RiskGuard treats risk as **dynamic** and helps users reduce exposure when market conditions deteriorate.

### Explicitly Not
- Not a stock-picking app
- Not a trading bot
- Not a robo-advisor with custody
- Not designed to beat the S&P 500 every year

---

## 2. Target User

### Primary User
Busy high-earning professionals:
- FAANG engineers
- Finance professionals
- Founders / executives

### User Characteristics
- Long-term investors
- Hold ETFs and individual stocks
- Limited time and attention
- Prefer discipline over excitement
- Care more about **avoiding large drawdowns** than maximizing upside

---

## 3. Core Philosophy & Non-Negotiable Constraints

### Investment Philosophy
- Market risk is **time-varying**
- Regime timing > stock picking
- Risk management > alpha chasing
- Fewer, higher-confidence decisions beat frequent adjustments

### Hard Constraints

| Constraint | Value |
|---------|------|
| Minimum market exposure | **20%** |
| Signals per year | **2–4** |
| Rebalance cadence | **Event-driven only** |
| Automation | **Decision support only** |
| Asset custody | **User’s own brokerage** |

---

## 4. User Delegation Boundary

### The ONE Thing the User Delegates
> **Decide when to reduce exposure**

The system does **not**:
- Pick stocks
- Optimize for tax lots
- Fully exit the market
- Chase upside

---

## 5. System Outputs (Ordered by Importance)

### Primary Output
**Market Risk State**
- `Risk-On`
- `Transition`
- `Risk-Off`

### Secondary Output
**Target Equity Exposure Range**
- Example:
  - “Reduce equity exposure from ~80% → ~40%”
- Enforces minimum exposure floor (20%)

### Tertiary Output
**Optional Portfolio-Level Guidance**
- High-level suggestions only
- Example:
  > “Consider trimming higher-beta positions first.”

🚫 No single-stock buy/sell commands in V1.

---

## 6. Assets Supported (V1)

- Broad equity ETFs (e.g., VOO, QQQ)
- User-held individual stocks (contextual only)

Explicitly excluded:
- Options
- Leverage
- Factor ETFs
- Defensive asset optimization

---

## 7. Market Regime Model (Conceptual)

The system evaluates **market structure**, not narratives.

### Example Inputs (abstract)
- Index trend
- Volatility expansion
- Market breadth
- Correlation spikes
- Drawdown velocity

Exact formulas are intentionally abstracted in V1.

---

## 8. Risk State Definitions

### Risk-On
- Healthy trends
- Low systemic stress
- Full exposure allowed

### Transition
- Early deterioration
- Mixed signals
- Awareness only
- No action required

### Risk-Off
- Elevated downside risk
- Structural stress detected
- System recommends reducing exposure
- Minimum exposure floor applies (20%)

---

## 9. Signal Confidence & Escalation

### Confidence-Based Escalation (NOT urgency-based)

| Stage | Confidence | Behavior |
|----|----|----|
| Early warning | ~60% | Informational |
| Risk-Off signal | ~80% | Action recommended |
| Reinforced Risk-Off | 90%+ | Same action, higher conviction |

### Escalation Rules
- Escalation increases **confidence only**
- No increased alert frequency
- No panic language
- No nagging

---

## 10. User Interaction Model

### Control
- User always retains final authority
- No forced actions
- No auto-trading in V1

### Ignored Signals
- System remains calm and consistent
- No shaming or “told you so”
- Later provides **counterfactual insight**, not judgment

Example:
> “If exposure had been reduced, drawdown would have been −12% vs −28%.”

---

## 11. Core Screens (V1)

### 1. Dashboard
- Current Risk State (most prominent)
- Confidence indicator
- Recommended exposure range
- Short rationale (“Why risk increased”)

### 2. Signal History
- Timeline of prior signals
- State + confidence
- Recommended exposure

### 3. Settings
Configurable (defaults shown):
- Minimum exposure floor (20%)
- Risk-Off max exposure (40%)
- Confidence escalation threshold

---

## 12. Notifications

### Trigger Conditions
- Risk state change
- Confidence escalation

### Constraints
- Max a few notifications per year
- Calm, professional tone
- Never urgent or alarmist

Example:
> “Market risk has increased.  
We recommend reviewing your exposure.”

---

## 13. Differentiation Summary (Internal)

| Dimension | Typical Robo | RiskGuard |
|--------|-------------|-----------|
| Risk model | Static | **Dynamic** |
| Rebalancing | Periodic | **Event-driven** |
| Regime awareness | None | **Core** |
| Stock picking | Sometimes | **Never** |
| Drawdown focus | Secondary | **Primary** |

---

## 14. Out of Scope (V1)

- Stock recommendations
- Options
- Tax optimization
- Auto-trading
- Custody
- Performance marketing claims

---

## 15. Success Metrics

### Product Success
- Users follow signals during stress
- Low churn during bear markets
- High trust despite missed upside

### System Success
- Rare, explainable signals
- Meaningful drawdown reduction
- Minimal notifications

---

## 16. Ethical & Trust Principles

- No “beat the market” guarantees
- No black-box decisions
- No fear-based messaging
- Trade-offs explained clearly

---

## 17. North Star Statement

> **This system exists to prevent irreversible mistakes — not to maximize excitement.**
