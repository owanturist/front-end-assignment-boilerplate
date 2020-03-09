module.exports = {
  stories: ['../src/**/*.stories.ts*', '../src/**/*.story.ts*'],
  addons: [
    '@storybook/preset-typescript',
    '@storybook/addon-actions',
    '@storybook/addon-knobs/register',
  ],
};
