const axios = require("axios");

const Request = {
  ok: 200,
  post: function (host, urlPostfix, data) {
    return new Promise((resolve, reject) => {
      const url = `${host}${urlPostfix}`;
      console.info(
        `Axios/post ${console.wrap("-->", console.CYAN)} [SERVER] ${console.wrap(urlPostfix, console.MAGENTA)}`,
        data
      );

      axios
        .post(url, data)
        .then((res) => {
          console.info(
            `Axios/post ${console.wrap("<--", console.GREEN)} [SERVER] ${console.wrap(urlPostfix, console.MAGENTA)}`,
            res.data
          );
          resolve(res.data);
        })
        .catch((err) => {
          console.error(
            `Axios/post ${console.wrap("<-X-", console.RED)} [SERVER] ${console.wrap(urlPostfix, console.MAGENTA)}`,
            err.message
          );
          reject(err);
        });
    });
  },
  get: function (urlPostfix) {
    return new Promise((resolve, reject) => {
      const url = `${host}${urlPostfix}`;
      console.info(
        `Axios/get ${console.wrap("-->", console.CYAN)} [SERVER] ${console.wrap(urlPostfix, console.MAGENTA)}`
      );

      axios
        .get(url)
        .then((res) => {
          console.info(
            `Axios/get ${console.wrap("<--", console.GREEN)} [SERVER] ${console.wrap(urlPostfix, console.MAGENTA)}`,
            res.data
          );
          resolve(res.data);
        })
        .catch((err) => {
          console.error(
            `Axios/get ${console.wrap("<-X-", console.RED)} [SERVER] ${console.wrap(urlPostfix, console.MAGENTA)}`,
            err.message
          );
          reject(err);
        });
    });
  },
};

module.exports = Request;
