import Dict from 'frctl/Dict';
import Maybe from 'frctl/Maybe';
import Set from 'frctl/Set';

import { Aviary } from '.';

const inst = new Aviary(
  Dict.empty
    .insert('affenpinscher', Set.empty)
    .insert('akita', Set.empty)
    .insert('appenzeller', Set.empty)
    .insert('australian', Set.fromList(['shepherd']))
    .insert('basenji', Set.empty)
    .insert('bulldog', Set.fromList(['boston', 'english', 'french']))
    .insert('briard', Set.empty) as Dict<string, Set<string>>,
);

it('@ Aviary.classify() empty input', () => {
  expect.assertions(1);

  expect(inst.classify([])).toBe(Maybe.Nothing);
});

it('@ Aviary.classify() single non existing input', () => {
  expect.assertions(1);

  expect(
    inst.classify([
      {
        className: 'something',
        probability: 0.5,
      },
    ]),
  ).toBe(Maybe.Nothing);
});

it('@ Aviary.classify() single lowercase existing input', () => {
  expect.assertions(1);

  expect(
    inst.classify([
      {
        className: 'akita',
        probability: 0.5,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.5,
      breed: 'akita',
      subBreed: Maybe.Nothing,
    }),
  );
});

it('@ Aviary.classify() single Capital case existing input', () => {
  expect.assertions(1);

  expect(
    inst.classify([
      {
        className: 'Akita',
        probability: 0.5,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.5,
      breed: 'akita',
      subBreed: Maybe.Nothing,
    }),
  );
});

it('@ Aviary.classify() many unsorted inputs', () => {
  expect.assertions(1);

  expect(
    inst.classify([
      {
        className: 'akita',
        probability: 0.5,
      },
      {
        className: 'bulldog',
        probability: 0.6,
      },
      {
        className: 'none_existing',
        probability: 0.75,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'bulldog',
      subBreed: Maybe.Nothing,
    }),
  );
});

it('@ Aviary.classify() single composite input', () => {
  expect.assertions(1);

  expect(
    inst.classify([
      {
        className: 'something,akita, buldog',
        probability: 0.6,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'akita',
      subBreed: Maybe.Nothing,
    }),
  );
});

it('@ Aviary.classify() single composite input with sub breed', () => {
  expect.assertions(2);

  expect(
    inst.classify([
      {
        className: 'something,bulldog-english,  appenzeller',
        probability: 0.6,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'bulldog',
      subBreed: Maybe.Just('english'),
    }),
  );

  expect(
    inst.classify([
      {
        className: 'something,bulldog  english,  appenzeller',
        probability: 0.6,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'bulldog',
      subBreed: Maybe.Just('english'),
    }),
  );
});

it('@ Aviary.classify() single composite input with reversed sub breed order', () => {
  expect.assertions(2);

  expect(
    inst.classify([
      {
        className: 'something,english-bulldog,  appenzeller',
        probability: 0.6,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'bulldog',
      subBreed: Maybe.Just('english'),
    }),
  );

  expect(
    inst.classify([
      {
        className: 'something,english  bulldog,  appenzeller',
        probability: 0.6,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'bulldog',
      subBreed: Maybe.Just('english'),
    }),
  );
});

it('@ Aviary.classify() single composite input with multiple sub breeds', () => {
  expect.assertions(1);

  expect(
    inst.classify([
      {
        className: 'something,boston english-bulldog,  appenzeller',
        probability: 0.6,
      },
    ]),
  ).toStrictEqual(
    Maybe.Just({
      match: 0.6,
      breed: 'bulldog',
      subBreed: Maybe.Just('boston'),
    }),
  );
});
