"""RecordLab: a dependency-free Python data-processing web application.

Run with: python app.py
This local learning/demo server is not intended for public production hosting.
"""
from __future__ import annotations

import csv
import io
import json
import math
import mimetypes
import statistics
import sys
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
DEFAULT_PORT = 8000
MAX_BODY_BYTES = 2 * 1024 * 1024
MAX_ROWS = 10_000
MAX_COLUMNS = 100
STATIC_FILES = {"/": "index.html", "/index.html": "index.html", "/style.css": "style.css", "/script.js": "script.js"}


class DataProcessingError(ValueError):
    """An input data problem that can be safely shown to the user."""


def _normalise_value(value):
    """Trim strings and represent blank values as None."""
    if isinstance(value, str):
        value = value.strip()
        return value if value else None
    return value


def parse_records(filename: str, content: str) -> list[dict]:
    """Parse a JSON array/object or CSV text into a list of record dictionaries."""
    safe_name = Path(str(filename or "data.csv")).name
    suffix = Path(safe_name).suffix.lower()
    if not isinstance(content, str) or not content.strip():
        raise DataProcessingError("The selected file is empty. Choose a CSV or JSON file with records.")

    if suffix == ".json" or content.lstrip().startswith(("[", "{")):
        try:
            payload = json.loads(content)
        except json.JSONDecodeError as exc:
            raise DataProcessingError(f"Could not read JSON near line {exc.lineno}, column {exc.colno}.") from exc
        if isinstance(payload, dict):
            payload = payload.get("records", payload.get("data", [payload]))
        if not isinstance(payload, list):
            raise DataProcessingError("JSON must contain a list of records, or an object with a 'records' list.")
        if not payload:
            raise DataProcessingError("No records were found in this JSON file.")
        if not all(isinstance(record, dict) for record in payload):
            raise DataProcessingError("Every JSON record must be an object with named fields.")
        records = payload
    else:
        try:
            sample = content[:8192]
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            except csv.Error:
                dialect = csv.excel
            reader = csv.DictReader(io.StringIO(content), dialect=dialect)
            if not reader.fieldnames or not any(str(name or "").strip() for name in reader.fieldnames):
                raise DataProcessingError("The CSV needs a header row with field names.")
            reader.fieldnames = [str(name or "").strip() for name in reader.fieldnames]
            if len(reader.fieldnames) > MAX_COLUMNS:
                raise DataProcessingError(f"This file has too many columns. The limit is {MAX_COLUMNS}.")
            records = []
            for row in reader:
                if row and any(value is not None and str(value).strip() for value in row.values()):
                    records.append({str(key).strip(): value for key, value in row.items() if key is not None})
        except csv.Error as exc:
            raise DataProcessingError("Could not parse the CSV file. Check the header and delimiters.") from exc
        if not records:
            raise DataProcessingError("No data rows were found below the CSV header.")

    if len(records) > MAX_ROWS:
        raise DataProcessingError(f"This file has {len(records):,} rows. The limit is {MAX_ROWS:,} rows.")

    # Preserve the first-seen order of all column names across JSON records.
    columns = []
    seen = set()
    for record in records:
        for key in record.keys():
            name = str(key).strip()
            if name and name not in seen:
                seen.add(name)
                columns.append(name)
    if not columns:
        raise DataProcessingError("No named fields were found in the records.")
    if len(columns) > MAX_COLUMNS:
        raise DataProcessingError(f"This file has too many columns. The limit is {MAX_COLUMNS}.")

    cleaned = []
    for record in records:
        cleaned_record = {}
        for column in columns:
            cleaned_record[column] = _normalise_value(record.get(column))
        cleaned.append(cleaned_record)
    return cleaned


