---
name: House Prefect Affairs
description: A flat paper ledger for house-prefect attendance, with marigold reserved for the action you take.
colors:
  paper: "#f2f3f1"
  ink: "#1b1e1d"
  action: "#8f5413"
  action-hover: "#744314"
  marigold-100: "#f6e8cc"
  marigold-200: "#eed39d"
  marigold-700: "#8f5413"
  marigold-800: "#744314"
  marigold-900: "#613913"
  surface: "#ffffff"
  slate-600: "#475569"
  slate-700: "#334155"
  slate-800: "#1e293b"
  line: "#e2e8f0"
  line-strong: "#cbd5e1"
  success-bg: "#ecfdf5"
  success-fg: "#047857"
  warning-bg: "#fffbeb"
  warning-fg: "#b45309"
  error-bg: "#fef2f2"
  error-fg: "#b91c1c"
  info-bg: "#f0f9ff"
  info-fg: "#0369a1"
  suspended-bg: "#f5f3ff"
  suspended-fg: "#6d28d9"
  traitor-bg: "#fff1f2"
  traitor-fg: "#be123c"
typography:
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  field:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-700}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    height: "44px"
  chip-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-fg}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: House Prefect Affairs

## Overview

**Creative North Star: "The Duty Ledger"**

House Prefect Affairs is the book the house opens every morning. The page is cool paper, the record is ink, and marigold appears only when someone has to act: sign in, save attendance, add a prefect. Density is operational. A screen is a table, a short set of tabs, and one primary button, not a marketing composition.

The system was taken from the incumbent implementation: Archivo for the interface, IBM Plex Mono for PINs, times, and codes, slate for structure, and the marigold ramp for the single accent. This pass darkened the action fill so white labels clear WCAG AA, and it set 12px as the smallest text.

**Key Characteristics:**

- Flat paper, white sheets, hairline rules
- One accent, used on the action and on the active tab underline
- Status is a word plus a tint, never a color alone
- Mono is for data, not for decoration
- Touch targets on phones are at least 44px; desktop headers may sit slightly tighter

## Colors

The palette is cool paper and ink, with a single warm accent.

### Primary

- **Marigold ink** (`action`, `#8f5413`): the primary button fill and the keyboard focus outline. White on this color is 6.09:1. The hover step is **pressed marigold** (`action-hover`, `#744314`).
- **Marigold wash** (`marigold-200`, `#eed39d`): text selection. **Marigold paper** (`marigold-100`) tints the active gate-duty tab.

### Neutral

- **Paper** (`paper`, `#f2f3f1`): the page. **Ink** (`ink`, `#1b1e1d`): body color on that page.
- **Sheet** (`surface`, `#ffffff`): cards, the header, dialogs, and fields.
- **Record** (`slate-800`): secondary buttons such as Refresh, and the selected attendance tab.
- **Caption** (`slate-600`, `#475569`): PINs, class, helper lines, and placeholders. This is the lightest neutral allowed for text that carries a fact (7.58:1 on white).
- **Rule** (`line`, `#e2e8f0`) and **field stroke** (`line-strong`, `#cbd5e1`): dividers and input borders.

### Semantic

Gate and attendance states keep their words. The tint only reinforces the word.

- Present: success green on a green wash
- Late: amber on an amber wash
- Absent and errors: red on a red wash
- ES sits on a neutral slate chip
- EG uses the information blue
- Traitor uses rose
- Suspended uses violet

**The One Action Rule.** Marigold fills a control the person is about to press. It does not fill cards, page backgrounds, or large decorative regions.

**The Readable Record Rule.** Any fact a prefect's name depends on (PIN, class, code, time) uses caption slate or darker. Disabled controls may be lighter; they are the exception.

## Typography

**Body font:** Archivo, with system-ui behind it.
**Data font:** IBM Plex Mono, for PINs, device serials, sign-in times, and codes.

**Character:** Archivo is a plain workhorse sans. Mono marks a value that came from the fingerprint device or a code list.

### Hierarchy

- **Headline** (600, 1.25rem, tight): the page title in the sticky header, and the date on the home record.
- **Title** (600, 1.125rem): section titles inside a sheet, such as a card heading.
- **Body** (400, 0.875rem): descriptions and table cell text.
- **Field** (400, 1rem): inputs, selects, and textareas, so a phone does not zoom the page when a field is focused.
- **Label** (500, 0.875rem): field labels and button labels.
- **Meta** (500, 0.75rem): captions under a name, tab counts, and status chips. Nothing smaller than this.
- **Data** (IBM Plex Mono 500, 0.875rem): PIN, time, and code.

**The Floor Rule.** 12px is the floor. Saved, Late, and role badges use the meta size, not 10px.

## Layout

