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

### Organization

The application may eventually provide more structured organization
of revision activities, potentially by course and/or subject.

The exact relationship between courses, subjects, and themes has not yet
been decided.