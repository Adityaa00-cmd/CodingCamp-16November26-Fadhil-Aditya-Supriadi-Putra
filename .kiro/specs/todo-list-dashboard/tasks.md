# Implementation Plan: To-Do List Dashboard

## Overview

Implement a fully client-side single-page web application using HTML, CSS, and Vanilla JavaScript. The app delivers a Greeting Widget, Focus Timer, Task Manager, and Quick Links launcher, with all data persisted in `localStorage`. Optional enhancements (Light/Dark Mode, Custom Name, Configurable Pomodoro, Duplicate Prevention, Sort Tasks) layer on top of the MVP core. The module pattern is IIFE namespaces in a single `js/app.js` file; theming uses CSS custom properties toggled via a `data-theme` attribute on `<html>`.

---

## Tasks

- [x] 1. Set up project structure and static HTML skeleton
  - Create `index.html` with semantic `<section>` elements for each widget: `#greeting-widget`, `#focus-timer`, `#task-manager`, `#quick-links`
  - Add `<link>` to `css/style.css` and `<script defer>` to `js/app.js` — no other external resources
  - Create `css/style.css` as an empty file; create `js/app.js` as an empty file
  - Add all named DOM elements referenced by JS modules: `#greeting-text`, `#clock-display`, `#date-display`, `#timer-display`, `#timer-start-stop`, `#timer-reset`, `#task-input`, `#task-add-form`, `#task-add-error`, `#task-list`, `#sort-select`, `#duplicate-warning`, `#duplicate-confirm`, `#duplicate-cancel`, `#link-url-input`, `#link-label-input`, `#link-add-form`, `#link-add-error`, `#links-container`, `#theme-toggle`, `#name-form`, `#name-input`, `#duration-input`, `#duration-save`, `#duration-error`
  - Include `aria-label`, `role`, and `aria-live="polite"` attributes on interactive and alert elements per the design's DOM structures
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Implement the Storage module
  - [x] 2.1 Write the `Storage` IIFE module in `js/app.js`
    - Implement `Storage.load()`: reads all five `tld_*` keys from `localStorage`, wraps each `JSON.parse` in `try/catch`, applies `TYPE_VALIDATORS`, returns plain state object with defaults for any missing or invalid field
    - Implement `Storage.save(key, value)`: wraps `localStorage.setItem('tld_' + key, JSON.stringify(value))` in `try/catch`; on `QuotaExceededError` logs a console warning and does not throw
    - Define `Storage.TYPE_VALIDATORS` for `tasks`, `links`, `userName`, `theme`, `pomodoroMinutes` exactly as specified in the design
    - Defaults: `tasks → []`, `links → []`, `userName → ""`, `theme → "light"`, `pomodoroMinutes → 25`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Write property test for Storage load defaults (Property 7)
    - **Property 7: Theme value is always valid**
    - Use `fc.string()` as the stored theme value; assert the returned theme is always `"light"` or `"dark"`; assert invalid values resolve to `"light"`
    - **Validates: Requirements 7.5, 2.4**

- [x] 3. Implement the State object and App bootstrap
  - [x] 3.1 Define the in-memory `State` object in `js/app.js`
    - Declare the `state` object with all fields: `tasks`, `quickLinks`, `userName`, `theme`, `pomodoroMinutes`, `pomodoroSeconds`, `timerRemaining`, `timerState`, `sortOrder`
    - Implement `State.init(loadedState)` to merge loaded values into `state`, deriving `pomodoroSeconds = pomodoroMinutes * 60` and setting `timerRemaining = pomodoroSeconds`, `timerState = 'reset'`, `sortOrder = 'dateAdded'`
    - Implement the `App` IIFE: on `DOMContentLoaded`, call `Storage.load()` → `State.init()` → `Greeting.init()` → `Timer.init()` → `Tasks.init()` → `Links.init()` → `Theme.init()`
    - _Requirements: 2.2, 2.3, 1.4_

