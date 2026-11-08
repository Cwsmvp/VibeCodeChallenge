function formatResults(state) {
  const lines = [
    `Tên thương hiệu: ${state.brand}`,
    `Slug tên miền: ${state.slug}`,
    "",
    "ĐÁNH GIÁ TÊN",
  ];

  if (state.evaluation) {
    const { memorability, pronounceability, summary } = state.evaluation;
    lines.push(`Dễ nhớ: ${memorability.score}/10 — ${memorability.comment}`);
    lines.push(`Dễ đọc & phát âm: ${pronounceability.score}/10 — ${pronounceability.comment}`);
    lines.push(`Tổng kết: ${summary}`);
  } else {
    lines.push(state.pending?.evaluation ? "Đang tải đánh giá AI…" : "Chưa có đánh giá AI.");
  }

  lines.push("", "GỢI Ý TÊN MIỀN — KẾT QUẢ DEMO, KHÔNG PHẢI DỮ LIỆU THẬT");
  for (const item of state.domains) {
    lines.push(`${item.domain}: ${item.status === "available" ? "Còn trống" : "Đã đăng ký"} (kết quả demo)`);
  }

  lines.push("", "SLOGAN");
  if (state.slogans.length) {
    state.slogans.forEach((slogan, index) => lines.push(`${index + 1}. ${slogan}`));
  } else {
    lines.push(state.pending?.slogans ? "Đang tải slogan AI…" : "Chưa có slogan AI.");
  }
  lines.push(`Tagline: ${state.tagline || (state.pending?.slogans ? "Đang tải tagline AI…" : "Chưa có tagline AI.")}`);
  return lines.join("\n");
}

function legacyCopy(text) {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copy-all");
  const registerLink = document.getElementById("register-domain");
  const feedback = document.getElementById("action-feedback");
  const state = window.appState;
  if (!copyButton || !registerLink || !state) return;

  copyButton.addEventListener("click", async () => {
    if (!state.slug) return;
    const text = formatResults(state);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) {
      // Trình duyệt có thể từ chối Clipboard API; thử cách dự phòng bên dưới.
    }
    if (!copied) {
      try { copied = legacyCopy(text); } catch (_) { copied = false; }
    }
    feedback.textContent = copied ? "Đã sao chép" : "Không thể sao chép. Hãy thử lại.";
  });
});
