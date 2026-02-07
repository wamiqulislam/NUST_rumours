# Mathematical Robustness Proofs

This document provides formal reasoning for the system's mathematical properties.

## 1. Truth Score Convergence

### Theorem

The credibility-weighted truth score T(R) converges to a stable value as votes accumulate.

### Definition

```
T(R) = Σ(s(v) · C(v)) / Σ(C(v))
```

Where:

- s(v) ∈ {-1, +1} (dispute/verify)
- C(v) ∈ [0, 1] (voter credibility)

### Proof

The truth score is a weighted average bounded by [-1, 1] (before normalization) or [0, 1] (after).

As votes accumulate:

1. **Boundedness**: T(R) ∈ [0, 1] always holds since it's a weighted average
2. **Diminishing marginal impact**: Each new vote's impact is:
   ```
   ΔT = (s_new · C_new - T_old · C_new) / (W_old + C_new)
   ```
   As W_old grows, |ΔT| → 0
3. **Law of large numbers**: With honest majority, votes converge to true mean

**Convergence rate**: After n votes with average credibility C̄:

```
Variance(T) ≈ σ² / (n · C̄)
```

## 2. Dishonesty Leads to Credibility Decay

### Theorem

Sustained dishonest voting (voting against final outcomes) leads to credibility approaching zero.

### Credibility Update Rule

```
C_new = clip(C_old + α × alignment, 0, 1)
```

Where:

- α = 0.05 (step size)
- alignment = +1 if vote matches final outcome, -1 otherwise

### Proof

Let p be the probability a user votes correctly (matches final outcome).

Expected credibility change per vote:

```
E[ΔC] = α × (p - (1-p)) = α × (2p - 1)
```

For dishonest users (p < 0.5):

- E[ΔC] < 0 (negative drift)
- After n votes: E[C_n] = C_0 + n × α × (2p - 1)
- Since 2p - 1 < 0, credibility decreases monotonically

**Bound**: Floor at C = 0 ensures users cannot go negative.

### Corollary

A user voting randomly (p = 0.5) maintains constant credibility on average.
Only users with p > 0.5 (correct majority) gain credibility.

## 3. No Finite Group Can Dominate Truth Long-Term

### Theorem

No finite group of colluding voters can permanently control truth outcomes if the honest majority votes over time.

### Assumptions

1. Honest majority: More than 50% of total credibility-weighted votes are honest
2. Credibility decay: Dishonest voters lose credibility
3. Locking mechanism: Rumors lock at thresholds, preventing retroactive changes

### Proof

**Phase 1: Initial Attack**
A colluding group with combined credibility W_attack attempts to manipulate truth score.

**Phase 2: Honest Response**
If honest users with combined credibility W_honest also vote:

```
T = (W_attack × s_attack + W_honest × s_honest) / (W_attack + W_honest)
```

**Phase 3: Credibility Consequences**
After locking:

- If attackers' votes match outcome: They gain credibility (but truth was correct anyway)
- If attackers' votes oppose outcome: Each attacker loses 0.05 credibility

**Phase 4: Long-term Decay**
Over multiple rounds, attackers' credibility decays:

```
W_attack(t) = W_attack(0) × (1 - α)^t   (for consistent opposition)
```

Eventually: W_attack → 0, eliminating influence.

### Rate of Decay

For a group consistently voting incorrectly on k rumors:

```
Average C after k rumors = C_0 - k × α = C_0 - 0.05k
```

After 10 incorrect votes: C drops from 0.5 to 0.0

## 4. Forward-Only Credibility Changes

### Property

Historical rumor scores remain stable after locking.

### Mechanism

1. Rumor locks when T ≥ 0.75 (verified) or T ≤ 0.25 (disputed)
2. Locked rumors reject new votes
3. Credibility updates occur at lock time only
4. No retroactive recalculation

### Implication

Past decisions cannot be altered by future activity, ensuring:

- Historical integrity
- No retroactive manipulation
- Predictable outcomes

## 5. Sybil Attack Resistance

### Theorem

Creating multiple fake accounts provides diminishing returns.

### Defenses

1. **Rate limiting**: Max 10 votes/hour, 50/day per identity
2. **New account penalty**: High early activity is flagged
3. **Credibility starting point**: New accounts start at C = 0.5
4. **Pattern detection**: Coordinated voting patterns flagged

### Analysis

For n Sybil accounts:

- Initial combined credibility: n × 0.5
- Rate limit: n × 10 votes/hour max
- If voting incorrectly, each account's credibility decays

**Cost of attack**: Maintaining n accounts requires:

- n distinct fingerprints
- Coordinated but not identical voting patterns
- Accepting credibility decay on all accounts

**Break-even**: Attack costs exceed benefits when honest community size > n/0.5

## 6. Assumptions

The proofs above assume:

1. **Honest majority**: More than 50% of total credibility-weighted participation is honest
2. **No trusted third party**: All rules are automatic and deterministic
3. **Anonymity holds**: Users cannot be de-anonymized to target
4. **Time proceeds**: Rumors eventually reach voting thresholds
5. **Diverse participation**: No single entity controls majority of initial accounts

## 7. Summary

| Property             | Guarantee                                 |
| -------------------- | ----------------------------------------- |
| Convergence          | T(R) stabilizes as votes increase         |
| Dishonesty penalty   | Consistent incorrect voting → C → 0       |
| Attack resistance    | Finite groups cannot permanently dominate |
| Historical stability | Locked scores never change                |
| Sybil resistance     | Rate limits + decay make attacks costly   |
