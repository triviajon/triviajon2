import markdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import registerMengine from "./prism-mengine.js";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({ "assets/images/favicon": "/" });

  // Syntax highlighting (with custom mengine language)
  eleventyConfig.addPlugin(syntaxHighlight, {
    init: ({ Prism }) => {
      registerMengine(Prism);
    },
  });

  // Markdown + LaTeX
  const md = markdownIt({ html: true, linkify: true, typographer: true });
  md.use(texmath, {
    engine: katex,
    delimiters: "dollars",
    katexOptions: { throwOnError: false },
  });
  eleventyConfig.setLibrary("md", md);

  // Blog collection
  eleventyConfig.addCollection("thoughtdumps", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("./pages/thoughtdumps/posts/*.md")
      .sort((a, b) => b.date - a.date)
  );

  // Read time filter (~200 wpm)
  eleventyConfig.addFilter("readTime", (content) => {
    const words = (content || "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  // Date formatting
  eleventyConfig.addFilter("postDate", (date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

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
