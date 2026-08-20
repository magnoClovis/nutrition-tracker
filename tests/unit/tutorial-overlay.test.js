const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../tutorial-overlay.js"))],
  ["ESM", () => import("../../src/components/tutorial-overlay.js")]
];

const { normalizeLanguage } = createI18n();
const currentDispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

function sameDeps(previous, next) {
  return previous && next && previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]));
}

function createHookHarness(Component, props) {
  const state = [];
  const effects = [];
  let tree;
  let dirty = false;

  function render() {
    let passes = 0;
    do {
      dirty = false;
      let hookIndex = 0;
      const pendingEffects = [];
      const dispatcher = {
        useState(initialValue) {
          const index = hookIndex++;
          if (!(index in state)) state[index] = typeof initialValue === "function" ? initialValue() : initialValue;
          const setValue = nextValue => {
            const next = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
            if (!Object.is(next, state[index])) {
              state[index] = next;
              dirty = true;
            }
          };
          return [state[index], setValue];
        },
        useEffect(effect, dependencies) {
          pendingEffects.push({ index: hookIndex++, effect, dependencies });
        }
      };
      const previousDispatcher = currentDispatcher.current;
      currentDispatcher.current = dispatcher;
      try {
        tree = Component(props);
      } finally {
        currentDispatcher.current = previousDispatcher;
      }
      pendingEffects.forEach(pending => {
        const previous = effects[pending.index];
        if (previous && sameDeps(previous.dependencies, pending.dependencies)) return;
        if (previous && typeof previous.cleanup === "function") previous.cleanup();
        effects[pending.index] = {
          dependencies: pending.dependencies,
          cleanup: pending.effect()
        };
      });
      passes += 1;
      if (passes > 10) throw new Error("Hook harness exceeded render limit");
    } while (dirty);
    return tree;
  }

  function unmount() {
    effects.forEach(effect => {
      if (effect && typeof effect.cleanup === "function") effect.cleanup();
    });
  }

  return { render, unmount, get tree() { return tree; } };
}

function createDomEnvironment(targets = {}) {
  const originalDocument = global.document;
  const originalWindow = global.window;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const queries = [];
  const timers = [];
  const body = { style: { overflow: "auto" } };

  global.document = {
    body,
    querySelector(selector) {
      queries.push(selector);
      return targets[selector] || null;
    }
  };
  global.window = { innerWidth: 1000, innerHeight: 700, __tutorialNavigating: false };
  global.setTimeout = (callback, delay = 0) => {
    const timer = { callback, delay, cleared: false, ran: false };
    timers.push(timer);
    return timer;
  };
  global.clearTimeout = timer => { timer.cleared = true; };

  function runDelay(delay) {
    timers.filter(timer => timer.delay === delay && !timer.cleared && !timer.ran).forEach(timer => {
      timer.ran = true;
      timer.callback();
    });
  }

  function restore() {
    global.document = originalDocument;
    global.window = originalWindow;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }

  return { body, queries, timers, runDelay, restore };
}

function walkElements(node, visit) {
  if (node === null || node === undefined || typeof node !== "object") return;
  visit(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => walkElements(child, visit));
}

function findButton(tree, label) {
  let match;
  walkElements(tree, node => {
    if (!match && node.type === "button" && node.props.children === label) match = node;
  });
  return match;
}

function overlayPath(tree) {
  const svg = React.Children.toArray(tree.props.children)[0];
  return React.Children.toArray(svg.props.children)[0].props.d;
}

function targetElement(rect = { top: 40, left: 60, width: 120, height: 30 }) {
  return {
    clicks: 0,
    scrollCalls: [],
    rectCalls: 0,
    click() { this.clicks += 1; },
    scrollIntoView(options) { this.scrollCalls.push(options); },
    getBoundingClientRect() { this.rectCalls += 1; return rect; }
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createTutorialOverlay } = await load();
      const { TutorialOverlay } = createTutorialOverlay({ React, normalizeLanguage });
      return callback(TutorialOverlay);
    });
  });
}

