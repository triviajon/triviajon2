export default function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy({ "assets/images/favicon": "/" });

    return {
      pathPrefix: "/triviajon2/",
      dir: {
        input: "./pages",
        output: "./_site",
        layouts: "../layouts",
      },
    };
  }
