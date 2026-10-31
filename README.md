# Recall study website

Participant link: **https://alextremmel.github.io/recall-study/**

- Add `?test=1` to the link for practice runs. They still go to the Sheet, but with `test_run = yes`, so you can filter them out.
- Add `?export=1` to download a CSV of every response saved in that browser. Each finished session is also kept on the device as a backup, which helps for in-person sessions on your own laptop.

## Connecting the Google Sheet (one time, about 5 minutes)

1. Create a new Google Sheet, for example "Recall study responses".
2. In the Sheet, open **Extensions > Apps Script**.
3. Delete what's in the editor, paste the whole contents of `apps-script/Code.gs`, and click the save icon.
4. Click **Deploy > New deployment**. Click the gear next to "Select type" and pick **Web app**.
5. Set **Execute as** to *Me*, and set **Who has access** to *Anyone*. Click **Deploy**.
6. Google will ask you to authorize. Pick your account, then click **Advanced > Go to (project name) (unsafe)** and **Allow**. The warning appears because you wrote the script yourself and Google hasn't reviewed it.
7. Copy the **Web app URL** (it ends in `/exec`) and send it to Claude. It goes in `config.js`.

The first response creates a "Responses" tab with headers automatically.

If you ever change the script, use **Deploy > Manage deployments > edit (pencil) > Version: New version** so the URL stays the same.

## Settings

All the settings are in `config.js`: the number of items (10), the number of digits (3), and a version label that's saved with each response.

## What each response row contains

Positions count in the order numbers were shown (1 = first seen, 10 = last seen). `back_N` converts a position to "how many back from the end" (1 = most recent).

| Column | Meaning |
|---|---|
| `participant_id` | Random 6-character code |
| `test_run` | `yes` if the link had `?test=1` |
| `shown_N` | The number shown at position N |
| `immediate_N`, `immediate_correct_N` | What they typed right after seeing it, and whether it was exact (1/0) |
| `view_ms_N`, `type_ms_N` | How long they looked at it, and how long they took to type it |
| `recall_N` | What they typed in the surprise recall box for position N |
| `recall_exact_N` | 1 if that answer matches exactly |
| `recall_digits_N` | Share of digits that are correct and in the right place (0, 0.333, 0.667, 1) |
| `recall_unplaced` | Numbers they remembered but couldn't place |
| `unplaced_match_N` | 1 if one of the unplaced numbers exactly matches the number at position N |
| `back_N` | Positions back from the end (10 − N + 1) |
| `recall_ms` | Time spent on the recall screen |
| `suspected_test`, `pilot_experience` | Answers to the two follow-up questions |

The scoring columns are there for convenience. The raw answers are always saved too, so you can score them however your method describes.
