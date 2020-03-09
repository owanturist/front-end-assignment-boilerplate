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
        mobilenet.classify(node, 5)
          .then(classifications => {
            return aviary.classify(classifications).cata({
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

const StyledBox = styled.div`
  height: 200px;
  margin: 10px 0 0 10px;
`

const StyledDropzoneBox = styled(StyledBox)`
  flex: 0 0 auto;
  max-width: 100%;
`

const StyledExpandBox = styled(StyledBox)`
  flex: 1 1 0;
  height: 0;
`

const StyledImageBox = styled(StyledBox)`
  align-items: center;
  background-position: center center;
  background-size: cover;
  border-radius: 3px;
  display: flex;
  flex: 1 0 auto;
  overflow: hidden;
  position: relative;

  &::before {
    border-radius: inherit;
    bottom: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .1) inset;
    content: "";
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
  }
`

const StyledOriginalImageBox = styled(StyledImageBox)`
  flex: 0 0 auto;
`

const StyledImage = styled.img`
  display: block;
  height: 100%;
  opacity: 0;
  width: auto;
`

interface ViewImageProps {
  picture: string;
}

class ViewImage extends React.PureComponent<ViewImageProps> {
  public render() {
    const { picture } = this.props;

    return (
      <StyledImageBox
        style={{
          backgroundImage: `url(${picture})`
        }}
      >
        <StyledImage src={picture} />
      </StyledImageBox>
    )
  }
}

export interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

const StyledRoot = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin: -10px 0 0 -10px;
  padding: 20px;
`;

export class View extends React.PureComponent<Props> {
  public render() {
    const { state, dispatch } = this.props;

    return (
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

          Just: picture => state.sameBreedDogs.isSucceed() ? (
            <ViewImage picture={picture} />
          ) : (
              <StyledOriginalImageBox
                style={{
                  backgroundImage: `url(${picture})`
                }}
              >
                <StyledImage src={picture} />
              </StyledOriginalImageBox>
            )
        })}

        {state.sameBreedDogs.cata({
          Succeed: sameBreedDogs => (
            sameBreedDogs.map(dog => (
              <ViewImage key={dog} picture={dog} />
            ))
          ),

          _: () => null
        })}

        <StyledExpandBox />
      </StyledRoot>
    )
  }
}
