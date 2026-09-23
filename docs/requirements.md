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

### Initial Module Types

The MVP supports the following module types:

- Reading material
- Multiple-choice questions
- Concept-to-definition matching

Future module types are intentionally out of scope for the MVP.

## Future Requirements

The following concepts are planned for future iterations but should not
be implemented unless explicitly requested.

### User Accounts

- Users should eventually have accounts.
- Authentication should eventually support Google.
- Revision activities, results, and progress should eventually be
  associated with users.

### Results and Progress

- The application should eventually save the results of completed
  revision activities.
- The application should eventually track learning progress over time.

### Additional Module Types

Future module types may include:

- True/false questions
- Short-answer questions
- Flashcards
- Ordering exercises
- Fill-in-the-blank exercises

### Personal and Public Activities

- Revision activities should eventually be either personal (visible
  only to their owner) or public.
- The activity list should then also be filtered by this visibility.
- This depends on user accounts.