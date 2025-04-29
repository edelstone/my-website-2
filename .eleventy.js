module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/work");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/*.svg");
  eleventyConfig.addPassthroughCopy("src/*.png");
  eleventyConfig.addPassthroughCopy("src/*.ico");
  eleventyConfig.addPassthroughCopy("src/*.webmanifest");
  eleventyConfig.addPassthroughCopy('src/_redirects');

  eleventyConfig.setServerOptions({
    watch: ["./_site/css/**/*.css"]
  });

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};