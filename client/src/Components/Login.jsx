import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send POST request to the backend API to authenticate the user
      const response = await axios.post('http://localhost:4000/api/auth/login', { email, password });

      // Save the JWT token to localStorage
      localStorage.setItem('token', response.data.token);

      // Redirect the user to the home page after successful login
      navigate('/'); // Using React Router's navigate to avoid page reload
    } catch (err) {
      // If login fails, display the error message
      setError(err.response?.data?.msg || 'Invalid credentials');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <button type="submit">Login</button>
        </div>
      </form>

      {/* Display error message if credentials are invalid */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default Login;
