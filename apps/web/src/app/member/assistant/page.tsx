import { redirect } from "next/navigation";

export default function AssistantPage() {
  redirect("/member?assistant=open");
}
