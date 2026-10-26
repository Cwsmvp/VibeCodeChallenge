document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("slogans-card");
  const button = document.getElementById("slogans-retry");
  if (!card || !button) return;

  const content = document.getElementById("slogans-content");
  const feedback = document.getElementById("slogans-feedback");

  button.addEventListener("click", async () => {
    button.disabled = true;
    feedback.textContent = "Đang tìm phương án mới…";
    try {
      const response = await fetch("/api/slogans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: card.dataset.brand }),
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
      feedback.textContent = "Đã tạo phương án mới.";
    } catch (error) {
      feedback.textContent = error.message || "Chưa thể gợi ý slogan lúc này.";
    } finally {
      button.disabled = false;
    }
  });
});
