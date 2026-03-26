import { Outlet } from "react-router-dom";
function Home() {
  return (
    <div className="Home">
      <main className="Home-main">
        <Outlet />
      </main>

    </div>
  );
}

export default Home;