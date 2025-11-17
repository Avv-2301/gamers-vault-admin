const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");

module.exports = {
  internalAuth: (req, res, next) => {
    if (req.headers["x-internal-call"] === "true") {
      return next();
    }

    return Response.errorResponseWithoutData(
      res,
      "Forbidden - External access denied",
      Constant.STATUS_CODES.FORBIDDEN
    );
  }
};

