export default {
  layout: "post",
  tags: "thoughtdumps",
  eleventyComputed: {
    permalink: (data) => {
      if (data.draft) {
        return `/thoughtdumps/beta/${data.page.fileSlug}/`;
      }

      return `/thoughtdumps/${data.page.fileSlug}/`;
    },
  },
};
