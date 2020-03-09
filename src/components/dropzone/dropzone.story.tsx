import { action } from '@storybook/addon-actions';
import * as Knobs from '@storybook/addon-knobs';
import * as React from 'react';

import Dropzone from '.';

export default {
  title: 'Dropzone',
  parameters: {
    component: Dropzone
  },
  decorators: [Knobs.withKnobs]
};

export const Default = () => {
  const content = Knobs.text('Content', 'Choose dog photo or drag and drop');

  return (
    <Dropzone onLoad={action('On Load')}>
      {content}
    </Dropzone>
  );
};
