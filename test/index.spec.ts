import { BlurHashMap } from '../src';
jest.mock('fs');
jest.mock('path');
jest.mock('glob');

describe('index', () => {
  describe('blurhash-map', () => {
    const blurHashMap = new BlurHashMap({
      assetsRoot: 'assets/root',
      cRoot: 'C',
      execInitial: 'C/blurhash',
      execMain: 'blurhash',
      hashMapJsonPath: 'lib/hashmap.json',
      imageExtensions: 'jpg,png',
      makeCmd: 'make it',
    });

    it('should return a string containing the message', () => {
      expect('result').toMatch('message');
    });
  });
});
