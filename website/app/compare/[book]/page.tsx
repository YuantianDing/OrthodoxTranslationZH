import OrthodoxComparison from "@/components/orthodox-comparison"

export default async function ComparePage(props: { params: Promise<{ book: string }> }) {
  const params = await props.params;
  return <OrthodoxComparison bookId={params.book} />
}
