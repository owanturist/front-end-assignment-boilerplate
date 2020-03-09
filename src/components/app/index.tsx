import { load as mobilenetLoad, MobileNet } from '@tensorflow-models/mobilenet';
import Either, { Left, Right } from 'frctl/Either';
import Decode from 'frctl/Json/Decode';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import RemoteData, { Failure, Loading, NotAsked, Succeed } from 'frctl/RemoteData/Optional';
import * as React from 'react';
import styled from 'styled-components';

import { Dispatch, Effect } from '../../core';
import * as Toast from '../../toast'
import Dropzone from '../dropzone';

// A C T I O N S

export interface Action {
  update(state: State): [State, Array<Effect<Action>>];
}

class Classify implements Action {
  private static readonly decoder: Decode.Decoder<string[]> = Decode.field('status').string.chain(status => {
    switch (status) {
      case 'error': return Decode.field('message').string.chain(Decode.fail);

      case 'success': return Decode.field('message').list(Decode.string);

      default: return Decode.fail(`Unknown status "${status}"`);
    }
  })

  private constructor(private readonly result: Either<string, string[]>) { }

  public static run(mobilenet: MobileNet, picture: string): Effect<Action> {
    return dispatch => {
      const node = document.createElement('img');

      // eslint-disable-next-line unicorn/prevent-abbreviations
      node.src = picture;

      node.addEventListener('load', () => {
        mobilenet.classify(node, 1)
          .then(classifications => {
            if (classifications.length === 0) {
              return Promise.reject('Classification is empty');
            }

            const [breed] = classifications[0].className.toLowerCase().split(/,\s*/u);

            return fetch(`https://dog.ceo/api/breed/${breed}/images`)
              .then(response => response.text())
              .then(json => Classify.decoder.decodeJSON(json).mapLeft(error => error.stringify(4)))
              .then(result => dispatch(new Classify(result)));
          })
          .catch(error => dispatch(new Classify(Left(String(error)))));
      })
    }
  }

  public update(state: State): [State, Array<Effect<Action>>] {
    return this.result.cata({
      Left: error => [
        {
          ...state,
          sameBreedDogs: Failure(error)
        },
        [
          Toast.error(error).show()
        ]
      ],

      Right: classifications => [
        {
          ...state,
          sameBreedDogs: Succeed(classifications)
        },
        []
      ]
    })
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
        sameBreedDogs: Loading
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
  private constructor(private readonly result: Either<string, MobileNet>) { }

  public static run: Effect<Action> = dispatch => {
    mobilenetLoad()
      .then(mobilenet => dispatch(new LoadMobileNet(Right(mobilenet))))
      .catch(error => dispatch(new LoadMobileNet(Left(String(error)))))
  }

  public update(state: State): [State, Array<Effect<Action>>] {
    return this.result.cata({
      Left: error => [
        state,
        [
          Toast.error(error).show()
        ]
      ],

      Right: mobilenet => [
        {
          ...state,
          mobilenet: Just(mobilenet)
        },
        state.picture.map(picture => [
          Classify.run(mobilenet, picture)
        ]).getOrElse([])
      ]
    });
  }
}

// S T A T E

export type State = Readonly<{
  picture: Maybe<string>;
  mobilenet: Maybe<MobileNet>;
  sameBreedDogs: RemoteData<string, string[]>;
}>;

export const init: [State, Array<Effect<Action>>] = [
  {
    picture: Nothing,
    mobilenet: Nothing,
    sameBreedDogs: NotAsked
  },
  [
    LoadMobileNet.run
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

    {state.sameBreedDogs.cata({
      Succeed: sameBreedDogs => (
        <div>
          {sameBreedDogs.map(dog => (
            <div key={dog}>
              <img src={dog} />
            </div>
          ))}
        </div>
      ),

      _: () => null
    })}
  </StyledRoot>
);