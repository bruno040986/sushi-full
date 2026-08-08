import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductForm productId={id} />;
}
