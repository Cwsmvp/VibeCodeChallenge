"""Ứng dụng Flask cho Trợ lý đặt tên thương hiệu & tên miền."""

import unicodedata

from flask import Flask, jsonify, render_template, request

from domains import Checkdomain, Domains
from evaluation import EvaluationError, evaluate_brand
from slug import Transtoslug


app = Flask(__name__, static_folder="public", static_url_path="")


@app.route("/", methods=["GET", "POST"])
def index():
    """Nhận tên thương hiệu, tạo slug và kết quả tên miền demo."""
    state = {"brand": "", "slug": "", "domains": [], "evaluation": None}
    error = None
    evaluation_error = None

    if request.method == "POST":
        brand = unicodedata.normalize("NFC", request.form.get("brand", "").strip())
        state["brand"] = brand

        if not brand:
            error = "Vui lòng nhập tên thương hiệu"
        elif not 2 <= len(brand) <= 30:
            error = "Tên thương hiệu phải có từ 2 đến 30 ký tự"
        else:
            slug = Transtoslug(brand)
            if not slug:
                error = "Tên thương hiệu cần có chữ cái Latin hoặc chữ số để tạo tên miền"
            else:
                state["slug"] = slug
                state["domains"] = Domains(slug)
                for item in state["domains"]:
                    item["status"] = Checkdomain(item["domain"])
                try:
                    state["evaluation"] = evaluate_brand(brand)
                except EvaluationError as exc:
                    evaluation_error = str(exc)

    return render_template("index.html", state=state, error=error, evaluation_error=evaluation_error)


@app.post("/api/evaluate")
def api_evaluate():
    """Endpoint JSON dùng được cục bộ và khi triển khai Flask serverless."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("brand"), str):
        return jsonify({"error": "Vui lòng gửi JSON với trường brand là chuỗi"}), 400

    brand = unicodedata.normalize("NFC", payload["brand"].strip())
    if not brand:
        return jsonify({"error": "Vui lòng nhập tên thương hiệu"}), 400
    if len(brand) > 50:
        return jsonify({"error": "Tên thương hiệu không được vượt quá 50 ký tự"}), 400

    try:
        return jsonify(evaluate_brand(brand))
    except EvaluationError as exc:
        return jsonify({"error": str(exc)}), exc.status_code
