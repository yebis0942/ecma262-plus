# ecma262-plus

**UNOFFICIAL** build of the [ECMAScript specification](https://github.com/tc39/ecma262)
with experimental reading aids, published to GitHub Pages. This is not the
standard — see <https://tc39.es/ecma262/> for the living specification.

Extra widgets (from the [yebis0942/ecmarkup](https://github.com/yebis0942/ecmarkup)
fork):

- **Engine implementation links** — a per-clause `impl` button linking to the
  clause's implementation in V8, JavaScriptCore, SpiderMonkey, and QuickJS
  (quickjs-ng), pinned to each engine's latest release tag.
- **Version compare** — a per-clause `compare` button opening
  [ecma262-compare](https://arai-a.github.io/ecma262-compare/) between two
  chosen editions.
- **Version bar** — per-section edition segments (ES2015…) showing the
  section's historical content inline.
- Search runs on a Web Worker; ToC scroll tracking is optimized.

## How it builds

`.github/workflows/build-deploy.yml` (daily cron + dispatch + push):

1. Checks out this repo, `yebis0942/ecmarkup` (main), and `tc39/ecma262`
   (`ECMA262_REF` repo variable, default `main` — pin it to a sha when
   upstream breaks the build).
2. Builds ecmarkup, wires it into ecma262 via a local-path `npm install`,
   and runs ecma262's `build-only` (multipage) with `--version-bar` flags.
   Version-bar data comes from `scripts/generate-version-bar-data.ts`
   (edition downloads cached via actions/cache); generation failures degrade
   to a build without the version bar.
3. Copies `impl-links{,-index}.json` and `version-bar-data/` into `out/`,
   injects the unofficial-build banner + `noindex` + widget globals
   (`scripts/postprocess.mjs`), and uploads the Pages artifact.
4. The deploy job runs only when the `DEPLOY_ENABLED` repo variable is
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
  <https://yebis0942.github.io/ecma262-section-history/releases.json>.
- `robots.txt` and `<meta name="robots" content="noindex">` keep the
  unofficial build out of search engines.
