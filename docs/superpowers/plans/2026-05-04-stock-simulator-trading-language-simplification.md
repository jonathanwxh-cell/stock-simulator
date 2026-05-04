# Trading Language Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make stock trading controls easier for new players by separating immediate trades from planned automation and replacing finance jargon with action-oriented labels.

**Architecture:** Add a small shared language module in the engine layer so labels and helper copy stay consistent across stock detail, pending orders, help text, and smoke tests. Keep behavior unchanged; only copy, grouping, and clarity surfaces change.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright smoke harness.

---

### Task 1: Shared Trading Language

**Files:**
- Create: `src/engine/tradeLanguage.ts`
- Create: `src/engine/__tests__/tradeLanguage.test.ts`
- Modify: `src/engine/index.ts`

- [ ] **Step 1: Write the failing test**

Create tests that assert beginner labels:

```ts
import { describe, expect, it } from 'vitest';
import { getOrderLanguage, getTradeLanguage } from '../tradeLanguage';

describe('trade language', () => {
  it('uses beginner-facing labels for immediate trades', () => {
    expect(getTradeLanguage('buy').label).toBe('Buy Now');
    expect(getTradeLanguage('sell').label).toBe('Sell Now');
    expect(getTradeLanguage('short').label).toBe('Bet Down');
    expect(getTradeLanguage('cover').label).toBe('Close Short');
  });

  it('describes planned orders by outcome instead of jargon', () => {
    expect(getOrderLanguage('limit_buy').label).toBe('Buy If Price Falls To');
    expect(getOrderLanguage('limit_sell').label).toBe('Sell If Price Rises To');
    expect(getOrderLanguage('stop_loss').label).toBe('Auto-Sell If Price Drops');
    expect(getOrderLanguage('take_profit').label).toBe('Auto-Sell If Price Rises');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/engine/__tests__/tradeLanguage.test.ts`

Expected: FAIL because `tradeLanguage` does not exist.

- [ ] **Step 3: Implement shared language helpers**

Add literal maps and typed helpers for immediate actions and planned orders.

- [ ] **Step 4: Export helpers**

Add `export * from './tradeLanguage';` to `src/engine/index.ts`.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd run test:run -- src/engine/__tests__/tradeLanguage.test.ts`

Expected: PASS.

### Task 2: Stock Detail Trading Surface

**Files:**
- Modify: `src/pages/StockDetailFixed.tsx`

- [ ] **Step 1: Use shared labels for immediate trade buttons**

Change button labels from `Buy`, `Sell`, `Short`, `Cover` to `Buy Now`, `Sell Now`, `Bet Down`, `Close Short`.

- [ ] **Step 2: Add one-line explanations**

Under the `Trade` heading, add: `Trade Now uses the current price this turn. Plan Ahead below is for automatic future orders.`

- [ ] **Step 3: Clarify preview/result labels**

Change `Est. Value` to `Trade Value`, `Cash Impact` to `Cash Change`, and explain margin rows as cash reserved/released.

### Task 3: Planned Orders Surface

**Files:**
- Modify: `src/components/trading/PendingOrdersCard.tsx`

- [ ] **Step 1: Rename section**

Change `Orders & Automation` to `Plan Ahead`.

- [ ] **Step 2: Rename limit and protective order controls**

Use the shared planned-order labels:
- `Buy If Price Falls To`
- `Sell If Price Rises To`
- `Auto-Sell If Price Drops`
- `Auto-Sell If Price Rises`

- [ ] **Step 3: Add helper copy**

Explain that planned orders do not execute now and only trigger on future turns when prices cross the entered value.

- [ ] **Step 4: Rename existing order badges**

Use readable labels in the pending order list instead of `LIMIT BUY`, `LIMIT SELL`, `STOP-LOSS`, and `TAKE-PROFIT`.

### Task 4: Similar Jargon Pass

**Files:**
- Modify: `src/pages/HowToPlay.tsx`
- Modify: `src/pages/Portfolio.tsx` if labels expose unexplained advanced terms
- Modify: `src/components/portfolio/RebalanceCard.tsx` if trade previews expose raw buy/sell/short/cover codes
- Modify: `src/engine/tradeFeedback.ts`, `src/engine/riskSystem.ts`, `src/engine/advisorSystem.ts`, and `src/engine/rebalancing.ts` if previews or warnings expose raw short/margin language
- Modify: `scripts/playtest-market-depth.mjs`

- [ ] **Step 1: Update help copy**

Describe `Trade Now` and `Plan Ahead` in one short help card.

- [ ] **Step 2: Keep advanced terms where they are informational**

Leave portfolio `Rebalance` and `Margin` terms in place if paired with enough context; do not rename core feature names everywhere.

- [ ] **Step 3: Update smoke assertions**

Replace expectations for `Orders & Automation`, `Limit Sell`, `Place Limit Sell`, and `Place Stop-Loss` with the new beginner-facing names.

### Task 5: Verification And Commit

**Files:**
- All modified files above.

- [ ] **Step 1: Run focused tests**

Run: `npm.cmd run test:run -- src/engine/__tests__/tradeLanguage.test.ts`

- [ ] **Step 2: Run full checks**

Run:
- `npm.cmd run test:run`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run test:smoke`

- [ ] **Step 3: Commit and push**

Commit message: `ux: simplify trading language`
