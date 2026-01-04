import { redirect } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

// export const Route = createFileRoute("/")({
//   component: RouteComponent,
// });

// function RouteComponent() {
//   return (
//     <div className="m-2 border p-2">
//       <a href="/editor">Go to Editor</a>
//       <div>Hello "root"!</div>
//     </div>
//   );
// }

export const Route = createFileRoute("/")({
  component: () => null,
  loader: () => {
    redirect({
      to: "/editor",
      throw: true,
    });
  },
});