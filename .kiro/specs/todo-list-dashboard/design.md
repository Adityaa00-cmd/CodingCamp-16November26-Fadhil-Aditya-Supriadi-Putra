# Design Document

## Overview

The To-Do List Dashboard is a fully client-side, single-page web application delivered as a pair of static files (`index.html`, `css/style.css`, `js/app.js`). No server, build tool, or external dependency is involved. All state persists in the browser's `localStorage`. The application targets Chrome 120+, Firefox 120+, Edge 120+, and Safari 17+.

The design philosophy is **progressive disclosure**: the core MVP features (Greeting, Focus Timer, Tasks, Quick Links) occupy the main layout, and the optional features (Light/Dark Mode, Custom Name, Configurable Duration, Duplicate Prevention, Sort) enhance those core features without adding new primary layout regions.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Module pattern | IIFE namespaces per component in a single JS file | No build step; avoids global pollution while remaining readable |
| Theming | CSS custom properties on `:root` switched via a `data-theme` attribute on `<html>` | A single attribute toggle is instant and CSS handles all visual changes with no JS layout math |
| Timer implementation | `setInterval` at 1-second ticks, corrected against `Date.now()` on each tick | Avoids drift without requiring `requestAnimationFrame` complexity |
| ID generation | `crypto.randomUUID()` (supported in all target browsers) | Avoids timestamp collisions on rapid adds |
| Validation feedback | Inline `<span>` elements below each input | No modal interruption; screen-reader-friendly with `aria-live` |

---

## Architecture

The application follows a **unidirectional data flow**:

```
User Interaction
      │
      ▼
  Event Handler (in JS module)
      │
      ▼
  State Mutation (plain JS objects in memory)
      │
      ▼
  localStorage.setItem (persist immediately)
      │
      ▼
  DOM Render Function (re-render affected component)
```

There is no virtual DOM or reactive framework. Each component module exposes an `init()` function called once on `DOMContentLoaded`, and a `render()` function called whenever its slice of state changes.

### File Structure

```
project-root/
├── index.html          ← single HTML file; all semantic markup
├── css/
│   └── style.css       ← single CSS file; all styles and theme variables
└── js/
    └── app.js          ← single JS file; all logic organised as IIFE modules
```

### Module Dependency Map

```
app.js
├── Storage   (read/write localStorage, type validation, defaults)
├── State     (in-memory state object; single source of truth)
├── Greeting  (clock interval, date/greeting rendering)
├── Timer     (countdown logic, Web Audio alert, Notifications API)
├── Tasks     (CRUD, duplicate check, sort, validation)
├── Links     (CRUD, URL validation)
├── Theme     (toggle, localStorage sync)
└── App       (bootstrap: calls Storage.load → State.init → all init())
```

---

## Components and Interfaces

### 1. Greeting Widget

**Responsibility:** Display the live clock, full date, time-of-day greeting, and optional user name.

**DOM Structure:**
```html
<section id="greeting-widget" aria-label="Greeting">
  <p id="greeting-text">Good Morning, Alex</p>
  <p id="clock-display">09:42</p>
  <p id="date-display">Monday, 16 November 2026</p>
</section>
```

**JS Interface (`Greeting` module):**
```
Greeting.init()
  → starts setInterval(tick, 1000)
  → calls render() immediately

Greeting.render()
  → reads State.userName, current Date
  → updates #greeting-text, #clock-display, #date-display
```

**Greeting Logic:**
```
hour 05–11  → "Good Morning"
hour 12–17  → "Good Afternoon"
hour 18–20  → "Good Evening"
hour 21–23 or 00–04 → "Good Night"
```

**Clock format:** `String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0')`

**Date format:** `date.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })`

---

### 2. Focus Timer

**Responsibility:** Countdown timer with Start/Stop/Reset; audible + optional push notification on zero.

**States:** `reset | running | stopped`

**DOM Structure:**
```html
<section id="focus-timer" aria-label="Focus Timer">
  <p id="timer-display">25:00</p>
  <div id="timer-controls">
    <button id="timer-start-stop">Start</button>
    <button id="timer-reset">Reset</button>
  </div>
  <div id="timer-duration-config" aria-label="Configure duration">
    <input id="duration-input" type="number" min="1" max="120" />
    <button id="duration-save">Save</button>
    <span id="duration-error" role="alert" aria-live="polite"></span>
  </div>
</section>
```

