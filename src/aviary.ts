import Dict from 'frctl/Dict';
import Either, { Left } from 'frctl/Either';
import Decode from 'frctl/Json/Decode';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import Set from 'frctl/Set';

import { Effect } from './core';

const DOG_API = 'https://dog.ceo/api';

export interface Breed {
  name: string;
  subName: Maybe<string>;
}

export interface Aviary {
  bait(probe: string): Maybe<Breed>;
}

class AviaryImpl implements Aviary {
  public constructor(private readonly breeds: Dict<string, Set<string>>) {}

  public bait(probe: string): Maybe<Breed> {
    return probe
      .toLowerCase()
      .split(/,\s*/u)
      .reduce(
        (result, item) => result.orElse(() => this.itemSearch(item)),
        Nothing,
      );
  }

  private itemSearch(item: string): Maybe<Breed> {
    const names = item.split(/\s|-/u);

    return names
      .reduce(
        (result, name) =>
          result.orElse(() =>
            this.breeds.get(name).map(subNames => ({ name, subNames })),
          ),
        Nothing,
      )
      .map(({ name, subNames }) => ({
        name,
        subName: names.reduce(
          (result, subName) =>
            result.orElse(() =>
              subNames.member(subName) ? Just(subName) : Nothing,
            ),
          Nothing,
        ),
      }));
  }
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
).map(pairs => new AviaryImpl(Dict.fromList(pairs)));

const init = <Action>(
  tagger: (result: Either<string, Aviary>) => Action,
): Effect<Action> => dispatch => {
  fetch(`${DOG_API}/breeds/list/all`)
    .then(response => response.text())
    .then(json => dogApiDecoder(aviaryDecoder).decodeJSON(json))
    .then(
      result => dispatch(tagger(result.mapLeft(error => error.stringify(4)))),
      error => dispatch(tagger(Left(String(error)))),
    );
};

const search = (breed: Breed): Promise<string[]> => {
  const method = breed.subName.cata({
    Nothing: () => `breed/${breed.name}/images`,

    Just: subName => `breed/${breed.name}/${subName}/images`,
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
};

export const Aviary = { init, search };
