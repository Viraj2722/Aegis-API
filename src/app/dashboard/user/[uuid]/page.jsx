import { redirect } from "next/navigation";

export default async function UserDashboardPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const uuid = String(resolvedParams?.uuid || "").trim();
  if (!uuid) {
    redirect("/dashboard");
  }

  const query = new URLSearchParams();
  query.set("uid", uuid);

  const entries = Object.entries(resolvedSearchParams || {});
  for (const [key, value] of entries) {
    if (key === "uid") continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v != null && v !== "") query.append(key, String(v));
      }
    } else if (value != null && value !== "") {
      query.set(key, String(value));
    }
  }

  redirect(`/dashboard?${query.toString()}`);
}
