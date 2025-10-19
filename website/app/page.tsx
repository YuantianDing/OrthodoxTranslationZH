import BookSelection from "@/components/book-selection"
import { BookMeta } from "@/lib/books-data";
import { retrieve_book_metadata } from "@/lib/books-data";

export default async function Page() {
  const metadata = await retrieve_book_metadata();
  return <BookSelection metadata={metadata}/>
}

// export async function getStaticProps(){
//   const meta = await retrieve_book_metadata();
//   return {
//     props: {
//       metadata: meta
//     }
//   }
// }