# Long-conversation assistant · context compaction: figures and concept color binding

The fictional design document behind this set is the worked example in [references/figure-plan.md](../../references/figure-plan.md#example-context-compaction-for-a-long-conversation-assistant). Only figure 1 is drawn here; the other rows show what the plan asks of the rest of the set.

## Figures

| # | File | Question it answers | Kind | Sections | Parts and paths covered (normal / abnormal) | Not drawn → where |
|---|---|---|---|---|---|---|
| 1 | `01-overview` | How does one endless conversation stay fast and keep what matters? (the one-sentence conclusion) | Overview: protagonist and loops | §1, §3–§5 | Parts: context window = system prompt · memory segments · ledger view · recent turns · current turn. Normal: loop A one turn, loop B compaction, loop C ledger. Abnormal: none drawn | Hard line → 3; failed or outdated job → 4 |
| 2 | `02-turn` | What happens in one turn, and what does the model see? (Q1) | Sequence | §3 | Parts: turn = user message · assembled context · model call · tool calls and results · reply. Normal: message to reply. Abnormal: model call fails → error reply, turn kept (§3.3) | — |
| 3 | `03-turn-start` | What runs at the start of every turn, and in what order? (Q2, Q3) | Decision procedure with a budget bar | §4.1, §4.3, §4.4 | Parts: window budget = the five layers against the soft and hard lines. Normal: commit a ready result, then check the lines; soft line → start a job. Abnormal: hard line with no ready result → compact inline while the user waits | Idle, return-to-page and new-conversation triggers → table §4.1 |
| 4 | `04-background-job` | How does a compaction job run and hand its result back? (Q2) | Sequence with `alt` | §4.2, §4.4 | Normal: job reads older turns → summary segment and ledger diff → ready result. Abnormal: job fails → retried at the next trigger; turns it covered changed → result discarded | — |
| 5 | `05-ledger` | Where does open work live across compactions? | Lifecycle | §5 | Normal: entry opened in a turn → written at the commit point → closed. Abnormal: two entries for one task → the newer wins (§5.2) | — |

Not drawn as figures: budget numbers (§6) and alternatives considered (§7) stay tables.

## Concept → color → shape

| Concept category | Components | Color slot | Shape |
|---|---|---|---|
| User | User | `C.user` steel blue | Box |
| Assistant front (protagonist) | Assistant front · its five context layers | `C.agent` brick orange | Box; the front's box is ivory-filled with `strokeWidth: 3` so the layers inside it read |
| Model | Model | `C.llm` indigo | Box |
| Background work | Compaction job | `C.subagent` caramel | Box |
| Stores | Ready results · Ledger · Turn log | `C.memory` chestnut | Box |
| Failure and degraded paths | Inline compaction · discarded result | `C.error` brick red | Red dashed arrow, hexagon |

## Rulings on ambiguous concepts

- Context layers → Assistant front (`C.agent`), not stores. Reason: they are what the front holds during a turn; the stores under them are where their content lives between turns.

## Colors used per diagram

| Diagram | user | agent | llm | subagent | memory | error |
|---|---|---|---|---|---|---|
| ① Overview `01-overview` | ● | ● | ● | ● | ● | |
