const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

function isDir(path) {
    return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}

function isSymbolicLink(path) {
    return fs.existsSync(path) && fs.lstatSync(path).isSymbolicLink();
}

function isAsar(path) {
    return path.includes('.asar');
}

async function rmdirRecursivelySync(path) {
    return new Promise((resolve, reject) => {
        fs.rm(path, {recursive: true}, err => {
            if(err) {
                reject(err);
            } else {
                resolve();
            }
        });
    }); 
}

function copyFile(source, dest) {
    let destPath = dest;
    if(isDir(destPath)) destPath = path.join(dest, path.basename(source));
    if(isDir(destPath)) 

    fs.copyFileSync(source, destPath);
}

function symlink(source, dest) {
    const link = fs.readlinkSync(source);
    const destLink = fs.lstatSync(dest);

    if(!destLink) {
        fs.symlinkSync(link, dest);
    }
}

// delete dest & copy source -> dest
async function copydirRecursivelySync(source, dest) {
    if(fs.existsSync(source) === false) {
        throw new Error(`Can't copy from non-exist folder ${source}`);
    }

    if(fs.lstatSync(source).isDirectory() === false) {
        throw new Error(`Source path doesn't indicate directoy: ${source}`);
    }

    const targetRootFolder = path.join(dest, path.basename(source));
    if(!fs.existsSync(targetRootFolder) || isDir(targetRootFolder) === false) {
        fs.mkdirSync(targetRootFolder);
    }

    const filesToCopy = fs.readdirSync(source);
    for(const file of filesToCopy) {
        const currentSource = path.join(source, file);

        if(isAsar(currentSource)) {
            if(fs.existsSync(targetRootFolder) === false) fs.mkdirSync(targetRootFolder);
            fs.copyFileSync(currentSource, targetRootFolder);
        }else if (isSymbolicLink(currentSource) === true) {
            symlink(currentSource, targetRootFolder);
        } else if (isDir(currentSource) === true) {
            await copydirRecursivelySync(currentSource, targetRootFolder);
        } else {
            copyFile(currentSource, targetRootFolder);
        }
    }
}

module.exports = {
    rmdirRecursivelySync,
    copydirRecursivelySync,
    isDir
};