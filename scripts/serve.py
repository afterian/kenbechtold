"""Local preview server for the site.

    python scripts/serve.py [port]        (default 4174)  ->  http://localhost:4174/

Same as `python -m http.server`, plus HTTP Range support. Browsers need ranges to seek
in .mp4 files; GitHub Pages provides them, the built-in Python server does not.
Serves the repository root and listens on this computer only.
"""
import http.server
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4174


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")  # always show the latest edit
        super().end_headers()

    def send_head(self):
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", "").strip())
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path):
            self.range = None
            return super().send_head()
        size = os.path.getsize(path)
        first, last = m.groups()
        if first == "":  # "bytes=-500": the final 500 bytes
            start, end = max(0, size - int(last or 0)), size - 1
        else:
            start, end = int(first), min(int(last), size - 1) if last else size - 1
        if start >= size or start > end:
            self.send_error(416, "Requested Range Not Satisfiable")
            return None
        self.range = (start, end)
        f = open(path, "rb")
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if not getattr(self, "range", None):
            return super().copyfile(source, outputfile)
        start, end = self.range
        source.seek(start)
        left = end - start + 1
        while left > 0:
            chunk = source.read(min(64 * 1024, left))
            if not chunk:
                break
            outputfile.write(chunk)
            left -= len(chunk)

    def log_message(self, *args):  # keep the terminal quiet
        pass


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving {ROOT} at http://localhost:{PORT}/  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
