// Browser verification using Chrome DevTools and Node's built-in WebSocket.
// Fixtures are only intercepted in this test runner, never in the application.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const {pathToFileURL} = require("node:url");
const {spawn} = require("node:child_process");

const root = path.resolve(__dirname, "..");
const reports = path.join(root, "docs", "reports");
const screenshots = path.join(root, "docs", "screenshots");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (_) {}
    await pause(100);
  }
  throw new Error(`Timed out: ${label}`);
}
async function unusedPort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function main() {
  fs.mkdirSync(reports, {recursive: true});
  fs.mkdirSync(screenshots, {recursive: true});
  const chrome = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(item => item && fs.existsSync(item));
  if (!chrome) throw new Error("Set CHROME_PATH to an installed Chrome/Chromium executable.");
  const python = process.env.LOCAL_PYTHON || path.join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const childEnv = {...process.env};
  delete childEnv.GEMINI_API_KEY;
  delete childEnv.SPONSOR_DOMAIN_URL;
  const server = spawn(python, ["scripts/run_local.py", "--without-ai", "--port", String(port)],
    {cwd: root, env: childEnv, stdio: "ignore", windowsHide: true});
  let launchError;
  server.on("error", error => { launchError = error; });
  let browser, ws;
  const checks = [], errors = [], fixtureCalls = [], apiRequests = [];
  const report = {checked_at_utc: new Date().toISOString(), status: "failed", checks,
    scope: "Real headless Chrome; live local Flask without API key, then explicitly intercepted AI fixtures. No Gemini requests.",
    screenshots: [], runtime_errors: errors};
  try {
    await until(async () => { if (launchError) throw launchError; return (await fetch(origin)).ok; }, "Flask startup");
    const profile = path.join(root, ".browser-check", `profile-${Date.now()}`);
    fs.mkdirSync(profile, {recursive: true});
    browser = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
      {stdio: "ignore", windowsHide: true});
    browser.on("error", error => { launchError = error; });
    const devtools = path.join(profile, "DevToolsActivePort");
    const debugPort = await until(() => fs.existsSync(devtools) && fs.readFileSync(devtools, "utf8").split("\n")[0], "Chrome startup");
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const target = targets.find(item => item.type === "page");
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, {once: true}); ws.addEventListener("error", reject, {once: true}); });
    let counter = 0;
    const pending = new Map();
    function rpc(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++counter;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(id, {resolve, reject, timer});
        ws.send(JSON.stringify({id, method, params}));
      });
    }
    let sloganCount = 0;
    ws.addEventListener("message", async event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const task = pending.get(message.id);
        if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
      }
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      if (message.method === "Network.requestWillBeSent" && new URL(message.params.request.url).pathname.startsWith("/api/")) {
        apiRequests.push(message.params.request.url);
      }
      if (message.method === "Fetch.requestPaused") {
        const {requestId, request} = message.params;
        const url = new URL(request.url);
        fixtureCalls.push({route: url.pathname, payload: JSON.parse(request.postData || "{}")});
        const result = url.pathname === "/api/evaluate"
          ? {memorability: {score: 8, comment: "Tên ngắn, dễ liên tưởng."}, pronounceability: {score: 9, comment: "Dễ đọc bằng tiếng Việt."}, summary: "Tên phù hợp cho một studio sáng tạo."}
          : {slogans: ["Chạm vào ý tưởng", "Sáng tạo cùng bạn", "Cho cảm hứng bay xa"], tagline: ++sloganCount === 1 ? "Studio sáng tạo cho thương hiệu của bạn" : "Đồng hành cùng những ý tưởng mới"};
        try {
          await rpc("Fetch.fulfillRequest", {requestId, responseCode: 200,
            responseHeaders: [{name: "Content-Type", value: "application/json; charset=utf-8"}],
            body: Buffer.from(JSON.stringify(result)).toString("base64")});
        } catch (error) { errors.push(error.message); }
      }
    });
    const evaluate = async expression => {
      const response = await rpc("Runtime.evaluate", {expression, awaitPromise: true, returnByValue: true, userGesture: true});
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      return response.result.value;
    };
    const waitFor = (expression, label) => until(() => evaluate(expression), label);
    const check = (name, scope) => { checks.push({name, scope, status: "passed"}); console.log(`PASS ${name}`); };
    const capture = async name => {
      const {data} = await rpc("Page.captureScreenshot", {format: "png", captureBeyondViewport: true});
      fs.writeFileSync(path.join(screenshots, name), Buffer.from(data, "base64"));
      report.screenshots.push(`docs/screenshots/${name}`);
    };
    await rpc("Page.enable");
    await rpc("Runtime.enable");
    await rpc("Network.enable");
    await rpc("Emulation.setEmulatedMedia", {features: [{name: "prefers-reduced-motion", value: "no-preference"}]});
    await rpc("Emulation.setDeviceMetricsOverride", {width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false});
    await rpc("Page.addScriptToEvaluateOnNewDocument", {source: "if (location.protocol === 'http:') localStorage.setItem('vibeflow.motion.v1', 'off');"});
    await rpc("Page.navigate", {url: origin});
    await waitFor("document.readyState === 'complete' && !!window.appState", "initial page");
    assert.equal(await evaluate("window.appState.slug"), "");
    assert.equal(apiRequests.length, 0);
    assert.equal(await evaluate("document.getElementById('toggle-motion')"), null);
    assert.equal(await evaluate("document.body.dataset.stage"), "1");
    assert.equal(await evaluate("document.querySelector('.results').getBoundingClientRect().height"), 0);
    assert.equal(await evaluate("document.querySelector('.step-navigation [data-go=\"2\"]').disabled"), true);
    check("Empty page renders without AI requests", "local application");
    await capture("desktop-empty.png");
    await evaluate(`window.pageSentinel = 'same-document'; window.transitionSamples = []; window.transitionErrors = []; window.transitionCalls = 0;
      window.nativeViewTransition = document.startViewTransition.bind(document);
      document.startViewTransition = update => {
        window.transitionCalls++;
        const transition = window.nativeViewTransition(update);
        transition.ready.then(() => window.transitionSamples.push(document.getAnimations().map(animation => animation.effect?.pseudoElement || animation.animationName || '').filter(Boolean))).catch(error => window.transitionErrors.push(error.message));
        return transition;
      }`);
    await evaluate("document.getElementById('brand-name').value = '!!!'; document.querySelector('form').requestSubmit()");
    await waitFor("document.getElementById('brand-error')?.textContent.includes('chữ cái Latin')", "invalid brand");
    assert.equal(await evaluate("window.appState.domains.length"), 0);
    check("Invalid brand shows validation and no results", "local application");
    await evaluate("document.getElementById('brand-name').value = 'Mây Studio'; document.querySelector('form').requestSubmit()");
    await waitFor("window.appState?.slug === 'maystudio' && window.appState.pending?.evaluation === false && window.appState.pending?.slogans === false", "missing-key errors");
    await waitFor("!document.body.dataset.transitioning", "first transition finishes");
    assert.equal(await evaluate("window.pageSentinel"), "same-document");
    assert.equal(await evaluate("window.transitionSamples.some(sample => sample.some(name => name.includes('user-block')))"), true, JSON.stringify(await evaluate("({samples: window.transitionSamples, errors: window.transitionErrors, calls: window.transitionCalls, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches})")));
    check("Submitting a brand morphs the input into its badge without reloading", "actual native View Transition animations");
    assert.equal(await evaluate("document.querySelectorAll('.domain-item').length"), 5);
    assert.match(await evaluate("document.getElementById('evaluation-content').textContent"), /chưa được cấu hình/);
    assert.match(await evaluate("document.getElementById('slogans-feedback').textContent"), /chưa được cấu hình/);
    check("Five demo domains remain usable when both AI routes lack a key", "local application, no API key");
    await capture("desktop-without-ai.png");
    assert.equal(await evaluate("document.body.dataset.stage"), "2");
    assert.equal(await evaluate("document.querySelector('.brand-badge').getBoundingClientRect().left < document.querySelector('.domains-card').getBoundingClientRect().left"), true);
    await evaluate("document.querySelector('.next-stage').click()");
    await waitFor("document.body.dataset.stage === '3' && document.querySelector('.dashboard').getBoundingClientRect().height > 0", "summary stage");
    await waitFor("!document.body.dataset.transitioning", "summary transition finishes");
    assert.equal(await evaluate("document.getElementById('overview-memory').textContent"), "—");
    assert.match(await evaluate("document.getElementById('overview-status').textContent"), /1\/3/);
    await capture("desktop-overview-without-ai.png");
    check("Summary shows unavailable AI honestly and keeps the three cards", "local application, no API key");
    await evaluate("document.getElementById('open-history').click()");
    assert.equal(await evaluate("document.getElementById('history-dialog').open"), true);
    assert.match(await evaluate("document.getElementById('history-list').textContent"), /Mây Studio/);
    await evaluate("document.querySelector('#history-list button').click()");
    await waitFor("document.body.dataset.stage === '1' && document.activeElement.id === 'brand-name'", "history selection focuses input");
    assert.equal(await evaluate("document.getElementById('brand-name').value"), "Mây Studio");
    await evaluate("document.getElementById('open-history').click(); document.getElementById('clear-history').click()");
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('vibeflow.brand-history.v1'))"), []);
    await evaluate("document.getElementById('done-history').click(); document.querySelector('.step-navigation [data-go=\"2\"]').click()");
    await waitFor("document.body.dataset.stage === '2'", "return to results");
    await waitFor("!document.body.dataset.transitioning", "history transition finishes");
    assert.match(await evaluate("document.getElementById('slogans-feedback').textContent"), /chưa được cấu hình/);
    check("History can reopen a name, focus its input and clear local storage", "real dialog and localStorage");
    assert.equal(await evaluate("document.getElementById('register-domain').getAttribute('href')"), "/dang-ky-demo");
    const demo = await (await fetch(origin + "/dang-ky-demo")).text();
    assert.match(demo, /chưa tiếp nhận đăng ký/);
    assert.equal(await evaluate("document.getElementById('register-domain').target"), "_blank");
    await evaluate("document.getElementById('register-domain').click()");
    const popup = await until(async () => {
      const result = await rpc("Target.getTargets");
      return result.targetInfos.find(item => item.url === origin + "/dang-ky-demo");
    }, "registration popup");
    await rpc("Target.closeTarget", {targetId: popup.targetId});
    check("Registration CTA opens a labelled demo destination", "local application");
    await rpc("Emulation.setDeviceMetricsOverride", {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
    await capture("mobile-without-ai.png");
    check("390px mobile viewport has no horizontal overflow", "local application");
    for (const width of [320, 768, 1024]) {
      await rpc("Emulation.setDeviceMetricsOverride", {width, height: 844, deviceScaleFactor: 1, mobile: width < 1024});
      assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `${width}px results overflow`);
    }
    await rpc("Emulation.setDeviceMetricsOverride", {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
    await evaluate("document.startViewTransition = undefined; window.fallbackAnimations = 0; window.originalAnimate = Element.prototype.animate; Element.prototype.animate = function(...args) { window.fallbackAnimations++; return window.originalAnimate.apply(this, args); }");
    await evaluate("document.querySelector('.next-stage').click()");
    await waitFor("document.body.dataset.stage === '3'", "mobile summary");
    assert.equal(await evaluate("window.fallbackAnimations > 0 && document.getAnimations().length > 0"), true);
    await waitFor("!document.body.dataset.transitioning", "mobile fallback finishes");
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
    await capture("mobile-overview-without-ai.png");
    await evaluate("document.querySelector('.previous-stage').click()");
    await waitFor("!document.body.dataset.transitioning", "fallback return finishes");
    check("Mobile has a visible fallback animation without View Transition support", "actual Web Animations playback");
    await rpc("Emulation.setEmulatedMedia", {features: [{name: "prefers-reduced-motion", value: "reduce"}]});
    await evaluate("window.fallbackAnimations = 0; document.querySelector('.next-stage').click()");
    await waitFor("document.body.dataset.stage === '3'", "always animated summary");
    assert.equal(await evaluate("window.fallbackAnimations > 0"), true);
    assert.equal(await evaluate("document.getAnimations().some(animation => animation.effect.getTiming().duration === 550)"), true);
    assert.equal(await evaluate("localStorage.getItem('vibeflow.motion.v1')"), "off");
    await waitFor("!document.body.dataset.transitioning", "always animated summary finishes");
    await evaluate("document.querySelector('.previous-stage').click()");
    await waitFor("document.body.dataset.stage === '2' && !document.body.dataset.transitioning", "always animated return");
    check("Animations always play despite reduced motion or a previously saved off preference", "explicit product preference, actual Web Animations");
    await evaluate("Element.prototype.animate = undefined; document.querySelector('.next-stage').click()");
    await waitFor("document.body.dataset.stage === '3' && !document.body.dataset.transitioning", "unsupported animation summary");
    await evaluate("document.querySelector('.previous-stage').click()");
    await waitFor("document.body.dataset.stage === '2' && !document.body.dataset.transitioning", "unsupported animation return");
    check("Stage navigation still works when both animation APIs are unavailable", "simulated unsupported browser");
    await rpc("Emulation.setEmulatedMedia", {features: [{name: "prefers-reduced-motion", value: "no-preference"}]});
    await evaluate("document.startViewTransition = window.nativeViewTransition; Element.prototype.animate = window.originalAnimate");
    await evaluate(`document.startViewTransition = update => {
      update(); return {ready: Promise.reject(new Error('Simulated snapshot unavailable')), updateCallbackDone: Promise.resolve(), finished: Promise.resolve(), skipTransition() {}};
    }; window.fallbackAnimations = 0;
    window.originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function(...args) { window.fallbackAnimations++; return window.originalAnimate.apply(this, args); };
    document.querySelector('.next-stage').click()`);
    await waitFor("window.fallbackAnimations > 0", "native snapshot failure falls back");
    await waitFor("!document.body.dataset.transitioning", "snapshot fallback finishes");
    await evaluate("document.querySelector('.previous-stage').click()");
    await waitFor("document.body.dataset.stage === '2' && !document.body.dataset.transitioning", "snapshot fallback return");
    await evaluate("document.startViewTransition = window.nativeViewTransition; Element.prototype.animate = window.originalAnimate");
    check("Failed native snapshots still animate using the fallback", "simulated browser snapshot rejection, real Web Animations");
    check("Results and summary adapt across 320, 390, 768 and 1024px", "real responsive layout");
    await rpc("Fetch.enable", {patterns: [{urlPattern: "*/api/*", requestStage: "Request"}]});
    await rpc("Emulation.setDeviceMetricsOverride", {width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false});
    await evaluate("document.querySelector('form').requestSubmit()");
    await waitFor("window.appState?.slogans.length === 3 && !!window.appState.evaluation", "fixture responses");
    await waitFor("!document.body.dataset.transitioning", "fixture form transition finishes");
    assert.equal(await evaluate("window.pageSentinel"), "same-document");
    assert.equal(fixtureCalls.filter(call => call.route === "/api/evaluate").length, 1);
    assert.equal(fixtureCalls.filter(call => call.route === "/api/slogans").length, 1);
    assert.equal(await evaluate("document.querySelectorAll('.slogan-list li').length"), 3);
    const oldTagline = await evaluate("window.appState.tagline");
    await evaluate("document.getElementById('slogans-retry').click()");
    await waitFor(`window.appState.tagline !== ${JSON.stringify(oldTagline)} && !window.appState.pending.slogans`, "fixture retry");
    assert.equal(fixtureCalls.filter(call => call.route === "/api/slogans").at(-1).payload.previous_tagline, oldTagline);
    check("AI panels render and retry uses the previous tagline", "intercepted AI fixtures, no Gemini request");
    await evaluate("document.querySelector('.next-stage').click()");
    await waitFor("document.body.dataset.stage === '3'", "fixture summary");
    await waitFor("!document.body.dataset.transitioning", "fixture summary transition finishes");
    assert.equal(await evaluate("document.getElementById('overview-memory').textContent"), "8/10");
    assert.equal(await evaluate("document.getElementById('overview-pronunciation').textContent"), "9/10");
    assert.equal(await evaluate("document.getElementById('overview-slogans').textContent"), "3 câu");
    assert.equal(await evaluate("document.getElementById('overview-tagline').textContent"), await evaluate("window.appState.tagline"));
    assert.match(await evaluate("document.getElementById('overview-status').textContent"), /3\/3/);
    await evaluate("const fixtureBanner = document.createElement('p'); fixtureBanner.id = 'fixture-banner'; fixtureBanner.textContent = 'KIỂM THỬ GIAO DIỆN — PHẢN HỒI AI MÔ PHỎNG, KHÔNG PHẢI GEMINI THẬT'; fixtureBanner.style.cssText = 'padding:16px;background:#fff1b8;color:#493900;font-weight:bold;text-align:center;margin:0'; document.body.prepend(fixtureBanner)");
    await capture("desktop-overview-ai-fixture.png");
    await evaluate("document.getElementById('fixture-banner').remove()");
    await evaluate("document.querySelector('.previous-stage').click()");
    await waitFor("document.body.dataset.stage === '2'", "return to fixture details");
    await waitFor("!document.body.dataset.transitioning", "fixture details transition finishes");
    check("Summary reflects the actual latest AI scores, slogans and tagline", "intercepted AI fixtures, no Gemini request");
    await rpc("Browser.grantPermissions", {origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"]});
    await rpc("Page.bringToFront");
    const originalClipboard = await evaluate("navigator.clipboard.readText()");
    await evaluate("document.getElementById('copy-all').click()");
    await waitFor("document.getElementById('action-feedback').textContent === 'Đã sao chép'", "clipboard write");
    const clipboard = await evaluate("navigator.clipboard.readText()");
    assert.match(clipboard, /Đồng hành cùng những ý tưởng mới/);
    assert.match(clipboard, /KHÔNG PHẢI DỮ LIỆU THẬT/);
    await evaluate(`navigator.clipboard.writeText(${JSON.stringify(originalClipboard)})`);
    check("Copy writes the latest results to the actual browser clipboard", "real clipboard with intercepted AI fixtures");
    await evaluate("document.querySelector('.step-navigation [data-go=\"1\"]').click()");
    await waitFor("document.body.dataset.stage === '1' && !document.body.dataset.transitioning", "return to edit brand");
    await evaluate(`window.savedFetch = window.fetch; window.fetch = () => Promise.reject(new Error('Mạng tạm thời không khả dụng'));
      document.getElementById('brand-name').value = 'Cà phê Đậm'; document.getElementById('brand-name').dispatchEvent(new Event('input')); document.querySelector('form').requestSubmit()`);
    await waitFor("document.getElementById('brand-error')?.textContent.includes('Mạng tạm thời') && !document.querySelector('[type=submit]').disabled", "recoverable form error");
    assert.equal(await evaluate("window.appState.brand"), "Mây Studio");
    await evaluate("window.fetch = window.savedFetch; document.querySelector('form').requestSubmit()");
    await waitFor("window.appState.brand === 'Cà phê Đậm' && window.appState.evaluation && window.appState.slogans.length === 3 && !document.body.dataset.transitioning", "new brand after network failure");
    assert.equal(fixtureCalls.filter(call => call.route === "/api/evaluate" && call.payload.brand === "Cà phê Đậm").length, 1);
    assert.equal(fixtureCalls.filter(call => call.route === "/api/slogans" && call.payload.brand === "Cà phê Đậm").length, 1);
    assert.equal(await evaluate("window.pageSentinel"), "same-document");
    check("Network failure is recoverable and a new brand loads each AI panel once", "same document, intercepted AI fixtures");
    await evaluate("const banner = document.createElement('p'); banner.textContent = 'KIỂM THỬ GIAO DIỆN — PHẢN HỒI AI MÔ PHỎNG, KHÔNG PHẢI GEMINI THẬT'; banner.style.cssText = 'padding:16px;background:#fff1b8;color:#493900;font-weight:bold;text-align:center;margin:0'; document.body.prepend(banner)");
    await capture("desktop-ai-fixture.png");
    assert.equal(errors.length, 0);
    check("No uncaught JavaScript exceptions", "all browser checks");
    await rpc("Fetch.disable");
    await rpc("Emulation.clearDeviceMetricsOverride");
    await rpc("Emulation.setScriptExecutionDisabled", {value: true});
    await rpc("Page.navigate", {url: origin});
    await waitFor("document.readyState === 'complete' && !!document.getElementById('brand-name')", "no JavaScript page");
    assert.equal(await evaluate("document.querySelector('.input-panel').getBoundingClientRect().height > 0"), true);
    assert.equal(await evaluate("document.querySelector('.results').getBoundingClientRect().height > 0"), true);
    check("Form and results remain visible without JavaScript", "progressive enhancement");
    await rpc("Emulation.setScriptExecutionDisabled", {value: false});
    if (!process.argv.includes("--skip-evidence")) {
    await rpc("Page.navigate", {url: pathToFileURL(path.join(root, "docs", "AI_EVIDENCE.html")).href});
    await waitFor("document.readyState === 'complete' && document.title.includes('Minh chứng')", "AI evidence document");
    const pdf = await rpc("Page.printToPDF", {preferCSSPageSize: true, printBackground: true});
    const pdfData = Buffer.from(pdf.data, "base64");
    const pageCount = (pdfData.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
    assert.equal(pageCount, 1, "AI evidence must fit one A4 page");
    fs.writeFileSync(path.join(root, "docs", "AI_EVIDENCE.pdf"), pdfData);
    report.evidence_pdf = {path: "docs/AI_EVIDENCE.pdf", pages: pageCount};
    console.log("PASS AI evidence exported as one-page A4 PDF");
    }
    report.status = "passed";
    await rpc("Browser.close");
  } catch (error) {
    report.error = error.message;
    process.exitCode = 1;
    console.error(error.message);
  } finally {
    if (ws) ws.close();
    if (browser && browser.exitCode === null) browser.kill();
    server.kill();
    fs.writeFileSync(path.join(reports, "browser-results.json"), JSON.stringify(report, null, 2) + "\n");
    const lines = ["# Kiểm tra trình duyệt", "", `Thời điểm UTC: ${report.checked_at_utc}.`, "",
      `Trạng thái: **${report.status}**. ${checks.length} ca hoàn thành.`, "",
      "Chạy Chrome headless thật với Flask local. Giai đoạn đầu không có API key; giai đoạn sau chặn request và trả fixture trong công cụ kiểm tra. Không gọi Gemini thật.", "",
      "| Ca | Phạm vi | Kết quả |", "|---|---|---|", ...checks.map(item => `| ${item.name} | ${item.scope} | ${item.status} |`), "",
      "Ảnh có tên `ai-fixture` được gắn nhãn mô phỏng, chỉ minh chứng giao diện. Các ảnh còn lại là ứng dụng local chưa cấu hình AI.", "",
      ...report.screenshots.map(item => `- [${path.basename(item)}](../../${item})`), "",
      report.evidence_pdf ? `Minh chứng sử dụng AI: [PDF một trang](../AI_EVIDENCE.pdf), đã kiểm tra ${report.evidence_pdf.pages} trang A4.` : process.argv.includes("--skip-evidence") ? "Lần chạy này chỉ kiểm tra giao diện, không xuất lại PDF minh chứng." : "Chưa xuất được PDF minh chứng.", "",
      report.error ? `Lỗi: ${report.error}` : "Không ghi nhận JavaScript exception chưa xử lý.", ""];
    fs.writeFileSync(path.join(reports, "BROWSER_RESULTS.md"), lines.join("\n"));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
