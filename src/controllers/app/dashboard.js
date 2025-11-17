const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const User = require("../../models/auth");

module.exports = {
  /**
   * @description This function is used to get dashboard statistics
   * @param req
   * @param res
   */
  getDashboardStats: async (req, res) => {
    try {
      // Get userId and role from middleware (set by userAuth middleware)
      const userId = req.authUserId || req.headers["x-user-id"];
    //   console.log(userId,"USERID");
      const role = req.role || req.headers["x-user-role"];

      if (!userId) {
        return Response.errorResponseWithoutData(
          res,
          "User ID not found. Authentication required.",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      }

      // Check admin role
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      // Get total users (active and inactive)
      const totalActiveUsers = await User.countDocuments({
        role: Constant.ROLE.USER,
        status: Constant.FLAGS.ACTIVE,
      });

      const totalInactiveUsers = await User.countDocuments({
        role: Constant.ROLE.USER,
        status: Constant.FLAGS.INACTIVE,
      });

      // Get users logged today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const usersLoggedToday = await User.countDocuments({
        role: Constant.ROLE.USER,
        last_login: {
          $gte: today,
          $lt: tomorrow,
        },
      });

      const dashboardData = {
        totalUsers: {
          active: totalActiveUsers,
          inactive: totalInactiveUsers,
          total: totalActiveUsers + totalInactiveUsers,
        },
        usersLoggedToday: usersLoggedToday,
      };

      return Response.successResponseData(
        res,
        dashboardData,
        Constant.STATUS_CODES.SUCCESS,
        "Dashboard statistics retrieved successfully"
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
};

