import { createFileRoute } from "@tanstack/react-router";
import { ImageGallery } from "../components/ImageGallery.tsx";

export const Route = createFileRoute("/testing_gallery")({
  component: TestingGallery,
});

function TestingGallery() {
  return (
    <div className="h-full w-full">
      <ImageGallery />
    </div>
  );
}