- [x] 4. Implement the Greeting Widget module
  - [x] 4.1 Write the `Greeting` IIFE module
    - Implement `Greeting.init()`: calls `Greeting.render()` immediately, then `setInterval(Greeting._tick, 1000)`
    - Implement `Greeting._tick()`: calls `Greeting.render()` on each second
    - Implement `Greeting.render()`: reads `state.userName` and `new Date()`; updates `#greeting-text` with time-of-day greeting (optionally suffixed with `, ${userName}` if set); updates `#clock-display` with `HH:MM` 24-hour format using `padStart(2,'0')`; updates `#date-display` using `date.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })`
    - Greeting hour ranges: 05–11 → "Good Morning", 12–17 → "Good Afternoon", 18–20 → "Good Evening", 21–23 and 00–04 → "Good Night"
    - Wire `#name-form` submit: call `Greeting.saveName(value)`
    - Implement `Greeting.saveName(value)`: trim value; if empty clear `state.userName` and remove from `localStorage`; otherwise validate 1–50 chars, set `state.userName`, call `Storage.save('userName', value)`, call `Greeting.render()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 4.2 Write property test for greeting hour mapping (Property 1)
    - **Property 1: Time-of-day greeting is total and correct**
    - Use `fc.integer({min:0, max:23})` as the hour; assert the function always returns exactly one of the four greeting strings; assert each hour maps to the correct greeting per the design's hour-range table
    - **Validates: Requirements 3.4, 3.5, 3.6, 3.7**

- [x] 5. Implement the Focus Timer module
  - [x] 5.1 Write the `Timer` IIFE module (core countdown logic)
    - Implement `Timer.init()`: render initial display from `state.timerRemaining`, wire `#timer-start-stop` and `#timer-reset` click events
    - Implement `Timer.render()`: format `state.timerRemaining` as `MM:SS` using `padStart(2,'0')`; set `#timer-display` text; update `#timer-start-stop` button label to "Start" when state is `reset` or `stopped`, "Stop" when `running`
    - Implement `Timer.start()`: record `startAt = Date.now()` and `remainingAtStart = state.timerRemaining`; set `state.timerState = 'running'`; start `setInterval(Timer._tick, 1000)`; call `Timer.render()`
    - Implement `Timer.stop()`: call `clearInterval`; set `state.timerState = 'stopped'`; call `Timer.render()`
    - Implement `Timer.reset()`: call `clearInterval`; set `state.timerRemaining = state.pomodoroSeconds`, `state.timerState = 'reset'`; call `Timer.render()`
    - Implement `Timer._tick()`: compute `elapsed = Math.floor((Date.now() - startAt) / 1000)`, `remaining = remainingAtStart - elapsed`; if `remaining <= 0` call `Timer._complete()`; else update `state.timerRemaining = remaining` and call `Timer.render()`
    - Implement `Timer._complete()`: call `Timer.reset()`; play Web Audio beep (440 Hz, 0.5 s via `AudioContext` + `OscillatorNode`) wrapped in `try/catch`; if `Notification.permission === 'granted'` send a browser notification
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.2 Wire configurable Pomodoro duration controls
    - Implement `Timer.saveDuration(minutes)`: validate `Number.isInteger(minutes) && minutes >= 1 && minutes <= 120`; on failure show error in `#duration-error` within 500 ms; on success set `state.pomodoroMinutes`, `state.pomodoroSeconds`, call `Timer.reset()`, call `Storage.save('pomodoroMinutes', minutes)`
    - Wire `#duration-save` click: read `#duration-input` value, parse as integer, call `Timer.saveDuration()`; clear `#duration-error` on valid input
    - Set `#duration-input` initial value from `state.pomodoroMinutes` during `Timer.init()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 6. Checkpoint — Ensure greeting and timer work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the Task Manager module
  - [x] 7.1 Write the `Tasks` IIFE module (add and render)
    - Implement `Tasks.init()`: call `Tasks.render()`, wire `#task-add-form` submit event, wire `#sort-select` change event
    - Implement `Tasks.render()`: call `Tasks._sort(state.tasks, state.sortOrder)`, then build `<li>` elements from the design's task-item template using `data-id`, `class="task-item"`, checkbox, description `<span>`, Edit and Delete buttons; set `.completed` class when `task.completed` is true; replace `#task-list` innerHTML
    - Implement `Tasks.add(description)`: trim input; validate 1–500 chars (show `#task-add-error` if invalid); if valid create a Task object with `crypto.randomUUID()`, `Date.now()`, `completed: false`; push to `state.tasks`; call `Storage.save('tasks', state.tasks)`; call `Tasks.render()`; clear input
    - _Requirements: 5.1, 5.7, 5.8_

  - [ ]* 7.2 Write property test for task addition round-trip (Property 2)
    - **Property 2: Task addition round-trip**
    - Use `fc.string({minLength:1, maxLength:500})` filtered for non-whitespace-only; after calling `Tasks.add()`, assert the `tld_tasks` JSON in `localStorage` contains an entry with the submitted description and `completed: false`
    - **Validates: Requirements 5.1, 5.7**

  - [ ]* 7.3 Write property test for whitespace rejection (Property 3)
    - **Property 3: Whitespace-only and empty task descriptions are rejected**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` as input; assert `Tasks.add()` does not change `state.tasks.length`
    - **Validates: Requirements 5.8**

  - [x] 7.4 Implement task edit, save, and cancel
    - Wire click on `.task-edit-btn` in the task list event delegation: call `Tasks.edit(id)`
    - Implement `Tasks.edit(id)`: find the `<li>` by `data-id`; replace the description `<span>` with an edit `<input>` pre-filled with the current description plus Save, Cancel buttons, and an error `<span class="task-edit-error">`
    - Implement `Tasks.saveEdit(id, text)`: trim text; validate 1–500 chars (show `task-edit-error` if invalid); on success update `task.description`; leave `task.id` and `task.createdAt` unchanged; call `Storage.save('tasks', state.tasks)`; call `Tasks.render()`
    - Wire `.task-cancel-btn` click: call `Tasks.render()` to restore view without saving
    - _Requirements: 5.2, 5.3, 5.9_

  - [ ]* 7.5 Write property test for edit preserves identity (Property 4)
    - **Property 4: Edit preserves identity**
    - Generate an arbitrary task + valid replacement description; after `Tasks.saveEdit()`, assert `id` and `createdAt` are unchanged and only `description` is updated
    - **Validates: Requirements 5.3**

  - [x] 7.6 Implement task completion toggle and delete
    - Wire `.task-delete-btn` click via event delegation: call `Tasks.delete(id)`
    - Wire checkbox change via event delegation: call `Tasks.toggleComplete(id)`
    - Implement `Tasks.toggleComplete(id)`: find task by id; flip `task.completed`; call `Storage.save('tasks', state.tasks)`; call `Tasks.render()`
    - Implement `Tasks.delete(id)`: filter `state.tasks` to remove the entry; call `Storage.save`; call `Tasks.render()`
    - Completed tasks must render with the CSS class that applies strikethrough to `.task-description`
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

  - [ ]* 7.7 Write property test for completion toggle involution (Property 5)
    - **Property 5: Completion toggle is an involution**
    - Generate an arbitrary task with arbitrary initial `completed` value; call `Tasks.toggleComplete` twice; assert `task.completed` equals its original value
    - **Validates: Requirements 5.4, 5.5**

  - [ ]* 7.8 Write property test for localStorage consistency (Property 6)
    - **Property 6: localStorage persistence is immediate and consistent**
    - Generate a sequence of arbitrary CRUD operations (add, edit, complete, delete) on arbitrary tasks; after each operation assert that `JSON.parse(localStorage.getItem('tld_tasks'))` deep-equals `state.tasks`
    - **Validates: Requirements 5.7, 2.5**

- [x] 8. Implement task sort and duplicate-prevention
  - [x] 8.1 Implement `Tasks._sort(tasks, order)` and wire sort control
    - Implement `Tasks._sort(tasks, order)`: returns a sorted copy (no mutation) using three comparators — `alphabetical` uses `localeCompare` with `{sensitivity:'base'}` and tie-breaks by `createdAt`; `completionStatus` sorts incomplete first (`a.completed - b.completed`) with `createdAt` tie-break; `dateAdded` sorts by `createdAt` ascending
    - Wire `#sort-select` change event in `Tasks.init()`: update `state.sortOrder`; call `Tasks.render()`
    - Set `#sort-select` initial value to `state.sortOrder` during `Tasks.init()`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 8.2 Write property test for sort idempotence and order (Property 8)
    - **Property 8: Sort order correctness**
    - Use `fc.array(fc.record({id: fc.uuid(), description: fc.string(), completed: fc.boolean(), createdAt: fc.integer()}), {minLength:1})` for tasks; for all three sort orders assert that sorting twice produces the same list; for alphabetical assert every adjacent pair satisfies `a.description.localeCompare(b.description, undefined, {sensitivity:'base'}) <= 0` with `createdAt` tie-break
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [x] 8.3 Implement duplicate-task warning
    - In `Tasks.add()`, before creating the Task object, check whether any existing task description matches the new description case-insensitively (full trimmed comparison); if a match is found, store the pending description and show `#duplicate-warning` (remove `hidden` attribute) instead of adding immediately
    - Wire `#duplicate-confirm` click: call `Tasks.confirmAdd()` which pushes the pending task, persists, renders, and hides `#duplicate-warning`
    - Wire `#duplicate-cancel` click: clear the pending description, hide `#duplicate-warning`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 9. Checkpoint — Ensure all task-related tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement the Quick Links module
  - [x] 10.1 Write the `Links` IIFE module
    - Implement `Links.init()`: call `Links.render()`, wire `#link-add-form` submit event
    - Implement `Links.render()`: rebuild `#links-container` from `state.quickLinks` using the link-item template — each entry renders as an `<a>` with `target="_blank" rel="noopener noreferrer"` and a delete button
    - Implement `Links.add(url, label)`: validate URL against `/^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+/` — show `#link-add-error` if invalid; check `state.quickLinks.length < 20` — show capacity error if at limit; on success create Link object with `crypto.randomUUID()`, push to `state.quickLinks`, call `Storage.save('links', state.quickLinks)`, call `Links.render()`
    - Implement `Links.delete(id)`: filter `state.quickLinks`, call `Storage.save`, call `Links.render()`
    - Wire `.link-delete-btn` click via event delegation on `#links-container`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 10.2 Write property test for URL validation (Property 9)
    - **Property 9: Quick Links URL validation**
    - Use `fc.string()` as URL input; assert that any string not matching the design's URL regex is rejected and `state.quickLinks` length is unchanged
    - **Validates: Requirements 6.5**

  - [ ]* 10.3 Write property test for max-20 enforcement (Property 10)
    - **Property 10: Quick Links maximum enforcement**
    - Seed `state.quickLinks` with exactly 20 entries; use `fc.record({url: fc.webUrl(), label: fc.string()})` as a new entry; assert `Links.add()` rejects it and `state.quickLinks.length` remains 20
    - **Validates: Requirements 6.6**

