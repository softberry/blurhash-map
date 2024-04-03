import { glob, globSync } from 'glob';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import { extname, resolve } from 'path';
import z from 'zod';

const zComponentRange = z.custom<`${number}` | number>(val => {
  if (typeof val === 'number') return val > 0 && val < 9;
  if (typeof val === 'string') {
    const intVal = parseInt(val);
    return intVal > 0 && intVal < 9;
  }
  return false;
});
export type ComponentRange = z.infer<typeof zComponentRange>;

export const zComponentDimension = z.object({
  x: zComponentRange.optional(),
  y: zComponentRange.optional(),
});

export type ComponentRatio = z.infer<typeof zComponentDimension>;

const zAllowedImageTypes = z.enum(['jpg', 'jpeg', 'png', 'bmp', 'webp']);
const zAllowedImageTypeList = z.array(zAllowedImageTypes);

export type AllowedImageTypes = z.infer<typeof zAllowedImageTypes>;
export type AllowedImageTypeList = z.infer<typeof zAllowedImageTypeList>;

const zHashMapJsonSaveToTarget = z.custom<`${string}.json`>(val => {
  if (typeof val === 'string') {
    return /\.json$/i.test(val);
  }
  return false;
});

export type HashMapJsonSaveToTarget = z.infer<typeof zHashMapJsonSaveToTarget>;

export const ERR_LIST_CANNOT_BE_EMPTY = 'List can not be empty';
export const ERR_LIST_INVALID =
  'Image list should be a string. Use comma as extension separator.';
const DEFAULT_COMPONENT_RATIO: ComponentRatio = { x: 4, y: 3 };
const C_ROOT = './C';
const EXEC_SRC = './C/blurhash_encoder';
const HASHMAP_JSON_FILE_NAME = './hashmap.json';

export const zBlurHashMapConfig = z.object({
  assetsRoot: z.string(),
  imageExtensions: zAllowedImageTypeList.optional(),
  components: zComponentDimension.optional(),
  targetJson: zHashMapJsonSaveToTarget.optional(),
});

export type BlurHashMapConfig = z.infer<typeof zBlurHashMapConfig>;

const zBlurHashMapConstructorConfig = z.object({
  assetsRoot: z.string(),
  imageExtensions: zAllowedImageTypeList,
  components: z.object({
    x: zComponentRange,
    y: zComponentRange,
  }),
  targetJson: zHashMapJsonSaveToTarget,
});

type BlurHashMapConstructorConfig = z.infer<
  typeof zBlurHashMapConstructorConfig
>;

export type BlurHashMapData = [string, string][];

export class BlurHashMap {
  config: BlurHashMapConstructorConfig;

  constructor(config: BlurHashMapConfig) {
    this.config = BlurHashMap.parseConstructorConfig(config);
  }

  get makeCmd(): string {
    return 'make  blurhash_encoder';
  }
  get cRoot(): string {
    return resolve(__dirname, C_ROOT);
  }
  get executable(): string {
    return resolve(__dirname, EXEC_SRC);
  }
  get hashMapJsonPath(): string {
    return resolve(this.config.targetJson);
  }

  async init(): Promise<string> {
    const imageFiles = this.getAllImageFiles();
    this.createExecutableIfNotFound();
    this.checkAllowedFileExtensions();
    imageFiles.forEach(imageFilePath => {
      this.generateOrDelete(imageFilePath, true);
    });
    return this.createJson();
  }

  static parseConstructorConfig(
    this: void,
    config: BlurHashMapConfig
  ): BlurHashMapConstructorConfig {
    return zBlurHashMapConstructorConfig.parse({
      assetsRoot: config.assetsRoot,
      imageExtensions: config.imageExtensions || [
        'bmp',
        'jpeg',
        'jpg',
        'png',
        'webp',
      ],
      components: {
        x: config.components?.x || DEFAULT_COMPONENT_RATIO.x,
        y: config.components?.y || DEFAULT_COMPONENT_RATIO.y,
      },
      targetJson: config.targetJson || `./${HASHMAP_JSON_FILE_NAME}`,
    });
  }

  static toAllowedImageTypeList(
    this: void,
    input?: string
  ): AllowedImageTypeList {
    if (input === undefined) {
      throw new Error(ERR_LIST_INVALID);
    }
    const inputArray = input.split(',').map(str => str.trim());
    const filteredArray = inputArray.filter(
      str => zAllowedImageTypes.safeParse(str).success
    );
    if (filteredArray.length === 0) {
      throw new Error(ERR_LIST_CANNOT_BE_EMPTY);
    }
    return filteredArray as AllowedImageTypeList;
  }

  generateOrDelete(imageOrHashFilePath: string, skipIfHasHash = false): void {
    if (extname(imageOrHashFilePath) === '.hash') {
      const hashFilePath = imageOrHashFilePath;
      const imagePath = this.hashToImagePath(imageOrHashFilePath);
      const imageFileExists = this.isImageFile(imagePath);
      const hashFileNotFound = !this.isHashFile(hashFilePath);
      if (imageFileExists && hashFileNotFound) {
        console.warn('🟡 Image still exists, hash file is regenerated');
        this.generateHash(imagePath);
        return;
      }
    }
    const imageFileExists = this.isImageFile(imageOrHashFilePath);
    if (imageFileExists) {
      const hashFile = imageOrHashFilePath + '.hash';
      const hashFileExists = this.isHashFile(hashFile);
      const shouldGenerate = hashFileExists ? !skipIfHasHash : true;
      if (shouldGenerate) {
        this.generateHash(imageOrHashFilePath);
      }
    } else {
      this.deleteHashIfImagNotFound(imageOrHashFilePath);
    }
  }