**JS Interface (`Timer` module):**
```
Timer.init()
  → renders initial state from State.pomodoroSeconds
  → wires button events

Timer.start()
  → records startAt = Date.now(), remainingAtStart = State.timerRemaining
  → intervalId = setInterval(Timer._tick, 1000)
  → state.timerState = 'running'

Timer.stop()
  → clearInterval(intervalId)
  → state.timerState = 'stopped'

Timer.reset()
  → clearInterval(intervalId)
  → state.timerRemaining = state.pomodoroSeconds
  → state.timerState = 'reset'
  → render()

Timer._tick()
  → elapsed = Math.floor((Date.now() - startAt) / 1000)
  → remaining = remainingAtStart - elapsed
  → if remaining <= 0: Timer._complete()
  → else: state.timerRemaining = remaining; render()

Timer._complete()
  → Timer.reset()
  → plays Web Audio beep
  → if Notification.permission === 'granted': sends notification

Timer.saveDuration(minutes)
  → validates 1 ≤ minutes ≤ 120 and Number.isInteger(minutes)
  → state.pomodoroSeconds = minutes * 60
  → Timer.reset()
  → Storage.save('pomodoroMinutes', minutes)
```

**Audible Alert:** Synthesised via Web Audio API (`AudioContext` → `OscillatorNode`, 440 Hz, 0.5 s).

**Display format:** `Math.floor(s/60).toString().padStart(2,'0') + ':' + (s%60).toString().padStart(2,'0')`

---

### 3. Task Manager

**Responsibility:** Add, edit, complete/incomplete toggle, delete tasks; duplicate warning; sort control.

**DOM Structure:**
```html
<section id="task-manager" aria-label="Task Manager">
  <form id="task-add-form">
    <input id="task-input" type="text" maxlength="500" placeholder="New task…" />
    <button type="submit">Add</button>
    <span id="task-add-error" role="alert" aria-live="polite"></span>
  </form>

  <!-- Duplicate warning (hidden by default) -->
  <div id="duplicate-warning" hidden>
    <p>A task with this description already exists. Add anyway?</p>
    <button id="duplicate-confirm">Add Anyway</button>
    <button id="duplicate-cancel">Cancel</button>
  </div>

  <!-- Sort control -->
  <div id="sort-controls">
    <label for="sort-select">Sort by:</label>
    <select id="sort-select">
      <option value="dateAdded">Date Added</option>
      <option value="alphabetical">Alphabetical</option>
      <option value="completionStatus">Completion Status</option>
    </select>
  </div>

  <ul id="task-list" aria-label="Tasks" role="list"></ul>
</section>
```

**Task list item template (rendered by JS):**
```html
<li data-id="{id}" class="task-item {completed ? 'completed' : ''}">
  <input type="checkbox" aria-label="Mark complete" {checked?} />
  <span class="task-description">{description}</span>
  <button class="task-edit-btn" aria-label="Edit task">Edit</button>
  <button class="task-delete-btn" aria-label="Delete task">Delete</button>
</li>
```

**Edit mode replaces the `<span>` with:**
```html
<input class="task-edit-input" type="text" value="{description}" maxlength="500" />
<button class="task-save-btn">Save</button>
<button class="task-cancel-btn">Cancel</button>
<span class="task-edit-error" role="alert" aria-live="polite"></span>
```

**JS Interface (`Tasks` module):**
```
Tasks.init()          → render(), wire form submit and sort change
Tasks.render()        → sort state.tasks, build <li> list
Tasks.add(description)
  → trim; validate 1–500 chars
  → check duplicate (case-insensitive)
  → if duplicate: show warning, store pendingTask
Tasks.confirmAdd()    → push task to state, persist, render
Tasks.edit(id)        → swap <span> for edit input in DOM
Tasks.saveEdit(id, text) → validate, update task.description, persist, render
Tasks.toggleComplete(id)  → flip task.completed, persist, render
Tasks.delete(id)      → filter state.tasks, persist, render
Tasks._sort(tasks, order) → returns sorted copy (no mutation)
```

