# Contributing Guide

This document describes how to work on [Project Name].

## Development Setup

### Prerequisites

- Node.js (LTS)
- Git

### Getting Started
Via SSH:
```bash
git clone git@github.com:UoB-COMSM0166/2026-group-16.git
cd [repo]
npm install
npm run dev
```

By default the game runs at `http://localhost:3000`

## Workflow

### Branching

We use trunk-based development with short-lived feature branches:

- `main` — always deployable
- `feature/[issue-number]-short-description` — for new work
- `Fix/[issue-number]-short-description` — for bug fixes

See guidance from git for (_small private teams_) [https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project]

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(player): add jump mechanic`
- `fix(collision): resolve wall clipping bug`
- `docs(readme): update setup instructions`

- Commits are enforced by (commitlint)[https://github.com/conventional-changelog/commitlint] via a  pre-commit hook [TODO].
- Commit <description> and [optional body] must use the imperative tense (additional guidance)[https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html]

### Pull Requests

1. Create a branch from `main`
2. Make your changes with conventional commits
3. Open a PR against `main`
4. Request review from at least one team member
5. Address feedback
6. Squash and merge once approved

PRs should reference the relevant Github issue: `Closes #42` e.g.:
```
## Summary
Adds double-jump mechanic

Closes #42
```


### Definition of Done

A feature is done when:

- [ ] Code complete and working locally
- [ ] Unit tests pass
- [ ] Linting passes (`npm run lint`)
- [ ] PR reviewed and approved
- [ ] Merged to `main`
- [ ] CI pipeline succeeds

## Tooling

| Concern         | Tool                                      | Notes                         |
|-----------------|-------------------------------------------|-------------------------------|
| Language        | JavaScript (p5.js)                        |                               |
| Version control | Git + GitHub                              |                               |
| Issue tracking  | GitHub Issues + Projects                  | Kanban board                  |
| CI/CD           | GitHub Actions                            | Lint, test, deploy            |
| Commits         | commitlint + husky                        | Enforces conventional commits |
| Versioning      | [Semantic Versioning](https://semver.org) | Automated w/                  |
| Linting         | ESLint + Prettier                         | TODOO add config              |
| Diagramming     | C4                                        | `/docs/design/c4/`            |
| Prototyping     | Figma                                     | Link: [TBD]                   |

TODO: See [ADR-0001](docs/adr/0001-tooling-choices.md) for rationale.

## Project Structure

```
.
├── src/                    # Game source code
│   ├── sketch.js           # Main p5.js sketch
│   └── ...
├── docs/
│   ├── adr/                # Architecture Decision Records
│   ├── design/             # C4 diagrams, storyboards
│   ├── testing/
|   └── CONTRIBUTING.md     # This file
├── .github/
│   └── workflows/          # CI/CD pipelines
└── package.json

```

## Decision Records

We document significant decisions in Architecture Decision Records (ADRs).

- Location: `/docs/adr/`
- Format: [Nygard template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- Naming: `NNNN-short-title.md` (zero-padded)

To propose a decision, create a new ADR with status `proposed` and open a PR.

See [ADR-0000](docs/adr/0000-use-adrs.md) for the decision to use ADRs.

## Testing

### Automated

- TODO: search static analysis ESLint?
- TODO: Search unit test framework

### Manual

- Playtest using (think-aloud protocol)[https://www.sciencedirect.com/topics/computer-science/think-aloud-protocol]
- Documented in `/docs/testing/`

## Development Lifecycle

1. Requirements: TODO: storyboards in Figma
2. Design: whitebox prototype, C4 diagrams
3. Sprints: 1-week iterations
4. Review: pull requests,  playtesting and
5. Retrospective: [frequency TBD] stored in [/docs/retrospectives].

## Getting Help

- Check existing issues and ADRs first
- Ask in team whatsapp group
- When stuck, pair-up  with a teammate
