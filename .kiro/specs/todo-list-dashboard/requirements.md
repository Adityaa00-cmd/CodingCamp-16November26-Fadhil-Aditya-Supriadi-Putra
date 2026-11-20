# Requirements Document

## Introduction

The To-Do List Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub in a single browser tab: a live clock with a contextual greeting, a Pomodoro-style focus timer, a task manager backed by Local Storage, and a Quick Links launcher. All data persists entirely in the browser with no backend server. The application may be used as a standalone web page or packaged as a browser extension.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Task**: A user-defined to-do item with a text description and a completion state.
- **Task_List**: The collection of Tasks managed by the Dashboard.
- **Focus_Timer**: The countdown timer component targeting a configurable Pomodoro interval.
- **Quick_Links**: The collection of user-saved shortcut URLs displayed as clickable buttons.
- **Local_Storage**: The browser's `localStorage` API used for all client-side persistence.
- **Greeting_Widget**: The UI component that displays the current time, date, and time-of-day greeting.
- **Theme**: The visual mode of the Dashboard — either `light` or `dark`.
- **Pomodoro_Duration**: The configurable countdown length for the Focus_Timer, defaulting to 25 minutes.
- **User_Name**: An optional display name entered by the user and shown in the greeting.

---

## Requirements

### Requirement 1: Technology Stack

**User Story:** As a developer, I want the Dashboard built with HTML, CSS, and Vanilla JavaScript only, so that it runs in any modern browser without build tools or dependencies.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript, with no external frameworks, libraries, or scripts loaded from remote URLs (including CDN-hosted resources).
2. THE Dashboard SHALL require no backend server and no build step to run.
3. THE Dashboard SHALL function correctly in Chrome 120+, Firefox 120+, Edge 120+, and Safari 17+.
4. THE Dashboard SHALL complete initial load and have all user interaction handlers attached within 2 seconds of the browser's navigation start event when opened from a local file system.
5. THE Dashboard SHALL use exactly one CSS file and exactly one JavaScript file, each bundled as a local file within the project directory.

---

### Requirement 2: Data Persistence

**User Story:** As a user, I want my tasks, quick links, and preferences saved automatically, so that my data is still there when I reopen the browser.

#### Acceptance Criteria

1. THE Dashboard SHALL store all persistent data exclusively in Local_Storage using the browser `localStorage` API.
2. WHEN the user closes and reopens the Dashboard, THE Dashboard SHALL restore all Tasks, Quick_Links, User_Name, Theme, and Pomodoro_Duration from Local_Storage without any action from the user.
3. WHEN Local_Storage data is absent or fails JSON parsing, THE Dashboard SHALL initialise Tasks and Quick_Links to empty arrays, User_Name to an empty string, Theme to `light`, and Pomodoro_Duration to 25 minutes, without throwing an error.
4. WHEN a stored value is present but its type does not match the expected type for that field, THE Dashboard SHALL discard that field's value and apply the default for that field as specified in criterion 3.
5. WHEN any persistent data changes, THE Dashboard SHALL write the updated value to Local_Storage immediately, before the next user interaction is processed.

---

### Requirement 3: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a greeting when I open the Dashboard, so that I have immediate context for my day.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM 24-hour format, reflecting the user's local clock.
2. WHEN the system clock advances to a new minute, THE Greeting_Widget SHALL update the displayed time to the current HH:MM value.
3. THE Greeting_Widget SHALL display the current date in the format: full weekday name, day of month as a number, full month name, and four-digit year (e.g., Monday, 16 November 2026).
4. IF the local hour is between 05 and 11 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Morning".
5. IF the local hour is between 12 and 17 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon".
6. IF the local hour is between 18 and 20 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Evening".
7. IF the local hour is between 21 and 23 inclusive, or between 00 and 04 inclusive, THEN THE Greeting_Widget SHALL display the greeting "Good Night".

---

### Requirement 4: Focus Timer

