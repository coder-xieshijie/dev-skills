# Design judgments: from constraints to evidence

Pick the rows relevant to the behavior at hand. The questions here are a way to locate evidence; a pattern name by itself is not an acceptable conclusion. A question that spans perspectives may land in a single key point.

Read the entries that match the question; trace constraints outside these tables to implementation, dependencies and evidence in the same way. Put the results under the behavior they belong to, and expand only what affects understanding or decisions.

## Top level: what callers can rely on

| Starting point | Questions to ask of this change | Evidence to read | Sound design and its cost |
|---|---|---|---|
| Features are used through external behavior | Who triggers it? Does success mean accepted, persisted or executed? How do rejection, failure and cancellation differ? | User entry points, request/response, caller branches, status display | The contract describes observable results; synchronous completion is intuitive but takes up waiting time, while asynchronous acceptance requires tracking the later state |
| Types cannot express every constraint | What must be satisfied before the call? What is guaranteed on return? Which properties hold across calls? | Validation, state machines, exceptions, test assertions | Preconditions, postconditions and invariants are explicit; an internal contract cannot replace input and authorization checks at an untrusted boundary |
| The value of an abstraction lies in reducing what must be known | Beyond parameters and return values, what order, permissions, exceptions and side effects does this interface imply? Does this facade reduce the steps the caller must coordinate? Which change that will actually happen can this seam confine within the boundary? | Exported signatures, how callers actually use it, wiring points, boundary tests | The abstraction hides a real design decision; a new wrapper layer that still leaks the same details only adds navigation cost |
| Changes spread along dependencies | Which design decision is likely to change? Who is forced to know it? | Exported interfaces, callers, shared types, implicit call order | Information hiding keeps internal replacement local; judging design quality by short methods or many directories does not hold |
| A business decision needs a responsibility you can locate | Who owns the state? Who decides transitions? Does the facade encapsulate the complete use case for the caller? | Authoritative storage, write entry points, decision functions, error ownership | Responsibility for consistency is centralized, so multiple entry points do not each implement it; avoid piling unrelated use cases into a single service |
| External devices and protocols change | If the UI, storage or remote implementation is replaced, which domain judgments need to change? | Adapters, ports, real wiring points, boundary tests | An interface seam is set up for actual change, so it can be replaced and tested; a simple, stable call does not necessarily need an extra interface |
| Old and new versions may coexist | What do changes to fields, error codes, default values or data formats mean for old callers? | Compatibility branches, migrations, consumers, deployment order | Semantics stay compatible, or a migration window is defined; a compatibility layer has maintenance cost, so choose according to the actual release constraints |

