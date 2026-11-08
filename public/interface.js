let activeLayoutTransition;
let layoutAnimations = [];
let layoutRun = 0;
let cleanupInterface = () => {};

// Cùng một chuyển động cho lúc gửi form và lúc đổi bố cục kết quả.
async function animateLayout(update) {
  const run = ++layoutRun;
  activeLayoutTransition?.skipTransition();
  layoutAnimations.forEach(animation => animation.cancel());
  layoutAnimations = [];
  document.body.dataset.transitioning = "true";
  try {
    // FLIP: đo vị trí cũ/mới để các thẻ vẫn di chuyển khi thiếu View Transition.
    const selectors = new Map([
      ["user", ".form-fields, .brand-badge"], ["hero", ".hero"],
      ["evaluation", ".evaluation-card"], ["domains", ".domains-card"],
      ["slogans", "#slogans-card"], ["dashboard", ".dashboard"],
      ["controls", ".result-controls"],
    ]);
    const visible = selector => [...document.querySelectorAll(selector)].find(element => element.getClientRects().length);
    const before = new Map([...selectors].map(([key, selector]) => [key, visible(selector)?.getBoundingClientRect()]));
    if (document.startViewTransition) {
      const transition = activeLayoutTransition = document.startViewTransition(update);
      try {
        await transition.ready;
        await transition.finished.catch(() => {});
        return;
      } catch (_) {
        // Trình duyệt có API nhưng không chụp được snapshot: vẫn chạy FLIP.
        await transition.updateCallbackDone;
        if (run !== layoutRun) return;
      }
    } else update();
    for (const [key, selector] of selectors) {
      const element = visible(selector);
      if (!element?.animate) continue;
      const first = before.get(key);
      const last = element.getBoundingClientRect();
      const from = first && last.width && last.height
        ? {transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`, opacity: 1}
        : {transform: "translateY(22px) scale(.97)", opacity: 0};
      layoutAnimations.push(element.animate([
        {...from, transformOrigin: "top left"},
        {transform: "translate(0, 0) scale(1)", transformOrigin: "top left", opacity: 1},
      ], {duration: 550, easing: "cubic-bezier(.22,1,.36,1)"}));
    }
    await Promise.all(layoutAnimations.map(animation => animation.finished.catch(() => {})));
  } finally {
    if (run === layoutRun) {
      delete document.body.dataset.transitioning;
      activeLayoutTransition = undefined;
      layoutAnimations = [];
    }
  }
}

function initializeInterface() {
  cleanupInterface();
  const state = window.appState;
  if (!state) return;
  const controller = new AbortController();
  const listen = (target, event, handler) => target.addEventListener(event, handler, {signal: controller.signal});
  const body = document.body;
  const input = document.getElementById("brand-name");
  const form = input.form;
  const navigation = [...document.querySelectorAll("[data-go]")];

  function updateNavigation() {
    for (const button of navigation) {
      const target = button.dataset.go;
      button.disabled = target !== "1" && !state.slug;
      if (button.closest(".step-navigation")) {
        if (target === body.dataset.stage) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      }
    }
  }
  function goToStage(stage, focus = true) {
    if (stage !== "1" && !state.slug) return;
    const apply = () => {
      body.dataset.stage = stage;
      updateNavigation();
      if (focus) {
        if (stage === "1") input.focus({preventScroll: true});
        else {
          const panel = document.querySelector(stage === "3" ? ".dashboard" : ".brand-badge");
          panel.setAttribute("tabindex", "-1");
          panel.focus({preventScroll: true});
        }
        window.scrollTo({top: 0, behavior: "instant"});
      }
    };
    if (body.dataset.stage === stage) { if (stage === "1" && focus) input.focus(); return; }
    return animateLayout(apply);
  }
  navigation.forEach(button => listen(button, "click", () => goToStage(button.dataset.go)));
  updateNavigation();
  if (input.getAttribute("aria-invalid") === "true") input.focus();

  // Chỉ lưu tên đã được server xác nhận; không lưu khóa hoặc kết quả AI.
  const storageKey = "vibeflow.brand-history.v1";
  let history = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) history = [...new Set(saved.filter(name => typeof name === "string" && name.trim().length >= 2 && name.length <= 30))].slice(0, 20);
  } catch (_) { /* Vẫn dùng danh sách trong phiên khi bộ nhớ bị chặn. */ }
  function persistHistory() {
    try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (_) { /* Bộ nhớ có thể không khả dụng. */ }
  }
  if (state.slug) {
    history = [state.brand, ...history.filter(name => name !== state.brand)].slice(0, 20);
    persistHistory();
  }
  const dialog = document.getElementById("history-dialog");
  const list = document.getElementById("history-list");
  function renderHistory() {
    list.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "Chưa có tên nào. Bắt đầu với ý tưởng đầu tiên của bạn.";
      list.append(empty);
    }
    for (const name of history) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name;
      listen(button, "click", () => {
        dialog.close();
        const previousName = input.value;
        input.value = name;
        if (previousName !== name) input.dispatchEvent(new Event("input", {bubbles: true}));
        goToStage("1");
      });
      item.append(button);
      list.append(item);
    }
  }
  listen(document.getElementById("open-history"), "click", () => { renderHistory(); dialog.showModal(); });
  for (const id of ["close-history", "done-history"]) listen(document.getElementById(id), "click", () => dialog.close());
  listen(dialog, "click", event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  listen(document.getElementById("clear-history"), "click", () => { history = []; persistHistory(); renderHistory(); });
  let submitting = false;
  listen(form, "submit", async event => {
    event.preventDefault();
    if (submitting) return;
    submitting = true;
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    button.textContent = "Đang phân tích…";
    const requestController = new AbortController();
    const timeout = setTimeout(() => requestController.abort(), 30000);
    try {
      const response = await fetch(form.action, {method: "POST", body: new FormData(form), signal: requestController.signal});
      if (!response.ok) throw new Error("Máy chủ chưa thể phân tích tên. Vui lòng thử lại.");
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      const nextMain = page.getElementById("workspace");
      const nextFooter = page.querySelector(".site-footer");
      const nextState = page.getElementById("app-state");
      if (!nextMain || !nextFooter || !nextState) throw new Error("Máy chủ trả về nội dung không hợp lệ. Vui lòng thử lại.");
      const result = JSON.parse(nextState.textContent);
      await animateLayout(() => {
        document.getElementById("workspace").replaceWith(nextMain);
        document.querySelector(".site-footer").replaceWith(nextFooter);
        document.getElementById("app-state").textContent = nextState.textContent;
        window.appState = result;
        body.dataset.stage = result.slug ? "2" : "1";
        document.dispatchEvent(new Event("brand:ready"));
        const target = document.querySelector(result.slug ? ".brand-badge" : "#brand-name");
        if (result.slug) target.setAttribute("tabindex", "-1");
        target.focus({preventScroll: true});
        window.scrollTo({top: 0, behavior: "instant"});
      });
    } catch (error) {
      let feedback = document.getElementById("brand-error");
      if (!feedback) {
        feedback = document.createElement("p");
        feedback.id = "brand-error";
        feedback.className = "input-feedback input-error";
        feedback.setAttribute("role", "alert");
        form.querySelector(".form-fields").append(feedback);
      }
      feedback.textContent = error.name === "AbortError" ? "Đã hết thời gian chờ. Vui lòng thử lại." : error.message;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "brand-error");
      input.focus();
    } finally {
      clearTimeout(timeout);
      submitting = false;
      if (button.isConnected) { button.disabled = false; button.textContent = "Phân tích →"; }
    }
  });
  listen(window, "pageshow", () => {
    const button = form.querySelector("[type=submit]");
    button.disabled = false;
    button.textContent = "Phân tích →";
  });

  const setText = (id, text) => { document.getElementById(id).textContent = text; };
  function updateOverview() {
    const evaluation = state.evaluation;
    const pending = state.pending || {};
    setText("overview-memory", evaluation ? `${evaluation.memorability.score}/10` : "—");
    setText("overview-pronunciation", evaluation ? `${evaluation.pronounceability.score}/10` : "—");
    setText("overview-slogans", state.slogans.length ? `${state.slogans.length} câu` : "—");
    setText("overview-tagline", state.tagline || (pending.slogans ? "Đang tìm cảm hứng cho thương hiệu…" : "Chưa có tagline AI. Bạn có thể thử lại ở phần chi tiết."));
    setText("evaluation-preview", evaluation ? `Dễ nhớ ${evaluation.memorability.score}/10 · Dễ phát âm ${evaluation.pronounceability.score}/10` : pending.evaluation ? "Đang đánh giá tên thương hiệu…" : "Chưa có đánh giá AI · Xem chi tiết để thử lại");
    setText("slogans-preview", state.slogans.length ? state.tagline : pending.slogans ? "Đang tạo slogan và tagline…" : "Chưa có slogan AI · Xem chi tiết để thử lại");
    const complete = Number(Boolean(evaluation)) + Number(state.domains.length > 0) + Number(state.slogans.length > 0);
    setText("overview-status", pending.evaluation || pending.slogans ? `${complete}/3 phần đã có kết quả · AI đang xử lý…` : `${complete}/3 phần đã có kết quả${complete < 3 ? " · Một số kết quả AI chưa khả dụng." : " · Sẵn sàng để sao chép."}`);
  }
  updateOverview();
  const observer = new MutationObserver(updateOverview);
  for (const id of ["evaluation-content", "slogans-content", "slogans-feedback"]) {
    const panel = document.getElementById(id);
    if (panel) observer.observe(panel, {childList: true, subtree: true, attributes: true, attributeFilter: ["aria-busy"]});
  }
  cleanupInterface = () => { controller.abort(); observer.disconnect(); };
}
document.addEventListener("DOMContentLoaded", initializeInterface);
document.addEventListener("brand:ready", initializeInterface);
