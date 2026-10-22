# Term protection and quality checks

## Glossary

- Each user keeps rules per target language:
  - **Keep as-is** for brands, models and SKUs (case-sensitive).
  - **Preferred translation** for product terms.
- Rules are isolated per account and can be exported as CSV.
- Aidge needs the glossary imported in its console. An admin then binds the resulting Glossary ID to the user and language (`/api/admin/glossary`).
- Each binding is keyed by a fingerprint of the rule set, so any rule change invalidates it until the glossary is re-synced. In normal mode, users can't submit jobs while their rules are unsynced.
- Each job stores a snapshot of the rules it ran with (`job_specs`).

## Automatic checks (`lib/outsea/checks.ts`)

Image jobs call the provider with `UseImageEditor=true`, and the source and target text layers are read from the response. When layers are present, the checker compares:

- **Brands and models**: case and word boundaries, plus preferred translations.
- **Numbers**: count and repetitions, decimals, thousands separators, negatives and ranges.
- **Units and dimensions**: Chinese/English unit aliases, 2D/3D sizes, and area/volume units. A unit conversion is flagged for human review, never treated as equivalent.

"No differences found" only means the extracted text didn't break any rule. It doesn't mean the image is correct: layout, legibility, swapped digits and grammar still need a human. If the provider returns no text layers, the check shows "pending review" instead of guessing.

## Issues, revisions and acceptance

1. A user reports an issue on a result, with a category and a region marked on the image.
2. An admin replies and can upload a reworked image (JPG/PNG/WebP, up to 10 MB), logging the minutes spent. The issue then waits for the customer.
3. Only the user who owns the job can accept or reject the revision. Admins can't accept on the user's behalf, and an older version can't be accepted while a newer one is pending.
4. The latest accepted revision becomes the default for preview, download and ZIP. Add `?original=1` to see the provider's original output.

## Cost accounting

The admin economics view shows, per job:

- **Revenue**: paid credits consumed × the price of the purchase lot they came from.
- **Recorded costs**: API estimates or actuals matched by call ID, labor minutes × hourly rate, and other cost entries.

If any input is unknown, the job's contribution is shown as *incomplete* instead of treating the missing value as zero.
