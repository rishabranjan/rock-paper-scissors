import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('game interface', () => {
  let container;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    root = createRoot(container);
    jest.useFakeTimers();
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('supports keyboard moves and locks out overlapping rounds during the reveal', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    });

    expect(container.querySelector('[data-testid="choice-rock"]').disabled).toBe(
      true
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      jest.advanceTimersByTime(400);
    });

    expect(container.querySelector('[data-testid="round-count"]').textContent).toBe(
      'ROUND 01'
    );
    const playerScore = Number(
      container.querySelector('[data-testid="score-player"]').textContent
    );
    const houseScore = Number(
      container.querySelector('[data-testid="score-computer"]').textContent
    );
    expect(playerScore + houseScore).toBe(1);
    expect(container.querySelectorAll('.history-row')).toHaveLength(1);
  });

  it('lets the player change theme and start a fresh match', () => {
    act(() => {
      container
        .querySelector('[aria-label="Switch to dark theme"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('.app-shell').classList.contains('theme-dark')).toBe(
      true
    );

    act(() => {
      container
        .querySelector('.text-button')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="score-player"]').textContent).toBe(
      '0'
    );
  });

  it('restores the match score and history after a reload', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    act(() => {
      container
        .querySelector('[data-testid="choice-rock"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      jest.advanceTimersByTime(400);
    });

    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<App />));

    const playerScore = Number(
      container.querySelector('[data-testid="score-player"]').textContent
    );
    const houseScore = Number(
      container.querySelector('[data-testid="score-computer"]').textContent
    );
    expect(playerScore + houseScore).toBe(1);
    expect(container.querySelectorAll('.history-row')).toHaveLength(1);
  });
});
