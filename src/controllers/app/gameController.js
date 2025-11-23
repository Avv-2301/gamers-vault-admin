const Product = require("../../models/Product");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const { createGameValidation, getGameByIdValidation, updateGameValidation } = require("../../services/Validation");
const { generateSlug } = require("../../services/Helper");

module.exports = {
  /**
   * @description This function is used to create a new game (product)
   * @param req
   * @param res
   */
  createGame: async (req, res) => {
    try {
      // Check admin role
      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const requestParams = req.body;

      createGameValidation(requestParams, res, async (validate) => {
        if (validate) {
          // Generate slug from name if not provided
          const slug = requestParams.slug || generateSlug(requestParams.name);

          // Check if slug already exists
          const existingProduct = await Product.findOne({ slug });
          if (existingProduct) {
            return Response.errorResponseWithoutData(
              res,
              "Game with this name already exists",
              Constant.STATUS_CODES.DATA_CONFLICT
            );
          }

          // Calculate discount percentage if discountPrice is set
          if (requestParams.discountPrice !== undefined && requestParams.discountPrice !== null) {
            const price = requestParams.price;
            requestParams.discountPercentage = Math.round(
              ((price - requestParams.discountPrice) / price) * 100
            );
          }

          const productObj = {
            ...requestParams,
            slug,
          };

          const productCreation = await Product.create(productObj);

          return Response.successResponseData(
            res,
            productCreation,
            Constant.STATUS_CODES.CREATED,
            "Game created successfully"
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
   * @description This function is used to get all games with filters, search, and pagination
   * @param req
   * @param res
   */
  getAllGames: async (req, res) => {
    try {
      // Check admin role
      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const {
        page = 1,
        limit = 20,
        search,
        genre,
        minPrice,
        maxPrice,
        platform,
        sortBy = "createdAt",
        sortOrder = "desc",
        featured,
        onSale,
        isActive,
      } = req.query;

      const query = {};

      // Filter by active status (admin can see all, including inactive)
      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }

      // Search functionality
      if (search) {
        query.$text = { $search: search };
      }

      // Filter by genre
      if (genre) {
        query.genres = { $in: [genre] };
      }

      // Filter by price range
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // Filter by platform
      if (platform) {
        query.platform = { $in: [platform] };
      }

      // Filter featured games
      if (featured === "true") {
        query.isFeatured = true;
      }

      // Filter on sale games
      if (onSale === "true") {
        query.discountPrice = { $ne: null, $exists: true };
        query.discountPrice = { $lt: query.price || {} };
      }

      // Sort options
      const sortOptions = {};
      if (sortBy === "price") {
        sortOptions.price = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "releaseDate") {
        sortOptions.releaseDate = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "rating") {
        sortOptions.averageRating = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "name") {
        sortOptions.name = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const games = await Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v");

      const totalGames = await Product.countDocuments(query);

      return Response.successResponseData(
        res,
        {
          games,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalGames / parseInt(limit)),
            totalGames,
            limit: parseInt(limit),
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Games retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message || "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get a game by ID
   * @param req
   * @param res
   */
  getGameById: async (req, res) => {
    try {
      // Check admin role
      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const gameId = req.params.id;

      if (!gameId) {
        return Response.errorResponseData(
          res,
          "Game ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getGameByIdValidation(req, res, async (validate) => {
        if (validate) {
          const game = await Product.findById(gameId).select("-__v");

          if (!game) {
            return Response.errorResponseWithoutData(
              res,
              "Game not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          return Response.successResponseData(
            res,
            game,
            Constant.STATUS_CODES.SUCCESS,
            "Game retrieved successfully"
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message || "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to update a game
   * @param req
   * @param res
   */
  updateGame: async (req, res) => {
    try {
      // Check admin role
      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const gameId = req.params.id;

      if (!gameId) {
        return Response.errorResponseData(
          res,
          "Game ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      // Validate game ID format
      getGameByIdValidation(req, res, async (idValid) => {
        if (idValid) {
          // Validate update data
          updateGameValidation(req.body, res, async (validate) => {
            if (validate) {
              // Check if game exists
              const existingGame = await Product.findById(gameId);
              if (!existingGame) {
                return Response.errorResponseWithoutData(
                  res,
                  "Game not found",
                  Constant.STATUS_CODES.PAGE_NOT_FOUND
                );
              }

              const requestParams = req.body;
              const updateData = { ...requestParams };

              // Generate slug from name if name is being updated and slug is not provided
              if (requestParams.name && !requestParams.slug) {
                updateData.slug = generateSlug(requestParams.name);
              } else if (requestParams.slug) {
                updateData.slug = requestParams.slug.toLowerCase();
              }

              // Check if slug already exists (excluding current game)
              if (updateData.slug) {
                const slugExists = await Product.findOne({
                  slug: updateData.slug,
                  _id: { $ne: gameId },
                });
                if (slugExists) {
                  return Response.errorResponseWithoutData(
                    res,
                    "Game with this slug already exists",
                    Constant.STATUS_CODES.DATA_CONFLICT
                  );
                }
              }

              // Calculate discount percentage if discountPrice or price is being updated
              if (requestParams.discountPrice !== undefined || requestParams.price !== undefined) {
                const price = requestParams.price !== undefined ? requestParams.price : existingGame.price;
                const discountPrice = requestParams.discountPrice !== undefined 
                  ? requestParams.discountPrice 
                  : existingGame.discountPrice;

                if (discountPrice !== null && discountPrice !== undefined && price) {
                  updateData.discountPercentage = Math.round(
                    ((price - discountPrice) / price) * 100
                  );
                } else if (discountPrice === null || discountPrice === undefined) {
                  updateData.discountPercentage = 0;
                }
              }

              // Update the game
              const updatedGame = await Product.findByIdAndUpdate(
                gameId,
                { $set: updateData },
                { new: true, runValidators: true }
              );

              return Response.successResponseData(
                res,
                updatedGame,
                Constant.STATUS_CODES.SUCCESS,
                "Game updated successfully"
              );
            }
          });
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message || "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to delete a game (soft delete)
   * @param req
   * @param res
   */
  deleteGame: async (req, res) => {
    try {
      // Check admin role
      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const gameId = req.params.id;
      console.log(gameId);

      if (!gameId) {
        return Response.errorResponseData(
          res,
          "Game ID is required",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      getGameByIdValidation(req, res, async (validate) => {
        if (validate) {
          // Soft delete - set isActive to false
          const deletedGame = await Product.findOneAndUpdate(
            { _id: gameId },
            { $set: { isActive: false } },
            { new: true }
          );

          if (!deletedGame) {
            return Response.errorResponseWithoutData(
              res,
              "Game not found",
              Constant.STATUS_CODES.PAGE_NOT_FOUND
            );
          }

          return Response.successResponseData(
            res,
            deletedGame,
            Constant.STATUS_CODES.SUCCESS,
            "Game deleted successfully"
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message || "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};

