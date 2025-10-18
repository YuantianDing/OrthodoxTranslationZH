import OrthodoxComparison from "@/components/orthodox-comparison"
import { retrieve_book_metadata } from "@/lib/books-data";

export default async function ComparePage(props: { params: Promise<{ book: string }> }) {
  const params = await props.params;
  return <OrthodoxComparison bookId={params.book} />
}


export async function getStaticPaths() {
  const booksMeta = await retrieve_book_metadata();
  return booksMeta.map(book => ({
    book: book.filepath
  }));
}