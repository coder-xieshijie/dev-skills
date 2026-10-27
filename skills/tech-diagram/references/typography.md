# Typography: fonts, punctuation, emoji

Two thirds of a diagram set's visual consistency comes from fonts and punctuation. **No emoji, ever.**

## Style

**Hand-drawn shapes + printed type.** Shapes use rough.js jittered strokes with bowing and a pale solid fill (`fillStyle: 'solid'`); text uses the most ordinary serif print faces (Song for Chinese, Times for Latin). The contrast of "sketched skeleton + body type" is what makes the style recognizable: a professor's whiteboard drawing with proper lecture slides underneath, or a textbook illustration with printed labels.

Not handwriting. Not sans (Heiti). Not Kaiti. Not Comic Sans, not Caveat.

## Emoji

**No emoji anywhere in the diagram**, including but not limited to:

- Node titles and subtitles
- Line labels and arrow notes
- Legends
- Titles, subtitles, footnotes

Replacements:

| Meaning | Use instead |
|---|---|
| ⚠️ Warning / exception | `C.error` brick red (`#a52928`) + hexagon + the text "Error" / "异常" |
| ✅ Done / success | The text "Done" / "完成" + a closing stroke or a speech bubble |
| ❗ Emphasis | Heavier stroke (strokeWidth 3+) + larger type + protagonist color |
| 💡 Tip / note | Small gray annotation on its own line, not inside a node |
| 🔄 Loop / retry | Two-way arrow / looping arc + the text "retry" |
| ⏰ Time / waiting | Dashed timeline + time ticks |

Why: emoji render very differently across platforms and viewers (iOS / Android / desktop / web); they clash with printed type; and they break consistency across a set of diagrams.

## Fonts

Label text follows the language of the document the figure goes into: Chinese, English, or bilingual with the primary language first and larger. The font stacks below cover all three.

### Latin

| Use | First choice | Fallback | Size range |
|---|---|---|---|
| Main title | **Times New Roman** (bold) | Times / Liberation Serif | 36-48px |
| Node title | **Times New Roman** (bold) | Times | 22-32px |
| Node subtitle / label | **Times New Roman** (regular) | Times | 14-19px |
| Small notes | **Times New Roman** (regular) | Times | 13-16px |

Windows and macOS both ship Times New Roman; Linux usually does not and falls back to `Liberation Serif` (metric-compatible with Times) or `serif`. No web font for Latin text.

```css
font-family: 'Times New Roman', Times, 'Liberation Serif', serif;
```

### Chinese (CJK)

| Use | First choice | Fallback | Never |
|---|---|---|---|
| Main title / node title | **STZhongsong** (华文中宋) | Songti SC Bold / SimSun Bold / Noto Serif SC weight 700 | Heiti / Kaiti / running script / handwriting |
| Node subtitle / body | **Songti SC** | STSong / SimSun / 宋体 / Noto Serif SC | Same |
| Small notes | **Songti SC** | STSong / SimSun / Noto Serif SC | Same |

Zhongsong (**STZhongsong** / 华文中宋) is the medium-weight member of the Song family, between Regular and Bold, suited to titles and emphasis. It is a commercial font **preinstalled on neither macOS nor Windows** (it usually comes with Chinese Microsoft Office), so on most machines what you actually get is the next entry in the stack, `Songti SC` (macOS) / `SimSun` (Windows), with `font-weight: 700`. Environments with no Song font at all (most Linux, containers) fall back to the web font Source Han Serif SC (**Noto Serif SC**, SIL OFL, hosted on Google Fonts).

Recommended CSS stacks (order: Zhongsong, Song, Source Han Serif, serif):

```css
/* Titles / node titles — Zhongsong */
font-family: 'STZhongsong', '华文中宋', 'Songti SC', 'SimSun', '宋体', 'Noto Serif SC', serif;
font-weight: 700;

/* Body / subtitles — Song */
font-family: 'Songti SC', 'STSong', 'SimSun', '宋体', 'Noto Serif SC', serif;
font-weight: 400;
```

Web loading (Chinese fallback only; Latin needs no web font):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Why Song + Times, not handwriting or sans

