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

All the settings are in `config.js`: the number of items (8), the number of digits (3), and a version label that's saved with each response.

Numbers are random, with no leading zero, and no two numbers in a set share two digits in the same places (1st+2nd, 2nd+3rd, or 1st+3rd). That way every partial answer can match only one number.

## What each response row contains

Positions count in the order numbers were shown (1 = first seen, 8 = last seen). `back_N` converts a position to "how many back from the end" (1 = most recent).

| Column | Meaning |
|---|---|
| `participant_id` | Random 6-character code |
| `test_run` | `yes` if the link had `?test=1` |
| `version` | Settings version (`v3` = 8 numbers, any-order recall, no follow-up question) |
| `shown_N` | The number shown at position N |
| `immediate_N`, `immediate_correct_N` | What they typed right after seeing it, and whether it was exact (1/0) |
| `view_ms_N`, `type_ms_N` | How long they looked at it, and how long they took to type it |
| `answer_K` | The Kth row they filled in on the recall screen, in their order. `_` is a blank digit, e.g. `_48` |
| `answer_K_matches_position` | Which shown position that answer matches (2+ digits right and in place), or blank |
| `answers_entered` | How many recall rows they filled in |
| `back_N` | Positions back from the end (8 − N + 1) |
| `recall_digits_in_place_N` | Best number of digits recalled in the right place for position N (0, 2, or 3; 1 digit counts as 0) |
| `recall_exact_N` | 1 if the number was recalled exactly |
| `recall_partial_or_exact_N` | 1 if at least 2 digits were recalled in the right place |
| `recall_ms` | Time spent on the recall screen |

The raw answers are always saved, so you can re-score them if you change your scoring rule.