def _as_number(value):
    """Return a finite float for numeric values, otherwise None."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        candidate = value.strip().replace(",", "")
        if not candidate:
            return None
        try:
            number = float(candidate)
        except ValueError:
            return None
    else:
        return None
    return number if math.isfinite(number) else None


def _display_number(number: float):
    if math.isfinite(number) and number.is_integer():
        return int(number)
    return round(number, 4)


def analyze_records(records: list[dict]) -> dict:
    """Clean values and return usable statistics, field insights, and sample rows."""
    if not isinstance(records, list) or not records:
        raise DataProcessingError("At least one record is required for analysis.")
    if not all(isinstance(row, dict) for row in records):
        raise DataProcessingError("Records must be dictionaries with named fields.")

    columns = []
    seen = set()
    for row in records:
        for raw_name in row:
            name = str(raw_name).strip()
            if name and name not in seen:
                seen.add(name)
                columns.append(name)
    if not columns:
        raise DataProcessingError("No named fields were found in the records.")
    if len(columns) > MAX_COLUMNS:
        raise DataProcessingError(f"The limit is {MAX_COLUMNS} columns.")
    if len(records) > MAX_ROWS:
        raise DataProcessingError(f"The limit is {MAX_ROWS:,} records.")

    cleaned = []
    for row in records:
        current = {}
        for col in columns:
            value = _normalise_value(row.get(col))
            number = _as_number(value)
            # Preserve integer-looking values as integers for cleaner exports.
            if number is not None:
                value = _display_number(number)
            current[col] = value
        cleaned.append(current)

    numeric_fields = []
    categorical_fields = []
    field_stats = []
    missing_total = 0
    for col in columns:
        values = [row.get(col) for row in cleaned]
        present = [value for value in values if value is not None and value != ""]
        missing = len(values) - len(present)
        missing_total += missing
        numbers = [_as_number(value) for value in present]
        is_numeric = bool(present) and all(number is not None for number in numbers)
        if is_numeric:
            numeric_fields.append(col)
            valid_numbers = [number for number in numbers if number is not None]
            mean_value = statistics.mean(valid_numbers)
            median_value = statistics.median(valid_numbers)
            stats = {
                "name": col,
                "kind": "numeric",
                "count": len(valid_numbers),
                "missing": missing,
                "unique": len(set(valid_numbers)),
                "min": _display_number(min(valid_numbers)),
                "max": _display_number(max(valid_numbers)),
                "mean": _display_number(mean_value),
                "median": _display_number(median_value),
                "sum": _display_number(sum(valid_numbers)),
                "range": _display_number(max(valid_numbers) - min(valid_numbers)),
                "values": [_display_number(value) for value in valid_numbers],
            }
        else:
            categorical_fields.append(col)
            string_values = [str(value) for value in present]
            counts = Counter(string_values)
            stats = {
                "name": col,
                "kind": "categorical",
                "count": len(present),
                "missing": missing,
                "unique": len(set(string_values)),
                "top_values": [{"value": value, "count": count} for value, count in counts.most_common(4)],
            }
        field_stats.append(stats)

    # Compare serialised, ordered rows so duplicate detection is deterministic.
    serialised = [json.dumps([row.get(col) for col in columns], ensure_ascii=False, sort_keys=False) for row in cleaned]
    duplicate_rows = len(serialised) - len(set(serialised))
    return {
        "source_rows": len(records),
        "processed_rows": len(cleaned),
        "column_count": len(columns),
        "numeric_count": len(numeric_fields),
        "categorical_count": len(categorical_fields),
        "missing_total": missing_total,
        "duplicate_rows": duplicate_rows,
        "columns": columns,
        "numeric_fields": numeric_fields,
        "categorical_fields": categorical_fields,
        "field_stats": field_stats,
        "records": cleaned,
        "preview": cleaned[:8],
    }


def process_upload(filename: str, content: str) -> dict:
    records = parse_records(filename, content)
    result = analyze_records(records)
    result["filename"] = Path(str(filename or "data.csv")).name
    return result


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "RecordLab/1.0"

    def log_message(self, format_string, *args):
        # Keep terminal logs useful without exposing dataset contents.
        sys.stdout.write("[RecordLab] " + (format_string % args) + "\n")

    def _send_bytes(self, status: int, body: bytes, content_type: str):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self._send_bytes(status, body, "application/json; charset=utf-8")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/health":
            self._send_json(200, {"ok": True, "app": "RecordLab", "engine": "Python"})
            return
        filename = STATIC_FILES.get(path)
        if not filename:
            self._send_json(404, {"error": "This page was not found."})
            return
        file_path = ROOT / filename
        try:
            content = file_path.read_bytes()
        except OSError:
            self._send_json(500, {"error": "A project file is missing. Re-extract the ZIP and try again."})
            return
        guessed_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        charset = "; charset=utf-8" if guessed_type.startswith(("text/", "application/javascript")) else ""
        self._send_bytes(200, content, guessed_type + charset)

    def do_POST(self):
        if urlparse(self.path).path != "/api/analyze":
            self._send_json(404, {"error": "This endpoint was not found."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0:
                raise DataProcessingError("No file content was received.")
            if size > MAX_BODY_BYTES:
                raise DataProcessingError("The upload is too large. Please keep the file below 2 MB.")
            raw_body = self.rfile.read(size)
            payload = json.loads(raw_body.decode("utf-8"))
            if not isinstance(payload, dict):
                raise DataProcessingError("Request data must include a filename and content.")
            filename = str(payload.get("filename", "data.csv"))
            content = payload.get("content", "")
            if Path(filename).suffix.lower() not in {".csv", ".json"}:
                raise DataProcessingError("Please upload a .csv or .json file.")
            if not isinstance(content, str):
                content = json.dumps(content, ensure_ascii=False)
                filename = "sample.json"
            self._send_json(200, {"ok": True, "analysis": process_upload(filename, content)})
        except DataProcessingError as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"ok": False, "error": "The request could not be read. Try uploading the file again."})
        except Exception:
            self._send_json(500, {"ok": False, "error": "Something went wrong while processing this dataset. Check the file format and try again."})


def main():
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            if not 1 <= port <= 65535:
                raise ValueError
        except ValueError:
            print("Usage: python app.py [port-number] (port must be between 1 and 65535)")
            raise SystemExit(2)
    server = ThreadingHTTPServer((HOST, port), RequestHandler)
    print("\n  RECORDLAB  /  PYTHON DATA PROCESSING")
    print(f"  Open http://{HOST}:{port} in your browser")
    print("  Press Ctrl+C to stop the server. Local learning/demo use only.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nRecordLab stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
