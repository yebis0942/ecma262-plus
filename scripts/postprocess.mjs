#!/usr/bin/env node
// Post-processes an ecmarkup --multipage build of tc39/ecma262 for publishing
// as an UNOFFICIAL site:
//   - injects an "unofficial build" warning banner (dismissable, Escape works)
//     with build provenance and impl-links data freshness into every page
//   - adds <meta name="robots" content="noindex">
//
// Widget data URLs are not our business: ecma262-build injects them per page
// with paths relative to that page.
//
// Usage:
//   node scripts/postprocess.mjs <outDir> [--spec-rev sha] [--tools-rev sha]
//     [--ecmarkup-version x.y.z] [--impl-links <impl-links.json>]
//
// Plain string splicing, no DOM library: the multipage build is well over
// 100MB of HTML and every page needs the same two insertions.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
  options: {
    'spec-rev': { type: 'string', default: '' },
    'tools-rev': { type: 'string', default: '' },
    'ecmarkup-version': { type: 'string', default: '' },
    'impl-links': { type: 'string', default: '' },
  },
  allowPositionals: true,
});

const outDir = positionals[0];
if (!outDir) {
  console.error('Usage: postprocess.mjs <outDir> [--spec-rev sha] [--tools-rev sha] …');
  process.exit(2);
}
const specRev = args['spec-rev'];
const toolsRev = args['tools-rev'];
const ecmarkupVersion = args['ecmarkup-version'];
const buildDate = new Date().toISOString().slice(0, 10);

let implLinksMeta = null;
if (args['impl-links']) {
  try {
    implLinksMeta = JSON.parse(readFileSync(args['impl-links'], 'utf8')).meta;
  } catch (err) {
    console.warn(`warning: could not read impl-links meta: ${err.message}`);
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const revLink = (repo, rev) =>
  rev
    ? `<a href="https://github.com/${repo}/commit/${encodeURI(rev)}">${escapeHtml(rev.slice(0, 10))}</a>`
    : '(unknown)';

const freshness = implLinksMeta
  ? `Engine implementation links data: last updated ${escapeHtml(
      String(implLinksMeta.generated).slice(0, 10),
    )} (${Object.entries(implLinksMeta.engines)
      .map(([k, e]) => `${escapeHtml(k)} ${escapeHtml(String(e.tag ?? e))}`)
      .join(', ')}).`
  : '';

// Banner pattern (details.annoying-warning, Escape-dismissable, auto-collapse
// on intra-site navigation) modeled on tc39/ecma262's
// scripts/insert-snapshot-warning.js.
const BANNER_HTML = `
<details class="annoying-warning" open="">
  <summary>Unofficial build</summary>
  <p>
    This is an <strong>UNOFFICIAL</strong> build of the ECMAScript specification,
    with experimental widgets (engine implementation links, version compare,
    version bar). It is not the standard. See
    <a href="https://tc39.es/ecma262/">tc39.es/ecma262</a> for the living
    specification.
  </p>
  <p>
    Built ${buildDate} from tc39/ecma262 ${revLink('tc39/ecma262', specRev)}
    with ${revLink('yebis0942/ecma262-site-tools', toolsRev)}${
      ecmarkupVersion ? ` (ecmarkup ${escapeHtml(ecmarkupVersion)})` : ''
    }.
    ${freshness}
  </p>
</details>
<script>
// make the warning keyboard-dismissable
document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    let warning = document.querySelector('.annoying-warning');
    if (warning.open) {
      warning.open = false;
      e.stopImmediatePropagation();
    }
  }
});
// automatically collapse the warning when navigating within the site
(() => {
  let referrer;
  try {
    referrer = new URL(document.referrer);
  } catch (_err) {
    return;
  }
  if (referrer.host === location.host) {
    document.querySelector('.annoying-warning').open = false;
  }
})();
</script>
`;

const BANNER_CSS = `
details.annoying-warning {
  background-color: #920800;
  background-image: linear-gradient(transparent 40%, rgba(255, 255, 255, 0.2));
  border: 2px solid white;
  color: rgba(255, 255, 255, 0.95);
  opacity: .95;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 10;
}
details.annoying-warning[open] {
  top: 10%;
  top: calc(5vw + 5vh);
  left: 5%;
  right: 5%;
  margin: 0 auto;
  max-width: 800px;
  outline: solid 10000px rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.4);
  border-radius: 3px;
  box-shadow: 0 0 0.5em rgba(0, 0, 0, 0.5);
}
details.annoying-warning > summary {
  display: list-item;
  font-size: 0.875em;
  font-weight: bold;
  letter-spacing: 0.02em;
  padding: 0.5ex 1ex;
  text-align: center;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.85);
  cursor: default;
}
details.annoying-warning[open] > summary::after {
  content: " Collapse";
  position: absolute;
  top: 0;
  right: 5px;
  font-size: smaller;
  font-weight: bold;
}
details.annoying-warning p {
  line-height: 1.4;
  margin: 1em;
  text-shadow: 0px 1px 1px rgba(0, 0, 0, 0.85);
}
details.annoying-warning a {
  color: white;
  text-decoration: underline;
}
`;

const HEAD_INSERT =
  `<meta name="robots" content="noindex">` + `<style>${BANNER_CSS}</style>`;

function processFile(file) {
  let html = readFileSync(file, 'utf8');

  const headMatch = /<head[^>]*>/.exec(html);
  if (headMatch) {
    const at = headMatch.index + headMatch[0].length;
    html = html.slice(0, at) + HEAD_INSERT + html.slice(at);
  } else {
    html = HEAD_INSERT + html;
  }

  const bodyMatch = /<body[^>]*>/.exec(html);
  if (bodyMatch) {
    const at = bodyMatch.index + bodyMatch[0].length;
    html = html.slice(0, at) + BANNER_HTML + html.slice(at);
  } else {
    html += BANNER_HTML;
  }

  writeFileSync(file, html);
}

const files = [join(outDir, 'index.html')];
try {
  for (const f of readdirSync(join(outDir, 'multipage'))) {
    if (f.endsWith('.html')) files.push(join(outDir, 'multipage', f));
  }
} catch {
  // single-page build: no multipage/ directory
}

for (const file of files) processFile(file);
console.log(`postprocessed ${files.length} pages`);
