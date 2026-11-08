function initializeEvaluation() {
  const state = window.appState;
  const content = document.getElementById("evaluation-content");
  const button = document.getElementById("evaluation-retry");
  if (!state?.slug || !content || !button) return;
  const ai = window.brandAI;
  state.pending ??= {};
  let pending = false;
  const brandInput = document.getElementById("brand-name");
  const brandChanged = () => brandInput && brandInput.value.trim().normalize("NFC") !== state.brand;
  const updateButton = () => { button.disabled = pending || brandChanged(); };
  brandInput?.addEventListener("input", updateButton);

  async function loadEvaluation() {
    if (pending || brandChanged()) return;
    pending = state.pending.evaluation = true;
    updateButton();
    ai.loading(content, "Đang đánh giá tên thương hiệu…");
    try {
      const result = await ai.request("/api/evaluate", { brand: state.brand });
      const body = ai.element("div", "evaluation-body");
      for (const [key, title] of [["memorability", "Dễ nhớ"], ["pronounceability", "Dễ đọc & phát âm"]]) {
        const metric = ai.element("div", "evaluation-metric");
        const description = ai.element("div");
        description.append(ai.element("h3", "", title), ai.element("p", "", result[key].comment));
        const score = ai.element("span", "evaluation-score", String(result[key].score));
        score.append(ai.element("small", "", "/10"));
        metric.append(description, score);
        body.append(metric);
      }
      body.append(ai.element("p", "evaluation-summary", result.summary));
      content.replaceChildren(body);
      state.evaluation = result;
    } catch (error) {
      content.replaceChildren(ai.element("p", "evaluation-error", error.message || "Chưa thể đánh giá tên. Vui lòng thử lại."));
    } finally {
      pending = state.pending.evaluation = false;
      content.setAttribute("aria-busy", "false");
      updateButton();
    }
  }
  button.addEventListener("click", loadEvaluation);
  loadEvaluation();
}
document.addEventListener("DOMContentLoaded", initializeEvaluation);
document.addEventListener("brand:ready", initializeEvaluation);
