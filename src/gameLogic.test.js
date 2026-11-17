import {
  DEFAULT_MODE,
  GAME_MODES,
  createInitialGameState,
  gameReducer,
  getOutcome,
  restoreGameState,
  serializeGameState,
} from './gameLogic';

const playRound = (state, playerChoice, computerChoice) =>
  gameReducer(
    gameReducer(state, { type: 'ROUND_STARTED', choice: playerChoice }),
    { type: 'ROUND_RESOLVED', computerChoice }
  );

describe('getOutcome', () => {
  it.each([
    ['rock', 'scissors', 'win'],
    ['scissors', 'paper', 'win'],
    ['paper', 'rock', 'win'],
    ['scissors', 'rock', 'loss'],
    ['paper', 'scissors', 'loss'],
    ['rock', 'paper', 'loss'],
    ['rock', 'rock', 'draw'],
    ['paper', 'paper', 'draw'],
    ['scissors', 'scissors', 'draw'],
  ])('%s against %s is a %s', (player, computer, expected) => {
    expect(getOutcome(player, computer)).toBe(expected);
  });
});

describe('gameReducer', () => {
  it('updates scores, streak, draws, history, and lifetime stats together', () => {
    let state = createInitialGameState();
    state = playRound(state, 'rock', 'scissors');
    state = playRound(state, 'paper', 'rock');
    state = playRound(state, 'rock', 'rock');

    expect(state.playerScore).toBe(2);
    expect(state.computerScore).toBe(0);
    expect(state.roundsPlayed).toBe(3);
    expect(state.streak).toBe(0);
    expect(state.drawCount).toBe(1);
    expect(state.history.map(round => round.outcome)).toEqual([
      'draw',
      'win',
      'win',
    ]);
    expect(state.stats).toEqual({ wins: 2, losses: 0, draws: 1 });
  });

  it.each(Object.keys(GAME_MODES).filter(mode => mode !== 'unlimited'))(
    'ends a %s match at the required number of wins',
    mode => {
      let state = gameReducer(createInitialGameState(), {
        type: 'CHANGE_MODE',
        mode,
      });
      const target = GAME_MODES[mode].target;

      for (let round = 0; round < target; round += 1) {
        state = playRound(state, 'rock', 'scissors');
      }

      expect(state.playerScore).toBe(target);
      expect(state.matchWinner).toBe('player');
    }
  );

  it('does not finish unlimited matches and rejects extra rounds after a match ends', () => {
    let state = gameReducer(createInitialGameState(), {
      type: 'CHANGE_MODE',
      mode: 'unlimited',
    });

    for (let round = 0; round < 8; round += 1) {
      state = playRound(state, 'rock', 'scissors');
    }

    expect(state.matchWinner).toBeNull();
    expect(state.playerScore).toBe(8);

    state = gameReducer(state, { type: 'START_NEW_MATCH' });
    state = gameReducer(state, { type: 'CHANGE_MODE', mode: DEFAULT_MODE });
    expect(state.mode).toBe(DEFAULT_MODE);
    expect(state.playerScore).toBe(0);
    expect(state.history).toHaveLength(8);
  });

  it('resets the current game without removing the all-time record', () => {
    let state = playRound(createInitialGameState(), 'rock', 'scissors');
    state = gameReducer(state, { type: 'RESET_GAME' });

    expect(state.playerScore).toBe(0);
    expect(state.roundsPlayed).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(state.stats).toEqual({ wins: 1, losses: 0, draws: 0 });
  });

  it('restores saved progress and safely ends an interrupted reveal', () => {
    let state = playRound(createInitialGameState(), 'rock', 'scissors');
    state = gameReducer(state, { type: 'SET_THEME', theme: 'light' });
    const restored = restoreGameState(serializeGameState(state));

    expect(restored.playerScore).toBe(1);
    expect(restored.history).toEqual(state.history);
    expect(restored.stats).toEqual(state.stats);
    expect(restored.theme).toBe('light');

    const interrupted = gameReducer(restored, {
      type: 'ROUND_STARTED',
      choice: 'paper',
    });
    const resumed = restoreGameState(serializeGameState(interrupted));
    expect(resumed.phase).toBe('ready');
    expect(resumed.playerChoice).toBeNull();
    expect(resumed.playerScore).toBe(1);
  });
});
