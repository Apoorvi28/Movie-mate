// Navbar.jsx
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      padding: "10px 20px", 
      backgroundColor: "#333", 
      color: "white" 
    }}>
      <div>
        <h2>VideoSync</h2> {/* Logo or name */}
      </div>
      <div>
        {/* <Link to="/" style={{ color: "white", marginRight: "15px", textDecoration: "none" }}>
          Home
        </Link>
        <Link to="/create-room" style={{ color: "white", textDecoration: "none" }}>
          Create Room
        </Link> */}
      </div>
    </nav>
  );
}

export default Navbar;
