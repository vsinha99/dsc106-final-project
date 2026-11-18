# Where AI Chips Go

**Where do AI chips go, and how much can trade records tell us?**

UC San Diego DSC 106 final project, Initial Prototype milestone, November 18, 2026.

Valmik Nahata, Varun Sinha, Rishab Kolan, Rishil Chintalapati.

- [Website](https://vsinha99.github.io/dsc106-final-project/)
- [Repository](https://github.com/vsinha99/dsc106-final-project)
- [Official assignment](https://dsc106.com/projects/final_project/)

## Run locally

From the repository root, run `python3 -m http.server 8790 --bind 127.0.0.1` and open <http://127.0.0.1:8790/>. There is no build step or package installation. D3 7.9.0 is bundled locally with its ISC license so a CDN outage cannot break the charts. Serve through HTTP rather than opening `index.html` as a file.

GitHub Pages publishes `main` from `/` (the repository root). All application and asset URLs are relative, including the CSV. `.nojekyll` keeps deployment static. `index.html`, `app.js`, `data.js`, and `style.css` live at the top level, as the assignment requires.

## What the prototype implements

- An editorial article that follows the proposal's customs-records → geographic estimates → uncertain rankings progression.
- A keyed D3 horizontal ranking with all 18 quarters, chip-unit / H100e switching, quarterly / cumulative windows, animated reordering, exact-value/share tooltips, and destination selection.
- A connected non-U.S. dot-and-range chart using the same quarter, metric, and time window.
- A global quarterly time series whose points change the selected quarter; its metric follows the metric control, while its time window stays explicitly quarterly.
- Keyboard-selectable marks, visible focus, reduced-motion support, native labeled controls, a readable data table, accessible error reporting, and responsive layouts.
- The visible **Prototype Progress and Challenges** section answers both required questions in five complete sentences each.

The six proposal figures guide the narrative. This milestone does not reproduce all six as separate graphics. The raw Taiwan–U.S. customs comparison remains contextual text; expanding that part of the explanation is future work.

## Files

- `index.html`: article, controls, sources, and required progress writeup.
- `app.js`: D3 rendering, transitions, shared interaction state, tooltips and coordinated updates.
- `data.js`: pure CSV conversion, ranking, total and share functions.
- `style.css`: typography, layout, accessible controls and responsive chart treatment.
- `data/ai_chip_trade_by_country.csv`: unchanged publisher snapshot.
- `data/source.json`: provenance, SHA-256 checksum, schema size and independent decimal validation totals.
- `tests/data.test.js`: automated numerical and data-integrity checks.
- `tests/browser.test.mjs`: real browser interaction and responsive checks.
- `assets/d3.v7.min.js`, `assets/D3-LICENSE`: vendored D3 and license.
- `PROTOTYPE_AUDIT.md`: rubric, verification evidence, limitations and next steps.

## Data and calculations

Source: [Epoch AI, Data on AI chip imports](https://epoch.ai/data/ai-chip-imports), November 12, 2026 release, downloaded November 18, 2026. [Direct publisher CSV](https://epoch.ai/data/ai_chip_trade/ai_chip_trade_by_country.csv). [Methodology](https://epoch.ai/data/ai-chip-imports-documentation/methodology). Epoch AI data is credited under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The unchanged CSV has **3,960 rows and 32 columns**, with one row per destination-quarter, **220 labels**, and **18 quarters (2022 Q1–2026 Q2)**. The displayed fields are:

| Window | Chip units | Computing power |
| --- | --- | --- |
| Quarterly | `Quarterly number of units` | `Quarterly compute capacity (H100e)` |
| Cumulative | `Cumulative number of units` | `Cumulative compute capacity (H100e)` |

Each field has a corresponding ` (low)` and ` (high)` column. We read those bounds directly rather than derive or invent ranges. We do not add bounds across destinations or quarters, infer a joint distribution, or call the ranges conventional confidence intervals. The methodology separately distinguishes conditional model intervals and structural alternatives; the simple export labels do not justify imposing a confidence interpretation.

Totals sum the selected central estimate once per destination in the selected quarter. Shares divide each destination's estimate by that total, including **Unspecified**. Unspecified is excluded from named-destination rankings but its value is disclosed below the chart. The EU is represented as one bloc and its members are absent as separate rows, so they are not double-counted. No world-total row or additional regional totals are added. Blank fields remain `null`; explicit zeros remain zero. The chart omits missing central estimates and omits range lines with missing endpoints. Fractional chip units are retained as estimates.

The cumulative view reads the publisher's cumulative fields at the cutoff; it does not sum them over time. Across all destinations and both metrics, quarterly central-estimate sums reconcile to cumulative central estimates within the CSV's one-decimal rounding. Source rounding is not mistaken for data corruption.

Independent decimal sums for **2026 Q2** are **5,429,241.2 H100e** and **2,753,026.9 chip units**, including 45.9 H100e and 18.4 chip units with unspecified destination. U.S. shares round to **77.5% H100e** and **73.3% units**, reproducing the proposal. The initial-quarter U.S. compute share rounds to **55.3%**. In the latest cumulative view, Japan ranks fourth in chip units but sixth in computing power, while Malaysia ranks fifth in units but fourth in compute.

Some current methodology summary-table values differ slightly from this CSV. The visualizations deliberately use the pinned CSV, which reproduces the proposal figures, rather than substitute those table values.

These are trade-derived estimates of arrivals, not direct observations of installed or operational computing power. Cumulative arrivals do not subtract retirement or later relocation. The assumed destination model mix and uncovered reporting or routing errors limit interpretation.

## Tests

Run `npm test` with Node.js (no dependencies to install). Six tests cover all 72 combinations of quarter, metric, and time window, exact field/bound mapping, cumulative reconciliation, proposal figures, unique records, denominators, missing data, and a substantive rank change.

For browser checks, run the local server and launch Chrome with `--remote-debugging-port=9333` using a temporary profile. Then run `node tests/browser.test.mjs`. The test driver uses Node's native WebSocket support, so Node 22 or later is appropriate. To verify publication, run `BASE_URL=https://vsinha99.github.io/dsc106-final-project/ node tests/browser.test.mjs`.

## Next milestones

Use staff feedback and reader testing to refine the customs-to-estimates explanation, test whether metric/range annotations are understandable, and improve comparison of small destinations. Add more guided destination comparisons only if they support the research question. Prepare the narrated demo for December 2, then refine and publish the final article and updated video for December 9. The prototype has no fabricated or placeholder chart data.
