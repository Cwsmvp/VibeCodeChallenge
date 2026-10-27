document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("slogans-card");
  const button = document.getElementById("slogans-retry");
  if (!card || !button) return;

  const content = document.getElementById("slogans-content");
  const feedback = document.getElementById("slogans-feedback");
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

  button.addEventListener("click", async () => {
    if (pending || brandChanged()) return;
    pending = true;
    updateButton();
    content.setAttribute("aria-busy", "true");
    feedback.textContent = "Đang tìm phương án mới…";
    try {
      const response = await fetch("/api/slogans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: card.dataset.brand, previous_tagline: window.appState.tagline || "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa thể gợi ý slogan lúc này.");

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
      window.appState.slogans = result.slogans;
      window.appState.tagline = result.tagline;
      feedback.textContent = "Đã tạo phương án mới.";
    } catch (error) {
      feedback.textContent = `${error.message || "Chưa thể gợi ý slogan lúc này."} Kết quả đang hiển thị chưa được thay đổi.`;
    } finally {
      pending = false;
      updateButton();
      content.removeAttribute("aria-busy");
      if (brandChanged()) feedback.textContent = "Tên thương hiệu đã thay đổi. Bấm Phân tích để tạo kết quả cho tên mới.";
    }
  });
});