Basis: [Design by Contract](https://www.eiffel.org/doc/eiffelstudio/I2E-_Design_by_Contract_and_Assertions), [Parnas on decomposing systems into modules](https://doi.org/10.1145/361598.361623), [Ousterhout on modular design](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=modularDesign), [Cockburn's original article](https://alistair.cockburn.us/hexagonal-architecture). This table turns these sources into actions for reading an MR; that is this Skill's own design.

## Bottom level: which runtime facts the implementation depends on

The six rows are for internal checking. The fourth column gives conditional consequences; whether they hold must be judged against the actual mechanism. There is no need to write out an explanation for each row.

| Starting point (unavoidable fact) | Questions to ask of this change | Evidence to read | Consequence if the dependency does not hold |
|---|---|---|---|
| Resources are limited; an allocation needs an end condition | Who creates and releases memory, connections, tasks, listeners, temporary files and data records? How do they end on an exception/cancellation? | Lifecycle, finally/dispose, cancellation propagation, holder, cleanup or expiry path | Resources are taken and never returned, or data is left behind that no component will ever consume; sending a cancellation request does not mean the resource has been released |
| Data volume and concurrency multiply work | What are the input size n, the concurrency c and the per-item size b? Is there full loading, N+1, unbounded queuing or repeated scanning? | Loops, queries, serialization, indexes, queues, limits, profiles | As scale grows, memory or the number of requests exceeds the budget; batches and caches themselves add consistency costs and extra memory |
| Shared mutable state allows interleaving | After which read would two calls make the same decision? Where does the uniqueness/version check take effect? | Read/write order, unique constraints, conditional updates, lock scope, isolation level | Duplicate creation or mutual overwriting under concurrency; a local lock protects only its own process/scope, and for a transaction the isolation guarantee must also be verified |
| Persistence and external side effects can fail independently | Write then send, or send then write: after a crash at any point, who knows the result? | Commit points, external calls, retries, recovery scans, reconciliation paths | Half-completed facts arise and nobody knows; a transaction in one database covers only that database, and across systems outbox/idempotency/compensation must be evaluated separately, including their backlog and recovery costs |
| Callers and inputs may be untrusted | Where does identity come from? At which actual resource operation is permission checked? Are recovery/background entry points controlled in the same way? | Actor propagation, tenant filtering, authorization checks, execution identity, log fields | Unauthorized reads and writes or cross-tenant leaks; reusing a check result requires proving its invalidation rules, and logs avoid leaking sensitive input |
| System facts need to be observed and recovered | Are execution, persistence, notification and UI display merged into one state? How do you locate a lost step? | Status fields, correlation IDs, events, logs, recovery and rollback procedures | Without other observation channels, a failure may go unnoticed; rolling back code does not automatically undo data already written or external side effects that already happened |

Basis: [Rust ownership as an example](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html), [PostgreSQL isolation semantics (14)](https://www.postgresql.org/docs/14/transaction-iso.html), [Google SRE on cascading failures](https://sre.google/sre-book/addressing-cascading-failures/), [Saltzer and Schroeder's security principles](https://www.mit.edu/~Saltzer/publications/protection/Basic.html). Database and language behavior must be verified against the versions the target project uses.

## Bottom level: triggered dimensions

Check these only when this change touches them; the entries below add specific evidence requirements. Entries that do not apply need not be listed in the deliverable.

| Trigger | Questions | Evidence to read |
|---|---|---|
| Retries, deduplication or idempotency keys appear | What identity does a retry use? How is the same key with a different intent handled? When does deduplication expire? Is the deduplication record atomic with the business change? | Idempotency key scope, payload comparison, record atomicity, TTL, service contract. One local deduplication does not prove end-to-end exactly-once ([AWS idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)) |
| Timeouts, retry counts, connection pools or concurrency limits are changed | How many resources will a slow dependency hold? How many layers perform retries? What happens under overload? | Deadlines, retry budget, backoff, queues, rejection/degradation mechanisms. Failing too early can also reduce availability; thresholds need validation against the workload |
| Timeout calculations, TTLs, timestamp comparison or ordering, or scheduled jobs appear | Is it the wall clock or a monotonic clock? What happens when clocks on several machines are out of sync? How are date boundaries across time zones handled? | Time source, time zone representation, expiry checks, sort keys. The wall clock can be adjusted or even set back, so it cannot be used to derive elapsed time |
| A cache is introduced or changed | Does the scope of the cache key include isolation dimensions such as the tenant? What triggers invalidation? How stale may the data be? Will a miss break through to the downstream? | Key construction, write and invalidation points, TTL, path for loading from the source, protection against concurrent loads from the source |
| Data crosses processes, or protocol fields are changed | How are numeric precision, time zone representation, character sets and truncation, and the difference between null and a missing field handled? What do added or removed fields mean for old consumers? | Encoding/decoding implementation, protocol definitions, compatibility branches, consumers. A mock does not prove the real adapter's serialization behavior |
| Database migrations or an ordered deployment are involved | Does the DDL lock the table, and for how long? How long will the backfill run? During dual writes, which side is read? While old and new versions are live at the same time, do they understand the same record the same way? What happens if the deployment order is reversed? | Migration scripts, backfill jobs, read/write switches, version compatibility branches, release order notes |
| Irreversible side effects appear | Under what conditions do charges, sending messages, deletion and external payments run? Can they be retried after a failure? Can the part that already happened be undone? | Execution points, idempotency protection, confirmation and reconciliation, compensation paths. Rolling back code does not undo external side effects that already happened |

Derive quantities from variables that can be verified. For example, if c copies are held in full, each with n items of b bytes, the data alone is about c×n×b; extra objects, buffers, compression and runtime overhead are counted separately. This is an estimate with stated premises, not a measured peak. Without the input size, configuration or a profile, report the evidence gap; do not invent a "performance improvement percentage".

## Boundaries and degradation

First check whether a failure is allowed to return a substitute result, then read the actual exception branches and callers. Check along "trigger condition → side effects already done → handling and cleanup → user-visible result → recovery responsibility":

- Null, missing and extreme values: whether rejection, truncation and default values match the contract; whether a default value changes shared behavior.
- Timeout, cancellation, retry: which exceptions trigger the fallback, and whether it wrongly swallows permission or validation errors; whether the original operation is still running, and whether the side effects already done can be determined.
- Degraded results: whether the cache may be stale, how partial results are marked, whether they are still filtered by tenant and permission, how it ends when the degraded path fails again.
- Recovery: whether retry limits and stop conditions, cleanup ownership and compensation actually exist; a success return must correspond to the completion state it claims.

Clearly distinguish the behavior the code provides, the guarantees of external dependencies, and proposed approaches. The absence of degradation may be a rejection or failure that the contract requires; do not judge it a defect only because a fallback is missing.

## Fidelity check for the middle-level logic

Walk one path of the real implementation side by side with the pseudocode: does the same input go through the same decisions, produce the same writes and return the same result? Inject a failure between each pair of key side effects, then check whether the abstraction still holds. Without execution, this is static reasoning.

For each "done" at an upper level, keep asking whether at the lower level it means returned, written to disk, answered by the remote side, or visible to the user. Basis: [Dijkstra's stepwise refinement](https://www.cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD249/EWD249.html); this adopts its layered way of understanding, and does not claim that natural-language pseudocode provides a formal proof of correctness.
