import { glob, globSync } from 'glob';
import { execSync } from 'child_process';
import {
  existsSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from 'fs';
import { extname, resolve } from 'path';
type ComponentRange = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type AllowedImageTypes = 'jpg' | 'jpeg' | 'png' | 'bmp' | 'webp';
export type AllowedImageTypeList = AllowedImageTypes[];
const ALLOWED_IMAGE_TYPES: AllowedImageTypeList = [
  'jpg',
  'jpeg',
  'png',
  'bmp',
  'webp',
];
const DEFAULT_COMPONENT_RATIO: DefaultComponentRatio = { x: 4, y: 3 };
const C_ROOT = 'src/C';
const EXEC_INITIAL = 'src/C/blurhash_encoder';
const EXEC_MAIN = 'blurhash_encoder';
const HASHMAP_JSON_FILE_NAME = './hashmap.json';
export interface DefaultComponentRatio {
  x: ComponentRange;
  y: ComponentRange;
}

export interface BlurHashMapConfig {
  assetsRoot: string;
  imageExtensions?: AllowedImageTypeList;
  components?: { x: ComponentRange; y: ComponentRange };
}

export type BlurHashMapData = [string, string][];

export class BlurHashMap {
  config: BlurHashMapConfig & {
    components: { x: ComponentRange; y: ComponentRange };
    makeCmd: string;
    cRoot: string;
    execInitial: string;
    execMain: string;
    imageExtensions: AllowedImageTypeList;
  };

  constructor(config: BlurHashMapConfig) {
    this.config = {
      ...config,
      assetsRoot: resolve(config.assetsRoot),
      execMain: resolve(EXEC_MAIN),
      execInitial: resolve(EXEC_INITIAL),
      cRoot: resolve(C_ROOT),
      components: config.components || DEFAULT_COMPONENT_RATIO,
      makeCmd: 'make blurhash_encoder',
      imageExtensions: config.imageExtensions || ALLOWED_IMAGE_TYPES,
    };
  }

  get hashMapJsonPath(): string {
    return resolve(__dirname, HASHMAP_JSON_FILE_NAME);
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

  private checkAllowedFileExtensions() {
    const allowedExt = ALLOWED_IMAGE_TYPES;
    const confFiles = this.config.imageExtensions;
    const notAllowedExtList = confFiles.filter(
      ext => !allowedExt.includes(ext)
    );

    if (notAllowedExtList.length > 0) {
      throw new Error(
        '❌ only ' +
          allowedExt.toString() +
          ' are allowed. Remove these extensions: ' +
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
    const isInAssetsFolder = filePath.startsWith(this.config.assetsRoot);
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
        console.log('USELESS HASH: removed ' + this.getShortPath(hashFile));
        unlinkSync(hashFile);
      }
    }
  }

  private makeAndCopyExecutable() {
    // Run make command to create blurHash binary
    try {
      execSync(this.config.makeCmd, { cwd: this.config.cRoot });

      this.copyExecutable();
    } catch (e) {
      console.error(e);
    }
  }

  private copyExecutable() {
    renameSync(this.config.execInitial, this.config.execMain);
  }

  private createExecutableIfNotFound() {
    const mainExecutable = existsSync(this.config.execMain);
    const initialExecutable = existsSync(this.config.execInitial);
    if (mainExecutable) {
      return;
    } else if (initialExecutable) {
      this.copyExecutable();
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
        console.log(`✖️ DELETED: ${hashFile}\n`);
      }
      return true;
    } catch (e) {
      console.log(`❌ CAN NOT DELETED: ${hashFile}\n`, e);
      return true;
    }
  }

  private generateHash(imageFilePath: string) {
    const fileIsNotImage = !this.isImageFile(imageFilePath);
    const imageNotFound = !existsSync(imageFilePath);
    const imageNotInAssets = !imageFilePath.startsWith(this.config.assetsRoot);
    if (fileIsNotImage) {
      this.deleteHashIfImagNotFound(imageFilePath);
      return;
    }
    if (imageNotFound) {
      console.log(`NOT_FOUND: ${imageFilePath}`);
      return;
    }
    if (imageNotInAssets) {
      console.log(
        `WRONG_PATH: ${imageFilePath} is not in ${this.config.assetsRoot}`
      );
      return;
    }

    const imageHashFile = `${imageFilePath}.hash`;

    if (this.isImageFile(imageFilePath)) {
      const execCommand = `${this.config.execMain} ${this.config.components.x} ${this.config.components.y} ${imageFilePath}`;

      const hash = execSync(execCommand).toString();
      writeFileSync(imageHashFile, hash);
      console.log(`✅ ${this.getShortPath(imageHashFile)} has been created\n`);
    }
  }
}
