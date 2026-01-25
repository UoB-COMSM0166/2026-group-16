# ADR-0000: Use Architecture Decision Records

## Status

Accepted

## Context

We are a small team working on a game development project for (COMSM0166)[https://upc.bristol.ac.uk/unit-programme-catalogue/UnitDetails.jsa?ayrCode=26%2F27&unitCode=COMSM0166], the module requires we demonstrate understanding of engineering practices including documentation, design techniques and agile best practice.

Several forces are at play:

- Team members rotate through different parts of the codebase and need to understand why decisions were made
- The module assessment values evidence of decision-making
- We need lightweight documentation that doesn't create overhead
- Decisions made early in the project will constrain later work, and the rationale may be forgotten

## Decision

We will use (Architecture Decision Records)[https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions] (ADRs) to document architecturally significant decisions.

We will follow the Nygard format:
- **Title**: Short noun phrase (in filename and heading)
- **Status**: `proposed`, `accepted`, `deprecated`, or `superseded`
- **Context**: The forces at play, stated neutrally
- **Decision**: What we will do, stated in active voice
- **Consequences**: All effects (positive, negative, neutral)

We will store ADRs in `/docs/adr/` as Markdown files, named `NNNN-short-title.md` with zero-padded numbers.

New ADRs start as `proposed` and are submitted via pull request. Once reviewed status changes to `accepted` or `rejected` and are merged. If a decision is later reversed, the original ADR is marked `superseded` with a link to the new ADR.

We will document decisions that:
- Affect the *structure* of the codebase
- Constrain future implementation choices
- Involve selection of tools, libraries, or frameworks
- Establish team work practice or conventions

We will not document:
- implementation details
- Decisions that can be trivially reversed
- Matters already covered by existing conventions (e.g., code style enforced by linter)

## Consequences

**Positive:**
- Our future selves can understand why decisions were made
- The PR process ensures decisions are reviewed before acceptance
- We communicate evidence of practice, continously
- Documentation stays in sync with code

**Negative:**
- Small overhead to write ADRs for significant decisions
- Risk of over-documenting if we're not disciplined about scope

**Neutral:**
- ADRs are append-only; we don't delete old decisions. Decisions that are replaced are marked as superseded
- This is our first ADR, so the format may evolve
