import { redirect } from "next/navigation";

export default function UserDashboardPage({ params }) {
  const uuid = String(params?.uuid || "").trim();
  if (!uuid) {
    redirect("/dashboard");
  }

  redirect(`/dashboard?uid=${encodeURIComponent(uuid)}`);
}
