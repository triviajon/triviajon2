export default {
  layout: "post",
  tags: "thoughtdumps",
  eleventyComputed: {
    permalink: (data) => `/thoughtdumps/${data.page.fileSlug}/`,
  },
};
