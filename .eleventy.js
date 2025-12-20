export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({ "assets/images/favicon": "/" });

  return {
    pathPrefix:
      process.env.ELEVENTY_ENV === "production" ? "/triviajon2/" : "/",
    dir: {
      input: "./pages",
      output: "./_site",
      layouts: "../layouts",
    },
  };
}
