import { StaffManagement } from "@/components/staff/StaffManagement";
import { requirePermission } from "@/lib/access";

export const metadata = { title: "Staff & access — GlowRoot Admin" };

export default async function StaffPage() {
  await requirePermission("staff.view");
  return <StaffManagement />;
}
