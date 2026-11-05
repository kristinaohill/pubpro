# StatusStepper: chevron step bar

Spec for the PubPro Design System project in Claude Design. Paste the **Prompt** section into Claude Design; the rest is the reference it should follow.

## Prompt

> Redesign the `StatusStepper` component (components/core/StatusStepper.jsx) as a chevron step bar, using the spec below. It replaces the outlined pills joined by em dashes. `RecordHeader` keeps using `StatusStepper` for its step track, so it picks up the new look automatically. Keep the existing `steps` prop working (strings, or `{ label, active }`), add the new props below, and update the StatusStepper and RecordHeader preview cards to show every state. Add the two new colour tokens to tokens/colors.css.

## What it looks like

One segment per step, in a single row. Each segment is a chevron: the point on its right nests into a notch on the left of the next one, with a thin seam between them. Colour carries the state:

- **Done** steps are green.
- The **current** step is blue.
- Steps **still to come** are blue-grey.
- A step that **sent the record back** (for example, "Revisions Required") is yellow.

By default, only the current and next steps show a name under the bar, with a small **NOW** or **NEXT** eyebrow. Every step gets a tooltip with its name and detail, so nothing is lost when names are hidden.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `steps` | array | `[]` | Each item is a string, `{ label, active }` (today's shape), or `{ label, state, tip }`. |
| `labels` | `'now-next'` \| `'all'` \| `'none'` | `'now-next'` | Which names show under the bar. |
| `size` | `'md'` \| `'sm'` | `'md'` | `sm` is for table cells and compact rows. |
| `style` | object | | Merged onto the root, as on every DS component. |

**State of each step:**
- `state` is one of `'done'`, `'current'`, `'todo'` or `'returned'`.
- When `state` is missing (today's `{ label, active }` callers):
  - steps before the active one are `done`
  - the active one is `current`
  - steps after it are `todo`
  - with no active step, all are `todo`
- `tip` is the tooltip text, for example `"Completed Nov 2"` or `"Due Nov 13 · 2 of 3 reviewers approved"`. If it's missing, the tooltip shows the state in words ("Completed", "Current step", "Not started", "Sent back").

**Next** is the first step after the current one that isn't `done`.

## Visual spec

| Element | `md` (default) | `sm` |
|---|---|---|
| Segment height | 14px | 12px |
| Chevron point depth (`tip`) | 7px | 6px |
| Seam between segments | 3px | 2px |
| Label row | shown per `labels` | always hidden (tooltips only) |

**Geometry:**
- Root: `display: flex; align-items: flex-start; gap: 0`.
- Each step: `flex: 1 1 0; min-width: 0; position: relative`.
- Steps after the first: `margin-left: calc(<seam> - <tip>)`, so each notch sits over the previous point and leaves the seam.
- Segment `clip-path`:
  - Every step except the first: `polygon(0 0, calc(100% - tip) 0, 100% 50%, calc(100% - tip) 100%, 0 100%, tip 50%)`.
  - First step (no notch): `polygon(0 0, calc(100% - tip) 0, 100% 50%, calc(100% - tip) 100%, 0 100%)`, with `border-radius: 3px 0 0 3px`.
- A step with a visible label: `flex: 0 1 auto; min-width: 96px`, so it grows to fit its name and the unlabelled steps share what's left.

**Colours.** Two of these aren't tokens yet; add them:

| State | Fill | Token |
|---|---|---|
| done | #1B8B3A | `--ok` (existing) |
| current | #3E73A6 | **new** `--step-current` |
| todo | #C5CCD4 | **new** `--step-todo` |
| returned | #F9E447 | `--warning-icon` (existing) |

**Labels:**
- Label: `margin-top: 7px; padding-right: 10px`, 12px, line-height 1.3, colour #333D47, one line with an ellipsis.
- Labels after the first step: `padding-left: <tip>`, so the text lines up with the notch.
- The current step's label is bold, in `--nav`.
- Eyebrow above the name ("NOW" / "NEXT"): `display: block`, 10px, weight 700, letter-spacing .08em, uppercase, `--text-meta`.
- With `labels: 'all'`, every step shows its name with no eyebrow. Current is still bold navy, and done and todo names use `--text-meta`.

**Interaction:**
- Hover: the segment gets `filter: brightness(.9)` (transition .15s), and the DS `Tooltip` opens.
- Focus: each step has `tabIndex 0`. On focus-visible it gets `outline: 2px solid var(--high-emphasis); outline-offset: 2px; border-radius: 3px`, and the Tooltip opens.

**Tooltip:** the DS `Tooltip`, `width: 230`.
- `title`: the step name.
- Body: `Step {n} of {total} · {tip}`.
- `align="left"` for steps in the first half and `align="right"` for the second half, so it never runs off the edge.

## Accessibility

- Root: `role="list"`, `aria-label="{done} of {total} steps done"`.
- Each step: `role="listitem"`, `aria-label="{label}: {tip}"`.
- State is never shown by colour alone: it's in the aria-label, the tooltip and the visible Now/Next label (same rule as `Pill`).

## In RecordHeader

The stepper keeps its place on the right of the title row. Give it `flex: 1 1 360px; max-width: 640px` so the chevrons have room. The pills used to size to their text, but chevrons need a width.

## Reference implementation

```jsx
/** The record lifecycle as chevrons: done green, current blue, todo blue-grey, returned yellow. */
function StatusStepper({ steps = [], labels = "now-next", size = "md", style, ...rest }) {
  const [hover, setHover] = React.useState(null);
  const tip = size === "sm" ? 6 : 7, seam = size === "sm" ? 2 : 3, h = size === "sm" ? 12 : 14;
  const activeIdx = steps.findIndex(s => typeof s === "object" && s.active);
  const items = steps.map((s, i) => {
    const o = typeof s === "string" ? { label: s } : s;
    const state = o.state || (activeIdx < 0 ? "todo" : i < activeIdx ? "done" : i === activeIdx ? "current" : "todo");
    return { label: o.label, state, tip: o.tip || { done: "Completed", current: "Current step", todo: "Not started", returned: "Sent back" }[state] };
  });
  const cur = items.findIndex(s => s.state === "current" || s.state === "returned");
  const next = cur < 0 ? -1 : items.findIndex((s, i) => i > cur && s.state !== "done");
  const FILL = { done: "var(--ok)", current: "var(--step-current)", todo: "var(--step-todo)", returned: "var(--warning-icon)" };
  const shape = first => first
    ? `polygon(0 0, calc(100% - ${tip}px) 0, 100% 50%, calc(100% - ${tip}px) 100%, 0 100%)`
    : `polygon(0 0, calc(100% - ${tip}px) 0, 100% 50%, calc(100% - ${tip}px) 100%, 0 100%, ${tip}px 50%)`;
  return (
    <div role="list" aria-label={items.filter(s => s.state === "done").length + " of " + items.length + " steps done"}
      style={{ display: "flex", alignItems: "flex-start", ...style }} {...rest}>
      {items.map((s, i) => {
        const eyebrow = labels === "now-next" ? (i === cur ? "Now" : i === next ? "Next" : "") : "";
        const showLabel = size !== "sm" && (labels === "all" || !!eyebrow);
        return (
          <div key={s.label + i} role="listitem" tabIndex={0} aria-label={s.label + ": " + s.tip}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            style={{ flex: showLabel && labels === "now-next" ? "0 1 auto" : "1 1 0", minWidth: showLabel && labels === "now-next" ? 96 : 0,
              marginLeft: i ? seam - tip : 0, position: "relative", outlineOffset: 2, borderRadius: 3 }}>
            <div style={{ height: h, background: FILL[s.state], clipPath: shape(i === 0), borderRadius: i === 0 ? "3px 0 0 3px" : 0,
              filter: hover === i ? "brightness(.9)" : "none", transition: "filter .15s" }} />
            {showLabel && (
              <div style={{ marginTop: 7, padding: `0 10px 0 ${i ? tip : 0}px`, fontSize: 12, lineHeight: 1.3, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
                color: s.state === "current" ? "var(--nav)" : labels === "all" ? "var(--text-meta)" : "#333D47",
                fontWeight: s.state === "current" ? 700 : 400 }}>
                {eyebrow && <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-meta)", textTransform: "uppercase" }}>{eyebrow}</span>}
                {s.label}
              </div>
            )}
            {hover === i && (
              <__ds_scope.Tooltip title={s.label} align={i < items.length / 2 ? "left" : "right"} width={230}>
                {"Step " + (i + 1) + " of " + items.length + " · " + s.tip}
              </__ds_scope.Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## Check before re-importing

- [ ] `steps={['Draft', { label: 'Active', active: true }, 'Completed']}` renders Draft green, Active blue and labelled NOW, and Completed blue-grey and labelled NEXT.
- [ ] A `returned` step is yellow, and its tooltip says "Sent back".
- [ ] `size="sm"` shows no labels and fits a 130px table cell.
- [ ] Tooltips open on hover and on keyboard focus, and don't run off either edge.
- [ ] RecordHeader on a narrow (1,200px) page still fits the title and the stepper on one row.
- [ ] `--step-current` and `--step-todo` are in tokens/colors.css.

## After the re-import (in the PubPro app)

Once the new bundle replaces `client/src/ds/pubpro.js` and `client/src/ds/styles.css`:

1. `RecordHeader` pages (Publication Plan form, Student Project Proposal form) switch to chevrons on their own.
2. Replace the publication record's own timeline (`Timeline` in `client/src/pages/publication-form/frame.jsx`, `.pfx-tl` in `ui.css`) with `<StatusStepper steps={...} />`.
3. Replace the clearance `StepChevrons` (`client/src/pages/mockups/regeneron/shared.jsx`) with `<StatusStepper size="sm" ... />`.
