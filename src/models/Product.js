const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    maxlength: 200,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discountPrice: {
    type: Number,
    min: 0,
    default: null,
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  releaseDate: {
    type: Date,
    required: true,
  },
  developer: {
    type: String,
    required: true,
  },
  publisher: {
    type: String,
    required: true,
  },
  genres: {
    type: [String],
    default: [],
  },
  tags: {
    type: [String],
    default: [],
  },
  images: {
    type: [String],
    default: [],
  },
  videos: {
    type: [String],
    default: [],
  },
  screenshots: {
    type: [String],
    default: [],
  },
  systemRequirements: {
    minimum: {
      os: String,
      processor: String,
      memory: String,
      graphics: String,
      storage: String,
    },
    recommended: {
      os: String,
      processor: String,
      memory: String,
      graphics: String,
      storage: String,
    },
  },
  languages: {
    type: [String],
    default: [],
  },
  ageRating: {
    type: String,
    enum: ["E", "E10+", "T", "M", "AO", "RP"],
    default: "RP",
  },
  platform: {
    type: [String],
    enum: ["Windows", "Mac", "Linux"],
    default: [],
  },
  downloadSize: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  stock: {
    type: Number,
    default: -1, // -1 means unlimited
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for search
productSchema.index({ name: "text", description: "text", developer: "text", publisher: "text" });
productSchema.index({ genres: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ releaseDate: -1 });

module.exports = mongoose.model("Product", productSchema);

