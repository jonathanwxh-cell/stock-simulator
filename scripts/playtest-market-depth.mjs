import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const WAIT_MS = 15000;
const TURN_SETTLE_MS = 120;
const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function log(message) {
  console.log(`[smoke] ${message}`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findBrowserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next browser path.
    }
  }

  throw new Error('No Chrome or Edge executable was found for the smoke run.');
}

async function waitForVisible(locator, label, timeout = WAIT_MS) {
  await locator.waitFor({ state: 'visible', timeout });
  return label;
}

async function isVisible(locator) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

async function waitForHudOrGameOver(page, timeout = WAIT_MS) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (
      (await isVisible(page.getByText('Game Over', { exact: true }))) ||
      (await isVisible(page.getByText('Market Conquered', { exact: true }))) ||
      (await isVisible(page.getByText('Season Recap', { exact: true })))
    ) {
      return 'game-over';
    }

    if (
      (await isVisible(page.getByText('Market Pulse', { exact: true }))) &&
      (await isVisible(page.getByText('Watchlist Alerts', { exact: true }))) &&
      (await isVisible(page.getByText('Upcoming Catalysts', { exact: true })))
    ) {
      return 'hud';
    }

    await page.waitForTimeout(50);
  }

  throw new Error('Timed out waiting for either the HUD or the Game Over screen.');
}

async function advanceOneTurn(page) {
  const nextButton = page.getByRole('button', { name: /Next Turn|Next/ });
  await waitForVisible(nextButton, 'Next Turn button');
  await nextButton.click();
  await page.waitForTimeout(TURN_SETTLE_MS);
  return waitForHudOrGameOver(page);
}

async function findNextTurnCatalystTicker(page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const dueSoonButtons = page.locator('button').filter({ hasText: 'Turn +1' });
    const count = await dueSoonButtons.count();
    if (count > 0) {
      const text = await dueSoonButtons.first().innerText();
      const ticker = text.split(/\s+/)[0]?.trim();
      if (ticker) return ticker;
    }

    const state = await advanceOneTurn(page);
    if (state === 'game-over') {
      throw new Error('The run ended before a Turn +1 catalyst could be verified.');
    }
  }

  throw new Error('No Turn +1 catalyst surfaced during the smoke run.');
}

async function playToCompletion(page) {
  for (let turn = 0; turn < 140; turn++) {
    const isGameOver =
      (await isVisible(page.getByText('Game Over', { exact: true }))) ||
      (await isVisible(page.getByText('Market Conquered', { exact: true }))) ||
      (await isVisible(page.getByText('Season Recap', { exact: true })));
    if (isGameOver) return;
    const nextState = await advanceOneTurn(page);
    if (nextState === 'game-over') return;
  }

  throw new Error('The run did not reach Game Over within the expected turn budget.');
}

async function clickNTimes(locator, times) {
  for (let index = 0; index < times; index++) {
    await locator.click();
  }
}

