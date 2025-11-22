const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const AuditLog = require("../../models/auditLog");
const { internalAuth } = require("../../middleware/internalAuth");

module.exports = {
  /**
   * @description This function is used to create an audit log entry
   * Called internally by gateway middleware
   * @param req
   * @param res
   */
  createAuditLog: async (req, res) => {
    try {
      const auditData = req.body;

      // Validate required fields
      if (!auditData.method || !auditData.endpoint || !auditData.responseStatus) {
        return Response.errorResponseWithoutData(
          res,
          "Missing required audit log fields",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      // Create audit log entry
      const auditLog = await AuditLog.create(auditData);

      return Response.successResponseData(
        res,
        auditLog,
        Constant.STATUS_CODES.CREATED,
        "Audit log created successfully"
      );
    } catch (error) {
      console.error("Error creating audit log:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get audit logs with filtering and pagination
   * @param req
   * @param res
   */
  getAuditLogs: async (req, res) => {
    try {
      const userId = req.authUserId || req.headers["x-user-id"];
      const role = req.role || req.headers["x-user-role"];

      // Check admin role
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      // Get query parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};

      if (req.query.userId) {
        filter.userId = req.query.userId;
      }

      if (req.query.userRole) {
        filter.userRole = req.query.userRole;
      }

      if (req.query.method) {
        filter.method = req.query.method.toUpperCase();
      }

      if (req.query.endpoint) {
        filter.endpoint = { $regex: req.query.endpoint, $options: "i" };
      }

      if (req.query.responseStatus) {
        filter.responseStatus = parseInt(req.query.responseStatus);
      }

      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          filter.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          filter.createdAt.$lte = new Date(req.query.endDate);
        }
      }

      // Get audit logs with pagination
      const auditLogs = await AuditLog.find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const totalCount = await AuditLog.countDocuments(filter);

      return Response.successResponseData(
        res,
        {
          auditLogs,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit,
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Audit logs retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get audit log statistics
   * @param req
   * @param res
   */
  getAuditLogStats: async (req, res) => {
    try {
      const userId = req.authUserId || req.headers["x-user-id"];
      const role = req.role || req.headers["x-user-role"];

      // Check admin role
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      // Get date range (default to last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Get statistics
      const totalLogs = await AuditLog.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const logsByMethod = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$method",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const logsByStatus = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$responseStatus",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const logsByRole = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$userRole",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return Response.successResponseData(
        res,
        {
          totalLogs,
          logsByMethod,
          logsByStatus,
          logsByRole,
          dateRange: {
            startDate,
            endDate,
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Audit log statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting audit log stats:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};

