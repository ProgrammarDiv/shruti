import { redirect } from "next/navigation";

// No login yet — Step 5 adds auth. Until then the app opens on the dashboard.
export default function Home() {
  redirect("/dashboard");
}
