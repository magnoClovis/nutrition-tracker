const test = require('node:test');
const assert = require('node:assert/strict');
const ReactRuntime = require('../../vendor/react.production.min.js');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../generic-dialog.js'))],
  ['ESM', () => import('../../src/components/generic-dialog.js')],
];

function childrenOf(node) {
  return ReactRuntime.Children.toArray(node?.props?.children);
}

function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of childrenOf(node)) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return childrenOf(node).map(textOf).join('');
}

function createHookHarness(Component) {
  const state = [];
  let tree;
  let exposed;

  function render() {
    let hookIndex = 0;
    const dispatcher = {
      useState(initialValue) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
        const setValue = next => {
          state[index] = typeof next === 'function' ? next(state[index]) : next;
        };
        return [state[index], setValue];
      },
      useRef(initialValue) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = { current: initialValue };
        return state[index];
      },
      useEffect() { hookIndex++; },
    };
    const previous = ReactRuntime.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
    ReactRuntime.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    try {
      const result = Component();
      exposed = result.exposed;
      tree = result.tree;
    } finally {
      ReactRuntime.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = previous;
    }
    return tree;
  }

  return { render, get tree() { return tree; }, get exposed() { return exposed; } };
}

for (const [format, load] of implementations) {
  test(`${format}: exposes promise semantics for alert, confirm, and prompt`, async () => {
    const { createGenericDialog } = await load();
    const React = Object.assign({}, ReactRuntime, { useCallback: callback => callback });
    const { useGenericDialog } = createGenericDialog({
      React,
      createPortal: node => node,
      documentObject: { body: {} },
    });
    const harness = createHookHarness(() => {
      const dialog = useGenericDialog();
      return { exposed: dialog, tree: dialog.dialogNode };
    });

    harness.render();
    const confirmPromise = harness.exposed.confirm({
      title: 'Delete saved meal?',
      message: 'This action cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    harness.render();
    assert.equal(harness.tree.type.name, 'GenericDialog');
    assert.equal(harness.tree.props.request.kind, 'confirm');
    assert.equal(harness.tree.props.request.tone, 'danger');
    harness.tree.props.onResolve(true);
    assert.equal(await confirmPromise, true);

    harness.render();
    const promptPromise = harness.exposed.prompt({ title: 'Bottle size', label: 'Volume in ml' });
    harness.render();
    assert.equal(harness.tree.props.request.kind, 'prompt');
    harness.tree.props.onResolve(null);
    assert.equal(await promptPromise, null);

    harness.render();
    const alertPromise = harness.exposed.alert({ title: 'Export failed' });
    harness.render();
    harness.tree.props.onResolve(true);
    assert.equal(await alertPromise, undefined);
  });

  test(`${format}: renders native accessible controls and disables an empty prompt`, async () => {
    const { createGenericDialog } = await load();
    const StaticReact = Object.assign({}, ReactRuntime, {
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: initial => ({ current: initial }),
      useEffect: () => {},
      useCallback: callback => callback,
    });
    const { GenericDialog } = createGenericDialog({
      React: StaticReact,
      createPortal: node => node,
      documentObject: { activeElement: null },
    });
    const tree = GenericDialog({
      request: {
        id: 'dialog-test',
        kind: 'prompt',
        tone: 'action',
        title: 'Save as meal',
        message: 'Choose a short name.',
        label: 'Meal name',
        note: 'Up to 40 characters',
        initialValue: '',
        maxLength: 40,
        confirmLabel: 'Save',
        cancelLabel: 'Cancel',
      },
      onResolve() {},
    });
    const input = findNode(tree, node => node.type === 'input');
    const dialog = findNode(tree, node => node.props?.role === 'dialog');
    const save = findNode(tree, node => node.type === 'button' && textOf(node) === 'Save');
    const cancel = findNode(tree, node => node.type === 'button' && textOf(node) === 'Cancel');

    assert.equal(dialog.props['aria-modal'], 'true');
    assert.equal(input.props.type, 'text');
    assert.equal(input.props.maxLength, 40);
    assert.equal(input.props['aria-describedby'], 'dialog-test-note');
    assert.equal(save.props.disabled, true);
    assert.equal(cancel.props['data-generic-dialog-cancel'], 'true');
  });

  test(`${format}: rejects missing React or portal dependencies`, async () => {
    const { createGenericDialog } = await load();
    assert.throws(() => createGenericDialog({ React: null, createPortal() {} }), /requires React and createPortal/);
    assert.throws(() => createGenericDialog({ React: ReactRuntime }), /requires React and createPortal/);
  });
}
