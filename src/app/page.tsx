export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>🎼 Classical Music Feed</h1>

      <div style={{ marginTop: "2rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
          <h2>Chopin - Ballade No.1</h2>
          <p>Posted by: JuliusW</p>
          <p>🎹 Piano performance</p>
          <button>👍 Upvote</button>
        </div>

        <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
          <h2>Discussion: How do I improve rubato?</h2>
          <p>Posted by: MusicLearner</p>
          <button>💬 Comment</button>
        </div>
      </div>
    </main>
  );
}