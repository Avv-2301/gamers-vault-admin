const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const User = require("../../models/auth");
const {
  loginValidation,
  logoutValidation,
  updatePasswordValidation,
} = require("../../services/Validation");
const UserLoginHistory = require("../../models/loginHistory");
const { issueToken } = require("../../services/userJwt");
const axios = require("axios");
const ip = require("ip");
const bcrypt = require("bcrypt");
const zxcvbn = require("zxcvbn");

module.exports = {
  /**
   * @description This function is used to login admin
   * @param req
   * @param res
   */
  login: async (req, res) => {
    try {
      // console.log("login admin");
      const requestParams = req.body;

      if (!requestParams?.email || !requestParams?.password) {
        return Response.errorResponseData(
          res,
          "All Fields Required",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }

      loginValidation(requestParams, res, async (validate) => {
        if (validate) {
          const user = await User.findOne({ email: requestParams?.email });
          // console.log(user, "USER DATAAA");

          let system_ip = ip.address(); //system ip address

          //get browser ip address with timeout
          let browser_ip;
          try {
            browser_ip = await axios.get(
              "https://api.ipify.org/?format=json",
              { timeout: 5000 } // 5 second timeout
            );
          } catch (error) {
            // If IP lookup fails, continue without it
            console.log("IP lookup failed, continuing without browser IP");
            browser_ip = { data: { ip: "unknown" } };
          }

          if (user && user?.role === Constant.ROLE.ADMIN) {
            if (user && user?.verified !== null) {
              if (user && user?.status === Constant.FLAGS.ACTIVE) {
                const comparePassword = await bcrypt.compare(
                  requestParams?.password,
                  user.password
                );
                if (comparePassword) {
                  const expiresIn = 60 * 60;
                  // console.log(expiresIn);
                  const userExpTime = Math.floor(Date.now() / 1000) + expiresIn;
                  // console.log(userExpTime);

                  const payload = {
                    id: user?._id,
                    role: user?.role,
                    expiry: userExpTime,
                  };

                  const token = issueToken(payload);
                  // console.log(token, "TOKEN");

                  const meta = { token };
                  let tokenUpdate = {};

                  tokenUpdate = {
                    $set: {
                      last_login: new Date(),
                      token: token,
                      tokenExpiresAt: userExpTime,
                      "ip_address.system_ip": system_ip,
                      "ip_address.browser_ip": browser_ip?.data?.ip,
                    },
                  };

                  let loginHistory = await UserLoginHistory.findOne({
                    userId: user?._id,
                  });
                  let loginHistoryObject = {};

                  if (loginHistory) {
                    loginHistoryObject = {
                      loginDetails: {
                        ip_address: {
                          system_ip: system_ip,
                          browser_ip: browser_ip?.data?.ip,
                        },
                        last_login: new Date(),
                      },
                    };

                    let update = {};
                    if (loginHistory?.loginDetails?.length !== 100) {
                      tenRecords = loginHistoryObject;
                      update = {
                        $push: {
                          loginDetails: loginHistoryObject?.loginDetails,
                        },
                      };
                    } else {
                      update = {
                        $set: {
                          loginDetails: [],
                        },
                      };
                    }

                    await UserLoginHistory.updateOne(
                      { userId: user._id },
                      update
                    );
                  } else {
                    loginHistoryObject = {
                      userId: user._id,
                      loginDetails: {
                        ip_address: {
                          system_ip: system_ip,
                          browser_ip: browser_ip?.data?.ip,
                        },
                        last_login: new Date(),
                      },
                    };

                    const history = await UserLoginHistory.create(
                      loginHistoryObject
                    );
                    tokenUpdate.$set.loginHistory = history?._id;
                  }
                  await User.updateOne({ _id: user?._id }, tokenUpdate);

                  return Response.successResponseData(
                    res,
                    user,
                    Constant.STATUS_CODES.SUCCESS,
                    "Login Successfull",
                    meta
                  );
                } else {
                  return Response.validationErrorResponseData(
                    res,
                    "Password Not Correct",
                    Constant.STATUS_CODES.UNAUTHORIZED
                  );
                }
              } else {
                return Response.errorResponseWithoutData(
                  res,
                  "User is InActive",
                  Constant.STATUS_CODES.BAD_REQUEST
                );
              }
            } else {
              return Response.errorResponseWithoutData(
                res,
                "User is not Verified",
                Constant?.STATUS_CODES.BAD_REQUEST
              );
            }
          } else {
            return Response.errorResponseWithoutData(
              res,
              "Access denied",
              Constant.STATUS_CODES.BAD_REQUEST
            );
          }
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to logout
   * @param req
   * @param res
   */
  logout: async (req, res) => {
    try {
      const requestParams = req.body;
      if (!requestParams?.userId) {
        return Response.errorResponseWithoutData(
          res,
          "User Id required",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }
      logoutValidation(requestParams, res, async (validate) => {
        if (validate) {
          const findUser = await User.findOne(
            { _id: requestParams?.userId },
            { _id: 1 }
          );
          if (!findUser) {
            return Response.errorResponseWithoutData(
              res,
              "User not found",
              Constant.STATUS_CODES.NO_CONTENT
            );
          }
          await User.updateOne(
            { _id: requestParams?.userId },
            {
              $set: {
                token: null,
                tokenExpiresAt: null,
                "ip_address.system_ip": null,
                "ip_address.browser_ip": null,
              },
            }
          );
          return Response.successResponseWithoutData(
            res,
            "User logged out successfully",
            Constant.STATUS_CODES.SUCCESS
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get logged-in user's login history
   * @param req
   * @param res
   */
  getLoginHistory: async (req, res) => {
    try {
      // Get user ID from route parameters
      const userId = req.params.userId;
      console.log(userId, "USER ID");

      if (!userId) {
        return Response.errorResponseWithoutData(
          res,
          "User ID not found. Authentication required.",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      }

      // Find login history for the user
      const loginHistory = await UserLoginHistory.findOne({
        userId: userId,
      }).populate("userId", "name email role");

      if (!loginHistory) {
        return Response.successResponseData(
          res,
          { loginDetails: [] },
          Constant.STATUS_CODES.SUCCESS,
          "No login history found"
        );
      }

      // Sort login details by last_login in descending order (most recent first)
      const sortedLoginDetails = loginHistory.loginDetails
        ? [...loginHistory.loginDetails].sort(
            (a, b) => new Date(b.last_login) - new Date(a.last_login)
          )
        : [];

      return Response.successResponseData(
        res,
        {
          userId: loginHistory.userId,
          loginDetails: sortedLoginDetails,
          totalLogins: sortedLoginDetails.length,
        },
        Constant.STATUS_CODES.SUCCESS,
        "Login history retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to update admin password
   * @param req
   * @param res
   */
  updatePassword: async (req, res) => {
    try {
      const requestParams = req.body;
      // console.log(requestParams, "REQUEST PARAMS");
      const userId = req.params.userId;

      if (!userId) {
        return Response.errorResponseWithoutData(
          res,
          "User ID not found. Authentication required.",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      }

      if (!requestParams?.newPassword || !requestParams?.confirmPassword) {
        return Response.errorResponseWithoutData(
          res,
          "New password and confirm password are required",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }

      // Check if new password and confirm password match
      if (requestParams.newPassword !== requestParams.confirmPassword) {
        return Response.errorResponseWithoutData(
          res,
          "New password and confirm password do not match",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      updatePasswordValidation(requestParams, res, async (validate) => {
        if (validate) {
          // Find the admin user
          const user = await User.findOne({ _id: userId });

          if (!user) {
            return Response.errorResponseWithoutData(
              res,
              "User not found",
              Constant.STATUS_CODES.NO_CONTENT
            );
          }

          // Verify user is admin
          if (user.role !== Constant.ROLE.ADMIN) {
            return Response.errorResponseWithoutData(
              res,
              "Access denied. Admin privileges required.",
              Constant.STATUS_CODES.FORBIDDEN
            );
          }

          // Check if new password is same as current password
          const isSamePassword = await bcrypt.compare(
            requestParams.newPassword,
            user.password
          );

          if (isSamePassword) {
            return Response.errorResponseWithoutData(
              res,
              "New password must be different from current password",
              Constant.STATUS_CODES.BAD_REQUEST
            );
          }

          // Check password strength
          const passwordStrength = zxcvbn(requestParams.newPassword);
          if (passwordStrength.score < 2) {
            return Response.errorResponseWithoutData(
              res,
              "Password is too weak. Please choose a stronger password.",
              Constant.STATUS_CODES.NOT_ACCEPTABLE
            );
          }

          // Hash the new password
          const hashedPassword = await bcrypt.hash(requestParams.newPassword, 10);

          // Update password
          await User.updateOne(
            { _id: userId },
            {
              $set: {
                password: hashedPassword,
              },
            }
          );

          return Response.successResponseWithoutData(
            res,
            "Password updated successfully",
            Constant.STATUS_CODES.SUCCESS
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};

