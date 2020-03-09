import { load as mobilenetLoad, MobileNet } from '@tensorflow-models/mobilenet';
import Either, { Left, Right } from 'frctl/Either';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import RemoteData, { Failure, Loading, NotAsked, Succeed } from 'frctl/RemoteData/Optional';
import * as React from 'react';
import styled from 'styled-components';

import { Aviary } from '../../aviary';
import { Dispatch, Effect } from '../../core';
import * as Toast from '../../toast'
import Dropzone from '../dropzone';

// A C T I O N S

export interface Action {
  update(state: State): [State, Array<Effect<Action>>];
}

class Classify implements Action {
  private constructor(private readonly result: Either<string, string[]>) { }

  public static run(mobilenet: MobileNet, aviary: Aviary, picture: string): Effect<Action> {
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

            return aviary.bait(classifications[0].className).cata({
              Nothing: () => Promise.reject('Could not identify dog\'s breed.'),

              Just: Aviary.search
            })
          })
          .then(pictures => dispatch(new Classify(Right(pictures))))
          .catch(error => dispatch(new Classify(Left(String(error)))));
      })
    }
  }

  public update(state: State): [State, Array<Effect<Action>>] {
    return this.result.cata<[State, Array<Effect<Action>>]>({
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
        RemoteData.shape({
          aviary: state.aviary,
          mobilenet: state.mobilenet
        })
          .map(({ mobilenet, aviary }) => [Classify.run(mobilenet, aviary, picture)])
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
    return this.result.cata<[State, Array<Effect<Action>>]>({
      Left: error => [
        {
          ...state,
          mobilenet: Failure(error)
        },
        [
          Toast.error(error).show()
        ]
      ],

      Right: mobilenet => [
        {
          ...state,
          mobilenet: Succeed(mobilenet)
        },
        Maybe.shape({
          aviary: state.aviary.toMaybe(),
          picture: state.picture
        })
          .map(({ aviary, picture }) => [Classify.run(mobilenet, aviary, picture)])
          .getOrElse([])
      ]
    });
  }
}

class LoadAviary implements Action {
  public static run: Effect<Action> = Aviary.init(result => new LoadAviary(result));

  private constructor(private readonly result: Either<string, Aviary>) { }

  public update(state: State): [State, Array<Effect<Action>>] {
    return this.result.cata<[State, Array<Effect<Action>>]>({
      Left: error => [
        {
          ...state,
          aviary: Failure(error)
        },
        [
          Toast.error(error).show()
        ]
      ],

      Right: aviary => [
        {
          ...state,
          aviary: Succeed(aviary)
        },

        Maybe.shape({
          mobilenet: state.mobilenet.toMaybe(),
          picture: state.picture
        })
          .map(({ mobilenet, picture }) => [Classify.run(mobilenet, aviary, picture)])
          .getOrElse([])
      ]
    })
  }
}

// S T A T E

export type State = Readonly<{
  picture: Maybe<string>;
  aviary: RemoteData<string, Aviary>;
  mobilenet: RemoteData<string, MobileNet>;
  sameBreedDogs: RemoteData<string, string[]>;
}>;

export const init: [State, Array<Effect<Action>>] = [
  {
    picture: Nothing,
    aviary: Loading,
    mobilenet: Loading,
    sameBreedDogs: NotAsked
  },
  [
    LoadMobileNet.run,
    LoadAviary.run
  ]
]

// V I E W

const StyledRoot = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin: -10px 0 0 -10px;
  padding: 20px;
`;

const StyledBox = styled.div`
  flex: 0 0 auto;
  height: 200px;
  margin: 10px 0 0 10px;
`

const StyledDropzoneBox = styled(StyledBox)`
  width: 400px;
`

const StyledImage = styled.img`
  border-radius: 3px;
  height: 100%;
  width: auto;
`

export interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

export const View = ({ state, dispatch }: Props) => (
  <StyledRoot>
    <StyledDropzoneBox>
      <Dropzone
        accept="image/*"
        onLoad={file => dispatch(new DropPicture(file))}
      >
        Choose or drag&drop dog picture
      </Dropzone>
    </StyledDropzoneBox>

    {state.picture.cata({
      Nothing: () => null,
      Just: picture => (
        <StyledBox>
          <StyledImage src={picture} />
        </StyledBox>
      )
    })}

    {state.sameBreedDogs.cata({
      Succeed: sameBreedDogs => (
        sameBreedDogs.map(dog => (
          <StyledBox key={dog}>
            <StyledImage src={dog} />
          </StyledBox>
        ))
      ),

      _: () => null
    })}
  </StyledRoot>
);
