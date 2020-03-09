import Maybe, { Nothing } from 'frctl/Maybe';
import * as React from 'react';
import styled from 'styled-components';

import { Dispatch, Effect } from '../../core';
import * as Toast from '../../toast'
import Dropzone from '../dropzone';

// A C T I O N S

export interface Action {
  update(state: State): [State, Array<Effect<Action>>];
}

class LoadPicture implements Action {
  public constructor(public readonly file: Maybe<File>) { }

  public update(state: State): [State, Array<Effect<Action>>] {
    if (this.file.isJust()) {
      return [
        {
          ...state,
          picture: this.file
        },
        []
      ]
    }

    return [
      state,
      [
        Toast.warning('It waits for pictures only').show()
      ]
    ]
  }
}

// S T A T E

export type State = Readonly<{
  picture: Maybe<File>;
}>;

export const initial: State = {
  picture: Nothing
}

// V I E W

const StyledRoot = styled.div`
  padding: 20px;
`;

export interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

export const View = ({ state, dispatch }: Props) => (
  <StyledRoot>
    <Dropzone
      accept="image/*"
      onLoad={file => dispatch(new LoadPicture(file))}
    />

    {state.picture.isNothing() ? 'No file' : 'One file'}
  </StyledRoot>
);
