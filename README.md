# Rock Paper Scissors — The Hand Game

A polished, responsive take on the classic game. Choose a hand, play against the
house, and keep your match history and all-time record between visits.

## Features

- Best of 3, 5, and 10, plus unlimited play
- Match scoreboard, winning streak, draw count, and recent-round history
- Persistent scores and all-time win/loss/draw statistics
- Keyboard shortcuts: **R** for Rock, **P** for Paper, **S** for Scissors
- Optional synthesized sound effects and dark/light themes
- Reduced-motion support and keyboard-accessible controls

## Getting started

Use Node.js 20.x, then install dependencies and start the development server:

```sh
npm install
npm start
```

## Scripts

- `npm test` — run the game logic and UI tests
- `npm run build` — create a production build

Progress is saved in this browser using local storage. Use **Reset game** to
clear the current score and recent rounds; your all-time record remains saved.
