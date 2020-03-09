import './index.css';

import * as React from 'react';
import { render } from 'react-dom';
import { ToastContainer } from 'react-toastify';

import * as App from './components/app';
import { Provider } from './provider';


render(
  <>
    <ToastContainer />
    <Provider
      flags={null}
      init={() => App.init}
      update={(action, state) => action.update(state)}
      view={App.View}
    />
  </>,
  document.querySelector('#root'),
);
