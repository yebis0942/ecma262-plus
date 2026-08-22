# ecma262-plus

**UNOFFICIAL** build of the [ECMAScript specification](https://github.com/tc39/ecma262)
with experimental reading aids, published to GitHub Pages. This is not the
standard — see <https://tc39.es/ecma262/> for the living specification.

Extra widgets (from
[yebis0942/ecma262-site-tools](https://github.com/yebis0942/ecma262-site-tools),
a build wrapper around a pinned ecmarkup):

- **Version bar** — a per-section bar graph of how much each edition
  (ES2015…ES2025) changed that section. Click a segment for that edition's
  content, with a blame toggle colouring each block by the edition that
  introduced it; drag across a range for a block-level diff between two
  editions (unified or side-by-side). Blocks, diff stats and blame are
  precomputed at build time.
- **Engine implementation links** — a per-clause `impl` button linking to the
  clause's implementation in V8, JavaScriptCore, SpiderMonkey, and QuickJS
  (quickjs-ng), pinned to each engine's latest release tag.
- **Version compare** — a per-clause `compare` button opening
  [ecma262-compare](https://arai-a.github.io/ecma262-compare/) between two
  chosen editions.
- Search runs on a Web Worker; ToC scroll tracking is optimized (menu.js
  patches applied to the pinned ecmarkup's assets).

## How it builds

`.github/workflows/build-deploy.yml` (daily cron + dispatch + push):

1. Checks out this repo, `yebis0942/ecma262-site-tools` (main), and
   `tc39/ecma262` (`ECMA262_REF` repo variable, default `main` — pin it to a
   sha when upstream breaks the build). ecmarkup is a pinned npm dependency of
   site-tools, so only site-tools gets an `npm ci`; ecma262 needs no install
   because the wrapper reads `spec.html` directly.
2. Generates version-bar data with site-tools'
   `scripts/generate-version-bar-data.ts` (edition downloads cached via
   actions/cache); generation failures degrade to a build without the version
   bar.
3. Runs `ecma262-build <spec.html> out --multipage --copy <ecma262>/img
   [--version-bar <manifest>]`, which injects the widgets with per-page
   relative paths and copies `version-bar-data/` and `impl-links.json` into
   the output itself.
4. Injects the unofficial-build banner + `noindex` (`scripts/postprocess.mjs`),
   writes `robots.txt`, and uploads the Pages artifact.
5. The deploy job runs only when the `DEPLOY_ENABLED` repo variable is
   `'true'`.

## Publishing (once ready)

```sh
gh repo edit yebis0942/ecma262-plus --visibility public --accept-visibility-change-consequences
gh api -X POST repos/yebis0942/ecma262-plus/pages -f build_type=workflow
gh variable set DEPLOY_ENABLED --repo yebis0942/ecma262-plus --body true
gh workflow run build-deploy.yml -R yebis0942/ecma262-plus
```

Site: <https://yebis0942.github.io/ecma262-plus/>

## Notes

- Scheduled workflows are disabled by GitHub after 60 days without repo
  activity; re-enable from the Actions tab if the daily build stops.
- The version-compare widget depends at runtime on
  <https://yebis0942.github.io/ecma262-section-history/releases.json>
  (there is a built-in fallback list if it is unavailable).
- The engine-implementation-links data lives in site-tools
  (`data/impl-links.json`) and is refreshed there by a weekly workflow, so this
  repo needs no update when engines tag a release.
- `robots.txt` and `<meta name="robots" content="noindex">` keep the
  unofficial build out of search engines.