**Sort Comparators:**
- `alphabetical`: `a.description.localeCompare(b.description, undefined, {sensitivity:'base'})`, tie-break by `a.createdAt - b.createdAt`
- `completionStatus`: `a.completed - b.completed` (incomplete = 0 first), tie-break by `a.createdAt - b.createdAt`
- `dateAdded`: `a.createdAt - b.createdAt`

---

### 4. Quick Links

**Responsibility:** Add and open URL shortcuts; enforce max 20; validate URL format.

**DOM Structure:**
```html
<section id="quick-links" aria-label="Quick Links">
  <form id="link-add-form">
    <input id="link-url-input" type="url" maxlength="2048" placeholder="https://…" />
    <input id="link-label-input" type="text" maxlength="50" placeholder="Label (optional)" />
    <button type="submit">Add</button>
    <span id="link-add-error" role="alert" aria-live="polite"></span>
  </form>
  <div id="links-container" role="list" aria-label="Saved links"></div>
</section>
```

**Link button template:**
```html
<div class="link-item" role="listitem">
  <a href="{url}" target="_blank" rel="noopener noreferrer" class="link-btn">{label || url}</a>
  <button class="link-delete-btn" aria-label="Delete link">×</button>
</div>
```

**JS Interface (`Links` module):**
```
Links.init()          → render(), wire form submit
Links.render()        → rebuild links-container
Links.add(url, label)
  → validate URL: /^https?:\/\/[^\s.]+\.[^\s]+/i
  → validate count < 20
  → push entry to state.quickLinks, persist, render
Links.delete(id)      → filter, persist, render
Links.open(url)       → window.open(url, '_blank', 'noopener,noreferrer')
```

**URL Regex:** `/^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+/`

---

### 5. Theme Toggle

**Responsibility:** Switch and persist light/dark theme.

**DOM element:** `<button id="theme-toggle" aria-label="Switch to dark mode">🌙</button>`

**JS Interface (`Theme` module):**
```
Theme.init()          → apply saved theme, wire button
Theme.apply(theme)
  → document.documentElement.setAttribute('data-theme', theme)
  → update button label/icon
  → state.theme = theme; Storage.save('theme', theme)
Theme.toggle()        → apply(state.theme === 'light' ? 'dark' : 'light')
```

---

### 6. User Name Input

Rendered inside the Greeting section as a small inline form:

```html
<form id="name-form">
  <input id="name-input" type="text" maxlength="50" placeholder="Your name…" />
  <button type="submit">Set</button>
</form>
```

Handled by the `Greeting` module's `saveName(value)` function: trims value; if empty, clears `state.userName`; persists and re-renders greeting.

---

## Data Models

All data is stored in `localStorage`. Each key maps to a JSON-serialised value.

### Keys and Schemas

| Key | Type | Default | Description |
|---|---|---|---|
| `tld_tasks` | `Task[]` | `[]` | All tasks |
| `tld_links` | `Link[]` | `[]` | All quick-link entries |
| `tld_userName` | `string` | `""` | Display name (empty string = none) |
| `tld_theme` | `"light" \| "dark"` | `"light"` | Active theme |
| `tld_pomodoroMinutes` | `integer 1–120` | `25` | Timer duration in minutes |

The `tld_` prefix prevents collisions with other apps that might share the same origin.

### Task Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Buy groceries",
  "completed": false,
  "createdAt": 1700000000000
}
```

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` (UUID v4) | Generated by `crypto.randomUUID()` |
| `description` | `string` | 1–500 characters |
| `completed` | `boolean` | `false` on creation |
| `createdAt` | `number` | Unix ms timestamp from `Date.now()` |

### Link Object

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "url": "https://github.com",
  "label": "GitHub"
}
```

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` (UUID v4) | Generated by `crypto.randomUUID()` |
| `url` | `string` | 1–2048 chars; must match URL regex |
| `label` | `string` | 0–50 chars; falls back to `url` if empty |

### State Object (in-memory)

