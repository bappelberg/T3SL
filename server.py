#!/usr/bin/env python3
import json
import os
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import urlparse

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
}

TECHNICIANS = ["Tekniker 1", "Tekniker 2", "Tekniker 3"]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS technicians (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                technician_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                seconds INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (technician_id) REFERENCES technicians (id)
            );
        """)
        for name in TECHNICIANS:
            conn.execute("INSERT OR IGNORE INTO technicians (name) VALUES (?)", (name,))
        conn.commit()

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "https://t3sl.vercel.app")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status, message):
        self.send_json({"error": message}, status)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/technicians":
            with get_db() as conn:
                rows = conn.execute("SELECT id, name FROM technicians ORDER BY id").fetchall()
            self.send_json([{"id": r["id"], "name": r["name"]} for r in rows])
            return

        if path == "/api/entries":
            with get_db() as conn:
                rows = conn.execute("""
                    SELECT e.id, t.name AS technician, e.category, e.seconds, e.timestamp
                    FROM entries e
                    JOIN technicians t ON t.id = e.technician_id
                    ORDER BY e.id DESC
                """).fetchall()
            self.send_json([dict(r) for r in rows])
            return

        if path == "/api/entries/csv":
            with get_db() as conn:
                rows = conn.execute("""
                    SELECT t.name AS tekniker, e.category AS kategori,
                           e.seconds AS sekunder, e.timestamp AS tidpunkt
                    FROM entries e
                    JOIN technicians t ON t.id = e.technician_id
                    ORDER BY e.id DESC
                """).fetchall()
            lines = ["Tekniker,Kategori,Sekunder,Tidpunkt"]
            for r in rows:
                lines.append(f"{r['tekniker']},{r['kategori']},{r['sekunder']},{r['tidpunkt']}")
            body = "\n".join(lines).encode("utf-8-sig")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", "attachment; filename=t30sl.csv")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/":
            path = "/index.html"

        file_path = os.path.realpath(os.path.join(PUBLIC_DIR, path.lstrip("/")))
        if not file_path.startswith(os.path.realpath(PUBLIC_DIR)):
            self.send_error_json(403, "Forbidden")
            return

        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1]
            content_type = CONTENT_TYPES.get(ext, "application/octet-stream")
            with open(file_path, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error_json(404, "Not found")

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/entries":
            length = int(self.headers.get("Content-Length", 0))
            try:
                data = json.loads(self.rfile.read(length))
            except json.JSONDecodeError:
                self.send_error_json(400, "Invalid JSON")
                return

            technician_id = data.get("technician_id")
            category      = data.get("category")
            seconds       = data.get("seconds")

            if (
                not isinstance(technician_id, int)
                or not isinstance(category, str)
                or not isinstance(seconds, int)
                or isinstance(seconds, bool)
                or seconds < 0
            ):
                self.send_error_json(400, "Missing or invalid fields")
                return

            timestamp = datetime.now(timezone.utc).isoformat()
            with get_db() as conn:
                cursor = conn.execute(
                    "INSERT INTO entries (technician_id, category, seconds, timestamp) VALUES (?, ?, ?, ?)",
                    (technician_id, category, seconds, timestamp),
                )
                conn.commit()

            self.send_json({"id": cursor.lastrowid}, 201)
            return

        self.send_error_json(404, "Not found")

if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("", 3521), Handler)
    print("T30SL körs på http://localhost:3521")
    server.serve_forever()