import { CompactPanel } from "./windows/CompactPanel/CompactPanel";
import { FullView } from "./windows/FullView/FullView";
import { viewFromSearch } from "./app/view";
import { ThemeController } from "./features/settings/ThemeController";

export default function App() {
  return (
    <>
      <ThemeController />
      {viewFromSearch(window.location.search) === "compact" ? <CompactPanel /> : <FullView />}
    </>
  );
}
