const dmg = require('dmg');

async function mountSync(vol) {
    return new Promise((resolve, reject) => {
        dmg.mount(vol, (err, path) => {
            if(err) reject(err);
            else resolve(path);
        });
    });
}

async function unmountSync(vol) {
    return new Promise((resolve, reject) => {
        dmg.mount(vol, (err, path) => {
            if(err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    mountSync,
    unmountSync
}