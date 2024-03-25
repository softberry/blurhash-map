import { BlurHashMap, BlurHashMapConfig } from '../src';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';
import { AllowedImageTypes } from '../src/blur-hash-map';
const config: BlurHashMapConfig = {
  assetsRoot: 'test/fixtures/assets/',
  imageExtensions: ['jpg', 'jpeg', 'png'],
};

const hashmapJSON = [
  ['/images/samples/test-image-3.jpeg', 'LmQvL5o#?wjFtRt8ofWA%gV@M_j['],
  ['/images/samples/test-image-2.jpeg', 'L9SgUN9S~H~Go;Wlj2xc^a$_ES5F'],
  ['/images/samples/test-image-1.jpeg', 'LIJQ}%-;4mof%Q%MIVoLpLxvs;oL'],
];

const cleanUpRestOver = () => {
  const pattern = `${path.resolve(config.assetsRoot)}/**/*.hash`;
  const hashFiles = globSync(pattern);
  const blurHashMap = new BlurHashMap(config);
  for (const hash of hashFiles) {
    fs.unlinkSync(hash);
  }
  try {
    fs.unlinkSync(blurHashMap.config.execInitial);
    fs.unlinkSync(blurHashMap.config.execMain);
  } catch (e) {
    //
  }
};
describe('index', () => {
  beforeAll(() => {
    cleanUpRestOver();
  });
  afterAll(() => {
    cleanUpRestOver();
  });

  describe('blurhash-map', () => {
    const blurHashMap = new BlurHashMap(config);
    it('should create shortPath correctly', () => {
      const shortPath = '/test.jpg';
      const createdShortPath = blurHashMap.getShortPath(
        blurHashMap.config.assetsRoot + '/test.jpg'
      );
      expect(createdShortPath).toEqual(shortPath);
    });

    it('should create hashmap and json', async () => {
      const hashMapJsonPath = await blurHashMap.init();

      expect(fs.existsSync(blurHashMap.config.execMain)).toBe(true);
      expect(fs.existsSync(blurHashMap.config.execInitial)).toBe(false);
      expect(JSON.parse(fs.readFileSync(hashMapJsonPath).toString())).toEqual(
        hashmapJSON
      );
    });

    it('should throw if not allowed file extension configured', async () => {
      const txt = 'txt' as AllowedImageTypes;
      const blurHashMapError = new BlurHashMap({
        ...config,
        imageExtensions: ['jpeg', txt],
      });
      await expect(blurHashMapError.init()).rejects.toThrow('');
    });
  });
});
