import * as React from 'react';

import { Dispatch, Effect } from '../core';

const after = (milliseconds: number, action: Action): Effect<Action> => (
  dispatch: Dispatch<Action>,
): void => {
  setTimeout((): void => dispatch(action), milliseconds);
};

export interface Action {
  update(state: State): [State, Array<Effect<Action>>];
}

const SEC = 1000;

const Decrement: Action = {
  update(state: State): [State, Array<Effect<Action>>] {
    return [
      {
        ...state,
        count: state.count - 1,
      },
      [after(SEC, Decrement)],
    ];
  },
};

const Increment: Action = {
  update(state: State): [State, Array<Effect<Action>>] {
    return [
      {
        ...state,
        count: state.count + 1,
      },
      [],
    ];
  },
};

export interface State {
  readonly count: number;
}

export const initial: [State, Array<Effect<Action>>] = [
  {
    count: 0,
  },
  [after(SEC, Increment)],
];

export interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

export const View = ({ state, dispatch }: Props): React.ReactElement => (
  <div>
    <button onClick={(): void => dispatch(Decrement)}>-</button>
    {state.count}
    <button onClick={(): void => dispatch(Increment)}>+</button>
  </div>
);
