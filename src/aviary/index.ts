/* eslint-disable @typescript-eslint/no-use-before-define */

import Dict from 'frctl/Dict';
import Either, { Left } from 'frctl/Either';
import Decode from 'frctl/Json/Decode';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import Set from 'frctl/Set';

import { Effect } from '../core';

const DOG_API = 'https://dog.ceo/api';

export interface Probe {
  match: number;
  breed: string;
  subBreed: Maybe<string>;
}

export interface Classification {
  className: string;
  probability: number;
}

const dogApiDecoder = <Data>(
  decoder: Decode.Decoder<Data>,
): Decode.Decoder<Data> => {
  return Decode.field('status').string.chain(status => {
    switch (status) {
      case 'error':
        return Decode.field('message').string.chain(Decode.fail);

      case 'success':
        return Decode.field('message').of(decoder);

      default:
        return Decode.fail(`Unknown status "${status}"`);
    }
  });
};

const aviaryDecoder: Decode.Decoder<Aviary> = Decode.keyValue(
  Decode.list(Decode.string).map(Set.fromList),
).map(pairs => new Aviary(Dict.fromList(pairs)));

export class Aviary {
  public constructor(private readonly breeds: Dict<string, Set<string>>) {}

  public static init<Action>(
    tagger: (result: Either<string, Aviary>) => Action,
  ): Effect<Action> {
    return dispatch => {
      fetch(`${DOG_API}/breeds/list/all`)
        .then(response => response.text())
        .then(json => dogApiDecoder(aviaryDecoder).decodeJSON(json))
        .then(
          result =>
            dispatch(tagger(result.mapLeft(error => error.stringify(4)))),
          error => dispatch(tagger(Left(String(error)))),
        );
    };
  }

  public static search(breed: Probe): Promise<string[]> {
    const method = breed.subBreed.cata({
      Nothing: () => `breed/${breed.breed}/images`,

      Just: subBreed => `breed/${breed.breed}/${subBreed}/images`,
    });

    return fetch(`${DOG_API}/${method}`)
      .then(response => response.text())
      .then(json => dogApiDecoder(Decode.list(Decode.string)).decodeJSON(json))
      .then(result =>
        result.cata({
          Left: error => Promise.reject(error.stringify(4)),
          Right: pictures => Promise.resolve(pictures),
        }),
      );
  }

  public classify(classifications: Classification[]): Maybe<Probe> {
    return classifications
      .slice()
      .sort((left, right) => right.probability - left.probability)
      .reduce(
        (result, { probability, className }) =>
          result.orElse(() => this.classifySingle(probability, className)),
        Nothing,
      );
  }

  private classifySingle(match: number, className: string): Maybe<Probe> {
    return className
      .toLowerCase()
      .split(/,\s*/u)
      .reduce(
        (result, fragment) =>
          result.orElse(() => this.classifyFragment(match, fragment)),
        Nothing,
      );
  }

  private classifyFragment(match: number, fragment: string): Maybe<Probe> {
    const names = fragment.split(/\s|-/u);

    return names
      .reduce(
        (result, breed) =>
          result.orElse(() =>
            this.breeds.get(breed).map(subBreeds => ({ breed, subBreeds })),
          ),
        Nothing,
      )
      .map(({ breed, subBreeds }) => ({
        match,
        breed,
        subBreed: names.reduce(
          (result, subBreed) =>
            result.orElse(() =>
              subBreeds.member(subBreed) ? Just(subBreed) : Nothing,
            ),
          Nothing,
        ),
      }));
  }
}
