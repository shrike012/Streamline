export default function sortVideos(videos, sortOption) {
  return [...(videos || [])].sort((a, b) => {
    if (sortOption === "views") return (b.viewCount || 0) - (a.viewCount || 0);
    if (sortOption === "views_asc")
      return (a.viewCount || 0) - (b.viewCount || 0);
    if (sortOption === "recent")
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    if (sortOption === "oldest")
      return new Date(a.publishedAt) - new Date(b.publishedAt);
    if (sortOption === "outlier")
      return (b.outlierScore || 0) - (a.outlierScore || 0);
    if (sortOption === "outlier_low")
      return (a.outlierScore || 0) - (b.outlierScore || 0);
    return 0;
  });
}
