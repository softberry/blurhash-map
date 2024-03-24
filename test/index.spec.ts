import { BlurHashMap, BlurHashMapConfig } from '../src';
import { existsSync, unlinkSync } from 'fs';
import { globSync } from 'glob';
import { resolve } from 'path';
const config: BlurHashMapConfig = {
  assetsRoot: 'test/fixtures/assets/images/samples',
  cRoot: 'src/C',
  execInitial: 'src/C/blurhash_encoder',
  execMain: 'test/fixtures/blurhash_encoder',
  hashMapJsonPath: 'test/fixtures/lib/hashmap.json',
  imageExtensions: 'jpg,png,jpeg',
  makeCmd: 'make blurhash_encoder',
};

const cleanUpRestOver = () => {
  const pattern = `${resolve(config.assetsRoot)}/**/*.hash`;
  const hashFiles = globSync(pattern);
  for (const hash of hashFiles) {
    unlinkSync(hash);
  }
  try {
    unlinkSync(resolve(config.execInitial));
    unlinkSync(resolve(config.execMain));
    unlinkSync(resolve(config.hashMapJsonPath));
  } catch (e) {
    //
  }
};
describe('index', () => {
  beforeAll(() => {
    cleanUpRestOver();
  });

  describe('blurhash-map', () => {
    const blurHashMap = new BlurHashMap(config);

    it('should return a string containing the message', () => {
      const f = jest.fn();
      void blurHashMap.init().then(() => {
        f();
      });

      expect(existsSync(blurHashMap.config.execMain)).toBe(true);
      expect(existsSync(blurHashMap.config.execInitial)).toBe(false);
    });
  });
});
