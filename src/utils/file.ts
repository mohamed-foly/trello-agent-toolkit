import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { dirname } from 'path';
import { FileError } from './error.js';

export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new FileError(`File not found: ${filePath}`, filePath);
    }
    if (err instanceof SyntaxError) {
      throw new FileError(`Invalid JSON in file: ${filePath}`, filePath);
    }
    throw new FileError(`Failed to read file: ${filePath}`, filePath);
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await ensureDir(dirname(filePath));
    const content = JSON.stringify(data, null, 2);
    await writeFile(filePath, content, 'utf-8');
  } catch (err) {
    if (err instanceof FileError) {
      throw err;
    }
    throw new FileError(`Failed to write file: ${filePath}`, filePath);
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw new FileError(`Failed to create directory: ${dirPath}`, dirPath);
    }
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFileOrDefault<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    return await readJsonFile<T>(filePath);
  } catch {
    return defaultValue;
  }
}