async function main() {
  const executablePath = await findBrowserExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    colorScheme: 'dark',
  });

  await context.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((fn, delay, ...args) => {
      const boundedDelay = typeof delay === 'number' ? Math.min(delay, 25) : 25;
      return originalSetTimeout(fn, boundedDelay, ...args);
    });
  });

  const page = await context.newPage();
  const consoleIssues = [];
  const pageErrors = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type !== 'error' && type !== 'warning') return;
    const text = message.text();
    if (
      text.includes('NotAllowedError') ||
      text.includes('audio:') ||
      text.includes('play() request was interrupted')
    ) {
      return;
    }
    consoleIssues.push(`[${type}] ${text}`);
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  try {
    log(`Opening ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: WAIT_MS });

    await waitForVisible(page.getByRole('button', { name: 'NEW GAME' }), 'title screen');
    log('Starting a fresh Normal run');
    await page.getByRole('button', { name: 'NEW GAME' }).click();
    await page.getByRole('button', { name: /Normal/ }).click();
    await page.getByPlaceholder('Trader Name').fill('Codex QA');
    await page.getByRole('button', { name: 'Start Game' }).click();

    await waitForHudOrGameOver(page);
    await waitForVisible(page.getByText('Market Pulse', { exact: true }), 'HUD Market Pulse card');
    await waitForVisible(page.getByText('Watchlist Alerts', { exact: true }), 'HUD Watchlist Alerts card');
    await waitForVisible(page.getByText('Upcoming Catalysts', { exact: true }), 'HUD Upcoming Catalysts card');
    log('HUD cards are visible');

    const catalystTicker = await findNextTurnCatalystTicker(page);
    log(`Using ${catalystTicker} to verify watchlist and catalyst flow`);

    await page.getByRole('button', { name: /Market/ }).click();
    await waitForVisible(page.getByText('Stock Market', { exact: false }), 'stock market screen');
    await page.getByPlaceholder('Search tickers or names...').fill(catalystTicker);
    await page.getByRole('button', { name: new RegExp(`Add ${escapeRegex(catalystTicker)} to watchlist`) }).click();
    await waitForVisible(page.getByText('WATCH', { exact: true }), 'watch badge');
    log('Watchlist toggle is working in the market list');

    const stockButton = page.locator('button').filter({ hasText: catalystTicker }).first();
    await stockButton.click();
    await waitForVisible(page.getByText('Next Catalyst', { exact: true }), 'stock detail catalyst card');
    await waitForVisible(page.getByText('Watchlist Context', { exact: true }), 'stock detail watchlist context');
    await waitForVisible(page.getByText('Orders & Automation', { exact: true }), 'stock detail pending orders card');
    log('Stock detail shows catalyst and watchlist context');

    log(`Buying four ${catalystTicker} shares to exercise the order tools`);
    await clickNTimes(page.getByRole('button', { name: '+', exact: true }), 3);
    await page.getByRole('button', { name: new RegExp(`Buy 4 ${escapeRegex(catalystTicker)}`) }).click();
    await waitForVisible(page.getByText('Long:', { exact: true }), 'long position badge');

    const limitCard = page.locator('div').filter({ has: page.getByText('Limit Order', { exact: true }) }).first();
    await limitCard.getByRole('button', { name: 'Limit Sell' }).click();
    await limitCard.getByLabel('Target Price').fill('0.01');
    await limitCard.getByRole('button', { name: 'Place Limit Sell' }).click();

    const protectiveCard = page.locator('div').filter({ has: page.getByText('Protective Exit', { exact: true }) }).first();
    await protectiveCard.getByLabel('Trigger Price').fill('999999');
    await protectiveCard.getByRole('button', { name: 'Place Stop-Loss' }).click();
    log('Placed an immediate limit sell and stop-loss for the selected stock');

    await page.getByRole('button', { name: /News/ }).click();
    await waitForVisible(page.getByText('Market News', { exact: true }), 'news screen');
    await waitForVisible(page.getByText('Market Pulse', { exact: true }), 'news pulse card');
    await waitForVisible(page.getByText('Upcoming Catalysts', { exact: true }), 'news catalysts card');
    log('News screen shows the shared insight cards');

    const turnResult = await advanceOneTurn(page);
    if (turnResult !== 'hud') {
      throw new Error('Expected to return to the HUD after advancing one turn from the News screen.');
    }

    await waitForVisible(
      page.getByText(new RegExp(`${escapeRegex(catalystTicker)} is in the headlines`)),
      'watchlist news alert after catalyst resolution',
    );
    log('Resolved catalyst produced a watchlist alert on the HUD');

    await page.getByRole('button', { name: /Portfolio/ }).click();
    await waitForVisible(page.getByText('Performance Chart', { exact: true }), 'portfolio performance chart');
    await waitForVisible(page.getByText('Open Orders', { exact: true }), 'portfolio open orders card');
    await waitForVisible(page.getByText('No pending orders yet. Use limit orders, stop-losses, or take-profits to automate exits and entries.', { exact: true }), 'resolved pending orders state');
    await waitForVisible(page.getByText('Portfolio Rebalancer', { exact: true }), 'portfolio rebalancer');
    log('Portfolio shows the new chart, cleared orders, and rebalance card');

    await page.getByRole('button', { name: 'Clear' }).click();
    await waitForVisible(page.getByText('Trade Preview', { exact: true }), 'rebalance trade preview');
    await waitForVisible(page.getByText(/planned trade/i), 'rebalance plan summary');
    await page.getByRole('button', { name: 'Rebalance Now' }).click();
    await waitForVisible(page.getByText('No holdings yet. Visit the Market to buy stocks or open shorts.', { exact: true }), 'post-rebalance empty portfolio');
    log('Rebalance preview and execution work on the portfolio screen');

    log('Fast-forwarding to the end of the run');
    await playToCompletion(page);
    await waitForVisible(page.getByText('Season Recap', { exact: true }), 'season recap');
    await waitForVisible(page.getByRole('button', { name: 'Play Again' }), 'Play Again button');
    log('Game Over screen and season recap are visible');

    await page.getByRole('button', { name: 'Play Again' }).click();
    await waitForVisible(page.getByRole('button', { name: 'NEW GAME' }), 'title screen after reset');
    const autoSaveCount = await page.getByText('Continue from auto-save', { exact: true }).count();
    if (autoSaveCount !== 0) {
      throw new Error('Completed run left a resumable auto-save on the title screen.');
    }
    log('Completed auto-save cleanup still works after Play Again');

    if (consoleIssues.length > 0 || pageErrors.length > 0) {
      throw new Error([
        consoleIssues.length ? `Console issues:\n${consoleIssues.join('\n')}` : '',
        pageErrors.length ? `Page errors:\n${pageErrors.join('\n')}` : '',
      ].filter(Boolean).join('\n\n'));
    }

    log('Smoke run passed');
  } catch (error) {
    const screenshotPath = 'playtest-market-depth-failure.png';
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    throw new Error(`${error.message}\nFailure screenshot: ${screenshotPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
