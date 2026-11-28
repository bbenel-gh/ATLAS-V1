# B3 playful choices

Approved by Bright with the team, 26 November 2026 (D-42, closes the B3 half of BL-12).

Onboarding screen 4 shows three "would you rather" questions, one at a time, each with two options (prd FR-5, `specs/B3.md` step 4). Nothing is right or wrong. The app records the option id and the time taken for each question.

| Question id | Question | Option id | Option label |
| --- | --- | --- | --- |
| `radio` | Would you rather fix a broken radio, or find out why it broke? | `fix` | Fix the radio |
| | | `why` | Find out why it broke |
| `farm` | Would you rather plant a new farm, or sell at the market? | `plant` | Plant a new farm |
| | | `sell` | Sell at the market |
| `song` | Would you rather learn a new song, or write a new story? | `song` | Learn a new song |
| | | `story` | Write a new story |

The ids are stored in `profiles.playful_choices`. Changing a label is a copy change only. Changing an id needs a migration of saved answers.
