export default function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy({ "assets/images/favicon": "/" });

    return {
      dir: {
        input: "./pages",
        output: "./_site",
        layouts: "../layouts",
      },
    };
  }