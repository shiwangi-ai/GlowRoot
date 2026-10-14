/** Order tracking and account order pages are separate from shopping. */
export function isOrderPage(pathname: string | null) {
  return (
    pathname === "/track" ||
    pathname?.startsWith("/track/") === true ||
    pathname === "/account/orders" ||
    pathname?.startsWith("/account/orders/") === true
  );
}
