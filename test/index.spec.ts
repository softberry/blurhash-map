import {
  AllowedImageTypes,
  ERR_LIST_CANNOT_BE_EMPTY,
} from '../src/blur-hash-map';

import { BlurHashMap, BlurHashMapConfig } from '../src';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

const ALLOWED_IMAGE_TYPES = ['bmp', 'jpeg', 'jpg', 'png', 'webp'];
const config: BlurHashMapConfig = {
  assetsRoot: 'test/fixtures/assets',
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
    fs.unlinkSync(blurHashMap.executable);
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
      expect(fs.existsSync(blurHashMap.executable)).toBe(true);
      expect(JSON.parse(fs.readFileSync(hashMapJsonPath).toString())).toEqual(
        hashmapJSON
      );
    });

    it('should throw if not allowed file extension configured', () => {
      const txt = 'txt' as AllowedImageTypes;
      expect(() => {
        new BlurHashMap({
          ...config,
          imageExtensions: ['jpeg', txt],
        });
      }).toThrow();
    });
  });

  describe('static toAllowedImageTypeList', () => {
    it('must be exist', () => {
      expect(BlurHashMap).toHaveProperty('toAllowedImageTypeList');
    });

    it('should return all given extensions correctly', () => {
      const fullList = BlurHashMap.toAllowedImageTypeList(
        'jpg,jpeg,png,webp,bmp'
      );
      expect(fullList).toEqual(expect.arrayContaining(ALLOWED_IMAGE_TYPES));
    });

    it('should remove invalid values ', () => {
      const fullList = BlurHashMap.toAllowedImageTypeList(
        'jpg,txt,jpeg,pdf,png,webp,bmp'
      );
      expect(fullList).toEqual(expect.arrayContaining(ALLOWED_IMAGE_TYPES));
    });

    it('should return correct result ', () => {
      const fullList = BlurHashMap.toAllowedImageTypeList('png,bmp');
      expect(fullList).toEqual(expect.arrayContaining(['bmp', 'png']));
    });

    it('throw error if the list is empty', () => {
      expect(() => {
        BlurHashMap.toAllowedImageTypeList('txt,pdf');
      }).toThrow(Error(ERR_LIST_CANNOT_BE_EMPTY));
    });
  });
});
