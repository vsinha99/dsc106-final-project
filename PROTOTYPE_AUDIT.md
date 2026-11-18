# Initial Prototype audit

Assignment: <https://dsc106.com/projects/final_project/>. Proposal inspected: `FinalProjectProp.pdf`, four pages, including all six exploratory figures. Research direction and four team members retained.

## Rubric

| Category | Points | Implementation and evidence |
| --- | --- | --- |
| Webpage | 0.5 | Root `index.html`; GitHub Pages publication and public HTTP/browser checks reported in delivery. |
| Public GitHub repository | 0.5 | Separate `vsinha99/dsc106-final-project`; public repository accessibility checked at publication. |
| Visualization and interaction | 1 | Three real D3 visualizations. Quarter, metric, time-window and destination interactions change the charts and details. All 72 data combinations browser-tested. |
| Writeup | 1 | Visible `#progress` section, exact user-requested subsection headings, five complete sentences per question, ten total. Sentence counts checked in the browser. |

The first two categories require successful publication; they are not inferred from local implementation. See the delivery report for the verified URLs and final publication status.

## Verification

- `npm test`: six passing data tests; exact column and bound mapping; unique destination-quarter records; all quarters complete; no synthetic data.
- Independent Python `Decimal` sums reproduce the proposal's 2026 Q2 global totals and shares; provenance and SHA-256 are in `data/source.json`.
- Real Chrome tests traverse every quarter, both metrics and both windows (72 combinations), checking sorting, values, uncertainty bounds, labels, and no duplicate SVGs or axes.
- Bar hover and keyboard focus display correct destination, quarter, estimate, units and share. Enter selects a destination; Escape closes its tooltip.
- Linked time-series selection changes the quarter above. Destination details show both shares and ranks, including Japan's cumulative rank change.
- Keyed mark identity survives metric changes; intermediate bar widths establish actual animation rather than only checking transition declarations. Reduced-motion mode skips animation.
- Viewports: 1440×1000, 768×1000, 375×812, and 320×667. Chart labels and SVGs fit inside the viewport. No horizontal document overflow. The data table has its own scrolling container.
- Screenshots of the hero, ranking, uncertainty and time-series views inspected at desktop and mobile sizes. A mobile select overflow and crowded axis labels were identified and corrected; horizontal tick-label overlap is now checked explicitly.
- Both progress paragraphs have five complete sentences. Data, JS, CSS, local assets and internal source links load; no relevant JavaScript console errors in tested interactions.
- The same browser suite is used against the published site after deployment.

## Design and scope

Blue-green encodes computing power; rust encodes chip units. Bar length and dot/range horizontal position use linear quantitative scales from zero. Re-sorting reveals changes in ranking. Uncertainty uses seven leading non-U.S. destinations to avoid compressing their ranges beside the U.S. All displayed values are described as estimates.

This is the initial prototype, not a claim that the December final is complete. The separate raw customs-record comparison is contextual text. Additional narrative scenes, staff-feedback revisions, reader testing, and the final video remain. No optional feature is presented as completed when it is not.

## Interpretation limits

The publisher's low/high bounds are not labeled conventional confidence intervals; overlap is not presented as a statistical test. Endpoints are never summed. Unspecified stays in denominators without appearing as a geographic destination. The EU is one dataset destination, not a bloc added to member-state totals. Quarterly and cumulative values are never mixed in totals. Cumulative arrivals do not establish active capacity or account for later relocation and retirement. The page discloses the small discrepancy between the current methodology table and the pinned CSV.

Only the new repository and temporary tooling under `/private/tmp` were written. The personal website, Lab 7, Project 2, and Project 3 repositories are outside the implementation directory and were not modified. Lab 7's pre-existing untracked `lab7.mp4` was left untouched.
