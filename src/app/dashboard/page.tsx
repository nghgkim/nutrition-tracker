import { redirect } from "next/navigation";
// Legacy path kept for bookmarks; canonical homepage is "/".
export default function DashboardLegacy() { redirect("/"); }
