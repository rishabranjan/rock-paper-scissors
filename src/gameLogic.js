export const CHOICES = ['rock', 'paper', 'scissors'];

export const GAME_MODES = {
  bestOf3: { label: 'Best of 3', rounds: 3, target: 2 },
  bestOf5: { label: 'Best of 5', rounds: 5, target: 3 },
  bestOf10: { label: 'Best of 10', rounds: 10, target: 6 },
  unlimited: { label: 'Unlimited', rounds: null, target: null },
};

export const DEFAULT_MODE = 'bestOf5';
export const STORAGE_KEY = 'rps-game-save-v1';
const HISTORY_LIMIT = 20;

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isCount = value => Number.isSafeInteger(value) && value >= 0;

export function getOutcome(playerChoice, computerChoice) {
  if (!CHOICES.includes(playerChoice) || !CHOICES.includes(computerChoice)) {
    throw new Error('Both choices must be rock, paper, or scissors.');
  }

  if (playerChoice === computerChoice) return 'draw';

  const playerWins =
    (playerChoice === 'rock' && computerChoice === 'scissors') ||
    (playerChoice === 'scissors' && computerChoice === 'paper') ||
    (playerChoice === 'paper' && computerChoice === 'rock');

  return playerWins ? 'win' : 'loss';
}

export function createInitialGameState() {
  return {
    mode: DEFAULT_MODE,
    playerScore: 0,
    computerScore: 0,
    roundsPlayed: 0,
    streak: 0,
    drawCount: 0,
    matchNumber: 1,
    matchWinner: null,
    phase: 'ready',
    playerChoice: null,
    lastRound: null,
    history: [],
    stats: { wins: 0, losses: 0, draws: 0 },
    theme: 'light',
    soundEnabled: false,
  };
}

function resetMatch(state, mode = state.mode, clearHistory = false) {
  return {
    ...state,
    mode,
    playerScore: 0,
    computerScore: 0,
    roundsPlayed: 0,
    streak: 0,
    drawCount: 0,
    matchNumber:
      state.roundsPlayed > 0 ? state.matchNumber + 1 : state.matchNumber,
    matchWinner: null,
    phase: 'ready',
    playerChoice: null,
    lastRound: null,
    history: clearHistory ? [] : state.history,
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'ROUND_STARTED': {
      if (!CHOICES.includes(action.choice)) {
        throw new Error('The selected hand must be rock, paper, or scissors.');
      }
      if (state.phase === 'thinking' || state.matchWinner) return state;

      return {
        ...state,
        phase: 'thinking',
        playerChoice: action.choice,
      };
    }

    case 'ROUND_RESOLVED': {
      if (state.phase !== 'thinking' || state.matchWinner) return state;
      if (!CHOICES.includes(action.computerChoice)) {
        throw new Error('The computer hand must be rock, paper, or scissors.');
      }

      const outcome = getOutcome(state.playerChoice, action.computerChoice);
      const playerScore = state.playerScore + (outcome === 'win' ? 1 : 0);
      const computerScore =
        state.computerScore + (outcome === 'loss' ? 1 : 0);
      const roundsPlayed = state.roundsPlayed + 1;
      const target = GAME_MODES[state.mode].target;
      const matchWinner =
        target && playerScore >= target
          ? 'player'
          : target && computerScore >= target
            ? 'computer'
            : null;
      const round = {
        id: `${state.matchNumber}-${roundsPlayed}`,
        matchNumber: state.matchNumber,
        roundNumber: roundsPlayed,
        playerChoice: state.playerChoice,
        computerChoice: action.computerChoice,
        outcome,
      };

      return {
        ...state,
        playerScore,
        computerScore,
        roundsPlayed,
        streak: outcome === 'win' ? state.streak + 1 : 0,
        drawCount: state.drawCount + (outcome === 'draw' ? 1 : 0),
        matchWinner,
        phase: 'resolved',
        lastRound: round,
        history: [round, ...state.history].slice(0, HISTORY_LIMIT),
        stats: {
          ...state.stats,
          wins: state.stats.wins + (outcome === 'win' ? 1 : 0),
          losses: state.stats.losses + (outcome === 'loss' ? 1 : 0),
          draws: state.stats.draws + (outcome === 'draw' ? 1 : 0),
        },
      };
    }

    case 'CHANGE_MODE': {
      if (!Object.hasOwn(GAME_MODES, action.mode)) {
        throw new Error('The selected game mode is not supported.');
      }
      if (
        action.mode === state.mode ||
        (state.roundsPlayed > 0 && !state.matchWinner)
      ) {
        return state;
      }

      return resetMatch(state, action.mode);
    }

    case 'START_NEW_MATCH':
      return resetMatch(state);

    case 'RESET_GAME':
      return resetMatch(state, state.mode, true);

    case 'SET_THEME':
      if (action.theme !== 'dark' && action.theme !== 'light') {
        throw new Error('The selected theme is not supported.');
      }
      return { ...state, theme: action.theme };

    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };

    default:
      throw new Error(`Unknown game action: ${action.type}`);
  }
}

function isValidRound(round) {
  return (
    isRecord(round) &&
    typeof round.id === 'string' &&
    isCount(round.matchNumber) &&
    isCount(round.roundNumber) &&
    CHOICES.includes(round.playerChoice) &&
    CHOICES.includes(round.computerChoice) &&
    ['win', 'loss', 'draw'].includes(round.outcome)
  );
}

export function serializeGameState(state) {
  return JSON.stringify({ version: 1, ...state });
}

export function restoreGameState(serialized) {
  const saved = JSON.parse(serialized);
  if (
    !isRecord(saved) ||
    saved.version !== 1 ||
    !Object.hasOwn(GAME_MODES, saved.mode) ||
    !isRecord(saved.stats) ||
    !['wins', 'losses', 'draws'].every(key => isCount(saved.stats[key])) ||
    !['playerScore', 'computerScore', 'roundsPlayed', 'streak', 'drawCount'].every(
      key => isCount(saved[key])
    ) ||
    !isCount(saved.matchNumber) ||
    !Array.isArray(saved.history) ||
    saved.history.length > HISTORY_LIMIT ||
    !saved.history.every(isValidRound) ||
    (saved.lastRound !== null && !isValidRound(saved.lastRound)) ||
    ![null, 'player', 'computer'].includes(saved.matchWinner) ||
    !['ready', 'thinking', 'resolved'].includes(saved.phase) ||
    ![null, ...CHOICES].includes(saved.playerChoice) ||
    !['dark', 'light'].includes(saved.theme) ||
    typeof saved.soundEnabled !== 'boolean'
  ) {
    throw new Error('Saved game data is invalid.');
  }

  const interruptedRound = saved.phase === 'thinking';
  return {
    mode: saved.mode,
    playerScore: saved.playerScore,
    computerScore: saved.computerScore,
    roundsPlayed: saved.roundsPlayed,
    streak: saved.streak,
    drawCount: saved.drawCount,
    matchNumber: saved.matchNumber,
    matchWinner: saved.matchWinner,
    phase: interruptedRound ? 'ready' : saved.phase,
    playerChoice: interruptedRound ? null : saved.playerChoice,
    lastRound: saved.lastRound,
    history: saved.history,
    stats: saved.stats,
    theme: saved.theme,
    soundEnabled: saved.soundEnabled,
  };
}
