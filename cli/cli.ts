#!/usr/bin/env node

const nodemon = require('nodemon');
import { program } from 'commander';
import { readFileSync } from 'fs';
import {
  AllowedImageTypeList,
  BlurHashMap,
  ComponentRange,
} from '../lib/blur-hash-map';

interface CommanderActionOptions {
  assets: string;
  extensions: string;
  componentX: string;
  componentY: string;
}
const packageJson: Record<string, string> = JSON.parse(
  readFileSync('./package.json', 'utf-8')
);
program
  .version(packageJson.version)
  .description(packageJson.description)
  .option('-a, --assets <assets>', 'Required. Set path to your assets folder')
  .option(
    '-e, --extensions <extensions>',
    'Optional. Define image file extensions. Default: jpg,jpeg,png,bmp,webp'
  )
  .option('-x, --componentX <componentX>', 'Optional. Default : 4')
  .option('-y, --componentY <componentY>', 'Optional. Default : 3')
  .action(async function (options: CommanderActionOptions) {
    const blurHashGenerator = new BlurHashMap({
      assetsRoot: options.assets,
      imageExtensions: options.extensions.split(',') as AllowedImageTypeList,
      components: {
        x: parseInt(options.componentX) as ComponentRange,
        y: parseInt(options.componentY) as ComponentRange,
      },
    });

    await blurHashGenerator.init();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    nodemon({ watch: options.assets, ext: options.extensions + ',hash' })
      .on('quit', function () {
        throw 'nodemon exited';
      })
      .on('restart', function (changedFiles = []) {
        for (const file of changedFiles) {
          blurHashGenerator.generateOrDelete(file);
        }
      });
  });

program.parse(process.argv);
