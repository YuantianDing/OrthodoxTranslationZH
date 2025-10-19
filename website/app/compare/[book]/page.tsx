import OrthodoxComparison from "@/components/orthodox-comparison"
import { get_book_id, retrieve_book, retrieve_book_metadata } from "@/lib/books-data";

export default async function ComparePage(props: { params: Promise<{ book: string }> }) {
  const params = await props.params;
  const book = await retrieve_book(params.book.replaceAll("-", "/"));
  return <OrthodoxComparison book={book} />
}


export async function getStaticPaths() {
  const booksMeta = await retrieve_book_metadata();
  return booksMeta.map(book => ({
    book: get_book_id(book)
  }));
}
export async function generateStaticParams() {
  const booksMeta = await retrieve_book_metadata();
  return booksMeta.map(book => ({
    book: get_book_id(book)
  }));
}