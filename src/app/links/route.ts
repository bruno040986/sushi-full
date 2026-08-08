import { redirect } from "next/navigation";

/**
 * A bio passou a viver em /bio. Este redirect mantém funcionando qualquer
 * link antigo que já tenha sido publicado apontando para /links.
 */
export function GET() {
  redirect("/bio");
}
