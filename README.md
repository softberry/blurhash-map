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
// Generate hash-map for all images in a directory
import { BlurHashMap, BlurHashMapConfig } from 'blurhash-map';

const options: BlurHashMapConfig = {
  assetsRoot: 'assets',
  imageExtensions: ['jpg', 'jpeg'],
  components: { x: 4, y: 3 },
  targetJson: 'assets/test-map.json',
};
const blurHashGenerator = new BlurHashMap(options);

return blurHashGenerator.init().then(() => {
  // Now, there should be files created next to images
  // with the same name but having `.hash` suffix. You should commit these files
  // to avoid re-generate them next time you run `BlurHashMap`.
  console.log(
    `
    - Blurhash for all files at: ${options.assetsRoot} created.
    - Generated hash-map saved here as ${target.targetJson}
    `
  );
});
```

## API

### BlurHashMap(config)

#### config

Type: `BlurHashMapConfig`

| param             | type                            | required | description                                                                             |
| ----------------- | ------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| _assetsRoot_      | string                          | yes      | Where to find the images                                                                |
| _hashMapJsonPath_ | string                          | yes      | Where to save generated JSON                                                            |
| _imageExtensions_ | Array<string>                   | no       | Define which image files. Default : 'jpg' \| 'jpeg' \| 'png' \| 'bmp' \| 'webp'         |
| _components_      | Object { x: number; y: number } | no       | Optional between 1-9. Default {x:4,y:3}. Higher is more detailed blur but longer string |
| _targetJson_      | string                          | no       | Path to save generated json file. Default: `<root>./hashmap\.json`                      |

## Run as npm script with params:

```json
scripts:{
  "blurhash-watch":"blurhash-map -a \"assets/images\" -e \"jpg,jpeg,bmp\" -x 4 -x 3 -t \"assets/hashmap.json\""
}
```

## Run as npm script with config file:

create a config file called `blurhash-maprc.js` at the root of your project.

```js
module.exports = {
  assetsRoot: 'assets/images',
  components: { x: 4, y: 3 },
  extensions:['jpg','jpeg','bmp']
  targetJson: 'assets/images/hashmap.json',
};
```

And then add a script to your `package.json` file

```json
scripts:{
  "blurhash-watch":"blurhash-map"
}
```

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
