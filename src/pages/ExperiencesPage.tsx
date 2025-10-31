import { Timeline } from "../components/Timeline";
import { experiences } from "../constants";

export function ExperiencesPage() {
  return (
    <div className="w-full">
      <Timeline data={experiences} />
    </div>
  );
}
