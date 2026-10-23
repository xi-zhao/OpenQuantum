// A host may reject opening a link without throwing an exception.
export async function openHostLink(app, url) {
  const result = await app.openLink({ url });
  if (result?.isError) throw new Error("宿主未打开链接");
}