1. **The shapes are already hand-drawn.** rough.js jitter and bowing are noise in themselves; handwritten text on top overloads the eye.
2. **Song + Times are the default faces of Chinese publications, academic papers and serious reports.** Decades of use make them nearly free to read; attention goes to the content, not the font.
3. **Handwriting faces (Caveat / Ma Shan Zheng / Kaishu / running script) have unstable widths and poor legibility.** With dense node labels, 14-16px text blurs. Song / Times are clearly more legible at the same size.
4. **Sans faces (PingFang / Heiti) do not suit rough.js shapes**: they read as industrial UI or app mockups, and a hand-drawn sketch with app UI type looks mismatched.
5. **Print type + hand-drawn shapes = a sketch-notes feel**, like a professor's whiteboard slides, reading-note marginalia or figures in technical documents: steady yet human, and quiet when several diagrams sit side by side.
6. **Times New Roman and Song are close relatives in visual density and stroke contrast**, so mixed Chinese and English text sits together without friction.

### No handwriting or sans fallback

The fallback in Canvas `ctx.font` and CSS `font-family` must be `serif`; **never write `cursive` or `sans-serif`**. Falling to `cursive` renders as the system Kaiti or a handwriting face on macOS / iOS; falling to `sans-serif` gives Heiti. Both break the style.

```js
// BAD — fallback is cursive or sans-serif, drifts across devices
ctx.font = `700 44px 'Times New Roman', cursive`;
ctx.font = `700 44px 'STZhongsong', sans-serif`;

// GOOD — fallback is serif
ctx.font = `700 44px 'Times New Roman', 'STZhongsong', '华文中宋', 'Songti SC', 'SimSun', 'Noto Serif SC', serif`;
```

Same for CSS:

```css
/* BAD */
.ti { font-family: 'Times New Roman', cursive; }
.bd { font-family: 'Songti SC', sans-serif; }

/* GOOD */
.ti { font-family: 'Times New Roman', 'STZhongsong', '华文中宋', 'Songti SC', 'SimSun', 'Noto Serif SC', serif; }
.bd { font-family: 'Times New Roman', 'Songti SC', 'STSong', 'SimSun', 'Noto Serif SC', serif; }
```

Put the **Latin font (Times New Roman) first, then the Chinese fonts**. The browser matches character by character: Latin characters land on Times, Chinese characters skip Times and land on Songti / Zhongsong. In mixed text, English is Times and Chinese is Song, with no manual switching.

### Font discipline

1. **At most 2 font families per diagram**: Zhongsong (titles, node titles) and Song (subtitles, body, notes). Times New Roman comes with the Zhongsong / Song stacks and does not count as a separate family.
2. **Chinese and English within one label split automatically**: Times first, Songti after, matched per character. Do not switch manually with `<span>`.
3. **Bold with `font-weight: 700`** turns Song bold, close to Zhongsong; but name real Zhongsong (`STZhongsong`) first, it is more accurate.
4. **No extra font styles**: no `italic`; browser italic Song is a mechanical slant, ugly and unprofessional.

## Fill and text legibility

The template defaults to `fillStyle: 'solid'` (pale solid fill) on the warm off-white `#fdfdfa`. **Hachure (diagonal-line fill) is off by default and may be overridden only for nodes with no text inside.**

### Contrast threshold

Text in a node must use its role's `stroke` color (the dark shade of the same hue), not a neutral gray or a contrasting color. All 9 colors are tuned to **WCAG 2.1 AA** (≥ 4.5:1); see the contrast table in [`palette.md`](./palette.md).

