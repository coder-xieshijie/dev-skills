# <Feature>

<What the user gets from this feature, in one paragraph. When there is no spec, name the source files or design doc that define the behavior.>

## Sub-features

- `<map>.<short>` (<SPEC-01>; <API>, <Web>): <one behavior, with its observable outcome>.
- `<map>.<other>` (<path/to/source.ts>; <API>): <one behavior>.

## Entry points (user view)

| Entry | User action | Driver | Interface |
|---|---|---|---|
| <Web> | <click Save on the form> | `verify.mjs up --entry web` | <POST /things> |
| <API> | <POST /things> | `verify.mjs up --entry api` | <POST /things> |

## Drive

<Shared terms and shared steps, with links.>

### <API>

- **<Name>** (`<map>.<short>`). <One sentence: precondition, action, what is read.>
  - `<map>.<short>#1` <observable result; say which request or turn, and the boundary when it matters>.
  - `<map>.<short>#2` <observable result that a wrong implementation would miss>.

### <Web>

- **<Name>** (`<map>.<short>`). <Steps an agent can follow as written when this entry is run by hand; one sentence when scripted.>
  - `<map>.<short>#3` <what the user sees: count, text, banner>.
  - `<map>.<short>#4` (look) <which screen, compared with what, what passes>.

## Gotchas

- <A trap that wastes or voids a run, or a known product problem and the sub-feature it affects.>

## Not covered

- <Behavior or SPEC-ID left out on purpose>: <reason: no driver, visible only to the model, owned by another map, deferred>.
- <Entry where a sub-feature's behavior is also visible but not driven here>: <reason>.
