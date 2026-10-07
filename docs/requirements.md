# Requirements

## Current Product

The application is a web platform for creating and completing structured
revision activities.

A revision activity is composed of an ordered series of revision modules.

## MVP

The first version should allow a user to:

1. Create a revision activity.
2. View existing revision activities.
3. Open a revision activity and complete it.

### Themes

- Each revision activity has one or more themes (subject categories).
- Themes are entered by name when creating an activity.
- An existing theme with the same name, ignoring case, is reused.
- Themes are used to organize and find revision activities.

### Courses

- A revision activity can be part of any number of courses, including
  none, so an activity can be reused in several courses.
- A course is a specific kind of theme. Courses are entered by name
  when creating an activity, and an existing course with the same name,
  ignoring case, is reused.
- Courses do not count toward the required theme, and a course and a
  theme can have the same name.

### Finding Activities

- The list of activities is paginated, newest first.
- The list can be filtered by:
  - title (contains the text, ignoring case and accents);
  - one course, chosen from a list that can be searched by typing;
  - any number of themes, chosen the same way.
- Every filter that is set narrows the result: an activity is listed
  only if it matches all of them, and it must have all the selected
  themes.
- Filtering and pagination are done by the server.

### User Accounts

- A visitor can create an account with an email address, a password and
  a display name, then sign in and sign out.
- The email address is unique (ignoring case) and is used to sign in.
  The display name is shown in the application.
- Passwords have at least 12 characters. After 5 failed sign-ins, the
  account is locked for 15 minutes.
- A signed-in user can change their password; their other sessions are
  signed out.
- Visitors who are not signed in can still browse and complete activities.

### Private and Public Activities

- Every signed-in user can create private activities, which only they
  can see. Visitors who are not signed in cannot create activities.
- Only admins can create public activities, which everyone sees,
  including visitors. Public activities have no owner.
- Admins do not see the private activities of other users.
- The seed activities are public.
- Signed-in users can filter the list by visibility (public or their own
  private activities).
- Visitors cannot save their results (saving results is a future
  requirement).

### Editing and Deleting Activities

- Every user can edit and delete their own private activities.
- Admins can edit and delete every public activity, and change the
  visibility of an activity: an activity made public loses its owner,
  and a public activity made private belongs to the admin who changed it.
- The application records who last edited a public activity; the
  people who can change it see this on the activity page.
- The Edit and Delete actions appear only on the activity page, only to
  the people who can change the activity.
- Deleting an activity is permanent and asks for confirmation.
- Editing keeps the identity of the modules, choices and pairs that are
  kept, so that the results saved later still refer to them.
- Two admins editing the same public activity at the same time are not
  detected: the last one to save wins.

### Saved Results

- When a signed-in user completes an activity, their result is saved
  automatically: the score of each module and the global score. The
  answers themselves are not saved. Visitors' results are not saved.
- The scores are computed by the browser.
- Each completion is a new attempt; attempts cannot be changed or
  deleted by the user. They are deleted with the user's account.
- A saved result does not change when the activity changes afterwards:
  for each attempt, the user always sees the score of each module and
  the global score as they were, computed from the modules that existed
  when the activity was completed. Editing or deleting the activity, or
  some of its modules, later does not modify or delete past results.
- The user sees their results on a My results page, and their latest
  results for an activity on its page. Nobody else sees them, not even
  admins.

### Roles and Administration

- Roles are stored in their own table so that new roles can be added;
  a user can have several roles. The first role is `admin`; a user
  without a role is a regular user.
- The first admin is appointed with a command run on the server. After
  that, admins give and remove roles on an administration page.
- The last admin cannot lose the admin role, and an admin cannot remove
  their own admin role.
- Every role change is recorded: which user, which role, granted or
  removed, by whom (an admin, or a command on the server) and when.
  Admins can read this history on the administration page.
- An admin with access to the server resets a forgotten password with a
  command, which gives a temporary password to send to the user.

### Trivia Game

- A separate page, reached from a **Trivia game** drop-down menu in the
  header: *Play* for everyone, *My scores* for signed-in users.
- The player chooses 1 to 3 themes (not courses). The questions are the
  multiple-choice modules of the **public** activities that have at
  least one of these themes; private activities are never used, not
  even the player's own.
- The questions come in a random order, each at most once per game. A
  wrong answer ends the game, after showing the correct answer; answering
  every question correctly ends it too (a perfect game).
- The score is the number of correct answers in a row.
- Anyone can play. For signed-in users, the final score is saved with
  the chosen themes and the date; scores cannot be changed or deleted,
  and only their owner sees them, with their best score.

### Typing Test

- A separate game, **independent of the activities**, reached from a
  **Typing test** drop-down menu in the header: *Play* and *How WPM
  works* for everyone, *My results* for signed-in users.
- The game will have several modes, built from shared pieces. The first
  mode is a **timed test** of 1, 2 or 5 minutes; the clock starts with
  the first key.
- The text is made of random paragraphs of about 100 words from a bank
  of English texts on: SOLID, object-oriented vs functional vs
  structured programming, Agile and Scrum, testing practices, Linux vs
  Windows vs macOS, and computer hardware.
- Mistakes are shown in red and can be corrected with Backspace. Only
  correct characters count toward the speed, in words per minute (a
  word is 5 characters).
- A side panel shows the current speed (over the last 10 seconds) at
  all times, colored by level: grey, then green, red, and bold black
  for the fastest speeds.
- At the end, the test shows the average speed, the highest speed
  (measured after the first 5 seconds) and the accuracy. For signed-in
  users, the average and highest speeds are saved with the kind of test
  and the date; only their owner sees them.
- The *How WPM works* page explains the calculation and the speeds
  considered good by age and by kind of work. All texts are in English.

### Initial Module Types

The MVP supports the following module types:

- Reading material
- Multiple-choice questions
- Concept-to-definition matching

Future module types are intentionally out of scope for the MVP.

## Future Requirements

The following concepts are planned for future iterations but should not
be implemented unless explicitly requested.

### Password Reset by Email

- Users should eventually be able to reset a forgotten password
  themselves, with a link sent by email. This needs an email sending
  service and email address confirmation.
- Until then, an administrator resets the password with a command.

### Google Sign-In

- Signing in with a Google account may be added later, next to email
  and password.

### Learning Progress

- The application should eventually track learning progress over time,
  from the saved results.

### Additional Module Types

Future module types may include:

- True/false questions
- Short-answer questions
- Flashcards
- Ordering exercises
- Fill-in-the-blank exercises
