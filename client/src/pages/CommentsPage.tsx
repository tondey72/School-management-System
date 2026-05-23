import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface CommentRow {
  comment: string;
}

export function CommentsPage() {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    const response = await api.get<CommentRow[]>("/comments");
    setComments(response.data);
  };

  useEffect(() => {
    loadComments().catch(() => {
      setError("Failed to load comments.");
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post("/comments", { comment });
      setComment("");
      await loadComments();
    } catch {
      setError("Failed to submit comment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Comments</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Write and store comments in Neon Postgres.</p>
      </header>

      <form onSubmit={handleSubmit} className="card-surface space-y-3 p-4">
        <input
          type="text"
          placeholder="write a comment"
          name="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2"
          required
        />
        <button className="rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="card-surface p-4">
        <h2 className="mb-3 font-semibold">Recent comments</h2>
        <ul className="space-y-2">
          {comments.map((item, index) => (
            <li key={`${item.comment}-${index}`} className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm">
              {item.comment}
            </li>
          ))}
          {comments.length === 0 ? <li className="text-sm text-[hsl(var(--muted-foreground))]">No comments yet.</li> : null}
        </ul>
      </div>
    </section>
  );
}
