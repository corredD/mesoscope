# mesoscope@TSRI

## LLM recipe generation

See [SKILLS.md](SKILLS.md) for the Mesoscope LLM recipe skill. It defines the prompt,
CSV schema, serialized JSON schema, validation steps, downloadable artifacts, and
legacy loading workflows.

Start the legacy server:

```bash
python3 localCGIServer.py
```

Use the `Skills` menu in Mesoscope to copy the recipe skill prompt into another
LLM. The copied prompt asks that LLM to generate the recipe files and a direct
`recipe_json` URL.

Load the generated bridge recipe:

```text
http://localhost:8080/?recipe=data/codex_recipe_serialized.json&recipe_format=serialized
```

Load a hosted recipe file by URL:

```text
http://localhost:8080/?recipe_url=https%3A%2F%2Fexample.org%2Frecipe_serialized.json&recipe_format=serialized
```

For file-based server loading, pass a URL only. Do not pass local filesystem
paths or `file://` URLs to the server proxy. Local disk files should be loaded
with the browser file picker, or posted as raw JSON:

```bash
curl -X POST http://localhost:8080/recipe_json \
  -H 'Content-Type: application/json' \
  --data-binary @data/codex_recipe_serialized.json
```

For small recipes, an LLM can provide a one-click URL with the JSON encoded
directly in the query string:

```text
http://localhost:8080/?recipe_json=<encoded-json>&recipe_format=serialized
```
