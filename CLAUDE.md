# Course Revision Platform

## Project Overview

This project is a web application designed to help students study and
review course material through structured revision activities.

The application should be useful in practice while remaining simple,
maintainable, testable, and extensible.

The project is also used as a learning project for professional
software development and AI-assisted development with Claude Code.

## Core Concept

A revision activity is an ordered collection of revision modules.

Each module represents a specific learning interaction and has a
defined module type.

The module system must allow new module types to be introduced
without requiring major changes to unrelated existing functionality.

Module-specific behavior should remain isolated while all modules
follow a consistent application-level contract where appropriate.

## Technology Stack

### Frontend

- Angular
- TypeScript
- Use Angular conventions and established patterns.
- Keep presentation logic separate from business logic.

### Backend

- C#
- ASP.NET Core
- REST API

### Database

- MySQL

### Development Tools

- Git
- Makefile

The Makefile must be kept up to date as development commands are added
or changed.

Common development tasks should be accessible through the Makefile
whenever practical.

## Architecture Principles

- Prefer simple and explicit designs.
- Avoid premature abstraction.
- Avoid over-engineering.
- Keep responsibilities clearly separated.
- Favor maintainability over cleverness.
- Prefer established framework conventions unless there is a good reason
  not to.
- Keep business logic out of the presentation layer.
- Keep database-specific concerns isolated from business logic where
  appropriate.
- Design module types so that new types can be added without modifying
  unrelated existing functionality.

When multiple architectural approaches are reasonable, explain the
trade-offs before implementing a significant architectural decision.

## Revision Activity Model

A revision activity is composed of an ordered collection of modules.

Each module has a specific type and contains the information required
to display and complete that module.

The module system should be designed with extensibility in mind.

Avoid designing the system around a fixed list of module types if doing
so would make future module types difficult to introduce.

When adding a new module type:

- avoid unnecessary changes to existing module types;
- keep module-specific logic isolated;
- preserve a consistent interface or contract where appropriate;
- add appropriate tests.

Do not introduce a complex plugin or dynamic module system unless the
requirements actually justify it.

## Development Workflow

Before implementing a significant feature:

1. Inspect the relevant existing code.
2. Understand the current architecture and data flow.
3. Identify relevant dependencies and potential side effects.
4. Clarify missing requirements when necessary.
5. Propose a concise implementation approach.
6. Implement the change.
7. Run the relevant tests.
8. Verify that existing functionality still works.
9. Review the resulting Git diff.

For small, straightforward changes, do not produce an unnecessarily
large plan.

Do not modify unrelated code while implementing a feature.

## Investigation Rules

Before making claims about the existing codebase:

- inspect the relevant files;
- follow important references and dependencies;
- verify assumptions against the actual implementation.

Do not speculate about code that has not been inspected.

Never claim that a test, command, build, or application behavior was
verified unless it was actually verified.

## Testing

Tests are part of the implementation, not an optional final step.

Significant new functionality should include appropriate tests.

Tests should verify behavior rather than implementation details whenever
possible.

Never modify or remove a test simply to make the implementation pass.

If an existing test appears incorrect, explain why before changing it.

Before considering a significant task complete:

- build the affected components;
- run the relevant tests;
- investigate failures;
- verify the final Git diff.

## Git Workflow

The project uses two main branches:

- `production`: contains stable, release-ready code.
- `development`: contains the latest integrated development work.

### Feature Branches

New features and non-trivial changes should be developed in a dedicated
branch created from `development`.

Use descriptive branch names such as:

- `feature/create-revision-activity`
- `feature/reading-module`
- `feature/multiple-choice-module`
- `fix/revision-activity-validation`

Do not commit feature work directly to `production`.

### Commits

Use Conventional Commits for all commits.

Each atomic piece of functionality should result in a separate commit.

Examples:

- `feat: add revision activity creation`
- `feat: add reading module`
- `feat: add multiple choice module`
- `fix: validate empty revision activities`
- `test: add revision activity creation tests`
- `refactor: simplify revision module handling`

A commit should represent one coherent, working change whenever
reasonably possible.

Avoid large commits containing multiple unrelated changes.

### Merging

Feature branches should be merged into `development` when the feature
is complete and the relevant tests pass.

`production` should only receive stable, tested changes from
`development`.

Do not merge or push to `production` without explicit approval.

### Safety

Before committing:

1. Review the Git diff.
2. Verify that unrelated changes are not included.
3. Run the relevant tests.
4. Confirm that the commit contains only the intended atomic change.

Never use destructive Git commands such as `git reset --hard`,
force-pushing, or deleting branches without explicit approval.

## Makefile

The Makefile is part of the project and must remain accurate.

Whenever development commands change:

- update the Makefile when appropriate;
- keep command names clear and predictable;
- avoid duplicating complex command logic unnecessarily.

The Makefile should provide convenient commands for common tasks such
as building, testing, running the application, and other recurring
development operations.

Never leave documented Makefile commands pointing to obsolete commands.

## Documentation

Keep documentation synchronized with the implementation.

Update documentation when a change affects:

- project setup;
- development commands;
- architecture;
- API behavior;
- database structure;
- important development workflows.

Do not create documentation for trivial implementation details that are
already clear from the code.

## Code Quality

- Prefer readable code over clever code.
- Use meaningful names.
- Keep functions and classes focused.
- Avoid unnecessary duplication.
- Avoid unnecessary dependencies.
- Follow the conventions of the chosen frameworks.
- Keep changes as small as reasonably possible.

Do not refactor unrelated code while implementing a feature unless the
refactoring is necessary for the requested change.

## Dependencies

Do not introduce a new dependency without a clear reason.

Before adding a dependency:

1. Check whether the existing stack already provides the required
   functionality.
2. Consider whether the dependency is actively maintained and
   appropriate for the project.
3. Explain the reason when the dependency has a meaningful architectural
   impact.

## Communication

When a requirement is ambiguous and the ambiguity could affect the
architecture or behavior, ask for clarification rather than making a
major assumption.

When several reasonable solutions exist:

- briefly explain the relevant trade-offs;
- recommend an approach based on the project's stated principles;
- wait for confirmation when the decision has significant architectural
  consequences.

For routine implementation details, use reasonable judgment without
unnecessary back-and-forth.

## Scope Control

Implement only what is requested.

Do not add:

- authentication;
- authorization;
- user profiles;
- analytics;
- notifications;
- advanced administration;
- additional revision module types;
- deployment infrastructure;

unless explicitly requested.

The application should remain intentionally small during the initial
iterations.

## Important Principle

The goal is not to maximize the amount of code produced.

The goal is to build a small, well-structured application that can
evolve safely as new revision module types and features are introduced.