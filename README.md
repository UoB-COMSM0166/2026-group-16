<div align="center" style="border:2px solid #e4572e; padding:20px; border-radius:10px;">

# MERCHANT FIGHTERS

</div>

<p align="center">
  <a href="https://uob-comsm0166.github.io/2026-group-16/whitebox-prototype/">
    <img width="1280" height="960" alt="image" src="https://github.com/user-attachments/assets/eb2ac26e-8c40-4ef3-9119-e52bc3e2ce31" alt="Merchant Fighters Banner" width="700">
  </a>
</p>

<div align="center">
  <a href="https://uob-comsm0166.github.io/2026-group-16/whitebox-prototype/">
    <img 
      src="https://img.shields.io/badge/🎮%20PLAY%20GAME-red?style=for-the-badge&logo=gamepad"
      width="300"
    />
  </a>
</div>

---

## Team
 
<div align="center">

  <img width="1280" height="960" alt="image" src="https://github.com/user-attachments/assets/9d5851f9-ad27-4f02-8703-03ff351b21e5" />

| Name                  | Email                 | Role        | 
| --------------------- | --------------------- | ----------- |
| Helen Wong            | bs25971@bristol.ac.uk |             |
| Prapulla Naidu Tangi  | sz25875@bristol.ac.uk |             |
| Rishabh Gautam        | jk25370@bristol.ac.uk |             |
| Ciyang Weng           | qe25002@bristol.ac.uk |             |
| Josh Thompson         | kx25617@bristol.ac.uk |             |
| Ziquan Liu            | nb25183@bristol.ac.uk |             |

</div>
 
---

</p>

## Project Report

### Introduction

