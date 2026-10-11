import { PageTransition } from "@/components/app/PageTransition";
import { HomeScreen } from "@/components/tasks/HomeScreen";

export default function Home() {
  return (
    <PageTransition>
      <HomeScreen />
    </PageTransition>
  );
}
