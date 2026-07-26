const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../ui-primitives.js"))],
  ["ESM", () => import("../../src/components/ui-primitives.js")]
];

function foregroundCircle(ring) {
  return React.Children.toArray(ring.props.children)[1];
}

function progressFill(bar) {
  const rows = React.Children.toArray(bar.props.children);
  return React.Children.toArray(rows[1].props.children)[0];
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createUiPrimitives } = await load();
      return callback(createUiPrimitives({ React }));
    });
  });
}

contractTest("renders Ring offsets for normal, above-maximum, and zero values", ({ Ring }) => {
  const radius = (76 - 7) / 2;
  const circumference = 2 * Math.PI * radius;

  const normal = foregroundCircle(Ring({ value: 50, max: 100, color: "#123456" }));
  assert.equal(normal.props.stroke, "#123456");
  assert.equal(normal.props.strokeDasharray, circumference);
  assert.equal(normal.props.strokeDashoffset, circumference * 0.5);

  const above = foregroundCircle(Ring({ value: 125, max: 100, color: "#123456" }));
  assert.equal(above.props.stroke, "#ff4d4d");
  assert.equal(above.props.strokeDashoffset, 0);

  const zero = foregroundCircle(Ring({ value: 0, max: 100, color: "#123456" }));
  assert.equal(zero.props.stroke, "#123456");
  assert.equal(zero.props.strokeDashoffset, circumference);
});

contractTest("renders Bar values and width with the existing formatting", ({ Bar }) => {
  const bar = Bar({ value: 12.34, max: 20, color: "#654321", label: "Fiber", unit: "g" });
  const rows = React.Children.toArray(bar.props.children);
  const valueRow = React.Children.toArray(rows[0].props.children)[1];
  const valueParts = React.Children.toArray(valueRow.props.children);

  assert.equal(bar.type, "div");
  assert.equal(valueParts[0], "12.3");
  assert.equal(valueParts[1], "g");
  assert.equal(progressFill(bar).props.style.width, "61.7%");
  assert.equal(progressFill(bar).props.style.background, "#654321");
});

contractTest("returns null when Bar max is zero", ({ Bar }) => {
  assert.equal(Bar({ value: 5, max: 0, color: "#654321", label: "Sugar", unit: "g" }), null);
});

contractTest("ErrorBoundary catches a child error and renders the existing fallback", ({ ErrorBoundary }) => {
  function BrokenChild() {
    throw new Error("child failed");
  }

  const boundary = new ErrorBoundary({ children: React.createElement(BrokenChild) });
  const originalConsoleError = console.error;
  let fallback;
  let logged;

  assert.doesNotThrow(() => {
    try {
      BrokenChild();
    } catch (error) {
      boundary.state = ErrorBoundary.getDerivedStateFromError(error);
      console.error = (...args) => { logged = args; };
      boundary.componentDidCatch(error, { componentStack: "BrokenChild" });
      fallback = boundary.render();
    } finally {
      console.error = originalConsoleError;
    }
  });

  const children = React.Children.toArray(fallback.props.children);
  assert.equal(children[0].props.children, "ERRO");
  assert.equal(children[1].props.children, "CHILD FAILED");
  assert.equal(children[2].props.children, "RETRY / TENTAR");
  assert.equal(logged[0], "App crash:");
});
