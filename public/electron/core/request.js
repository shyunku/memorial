const AXIOS = require("axios").default;
const https = require("https");

const SERVER_WRAPPED = console.wrap("[SERVER]", console.BLUE);

const axios = AXIOS.create();

// const axios = AXIOS.create({
//   httpsAgent: new https.Agent({
//     rejectUnauthorized: false,
//   }),
// });

const Request = {
  ok: 200,
  post: function (host, urlPostfix, data, options) {
    return new Promise((resolve, reject) => {
      const url = `${host}${urlPostfix}`;
      console.info(
        `Axios/post ${console.wrap(
          "-->",
          console.CYAN
        )} ${SERVER_WRAPPED} ${console.wrap(urlPostfix, console.MAGENTA)}`,
        data
      );

      axios
        .post(url, data, options)
        .then((res) => {
          console.info(
            `Axios/post ${console.wrap(
              "<--",
              console.GREEN
            )} ${SERVER_WRAPPED} ${console.wrap(urlPostfix, console.MAGENTA)}`,
            res.data
          );
          resolve(res.data);
        })
        .catch((err) => {
          console.error(
            `Axios/post ${console.wrap(
              "<-X-",
              console.RED
            )} ${SERVER_WRAPPED} ${console.wrap(urlPostfix, console.MAGENTA)}`,
            err.message
          );
          reject(err);
        });
    });
  },
  get: function (host, urlPostfix, options) {
    return new Promise((resolve, reject) => {
      const url = `${host}${urlPostfix}`;
      console.info(
        `Axios/get ${console.wrap(
          "-->",
          console.CYAN
        )} ${SERVER_WRAPPED} ${console.wrap(url, console.MAGENTA)}`
      );

      axios
        .get(url, options)
        .then((res) => {
          console.info(
            `Axios/get ${console.wrap(
              "<--",
              console.GREEN
            )} ${SERVER_WRAPPED} ${console.wrap(urlPostfix, console.MAGENTA)}`,
            res.data
          );
          resolve(res.data);
        })
        .catch((err) => {
          console.error(
            `Axios/get ${console.wrap(
              "<-X-",
              console.RED
            )} ${SERVER_WRAPPED} ${console.wrap(urlPostfix, console.MAGENTA)}`,
            err.message
          );
          reject(err);
        });
    });
  },
};

module.exports = Request;
