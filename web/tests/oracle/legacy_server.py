"""Serve the legacy app (localCGIServer.py) on another port, without editing it.

    python3 web/tests/oracle/legacy_server.py 8091

localCGIServer.py hardcodes ('localhost', 8080) and starts serving at import, so this runs its
source with the address replaced, from the repo root (the directory it serves).
"""
import os
import pathlib
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8091
root = pathlib.Path(__file__).resolve().parents[3]
os.chdir(root)
path = root / "localCGIServer.py"
source = path.read_text()
needle = "('localhost', 8080)"
assert needle in source, "localCGIServer.py no longer binds ('localhost', 8080); update this wrapper"
source = source.replace(needle, "('localhost', %d)" % port)
exec(compile(source, str(path), "exec"), {"__name__": "__main__", "__file__": str(path)})
