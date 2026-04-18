import { redirect } from "next/navigation";

export default function UserDashboardPage({ params, searchParams }) {
  const uuid = String(params?.uuid || "").trim();
  if (!uuid) {
    redirect("/dashboard");
  }

  const query = new URLSearchParams();
  query.set("uid", uuid);

  const entries = Object.entries(searchParams || {});
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