  getShortPath(file: string): string {
    return file.replace(this.config.assetsRoot, '');
  }

  async createJson(): Promise<string> {
    return this.cleanUp()
      .then(() => this.getAllImageFiles())
      .then(imageFiles => {
        const json: BlurHashMapData = imageFiles.reduce(
          (cum: BlurHashMapData, imageFile) => {
            const hashFile = imageFile + '.hash';
            if (this.isHashFile(hashFile)) {
              const hash = readFileSync(hashFile, 'utf-8');
              return [...cum, [this.getShortPath(imageFile), hash.trim()]];
            } else {
              throw new Error(
                '❌ HashFile not found for: ' + this.getShortPath(imageFile)
              );
            }
          },
          []
        );
        return json;
      })
      .then(json =>
        writeFileSync(this.hashMapJsonPath, JSON.stringify(json), 'utf-8')
      )
      .then(() => this.hashMapJsonPath);
  }

  private getComponentConfig(rangeConfig?: ComponentRatio): ComponentRatio {
    if (rangeConfig === undefined) return DEFAULT_COMPONENT_RATIO;
    return {
      x: rangeConfig?.x || DEFAULT_COMPONENT_RATIO.x,
      y: rangeConfig?.y || DEFAULT_COMPONENT_RATIO.y,
    };
  }
  private checkAllowedFileExtensions() {
    const allowedExt = Object.keys(
      zAllowedImageTypeList.element.Values
    ).toString();
    const confFiles = this.config.imageExtensions;
    const notAllowedExtList = confFiles.filter(
      ext => !zAllowedImageTypes.safeParse(ext).success
    );

    if (notAllowedExtList.length > 0) {
      throw new Error(
        '❌ only ' +
          allowedExt +
          ' are allowed. Below extensions are ignored. You can remove : ' +
          notAllowedExtList.toString()
      );
    }
    return true;
  }

  private getAllImageFiles(): string[] {
    const strGlobRoot = `${
      this.config.assetsRoot
    }/**/*.{${this.config.imageExtensions.join(',')}}`;
    return globSync(strGlobRoot);
  }

  private async getAllHashFiles(): Promise<string[]> {
    return await glob(this.config.assetsRoot + '/**/*.hash');
  }

  private isImageFile(imageFilePath: string): boolean {
    const ext = extname(imageFilePath)
      .toLowerCase()
      .slice(1) as AllowedImageTypes;
    const isInAssets = this.isFileInPath(imageFilePath);
    const isImage = this.config.imageExtensions.includes(ext);
    return isInAssets && isImage;
  }

  private isHashFile(hashFilePath: string): boolean {
    const isHashExt = extname(hashFilePath) === '.hash';
    const exists = existsSync(hashFilePath);
    const isInAssets = this.isFileInPath(hashFilePath);
    return isInAssets && isHashExt && exists;
  }

  private isFileInPath(filePath: string) {
    const exists = existsSync(filePath);
    const resolvedFilePath = resolve(filePath);
    const resolvedAssetsFolder = resolve(this.config.assetsRoot);

    const isInAssetsFolder = resolvedFilePath.startsWith(resolvedAssetsFolder);
    return exists && isInAssetsFolder;
  }

  private hashToImagePath(hashPath: string): string {
    return hashPath.replace(/\.(hash)$/, '');
  }

  private async cleanUp() {
    const hashFiles = await this.getAllHashFiles();
    for (const hashFile of hashFiles) {
      const imagePathOfHashFile = this.hashToImagePath(hashFile);
      const imageNotFound = !this.isImageFile(imagePathOfHashFile);

      if (imageNotFound) {
        console.info(
          'USELESS HASH: removed ' + hashFile + this.getShortPath(hashFile)
        );
        unlinkSync(hashFile);
      }
    }
  }

  private makeAndCopyExecutable() {
    // Run make command to create blurHash binary
    try {
      execSync(this.makeCmd, { cwd: this.cRoot });
    } catch (e) {
      console.error(e);
    }
  }

  private createExecutableIfNotFound() {
    const rootExecutable = existsSync(this.executable);

    if (rootExecutable) {
      return;
    } else {
      this.makeAndCopyExecutable();
    }
  }

  private deleteHashIfImagNotFound(imageFile: string) {
    const hashFile = `${imageFile}.hash`;
    try {
      const imageNotFound = !existsSync(imageFile);

      if (imageNotFound && this.isHashFile(hashFile)) {
        unlinkSync(hashFile);
        console.info(`✖️ DELETED: ${hashFile}\n`);
      }
      return true;
    } catch (e) {
      console.error(`❌ CAN NOT DELETED: ${hashFile}\n`, e);
      return true;
    }
  }

  private generateHash(imageFilePath: string) {
    const fileIsNotImage = !this.isImageFile(imageFilePath);
    const imageNotFound = !existsSync(imageFilePath);
    const imageNotInAssets = !this.isFileInPath(imageFilePath);
    if (fileIsNotImage) {
      this.deleteHashIfImagNotFound(imageFilePath);
      return;
    }
    if (imageNotFound) {
      console.warn(`NOT_FOUND: ${imageFilePath}`);
      return;
    }
    if (imageNotInAssets) {
      console.warn(
        `WRONG_PATH: ${imageFilePath} is not in ${this.config.assetsRoot}`
      );
      return;
    }

    const imageHashFile = `${imageFilePath}.hash`;
    if (this.isImageFile(imageFilePath)) {
      const execCommand = `${this.executable} ${this.config.components.x} ${this.config.components.y} "${imageFilePath}"`;
      const hash = execSync(execCommand);
      writeFileSync(imageHashFile, hash.toString());
      console.info(`✅ ${this.getShortPath(imageHashFile)} has been created\n`);
    }
  }
}