Pages sit in a centered column: `max-w-3xl` for a short form, `max-w-5xl` for a working list, `max-w-7xl` for the home record. Horizontal padding is 16px, then 24px from 640px, then 32px from 1024px.

The header is sticky. On a narrow screen its secondary actions collapse into one menu; the account actions stay reachable inside that menu. Tables keep the identifying columns (name, time, status, PIN) and drop the index, verification, and device serial as the width shrinks. Class, when the column hides, reprints under the name.

The four attendance slots scroll sideways as a row of 44px tabs instead of squeezing into four equal columns. The gate sheet is a wide matrix with a sticky prefect column; that horizontal scroll is intentional.

**The Phone Reach Rule.** Header triggers, row actions (Excuse, Delete, Edit), dialog close, and the password reveal control are at least 44px tall on small screens. From 768px up, header icon buttons may return to 36px.

## Elevation & Depth

Depth is a sheet on paper. Surfaces are white with a 1px slate rule. A resting card may carry a very small shadow. Menus and dialogs lift further so they read as temporary.

### Shadow Vocabulary

- **Sheet** (`0 1px 2px rgb(0 0 0 / 0.05)`): a card at rest.
- **Menu** (`0 10px 15px -3px rgb(0 0 0 / 0.1)`): the header overflow panel.
- **Dialog** (`0 20px 25px -5px rgb(0 0 0 / 0.1)`): a modal. The backdrop is black at 40%.

**The Flat Paper Rule.** The page itself has no shadow and no gradient. A shadow means the surface is floating over the ledger for a moment.

## Shapes

Corners are slightly rounded and consistent. Controls and fields use 6px. Sheets and dialogs use 8px. Status chips and the small avatar are fully round. The active gate-duty tab is square on the bottom, where a 2px underline marks the selection, and rounded only on the top.

Focus is a 2px marigold outline, offset 2px, drawn on the page around the control. It replaces the faint translucent ring.

## Components

### Buttons

- **Shape:** gently rounded (6px), at least 44px tall on touch widths.
- **Primary:** marigold ink fill, white label, hover pressed marigold.
- **Secondary:** white or slate-100 fill, slate label, 1px rule.
- **Destructive:** red wash, red-700 label, 1px red rule, and a name in the accessible label ("Delete {name}").
- **Focus:** the shared marigold outline.

### Chips

- **Style:** tinted wash, darker text of the same hue, full pill, a word inside (Present, Late, Traitor, Saved).
- **State:** color repeats the word. It does not replace it.

### Cards / Containers

- **Corner style:** 8px.
- **Background:** white sheet on paper.
- **Shadow strategy:** the sheet shadow, or no shadow when a border is enough.
- **Border:** 1px rule.
- **Internal padding:** 16px, 24px on roomier headers.

### Inputs / Fields

- **Style:** white, 1px field stroke, 6px corners, 16px type.
- **Focus:** marigold outline and marigold border.
- **Error:** a red wash banner with `role="alert"`, tied to the field with `aria-describedby` on the sign-in form.
- **Disabled:** slate wash, muted text, not the primary color.

### Navigation

The sticky header carries the mark, the page title, a back control when the page is nested, and page actions. On desktop, destinations live in a shared **Navigate** disclosure; the account disclosure holds Users, password, and log out. On a phone (below 768px), primary destinations move to a fixed bottom tab bar — Home, Attendance, Prefects, Batches, and **More** — in the Instagram / WhatsApp pattern: equal tabs, icon + short label, marigold underline on the active tab. Secondary destinations (Gate Sheet, Tie Duties, Excuses, Suspensions, Settings) open from More as a paper sheet above the bar. Page-specific actions (Save, Add) stay in the header, collapsed behind the overflow control when needed. The selected attendance tab sets `aria-pressed`.

### Dialog

Dialogs use the native `dialog` element. Escape, the backdrop, and the close button dismiss it, unless a save is in flight, in which case dismiss is blocked. The title is an `h2`. Body scroll locks while it is open.

## Do's and Don'ts

### Do:

- **Do** use marigold ink (`#8f5413`) for a primary button that carries white text.
- **Do** put PINs, class, and codes in caption slate (`#475569`) or darker, at 12px or larger.
- **Do** keep status as a word on a tinted chip.
- **Do** use IBM Plex Mono for device data and codes.
- **Do** scroll a long tab row instead of crushing the labels.

### Don't:

- **Don't** put white text on the lighter marigold (`#b56d15`). It fails 4.5:1.
- **Don't** use type smaller than 12px for a badge, count, or caption.
- **Don't** build a second dialog out of a fixed overlay. Use the shared dialog.
- **Don't** name a delete control with only "×" or an unlabeled icon.
- **Don't** spend marigold on decoration. One action per region.
---