- [x] 11. Implement the Theme Toggle module
  - [x] 11.1 Write the `Theme` IIFE module and CSS custom properties
    - Define CSS custom properties for `light` and `dark` colour schemes using `[data-theme="light"]` and `[data-theme="dark"]` selectors on `:root`; include at minimum `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-border`; apply a `transition: background-color 100ms, color 100ms` on `body` to meet the 100 ms constraint
    - Implement `Theme.init()`: call `Theme.apply(state.theme)`, wire `#theme-toggle` click event
    - Implement `Theme.apply(theme)`: set `document.documentElement.setAttribute('data-theme', theme)`; update `#theme-toggle` label/icon; set `state.theme = theme`; call `Storage.save('theme', theme)`
    - Implement `Theme.toggle()`: call `Theme.apply(state.theme === 'light' ? 'dark' : 'light')`
    - In `Storage.load()` / `State.init()`, if the loaded theme is not `"light"` or `"dark"`, default to `"light"` and overwrite the stored value
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Write layout and visual CSS
  - [x] 12.1 Implement full CSS layout and component styles
    - Apply `box-sizing: border-box` reset; set font stack using system fonts
    - Lay out the dashboard as a responsive grid or flexbox with the four main widget sections visible simultaneously; ensure the layout is usable at viewport widths from 320px to 1440px
    - Style each widget section with surface colour, padding, border-radius
    - Style the task list: `.completed .task-description` must have `text-decoration: line-through`
    - Style the timer display, Start/Stop/Reset buttons, sort select, link buttons, theme toggle, name form, and duration config input
    - Use CSS custom properties (`var(--color-*)`) throughout — no hard-coded colour values outside variable declarations
    - _Requirements: 7.2, 1.5_

- [x] 13. Final checkpoint — Full integration and cross-browser validation
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for traceability
- Property tests use **fast-check** with **Vitest** as the test runner; run with `vitest --run` for single execution
- Checkpoints ensure incremental validation at logical breaks in the build
- The five optional features (Requirements 7–11) are woven into the core tasks rather than isolated — this ensures they are integrated cleanly rather than bolted on
- All storage writes happen synchronously before the next interaction is processed (Requirement 2.5)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "4.1", "5.1"] },
    { "id": 2, "tasks": ["4.2", "5.2", "7.1"] },
    { "id": 3, "tasks": ["7.2", "7.3", "7.4", "8.1", "10.1", "11.1"] },
    { "id": 4, "tasks": ["7.5", "7.6", "8.2", "8.3", "10.2", "10.3", "12.1"] },
    { "id": 5, "tasks": ["7.7", "7.8"] }
  ]
}
```
