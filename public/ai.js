// Các phần kết quả tải độc lập và cập nhật cùng state dùng cho Copy tất cả.
window.brandAI = {
  element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  },
  loading(content, message, keepResults = false) {
    const loader = this.element("div", "ai-loading");
    loader.setAttribute("role", "status");
    const spinner = this.element("span", "loading-spinner");
    spinner.setAttribute("aria-hidden", "true");
    loader.append(spinner, this.element("p", "", message));
    if (keepResults) content.append(loader);
    else content.replaceChildren(loader);
    content.setAttribute("aria-busy", "true");
    return loader;
  },
  async request(url, payload) {
    const controller = new AbortController();
    // Bảo đảm loading kết thúc cả khi hosting hoặc mạng không trả phản hồi.
    const timer = setTimeout(() => controller.abort(), 130000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let result;
      try { result = await response.json(); }
      catch (_) { throw new Error("Máy chủ chưa trả về kết quả hợp lệ. Vui lòng thử lại."); }
      if (!response.ok) throw new Error(result.error || "Chưa thể tải kết quả AI. Vui lòng thử lại.");
      return result;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("Đã hết thời gian chờ phản hồi. Vui lòng thử lại.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  },
};
