#! /usr/bin/env python3

'''Run a local cgi server from the current directory that treats *.cgi files
as executable python cgi scripts.'''

import sys, os
try:
    from BaseHTTPServer import HTTPServer
    from CGIHTTPServer import CGIHTTPRequestHandler
    from SocketServer import ThreadingMixIn
except ImportError:
    from http.server import HTTPServer, CGIHTTPRequestHandler
    from socketserver import ThreadingMixIn
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
import json

MAX_RECIPE_BYTES = 10 * 1024 * 1024
BRIDGE_RECIPE_PATH = os.path.join('data', 'codex_recipe_serialized.json')

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class CGIExtHTTPRequestHandler(CGIHTTPRequestHandler):
    '''This request handler mimics the Loyola server, which looks for CGI files
    to end in '.cgi' and be in any directory as opposed to the CGIHTTPServer
    expectation that the cgi script are of the form /cgi-bin/*.py.'''
    
    def is_python(self, path):
        """Test whether argument path is a Python script: allow .cgi"""
        return path.lower().endswith('.cgi')

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/recipe_proxy':
            self.handle_recipe_proxy(parsed)
            return
        if parsed.path == '/recipe_json':
            self.handle_recipe_json_get(parsed)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/recipe_json':
            self.handle_recipe_json_post(parsed)
            return
        self.send_error(404, 'POST endpoint not found')

    def do_OPTIONS(self):
        parsed = urlparse(self.path)
        if parsed.path in ('/recipe_json', '/recipe_proxy'):
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Max-Age', '600')
            self.end_headers()
            return
        self.send_error(404, 'OPTIONS endpoint not found')

    def validated_recipe_payload(self, payload):
        if len(payload) > MAX_RECIPE_BYTES:
            raise ValueError('Recipe JSON is larger than 10 MB')
        text = payload.decode('utf-8')
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            raise ValueError('Recipe JSON must be an object')
        return json.dumps(parsed, indent=2).encode('utf-8')

    def send_json_payload(self, payload, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_recipe_json_get(self, parsed):
        params = parse_qs(parsed.query, keep_blank_values=True)
        recipe_json = params.get('json', params.get('data', ['']))[0]
        if not recipe_json:
            self.send_error(400, 'recipe_json requires a url-encoded json parameter')
            return
        try:
            payload = self.validated_recipe_payload(recipe_json.encode('utf-8'))
        except Exception as err:
            self.send_error(400, 'Invalid recipe JSON: {0}'.format(err))
            return
        self.send_json_payload(payload)

    def handle_recipe_json_post(self, parsed):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.send_error(400, 'Invalid Content-Length')
            return
        if length <= 0:
            self.send_error(400, 'POST body must contain recipe JSON')
            return
        if length > MAX_RECIPE_BYTES:
            self.send_error(413, 'Recipe JSON is larger than 10 MB')
            return

        payload = self.rfile.read(length)
        content_type = self.headers.get('Content-Type', '')
        if 'application/x-www-form-urlencoded' in content_type:
            form = parse_qs(payload.decode('utf-8'), keep_blank_values=True)
            recipe_json = form.get('json', form.get('data', ['']))[0]
            payload = recipe_json.encode('utf-8')

        try:
            recipe_payload = self.validated_recipe_payload(payload)
            os.makedirs(os.path.dirname(BRIDGE_RECIPE_PATH), exist_ok=True)
            with open(BRIDGE_RECIPE_PATH, 'wb') as out:
                out.write(recipe_payload)
        except Exception as err:
            self.send_error(400, 'Invalid recipe JSON: {0}'.format(err))
            return

        response = json.dumps({
            'ok': True,
            'path': BRIDGE_RECIPE_PATH,
            'load_url': '/?recipe=data/codex_recipe_serialized.json&recipe_format=serialized'
        }, indent=2).encode('utf-8')
        self.send_json_payload(response, status=201)

    def handle_recipe_proxy(self, parsed):
        params = parse_qs(parsed.query)
        target = params.get('url', [''])[0]
        parsed_target = urlparse(target)

        if parsed_target.scheme not in ('http', 'https') or not parsed_target.netloc:
            self.send_error(400, 'recipe_proxy requires an absolute http(s) url parameter')
            return

        try:
            request = Request(target, headers={'User-Agent': 'MesoscopeLocalRecipeProxy/1.0'})
            with urlopen(request, timeout=20) as response:
                payload = response.read(MAX_RECIPE_BYTES + 1)
            if len(payload) > MAX_RECIPE_BYTES:
                self.send_error(413, 'Recipe response is larger than 10 MB')
                return
            payload = self.validated_recipe_payload(payload)
        except Exception as err:
            self.send_error(502, 'Unable to fetch a valid JSON recipe: {0}'.format(err))
            return

        self.send_json_payload(payload)

    def is_cgi(self):
        '''As on xenon, go by extension only.'''
        base = self.path
        query = ''
        i = base.find('?')
        if i != -1:
            query = base[i:]
            base = base[:i]
        if not base.lower().endswith('.cgi'):
            return False
        [parentDirs, script] = base.rsplit('/', 1)
        self.cgi_info = (parentDirs, script+query)
        return True
   

def run_server():
    dirName = os.getcwd()
    blanks = dirName.count(' ')
    if 0 < blanks:  # server cannot handle blanks in path names
        print("""The path to this directory contains {blanks} space(s):
{dirName}
Either rename directories to remove the blanks or
move this directory to a place with no blanks in the path.
Aborting the local server run!""".format(**locals()))
        input("Press return after reading this message.")
        return
        
    server_addr = ('localhost', 8080)
    cgiServer = ThreadingHTTPServer(server_addr, CGIExtHTTPRequestHandler)
    sys.stderr.write('Localhost CGI server started\n.')
    cgiServer.serve_forever()

run_server()