When adding or customizing a color, you **must** first compute the WCAG contrast of `stroke` against `fill`; below 4.5:1, do not use it. Online tools: [contrast-ratio.com](https://contrast-ratio.com/) / [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/).

Counterexample (saturated [Open Color](https://yeun.github.io/open-color/) values used directly as stroke + fill):

| Role | stroke | fill | Contrast | Result |
|---|---|---|---|---|
| Sub-Agent | `#f08c00` bright orange | `#ffe066` vivid yellow | **1.9:1** | Orange text on yellow, nearly unreadable |
| Agent | `#e8590c` vivid orange | `#ffd8a8` light orange | **2.7:1** | Same hue, different lightness; text floats and blurs |
| User | `#1971c2` electric blue | `#a5d8ff` vivid light blue | **3.3:1** | Below AA, tiring to read |

This palette is ≥ 4.5:1 throughout (mostly 5-7:1), so text holds up.

### Why hachure is off

1. **When a phone or an inline image preview shrinks the figure to 350-400px wide**, hachure lines and 14-18px text blur together; strokes cut through letters and readers have to zoom in.
2. **Song / Times are serif faces** with fine strokes; serifs against dense hachure slashes interfere worse than sans + hachure.
3. **Solid pale fill + rough stroke** = a sticky note in a sketchbook: clean, steady, print-like. It is one of rough.js's built-in fill modes, not a downgrade.

When hachure is allowed:

- **Small legend swatches** with the text beside the swatch, not inside it; here hachure reinforces "this is a color sample"
- **Purely decorative elements**: group backgrounds, textures, fills that carry no key information
- **Emphasizing the protagonist** when it holds no body text (rare; a heavier strokeWidth and larger size usually suffice)

How:

```js
// Default — clean behind the text, stroke is the text color
box(120, 200, 200, 110, C.user);

// Override to hachure (only when the node holds no text)
box(SX, SY, 50, 30, C.subagent, { fillStyle: 'hachure', hachureGap: 6, hachureAngle: -41 });
```

### Background is not pure white

Set the whole background to warm off-white `#fdfdfa` (253/253/250), not `#ffffff`:

- Pure white + muted fills = nodes float on the screen, ungrounded
- Warm off-white matches the color temperature of the warm fills
- Over long reading, warm off-white is easier on the eyes than pure white
- Printed or in an inline image preview, off-white looks more like paper than pure white

Write both `body { background: #fdfdfa; }` and `.stage { background: #fdfdfa; }`, not just body.

## Punctuation

The spacing, separator and bracket rules are for Chinese labels; the numbering, quote, symbol and case rules apply to every label.

### Mixed Chinese and English

- Put a **half-width space** between Chinese and Latin text: `Agent · 编排核心`, not `Agent·编排核心`
- Same between digits and Chinese: `已派出 3 路`, not `已派出3路`

### Chinese sentences

- In subtitles, notes and captions, commas, colons and semicolons are full-width: `覆盖范围：第 1 轮至第 n 轮；之后压缩`. `scripts/render.mjs` warns about a half-width `; : ,` next to Chinese and about full-width brackets (`cjk-punct`)

### Inside node labels

- Separate with `·` (middle dot) or `/` (slash): `Tools · MCP` / `章节 / 版本 1`
- **Never** use `、` `,` `；` as separators in a node
- Node labels are short enough to need no period — add none

### Numbering

- Use circled numbers `① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩`
- Not `1. 2. 3.` or `(1) (2) (3)`
- Circled numbers are compact and stay clear in Song
- Up to ⑳ only: ㉑ and above are missing from Times and Songti and fall back to a sans-serif font. A figure with more than 20 steps is too long for one diagram; split it, or number its phases ① ② ③ and the steps inside each phase 1, 2, 3

### Brackets and quotes

- Brackets are always half-width `( )`; **never** full-width `（ ）`
- Quotes are either curly `“ ”` or straight `" "`; pick one for the whole diagram, do not mix
- Same for single quotes

### Symbols

| Use | Use this | Not this |
|---|---|---|
| Dash | `—` (em dash) | `--` `~` `~~` |
| Ellipsis | `…` | `...` |
| Flow / direction | `→` | `->` `=>` |
| Two-way | `⇄` or `↔` | `<->` `<=>` |
| Range | `—` or `-` (en dash) | Chinese dash `——` |

### Case

- Keep English proper nouns as they are: `LLM` / `MCP` / `IM` / `Agent` / `Sub-Agent`
- No periods in abbreviations: `API`, not `A.P.I.`
- Title Case only for the top-level title; subtitles and labels use sentence case

## Self-check

`scripts/render.mjs` reports emoji and text rendered in a non-serif font; check the rest by eye before handing in a diagram:

- [ ] No emoji
- [ ] Chinese text is all Song / Zhongsong (no Heiti / Kaiti / running script / handwriting / sans-serif fallback)
- [ ] Latin text is all Times New Roman (no Caveat / Patrick Hand / Helvetica / Arial / Comic Sans)
- [ ] ≤ 2 font families (Zhongsong + Song; Latin falls to Times through the stack)
- [ ] Font stack fallback is `serif`, not `cursive` or `sans-serif`
- [ ] Font stack puts Times before the Chinese Song fonts (check both canvas font and CSS)
- [ ] **Fill defaults to solid; no hachure behind text**
- [ ] **Background is warm off-white #fdfdfa, not pure white #ffffff**
- [ ] **Text in a node = node stroke color, ≥ 4.5:1 against its own fill (WCAG AA)**
- [ ] Spaces between Chinese and English
- [ ] No full-width brackets `（）`; full-width `，：；` in Chinese sentences
- [ ] No italics (no `italic` / `font-style: italic`)
- [ ] One quote style across the diagram
- [ ] Numbering uses circled numbers
- [ ] No periods in node labels
- [ ] Dashes are `—`, ellipses are `…`
