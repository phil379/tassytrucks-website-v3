# Do not change `vercel.json` to a sub-daily cron while the account is on Hobby

## What happened

Between `90b3489` and `2cb286b`, 19 commits were pushed to `main` and **not one
of them deployed**. The project's deployment list showed nothing — not a failed
build, not a cancelled one. Nothing. `/request` returned 404 in production
because production was still serving `90b3489`, from before the route existed.

The cause was a single line in `vercel.json`:

```json
"schedule": "*/15 * * * *"
```

Hobby allows **one cron invocation per day**. When the schedule asks for more,
Vercel does not fail the build — it refuses to create a deployment at all. The
only evidence is a `Deployment failed.` commit status on GitHub pointing at
<https://vercel.com/docs/cron-jobs/usage-and-pricing>. Nothing in the Vercel
dashboard explains it, which is why it went unnoticed for 19 commits.

## The rule

While the account is on **Hobby**, `vercel.json` may declare at most one cron,
and its schedule must fire **once per day**. `0 14 * * *` (10am ET) is what is
there now.

`vercel.json` also rejects unknown top-level keys — a `"comment"` field fails
schema validation. That is why this note lives here instead of in the file.

## What the daily cron costs us

`/api/cron/escalate-stale-requests` is the speed-to-lead safety net: it pages
the operator once, at 90 minutes, about a trip request nobody has touched. A
daily sweep cannot do that job.

So on Hobby the real escalation runs from **outside Vercel**. The route is an
ordinary `GET` guarded by:

```
Authorization: Bearer $CRON_SECRET
```

Any external scheduler (cron-job.org and similar are free) can call
`https://<site>/api/cron/escalate-stale-requests` every 15 minutes with that
header. The route is idempotent — `escalated_at` is stamped only after the
alert actually sends, so calling it more often never double-pages.

The daily Vercel cron stays as a backstop: if the external scheduler dies, a
stale request is still caught within 24 hours.

## When the account moves to Pro

Set the schedule back to `*/15 * * * *`, delete the external scheduler job, and
this file can go.
