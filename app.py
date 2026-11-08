"""Ứng dụng Flask cho Trợ lý đặt tên thương hiệu & tên miền."""

import os
import unicodedata
from urllib.parse import urlsplit

from flask import Flask, jsonify, render_template, request

from domains import Checkdomain, Domains
from evaluation import EvaluationError, evaluate_brand
from slug import Transtoslug
from slogans import suggest_slogans


app = Flask(__name__, static_folder="public", static_url_path="")
app.config["SPONSOR_DOMAIN_URL"] = os.environ.get("SPONSOR_DOMAIN_URL", "").strip()


def validated_brand(value: str) -> tuple[str, str, str | None]:
    """Dùng cùng quy tắc đầu vào cho form và hai API."""
    brand = unicodedata.normalize("NFC", value.strip())
    if not brand:
        return brand, "", "Vui lòng nhập tên thương hiệu"
    if not 2 <= len(brand) <= 30:
        return brand, "", "Tên thương hiệu phải có từ 2 đến 30 ký tự"
    slug = Transtoslug(brand)
    if not slug:
        return brand, "", "Tên thương hiệu cần có chữ cái Latin hoặc chữ số để tạo tên miền"
    return brand, slug, None


def registration_target() -> tuple[str, bool]:
    """Chỉ dùng liên kết HTTPS; thiếu cấu hình thì chuyển tới trang demo."""
    value = app.config["SPONSOR_DOMAIN_URL"]
    try:
        parsed = urlsplit(value)
        if parsed.scheme == "https" and parsed.hostname and not (parsed.username or parsed.password):
            return value, False
    except ValueError:
        pass
    return "/dang-ky-demo", True


@app.route("/", methods=["GET", "POST"])
def index():
    """Nhận tên thương hiệu, tạo slug và kết quả tên miền demo."""
    state = {"brand": "", "slug": "", "domains": [], "evaluation": None, "slogans": [], "tagline": ""}
    error = None
    registration_url, registration_demo = registration_target()

    if request.method == "POST":
        brand, slug, error = validated_brand(request.form.get("brand", ""))
        state["brand"] = brand

        if not error:
            state["slug"] = slug
            state["domains"] = Domains(slug)
            for item in state["domains"]:
                item["status"] = Checkdomain(item["domain"])

    return render_template("index.html", state=state, error=error,
                           registration_url=registration_url, registration_demo=registration_demo)


@app.get("/dang-ky-demo")
def domain_registration_demo():
    """Liên kết demo được đề 10 cho phép khi chưa có URL từ BTC."""
    return render_template("registration_demo.html")


@app.post("/api/evaluate")
def api_evaluate():
    """Endpoint JSON dùng được cục bộ và khi triển khai Flask serverless."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("brand"), str):
        return jsonify({"error": "Vui lòng gửi JSON với trường brand là chuỗi"}), 400

    brand, _, error = validated_brand(payload["brand"])
    if error:
        return jsonify({"error": error}), 400

    try:
        return jsonify(evaluate_brand(brand))
    except EvaluationError as exc:
        body = {"error": str(exc)}
        if exc.provider_status is not None:
            body["provider_status"] = exc.provider_status
        if exc.provider_code is not None:
            body["provider_code"] = exc.provider_code
        return jsonify(body), exc.status_code


@app.post("/api/slogans")
def api_slogans():
    """Sinh phương án slogan mới mà không cần tải lại trang."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("brand"), str):
        return jsonify({"error": "Vui lòng gửi JSON với trường brand là chuỗi"}), 400

    brand, _, error = validated_brand(payload["brand"])
    if error:
        return jsonify({"error": error}), 400

    previous_tagline = payload.get("previous_tagline", "")
    if not isinstance(previous_tagline, str) or len(previous_tagline.split()) > 15:
        return jsonify({"error": "Tagline trước đó phải là chuỗi tối đa 15 từ"}), 400

    try:
        return jsonify(suggest_slogans(brand, previous_tagline))
    except EvaluationError as exc:
        body = {"error": str(exc)}
        if exc.provider_status is not None:
            body["provider_status"] = exc.provider_status
        if exc.provider_code is not None:
            body["provider_code"] = exc.provider_code
        return jsonify(body), exc.status_code
