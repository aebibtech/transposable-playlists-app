import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
// import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="app-container">
        <header className="app-header">
          <Link to="/" className="app-logo">
            Transposable Playlists
          </Link>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      {/* <TanStackRouterDevtools /> */}
    </>
  ),
});
