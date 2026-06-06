export default function Home() {
  const posts = [
    {
      title: "Beethoven's 5th Symphony",
      type: "video",
      content:"crazy",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      title: "Bach discussion",
      type: "discussion",
      content: "What do you think about Bach's influence on modern music?"
    }
  ];
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
    <div className="border rounded p-4" key={post.title}>
      <h2>{post.title}</h2>
      <p>{post.content}</p>

      {post.type === "video" && (
        <iframe
          width="100%"
          height="515"
          src={post.videoUrl}
          allowFullScreen
        />
      )}
    </div>
       ))}
    </div>
  );
}