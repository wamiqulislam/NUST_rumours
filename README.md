# Rumours in NUST

## Overview

This system allows students to submit anonymous rumors or news about campus events **without any central authority controlling truth**. Instead, credibility emerges dynamically through **peer verification**, while preventing bots, repeated votes, and credibility farming.

---

## Key Features

1. **No central authority**: No admin or server decides truth.  
2. **Anonymous participation**: Votes cannot be linked to user identities.  
3. **Truth score for rumors**: Each rumor has a dynamic credibility score.  
4. **One-person-one-vote**: Prevent double voting without storing IDs.  
5. **False rumor resistance**: Popularity alone does not dictate truth.  
6. **Score consistency**: Historical rumor scores remain stable.  
7. **Sybil resistance**: Bots cannot inflate votes.  
8. **Deleted rumors**: Removing rumors does not affect unrelated ones.  
9. **Mathematical proof**: System is robust against coordinated liars.  

---

## Truth Score Mechanism

- Each rumor \(R\) has a **truth score** \(T(R) \in [-1, 1]\).  
- **Default truth score:**  
  \[
  T(R)_{default} = 0.5
  \]  
  - Neutral starting point; indicates uncertainty before votes.  

- **Weighted voting formula:**  

\[
T(R) = \frac{\sum_{v \in V_R} s(v) \cdot C(v)}{\sum_{v \in V_R} C(v)}
\]

Where:  
- \(V_R\) = set of votes on rumor \(R\)  
- \(s(v) = +1\) if vote verifies, \(-1\) if vote disputes  
- \(C(v) = credibility of the voter  

> **Intuition:** The rumor’s truth score is a weighted average of votes, where more credible users have stronger influence.

---

## User Credibility

- Each user \(U\) has a **credibility score** \(C(U) \in [0,1]\).  
- **New users start with** \(C(U) = 0.5\) (mid-level credibility).  

### Update Rules

1. **Correct vote** (aligns with rumor truth): increase credibility  
2. **Incorrect vote** (against rumor truth): decrease credibility  
3. **Cap interactions**: Once a rumor reaches a **truth threshold**, a **time limit**, or a **maximum number of votes**, no further votes are allowed to prevent farming.  

**Formula (example):**  

\[
C(U)_{new} = C(U)_{old} + \alpha \cdot \text{alignment}
\]

- `α` = adjustment step size (e.g., 0.05)  
- `alignment` = +1 if vote aligns, −1 if vote disagrees  

**Result:** Coordinated liars who consistently vote incorrectly will have **low credibility**, limiting their influence.  

---

## One-Person-One-Vote (Anonymous)

- Use **email-based user ID**:  
  1. Encrypt user email  
  2. Generate **user ID** by hashing the encrypted email  
  3. Use user ID for voting and rumor interactions  

- During vote submission and rumor creation, the **user ID remains encrypted**.  
- The encrypted ID can be **decrypted** only for:  
  - Updating credibility when a new user votes on a rumor  
  - Recomputing rumor truth scores when a rumor is deleted  

---

## Bot and Sybil Prevention

- **One vote per user**  
- Only **.edu emails** allowed  
- **Path verification** during registration  
- **Behavioral bot detection**  
- **Cap interactions** per rumor  
- Optionally monitor for **abnormal voting patterns**  

---

## AI-Driven Rumor Filtering

- **Detect logical fallacies**; reject rumors with obvious errors  
- **Detect AI-generated content**; prevent posting AI-generated rumors  
- **Detect unrelated posts**; rejects posts unrelated to the university  
- **Contextual verification**: Compare with previous rumors and their truth scores or general context to predict if the new rumor is likely true  

---

## Anonymized Commenting

- Users can comment while verifying or disputing rumors  
- Comments are **fully anonymous**  
- Adds context and sources to votes  

---

## Handling Deleted Rumors

- Rumors form a **DAG of references**  
- When a rumor is deleted:  
  - Remove **only edges referencing it**  
  - Recompute affected truth scores using DAG  
- Ensures old rumors do not corrupt new rumor scores  

---

## Credibility & Score Workflow

1. User votes → check vote hash  
2. Update **rumor truth score** using weighted formula  
3. Adjust **user credibility** based on alignment  
4. Lock voting if rumor reaches threshold, time limit, or total votes cap  
5. AI filters rumor before posting  
6. Record anonymous comments  

---

## Advantages

- Fully decentralized; no admin intervention  
- Anonymous voting with encrypted user IDs  
- Weighted credibility prevents coordinated liars from dominating  
- Bot and Sybil attack mitigation  
- AI-enhanced rumor quality control, including similarity/context checks  
- Anonymous comments for discussion  

---

## Summary

> The system is a **self-regulating, trust-driven, anonymous rumor platform**.  
> Truth emerges dynamically from credible voters, while anonymity, decentralization, and AI moderation ensure reliability and fairness.
 