import { load as mobilenetLoad, MobileNet } from '@tensorflow-models/mobilenet';
import Either, { Left, Right } from 'frctl/Either';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import RemoteData, { Loading, NotAsked } from 'frctl/RemoteData/Optional';
import * as React from 'react';
import styled from 'styled-components';

import { Dispatch, Effect } from '../../core';
import * as Toast from '../../toast'
import Dropzone from '../dropzone';

// A C T I O N S

export interface Action {
  update(state: State): [State, Array<Effect<Action>>];
}

interface Classification {
  className: string;
  probability: number;
}

class Classify implements Action {
  private constructor(private readonly result: Either<string, Classification[]>) { }

  public static run(mobilenet: MobileNet, picture: string): Effect<Action> {
    return dispatch => {
      const node = document.createElement('img');

      // eslint-disable-next-line unicorn/prevent-abbreviations
      node.src = picture;

      node.addEventListener('load', () => {
        mobilenet.classify(node)
          .then(classifications => dispatch(new Classify(Right(classifications))))
          .catch(() => dispatch(new Classify(Left('Picture classification fails'))));
      })
    }
  }

  public update(state: State): [State, Array<Effect<Action>>] {
    return [
      {
        ...state,
        classifications: RemoteData.fromEither(this.result)
      },
      this.result.cata({
        Left: error => [
          Toast.error(error).show()
        ],
        Right: () => []
      })
    ]
  }
}

class ReadPicture implements Action {
  private constructor(private readonly result: Either<string, string>) { }

  public static run(file: File): Effect<Action> {
    return dispatch => {
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.addEventListener('load', (event: ProgressEvent<FileReader>) => {
        if (event.target !== null && typeof event.target.result === 'string') {
          dispatch(new ReadPicture(Right(event.target.result)));
        } else {
          dispatch(new ReadPicture(Left('Picture reading fails')));
        }
      })

      reader.addEventListener('error', () => {
        dispatch(new ReadPicture(Left('Picture reading fails')));
      })

      reader.addEventListener('abort', () => {
        dispatch(new ReadPicture(Left('Picture reading aborted')));
      })
    }
  }

  public update(state: State): [State, Array<Effect<Action>>] {
    return this.result.cata({
      Left: error => [
        state,
        [
          Toast.warning(error).show()
        ]
      ],

      Right: picture => [
        {
          ...state,
          picture: Just(picture)
        },
        state.mobilenet
          .map(mobilenet => [Classify.run(mobilenet, picture)])
          .getOrElse([])
      ]
    });
  }
}

class DropPicture implements Action {
  public constructor(private readonly file: Maybe<File>) { }

  public update(state: State): [State, Array<Effect<Action>>] {
    return [
      {
        ...state,
        classifications: Loading
      },
      [this.file.cata({
        Nothing: () => Toast.warning('It waits for pictures only').show(),
        Just: ReadPicture.run
      })
      ]
    ]
  }
}

class LoadMobileNet implements Action {
  public constructor(private readonly result: Either<string, MobileNet>) { }

  public update(state: State): [State, Array<Effect<Action>>] {
    return [
      {
        ...state,
        mobilenet: RemoteData.fromEither(this.result)
      },
      Maybe.shape({
        picture: state.picture,
        mobilenet: this.result.toMaybe()
      }).map(({ picture, mobilenet }) => [Classify.run(mobilenet, picture)])
        .getOrElse([])
    ]
  }
}

// S T A T E

export type State = Readonly<{
  picture: Maybe<string>;
  mobilenet: RemoteData<string, MobileNet>;
  classifications: RemoteData<string, Classification[]>;
}>;

export const init: [State, Array<Effect<Action>>] = [
  {
    picture: Nothing,
    mobilenet: Loading,
    classifications: NotAsked
  },
  [
    dispatch => {
      mobilenetLoad()
        .then(mobilenet => dispatch(new LoadMobileNet(Right(mobilenet))))
        .catch(error => dispatch(new LoadMobileNet(Left(String(error)))))
    }
  ]
]

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
      onLoad={file => dispatch(new DropPicture(file))}
    />


    {state.picture.cata({
      Nothing: () => null,
      Just: picture => (
        <img src={picture} />
      )
    })}

    {state.classifications.cata({
      Succeed: classifications => (
        <div>
          {classifications.map(classification => (
            <div key={classification.className}>
              className: {classification.className}
              <br />
              probability: {classification.probability}
            </div>
          ))}
        </div>
      ),

      _: () => null
    })}
  </StyledRoot>
);
