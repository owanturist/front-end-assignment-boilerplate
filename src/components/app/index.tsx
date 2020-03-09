import { load as mobilenetLoad, MobileNet } from '@tensorflow-models/mobilenet';
import Either, { Left, Right } from 'frctl/Either';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import RemoteData, { Failure, Loading, NotAsked, Succeed } from 'frctl/RemoteData/Optional';
import * as React from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import styled, { keyframes } from 'styled-components';

import { Aviary, Probe } from '../../aviary';
import { Dispatch, Effect } from '../../core';
import * as Toast from '../../toast'
import Dropzone from '../dropzone';

// A C T I O N S

export interface Action {
  update(state: State): [State, Array<Effect<Action>>];
}

class Classify implements Action {
  private constructor(private readonly result: Either<string, Search>) { }

  public static run(mobilenet: MobileNet, aviary: Aviary, picture: string): Effect<Action> {
    return dispatch => {
      const node = document.createElement('img');

      // eslint-disable-next-line unicorn/prevent-abbreviations
      node.src = picture;

      node.addEventListener('load', () => {
        mobilenet.classify(node, 3)
          .then(classifications => {
            return aviary.classify(classifications).cata({
              Nothing: () => Promise.reject('Could not identify dog\'s breed.'),

              Just: probe => {
                return Aviary.search(probe)
                  .then(pack => dispatch(new Classify(Right({ probe, pack }))));
              }
            })
          })
          .catch(error => dispatch(new Classify(Left(String(error)))));
      })
    }
  }

  public update(state: State): [State, Array<Effect<Action>>] {
    return this.result.cata<[State, Array<Effect<Action>>]>({
      Left: error => [
        {
          ...state,
          search: Failure(error)
        },
        [
          Toast.error(error).show()
        ]
      ],

      Right: classifications => [
        {
          ...state,
          search: Succeed(classifications)
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
        search: Loading
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

interface Search {
  probe: Probe;
  pack: string[];
}

export type State = Readonly<{
  picture: Maybe<string>;
  aviary: RemoteData<string, Aviary>;
  mobilenet: RemoteData<string, MobileNet>;
  search: RemoteData<string, Search>;
}>;

export const init: [State, Array<Effect<Action>>] = [
  {
    picture: Nothing,
    aviary: Loading,
    mobilenet: Loading,
    search: NotAsked
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

const StyledLastBox = styled(StyledBox)`
  flex: 100 1 0;
  height: 0;
`

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
`

const StyledImageBox = styled(StyledBox)`
  align-items: center;
  animation: ${fadeIn} .3s;
  background-position: center center;
  background-size: cover;
  border-radius: 3px;
  display: flex;
  flex: 2 0 auto;
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

const StyledPlaceholderBox = styled(StyledImageBox)`
  background-color: #eee;
  box-shadow: none;
  width: 300px;

  &:nth-child(2n + 1) {
    width: 180px;
  }

  &:nth-child(3n + 1) {
    width: 240px;
  }

  &:nth-child(4n + 1) {
    width: 320px;
  }

  &:nth-child(5n + 1) {
    width: 210px;
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

class ViewImage extends React.PureComponent<ViewImageProps, { loaded: boolean }> {
  public readonly state = {
    loaded: false
  };

  public render() {
    const { picture } = this.props;

    if (!this.state.loaded) {
      return (
        <StyledPlaceholderBox>
          <LazyLoadImage
            height="auto"
            width="100%"
            afterLoad={() => this.setState({ loaded: true })}
            src={picture}
          />
        </StyledPlaceholderBox>
      )
    }

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

const StyledProbeBox = styled(StyledBox)`
  background: #2ecc71;
  border-radius: 3px;
  box-sizing: border-box;
  color: #fff;
  display: flex;
  flex: 1 0 auto;
  flex-flow: column;
  justify-content: center;
  padding: 20px 40px;
`

const StyledProbeLine = styled.p`
  margin: 0;

  & + & {
    margin-top: 10px;
  }
`

const ViewProbeBox = ({ probe }: { probe: Probe }) => (
  <StyledProbeBox>
    <StyledProbeLine>
      Breed: <strong>{probe.breed}</strong>
    </StyledProbeLine>

    {probe.subBreed.cata({
      Nothing: () => null,

      Just: subBreed => (
        <StyledProbeLine>
          Sub-breed: <strong>{subBreed}</strong>
        </StyledProbeLine>
      )
    })}

    <StyledProbeLine>
      Match: <strong>{(100 * probe.match).toFixed(2)}%</strong>
    </StyledProbeLine>
  </StyledProbeBox>
)

export interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

const StyledScroller = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
  font-size: 18px;
  height: 100%;
  min-height: 100%;
  overflow-y: auto;
`;

const StyledContent = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin: -10px 0 0 -10px;
  padding: 10px;
`

export class View extends React.PureComponent<Props> {
  public render() {
    const { state, dispatch } = this.props;

    return (
      <StyledScroller>
        <StyledContent>
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

            Just: picture => state.search.isSucceed() ? (
              <StyledImageBox
                style={{
                  backgroundImage: `url(${picture})`
                }}
              >
                <StyledImage src={picture} />
              </StyledImageBox>
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

          {state.search.cata({
            Succeed: search => (
              <ViewProbeBox probe={search.probe} />
            ),

            _: () => null
          })}

          {state.search.cata({
            Succeed: search => search.pack.map(dog => (
              <ViewImage key={dog} picture={dog} />
            )),

            _: () => null
          })}

          <StyledLastBox />
        </StyledContent>
      </StyledScroller>
    )
  }
}
