# Kết quả kiểm thử tự động

Thời điểm UTC: `2026-11-04T09:32:26.953161+00:00`.

Python: **25 test**, trạng thái `passed`.
JavaScript: **6/6 test đạt**, trạng thái `passed`.

Không gọi Gemini thật. Bộ JavaScript mô phỏng DOM và phản hồi mạng, không thay thế kiểm tra trình duyệt.

| Ca | Trạng thái |
|---|---|
| `test_gemini.GeminiTests.test_bad_timeout_config_does_not_make_request` | passed |
| `test_gemini.GeminiTests.test_custom_timeout_is_reported_without_retry_or_secret_in_logs` | passed |
| `test_gemini.GeminiTests.test_provider_failures_expose_safe_status_and_specific_message` | passed |
| `test_gemini.GeminiTests.test_slogans_endpoint_returns_timeout_json` | passed |
| `test_gemini.GeminiTests.test_success_uses_default_timeout_and_reads_interactions_response` | passed |
| `test_gemini.GeminiTests.test_wrapped_timeout_and_connection_failure_are_distinct` | passed |
| `test_slogans.SloganTests.test_initial_page_returns_domains_and_loading_without_calling_ai` | passed |
| `test_slogans.SloganTests.test_invalid_brand_does_not_start_loading_or_ai` | passed |
| `test_slogans.SloganTests.test_invalid_previous_tagline_does_not_call_ai` | passed |
| `test_slogans.SloganTests.test_repeated_tagline_is_reported_even_with_cosmetic_changes` | passed |
| `test_slogans.SloganTests.test_retry_api_forwards_previous_tagline` | passed |
| `test_slogans.SloganTests.test_retry_api_returns_repeat_error` | passed |
| `test_slogans.SloganTests.test_retry_sends_previous_tagline_as_data` | passed |
| `test_submission.SubmissionTests.test_assets_and_mobile_viewport_are_available` | passed |
| `test_submission.SubmissionTests.test_form_and_api_share_validation_and_normalization` | passed |
| `test_submission.SubmissionTests.test_malformed_json_is_rejected_without_ai` | passed |
| `test_submission.SubmissionTests.test_missing_key_is_safe_and_does_not_contact_provider` | passed |
| `test_submission.SubmissionTests.test_registration_demo_and_official_link` | passed |
| `test_submission.SubmissionTests.test_tc01_normal_may_studio` | passed |
| `test_submission.SubmissionTests.test_tc02_normal_vietnamese_accents` | passed |
| `test_submission.SubmissionTests.test_tc03_empty_input` | passed |
| `test_submission.SubmissionTests.test_tc04_invalid_input` | passed |
| `test_submission.SubmissionTests.test_tc05_minimum_length` | passed |
| `test_submission.SubmissionTests.test_tc06_over_maximum_length` | passed |
| `test_submission.SubmissionTests.test_untrusted_brand_is_escaped_and_key_is_never_served` | passed |

Log: [Python](python-tests.txt), [JavaScript](frontend-tests.txt); dữ liệu máy đọc: [JSON](test-results.json).
