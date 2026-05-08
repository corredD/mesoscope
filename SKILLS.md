# Mesoscope LLM Recipe Skill

Use this repo-level skill when an LLM or coding agent needs to create, clean up,
convert, or load a Mesoscope/cellPACK-style recipe.

## Purpose

Prepare modeling-ready recipes for Mesoscope from either curated biological
evidence or direct user-specified ingredients. Always produce artifacts that can
be downloaded, inspected, and loaded into Mesoscope.

## Recipe Modes

Use the mode that matches the user request:

- Evidence-backed biological recipe: build a virus, organelle, cell, vesicle,
  compartment, or mesoscale biological entity from structural and literature
  evidence.
- Explicit ingredient recipe: convert a user-provided list of ingredients,
  PDB IDs, copy numbers, compartments, or business assemblies into a loadable
  recipe without adding unsupported biology.
- Cleanup or conversion recipe: normalize an existing CSV, JSON, or narrative
  recipe into Mesoscope-compatible CSV and serialized JSON.

Ask for missing values only when a safe default is not possible. For explicit
ingredient recipes, use the user's copy numbers, compartments, and PDB/BU values
as authoritative.

## Default Files

When working inside this repository, write generated artifacts to:

```text
data/codex_recipe_notes.md
data/codex_recipe.csv
data/codex_recipe_import.csv
data/codex_recipe_serialized.json
```

The serialized JSON is the preferred Mesoscope load format. The long CSV is for
review and provenance. The compact CSV is for quick spreadsheet-style imports.

## Output Contract

Produce these outputs for every complete recipe request:

1. Narrative notes: compartments, assumptions, uncertainty, and references when
   evidence is involved.
2. Evidence/review CSV with this exact header:

```csv
Ingredient name,Compartment or location,Gene segment,UniProt ID,Preferred structure source,Recommended modeling representation,Stoichiometry or oligomeric state,Estimated copy number/density/concentration,Orientation,Spatial distribution,Confidence level,Main uncertainty,Modeling assumption,Key references
```

3. Compact Mesoscope import CSV with this exact header:

```csv
name,label,compartment,surface,pdb,uniprot,count,molarity,bu,selection
```

4. Serialized JSON dictionary following the cellPACK/Mesoscope shape used by
   `data/HIV_serialized.json`.

If the user only asks for a small test recipe, the narrative can be brief, but
the CSV and serialized JSON must still be valid.

When files are written locally, return clickable links to the generated JSON,
CSV, and notes so the user can download or inspect them directly.

## Evidence Rules

For evidence-backed biological recipes:

- Prefer direct taxon, strain, isolate, and structure evidence.
- Label homologous, pan-taxon, or inferred values clearly.
- Treat AlphaFold, homology models, docking, and coarse estimates as
  computational predictions or modeling assumptions.
- Do not invent precise copy numbers, surface densities, spatial distributions,
  or stoichiometries. Use ranges, qualitative values, or `0` with comments when
  evidence is weak.
- Use confidence labels exactly as `high confidence`, `medium confidence`, or
  `low confidence`.
- Cite compact identifiers inline where possible: PDB, EMDB, UniProt, NCBI
  Taxonomy, DOI, PMID, or source database IDs.

For explicit ingredient recipes:

- Do not expand the model beyond the ingredients requested by the user unless
  they ask for biological completion.
- Mark user-provided ingredient counts and PDB IDs as direct user specification.
- Keep uncertainty focused on loader/modeling assumptions, such as radius,
  orientation, or packing distribution.

## Serialized JSON Contract

Use this skeleton for new serialized recipes:

```json
{
  "name": "Recipe name",
  "geom_type": "None",
  "color": null,
  "thickness": 7.5,
  "IngredientGroups": [],
  "Compartments": [
    {
      "name": "root",
      "geom_type": "sphere",
      "radius": 100,
      "color": [0.8, 0.85, 0.9],
      "thickness": 7.5,
      "IngredientGroups": [],
      "Compartments": [
        {
          "name": "surface",
          "geom_type": "None",
          "color": null,
          "thickness": 7.5,
          "IngredientGroups": [
            {
              "name": "proteins",
              "Ingredients": []
            }
          ],
          "Compartments": []
        },
        {
          "name": "interior",
          "geom_type": "None",
          "color": null,
          "thickness": 7.5,
          "IngredientGroups": [
            {
              "name": "proteins",
              "Ingredients": []
            }
          ],
          "Compartments": []
        }
      ]
    }
  ]
}
```

Each ingredient should include these fields unless the active Mesoscope parser
requires a stricter variant:

```json
{
  "ingredient_id": 0,
  "name": "Ingredient",
  "path": "",
  "partners_properties": [],
  "encapsulatingRadius": 40,
  "source": {
    "pdb": "1ABC",
    "transform": { "offset": [0, 0, 0] },
    "bu": "BU1",
    "model": "",
    "selection": ""
  },
  "nbMol": 1,
  "molarity": 0,
  "principalVector": [0, 0, 1],
  "description": "Modeling-ready ingredient note",
  "positions": [],
  "radii_lod": [],
  "meshFile": "",
  "meshType": "None",
  "ingtype": "protein",
  "buildtype": "random",
  "comments": "",
  "color": null,
  "uniprot": "",
  "confidence": 0.6,
  "molecularweight": 0,
  "sprite": {
    "image": "Ingredient.png",
    "offsety": 0,
    "scale2d": 1
  }
}
```

Use `positions: []` unless real packed coordinates are known. Use
`radii_lod: []` unless bead radii are known. Map confidence as:

- `high confidence` -> `1`
- `medium confidence` -> `0.6`
- `low confidence` -> `0.3`

For biological assemblies, put the requested assembly in `source.bu`, for example
`"BU1"`. For asymmetric unit loading, leave `source.bu` empty or use the
project's current convention.

## Validation

Before saying a generated recipe is loadable, validate JSON:

```bash
python3 -m json.tool data/codex_recipe_serialized.json >/dev/null
```

If JavaScript files changed, also run the relevant syntax checks or tests:

```bash
node --check js/main.js
node --check js/layout_mg.js
python3 -m py_compile localCGIServer.py
```

For manual inspection, compare hierarchy and ingredient fields to
`data/HIV_serialized.json`.

## Mesoscope Loading

### Local Legacy Server

Start the legacy server:

```bash
python3 localCGIServer.py
```

Open:

```text
http://localhost:8080/
```

The menu item `Load -> New Recipe -> From LLM/Codex Recipe` loads:

```text
data/codex_recipe_serialized.json
```

The equivalent deep link is:

```text
http://localhost:8080/?recipe=data/codex_recipe_serialized.json&recipe_format=serialized
```

### File Loading Rule

When passing a recipe file to the server, use only an absolute `http://` or
`https://` URL. Do not pass local filesystem paths and do not pass `file://`
URLs. Local files should be loaded through the browser file picker or posted as
raw JSON.

Hosted recipe deep link:

```text
http://localhost:8080/?recipe_url=https%3A%2F%2Fexample.org%2Frecipe_serialized.json&recipe_format=serialized
```

The local server fetches remote files through:

```text
http://localhost:8080/recipe_proxy?url=https%3A%2F%2Fexample.org%2Frecipe_serialized.json
```

`/recipe_proxy` accepts only absolute HTTP(S) URLs and validates that the fetched
payload is a JSON object.

### Direct JSON String Loading

For small recipes, the LLM can provide a single Mesoscope URL containing an
encoded JSON string:

```text
http://localhost:8080/?recipe_json=<encodeURIComponent(JSON.stringify(recipe))>&recipe_format=serialized
```

This does not use a file URL. The page decodes the JSON and loads it directly.
Keep this for small recipes because browsers and chat clients may truncate long
URLs.

For larger recipes, post the JSON string to the local server:

```bash
curl -X POST http://localhost:8080/recipe_json \
  -H 'Content-Type: application/json' \
  --data-binary @data/codex_recipe_serialized.json
```

The server validates the JSON object, writes the bridge file, and returns a
`load_url` such as:

```text
/?recipe=data/codex_recipe_serialized.json&recipe_format=serialized
```

Form-encoded posts are also accepted with a `json=` or `data=` field.

## Prompt Template

Use this prompt for evidence-backed biological recipes. Adapt it for explicit
ingredient recipes by replacing the evidence-gathering sections with the user's
provided ingredient list.

```text
You are an expert in integrative structural biology, cell biology, virology, and
mesoscale modeling using Mesoscope, cellPACK, CellPACKgpu, Mesoscale Explorer,
Mol*, Blender, and Unity.

Prepare a modeling-ready recipe for <ENTITY_NAME>, taxon ID <TAXON_ID>. Use
direct evidence first. If direct evidence is missing, use the closest defensible
homologs or pan-taxon data and label the inference.

For every compartment and ingredient, separate experimentally supported
information, homologous/inferred information, computational predictions,
modeling assumptions, and uncertainty. Use confidence labels exactly as high
confidence, medium confidence, or low confidence.

Return:
1. A concise narrative recipe with architecture, surface components, internal
   components, polymers/fibers/genomic material, and practical modeling notes.
2. The evidence/review CSV using the exact Mesoscope header.
3. The compact import CSV using the exact Mesoscope import header.
4. A valid serialized JSON object compatible with Mesoscope/cellPACK-style
   loading. Use empty positions arrays unless known coordinates are available.

If running inside the Mesoscope repository, write the artifacts to:
data/codex_recipe_notes.md
data/codex_recipe.csv
data/codex_recipe_import.csv
data/codex_recipe_serialized.json
```
