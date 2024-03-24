# blurhash-map

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Code Coverage][codecov-img]][codecov-url]
[![Commitizen Friendly][commitizen-img]][commitizen-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

> blurhash-map

## Install

```bash
npm install blurhash-map
```

## Usage

```ts
import { BlurHashMap, BlurHashMapConfig } from 'blurhash-map';
const config: BlurHashMapConfig = {
  assetsRoot: 'assets/images/samples',
  hashMapJsonPath: 'test/fixtures/lib/hashmap.json',
  imageExtensions: 'jpg,png,jpeg',
  components: { x: 4, y: 3 },
};
const blurHashMap = new BlurHashMap(config);
blurHashMap.init();
// Now, there should be files created next to images
// with the same name but having `.hash` suffix. You should commit these files
// to avoid re-generate them next time you run `BlurHashMap`.
```

## API

### BlurHashMap(config)

#### config

Type: `BlurHashMapConfig`

assetsRoot: string; // Required. Where to find the images
hashMapJsonPath: string; // Required. Where to save generated JSON
imageExtensions: Array<string>; // Optional. Define which image files. Default : 'jpg' | 'jpeg' | 'png' | 'bmp' | 'webp'
components?: { x: number; y: number }; // Optional between 1-9. Default {x:4,y:3}. Higher is more detailed blur but longer string

#### init()

Initialize `BlurHashMap` asynchronously. Creates `.hash` files and generates `hash-map.json`.

### generateOrDelete(imageOrHashFilePath: string, skipIfHasHash = false)

Generates a hash file if image is found. If Image is not found, deletes the `.hash` file of it.

### getShortPath(file: string): string

Returns the relative path of the given `file` to the `assetsRoot`

### async createJson(): Promise<void>

Creates `hash-map.json` from the found `.hash` files

[build-img]: https://github.com/softberry/blurhash-map/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/softberry/blurhash-map/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/blurhash-map
[downloads-url]: https://www.npmtrends.com/blurhash-map
[npm-img]: https://img.shields.io/npm/v/blurhash-map
[npm-url]: https://www.npmjs.com/package/blurhash-map
[issues-img]: https://img.shields.io/github/issues/softberry/blurhash-map
[issues-url]: https://github.com/softberry/blurhash-map/issues
[codecov-img]: https://codecov.io/gh/softberry/blurhash-map/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/softberry/blurhash-map
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
