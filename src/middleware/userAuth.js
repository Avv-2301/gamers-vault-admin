/**
 * @description Middleware to extract user id and role from headers (set by gateway) and set on request object
 * @param req
 * @param res
 * @param next
 */
const userAuth = (req, res, next) => {
  // Extract from headers (set by gateway proxyFactory)
  req.authUserId = req.headers["x-user-id"];
  req.role = req.headers["x-user-role"];

  return next();
};

module.exports = {
  userAuth,
};

