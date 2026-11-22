# Rock Paper Scissors — The Hand Game - https://rishabranjan.github.io/rock-paper-scissors/

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

## Module Federation

The production build exposes the game as the `rpsGame` remote at
`remoteEntry.js`, with the `./Game` module exported from `src/App.js`. React and
React DOM are shared as strict singletons; the host should use compatible React
19 versions.

Run the remote on port 3001 while developing a host:

```sh
PORT=3001 npm start
```

Configure the host's Module Federation plugin to load
`rpsGame@http://localhost:3001/remoteEntry.js`, then render the exposed module
with `React.lazy(() => import('rpsGame/Game'))` inside `Suspense`. `npm run build`
emits `build/remoteEntry.js` for deployment. The game can still run standalone;
its bootstrap and global page styles are kept separate from the exposed module.
