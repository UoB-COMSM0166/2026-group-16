================================================================================
                                    DINS
                                Depedency Is Not Stable
                              Game Concept Document
================================================================================

0. PREAMBLE
--------------------------------------------------------------------------------

The purpose of a game concept  document is to enable thoughtful discussion and
ideation of potential game designs and is an established practice in agile
game development. The concept selection phase has two parts:

0.1 Divergence

Brainstorming  will generate a handful of interesting candidates that provide
novel twists on familiar genres of games. Candidates are documented as one-page
concept notes following industry practice (Nuclino, 2024; GameDeveloper, 2023).

0.2 Convergence

Concepts will be evaluated against module learning objectives, with high scoring
concepts subject to A/B testing and/or team vote to select a winner.


1. CONCEPT
--------------------------------------------------------------------------------

1.1 Statement

DINS (Dependency Is Not Stable) is an tower-building game that translates
the fragility of modern software developemnt into visceral physics-based
gameplay. Players construct and maintain a tower of software dependencies,
balancing rapid growth against inevitable decay - until catastrophic collapse.


1.2 Inspiration

The game is based on xkcd #2347 "Dependency" (Munroe, 2020). The comic
comments on the instability of modern sofware practices by depicting a
tower of digital infrastructure, pracariously propped up by "a project some
random person in Nebraska has been thanklessly maintaining since 2003."

The concept  builds on the module's opening lecture of "software crisis" and
echoes real-world examples like  the left-pad crisis (2016) were the removal
of the 11-line npm package broke thousands of projects including Facebook
and Netflix.


1.3 The Twist

DINS borrows the spatial quality of tetris and the instability of Jenga while
adding time as a core mechanic:  blocks age, rot and demand attention. The game
is also reflexively meta: we demonstrate software engineering competence by
building a game about software engineering failure.


1.4 Working Title

"DINS" uses the tradition of recursive acronyms in computer science (GNU's Not
Unix, WINE Is Not an Emulator) to add a layer of irony to the game's story.


1.5 Alternative Titles

  STACKS    Software Towers Always Collapse, Keep Stacking

  YAG       Yet Another Game

  FOSS      Falling Open Source Software


================================================================================


2. REQUIREMENTS (OPTIONAL)
--------------------------------------------------------------------------------

I have written the below section mainly as a draft to a more formal game design
document (GDD). It is has been tacked on to this document for comment, and is
optional, every concept note  does not need to replicate this.


2.1 MoSCoW Prioritisation

 Feature prioritisation using MoSCoW analysis, could look similar to:

  MUST HAVE     Core gameplay loop (block placement, decay, collapse)
                Minimum viable scoring system
                Basic physics simulation

  SHOULD HAVE   Choose your fighter  selection mechanic
                Multiple block types with distinct behaviours
                Spectacular failure animations

  COULD HAVE    Leaderboard persistence
                Sound design / music
                Tutorial sequence

  WON'T HAVE    Multiplayer (this iteration)
                Procedural block generation

This prioritisation will be refined in sprint planning.


2.2 Theoretical Grounding

User stories were  derived from Self-Determination Theory (SDT), (Ryan, Rigby &
Przybylski, 2006). SDT identifies three basic psychological needs that drive
engagement:

  ┌─────────────┬─────────────────────────────────┬──────────────────────────┐
  │ Need        │ Definition                      │ Game Application         │
  ├─────────────┼─────────────────────────────────┼──────────────────────────┤
  │ Autonomy    │ Sense of choice and             │ Strategic decisions      │
  │             │ self-direction                  │ about block placement,   │
  │             │                                 │ maintenance priorities   │
  ├─────────────┼─────────────────────────────────┼──────────────────────────┤
  │ Competence  │ Experience of mastery           │ Skill progression in     │
  │             │ and growth                      │ balancing build vs.      │
  │             │                                 │ maintain; score growth   │
  ├─────────────┼─────────────────────────────────┼──────────────────────────┤
  │ Relatedness │ Connection to others or         │ Satirical recognition    │
  │             │ meaningful context              │ of shared developer      │
  │             │                                 │ experience; team select  │
  └─────────────┴─────────────────────────────────┴──────────────────────────┘

2.3 Use Case Diagram

Primary actor: Player

  • Start Game → Select team composition
  • Place Block → Position falling dependency block
  • Maintain Block → Click degrading blocks to patch
  • View Score → Monitor funding/points
  • End Game → Witness spectacular collapse

[Diagram to be included in GDD appendix]


2.4 User Stories

