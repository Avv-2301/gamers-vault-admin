/**
 * @description Helper function to generate slug from name
 * @param {string} name - The name to convert to slug
 * @returns {string} - The generated slug
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

module.exports = {
  generateSlug,
};