contractTest("opens, calls onDone, and restores the previous body scroll value on close", TutorialOverlay => {
  const env = createDomEnvironment();
  let doneCalls = 0;
  const harness = createHookHarness(TutorialOverlay, { lang: "pt", type: "main", onDone: () => { doneCalls += 1; } });
  try {
    const tree = harness.render();
    let overlayCount = 0;
    walkElements(tree, node => {
      if (node.props?.["data-tutorial-overlay"] === "true") overlayCount += 1;
    });
    assert.equal(overlayCount, 1);
    assert.equal(tree.type, React.Fragment);
    assert.equal(env.body.style.overflow, "hidden");
    findButton(tree, "Pular").props.onClick();
    assert.equal(doneCalls, 1);
    harness.unmount();
    assert.equal(env.body.style.overflow, "auto");
  } finally {
    env.restore();
  }
});

contractTest("navigates steps with the existing tab click, 80 ms measurement, and 180 ms global reset", TutorialOverlay => {
  const tab = targetElement();
  const dayType = targetElement({ top: 100, left: 140, width: 160, height: 36 });
  const env = createDomEnvironment({
    '[data-tutorial="tab-diario"]': tab,
    '[data-tutorial="day-type"]': dayType
  });
  const harness = createHookHarness(TutorialOverlay, { lang: "pt", type: "diario", onDone: () => {} });
  try {
    let tree = harness.render();
    assert.equal(tab.clicks, 1);
    assert.equal(global.window.__tutorialNavigating, true);
    assert.deepEqual(env.timers.map(timer => timer.delay), [180, 80]);

    env.runDelay(80);
    harness.render();
    assert.deepEqual(tab.scrollCalls[0], { block: "center", inline: "center", behavior: "instant" });
    env.runDelay(180);
    assert.equal(global.window.__tutorialNavigating, false);

    findButton(tree, "Próximo").props.onClick();
    tree = harness.render();
    env.runDelay(80);
    harness.render();
    assert.equal(dayType.rectCalls, 1);
    assert.deepEqual(dayType.scrollCalls[0], { block: "center", inline: "center", behavior: "instant" });
    assert.notEqual(overlayPath(harness.tree), "M0,0 H1000 V700 H0 Z");
  } finally {
    harness.unmount();
    env.restore();
  }
});

contractTest("keeps a missing tutorial target unhighlighted without retrying", TutorialOverlay => {
  const tab = targetElement();
  const env = createDomEnvironment({ '[data-tutorial="tab-diario"]': tab });
  const harness = createHookHarness(TutorialOverlay, { lang: "pt", type: "diario", onDone: () => {} });
  try {
    let tree = harness.render();
    env.runDelay(80);
    harness.render();
    assert.notEqual(overlayPath(harness.tree), "M0,0 H1000 V700 H0 Z");

    findButton(tree, "Próximo").props.onClick();
    harness.render();
    env.runDelay(80);
    harness.render();
    assert.equal(overlayPath(harness.tree), "M0,0 H1000 V700 H0 Z");
    assert.equal(env.queries.filter(query => query === '[data-tutorial="day-type"]').length, 1);
    harness.render();
    assert.equal(env.queries.filter(query => query === '[data-tutorial="day-type"]').length, 1);
  } finally {
    harness.unmount();
    env.restore();
  }
});

contractTest("finishes the version-neutral release highlights after four focused steps", TutorialOverlay => {
  const env = createDomEnvironment();
  let doneCalls = 0;
  const harness = createHookHarness(TutorialOverlay, { lang: "pt", type: "release-highlights", onDone: () => { doneCalls += 1; } });
  try {
    for (let step = 0; step < 3; step += 1) {
      const tree = harness.render();
      findButton(tree, "Próximo").props.onClick();
    }
    const finalTree = harness.render();
    findButton(finalTree, "Concluir").props.onClick();
    assert.equal(doneCalls, 1);
  } finally {
    harness.unmount();
    env.restore();
  }
});

test("keeps the host 120 ms tutorial-start delay outside the extracted module", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
  assert.match(appSource, /setTimeout\(\(\) => onStartTutorial && onStartTutorial\(normalizedTab\), 120\)/);
});
