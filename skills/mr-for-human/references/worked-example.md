# Worked examples

Read Example 1 for a failure window, or Example 2 for a short degradation guide, as needed. Both are synthetic; file names and line numbers refer to their own code blocks, counted from 1. A real deliverable must use links to the real source at a pinned snapshot instead. The guide under each example shows how to write; the code blocks are the input material.

## Example 1: new deduplication changes retry behavior after a failure

Teaching requirement: ACCEPTED means that a recoverable responsibility for execution has been established; serial retries with the same tenant and the same request_id return the original job, and tenants are isolated from each other.

Dependency assumptions: actor comes from a trusted authentication entry point; store's get/insert succeed in this model, and records persist between the example calls; publish may throw before enqueuing. The model has no background recovery scan. The store's internal indexes, uniqueness, cleanup, logging and real persistence semantics are not given.

### Input: submit.py, modified

Before:

```python
def submit(store, broker, actor, request):
    if not actor["can_submit"]:
        raise PermissionError("FORBIDDEN")
    job = store.insert(
        actor["tenant_id"], request["request_id"], request["payload"]
    )
    broker.publish(job["id"])
    return {"status": "ACCEPTED", "job_id": job["id"]}
```

After:

```python
def submit(store, broker, actor, request):
    if not actor["can_submit"]:
        raise PermissionError("FORBIDDEN")
    existing = store.get(actor["tenant_id"], request["request_id"])
    if existing is not None:
        return {"status": "ACCEPTED", "job_id": existing["id"]}
    job = store.insert(
        actor["tenant_id"], request["request_id"], request["payload"]
    )
    broker.publish(job["id"])
    return {"status": "ACCEPTED", "job_id": job["id"]}
```

### Guide: Conclusions first

**The new early return treats "a record exists" as a sufficient condition for "accepted for execution". After the first publish fails, a retry reports success but never publishes again, which violates the teaching requirement.** Evidence: After, lines 4–6 and 7–11. A fix should restore the execution responsibility; if relaxing the ACCEPTED contract is considered, the user needs to decide on that business change.

Another key decision is to deduplicate by the trusted actor's tenant while keeping the authorization check before reads and writes (lines 2–4), so that retries are isolated within the same tenant.

### What exactly changed, by directory

| Directory / file and status | Specific change | Relation to the goal |
|---|---|---|
| root / submit.py, modified | Adds lines 4–6: returns early when a record with the same tenant and key exists | Within the goal: implements serial deduplication; also changes retry behavior after a failed publish |

This model provides only this file's complete before/after, and no extra change is seen; the permission check, insert and publish are unchanged context.

### Main flow, boundaries and failure

Normal path: authorize → deduplicate within the tenant → on a hit, return the old job; on a miss, insert → publish → return. submit encapsulates the internal call order; callers still need to pass in store and broker.

The core pseudocode keeps the failure window (After, lines 4–11):

```text
existing = store.get(actor.tenant_id, request.request_id)
if existing exists:
    return ACCEPTED(existing.id)
job = store.insert(actor.tenant_id, request.request_id, request.payload)
broker.publish(job.id)  // may throw before enqueuing; in the example the record remains
return ACCEPTED(job.id)
```

| Boundary / failure condition | What is already done | Actual handling and visible result |
|---|---|---|
| No permission | No business reads or writes yet | Throws FORBIDDEN (lines 2–3) |
| After the insert, publish fails before enqueuing | A record exists, no message | The first call throws to the caller; no degradation or compensation within this function (lines 7–11) |
| Retry with the same key after the failure | The old record is still there | Line 6 returns ACCEPTED and does not publish again; the model has no recovery scan, so no execution responsibility has been established |

The original version already had the write-then-publish failure window, but a retry would create and publish again; the new deduplication changes what a retry leads to. A real system should be checked for existing recovery capabilities; if you propose publishing again on a hit, first confirm the boundaries of duplicate delivery and consumer idempotency.

### Reading route and verification boundaries

From After line 4, follow the deduplication key to the early return on line 6, then check whether the publish on line 10 runs. Observing the first exception, the retry response, the store records and the broker messages tells "recorded" apart from "delivered".

It can be verified statically that the number of calls from the entry point is bounded; the internal cost, uniqueness and cleanup policy of get/insert/publish are unknown, so you cannot conclude that the total work is constant or that records never expire. The first error is observable by the caller; other alerting channels are unknown. Concurrent uniqueness and the contract for the same key with a different payload need to be checked separately.

## Example 2: returning a clearly marked fallback result after a read timeout

Confirmed teaching requirement: when a catalog read times out, it may return fallback data for the same tenant, with a notice that the result is degraded; other errors, such as permission errors, are still thrown upward. A failed fallback read also propagates its error. In this model remote/fallback are both read-only dependencies that isolate data by the tenant_id passed in; the upstream identity is trusted. A real implementation needs these dependency guarantees verified separately.

### Input: complete before/after of two files

catalog.py Before:

```python
def load_catalog(remote, fallback, tenant_id):
    return {"items": remote.fetch(tenant_id), "source": "live"}
```

catalog.py After:

```python
def load_catalog(remote, fallback, tenant_id):
    try:
        return {"items": remote.fetch(tenant_id), "source": "live"}
    except TimeoutError:
        return {"items": fallback.get(tenant_id), "source": "fallback"}
```

page.py Before:

```python
def render(result):
    return {"items": result["items"], "notice": ""}
```

page.py After:

```python
def render(result):
    notice = "Fallback data" if result["source"] == "fallback" else ""
    return {"items": result["items"], "notice": notice}
```

### Guide: Conclusions first

**A timeout can now return a marked fallback result, and both the read side and the display side implement the confirmed degradation contract. Nothing currently needs the user's decision.** The key decision is to catch only TimeoutError: other errors are still thrown, so that a permission failure is not disguised as a usable result. Evidence: catalog.py After lines 2–5, page.py After lines 2–3.

### What exactly changed, by directory

| Directory / file and status | Specific change | Relation to the goal |
|---|---|---|
| root / catalog.py, modified | After a timeout, reads fallback data with the same tenant_id and sets source to fallback | Within the goal: provides the agreed degradation |
| root / page.py, modified | Shows "Fallback data" based on source | Necessary supporting change: makes the degraded state in the call result visible to the user |

Both files' changes relate to the goal; no extra change is seen in the complete diff given.

### Main flow, boundaries and failure degradation

A normal read shows remote data; after a timeout it shows the fallback data with a notice. There are no write side effects; how current the fallback data is depends on fallback, and the code promises no freshness. Permission errors and fallback read failures both propagate to the caller; this example provides no outer error display. The degradation ends with this response, and later calls still try the remote first; there is no background recovery task.

### Reading route and verification boundaries

First look at the exception type and the tenant_id passing in catalog.py, then at the source branch in page.py. The logic is short, so linking these two places directly is enough. The example can verify the control flow and the displayed field; real data isolation, the update policy of the fallback data, whether the original request keeps running after a timeout, and the outer error display need to be verified against the actual dependencies.

---

For the checks that were run and their limits, see the [validation record](../../../docs/mr-for-human-validation.md). The example results do not prove anything about a production database, real network timeouts, or the effect on readers.
