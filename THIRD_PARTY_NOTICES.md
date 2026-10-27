# Third-party notices

## mattpocock/skills

Two files are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) at commit `74ca5fe077456a0b3b2f5310cf9430999fd0b5fd`:

| File in this repository | Adapted from |
|---|---|
| [skills/core-grill/references/adr-format.md](skills/core-grill/references/adr-format.md) | `skills/engineering/domain-modeling/ADR-FORMAT.md` |
| [skills/core-grill/references/context-format.md](skills/core-grill/references/context-format.md) | `skills/engineering/domain-modeling/CONTEXT-FORMAT.md` |

Its license:

```text
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## TrentChou/handdrawn-diagram

[skills/tech-diagram/](skills/tech-diagram/SKILL.md) is adapted from [TrentChou/handdrawn-diagram](https://github.com/TrentChou/handdrawn-diagram) at commit `209ea068d7e0dede7a1660d32bfbc490e3709afe`: the template and helpers in `assets/diagram.html`, the palette, typography and shape references, the agent-team and vertical-search dictionaries, the binding and dictionary templates, and the `coding_agent` and `vertical-search` examples, translated into English and extended. Diagrams load [rough.js](https://github.com/rough-stuff/rough) from jsDelivr, bundled as described below, and, as a CJK fallback, Noto Serif SC (SIL Open Font License 1.1) from Google Fonts, which is not bundled.

Its license:

```text
MIT License

Copyright (c) 2026 TrentChou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## rough-stuff/rough (rough.js)

[skills/tech-diagram/assets/vendor/rough.js](skills/tech-diagram/assets/vendor/rough.js) is an unmodified copy of `bundled/rough.js` from the npm package `roughjs` 4.6.6, as served at `https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js` (SRI `sha384-1NLkwxMO2sOqcq7rQkFBhIAUJtbt8ziLxhVKVgKfFGMEU8pF+GEq5LVogviveup6`). `scripts/render.mjs` serves it in place of that URL.

Its license:

```text
MIT License

Copyright (c) 2019 Preet Shihn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Vendor documents

`skills/agent-prompt-rules/references/sources/` keeps short verbatim excerpts of documents published by Anthropic and OpenAI, each with its official URL, so that the rules that cite them can be checked. Copyright of each document belongs to its publisher; the excerpts are not covered by this repository's license. See [its README](skills/agent-prompt-rules/references/sources/README.md).

## Lauren Tan's pstack

Quotes from [pstack](https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack) in `docs/` are short citations with links to a pinned commit; no pstack files are included.
