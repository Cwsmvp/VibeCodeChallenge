const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
  constructor() { this.children = []; this.handlers = {}; this.attributes = {}; this.dataset = {}; this.textContent = ""; }
  addEventListener(event, handler) { this.handlers[event] = handler; }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
}
const evaluation = {
  memorability: {score: 8, comment: "Dễ nhớ"},
  pronounceability: {score: 9, comment: "Dễ đọc"}, summary: "Tên tốt",
};
const slogans = {slogans: ["Câu một", "Câu hai", "Câu ba"], tagline: "Cùng bạn mỗi ngày"};
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(brand = "Mây") {
  const ids = Object.fromEntries(["evaluation-content", "evaluation-retry", "slogans-card", "slogans-content",
    "slogans-feedback", "slogans-retry", "brand-name"].map(id => [id, new Element()]));
  ids["slogans-card"].dataset.brand = brand;
  ids["brand-name"].value = brand;
  const state = {brand, slug: brand ? "may" : "", domains: [], evaluation: null, slogans: [], tagline: ""};
  const ready = [], calls = [], timers = new Map();
  let timerId = 0;
  const context = vm.createContext({window: {appState: state}, AbortController,
    setTimeout: handler => {timers.set(++timerId, handler); return timerId;},
    clearTimeout: id => timers.delete(id),
    document: {createElement: () => new Element(), getElementById: id => ids[id],
      addEventListener: (event, handler) => ready.push(handler)},
    fetch: (url, options) => new Promise((resolve, reject) => {
      calls.push({url, payload: JSON.parse(options.body), resolve, reject});
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error(), {name: "AbortError"})));
    }),
  });
  for (const file of ["ai.js", "evaluation.js", "slogans.js", "actions.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../public", file), "utf8"), context);
  }
  ready.forEach(handler => handler());
  const finish = (url, result, ok = true) => {
    const call = calls.findLast(call => call.url === url);
    call.resolve({ok, json: async () => result});
  };
  return {ids, state, calls, timers, context, finish};
}

test("both requests start immediately; evaluation renders while slogans still load", async () => {
  const page = setup();
  assert.equal(page.calls.length, 2);
  assert.equal(page.ids["evaluation-content"].attributes["aria-busy"], "true");
  assert.equal(page.ids["slogans-content"].attributes["aria-busy"], "true");
  page.finish("/api/evaluate", evaluation);
  await flush();
  assert.deepEqual(page.state.evaluation, evaluation);
  assert.equal(page.ids["evaluation-content"].children[0].className, "evaluation-body");
  assert.equal(page.ids["slogans-content"].attributes["aria-busy"], "true");
  page.finish("/api/slogans", slogans);
  await flush();
  assert.equal(page.state.tagline, slogans.tagline);
  assert.equal(page.ids["slogans-content"].attributes["aria-busy"], "false");
  assert.equal(page.timers.size, 0);
});

test("slogans render independently of failed evaluation; retry only repeats evaluation", async () => {
  const page = setup();
  page.finish("/api/slogans", slogans);
  await flush();
  assert.equal(page.state.tagline, slogans.tagline);
  assert.equal(page.state.pending.evaluation, true);
  page.finish("/api/evaluate", {error: "Gemini timeout"}, false);
  await flush();
  assert.match(page.ids["evaluation-content"].children[0].textContent, /Gemini timeout/);
  const retry = page.ids["evaluation-retry"].handlers.click();
  assert.equal(page.calls.length, 3);
  assert.equal(page.calls[2].url, "/api/evaluate");
  page.finish("/api/evaluate", evaluation);
  await retry;
  assert.equal(page.state.evaluation.summary, evaluation.summary);
});

test("slogan retry preserves old results on failure and prevents duplicate requests", async () => {
  const page = setup();
  page.finish("/api/evaluate", evaluation);
  page.finish("/api/slogans", slogans);
  await flush();
  const retry = page.ids["slogans-retry"].handlers.click();
  page.ids["slogans-retry"].handlers.click();
  assert.equal(page.calls.length, 3);
  assert.equal(page.calls[2].payload.previous_tagline, slogans.tagline);
  assert.equal(page.ids["slogans-content"].children.length, 3);
  page.finish("/api/slogans", {error: "AI trả câu cũ"}, false);
  await retry;
  assert.equal(page.state.tagline, slogans.tagline);
  assert.equal(page.ids["slogans-content"].children.length, 2);
  assert.match(page.ids["slogans-feedback"].textContent, /AI trả câu cũ/);
  page.ids["brand-name"].value = "Khác";
  page.ids["brand-name"].handlers.input();
  assert.equal(page.ids["slogans-retry"].disabled, true);
});

test("copy reflects loading then completed results", async () => {
  const page = setup();
  const copy = () => vm.runInContext("formatResults(window.appState)", page.context);
  assert.match(copy(), /Đang tải đánh giá AI/);
  page.finish("/api/evaluate", evaluation);
  await flush();
  assert.match(copy(), /Tên tốt/);
  assert.match(copy(), /Đang tải slogan AI/);
  page.finish("/api/slogans", slogans);
  await flush();
  assert.match(copy(), /Cùng bạn mỗi ngày/);
  assert.doesNotMatch(copy(), /Đang tải/);
});

test("network and non-JSON hosting failures end both loading states", async () => {
  const page = setup();
  page.calls[0].reject(new Error("Network error"));
  page.calls[1].resolve({ok: false, json: async () => {throw new SyntaxError();}});
  await flush();
  assert.equal(page.state.pending.evaluation, false);
  assert.equal(page.state.pending.slogans, false);
  assert.equal(page.ids["slogans-retry"].disabled, false);
  assert.match(page.ids["slogans-feedback"].textContent, /Máy chủ/);
});

test("client timeout clears loading; empty page makes no AI requests", async () => {
  const page = setup();
  [...page.timers.values()].forEach(timeout => timeout());
  await flush();
  assert.equal(page.state.pending.evaluation, false);
  assert.equal(page.state.pending.slogans, false);
  assert.match(page.ids["slogans-feedback"].textContent, /thời gian chờ/);
  const empty = setup("");
  assert.equal(empty.calls.length, 0);
});