- 5% ~250 words 
- Describe your game, what is based on, what makes it novel? (what's the "twist"?)
- **Merchant Fighters!** is a casual browser game that can be played by one or two players, where a mischievous cat interacts with a dog in a playful duel. Players throw items at each other, testing their timing, reflexes, and strategy, until one's HP bar is empty and is defeated. Inspired by the classic Flash game Fleabag vs Mutt, Merchant Fighters modernises the formula for the browser with two distinct visual themes, a live timer, and full bilingual support.
The game's defining twist is hot surface bouncing: rather than landing and stopping, every projectile a flying frying pan bounces off the ground, walls, and obstacles before disappearing. Each pan can bounce up to three times, which completely changes how players aim. A shot fired too low might loop back and strike the shooter. A clever angle can send the pan curving around a wall that would otherwise block a direct hit. What begins as a simple aiming game becomes a spatial puzzle, where reading the bounce is just as important as lining up the shot.


<img width="1594" height="898" alt="Latest_Game_Image1" src="https://github.com/user-attachments/assets/eb2ac26e-8c40-4ef3-9119-e52bc3e2ce31" />


### Requirements 

- 15% ~750 words
- Early stages design. Ideation process. How did you decide as a team what to develop? Use case diagrams, user stories.

## Early stages design:
In the early stages, we began by each exploring different browser-based games to undersatnd what kind of ideas were possible. Each team member then came up with their own concepts, and we shared these in group discussion. We compared the ideas based on how engaging they seemed, whether they were realistic to compete within our time frame, looked at various animations to understand what kind of ideas were possible, how suitable they were for p5.js, and how easy they would be for new players to understand. This helped us narrow down to the strongest opinions.

## Ideation process:
After browsing different games, we were inspired by _Fleabag vs Mutt_, as it is a fun game with a simple and competitive style. This gave us the idea to design a fun two-player game with a playful and interactive feel.
We then created simple **paper prototype** and shared them with our friends and classmates to get quick feedback. Through this process, we observed which idea felt more engaging and interactive. The two-player game caoncept stood out, as it encouraged excitement and strategy, leading us to choose it as the direction for our final game.
## Paper prototype
https://github.com/user-attachments/assets/7e17c2b0-c05f-4053-aa92-736817f2a9ee

## Stakeholders
Using the **Onion Ring Model** helped us clearly map out all the stakeholders involved in **Merchant Fighters** and understands their level of influence on the project. By organising stakeholders into different layers, we could seperate those directly involved in development from players, wider users, and externam influences. This made it easier to see who we needed to focus on most during design decisions.
<p align="center">
  <img src="https://github.com/user-attachments/assets/52afd217-25a7-4110-a688-f8178e3bb23b" width="500">

## Use Case diagram:
<img width="909" height="533" alt="image" src="https://github.com/user-attachments/assets/93a960e9-5a98-43d2-8cdc-8d5a7cc7a36c" />

- The central play use case sits at the heart of the diagram, with all other behaviours branching from it.
- Two human characters- Player 1 and Player 2 interact wit the system through through their own dedicated keyboard controls. (Future Case - Player 1 uses dedicated keyboard, while Player 2 is AI system-controlled).
- The game system handles 60-second countdown timer, overtime detection, and win condition evaluation.
- Realationship marked <<include>> represent behaviours that alway occur as part of play  such as choosing character, shooting projectile, viewing result.
- Relationship marked <<exteds>> represent conditional behaviours that only trigger under specific circustances.
- The Navigate back button can be used at any time to return to the home page without closing the game.

## Users stories:
- Scrum master: as a scrum master, I want to gather all the requirements and ensure smooth development of the game (set up branch contributing rules to prevent accidental force pushes and deletions).
- Backend developers: as a backend developers, I want to make sure the good physics in the game so that motions within the game is reasonable.
- UI designer: as an UI designer, I want to make sure the visuals of the game is appealing to players so that it attracts them to play the game.
- QA tester: as a QA tester, I want to make sure the game is bug-free and function correctly so that it meets users’ requirement before release.
- Frequent gamer: as a frequent gamer, I want the movements of objects to be smooth and realistic so that I can have a good gaming experience. I want to have some new elements observed in the game so that it’s not just like the other typical shooting games.
- Casual gamer: as a casual gamer, I want to easily get hands-on with the game so that the navigation is straight forward and learning curve is small.
- Real-life people depicted in the game: as a real-life figure portrayed in the game, I want the character to be true-to-life so that it curates my public persona and safeguards my reputation.
- UOB students: as a UOB students, I want the game to portray familiar set-ups so that it brings better experience of game immersion.


### Design

- 15% ~750 words 
- System architecture. Class diagrams, behavioural diagrams.

## Class Diagram
<img width="896" height="878" alt="ClassDiagram_sprint1" src="https://github.com/user-attachments/assets/647cec1c-27a8-4989-8786-95e4ecd65142" />


### Implementation

- 15% ~750 words

- Describe implementation of your game, in particular highlighting the TWO areas of *technical challenge* in developing your game. 

### Evaluation

- 15% ~750 words

- One qualitative evaluation (of your choice) 

- One quantitative evaluation (of your choice)


## Heuristic Evaluation
<img width="1242" height="888" alt="Heuristic Evaluation" src="https://github.com/user-attachments/assets/1b988a92-eac5-45ed-bc9f-07e16f6f54b4" />

- Description of how code was tested.

## Quantitative evaluation

Set-up: 
We have conducted a study with 11 respondents to measure the perceived workload between “Easy Level” and “Hard Level” of the game. This evaluation allowed us to further determine how to adjust the difficulty of the game while striking a balance between the usability of the game and the workload experienced by players. The survey are structured in two sessions, namely System Usability Scale (SUS) and NASA Task Load Index (NASA-TLX). The former measures the overall usability of the game while the latter access the perceived workload experienced by players during gameplay.

Data Analysis & Key Findings:

<img width="940" height="447" alt="image" src="https://github.com/user-attachments/assets/039c08a7-2004-4649-a891-d99562f1fbbd" />
Easy Level

<img width="940" height="447" alt="image" src="https://github.com/user-attachments/assets/ff4178a3-5c0e-445c-8612-0ad8beb52a56" />
Hard Level

NASA-TLX result:
Among different aspects of demand, there is a significant surge in temporal demand. Players find that the pace of the game increases much more in the hard level. This is an intended behaviour to build up the difficulty of the game as players are trying on harder levels of the game. To further confirm this, upon the Wilcoxon Signed-Rank Test, there is a W statistics of 31.5 with 11 non-tied pairs. Since w-test value is far more than the critical value for n=11. This suggests that there is no strong evidence that participants found the hard level more temporally demanding than easy level. 

<img width="940" height="447" alt="image" src="https://github.com/user-attachments/assets/6d643874-de88-4adc-b5de-aedc84869c36" />
Easy Level

<img width="940" height="447" alt="image" src="https://github.com/user-attachments/assets/3fed1d71-c80a-4daa-8749-00311f80049b" />
Hard Level

SUS result:
According to the responses, the result shows the most differences on the question regarding support of a technical person is needed to use the system. Surprisingly, more respondents found that a technical person would be helpful in the easy level. Responses spread across the scale of 1, 2, 3 and 4 while most respondents responses with a scale of 1 in the hard level. This might suggest that people need more assistance when they are on the easy level of the game. To confirm this, according to the w-test result of 18 and the number of non-tied pairs of 9, this suggests that there is no strong evidence that perceived need for technical support differed between the easy and hard levels. Therefore, participants’ feelings about needing technical support were broadly similar regardless of whether they played the easy or hard level. This makes intuitive sense — the interface and controls remain the same across difficulty levels, so perceptions of usability and technical complexity would not necessarily change just because the game got harder. The non-significance here is arguably an expected and logical finding. 

In general, the difficulty seems to be balanced among levels, however, after further development of the game, another survey with a larger sample size would be conducted to further ensure the perceived workload of the player and system usability of the game.


### Process 

- 15% ~750 words

- Teamwork. How did you work together, what tools and methods did you use? Did you define team roles? Reflection on how you worked together. Be honest, we want to hear about what didn't work as well as what did work, and importantly how your team adapted throughout the project.

### Conclusion

- 10% ~500 words

- Reflect on the project as a whole. Lessons learnt. Reflect on challenges. Future work, describe both immediate next steps for your current game and also what you would potentially do if you had chance to develop a sequel.

### Contribution Statement

- Provide a table of everyone's contribution, which *may* be used to weight individual grades. We expect that the contribution will be split evenly across team-members in most cases. Please let us know as soon as possible if there are any issues with teamwork as soon as they are apparent and we will do our best to help your team work harmoniously together.

### Additional Marks

You can delete this section in your own repo, it's just here for information. in addition to the marks above, we will be marking you on the following two points:

- **Quality** of report writing, presentation, use of figures and visual material (5% of report grade) 
  - Please write in a clear concise manner suitable for an interested layperson. Write as if this repo was publicly available.
- **Documentation** of code (5% of report grade)
  - Organise your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organised? Is code well commented throughout?
