import type { Metadata } from "next";
import { AdminScreen } from "@/components/admin/AdminScreen";

export const metadata: Metadata = { title: "Panel" };

export default function Page() {
  return <AdminScreen />;
}
