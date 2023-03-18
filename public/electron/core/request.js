const axios = require("axios");

const SERVER_WRAPPED = console.wrap("[SERVER]", console.BLUE);

const Request = {
  ok: 200,
  post: function (host, urlPostfix, data, options) {
    return new Promise((resolve, reject) => {
      const url = `${host}${urlPostfix}`;
      console.info(
        `Axios/post ${console.wrap("-->", console.CYAN)} ${SERVER_WRAPPED} ${console.wrap(
          urlPostfix,
          console.MAGENTA
        )}`,
        data
      );

      axios
        .post(url, data, options)
        .then((res) => {
          console.info(
            `Axios/post ${console.wrap("<--", console.GREEN)} ${SERVER_WRAPPED} ${console.wrap(
              urlPostfix,
              console.MAGENTA
            )}`,
            res.data
          );
          resolve(res.data);
        })
        .catch((err) => {
          console.error(
            `Axios/post ${console.wrap("<-X-", console.RED)} ${SERVER_WRAPPED} ${console.wrap(
              urlPostfix,
              console.MAGENTA
            )}`,
            err.message
          );
          reject(err);
        });
    });
  },
  get: function (urlPostfix, options) {
    return new Promise((resolve, reject) => {
      const url = `${host}${urlPostfix}`;
      console.info(
        `Axios/get ${console.wrap("-->", console.CYAN)} ${SERVER_WRAPPED} ${console.wrap(urlPostfix, console.MAGENTA)}`
      );

      axios
        .get(url, options)
        .then((res) => {
          console.info(
            `Axios/get ${console.wrap("<--", console.GREEN)} ${SERVER_WRAPPED} ${console.wrap(
              urlPostfix,
              console.MAGENTA
            )}`,
            res.data
          );
          resolve(res.data);
        })
        .catch((err) => {
          console.error(
            `Axios/get ${console.wrap("<-X-", console.RED)} ${SERVER_WRAPPED} ${console.wrap(
              urlPostfix,
              console.MAGENTA
            )}`,
            err.message
          );
          reject(err);
        });
    });
  },
};

module.exports = Request;