```js
const state = {
  tasks: [],            // Task[]
  quickLinks: [],       // Link[]
  userName: '',         // string
  theme: 'light',       // 'light' | 'dark'
  pomodoroMinutes: 25,  // integer 1–120
  pomodoroSeconds: 1500,// pomodoroMinutes * 60 (derived)
  timerRemaining: 1500, // seconds remaining (not persisted)
  timerState: 'reset',  // 'reset' | 'running' | 'stopped' (not persisted)
  sortOrder: 'dateAdded'// current sort (not persisted)
};
```

### Storage Module

```
Storage.load()
  → reads all keys; JSON.parse each
  → type-validates each field; falls back to default on failure
  → returns a plain state object

Storage.save(key, value)
  → localStorage.setItem('tld_' + key, JSON.stringify(value))

Storage.TYPE_VALIDATORS = {
  tasks:           (v) => Array.isArray(v),
  links:           (v) => Array.isArray(v),
  userName:        (v) => typeof v === 'string',
  theme:           (v) => v === 'light' || v === 'dark',
  pomodoroMinutes: (v) => Number.isInteger(v) && v >= 1 && v <= 120
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time-of-day greeting is total and correct

*For any* local hour value (0–23), the greeting function SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night", and the returned value SHALL match the hour-range mapping defined in Requirements 3.4–3.7.

**Validates: Requirements 3.4, 3.5, 3.6, 3.7**

---

### Property 2: Task addition round-trip

*For any* valid task description (1–500 non-whitespace-only characters), adding the task and then reading `localStorage` SHALL produce a Task array that contains an entry whose `description` exactly matches the submitted description, with `completed` set to `false`.

**Validates: Requirements 5.1, 5.7**

---

### Property 3: Whitespace-only and empty task descriptions are rejected

*For any* string composed entirely of whitespace characters (including the empty string), submitting it as a task description SHALL not add a Task to the list and SHALL leave the Task_List length unchanged.

**Validates: Requirements 5.8**

---

### Property 4: Edit preserves identity

*For any* task and any valid replacement description (1–500 characters), saving an edit SHALL produce a task with the same `id` and `createdAt` as the original, with only `description` updated.

**Validates: Requirements 5.3**

---

### Property 5: Completion toggle is an involution

*For any* task, toggling the completion state twice SHALL return the task to its original `completed` value.

**Validates: Requirements 5.4, 5.5**

---

### Property 6: localStorage persistence is immediate and consistent

*For any* sequence of add/edit/complete/delete operations, the JSON-parsed contents of `tld_tasks` in `localStorage` SHALL equal the in-memory `state.tasks` array after each individual operation.

**Validates: Requirements 5.7, 2.5**

---

### Property 7: Theme value is always valid

*For any* value written to or read from `localStorage` for `tld_theme`, the applied theme SHALL always be either `"light"` or `"dark"`. If the stored value is neither, the Dashboard SHALL apply `"light"`.

**Validates: Requirements 7.5, 2.4**

---

### Property 8: Sort order correctness

*For any* non-empty task list and any sort order selection, re-sorting with the same sort order a second time SHALL produce a list identical to the first sort (idempotent), and for alphabetical sorting every adjacent pair of tasks SHALL satisfy `a.description.localeCompare(b.description) <= 0` (case-insensitive), with ties broken by ascending `createdAt`.

**Validates: Requirements 11.2, 11.3, 11.4**

---

### Property 9: Quick Links URL validation

*For any* string that does not begin with `http://` or `https://` followed by at least one valid domain segment, the Links module SHALL reject the add operation and leave `state.quickLinks` unchanged.

**Validates: Requirements 6.5**

---

### Property 10: Quick Links maximum enforcement

*For any* Quick Links collection already containing 20 entries, any attempt to add another entry SHALL be rejected and `state.quickLinks.length` SHALL remain 20.

**Validates: Requirements 6.6**

---

## Error Handling

### Validation Errors

All user-facing validation errors are displayed as inline messages in `<span>` elements with `role="alert"` and `aria-live="polite"`. They are cleared on the next valid interaction or when the input changes.

| Trigger | Message |
|---|---|
| Empty/whitespace task description | "Task description is required." |
| Task description > 500 chars | "Description must be 500 characters or fewer." |
| Empty edited task description | "Description cannot be empty." |
| Invalid quick-link URL | "Please enter a valid URL starting with http:// or https://." |
| Quick-links at capacity (20) | "Maximum of 20 shortcuts reached. Delete one to add more." |
| Pomodoro duration out of range | "Duration must be a whole number between 1 and 120." |

