import OrthodoxComparison from "@/components/orthodox-comparison"
import { booksMeta } from "@/lib/books-data";

export default async function ComparePage(props: { params: Promise<{ book: string }> }) {
  const params = await props.params;
  return <OrthodoxComparison bookId={params.book} />
}


export function getStaticPaths() {
  // Return a list of possible value for book
  return booksMeta.map(book => ({
    book: book.id
  }));
}