**User Story:** As a user, I want a countdown timer I can start, stop, and reset, so that I can work in focused Pomodoro sessions.

#### Acceptance Criteria

1. WHILE the Focus_Timer is in any state (running, stopped, or reset), THE Focus_Timer SHALL display the remaining time in MM:SS format.
2. WHEN the Focus_Timer is in the stopped or reset state, THE Dashboard SHALL display a Start button that begins the countdown.
3. WHEN the Focus_Timer is running, THE Dashboard SHALL display a Stop button that pauses the countdown without resetting it.
4. WHEN the user activates the Reset control, THE Dashboard SHALL return the Focus_Timer to the full Pomodoro_Duration and transition to the reset state, regardless of whether the timer is running or stopped.
5. WHEN the Focus_Timer reaches 00:00, THE Dashboard SHALL trigger an audible alert and, if the browser has notification permission, a browser notification, to inform the user that the session has ended.
6. WHEN the Focus_Timer reaches 00:00, THE Dashboard SHALL stop the countdown automatically and transition the Focus_Timer to the reset state.
7. THE Focus_Timer SHALL default to a Pomodoro_Duration of 25 minutes (1500 seconds).

---

### Requirement 5: Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a list, so that I can track what I need to do.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task description of 1 to 500 characters, THE Task_List SHALL add a new Task with that description, a unique identifier, a creation timestamp, and a default completion state of incomplete.
2. WHEN the user activates the edit action on a Task, THE Dashboard SHALL display the existing Task description in an editable field and allow the user to save the updated text, provided the updated description is between 1 and 500 characters.
3. WHEN the user saves an edited Task, THE Dashboard SHALL replace the previous description with the updated text and retain the Task's completion state and unique identifier unchanged.
4. WHEN the user marks a Task as done, THE Dashboard SHALL visually distinguish the Task as completed using strikethrough text applied to the Task description.
5. WHEN the user marks a completed Task as incomplete, THE Dashboard SHALL remove the strikethrough visual distinction from the Task description and restore the Task to incomplete state.
6. WHEN the user deletes a Task, THE Task_List SHALL remove that Task permanently and THE Dashboard SHALL no longer display that Task.
7. WHEN the Task_List changes due to add, edit, complete, or delete, THE Dashboard SHALL write the full updated Task_List to Local_Storage before the next user interaction is processed.
8. IF the user submits an empty task description, THEN THE Dashboard SHALL not add a Task and SHALL display an inline validation message below the input field indicating the description is required.
9. IF the user saves an edited Task description that is empty, THEN THE Dashboard SHALL not save the change, SHALL retain the original Task description, and SHALL display an inline validation message indicating the description is required.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and launch favourite website shortcuts from the Dashboard, so that I can open them with one click.

#### Acceptance Criteria

1. WHEN the user provides a URL (maximum 2048 characters) and an optional label (maximum 50 characters), THE Dashboard SHALL add a new Quick_Links entry and display it as a button, using the URL as the button label if no label is provided.
2. WHEN the user clicks a Quick_Links button, THE Dashboard SHALL open the saved URL in a new browser tab.
3. WHEN the user deletes a Quick_Links entry, THE Dashboard SHALL remove the corresponding button.
4. WHEN Quick_Links change (add or delete), THE Dashboard SHALL write the updated Quick_Links collection to Local_Storage.
5. IF the user submits a Quick_Links URL that does not begin with `http://` or `https://` followed by at least one valid domain segment, THEN THE Dashboard SHALL not add the entry and SHALL display an inline validation message indicating the URL is invalid.
6. IF the user attempts to add a Quick_Links entry when 20 entries already exist, THEN THE Dashboard SHALL not add the entry and SHALL display an inline message indicating the maximum number of shortcuts has been reached.

---

### Requirement 7: Light / Dark Mode (Optional)

