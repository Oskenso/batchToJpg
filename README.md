
# batchToJpg

`batchToJpg` is a tool to automatically convert all PNG images in a
folder (and its subfolders) to JPG using mozjpeg.

## Features
- Searches through folders and subfolders automatically.
- Ignores certain folders like `node_modules` and dot files/folders (like `.git`).
- Can delete the original PNG files after conversion if you'd like using --delete-original=true

## Usage 
```bash
batchToJpg [<folder>] [--delete-original] [--exclude=<path>...]
```
```bash
    batchToJpg C:\Users\MyUser\Pictures
    batchToJpg C:\Users\MyUser\Pictures --delete-original
    batchToJpg C:\Users\MyUser\Pictures --exclude=path/to/exclude --exclude=/anotherfolder
```

## Compiling
### Windows
 - Make sure you have the [Node.js](https://nodejs.org/) runtime installed
 - Get `cjpeg`, a jpeg encoder from [mozjepeg](https://github.com/mozilla/mozjpeg/releases/tag/v4.0.3).
 - Rename the `cjpeg-static.exe` found within `\static\Release\` to` cjpeg.exe` and place it in the root directory of this file

### macOS
Make sure mozjpeg is installed, this can be done with brew
```bash
brew install mozjpeg
```
then npm install and you're good to go!
```bash
npm i
```