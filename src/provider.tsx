import * as React from 'react';

import { Dispatch, Effect, Program } from './core';

interface Props<Flags, Action, State> {
  flags: Flags;
  init: (flags: Flags) => [State, Array<Effect<Action>>];
  update: (action: Action, state: State) => [State, Array<Effect<Action>>];
  view: React.ComponentType<{
    state: State;
    dispatch: Dispatch<Action>;
  }>;
}

export class Provider<Flags, Action, State> extends React.Component<
  Props<Flags, Action, State>,
  State
> {
  private readonly runtime: Program<Action, State>;

  private readonly dispatch: (action: Action) => void;

  protected constructor(properties: Props<Flags, Action, State>) {
    super(properties);

    this.runtime = Program.run({
      flags: properties.flags,
      init: properties.init,
      update: properties.update,
    });

    this.state = this.runtime.getState();
    this.dispatch = (action: Action): void => this.runtime.dispatch(action);
  }

  public componentDidMount(): void {
    this.unsubscribe = this.runtime.subscribe((): void => {
      this.setState(this.runtime.getState());
    });
  }

  public componentWillUnmount(): void {
    this.unsubscribe();
  }

  public render(): React.ReactElement {
    const View = this.props.view;

    return <View state={this.runtime.getState()} dispatch={this.dispatch} />;
  }

  private unsubscribe: () => void = (): void => {};
}
