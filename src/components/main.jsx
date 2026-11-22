import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import '../App.css';
import rockImage from '../assets/rock.png';
import paperImage from '../assets/paper.png';
import scissorsImage from '../assets/scissor.png';
import {
  CHOICES,
  GAME_MODES,
  STORAGE_KEY,
  createInitialGameState,
  gameReducer,
  getOutcome,
  restoreGameState,
  serializeGameState,
} from '../gameLogic';

const CHOICE_LABELS = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
};

const CHOICE_IMAGES = {
  rock: rockImage,
  paper: paperImage,
  scissors: scissorsImage,
};

function loadSavedGame() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return {
      state: saved ? restoreGameState(saved) : createInitialGameState(),
      warning: null,
    };
  } catch {
    return {
      state: createInitialGameState(),
      warning: 'Saved progress is unavailable. Your current session will still work.',
    };
  }
}

function ChoiceCard({ choice, selected, disabled, onSelect }) {
  return (
    <button
      className={`choice-card${selected ? ' choice-card--selected' : ''}`}
      type="button"
      data-choice={choice}
      data-testid={`choice-${choice}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(choice)}
    >
      <span className="choice-card__image">
        <img
          src={CHOICE_IMAGES[choice]}
          alt=""
          aria-hidden="true"
        />
      </span>
      <span className="choice-card__label">{CHOICE_LABELS[choice]}</span>
      <span className="choice-card__shortcut" aria-hidden="true">
        {choice[0].toUpperCase()}
      </span>
    </button>
  );
}

function ScoreCard({ label, score, side, progress, dataTestId }) {
  return (
    <div className={`score-card score-card--${side}`}>
      <span className="score-card__label">{label}</span>
      <span className="score-card__number" data-testid={dataTestId}>
        {score}
      </span>
      <span className="score-card__meter" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </span>
    </div>
  );
}

function RoundFace({ choice, hidden = false, side }) {
  if (hidden) {
    return (
      <div className={`round-face round-face--hidden round-face--${side}`}>
        <span className="thinking-dots" aria-label="Computer is choosing">
          <i />
          <i />
          <i />
        </span>
      </div>
    );
  }

  return (
    <div className={`round-face round-face--${side}`}>
      <img
        src={CHOICE_IMAGES[choice]}
        alt={CHOICE_LABELS[choice]}
      />
    </div>
  );
}

function Main() {
  const [loaded] = useState(loadSavedGame);
  const [state, dispatch] = useReducer(gameReducer, loaded.state);
  const [storageNotice, setStorageNotice] = useState(loaded.warning);
  const revealTimer = useRef(null);
  const roundActive = useRef(false);
  const audioContext = useRef(null);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, serializeGameState(state));
      setStorageNotice(null);
    } catch {
      setStorageNotice(
        'Progress could not be saved. Check your browser storage settings.'
      );
    }
  }, [state]);

  const playSound = useCallback(
    sound => {
      if (!state.soundEnabled) return;

      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) {
        setStorageNotice('Sound is not supported by this browser.');
        return;
      }

      try {
        if (!audioContext.current) {
          audioContext.current = new AudioContextConstructor();
        }

        const context = audioContext.current;
        if (context.state === 'suspended') {
          context.resume().catch(() => {
            setStorageNotice('Sound could not be started by this browser.');
          });
        }

        const frequencies = {
          select: [440],
          win: [523.25, 659.25],
          loss: [220],
          draw: [330],
        }[sound];
        const now = context.currentTime;

        frequencies.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = now + index * 0.09;
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.055, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.17);
        });
      } catch {
        setStorageNotice('Sound could not be played by this browser.');
      }
    },
    [state.soundEnabled]
  );

  const cancelPendingRound = useCallback(() => {
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
    roundActive.current = false;
  }, []);

  const selectChoice = useCallback(
    choice => {
      if (roundActive.current || state.matchWinner) return;

      roundActive.current = true;
      dispatch({ type: 'ROUND_STARTED', choice });
      playSound('select');

      const computerChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
      revealTimer.current = window.setTimeout(() => {
        dispatch({ type: 'ROUND_RESOLVED', computerChoice });
        roundActive.current = false;
        revealTimer.current = null;
        playSound(getOutcome(choice, computerChoice));
      }, 380);
    },
    [playSound, state.matchWinner]
  );

  useEffect(() => {
    const handleKeyDown = event => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) ||
        event.target.isContentEditable
      ) {
        return;
      }

      const choice = { r: 'rock', p: 'paper', s: 'scissors' }[
        event.key.toLowerCase()
      ];
      if (choice) {
        event.preventDefault();
        selectChoice(choice);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectChoice]);

  useEffect(
    () => () => {
      cancelPendingRound();
      if (audioContext.current) audioContext.current.close();
    },
    [cancelPendingRound]
  );

  const startNewMatch = () => {
    cancelPendingRound();
    dispatch({ type: 'START_NEW_MATCH' });
  };

  const resetGame = () => {
    cancelPendingRound();
    dispatch({ type: 'RESET_GAME' });
  };

  const changeMode = event => {
    cancelPendingRound();
    dispatch({ type: 'CHANGE_MODE', mode: event.target.value });
  };

  const mode = GAME_MODES[state.mode];
  const locked = state.phase === 'thinking' || Boolean(state.matchWinner);
  const canChangeMode = state.roundsPlayed === 0 || Boolean(state.matchWinner);
  const playerProgress = mode.target
    ? Math.min((state.playerScore / mode.target) * 100, 100)
    : 0;
  const computerProgress = mode.target
    ? Math.min((state.computerScore / mode.target) * 100, 100)
    : 0;
  const totalStats = state.stats.wins + state.stats.losses + state.stats.draws;
  const winRate = totalStats
    ? Math.round((state.stats.wins / totalStats) * 100)
    : 0;
  const result = state.lastRound;
  const isMatchOver = Boolean(state.matchWinner);
  const resultTitle =
    state.phase === 'thinking'
      ? 'The house is choosing'
      : isMatchOver
        ? state.matchWinner === 'player'
          ? 'You won the match.'
          : 'The house takes it.'
        : result
          ? result.outcome === 'win'
            ? 'Point to you.'
            : result.outcome === 'loss'
              ? 'House wins this round.'
              : 'A tie.'
          : 'Your move.';
  const resultDetail =
    state.phase === 'thinking'
      ? 'Your opponent is making a move...'
      : result
        ? `${CHOICE_LABELS[result.playerChoice]} ${
            result.outcome === 'win'
          ? 'beats'
              : result.outcome === 'loss'
            ? 'loses to'
            : 'ties'
          } ${CHOICE_LABELS[result.computerChoice]}`
        : 'Choose a hand to play the house.';

  return (
    <div className={`app-shell theme-${state.theme}`}>
      <div className="app-container">
        <header className="app-header">
          <a className="brand" href="#top" aria-label="Rock paper scissors home">
            <span className="brand__mark" aria-hidden="true">RPS</span>
            <span className="brand__name">ROCK / PAPER / SCISSORS</span>
          </a>
          <div className="header-tools">
            <button
              className="icon-button"
              type="button"
              aria-label={state.soundEnabled ? 'Mute sound' : 'Enable sound'}
              aria-pressed={state.soundEnabled}
              onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
              title={state.soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {state.soundEnabled ? (
                  <>
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </>
                ) : (
                  <>
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path d="m17 9 5 6" />
                    <path d="m22 9-5 6" />
                  </>
                )}
              </svg>
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() =>
                dispatch({
                  type: 'SET_THEME',
                  theme: state.theme === 'dark' ? 'light' : 'dark',
                })
              }
              title={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {state.theme === 'dark' ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                  </>
                ) : (
                  <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
                )}
              </svg>
            </button>
          </div>
        </header>

        <main id="top">
          <section className="intro" aria-labelledby="page-title">
            <p className="eyebrow"><span /> A QUICK GAME OF ROCK, PAPER, SCISSORS</p>
            <h1 id="page-title">
              Rock, paper, <span>scissors.</span>
            </h1>
            <p className="intro__copy">
              Three familiar moves. Pick yours.
            </p>
          </section>

          {storageNotice && (
            <p className="storage-notice" role="status">
              {storageNotice}
            </p>
          )}

          <section className="game-panel" aria-label="Rock paper scissors game">
            {isMatchOver && state.matchWinner === 'player' && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => (
                  <span key={index} style={{ '--confetti-index': index }} />
                ))}
              </div>
            )}

            <div className="game-panel__top">
              <div className="match-label">
                <span className="match-label__dot" />
                MATCH {String(state.matchNumber).padStart(2, '0')}
              </div>
              <label className="mode-selector">
                <span className="mode-selector__label">PLAY</span>
                <select
                  aria-label="Game mode"
                  value={state.mode}
                  disabled={!canChangeMode}
                  onChange={changeMode}
                >
                  {Object.entries(GAME_MODES).map(([key, gameMode]) => (
                    <option key={key} value={key}>{gameMode.label}</option>
                  ))}
                </select>
                <span className="mode-selector__chevron" aria-hidden="true">⌄</span>
              </label>
            </div>

            <div className="scoreboard" aria-label="Match score">
              <ScoreCard
                label="YOU"
                score={state.playerScore}
                side="player"
                progress={playerProgress}
                dataTestId="score-player"
              />
              <div className="scoreboard__versus" aria-hidden="true">
                <span>VS</span>
              </div>
              <ScoreCard
                label="THE HOUSE"
                score={state.computerScore}
                side="computer"
                progress={computerProgress}
                dataTestId="score-computer"
              />
            </div>

            <div className="match-meta">
              <span data-testid="round-count">
                ROUND
                {' '}
                {String(
                  state.roundsPlayed +
                    (state.phase !== 'resolved' && !state.matchWinner ? 1 : 0)
                ).padStart(2, '0')}
              </span>
              <span className="match-meta__divider" />
              <span>
                {mode.target
                  ? `FIRST TO ${mode.target}`
                  : 'NO LIMIT'}
              </span>
              <span className="match-meta__divider" />
              <span>{state.roundsPlayed} PLAYED</span>
              <span className="match-meta__divider" />
              <span>{state.streak} WIN STREAK</span>
              <span className="match-meta__divider" />
              <span>{state.drawCount} DRAWS</span>
            </div>

            <div
              className={`round-status${result ? ` round-status--${result.outcome}` : ''}${state.phase === 'thinking' ? ' round-status--thinking' : ''}`}
              aria-live="polite"
              data-testid="round-result"
            >
              <div className="round-status__copy">
                <p className="round-status__title">{resultTitle}</p>
                <p className="round-status__detail">{resultDetail}</p>
              </div>
              {(result || state.phase === 'thinking') && (
                <div className="round-showdown" aria-label="Round choices">
                  <div className="round-showdown__pick">
                    <RoundFace
                      choice={state.playerChoice}
                      side="player"
                    />
                    <span>YOU</span>
                  </div>
                  <span className="round-showdown__versus" aria-hidden="true">:</span>
                  <div className="round-showdown__pick">
                    <RoundFace
                      choice={result?.computerChoice}
                      hidden={state.phase === 'thinking'}
                      side="computer"
                    />
                    <span>HOUSE</span>
                  </div>
                </div>
              )}
              {isMatchOver && (
                <button
                  className="play-again"
                  type="button"
                  onClick={startNewMatch}
                >
                  Play again <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>

            <div className="choice-heading">
              <span>CHOOSE YOUR MOVE</span>
              <span className="keyboard-hint" aria-label="Keyboard shortcuts">
                <kbd>R</kbd><kbd>P</kbd><kbd>S</kbd>
              </span>
            </div>
            <div className="choice-grid">
              {CHOICES.map(choice => (
                <ChoiceCard
                  key={choice}
                  choice={choice}
                  selected={state.playerChoice === choice}
                  disabled={locked}
                  onSelect={selectChoice}
                />
              ))}
            </div>

            <div className="game-actions">
              <button
                className="text-button"
                type="button"
                onClick={startNewMatch}
              >
                <span aria-hidden="true">↻</span>
                Start new match
              </button>
              <button
                className="text-button text-button--muted"
                type="button"
                title="Reset the current score and recent rounds. All-time stats stay saved."
                onClick={resetGame}
              >
                Reset game
              </button>
            </div>
          </section>

          <section className="insights-grid" aria-label="Game insights">
            <article className="insight-card history-card">
              <div className="insight-card__heading">
                <div>
                  <p className="eyebrow">MATCH NOTES</p>
                  <h2>Recent rounds</h2>
                </div>
                <span className="card-count">{state.history.length.toString().padStart(2, '0')}</span>
              </div>
              {state.history.length === 0 ? (
                <div className="history-empty">
                  <span className="history-empty__mark" aria-hidden="true">↗</span>
                  <p>Your first move is waiting.</p>
                  <span>Round-by-round results will land here.</span>
                </div>
              ) : (
                <ol className="history-list" aria-label="Previous rounds">
                  {state.history.slice(0, 5).map(round => (
                    <li className="history-row" key={round.id}>
                      <span className="history-row__number">
                        {String(round.roundNumber).padStart(2, '0')}
                      </span>
                      <span className="history-row__choices">
                        {CHOICE_LABELS[round.playerChoice]}
                        <span aria-hidden="true"> vs </span>
                        {CHOICE_LABELS[round.computerChoice]}
                      </span>
                      <span className={`history-result history-result--${round.outcome}`}>
                        {round.outcome === 'win'
                          ? 'WIN'
                          : round.outcome === 'loss'
                            ? 'LOSS'
                            : 'DRAW'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="insight-card record-card">
              <div className="insight-card__heading">
                <div>
                  <p className="eyebrow">ALL-TIME</p>
                  <h2>Your record</h2>
                </div>
                <span className="win-rate">{winRate}<small>%</small></span>
              </div>
              <p className="record-caption">WIN RATE <span>·</span> {totalStats} ROUNDS</p>
              <div className="record-stats">
                <div>
                  <span className="record-stats__value">{state.stats.wins}</span>
                  <span className="record-stats__label">WINS</span>
                </div>
                <div>
                  <span className="record-stats__value">{state.stats.losses}</span>
                  <span className="record-stats__label">LOSSES</span>
                </div>
                <div>
                  <span className="record-stats__value">{state.stats.draws}</span>
                  <span className="record-stats__label">DRAWS</span>
                </div>
              </div>
            </article>
          </section>
        </main>

        <footer className="app-footer">
          <span>ROCK / PAPER / SCISSORS</span>
          <span>ANOTHER ROUND IS ALWAYS AN OPTION <i aria-hidden="true">✳</i></span>
        </footer>
      </div>
    </div>
  );
}

export default Main;
