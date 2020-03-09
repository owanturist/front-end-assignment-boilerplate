import { action } from '@storybook/addon-actions';
import * as Knobs from '@storybook/addon-knobs';
import Maybe from 'frctl/Maybe';
import RemoteData from 'frctl/RemoteData/Optional';
import * as React from 'react';

import * as App from '.';

export default {
  title: 'App',
  parameters: {
    component: App
  },
  decorators: [Knobs.withKnobs]
};

const [initial] = App.init;

const PACK = [
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1023.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_10263.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_10715.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_10822.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_10832.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_10982.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11006.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11172.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11182.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1126.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1128.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11432.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1145.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_115.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1150.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11570.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11584.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1167.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1186.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_11953.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1222.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1234.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_12364.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1254.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_12563.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1259.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_12664.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1270.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_12867.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_12879.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_13011.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_13145.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_13270.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1335.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_13442.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_13502.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1357.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_1370.jpg',
  'https://images.dog.ceo/breeds/hound-afghan/n02088094_13742.jpg'
];

export const Initial = () => {
  return (
    <App.View
      state={initial}
      dispatch={action('Dispatch')}
    />
  );
};

export const WithPictureUploaded = () => {
  return (
    <App.View
      state={{
        ...initial,
        picture: Maybe.Just(Knobs.text('Searching', 'https://picsum.photos/400/300'))
      }}
      dispatch={action('Dispatch')}
    />
  );
};

export const Searching = () => {
  return (
    <App.View
      state={{
        ...initial,
        picture: Maybe.Just('https://picsum.photos/400/300'),
        search: Knobs.boolean('Searching', true) ? RemoteData.Loading : RemoteData.NotAsked
      }}
      dispatch={action('Dispatch')}
    />
  );
};

export const SearchResult = () => {
  const breed = Knobs.text('Breed', 'Hound')
  const subBreed = Knobs.text('Sub-breed', 'Toy');
  const match = Knobs.number('Match', 0.5, {
    range: true,
    step: 0.0001,
    min: 0,
    max: 1
  });

  return (
    <App.View
      state={{
        ...initial,
        picture: Maybe.Just('https://images.dog.ceo/breeds/hound-afghan/n02088094_1003.jpg'),
        search: RemoteData.Succeed({
          probe: {
            breed,
            subBreed: subBreed.length === 0 ? Maybe.Nothing : Maybe.Just(subBreed),
            match
          },
          pack: PACK
        })
      }}
      dispatch={action('Dispatch')}
    />
  );
};
