module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./images");
  eleventyConfig.addPassthroughCopy("./fonts");
  eleventyConfig.addWatchTarget("./styles");
  eleventyConfig.addPassthroughCopy("./js");
  eleventyConfig.addPassthroughCopy("*.svg");
  eleventyConfig.addPassthroughCopy("*.png");
  eleventyConfig.addPassthroughCopy("*.ico");
  eleventyConfig.addPassthroughCopy("*.webmanifest");
};