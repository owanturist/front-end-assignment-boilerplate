import './index.css';

import * as React from 'react';
import { render } from 'react-dom';

import * as Counter from './components/counter';
import { Effect } from './core';
import { Provider } from './provider';

const init = (): [Counter.State, Array<Effect<Counter.Action>>] => {
  return Counter.initial;
};

const update = (
  action: Counter.Action,
  state: Counter.State,
): [Counter.State, Array<Effect<Counter.Action>>] => action.update(state);

render(
  <Provider flags={null} init={init} update={update} view={Counter.View} />,
  document.querySelector('#root'),
);