### localStorage Errors

`Storage.load()` wraps each `JSON.parse` call in a `try/catch`. On any error (malformed JSON, quota exceeded, `SecurityError` in private browsing), the affected key is silently reset to its default and `Storage.save()` writes the default back.

`Storage.save()` wraps `localStorage.setItem` in a `try/catch`. On `QuotaExceededError`, the in-memory state remains valid; a brief non-blocking console warning is logged. No user-visible error is shown for storage quota failures, as the app remains fully usable in-memory for the session.

### Timer Drift Correction

The timer does not simply decrement a counter. Each tick recomputes elapsed time as `Date.now() - startAt` and derives `remaining = remainingAtStart - elapsed`. This prevents cumulative drift from `setInterval` jitter.

### Notifications API

`Timer._complete()` checks `'Notification' in window` before accessing the API. If the API is absent or permission is `'denied'`, the audible alert still fires. No permission is requested automatically; the user must have already granted it (or a one-time request can be made on first Start click).

### Web Audio API

`AudioContext` creation is wrapped in a `try/catch`. Browsers may block audio context creation until a user gesture; the first Start click constitutes a valid gesture. If creation fails, the timer completes silently.

---

## Testing Strategy

### Dual Testing Approach

This feature combines **example-based unit tests** for specific scenarios and edge cases with **property-based tests** for universal correctness guarantees.

### Unit Tests (example-based)

Recommended framework: **Vitest** (zero-config, ESM-native). Each module's pure functions are extracted for direct testing.

Key example tests:
- Greeting text at boundary hours (04:59, 05:00, 11:59, 12:00, 17:59, 18:00, 20:59, 21:00, 23:59, 00:00)
- Timer display format: 0 seconds → "00:00", 1500 seconds → "25:00", 61 seconds → "01:01"
- `Storage.load()` with missing keys returns defaults
- `Storage.load()` with malformed JSON returns defaults
- `Storage.load()` with wrong-type values returns defaults for those fields
- Quick-link URL validation: known valid and invalid examples
- Duplicate detection: exact match, case-insensitive match, different-whitespace match
- Sort: stable ordering with tie-break by `createdAt`

### Property-Based Tests

Recommended library: **fast-check** (compatible with Vitest via `import`).

Each property test runs a minimum of **100 iterations**. Tests are tagged with comments in the format:

```
// Feature: todo-list-dashboard, Property N: <property_text>
```

| Property | Generator Strategy |
|---|---|
| P1: Greeting totality and correctness | `fc.integer({min:0, max:23})` for hour |
| P2: Task add round-trip | `fc.string({minLength:1, maxLength:500})` filtered for non-whitespace-only |
| P3: Whitespace rejection | `fc.stringOf(fc.constantFrom(' ','\t','\n','\r'))` |
| P4: Edit preserves identity | Arbitrary task + valid replacement description |
| P5: Completion toggle involution | Arbitrary task (completed true or false) |
| P6: localStorage consistency | Sequence of arbitrary CRUD operations on arbitrary tasks |
| P7: Theme validity | `fc.string()` as stored theme value (including invalid values) |
| P8: Sort idempotence and order | `fc.array(fc.record({...}), {minLength:1})` for tasks; all three sort orders |
| P9: URL validation completeness | `fc.string()` as URL input |
| P10: Max-20 enforcement | Task list of size 20 + arbitrary new link |

### CSS / Visual Tests

CSS does not lend itself to property-based testing. Verify theming with:
- **Snapshot tests**: Capture computed `--color-*` custom property values for both `light` and `dark` themes
- **Manual review**: Confirm 100ms transition timing and contrast ratios

### Integration Smoke Tests

Run the full `index.html` in a headless browser (Playwright or Puppeteer) for:
- Initial load with empty localStorage completes within 2 seconds
- Round-trip: add task → reload page → task still present
- Round-trip: set theme → reload → theme restored
- Timer reaches zero: audible alert fires (checked via Web Audio mock)
