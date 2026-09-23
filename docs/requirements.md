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
