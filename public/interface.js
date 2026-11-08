document.addEventListener("DOMContentLoaded", () => {
  const state = window.appState;
  if (!state) return;
  const body = document.body;
  const input = document.getElementById("brand-name");
  const form = input.form;
  const navigation = [...document.querySelectorAll("[data-go]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    if (document.startViewTransition && !reducedMotion.matches && window.innerWidth >= 1024) document.startViewTransition(apply);
    else apply();
  }
  navigation.forEach(button => button.addEventListener("click", () => goToStage(button.dataset.go)));
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
      button.addEventListener("click", () => {
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
  document.getElementById("open-history").addEventListener("click", () => { renderHistory(); dialog.showModal(); });
  for (const id of ["close-history", "done-history"]) document.getElementById(id).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  document.getElementById("clear-history").addEventListener("click", () => { history = []; persistHistory(); renderHistory(); });
  form.addEventListener("submit", () => {
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    button.textContent = "Đang phân tích…";
  });
  window.addEventListener("pageshow", () => {
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
});
