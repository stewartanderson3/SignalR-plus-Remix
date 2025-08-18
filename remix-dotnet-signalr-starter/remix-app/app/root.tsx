import { 
  Links, 
  Meta, 
  Outlet, 
  Scripts, 
  ScrollRestoration 
} from "react-router";

export function meta() {
  return [
    { charSet: "utf-8" },
    { title: "React Router + .NET + SignalR Starter" },
    { name: "viewport", content: "width=device-width,initial-scale=1" }
  ];
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
