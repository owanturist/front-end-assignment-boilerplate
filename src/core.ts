export type Effect<Action> = (dispatch: Dispatch<Action>) => void;

export const Effect = {
  map<Action, Result>(
    fn: (action: Action) => Result,
    effect: Effect<Action>,
  ): Effect<Result> {
    return (dispatch: Dispatch<Result>): void => {
      effect((action: Action): void => dispatch(fn(action)));
    };
  },
};

export type Dispatch<Action> = (action: Action) => void;

export interface Program<Action, State> {
  getState(): State;
  dispatch(action: Action): void;
  subscribe(subscriber: () => void): () => void;
}

class ClientProgram<Action, State> implements Program<Action, State> {
  public dispatch: (action: Action) => void;

  private state: State;

  private readonly subscribers: Array<() => void> = [];

  private readonly update: (
    action: Action,
    state: State,
  ) => [State, Array<Effect<Action>>];

  public constructor(
    [initialState, initialEffects]: [State, Array<Effect<Action>>],
    update: (action: Action, state: State) => [State, Array<Effect<Action>>],
  ) {
    this.state = initialState;
    this.update = update;

    this.dispatch = (action: Action): void => {
      const [nextState, effects] = this.update(action, this.state);

      if (this.state === nextState) {
        this.executeEffects(effects);

        return;
      }

      this.state = nextState;
      this.executeEffects(effects);

      for (const subscriber of this.subscribers) {
        subscriber();
      }
    };

    this.executeEffects(initialEffects);
  }

  public getState(): State {
    return this.state;
  }

  public subscribe(subscriber: () => void): () => void {
    this.subscribers.push(subscriber);

    return (): void => {
      const index = this.subscribers.indexOf(subscriber);

      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private executeEffects(effects: Array<Effect<Action>>): void {
    for (const effect of effects) {
      effect(this.dispatch);
    }
  }
}

export const Program = {
  run<Flags, Action, State>({
    flags,
    init,
    update,
  }: {
    flags: Flags;
    init(flags: Flags): [State, Array<Effect<Action>>];
    update(action: Action, state: State): [State, Array<Effect<Action>>];
  }): Program<Action, State> {
    return new ClientProgram(init(flags), update);
  },
};