Stories derived from SDT motivational dimensions and core gameplay loop:

  ┌───────┬──────────────────────────────────────┬─────────────┬─────────────┐
  │ ID    │ User Story                           │ SDT Need    │ Acceptance  │
  │       │                                      │             │ Criteria    │
  ├───────┼──────────────────────────────────────┼─────────────┼─────────────┤
  │ US-01 │ As a player, I want to place blocks  │ Autonomy    │ Blocks can  │
  │       │ strategically so that I can build a  │             │ be rotated  │
  │       │ stable tower                         │             │ and placed; │
  │       │                                      │             │ placement   │
  │       │                                      │             │ affects     │
  │       │                                      │             │ stability   │
  ├───────┼──────────────────────────────────────┼─────────────┼─────────────┤
  │ US-02 │ As a player, I want clear feedback   │ Competence  │ Real-time   │
  │       │ on my tower height and score so that │             │ score; vis- │
  │       │ I feel progress                      │             │ ual tower   │
  │       │                                      │             │ growth      │
  ├───────┼──────────────────────────────────────┼─────────────┼─────────────┤
  │ US-03 │ As a player, I want to see blocks    │ Competence  │ Colour/     │
  │       │ degrade over time so that I must     │             │ shake when  │
  │       │ actively maintain my tower           │             │ degrading;  │
  │       │                                      │             │ click to    │
  │       │                                      │             │ patch       │
  ├───────┼──────────────────────────────────────┼─────────────┼─────────────┤
  │ US-04 │ As a player, I want to select my     │ Autonomy +  │ Character   │
  │       │ team before playing so that I feel   │ Relatedness │ selection   │
  │       │ ownership                            │             │ screen;     │
  │       │                                      │             │ team mods   │
  ├───────┼──────────────────────────────────────┼─────────────┼─────────────┤
  | US-O5 | As a player, I want increasingly     | Competence  | Blocks cha- |
  |       | difficult blocks to place to show    |             | ge size and |
  |       | mastery                              |             | complexity  |
  ├───────┼──────────────────────────────────────┼─────────────┼─────────────┤
  │ US-05 │ As a player, I want a spectacular    │ Relatedness │ Physics     │
  │       │ failure animation so that end        │             │ ragdoll;    │
  │       │ feels meaningful                     │             │ error msg   │
  │       │                                      │             │ overlay     │
  └───────┴──────────────────────────────────────┴─────────────┴─────────────┘


================================================================================


3. GAMEPLAY OVERVIEW
--------------------------------------------------------------------------------

3.1 Core Loop

  1. BUILD:     Awkwardly-shaped blocks fall; player positions them to
                maximise tower height

  2. MAINTAIN:  Older blocks decay; player clicks to "patch" them before
                failure

  3. SCORE:     Tower height → Funding (points)

  4. COLLAPSE:  Inevitable failure triggers physics-based destruction sequence


3.2 Block Types

  • Legacy Blocks:   Large, stable foundations
                     ("COBOL", "C89", "jQuery 1.x")

  • Modern Blocks:   Irregular shapes, faster decay
                     ("left-pad", "is-odd", "event-stream")

  • Buzzword Blocks: Oversized, unstable
                     ("AI-Powered", "Web3", "Blockchain")


3.3 Decay Mechanic

  • Blocks age in real-time; labels update
    ("React 16" → "React 16 (legacy)" → "React 16 (unmaintained)")

  • Visual indicators: colour shift (green → yellow → red), shake intensity

  • Click-to-patch: Rapid clicks temporarily stabilise; simulates
    "dependency update hell"


3.4 Failure State

Implemented via matter.js physics simulation. Tower collapse triggers ragdoll
destruction with overlay messages: "SEGFAULT", "404", "NULL POINTER
EXCEPTION", "PROJECT CANCELED", "FUNDING REVOKED".


================================================================================


4. REFERENCES
--------------------------------------------------------------------------------


  • Ryan, R.M., Rigby, C.S. & Przybylski, A. (2006). The Motivational Pull of
    Video Games: A Self-Determination Theory Approach. Motivation and
    Emotion, 30(4), 344-360.

  • Przybylski, A.K., Rigby, C.S. & Ryan, R.M. (2010). A Motivational Model
    of Video Game Engagement. Review of General Psychology, 14(2), 154-166.

  • Cunningham, W. (1992). The WyCash Portfolio Management System. OOPSLA'92
    Experience Report. [Origin of "technical debt" metaphor]

Software Engineering Context

  • Munroe, R. (2020). xkcd #2347: Dependency. https://xkcd.com/2347/

  • Collins, K. (2016). How one programmer broke the internet by deleting a
    tiny piece of code. Quartz.

  • Freund, A. (2024). XZ Utils Backdoor Report. oss-security mailing list.

  • Brown, N. et al. (2010). Managing Technical Debt in Software-Reliant
    Systems. FSE/SDP Workshop on Future of Software Engineering Research.

Industry Practice

  • Beck, K. (1999). Extreme Programming Explained. Addison-Wesley.
    [User stories origin]

  • Cohn, M. (2004). User Stories Applied. Addison-Wesley.

  • Game Design Document templates: Nuclino (2024), GameDeveloper.com (2023),
    Unity (2020).


================================================================================
                              END OF DOCUMENT
================================================================================
