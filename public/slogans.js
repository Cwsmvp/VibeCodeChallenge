function initializeSlogans() {
  const card = document.getElementById("slogans-card");
  const button = document.getElementById("slogans-retry");
  if (!card || !button || !window.appState?.slug) return;

  const content = document.getElementById("slogans-content");
  const feedback = document.getElementById("slogans-feedback");
  const state = window.appState;
  const ai = window.brandAI;
  state.pending ??= {};
  const brandInput = document.getElementById("brand-name");
  let pending = false;
  const brandChanged = () => brandInput && brandInput.value.trim().normalize("NFC") !== card.dataset.brand;
  const updateButton = () => { button.disabled = pending || brandChanged(); };
  brandInput?.addEventListener("input", () => {
    updateButton();
    feedback.textContent = brandChanged()
      ? "Tên thương hiệu đã thay đổi. Bấm Phân tích để tạo kết quả cho tên mới."
      : "";
  });
  updateButton();

  async function loadSlogans() {
    if (pending || brandChanged()) return;
    pending = state.pending.slogans = true;
    updateButton();
    const hasResults = state.slogans.length > 0;
    const loader = ai.loading(content, hasResults ? "Đang tìm phương án mới…" : "Đang tạo slogan và tagline…", hasResults);
    feedback.textContent = "";
    try {
      const result = await ai.request("/api/slogans", { brand: card.dataset.brand, previous_tagline: state.tagline || "" });

      const list = document.createElement("ol");
      list.className = "slogan-list";
      for (const slogan of result.slogans) {
        const item = document.createElement("li");
        item.textContent = slogan;
        list.append(item);
      }
      const tagline = document.createElement("div");
      tagline.className = "tagline-block";
      const label = document.createElement("span");
      label.textContent = "TAGLINE";
      const phrase = document.createElement("p");
      phrase.textContent = result.tagline;
      tagline.append(label, phrase);
      content.replaceChildren(list, tagline);
      state.slogans = result.slogans;
      state.tagline = result.tagline;
      feedback.textContent = "Đã tạo phương án mới.";
    } catch (error) {
      feedback.textContent = `${error.message || "Chưa thể gợi ý slogan lúc này."}${hasResults ? " Kết quả đang hiển thị chưa được thay đổi." : ""}`;
    } finally {
      loader.remove();
      pending = state.pending.slogans = false;
      updateButton();
      content.setAttribute("aria-busy", "false");
      if (brandChanged()) feedback.textContent = "Tên thương hiệu đã thay đổi. Bấm Phân tích để tạo kết quả cho tên mới.";
    }
  }
  button.addEventListener("click", loadSlogans);
  loadSlogans();
}
document.addEventListener("DOMContentLoaded", initializeSlogans);
document.addEventListener("brand:ready", initializeSlogans);
