#!/usr/bin/env node

const nodemon = require('nodemon');
import { program } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { BlurHashMap, BlurHashMapConfig } from '../src';
import {
  ComponentRange,
  HashMapJsonSaveToTarget,
  zBlurHashMapConfig,
} from '../src/blur-hash-map';

const RC_CONFIG = resolve('.blurhash-maprc.js');

interface CommanderActionOptions {
  assets: string;
  extensions: string;
  componentX?: ComponentRange;
  componentY?: ComponentRange;
  targetJson?: HashMapJsonSaveToTarget;
}
const packageJson: Record<string, string> = JSON.parse(
  readFileSync('./package.json', 'utf-8')
);

const watchChanges = async (options: BlurHashMapConfig): Promise<void> => {
  const blurHashGenerator = new BlurHashMap(options);
  return blurHashGenerator.init().then(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    nodemon({
      watch: options.assetsRoot,
      ext: [...(options.imageExtensions || []), 'hash'].join(''),
    })
      .on('quit', function () {
        throw 'nodemon exited';
      })
      .on('restart', function (changedFiles = []) {
        for (const file of changedFiles) {
          blurHashGenerator.generateOrDelete(file);
        }
      });
  });
};

const readConfig = (): Promise<BlurHashMapConfig> => {
  return new Promise((res, rej) => {
    if (existsSync(RC_CONFIG)) {
      void import(RC_CONFIG).then((config: Record<string, unknown>) => {
        if ('default' in config) {
          res(zBlurHashMapConfig.parse(config.default));
        } else {
          rej('`blurhash-maprc.js` must have default export');
        }
      });
    } else {
      rej();
    }
  });
};

const readCommandParams = () => {
  program
    .version(packageJson.version)
    .option('-a, --assets <assets>', 'Required. Set path to your assets folder')
    .option(
      '-e, --extensions <extensions>',
      'Optional. Define image file extensions. Default: jpg,jpeg,png,bmp,webp'
    )
    .option('-x, --componentX <componentX>', 'Optional. Default : 4')
    .option('-y, --componentY <componentY>', 'Optional. Default : 3')
    .option('-t, --target <targetJson>', 'Optional. Default : project root')
    .action((options: CommanderActionOptions) => {
      if (typeof options.assets !== 'string') {
        throw Error(
          "Please define assets paths to be watched with the '-a' key"
        );
      }
      if (typeof options.assets !== 'string') {
        throw Error(
          "Please define assets paths to be watched with the '-a' key"
        );
      }

      const config: BlurHashMapConfig = {
        assetsRoot: options.assets,
        imageExtensions: BlurHashMap.toAllowedImageTypeList(options.extensions),
        targetJson: options.targetJson,
        components: { x: options.componentX, y: options.componentY },
      };
      void watchChanges(config);
    });
  program.parse(process.argv);
};

readConfig()
  .then(watchChanges)
  .catch(() => {
    readCommandParams();
  });