**User Story:** As a user, I want to switch between light and dark themes, so that I can reduce eye strain in low-light environments.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches the Theme between `light` and `dark`.
2. WHEN the Theme changes, THE Dashboard SHALL apply the corresponding colour scheme to all visible components within 100 milliseconds and without a page reload.
3. WHEN the user reopens the Dashboard, THE Dashboard SHALL restore the previously saved Theme from Local_Storage.
4. THE Dashboard SHALL default to the `light` Theme when no saved Theme is found in Local_Storage.
5. IF the value read from Local_Storage for the Theme is not `light` or `dark`, THEN THE Dashboard SHALL default to the `light` Theme and overwrite the invalid stored value.

---

### Requirement 8: Custom Name in Greeting (Optional)

**User Story:** As a user, I want to enter my name so the greeting addresses me personally, so that the Dashboard feels tailored to me.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field where the user can enter a User_Name of between 1 and 50 characters.
2. WHEN the user submits the User_Name input field (via Enter key or a confirm action), THE Dashboard SHALL trim leading and trailing whitespace from the entered value before saving it.
3. IF the User_Name value after trimming is empty, THEN THE Dashboard SHALL treat it as no User_Name being set and clear any previously saved User_Name from Local_Storage.
4. WHEN a User_Name is set, THE Greeting_Widget SHALL include the User_Name in the greeting (e.g., "Good Morning, Alex").
5. WHEN the User_Name changes, THE Dashboard SHALL write the updated User_Name to Local_Storage.
6. WHEN no User_Name is saved, THE Greeting_Widget SHALL display the greeting without a name.

---

### Requirement 9: Configurable Pomodoro Duration (Optional)

**User Story:** As a user, I want to change the Focus_Timer duration, so that I can adapt it to my preferred work interval.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input that allows the user to set the Pomodoro_Duration in whole minutes to a value between 1 and 120 inclusive.
2. WHEN the user submits a new Pomodoro_Duration (via a save/confirm action), THE Focus_Timer SHALL reset to the new duration regardless of whether a countdown is in progress.
3. WHEN the user saves a new Pomodoro_Duration, THE Dashboard SHALL write the updated value to Local_Storage.
4. IF the user submits a Pomodoro_Duration outside the range 1–120 or a non-integer value, THEN THE Dashboard SHALL reject the input, retain the previous Pomodoro_Duration, and display an inline validation message adjacent to the input field within 500 milliseconds.

---

### Requirement 10: Prevent Duplicate Tasks (Optional)

**User Story:** As a user, I want the Dashboard to warn me before adding a task that already exists, so that I do not clutter my list with duplicates.

#### Acceptance Criteria

1. WHEN the user submits a task description that matches the full trimmed description of any existing Task in the Task_List (case-insensitive, regardless of the Task's completion state), THE Dashboard SHALL display a duplicate warning message before adding the Task.
2. WHEN the duplicate warning is displayed, THE Dashboard SHALL allow the user to confirm the addition or cancel it.
3. WHEN the user confirms the addition despite the duplicate warning, THE Task_List SHALL add the Task and dismiss the warning message.
4. WHEN the user cancels the addition, THE Task_List SHALL not add the Task and THE Dashboard SHALL dismiss the warning message.

---

### Requirement 11: Sort Tasks (Optional)

**User Story:** As a user, I want to sort my task list, so that I can prioritise or review tasks more efficiently.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a sort control with three options: "Alphabetical", "Completion Status", and "Date Added".
2. WHEN the user selects the "Alphabetical" sort order, THE Task_List SHALL display Tasks sorted by description in ascending alphabetical order using case-insensitive comparison, with Tasks sharing identical descriptions ordered by date added oldest first.
3. WHEN the user selects the "Completion Status" sort order, THE Task_List SHALL display incomplete Tasks before completed Tasks, with Tasks within each group ordered by date added oldest first.
4. WHEN the user selects the "Date Added" sort order, THE Task_List SHALL display Tasks in the order they were originally created, oldest first.
5. WHEN the sort order changes, THE Dashboard SHALL re-render the Task_List immediately without a page reload.
