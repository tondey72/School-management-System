import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface LibraryOverview {
  barcodeSupport: boolean;
  reservationWorkflows: boolean;
  fineCalculation: boolean;
  titles: number;
  availableCopies: number;
}

interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  totalCopies: number;
  availableCopy: number;
}

export function LibraryPage() {
  const [overview, setOverview] = useState<LibraryOverview | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalCopies, setTotalCopies] = useState("1");
  const [error, setError] = useState("");

  const loadData = async () => {
    const [overviewResponse, booksResponse] = await Promise.all([
      api.get<LibraryOverview>("/library/overview"),
      api.get<LibraryBook[]>("/library/books")
    ]);

    setOverview(overviewResponse.data);
    setBooks(Array.isArray(booksResponse.data) ? booksResponse.data : []);
  };

  useEffect(() => {
    loadData().catch(() => setError("Unable to load e-library data."));
  }, []);

  const createBook = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/library/books", {
        isbn,
        title,
        author,
        totalCopies: Number(totalCopies)
      });
      setIsbn("");
      setTitle("");
      setAuthor("");
      setTotalCopies("1");
      await loadData();
    } catch {
      setError("Failed to add e-library item.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">E-Library</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage book inventory, availability, and library operations from one module.</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-5 text-sm">
        <div className="card-surface p-4">Titles: <strong>{overview?.titles ?? 0}</strong></div>
        <div className="card-surface p-4">Available Copies: <strong>{overview?.availableCopies ?? 0}</strong></div>
        <div className="card-surface p-4">Barcode: <strong>{overview?.barcodeSupport ? "Enabled" : "Disabled"}</strong></div>
        <div className="card-surface p-4">Reservations: <strong>{overview?.reservationWorkflows ? "Enabled" : "Disabled"}</strong></div>
        <div className="card-surface p-4">Fine Calc: <strong>{overview?.fineCalculation ? "Enabled" : "Disabled"}</strong></div>
      </div>

      <form className="card-surface grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={createBook}>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="ISBN" value={isbn} onChange={(event) => setIsbn(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Author" value={author} onChange={(event) => setAuthor(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Total Copies" type="number" min="1" value={totalCopies} onChange={(event) => setTotalCopies(event.target.value)} required />
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Add Book</button>
      </form>

      <div className="card-surface overflow-x-auto p-4">
        <h3 className="mb-3 font-heading text-lg font-bold">Library Books</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">ISBN</th>
              <th className="pb-2">Title</th>
              <th className="pb-2">Author</th>
              <th className="pb-2">Total</th>
              <th className="pb-2">Available</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{book.isbn}</td>
                <td className="py-2">{book.title}</td>
                <td className="py-2">{book.author}</td>
                <td className="py-2">{book.totalCopies}</td>
                <td className="py-2">{book.availableCopy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
