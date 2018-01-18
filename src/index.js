const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const archiver = require('archiver');

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'build');
const BUILD_DIR = path.join(ROOT_DIR, 'build', 'YSI');
const INCLUDES_DIR = path.join(BUILD_DIR, 'pawno', 'include');
const YSI_WRAPPER_DIR = path.join(BUILD_DIR, 'YSI-Wrapper');

const YSI_REPO_PATH = 'https://github.com/Misiur/YSI.git';
const YSI_INCLUDES_REPO_PATH = 'https://github.com/Misiur/YSI-Includes.git';
const AMX_ASSEMBLY_REPO_PATH = 'https://github.com/Zeex/amx_assembly.git';

fs.removeSync(BUILD_DIR);
fs.mkdirsSync(path.join(BUILD_DIR, 'pawno', 'include'));

const clone = (name, url, cwd, folder) => new Promise(resolve => require('simple-git')(cwd)
  .exec(() => console.log(`Started cloning ${name}`))
  .clone(url, folder, ['--depth=1'], (err) => {
    if (err) {
      throw err;
    }

    console.log(`Cloned ${name}`);
    resolve();
  })
);

Promise.all([
  clone('YSI-Includes', YSI_INCLUDES_REPO_PATH, INCLUDES_DIR, '.'),
  clone('amx_assembly', AMX_ASSEMBLY_REPO_PATH, INCLUDES_DIR, 'amx'),
  clone('YSI', YSI_REPO_PATH, BUILD_DIR, YSI_WRAPPER_DIR, '.'),
])
.then(() => console.log('Copying scriptfiles'))
.then(() => fs.copy(path.join(YSI_WRAPPER_DIR, 'scriptfiles'), path.join(BUILD_DIR, 'scriptfiles')))
.then(() => console.log('Copying finished'))
.then(() => fs.remove(YSI_WRAPPER_DIR))
.then(() => console.log('Starting removing all git related files'))
.then(() => new Promise(resolve => glob(`{${BUILD_DIR}/**/.git*,${BUILD_DIR}/**/pawn.json}`, (err, files) => {
  if (err) {
    throw err;
  }

  resolve(Promise.all(files.map(file => fs.remove(file))));
})))
.then(() => {
  console.log('Removed all git related files');
  console.log('Preparing archives');

  const zip = fs.createWriteStream(path.join(PACKAGES_DIR, 'YSI.zip'));
  const zipArchive = archiver('zip');

  zip.on('close', () => {
    console.log(`${zipArchive.pointer()} total bytes`);
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  zipArchive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn(err);
    } else {
      throw err;
    }
  });

  zipArchive.on('error', (err) => {
    throw err;
  });

  zipArchive.pipe(zip);
  zipArchive.directory(BUILD_DIR, false);
  zipArchive.finalize();
})
.catch((err) => {
  throw err;
})
;
